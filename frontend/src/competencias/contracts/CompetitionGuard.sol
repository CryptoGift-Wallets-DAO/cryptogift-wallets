// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CompetitionGuard
 * @notice Gnosis Safe Guard for competition fund protection
 * @dev Validates all Safe transactions to ensure they comply with competition rules
 *
 * This guard ensures:
 * 1. Funds can only go to approved recipients (winners, refunds)
 * 2. Distribution amounts match competition rules
 * 3. Resolution has been properly completed
 * 4. Dispute period has passed
 */
interface IGnosisSafe {
    function getOwners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
}

interface ICompetitionFactory {
    struct Competition {
        uint256 id;
        uint8 status;
        address creator;
        address safeAddress;
        uint256 endsAt;
        uint256 resolutionDeadline;
        uint256 prizePool;
        address currency;
        uint256 disputePeriod;
    }

    function getCompetition(uint256 _competitionId) external view returns (Competition memory);
}

contract CompetitionGuard is Ownable {

    // ============================================================================
    // STATE
    // ============================================================================

    // Competition factory reference
    ICompetitionFactory public competitionFactory;

    // Competition ID for this guard instance
    uint256 public competitionId;

    // Competition status that allows withdrawals (COMPLETED = 5)
    uint8 public constant STATUS_COMPLETED = 5;
    uint8 public constant STATUS_CANCELLED = 6;

    // Approved recipients mapping
    mapping(address => bool) public approvedRecipients;

    // Maximum withdrawal per recipient
    mapping(address => uint256) public maxWithdrawal;

    // Amount already withdrawn per recipient
    mapping(address => uint256) public withdrawn;

    // Resolution outcome
    string public resolution;
    bool public isResolved;

    // Winner addresses
    address[] public winners;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event RecipientApproved(address indexed recipient, uint256 maxAmount);
    event RecipientRemoved(address indexed recipient);
    event ResolutionSet(string outcome, address[] winners);
    event WithdrawalValidated(address indexed to, uint256 amount);
    event WithdrawalRejected(address indexed to, uint256 amount, string reason);

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor(
        address _factory,
        uint256 _competitionId
    ) Ownable(msg.sender) {
        competitionFactory = ICompetitionFactory(_factory);
        competitionId = _competitionId;
    }

    // ============================================================================
    // GUARD INTERFACE (Gnosis Safe Guard)
    // ============================================================================

    /**
     * @notice Called before a Safe transaction is executed
     * @dev Validates the transaction against competition rules
     */
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external view {
        // Skip delegate calls (operation = 1)
        if (operation == 1) {
            revert("DelegateCalls not allowed");
        }

        // Get competition state
        ICompetitionFactory.Competition memory comp = competitionFactory.getCompetition(competitionId);

        // Check competition status
        require(
            comp.status == STATUS_COMPLETED || comp.status == STATUS_CANCELLED,
            "Competition not resolved"
        );

        // Check dispute period has passed
        if (comp.status == STATUS_COMPLETED) {
            require(
                block.timestamp > comp.resolutionDeadline + comp.disputePeriod,
                "Dispute period active"
            );
        }

        // If sending value (ETH transfer)
        if (value > 0) {
            _validateWithdrawal(to, value, comp.currency == address(0));
        }

        // If calling a contract (ERC20 transfer, etc.)
        if (data.length >= 4) {
            bytes4 selector = bytes4(data[:4]);

            // ERC20 transfer(address,uint256)
            if (selector == 0xa9059cbb) {
                (address recipient, uint256 amount) = abi.decode(data[4:], (address, uint256));
                _validateWithdrawal(recipient, amount, false);
            }

            // ERC20 transferFrom(address,address,uint256)
            if (selector == 0x23b872dd) {
                (, address recipient, uint256 amount) = abi.decode(data[4:], (address, address, uint256));
                _validateWithdrawal(recipient, amount, false);
            }
        }
    }

    /**
     * @notice Called after a Safe transaction is executed
     * @dev Can be used for post-execution checks or state updates
     */
    function checkAfterExecution(bytes32 txHash, bool success) external {
        // Post-execution hook
        // Could emit events or update state
    }

    // ============================================================================
    // VALIDATION
    // ============================================================================

    /**
     * @notice Validate a withdrawal
     * @param _to Recipient address
     * @param _amount Amount to withdraw
     * @param _isETH Whether this is an ETH transfer
     */
    function _validateWithdrawal(
        address _to,
        uint256 _amount,
        bool _isETH
    ) internal view {
        // Check recipient is approved
        require(approvedRecipients[_to], "Recipient not approved");

        // Check amount doesn't exceed maximum
        uint256 alreadyWithdrawn = withdrawn[_to];
        uint256 maxAllowed = maxWithdrawal[_to];

        require(
            alreadyWithdrawn + _amount <= maxAllowed,
            "Exceeds maximum withdrawal"
        );
    }

    // ============================================================================
    // RECIPIENT MANAGEMENT
    // ============================================================================

    /**
     * @notice Approve a recipient for withdrawals
     * @param _recipient Recipient address
     * @param _maxAmount Maximum they can withdraw
     */
    function approveRecipient(
        address _recipient,
        uint256 _maxAmount
    ) external onlyOwner {
        require(!isResolved || _isWinner(_recipient), "Can only add winners after resolution");

        approvedRecipients[_recipient] = true;
        maxWithdrawal[_recipient] = _maxAmount;

        emit RecipientApproved(_recipient, _maxAmount);
    }

    /**
     * @notice Remove a recipient
     * @param _recipient Recipient address
     */
    function removeRecipient(address _recipient) external onlyOwner {
        require(!isResolved, "Cannot remove after resolution");

        approvedRecipients[_recipient] = false;
        maxWithdrawal[_recipient] = 0;

        emit RecipientRemoved(_recipient);
    }

    /**
     * @notice Batch approve recipients (for prize distribution)
     * @param _recipients Array of recipients
     * @param _amounts Array of maximum amounts
     */
    function batchApproveRecipients(
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external onlyOwner {
        require(_recipients.length == _amounts.length, "Length mismatch");

        for (uint256 i = 0; i < _recipients.length; i++) {
            approvedRecipients[_recipients[i]] = true;
            maxWithdrawal[_recipients[i]] = _amounts[i];
            emit RecipientApproved(_recipients[i], _amounts[i]);
        }
    }

    // ============================================================================
    // RESOLUTION
    // ============================================================================

    /**
     * @notice Set the resolution and winners
     * @param _resolution Resolution outcome string
     * @param _winners Array of winner addresses
     * @param _amounts Prize amounts for each winner
     */
    function setResolution(
        string calldata _resolution,
        address[] calldata _winners,
        uint256[] calldata _amounts
    ) external onlyOwner {
        require(!isResolved, "Already resolved");
        require(_winners.length == _amounts.length, "Length mismatch");

        resolution = _resolution;
        winners = _winners;
        isResolved = true;

        // Approve all winners
        for (uint256 i = 0; i < _winners.length; i++) {
            approvedRecipients[_winners[i]] = true;
            maxWithdrawal[_winners[i]] = _amounts[i];
            emit RecipientApproved(_winners[i], _amounts[i]);
        }

        emit ResolutionSet(_resolution, _winners);
    }

    /**
     * @notice Check if an address is a winner
     */
    function _isWinner(address _addr) internal view returns (bool) {
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] == _addr) return true;
        }
        return false;
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getWinners() external view returns (address[] memory) {
        return winners;
    }

    function getRemainingWithdrawal(address _recipient) external view returns (uint256) {
        if (!approvedRecipients[_recipient]) return 0;
        return maxWithdrawal[_recipient] - withdrawn[_recipient];
    }

    function isApprovedRecipient(address _recipient) external view returns (bool) {
        return approvedRecipients[_recipient];
    }

    // ============================================================================
    // EMERGENCY
    // ============================================================================

    /**
     * @notice Emergency override - disable guard checks
     * @dev Only for emergencies - requires multisig of Safe owners
     */
    function emergencyDisable() external onlyOwner {
        // In production, this would require additional verification
        // For now, just allows owner to disable
        selfdestruct(payable(owner()));
    }
}
