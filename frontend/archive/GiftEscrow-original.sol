// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./IGate.sol";

/**
 * @title GiftEscrow v1.0 - Enterprise Grade NFT Gift Escrow System
 * @dev Immutable, secure escrow for temporally-locked NFT gifts with advanced security features
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard: Prevents reentrancy attacks
 * - AccessControl: Role-based permissions
 * - Pausable: Emergency pause functionality
 * - ERC2771Context: Meta-transaction support for gasless operations
 * - Anti-brute force with exponential backoff
 * - Gate system for modular claim conditions
 * - Custom errors for gas optimization
 * - CEI pattern for all state changes
 * - Comprehensive event logging
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */
contract GiftEscrow is 
    ReentrancyGuard, 
    Pausable, 
    AccessControl,
    ERC2771Context,
    IERC721Receiver,
    IERC1155Receiver,
    ERC165
{
    using ECDSA for bytes32;

    // =============================================================================
    // CONSTANTS & IMMUTABLE
    // =============================================================================
    
    string public constant VERSION = "1.0.0";
    bool public constant IMMUTABLE = true;
    
    // Time constants (in seconds)
    uint256 public constant FIFTEEN_MINUTES = 900;
    uint256 public constant SEVEN_DAYS = 604800;
    uint256 public constant FIFTEEN_DAYS = 1296000;
    uint256 public constant THIRTY_DAYS = 2592000;
    
    // Security constants
    uint8 public constant MAX_ATTEMPTS = 5;
    uint32 public constant BASE_COOLDOWN = 300; // 5 minutes
    uint32 public constant MAX_COOLDOWN = 86400; // 24 hours
    uint256 public constant MAX_BATCH_SIZE = 25;
    uint256 public constant MIN_GAS_PER_ITEM = 30000;
    uint256 public constant GATE_GAS_LIMIT = 50000;
    
    // Paymaster limits
    uint32 public constant MAX_DAILY_ATTEMPTS = 10;
    uint32 public constant MAX_FAILED_ATTEMPTS = 3;
    uint32 public constant FAILED_COOLDOWN = 3600; // 1 hour
    
    // Incentive limits
    uint256 public constant MAX_INCENTIVE_PER_TX = 0.05 ether;
    uint256 public constant INCENTIVE_PER_ITEM = 0.002 ether;
    
    // Roles
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant GATE_MANAGER_ROLE = keccak256("GATE_MANAGER_ROLE");
    
    // Domain separator for EIP-712
    bytes32 public immutable DOMAIN_SEPARATOR;

    // =============================================================================
    // CUSTOM ERRORS
    // =============================================================================
    
    error GiftNotFound(uint256 giftId);
    error GiftAlreadyClaimed(uint256 giftId);
    error GiftAlreadyReturned(uint256 giftId);
    error GiftExpired(uint256 giftId, uint256 expiredAt);
    error GiftNotExpired(uint256 giftId, uint256 expiresAt);
    error WrongPassword(uint256 giftId, uint8 attemptsRemaining);
    error GiftLocked(uint256 giftId, uint256 unlockTime);
    error GateCheckFailed(uint256 giftId, address gate, string reason);
    error GateDisabled(address gate);
    error UnauthorizedClaimer(address claimer, address required);
    error PaymasterLimitExceeded(address user, uint32 dailyUsed);
    error BatchTooLarge(uint256 requested, uint256 maxAllowed);
    error InsufficientGasForBatch(uint256 available, uint256 required);
    error InvalidSignature(bytes32 hash);
    error AuthorizationExpired(uint256 deadline);
    error InvalidRecipient(address recipient);
    error InvalidTimeframe(uint256 timeframe);
    error InvalidGiftMessage(string message);
    error NotGiftCreator(address caller, address creator);
    error PaymasterCooldownActive(address user, uint256 cooldownEnd);

    // =============================================================================
    // STRUCTS
    // =============================================================================
    
    /**
     * @dev Optimized gift structure - 3 storage slots
     */
    struct Gift {
        address creator;        // 20 bytes - slot 1
        address collection;     // 20 bytes - slot 2 (start)
        address gate;          // 20 bytes - slot 2 (end) 
        uint96 tokenId;        // 12 bytes - slot 3 (start)
        uint40 expiresAt;      // 5 bytes  - slot 3 (mid)
        bool claimed;          // 1 byte   - slot 3 (end)
        bool returned;         // 1 byte   - slot 3 (end)
        bytes32 passHash;      // 32 bytes - slot 4
    }
    
    /**
     * @dev Compact attempt tracking
     */
    struct AttemptInfo {
        uint32 count;          // Failed attempts count
        uint32 lastAttempt;    // Last attempt timestamp
        uint32 lockUntil;      // Locked until timestamp
    }
    
    /**
     * @dev User rate limiting for paymaster
     */
    struct UserLimits {
        uint32 dailyAttempts;     // Attempts today
        uint32 lastResetDay;      // Last reset day
        uint32 failedAttempts;    // Failed attempts
        uint32 lastFailTime;      // Last failure timestamp
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // Core state
    uint256 public giftCounter;
    mapping(uint256 => Gift) public gifts;
    mapping(uint256 => string) public giftMessages;
    
    // Security state
    mapping(uint256 => AttemptInfo) public attemptInfo;
    mapping(address => UserLimits) public userLimits;
    mapping(uint256 => uint256) public giftNonces;
    mapping(bytes32 => bool) public usedSignatures;
    
    // Gate management
    mapping(address => bool) public disabledGates;
    mapping(uint256 => address) public giftGateOverride;
    
    // Paymaster configuration
    mapping(bytes4 => bool) public whitelistedMethods;
    uint256 public paymasterMinBalance = 0.1 ether;
    uint256 public maxFailedUserOpsPerHour = 100;
    mapping(uint256 => uint256) public hourlyFailedOps;

    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event GiftCreated(
        uint256 indexed giftId,
        address indexed creator,
        address indexed nftContract,
        uint256 tokenId,
        uint40 expiresAt,
        address gate,
        string giftMessage
    );
    
    event GiftClaimed(
        uint256 indexed giftId,
        address indexed claimer,
        address indexed recipient,
        address gate,
        string gateReason
    );
    
    event GiftReturned(
        uint256 indexed giftId,
        address indexed creator,
        address indexed returnedBy,
        uint256 timestamp
    );
    
    event PasswordAttemptFailed(
        uint256 indexed giftId,
        address indexed attacker,
        uint32 attemptCount
    );
    
    event GiftLockedEvent(
        uint256 indexed giftId,
        uint32 cooldownSeconds,
        uint32 totalAttempts
    );
    
    event PaymasterAbusePrevented(
        address indexed user,
        uint32 failedAttempts
    );
    
    event GateCheckFailedEvent(
        uint256 indexed giftId,
        address indexed gate,
        string reason
    );
    
    event GateDisabledEvent(
        address indexed gate,
        address indexed admin,
        string reason
    );
    
    event EmergencyGateOverride(
        uint256 indexed giftId,
        address indexed newGate,
        address indexed admin,
        string reason
    );
    
    event BatchReturnCompleted(
        uint256 processed,
        uint256 total,
        uint256 gasUsed
    );
    
    event BatchIncentivePaid(
        address indexed recipient,
        uint256 amount,
        uint256 itemsProcessed
    );
    
    event PaymasterLowBalance(
        uint256 currentBalance,
        uint256 minimumRequired
    );
    
    event PaymasterHighFailureRate(
        uint256 hour,
        uint256 failedOps
    );
    
    event EmergencyReturn(
        uint256 indexed giftId,
        address indexed creator,
        address indexed admin
    );


    // =============================================================================
    // MODIFIERS
    // =============================================================================
    
    /**
     * @dev Anti-brute force with exponential backoff
     */
    modifier smartRateLimit(uint256 giftId) {
        AttemptInfo storage info = attemptInfo[giftId];
        
        // Check if locked
        if (info.lockUntil > block.timestamp) {
            revert GiftLocked(giftId, info.lockUntil);
        }
        
        // Auto-cleanup old attempts (24h)
        if (block.timestamp > info.lastAttempt + 86400) {
            delete attemptInfo[giftId];
        }
        
        _;
    }
    
    /**
     * @dev Paymaster rate limiting and monitoring
     */
    modifier paymasterRateLimit() {
        if (_isTrustedForwarder(msg.sender)) {
            address user = _msgSender();
            UserLimits storage limits = userLimits[user];
            
            uint32 today = uint32(block.timestamp / 1 days);
            
            // Reset daily counter
            if (limits.lastResetDay != today) {
                limits.dailyAttempts = 0;
                limits.lastResetDay = today;
            }
            
            // Check daily limit
            if (limits.dailyAttempts >= MAX_DAILY_ATTEMPTS) {
                revert PaymasterLimitExceeded(user, limits.dailyAttempts);
            }
            
            // Check failed attempts cooldown
            if (limits.failedAttempts >= MAX_FAILED_ATTEMPTS) {
                if (block.timestamp <= limits.lastFailTime + FAILED_COOLDOWN) {
                    revert PaymasterCooldownActive(user, limits.lastFailTime + FAILED_COOLDOWN);
                }
                // Reset after cooldown
                limits.failedAttempts = 0;
            }
            
            limits.dailyAttempts++;
            
            // Health monitoring
            _paymasterHealthCheck();
        }
        _;
    }
    
    /**
     * @dev Only whitelisted methods for paymaster
     */
    modifier onlyWhitelistedForPaymaster() {
        if (_isTrustedForwarder(msg.sender)) {
            if (!whitelistedMethods[msg.sig]) {
                revert("Method not whitelisted for paymaster");
            }
        }
        _;
    }

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(address trustedForwarder) 
        AccessControl()
        ERC2771Context(trustedForwarder) 
    {
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        _grantRole(GATE_MANAGER_ROLE, msg.sender);
        
        // Whitelist methods for paymaster
        whitelistedMethods[this.claimGift.selector] = true;
        whitelistedMethods[this.claimGiftFor.selector] = true;
        whitelistedMethods[this.returnExpiredGiftPublic.selector] = true;
        whitelistedMethods[this.batchReturnExpiredIncentivized.selector] = true;
        
        // Setup EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("GiftEscrow"),
            keccak256("1.0.0"),
            block.chainid,
            address(this)
        ));
    }

    // =============================================================================
    // CORE FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Create a new gift with enhanced security
     */
    function createGift(
        uint256 tokenId,
        address nftContract,
        string calldata password,
        bytes32 salt,
        uint256 timeframe,
        string calldata giftMessage,
        address gate
    ) external nonReentrant whenNotPaused {
        // Input validation
        if (nftContract == address(0)) revert InvalidRecipient(nftContract);
        if (bytes(password).length < 6 || bytes(password).length > 128) {
            revert("Password must be 6-128 characters");
        }
        if (bytes(giftMessage).length > 200) revert InvalidGiftMessage(giftMessage);
        
        // Validate timeframe
        uint256 duration;
        if (timeframe == 0) duration = FIFTEEN_MINUTES;
        else if (timeframe == 1) duration = SEVEN_DAYS;
        else if (timeframe == 2) duration = FIFTEEN_DAYS;
        else if (timeframe == 3) duration = THIRTY_DAYS;
        else revert InvalidTimeframe(timeframe);
        
        // Validate gate if provided
        if (gate != address(0)) {
            if (disabledGates[gate]) revert GateDisabled(gate);
            // Basic gate validation
            try IGate(gate).isActive() returns (bool active) {
                if (!active) revert("Gate not active");
            } catch {
                revert("Invalid gate contract");
            }
        }
        
        uint256 giftId = ++giftCounter;
        uint40 expiresAt = uint40(block.timestamp + duration);
        
        // Generate secure password hash
        bytes32 passHash = _generateSecureHash(password, salt, giftId);
        
        // === EFFECTS ===
        gifts[giftId] = Gift({
            creator: _msgSender(),
            collection: nftContract,
            gate: gate,
            tokenId: uint96(tokenId),
            expiresAt: expiresAt,
            claimed: false,
            returned: false,
            passHash: passHash
        });
        
        // Store message separately for gas optimization
        if (bytes(giftMessage).length > 0) {
            giftMessages[giftId] = _sanitizeGiftMessage(giftMessage);
        }
        
        // === INTERACTIONS ===
        IERC721(nftContract).safeTransferFrom(
            _msgSender(),
            address(this),
            tokenId
        );
        
        // === EVENTS ===
        emit GiftCreated(
            giftId,
            _msgSender(),
            nftContract,
            tokenId,
            expiresAt,
            gate,
            giftMessage
        );
    }
    
    /**
     * @dev Claim gift with comprehensive security
     */
    function claimGift(
        uint256 giftId,
        string calldata password,
        bytes32 salt,
        bytes calldata gateData
    ) external 
        nonReentrant 
        whenNotPaused 
        smartRateLimit(giftId) 
        paymasterRateLimit 
        onlyWhitelistedForPaymaster 
    {
        _processGiftClaim(giftId, password, salt, _msgSender(), gateData);
    }
    
    /**
     * @dev Claim gift for another address with authorization
     */
    function claimGiftFor(
        uint256 giftId,
        string calldata password,
        bytes32 salt,
        address recipient,
        uint256 deadline,
        bytes calldata authSignature,
        bytes calldata gateData
    ) external 
        nonReentrant 
        whenNotPaused 
        smartRateLimit(giftId) 
        paymasterRateLimit 
        onlyWhitelistedForPaymaster 
    {
        // Verify authorization
        if (!_verifyClaimForAuth(giftId, _msgSender(), recipient, deadline, authSignature)) {
            revert InvalidSignature(keccak256(authSignature));
        }
        
        _processGiftClaim(giftId, password, salt, recipient, gateData);
    }
    
    /**
     * @dev Return expired gift (creator only)
     */
    function returnExpiredGift(uint256 giftId) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        Gift storage gift = gifts[giftId];
        
        // Validation
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        if (_msgSender() != gift.creator) revert NotGiftCreator(_msgSender(), gift.creator);
        if (block.timestamp < gift.expiresAt) revert GiftNotExpired(giftId, gift.expiresAt);
        
        _returnGiftInternal(giftId);
    }
    
    /**
     * @dev Public return with incentive (anyone can call)
     */
    function returnExpiredGiftPublic(uint256 giftId) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyWhitelistedForPaymaster 
    {
        Gift storage gift = gifts[giftId];
        
        // Validation
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        if (block.timestamp < gift.expiresAt) revert GiftNotExpired(giftId, gift.expiresAt);
        
        _returnGiftInternal(giftId);
        
        // Pay small incentive to caller
        if (INCENTIVE_PER_ITEM > 0 && address(this).balance >= INCENTIVE_PER_ITEM) {
            payable(_msgSender()).transfer(INCENTIVE_PER_ITEM);
        }
    }
    
    /**
     * @dev Batch return expired gifts with incentives
     */
    function batchReturnExpiredIncentivized(
        uint256[] calldata giftIds,
        address incentiveRecipient
    ) external nonReentrant whenNotPaused onlyWhitelistedForPaymaster {
        if (giftIds.length > MAX_BATCH_SIZE) {
            revert BatchTooLarge(giftIds.length, MAX_BATCH_SIZE);
        }
        if (giftIds.length == 0) revert("Empty batch");
        if (incentiveRecipient == address(0)) revert InvalidRecipient(incentiveRecipient);
        
        uint256 gasStart = gasleft();
        uint256 processed = 0;
        
        for (uint256 i = 0; i < giftIds.length; i++) {
            // Gas check
            if (gasleft() < MIN_GAS_PER_ITEM * (giftIds.length - i) + 50000) {
                break;
            }
            
            try this._returnExpiredInternal(giftIds[i]) {
                processed++;
            } catch Error(string memory reason) {
                emit GateCheckFailedEvent(giftIds[i], address(0), reason);
            } catch {
                emit GateCheckFailedEvent(giftIds[i], address(0), "Unknown error");
            }
        }
        
        // Calculate and pay incentive
        uint256 incentiveEarned = processed * INCENTIVE_PER_ITEM;
        if (incentiveEarned > MAX_INCENTIVE_PER_TX) {
            incentiveEarned = MAX_INCENTIVE_PER_TX;
        }
        
        if (incentiveEarned > 0 && address(this).balance >= incentiveEarned) {
            payable(incentiveRecipient).transfer(incentiveEarned);
            emit BatchIncentivePaid(incentiveRecipient, incentiveEarned, processed);
        }
        
        emit BatchReturnCompleted(processed, giftIds.length, gasStart - gasleft());
    }

    // =============================================================================
    // INTERNAL FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Process gift claim with full security checks
     */
    function _processGiftClaim(
        uint256 giftId,
        string calldata password,
        bytes32 salt,
        address recipient,
        bytes calldata gateData
    ) internal {
        Gift storage gift = gifts[giftId];
        
        // === CHECKS ===
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        if (block.timestamp >= gift.expiresAt) revert GiftExpired(giftId, gift.expiresAt);
        
        // Verify password
        bytes32 expectedHash = _generateSecureHash(password, salt, giftId);
        if (expectedHash != gift.passHash) {
            _recordFailedPassword(giftId);
            uint8 remaining = MAX_ATTEMPTS - attemptInfo[giftId].count;
            revert WrongPassword(giftId, remaining);
        }
        
        // Verify gate if exists
        (bool gateOk, string memory gateReason) = _checkGateSecure(
            gift.gate, 
            _msgSender(), 
            giftId, 
            gateData
        );
        if (!gateOk) revert GateCheckFailed(giftId, gift.gate, gateReason);
        
        // === EFFECTS ===
        gift.claimed = true;
        _clearAttemptInfo(giftId);
        
        // === INTERACTIONS ===
        IERC721(gift.collection).safeTransferFrom(
            address(this), 
            recipient, 
            gift.tokenId
        );
        
        // === EVENTS ===
        emit GiftClaimed(giftId, _msgSender(), recipient, gift.gate, gateReason);
    }
    
    /**
     * @dev Internal gift return with cleanup
     */
    function _returnGiftInternal(uint256 giftId) internal {
        Gift storage gift = gifts[giftId];
        
        // === EFFECTS ===
        gift.returned = true;
        
        // Cleanup storage
        delete attemptInfo[giftId];
        delete giftGateOverride[giftId];
        delete giftNonces[giftId];
        
        // === INTERACTIONS ===
        IERC721(gift.collection).safeTransferFrom(
            address(this),
            gift.creator,
            gift.tokenId
        );
        
        // === EVENTS ===
        emit GiftReturned(giftId, gift.creator, _msgSender(), block.timestamp);
    }
    
    /**
     * @dev External wrapper for batch operations
     */
    function _returnExpiredInternal(uint256 giftId) external {
        if (msg.sender != address(this)) revert("Internal only");
        
        Gift storage gift = gifts[giftId];
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        if (block.timestamp < gift.expiresAt) revert GiftNotExpired(giftId, gift.expiresAt);
        
        _returnGiftInternal(giftId);
    }
    
    /**
     * @dev Generate secure password hash with context
     */
    function _generateSecureHash(
        string calldata password,
        bytes32 salt,
        uint256 giftId
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            password,
            salt,
            giftId,
            address(this),
            block.chainid
        ));
    }
    
    /**
     * @dev Secure gate verification with staticcall
     */
    function _checkGateSecure(
        address gate,
        address claimer,
        uint256 giftId,
        bytes calldata gateData
    ) internal view returns (bool success, string memory reason) {
        // Check override
        address effectiveGate = giftGateOverride[giftId];
        if (effectiveGate == address(0)) effectiveGate = gate;
        
        if (effectiveGate == address(0)) return (true, "No gate required");
        if (disabledGates[effectiveGate]) return (false, "Gate disabled");
        
        // Prepare call data
        bytes memory callData = abi.encodeWithSelector(
            IGate.check.selector,
            claimer,
            giftId,
            gateData
        );
        
        // Staticcall with gas limit
        bool callSuccess;
        bytes memory returnData;
        
        assembly {
            callSuccess := staticcall(
                50000,                    // GATE_GAS_LIMIT
                effectiveGate,
                add(callData, 0x20),
                mload(callData),
                0,
                0
            )
            
            let returnDataSize := returndatasize()
            returnData := mload(0x40)
            mstore(0x40, add(returnData, and(add(add(returnDataSize, 0x20), 0x1f), not(0x1f))))
            mstore(returnData, returnDataSize)
            returndatacopy(add(returnData, 0x20), 0, returnDataSize)
        }
        
        if (!callSuccess) {
            return (false, "Gate call failed");
        }
        
        if (returnData.length < 64) {
            return (false, "Gate returned invalid data");
        }
        
        (bool gateResult, string memory gateReason) = abi.decode(returnData, (bool, string));
        return (gateResult, gateReason);
    }
    
    /**
     * @dev Record failed password attempt
     */
    function _recordFailedPassword(uint256 giftId) internal {
        AttemptInfo storage info = attemptInfo[giftId];
        info.count++;
        info.lastAttempt = uint32(block.timestamp);
        
        if (info.count >= MAX_ATTEMPTS) {
            // Exponential backoff
            uint32 cooldown = uint32(BASE_COOLDOWN * (3 ** (info.count - MAX_ATTEMPTS)));
            if (cooldown > MAX_COOLDOWN) cooldown = MAX_COOLDOWN;
            
            info.lockUntil = uint32(block.timestamp + cooldown);
            emit GiftLockedEvent(giftId, cooldown, info.count);
        }
        
        emit PasswordAttemptFailed(giftId, _msgSender(), info.count);
        
        // Record for paymaster if applicable
        if (_isTrustedForwarder(msg.sender)) {
            _recordFailedUserOp();
        }
    }
    
    /**
     * @dev Clear attempt info on successful claim/return
     */
    function _clearAttemptInfo(uint256 giftId) internal {
        delete attemptInfo[giftId];
        if (_isTrustedForwarder(msg.sender)) {
            delete userLimits[_msgSender()].failedAttempts;
        }
    }
    
    /**
     * @dev Verify claimGiftFor authorization
     */
    function _verifyClaimForAuth(
        uint256 giftId,
        address claimer,
        address recipient,
        uint256 deadline,
        bytes calldata signature
    ) internal returns (bool) {
        if (block.timestamp > deadline) revert AuthorizationExpired(deadline);
        if (recipient == address(0)) revert InvalidRecipient(recipient);
        
        // Increment nonce
        uint256 nonce = ++giftNonces[giftId];
        
        // Build hash
        bytes32 structHash = keccak256(abi.encode(
            keccak256("ClaimForAuth(uint256 giftId,address claimer,address recipient,uint256 nonce,uint256 deadline,uint256 chainId)"),
            giftId,
            claimer,
            recipient,
            nonce,
            deadline,
            block.chainid
        ));
        
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        
        // Check signature reuse
        if (usedSignatures[hash]) revert InvalidSignature(hash);
        usedSignatures[hash] = true;
        
        // Verify signature
        address signer = hash.recover(signature);
        return signer == recipient;
    }
    
    /**
     * @dev Sanitize gift message
     */
    function _sanitizeGiftMessage(string calldata message) internal pure returns (string memory) {
        bytes memory messageBytes = bytes(message);
        if (messageBytes.length == 0) return "";
        
        // Basic sanitization - remove control characters
        bytes memory sanitized = new bytes(messageBytes.length);
        uint256 writeIndex = 0;
        
        for (uint256 i = 0; i < messageBytes.length; i++) {
            bytes1 char = messageBytes[i];
            // Allow printable ASCII and common unicode
            if (uint8(char) >= 32 && uint8(char) <= 126) {
                sanitized[writeIndex++] = char;
            }
        }
        
        // Resize array
        assembly {
            mstore(sanitized, writeIndex)
        }
        
        return string(sanitized);
    }
    
    /**
     * @dev Record failed UserOp for monitoring
     */
    function _recordFailedUserOp() internal {
        address user = _msgSender();
        UserLimits storage limits = userLimits[user];
        limits.failedAttempts++;
        limits.lastFailTime = uint32(block.timestamp);
        
        uint256 currentHour = block.timestamp / 1 hours;
        hourlyFailedOps[currentHour]++;
        
        emit PaymasterAbusePrevented(user, limits.failedAttempts);
    }
    
    /**
     * @dev Paymaster health monitoring
     */
    function _paymasterHealthCheck() internal {
        // Check balance
        if (address(this).balance < paymasterMinBalance) {
            emit PaymasterLowBalance(address(this).balance, paymasterMinBalance);
        }
        
        // Check failure rate
        uint256 currentHour = block.timestamp / 1 hours;
        if (hourlyFailedOps[currentHour] > maxFailedUserOpsPerHour) {
            emit PaymasterHighFailureRate(currentHour, hourlyFailedOps[currentHour]);
        }
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Disable malicious gate
     */
    function disableGate(address gate, string calldata reason) 
        external 
        onlyRole(GATE_MANAGER_ROLE) 
    {
        disabledGates[gate] = true;
        emit GateDisabledEvent(gate, _msgSender(), reason);
    }
    
    /**
     * @dev Emergency gate override
     */
    function emergencyGateOverride(uint256 giftId, address newGate, string calldata reason)
        external
        onlyRole(EMERGENCY_ROLE)
    {
        if (gifts[giftId].creator == address(0)) revert GiftNotFound(giftId);
        giftGateOverride[giftId] = newGate;
        emit EmergencyGateOverride(giftId, newGate, _msgSender(), reason);
    }
    
    /**
     * @dev Emergency return (works even when paused)
     */
    function emergencyReturn(uint256 giftId) 
        external 
        nonReentrant 
        onlyRole(EMERGENCY_ROLE) 
    {
        Gift storage gift = gifts[giftId];
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        
        gift.returned = true;
        
        IERC721(gift.collection).safeTransferFrom(
            address(this),
            gift.creator,
            gift.tokenId
        );
        
        emit EmergencyReturn(giftId, gift.creator, _msgSender());
    }
    
    /**
     * @dev Pause contract (emergency only)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Withdraw contract balance for paymaster refill
     */
    function withdraw(uint256 amount, address to) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (to == address(0)) revert InvalidRecipient(to);
        if (amount > address(this).balance) revert("Insufficient balance");
        
        payable(to).transfer(amount);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Check if gift can be claimed
     */
    function canClaimGift(uint256 giftId) 
        external 
        view 
        returns (bool canClaim, uint256 timeRemaining) 
    {
        Gift storage gift = gifts[giftId];
        
        if (gift.creator == address(0) || gift.claimed || gift.returned) {
            return (false, 0);
        }
        
        if (block.timestamp >= gift.expiresAt) {
            return (false, 0);
        }
        
        // Check if locked due to failed attempts
        AttemptInfo storage info = attemptInfo[giftId];
        if (info.lockUntil > block.timestamp) {
            return (false, gift.expiresAt - block.timestamp);
        }
        
        return (true, gift.expiresAt - block.timestamp);
    }
    
    /**
     * @dev Get gift information
     */
    function getGift(uint256 giftId) 
        external 
        view 
        returns (
            address creator,
            uint96 expirationTime,
            address nftContract,
            uint256 tokenId,
            bytes32 passwordHash,
            uint8 status
        ) 
    {
        Gift storage gift = gifts[giftId];
        
        uint8 giftStatus = 0; // Active
        if (gift.claimed) giftStatus = 1; // Claimed
        else if (gift.returned) giftStatus = 2; // Returned
        
        return (
            gift.creator,
            gift.expiresAt,
            gift.collection,
            gift.tokenId,
            gift.passHash,
            giftStatus
        );
    }
    
    /**
     * @dev Get gift message
     */
    function getGiftMessage(uint256 giftId) external view returns (string memory) {
        return giftMessages[giftId];
    }
    
    /**
     * @dev Check if gift is expired
     */
    function isGiftExpired(uint256 giftId) external view returns (bool) {
        return block.timestamp >= gifts[giftId].expiresAt;
    }
    
    /**
     * @dev Get attempt info
     */
    function getAttemptInfo(uint256 giftId) 
        external 
        view 
        returns (uint32 count, uint32 lastAttempt, uint32 lockUntil) 
    {
        AttemptInfo storage info = attemptInfo[giftId];
        return (info.count, info.lastAttempt, info.lockUntil);
    }

    // =============================================================================
    // RECEIVER FUNCTIONS
    // =============================================================================
    
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    // =============================================================================
    // OVERRIDE FUNCTIONS
    // =============================================================================
    
    function _msgSender() 
        internal 
        view 
        override(Context, ERC2771Context) 
        returns (address) 
    {
        return ERC2771Context._msgSender();
    }
    
    function _msgData() 
        internal 
        view 
        override(Context, ERC2771Context) 
        returns (bytes calldata) 
    {
        return ERC2771Context._msgData();
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC165, AccessControl, IERC165) 
        returns (bool) 
    {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            super.supportsInterface(interfaceId);
    }
    
    // =============================================================================
    // PAYABLE FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Receive ETH for paymaster funding
     */
    receive() external payable {
        // Allow ETH deposits for paymaster
    }
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {
        revert("Function not found");
    }
}