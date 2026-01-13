// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CompetitionVRFConsumer
 * @notice Chainlink VRF v2 Consumer for Competition Randomness
 * @dev Provides verifiable randomness for:
 *      - Tournament bracket seeding
 *      - Random participant selection
 *      - Lottery drawings
 *      - Verifier/judge assignment
 *      - Tiebreaker resolution
 */
contract CompetitionVRFConsumer is VRFConsumerBaseV2, Ownable, ReentrancyGuard {

    // ============================================================================
    // STATE
    // ============================================================================

    VRFCoordinatorV2Interface public immutable COORDINATOR;

    // VRF Configuration
    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint16 public requestConfirmations = 3;
    uint32 public callbackGasLimit = 200000;

    // Purpose enum for randomness requests
    enum RandomnessPurpose {
        BRACKET_SEEDING,
        PARTICIPANT_SELECTION,
        LOTTERY_DRAWING,
        VERIFIER_ASSIGNMENT,
        TIEBREAKER,
        MILESTONE_AUDIT
    }

    // Request tracking
    struct RandomnessRequest {
        uint256 competitionId;
        RandomnessPurpose purpose;
        uint32 numWords;
        bool fulfilled;
        uint256[] randomWords;
        uint256 requestedAt;
        uint256 fulfilledAt;
    }

    // Mappings
    mapping(uint256 => RandomnessRequest) public requests; // requestId => request
    mapping(uint256 => uint256[]) public competitionRequests; // competitionId => requestIds
    mapping(uint256 => uint256[]) public competitionRandomWords; // competitionId => randomWords (latest)

    // Competition factory reference
    address public competitionFactory;

    // Authorized callers
    mapping(address => bool) public authorizedCallers;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event RandomnessRequested(
        uint256 indexed requestId,
        uint256 indexed competitionId,
        RandomnessPurpose purpose,
        uint32 numWords
    );

    event RandomnessFulfilled(
        uint256 indexed requestId,
        uint256 indexed competitionId,
        uint256[] randomWords
    );

    event ConfigUpdated(
        bytes32 keyHash,
        uint64 subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit
    );

    event CallerAuthorized(address indexed caller, bool authorized);

    // ============================================================================
    // ERRORS
    // ============================================================================

    error UnauthorizedCaller();
    error InvalidNumWords();
    error RequestNotFound();
    error RequestNotFulfilled();
    error InvalidCompetitionId();

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor(
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable(msg.sender) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner() && msg.sender != competitionFactory) {
            revert UnauthorizedCaller();
        }
        _;
    }

    // ============================================================================
    // RANDOMNESS REQUESTS
    // ============================================================================

    /**
     * @notice Request random words for a competition
     * @param _competitionId Competition ID
     * @param _purpose Purpose of randomness
     * @param _numWords Number of random words (max 500)
     * @return requestId The VRF request ID
     */
    function requestRandomness(
        uint256 _competitionId,
        RandomnessPurpose _purpose,
        uint32 _numWords
    ) external onlyAuthorized nonReentrant returns (uint256 requestId) {
        if (_numWords == 0 || _numWords > 500) {
            revert InvalidNumWords();
        }

        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            _numWords
        );

        requests[requestId] = RandomnessRequest({
            competitionId: _competitionId,
            purpose: _purpose,
            numWords: _numWords,
            fulfilled: false,
            randomWords: new uint256[](0),
            requestedAt: block.timestamp,
            fulfilledAt: 0
        });

        competitionRequests[_competitionId].push(requestId);

        emit RandomnessRequested(requestId, _competitionId, _purpose, _numWords);
    }

    /**
     * @notice Request bracket seeding randomness
     * @param _competitionId Competition ID
     * @param _participantCount Number of participants to seed
     * @return requestId The VRF request ID
     */
    function requestBracketSeeding(
        uint256 _competitionId,
        uint32 _participantCount
    ) external onlyAuthorized returns (uint256) {
        // Request enough words for Fisher-Yates shuffle
        uint32 numWords = _participantCount > 500 ? 500 : _participantCount;
        return this.requestRandomness(_competitionId, RandomnessPurpose.BRACKET_SEEDING, numWords);
    }

    /**
     * @notice Request lottery drawing randomness
     * @param _competitionId Competition ID
     * @param _numWinners Number of winners to draw
     * @return requestId The VRF request ID
     */
    function requestLotteryDrawing(
        uint256 _competitionId,
        uint32 _numWinners
    ) external onlyAuthorized returns (uint256) {
        // Request enough words for multiple drawing attempts
        uint32 numWords = _numWinners * 3 > 500 ? 500 : _numWinners * 3;
        return this.requestRandomness(_competitionId, RandomnessPurpose.LOTTERY_DRAWING, numWords);
    }

    /**
     * @notice Request verifier assignment randomness
     * @param _competitionId Competition ID
     * @param _itemCount Number of items to assign verifiers to
     * @return requestId The VRF request ID
     */
    function requestVerifierAssignment(
        uint256 _competitionId,
        uint32 _itemCount
    ) external onlyAuthorized returns (uint256) {
        uint32 numWords = _itemCount > 500 ? 500 : _itemCount;
        return this.requestRandomness(_competitionId, RandomnessPurpose.VERIFIER_ASSIGNMENT, numWords);
    }

    // ============================================================================
    // VRF CALLBACK
    // ============================================================================

    /**
     * @notice Callback function used by VRF Coordinator
     * @dev Only callable by the VRF Coordinator
     */
    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        RandomnessRequest storage request = requests[_requestId];

        // Validate request exists
        if (request.requestedAt == 0) {
            revert RequestNotFound();
        }

        // Update request
        request.fulfilled = true;
        request.randomWords = _randomWords;
        request.fulfilledAt = block.timestamp;

        // Store as latest for competition
        competitionRandomWords[request.competitionId] = _randomWords;

        emit RandomnessFulfilled(_requestId, request.competitionId, _randomWords);
    }

    // ============================================================================
    // GETTERS
    // ============================================================================

    /**
     * @notice Get request details
     */
    function getRequest(uint256 _requestId) external view returns (
        uint256 competitionId,
        RandomnessPurpose purpose,
        uint32 numWords,
        bool fulfilled,
        uint256[] memory randomWords,
        uint256 requestedAt,
        uint256 fulfilledAt
    ) {
        RandomnessRequest memory request = requests[_requestId];
        return (
            request.competitionId,
            request.purpose,
            request.numWords,
            request.fulfilled,
            request.randomWords,
            request.requestedAt,
            request.fulfilledAt
        );
    }

    /**
     * @notice Get random words for a specific request
     */
    function getRandomWords(uint256 _requestId) external view returns (uint256[] memory) {
        RandomnessRequest memory request = requests[_requestId];
        if (!request.fulfilled) {
            revert RequestNotFulfilled();
        }
        return request.randomWords;
    }

    /**
     * @notice Get latest random words for a competition
     */
    function getCompetitionRandomWords(uint256 _competitionId) external view returns (uint256[] memory) {
        return competitionRandomWords[_competitionId];
    }

    /**
     * @notice Check if a request is fulfilled
     */
    function isRandomnessFulfilled(uint256 _requestId) external view returns (bool) {
        return requests[_requestId].fulfilled;
    }

    /**
     * @notice Get all request IDs for a competition
     */
    function getCompetitionRequestIds(uint256 _competitionId) external view returns (uint256[] memory) {
        return competitionRequests[_competitionId];
    }

    /**
     * @notice Get request count for a competition
     */
    function getCompetitionRequestCount(uint256 _competitionId) external view returns (uint256) {
        return competitionRequests[_competitionId].length;
    }

    // ============================================================================
    // BRACKET SEEDING HELPERS
    // ============================================================================

    /**
     * @notice Generate bracket positions using random words
     * @dev Uses Fisher-Yates shuffle algorithm
     * @param _requestId Request ID with fulfilled randomness
     * @param _participantCount Number of participants
     * @return positions Array of shuffled positions (0-indexed)
     */
    function generateBracketPositions(
        uint256 _requestId,
        uint256 _participantCount
    ) external view returns (uint256[] memory positions) {
        RandomnessRequest memory request = requests[_requestId];

        if (!request.fulfilled) {
            revert RequestNotFulfilled();
        }
        if (request.purpose != RandomnessPurpose.BRACKET_SEEDING) {
            revert("Not a bracket seeding request");
        }

        positions = new uint256[](_participantCount);

        // Initialize with sequential positions
        for (uint256 i = 0; i < _participantCount; i++) {
            positions[i] = i;
        }

        // Fisher-Yates shuffle
        for (uint256 i = _participantCount - 1; i > 0; i--) {
            uint256 j = request.randomWords[i % request.randomWords.length] % (i + 1);
            // Swap
            uint256 temp = positions[i];
            positions[i] = positions[j];
            positions[j] = temp;
        }

        return positions;
    }

    /**
     * @notice Draw lottery winners using random words
     * @param _requestId Request ID with fulfilled randomness
     * @param _ticketPool Total tickets in pool
     * @param _numWinners Number of winners to draw
     * @return winningTickets Array of winning ticket indices
     */
    function drawLotteryWinners(
        uint256 _requestId,
        uint256 _ticketPool,
        uint256 _numWinners
    ) external view returns (uint256[] memory winningTickets) {
        RandomnessRequest memory request = requests[_requestId];

        if (!request.fulfilled) {
            revert RequestNotFulfilled();
        }
        if (request.purpose != RandomnessPurpose.LOTTERY_DRAWING) {
            revert("Not a lottery drawing request");
        }

        winningTickets = new uint256[](_numWinners);
        uint256 selected = 0;
        uint256 wordIndex = 0;

        // Draw winners (with deduplication)
        while (selected < _numWinners && wordIndex < request.randomWords.length) {
            uint256 ticketIndex = request.randomWords[wordIndex] % _ticketPool;

            // Check if already selected
            bool isDuplicate = false;
            for (uint256 j = 0; j < selected; j++) {
                if (winningTickets[j] == ticketIndex) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                winningTickets[selected] = ticketIndex;
                selected++;
            }

            wordIndex++;
        }

        return winningTickets;
    }

    // ============================================================================
    // ADMIN
    // ============================================================================

    /**
     * @notice Update VRF configuration
     */
    function updateConfig(
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint16 _requestConfirmations,
        uint32 _callbackGasLimit
    ) external onlyOwner {
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        requestConfirmations = _requestConfirmations;
        callbackGasLimit = _callbackGasLimit;

        emit ConfigUpdated(_keyHash, _subscriptionId, _requestConfirmations, _callbackGasLimit);
    }

    /**
     * @notice Set competition factory address
     */
    function setCompetitionFactory(address _factory) external onlyOwner {
        competitionFactory = _factory;
    }

    /**
     * @notice Authorize/deauthorize a caller
     */
    function setAuthorizedCaller(address _caller, bool _authorized) external onlyOwner {
        authorizedCallers[_caller] = _authorized;
        emit CallerAuthorized(_caller, _authorized);
    }

    /**
     * @notice Batch authorize callers
     */
    function batchAuthorizeCaller(address[] calldata _callers, bool _authorized) external onlyOwner {
        for (uint256 i = 0; i < _callers.length; i++) {
            authorizedCallers[_callers[i]] = _authorized;
            emit CallerAuthorized(_callers[i], _authorized);
        }
    }
}
