// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title PrizeDistributor
 * @notice Handles prize distribution for competitions
 * @dev Supports multiple distribution methods:
 *      - Direct distribution (single winner)
 *      - Proportional distribution (multiple winners)
 *      - CPMM-based distribution (prediction markets)
 *      - Bracket-based distribution (tournaments)
 */
contract PrizeDistributor is Ownable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    bytes32 public constant DISTRIBUTION_TYPEHASH = keccak256(
        "Distribution(uint256 competitionId,address[] recipients,uint256[] amounts,uint256 nonce,uint256 deadline)"
    );

    // ============================================================================
    // STRUCTS
    // ============================================================================

    struct Distribution {
        uint256 competitionId;
        address[] recipients;
        uint256[] amounts;
        bool executed;
        uint256 totalAmount;
        uint256 executedAt;
    }

    struct DistributionPreset {
        string name;
        uint256[] percentages;  // In basis points (10000 = 100%)
    }

    // ============================================================================
    // STATE
    // ============================================================================

    // Distributions by competition ID
    mapping(uint256 => Distribution) public distributions;

    // Nonce for replay protection
    mapping(uint256 => uint256) public nonces;

    // Authorized signers (judges)
    mapping(address => bool) public authorizedSigners;

    // Required signatures for distribution
    uint256 public requiredSignatures;

    // Collected signatures per distribution
    mapping(bytes32 => mapping(address => bool)) public hasSignedDistribution;
    mapping(bytes32 => uint256) public signatureCount;

    // Preset distributions
    mapping(string => DistributionPreset) public presets;

    // Competition factory
    address public competitionFactory;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event DistributionProposed(
        uint256 indexed competitionId,
        address[] recipients,
        uint256[] amounts,
        bytes32 distributionHash
    );

    event DistributionSigned(
        uint256 indexed competitionId,
        address indexed signer,
        bytes32 distributionHash
    );

    event DistributionExecuted(
        uint256 indexed competitionId,
        uint256 totalAmount,
        uint256 recipientCount
    );

    event PrizeClaimedDirect(
        uint256 indexed competitionId,
        address indexed recipient,
        uint256 amount
    );

    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event PresetCreated(string name, uint256[] percentages);

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor(
        address _factory,
        uint256 _requiredSignatures
    ) Ownable(msg.sender) EIP712("CryptoGift PrizeDistributor", "1") {
        competitionFactory = _factory;
        requiredSignatures = _requiredSignatures;

        // Create default presets
        _createDefaultPresets();
    }

    function _createDefaultPresets() internal {
        // Winner Takes All
        uint256[] memory wta = new uint256[](1);
        wta[0] = 10000;
        presets["WINNER_TAKES_ALL"] = DistributionPreset("Winner Takes All", wta);

        // Top 3
        uint256[] memory top3 = new uint256[](3);
        top3[0] = 6000;  // 60%
        top3[1] = 3000;  // 30%
        top3[2] = 1000;  // 10%
        presets["TOP_3"] = DistributionPreset("Top 3", top3);

        // Top 4
        uint256[] memory top4 = new uint256[](4);
        top4[0] = 5000;  // 50%
        top4[1] = 2500;  // 25%
        top4[2] = 1500;  // 15%
        top4[3] = 1000;  // 10%
        presets["TOP_4"] = DistributionPreset("Top 4", top4);

        // Top 8 (Tournament style)
        uint256[] memory top8 = new uint256[](8);
        top8[0] = 3500;  // 35%
        top8[1] = 2000;  // 20%
        top8[2] = 1500;  // 15%
        top8[3] = 1000;  // 10%
        top8[4] = 500;   // 5%
        top8[5] = 500;   // 5%
        top8[6] = 500;   // 5%
        top8[7] = 500;   // 5%
        presets["TOP_8"] = DistributionPreset("Top 8", top8);

        emit PresetCreated("WINNER_TAKES_ALL", wta);
        emit PresetCreated("TOP_3", top3);
        emit PresetCreated("TOP_4", top4);
        emit PresetCreated("TOP_8", top8);
    }

    // ============================================================================
    // DISTRIBUTION PROPOSAL
    // ============================================================================

    /**
     * @notice Propose a distribution
     * @param _competitionId Competition ID
     * @param _recipients Winner addresses
     * @param _amounts Prize amounts
     */
    function proposeDistribution(
        uint256 _competitionId,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external returns (bytes32) {
        require(_recipients.length == _amounts.length, "Length mismatch");
        require(_recipients.length > 0, "No recipients");
        require(!distributions[_competitionId].executed, "Already distributed");

        uint256 total = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient");
            require(_amounts[i] > 0, "Invalid amount");
            total += _amounts[i];
        }

        distributions[_competitionId] = Distribution({
            competitionId: _competitionId,
            recipients: _recipients,
            amounts: _amounts,
            executed: false,
            totalAmount: total,
            executedAt: 0
        });

        bytes32 distributionHash = _getDistributionHash(
            _competitionId,
            _recipients,
            _amounts,
            nonces[_competitionId]
        );

        emit DistributionProposed(_competitionId, _recipients, _amounts, distributionHash);

        return distributionHash;
    }

    /**
     * @notice Propose distribution using a preset
     * @param _competitionId Competition ID
     * @param _presetName Preset name
     * @param _recipients Winner addresses (ordered by rank)
     * @param _totalPrizePool Total prize pool to distribute
     */
    function proposeDistributionWithPreset(
        uint256 _competitionId,
        string calldata _presetName,
        address[] calldata _recipients,
        uint256 _totalPrizePool
    ) external returns (bytes32) {
        DistributionPreset storage preset = presets[_presetName];
        require(preset.percentages.length > 0, "Preset not found");
        require(_recipients.length <= preset.percentages.length, "Too many recipients");

        uint256[] memory amounts = new uint256[](_recipients.length);
        uint256 distributed = 0;

        for (uint256 i = 0; i < _recipients.length; i++) {
            amounts[i] = (_totalPrizePool * preset.percentages[i]) / 10000;
            distributed += amounts[i];
        }

        // Add remainder to first place
        if (distributed < _totalPrizePool) {
            amounts[0] += _totalPrizePool - distributed;
        }

        return this.proposeDistribution(_competitionId, _recipients, amounts);
    }

    // ============================================================================
    // SIGNATURE COLLECTION
    // ============================================================================

    /**
     * @notice Sign a distribution proposal
     * @param _competitionId Competition ID
     * @param _signature EIP-712 signature
     */
    function signDistribution(
        uint256 _competitionId,
        bytes calldata _signature
    ) external {
        Distribution storage dist = distributions[_competitionId];
        require(dist.recipients.length > 0, "No distribution proposed");
        require(!dist.executed, "Already executed");

        bytes32 distributionHash = _getDistributionHash(
            _competitionId,
            dist.recipients,
            dist.amounts,
            nonces[_competitionId]
        );

        // Verify signature
        bytes32 digest = _hashTypedDataV4(distributionHash);
        address signer = digest.recover(_signature);

        require(authorizedSigners[signer], "Not authorized signer");
        require(!hasSignedDistribution[distributionHash][signer], "Already signed");

        hasSignedDistribution[distributionHash][signer] = true;
        signatureCount[distributionHash]++;

        emit DistributionSigned(_competitionId, signer, distributionHash);

        // Auto-execute if enough signatures
        if (signatureCount[distributionHash] >= requiredSignatures) {
            _executeDistribution(_competitionId);
        }
    }

    /**
     * @notice Batch sign distribution (for multisig convenience)
     * @param _competitionId Competition ID
     * @param _signatures Array of signatures
     */
    function batchSignDistribution(
        uint256 _competitionId,
        bytes[] calldata _signatures
    ) external {
        for (uint256 i = 0; i < _signatures.length; i++) {
            this.signDistribution(_competitionId, _signatures[i]);
        }
    }

    // ============================================================================
    // DISTRIBUTION EXECUTION
    // ============================================================================

    /**
     * @notice Execute a distribution (internal)
     */
    function _executeDistribution(uint256 _competitionId) internal nonReentrant {
        Distribution storage dist = distributions[_competitionId];
        require(!dist.executed, "Already executed");

        dist.executed = true;
        dist.executedAt = block.timestamp;
        nonces[_competitionId]++;

        // Note: Actual fund transfer would be triggered via Safe transaction
        // This contract just validates and authorizes the distribution

        emit DistributionExecuted(
            _competitionId,
            dist.totalAmount,
            dist.recipients.length
        );
    }

    /**
     * @notice Force execute distribution (owner only, for emergencies)
     */
    function forceExecuteDistribution(uint256 _competitionId) external onlyOwner {
        _executeDistribution(_competitionId);
    }

    // ============================================================================
    // CPMM DISTRIBUTION (Prediction Markets)
    // ============================================================================

    /**
     * @notice Calculate CPMM payouts for prediction market winners
     * @param _competitionId Competition ID
     * @param _winningOutcome The outcome that won ("YES" or "NO")
     * @param _participants Array of participant addresses
     * @param _positions Array of positions ("YES" or "NO")
     * @param _shares Array of shares held
     * @param _totalPrizePool Total prize pool
     */
    function calculateCPMMDistribution(
        uint256 _competitionId,
        string calldata _winningOutcome,
        address[] calldata _participants,
        string[] calldata _positions,
        uint256[] calldata _shares,
        uint256 _totalPrizePool
    ) external view returns (address[] memory winners, uint256[] memory payouts) {
        require(_participants.length == _positions.length, "Length mismatch");
        require(_participants.length == _shares.length, "Length mismatch");

        // Count winners and total winning shares
        uint256 winnerCount = 0;
        uint256 totalWinningShares = 0;

        bytes32 winningHash = keccak256(bytes(_winningOutcome));

        for (uint256 i = 0; i < _participants.length; i++) {
            if (keccak256(bytes(_positions[i])) == winningHash) {
                winnerCount++;
                totalWinningShares += _shares[i];
            }
        }

        // Allocate arrays
        winners = new address[](winnerCount);
        payouts = new uint256[](winnerCount);

        // Calculate payouts
        uint256 idx = 0;
        for (uint256 i = 0; i < _participants.length; i++) {
            if (keccak256(bytes(_positions[i])) == winningHash) {
                winners[idx] = _participants[i];
                // Payout proportional to shares
                payouts[idx] = (_totalPrizePool * _shares[i]) / totalWinningShares;
                idx++;
            }
        }

        return (winners, payouts);
    }

    /**
     * @notice Propose CPMM distribution automatically
     */
    function proposeCPMMDistribution(
        uint256 _competitionId,
        string calldata _winningOutcome,
        address[] calldata _participants,
        string[] calldata _positions,
        uint256[] calldata _shares,
        uint256 _totalPrizePool
    ) external returns (bytes32) {
        (address[] memory winners, uint256[] memory payouts) = this.calculateCPMMDistribution(
            _competitionId,
            _winningOutcome,
            _participants,
            _positions,
            _shares,
            _totalPrizePool
        );

        return this.proposeDistribution(_competitionId, winners, payouts);
    }

    // ============================================================================
    // BRACKET DISTRIBUTION (Tournaments)
    // ============================================================================

    /**
     * @notice Calculate bracket tournament distribution
     * @param _finalRanking Addresses in order of final ranking (1st, 2nd, 3rd, etc.)
     * @param _totalPrizePool Total prize pool
     * @param _presetName Distribution preset to use
     */
    function calculateBracketDistribution(
        address[] calldata _finalRanking,
        uint256 _totalPrizePool,
        string calldata _presetName
    ) external view returns (address[] memory, uint256[] memory) {
        DistributionPreset storage preset = presets[_presetName];
        require(preset.percentages.length > 0, "Preset not found");

        uint256 recipientCount = _finalRanking.length < preset.percentages.length
            ? _finalRanking.length
            : preset.percentages.length;

        address[] memory winners = new address[](recipientCount);
        uint256[] memory amounts = new uint256[](recipientCount);

        for (uint256 i = 0; i < recipientCount; i++) {
            winners[i] = _finalRanking[i];
            amounts[i] = (_totalPrizePool * preset.percentages[i]) / 10000;
        }

        return (winners, amounts);
    }

    // ============================================================================
    // REFUND DISTRIBUTION
    // ============================================================================

    /**
     * @notice Calculate refund distribution (for cancelled competitions)
     * @param _participants Participant addresses
     * @param _contributions Original contribution amounts
     */
    function calculateRefundDistribution(
        address[] calldata _participants,
        uint256[] calldata _contributions
    ) external pure returns (address[] memory, uint256[] memory) {
        require(_participants.length == _contributions.length, "Length mismatch");

        // Full refund to all participants
        return (_participants, _contributions);
    }

    // ============================================================================
    // SIGNATURE HELPERS
    // ============================================================================

    function _getDistributionHash(
        uint256 _competitionId,
        address[] memory _recipients,
        uint256[] memory _amounts,
        uint256 _nonce
    ) internal view returns (bytes32) {
        return keccak256(abi.encode(
            DISTRIBUTION_TYPEHASH,
            _competitionId,
            keccak256(abi.encodePacked(_recipients)),
            keccak256(abi.encodePacked(_amounts)),
            _nonce,
            block.timestamp + 1 days  // deadline
        ));
    }

    function getDistributionDigest(uint256 _competitionId) external view returns (bytes32) {
        Distribution storage dist = distributions[_competitionId];
        bytes32 structHash = _getDistributionHash(
            _competitionId,
            dist.recipients,
            dist.amounts,
            nonces[_competitionId]
        );
        return _hashTypedDataV4(structHash);
    }

    // ============================================================================
    // SIGNER MANAGEMENT
    // ============================================================================

    function addSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid address");
        authorizedSigners[_signer] = true;
        emit SignerAdded(_signer);
    }

    function removeSigner(address _signer) external onlyOwner {
        authorizedSigners[_signer] = false;
        emit SignerRemoved(_signer);
    }

    function setRequiredSignatures(uint256 _required) external onlyOwner {
        require(_required > 0, "Must require at least 1");
        requiredSignatures = _required;
    }

    // ============================================================================
    // PRESET MANAGEMENT
    // ============================================================================

    function createPreset(
        string calldata _name,
        uint256[] calldata _percentages
    ) external onlyOwner {
        uint256 total = 0;
        for (uint256 i = 0; i < _percentages.length; i++) {
            total += _percentages[i];
        }
        require(total == 10000, "Percentages must sum to 10000");

        presets[_name] = DistributionPreset(_name, _percentages);
        emit PresetCreated(_name, _percentages);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getDistribution(uint256 _competitionId) external view returns (
        address[] memory recipients,
        uint256[] memory amounts,
        bool executed,
        uint256 totalAmount
    ) {
        Distribution storage dist = distributions[_competitionId];
        return (dist.recipients, dist.amounts, dist.executed, dist.totalAmount);
    }

    function getPreset(string calldata _name) external view returns (
        string memory name,
        uint256[] memory percentages
    ) {
        DistributionPreset storage preset = presets[_name];
        return (preset.name, preset.percentages);
    }

    function getSignatureStatus(uint256 _competitionId) external view returns (
        uint256 collected,
        uint256 required,
        bool canExecute
    ) {
        Distribution storage dist = distributions[_competitionId];
        bytes32 distributionHash = _getDistributionHash(
            _competitionId,
            dist.recipients,
            dist.amounts,
            nonces[_competitionId]
        );

        collected = signatureCount[distributionHash];
        required = requiredSignatures;
        canExecute = collected >= required && !dist.executed;
    }

    // ============================================================================
    // EIP-712 DOMAIN
    // ============================================================================

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
