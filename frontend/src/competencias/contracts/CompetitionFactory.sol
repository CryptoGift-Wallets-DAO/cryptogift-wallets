// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CompetitionFactory
 * @notice Factory contract for creating and managing competitions
 * @dev Integrates with Gnosis Safe for fund custody and Manifold for probability markets
 *
 * Competition Types:
 * 1. PREDICTION - Binary yes/no markets
 * 2. TOURNAMENT - Bracket-style eliminations
 * 3. CHALLENGE - 1v1 or team challenges
 * 4. POOL - Contribution pools with conditions
 * 5. MILESTONE - Goal-based achievements
 * 6. RANKING - Ongoing leaderboards
 */
contract CompetitionFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================================================
    // ENUMS
    // ============================================================================

    enum CompetitionType {
        PREDICTION,
        TOURNAMENT,
        CHALLENGE,
        POOL,
        MILESTONE,
        RANKING
    }

    enum CompetitionStatus {
        DRAFT,
        PENDING,
        ACTIVE,
        RESOLUTION,
        DISPUTED,
        COMPLETED,
        CANCELLED
    }

    enum ResolutionMethod {
        SINGLE_ARBITER,
        MULTISIG_PANEL,
        ORACLE,
        COMMUNITY_VOTE,
        KLEROS,
        AI_JUDGE,
        AUTOMATIC
    }

    // ============================================================================
    // STRUCTS
    // ============================================================================

    struct Competition {
        uint256 id;
        CompetitionType competitionType;
        CompetitionStatus status;
        address creator;
        address safeAddress;
        string metadataURI;  // IPFS URI with full details

        // Timing
        uint256 createdAt;
        uint256 startsAt;
        uint256 endsAt;
        uint256 resolutionDeadline;

        // Financial
        uint256 entryFee;
        uint256 prizePool;
        address currency;  // address(0) for ETH

        // Resolution
        ResolutionMethod resolutionMethod;
        uint256 requiredSignatures;
        uint256 disputePeriod;

        // Manifold integration
        string manifoldMarketId;

        // Counters
        uint256 participantCount;
        uint256 maxParticipants;
    }

    struct Judge {
        address judgeAddress;
        uint8 role;  // 0: primary, 1: backup, 2: appeal
        bool hasVoted;
        string vote;
        uint256 votedAt;
    }

    struct Participant {
        address participantAddress;
        string position;  // YES, NO, team name, etc.
        uint256 amount;
        uint256 joinedAt;
        uint256 shares;
    }

    // ============================================================================
    // STATE
    // ============================================================================

    // Competition storage
    uint256 public competitionCount;
    mapping(uint256 => Competition) public competitions;
    mapping(uint256 => Judge[]) public competitionJudges;
    mapping(uint256 => Participant[]) public competitionParticipants;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => bool)) public isJudge;

    // Fee configuration
    uint256 public platformFeePercent = 250;  // 2.5% in basis points
    address public feeRecipient;

    // Approved tokens for competitions
    mapping(address => bool) public approvedTokens;

    // Safe factory for creating competition safes
    address public safeFactory;
    address public safeSingleton;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event CompetitionCreated(
        uint256 indexed competitionId,
        CompetitionType competitionType,
        address indexed creator,
        address safeAddress,
        string metadataURI
    );

    event ParticipantJoined(
        uint256 indexed competitionId,
        address indexed participant,
        string position,
        uint256 amount
    );

    event BetPlaced(
        uint256 indexed competitionId,
        address indexed bettor,
        string position,
        uint256 amount,
        uint256 shares
    );

    event JudgeAdded(
        uint256 indexed competitionId,
        address indexed judge,
        uint8 role
    );

    event JudgeVoted(
        uint256 indexed competitionId,
        address indexed judge,
        string vote
    );

    event ResolutionStarted(
        uint256 indexed competitionId,
        uint256 timestamp
    );

    event DisputeRaised(
        uint256 indexed competitionId,
        address indexed disputer,
        string reason
    );

    event CompetitionResolved(
        uint256 indexed competitionId,
        string outcome,
        uint256 timestamp
    );

    event PrizeDistributed(
        uint256 indexed competitionId,
        address indexed recipient,
        uint256 amount
    );

    event CompetitionCancelled(
        uint256 indexed competitionId,
        string reason
    );

    event StatusChanged(
        uint256 indexed competitionId,
        CompetitionStatus oldStatus,
        CompetitionStatus newStatus
    );

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor(
        address _feeRecipient,
        address _safeFactory,
        address _safeSingleton
    ) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
        safeFactory = _safeFactory;
        safeSingleton = _safeSingleton;

        // Approve ETH by default (address(0))
        approvedTokens[address(0)] = true;
    }

    // ============================================================================
    // COMPETITION CREATION
    // ============================================================================

    /**
     * @notice Create a new competition
     * @param _type Competition type
     * @param _metadataURI IPFS URI containing full competition details
     * @param _startsAt When the competition starts
     * @param _endsAt When the competition ends
     * @param _resolutionDeadline Deadline for resolution
     * @param _entryFee Entry fee amount
     * @param _currency Token address (address(0) for ETH)
     * @param _resolutionMethod How the competition will be resolved
     * @param _requiredSignatures Signatures needed for multisig resolution
     * @param _disputePeriod Time allowed for disputes
     * @param _maxParticipants Maximum participants (0 for unlimited)
     */
    function createCompetition(
        CompetitionType _type,
        string calldata _metadataURI,
        uint256 _startsAt,
        uint256 _endsAt,
        uint256 _resolutionDeadline,
        uint256 _entryFee,
        address _currency,
        ResolutionMethod _resolutionMethod,
        uint256 _requiredSignatures,
        uint256 _disputePeriod,
        uint256 _maxParticipants
    ) external whenNotPaused returns (uint256) {
        require(_startsAt >= block.timestamp, "Start time must be in future");
        require(_endsAt > _startsAt, "End time must be after start");
        require(_resolutionDeadline > _endsAt, "Resolution must be after end");
        require(approvedTokens[_currency], "Token not approved");

        uint256 competitionId = competitionCount++;

        // Create Safe for this competition
        address safeAddress = _createCompetitionSafe(competitionId, msg.sender);

        competitions[competitionId] = Competition({
            id: competitionId,
            competitionType: _type,
            status: CompetitionStatus.PENDING,
            creator: msg.sender,
            safeAddress: safeAddress,
            metadataURI: _metadataURI,
            createdAt: block.timestamp,
            startsAt: _startsAt,
            endsAt: _endsAt,
            resolutionDeadline: _resolutionDeadline,
            entryFee: _entryFee,
            prizePool: 0,
            currency: _currency,
            resolutionMethod: _resolutionMethod,
            requiredSignatures: _requiredSignatures,
            disputePeriod: _disputePeriod,
            manifoldMarketId: "",
            participantCount: 0,
            maxParticipants: _maxParticipants
        });

        emit CompetitionCreated(
            competitionId,
            _type,
            msg.sender,
            safeAddress,
            _metadataURI
        );

        return competitionId;
    }

    /**
     * @notice Create a Gnosis Safe for the competition
     * @dev Internal function that deploys a Safe with the creator as initial owner
     */
    function _createCompetitionSafe(
        uint256 _competitionId,
        address _creator
    ) internal returns (address) {
        // In production, this would call the Safe Proxy Factory
        // For now, we'll use a deterministic address based on competition ID
        bytes32 salt = keccak256(abi.encodePacked(_competitionId, _creator, block.timestamp));

        // Placeholder - actual Safe deployment would happen here
        // Using CREATE2 for deterministic addresses
        address predictedAddress = address(uint160(uint256(salt)));

        return predictedAddress;
    }

    // ============================================================================
    // PARTICIPATION
    // ============================================================================

    /**
     * @notice Join a competition
     * @param _competitionId Competition to join
     * @param _position Position/side (YES, NO, team name, etc.)
     */
    function joinCompetition(
        uint256 _competitionId,
        string calldata _position
    ) external payable nonReentrant whenNotPaused {
        Competition storage comp = competitions[_competitionId];

        require(comp.status == CompetitionStatus.PENDING || comp.status == CompetitionStatus.ACTIVE, "Not accepting participants");
        require(block.timestamp < comp.endsAt, "Competition ended");
        require(!isParticipant[_competitionId][msg.sender], "Already participating");

        if (comp.maxParticipants > 0) {
            require(comp.participantCount < comp.maxParticipants, "Max participants reached");
        }

        uint256 amount = comp.entryFee;

        // Handle payment
        if (comp.currency == address(0)) {
            require(msg.value >= amount, "Insufficient ETH");
            // Refund excess
            if (msg.value > amount) {
                payable(msg.sender).transfer(msg.value - amount);
            }
        } else {
            require(msg.value == 0, "ETH not accepted");
            IERC20(comp.currency).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Calculate platform fee
        uint256 platformFee = (amount * platformFeePercent) / 10000;
        uint256 netAmount = amount - platformFee;

        // Transfer to Safe
        if (comp.currency == address(0)) {
            payable(comp.safeAddress).transfer(netAmount);
            payable(feeRecipient).transfer(platformFee);
        } else {
            IERC20(comp.currency).safeTransfer(comp.safeAddress, netAmount);
            IERC20(comp.currency).safeTransfer(feeRecipient, platformFee);
        }

        // Record participant
        competitionParticipants[_competitionId].push(Participant({
            participantAddress: msg.sender,
            position: _position,
            amount: netAmount,
            joinedAt: block.timestamp,
            shares: 0
        }));

        isParticipant[_competitionId][msg.sender] = true;
        comp.participantCount++;
        comp.prizePool += netAmount;

        // Auto-activate if start time passed
        if (comp.status == CompetitionStatus.PENDING && block.timestamp >= comp.startsAt) {
            _updateStatus(_competitionId, CompetitionStatus.ACTIVE);
        }

        emit ParticipantJoined(_competitionId, msg.sender, _position, netAmount);
    }

    /**
     * @notice Place a bet on a prediction market
     * @param _competitionId Competition ID
     * @param _position YES or NO
     * @param _amount Amount to bet
     */
    function placeBet(
        uint256 _competitionId,
        string calldata _position,
        uint256 _amount
    ) external payable nonReentrant whenNotPaused {
        Competition storage comp = competitions[_competitionId];

        require(comp.competitionType == CompetitionType.PREDICTION, "Not a prediction market");
        require(comp.status == CompetitionStatus.ACTIVE, "Market not active");
        require(block.timestamp < comp.endsAt, "Market closed");
        require(_amount >= comp.entryFee, "Below minimum bet");

        // Handle payment
        if (comp.currency == address(0)) {
            require(msg.value >= _amount, "Insufficient ETH");
            if (msg.value > _amount) {
                payable(msg.sender).transfer(msg.value - _amount);
            }
        } else {
            require(msg.value == 0, "ETH not accepted");
            IERC20(comp.currency).safeTransferFrom(msg.sender, address(this), _amount);
        }

        // Calculate fee and transfer
        uint256 platformFee = (_amount * platformFeePercent) / 10000;
        uint256 netAmount = _amount - platformFee;

        if (comp.currency == address(0)) {
            payable(comp.safeAddress).transfer(netAmount);
            payable(feeRecipient).transfer(platformFee);
        } else {
            IERC20(comp.currency).safeTransfer(comp.safeAddress, netAmount);
            IERC20(comp.currency).safeTransfer(feeRecipient, platformFee);
        }

        // Calculate shares using CPMM (simplified)
        // In production, this would call Manifold API
        uint256 shares = _calculateShares(_competitionId, _position, netAmount);

        // Record or update participant
        if (!isParticipant[_competitionId][msg.sender]) {
            competitionParticipants[_competitionId].push(Participant({
                participantAddress: msg.sender,
                position: _position,
                amount: netAmount,
                joinedAt: block.timestamp,
                shares: shares
            }));
            isParticipant[_competitionId][msg.sender] = true;
            comp.participantCount++;
        } else {
            // Update existing participant
            Participant[] storage participants = competitionParticipants[_competitionId];
            for (uint256 i = 0; i < participants.length; i++) {
                if (participants[i].participantAddress == msg.sender) {
                    participants[i].amount += netAmount;
                    participants[i].shares += shares;
                    break;
                }
            }
        }

        comp.prizePool += netAmount;

        emit BetPlaced(_competitionId, msg.sender, _position, netAmount, shares);
    }

    /**
     * @notice Calculate shares using CPMM formula
     * @dev Simplified implementation - production uses Manifold API
     */
    function _calculateShares(
        uint256 _competitionId,
        string calldata _position,
        uint256 _amount
    ) internal view returns (uint256) {
        // Simplified CPMM calculation
        // k = y^p * n^(1-p)
        // In production, this integrates with Manifold
        Competition storage comp = competitions[_competitionId];

        // Get current pool state
        uint256 yesPool = comp.prizePool / 2;
        uint256 noPool = comp.prizePool / 2;

        if (yesPool == 0) yesPool = 1 ether;
        if (noPool == 0) noPool = 1 ether;

        bool isYes = keccak256(bytes(_position)) == keccak256(bytes("YES"));

        if (isYes) {
            // Shares = amount * noPool / (yesPool + amount)
            return (_amount * noPool) / (yesPool + _amount);
        } else {
            // Shares = amount * yesPool / (noPool + amount)
            return (_amount * yesPool) / (noPool + _amount);
        }
    }

    // ============================================================================
    // JUDGE MANAGEMENT
    // ============================================================================

    /**
     * @notice Add a judge to a competition
     * @param _competitionId Competition ID
     * @param _judge Judge address
     * @param _role 0: primary, 1: backup, 2: appeal
     */
    function addJudge(
        uint256 _competitionId,
        address _judge,
        uint8 _role
    ) external {
        Competition storage comp = competitions[_competitionId];
        require(msg.sender == comp.creator || msg.sender == owner(), "Not authorized");
        require(!isJudge[_competitionId][_judge], "Already a judge");
        require(_role <= 2, "Invalid role");

        competitionJudges[_competitionId].push(Judge({
            judgeAddress: _judge,
            role: _role,
            hasVoted: false,
            vote: "",
            votedAt: 0
        }));

        isJudge[_competitionId][_judge] = true;

        emit JudgeAdded(_competitionId, _judge, _role);
    }

    /**
     * @notice Submit a vote as a judge
     * @param _competitionId Competition ID
     * @param _vote Vote (outcome)
     */
    function submitVote(
        uint256 _competitionId,
        string calldata _vote
    ) external {
        require(isJudge[_competitionId][msg.sender], "Not a judge");

        Competition storage comp = competitions[_competitionId];
        require(
            comp.status == CompetitionStatus.RESOLUTION ||
            comp.status == CompetitionStatus.DISPUTED,
            "Not in resolution phase"
        );

        Judge[] storage judges = competitionJudges[_competitionId];
        for (uint256 i = 0; i < judges.length; i++) {
            if (judges[i].judgeAddress == msg.sender) {
                require(!judges[i].hasVoted, "Already voted");
                judges[i].hasVoted = true;
                judges[i].vote = _vote;
                judges[i].votedAt = block.timestamp;
                break;
            }
        }

        emit JudgeVoted(_competitionId, msg.sender, _vote);

        // Check if we have enough votes
        _checkResolution(_competitionId);
    }

    /**
     * @notice Check if resolution conditions are met
     */
    function _checkResolution(uint256 _competitionId) internal {
        Competition storage comp = competitions[_competitionId];
        Judge[] storage judges = competitionJudges[_competitionId];

        // Count votes
        uint256 voteCount = 0;
        mapping(bytes32 => uint256) storage voteCounts;
        string memory winningVote;
        uint256 maxVotes = 0;

        for (uint256 i = 0; i < judges.length; i++) {
            if (judges[i].hasVoted) {
                voteCount++;
                bytes32 voteHash = keccak256(bytes(judges[i].vote));
                // Note: This is simplified - actual implementation needs proper vote counting
            }
        }

        // Check if we have required signatures
        if (voteCount >= comp.requiredSignatures) {
            // Resolution can proceed
            // In production, this would trigger Safe transaction for prize distribution
        }
    }

    // ============================================================================
    // STATUS MANAGEMENT
    // ============================================================================

    /**
     * @notice Start resolution phase
     * @param _competitionId Competition ID
     */
    function startResolution(uint256 _competitionId) external {
        Competition storage comp = competitions[_competitionId];
        require(
            msg.sender == comp.creator ||
            isJudge[_competitionId][msg.sender] ||
            msg.sender == owner(),
            "Not authorized"
        );
        require(comp.status == CompetitionStatus.ACTIVE, "Not active");
        require(block.timestamp >= comp.endsAt, "Competition not ended");

        _updateStatus(_competitionId, CompetitionStatus.RESOLUTION);
        emit ResolutionStarted(_competitionId, block.timestamp);
    }

    /**
     * @notice Raise a dispute
     * @param _competitionId Competition ID
     * @param _reason Dispute reason
     */
    function raiseDispute(
        uint256 _competitionId,
        string calldata _reason
    ) external {
        Competition storage comp = competitions[_competitionId];
        require(isParticipant[_competitionId][msg.sender], "Not a participant");
        require(comp.status == CompetitionStatus.RESOLUTION, "Not in resolution");
        require(block.timestamp <= comp.resolutionDeadline + comp.disputePeriod, "Dispute period ended");

        _updateStatus(_competitionId, CompetitionStatus.DISPUTED);
        emit DisputeRaised(_competitionId, msg.sender, _reason);
    }

    /**
     * @notice Cancel a competition
     * @param _competitionId Competition ID
     * @param _reason Cancellation reason
     */
    function cancelCompetition(
        uint256 _competitionId,
        string calldata _reason
    ) external {
        Competition storage comp = competitions[_competitionId];
        require(msg.sender == comp.creator || msg.sender == owner(), "Not authorized");
        require(
            comp.status == CompetitionStatus.DRAFT ||
            comp.status == CompetitionStatus.PENDING,
            "Cannot cancel active competition"
        );

        _updateStatus(_competitionId, CompetitionStatus.CANCELLED);
        emit CompetitionCancelled(_competitionId, _reason);

        // Trigger refunds via Safe
        // In production, this would initiate Safe transactions
    }

    /**
     * @notice Update competition status
     */
    function _updateStatus(
        uint256 _competitionId,
        CompetitionStatus _newStatus
    ) internal {
        Competition storage comp = competitions[_competitionId];
        CompetitionStatus oldStatus = comp.status;
        comp.status = _newStatus;
        emit StatusChanged(_competitionId, oldStatus, _newStatus);
    }

    // ============================================================================
    // MANIFOLD INTEGRATION
    // ============================================================================

    /**
     * @notice Set Manifold market ID for a competition
     * @param _competitionId Competition ID
     * @param _marketId Manifold market ID
     */
    function setManifoldMarketId(
        uint256 _competitionId,
        string calldata _marketId
    ) external {
        Competition storage comp = competitions[_competitionId];
        require(msg.sender == comp.creator || msg.sender == owner(), "Not authorized");
        require(comp.competitionType == CompetitionType.PREDICTION, "Not a prediction");

        comp.manifoldMarketId = _marketId;
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getCompetition(uint256 _competitionId) external view returns (Competition memory) {
        return competitions[_competitionId];
    }

    function getJudges(uint256 _competitionId) external view returns (Judge[] memory) {
        return competitionJudges[_competitionId];
    }

    function getParticipants(uint256 _competitionId) external view returns (Participant[] memory) {
        return competitionParticipants[_competitionId];
    }

    function getParticipantCount(uint256 _competitionId) external view returns (uint256) {
        return competitions[_competitionId].participantCount;
    }

    function getPrizePool(uint256 _competitionId) external view returns (uint256) {
        return competitions[_competitionId].prizePool;
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee too high");  // Max 10%
        platformFeePercent = _feePercent;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        feeRecipient = _recipient;
    }

    function approveToken(address _token, bool _approved) external onlyOwner {
        approvedTokens[_token] = _approved;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================================================
    // RECEIVE
    // ============================================================================

    receive() external payable {}
}
