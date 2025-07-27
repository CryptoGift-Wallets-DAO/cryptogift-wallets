// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IGate.sol";

/**
 * @title GiftEscrow v2.0 Enterprise - Zero Custody Architecture
 * @dev Secure escrow for temporally-locked NFT gifts with registerGiftMinted for zero-custody flow
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 * 
 * KEY IMPROVEMENT: registerGiftMinted function allows direct mint-to-escrow without custody
 */
contract GiftEscrowEnterpriseV2 is 
    ERC2771Context,
    AccessControl,
    Pausable,
    ReentrancyGuard,
    IERC721Receiver,
    IERC1155Receiver
{
    using ECDSA for bytes32;

    // =============================================================================
    // CONSTANTS
    // =============================================================================
    
    string public constant VERSION = "2.0.0";
    bool public constant IMMUTABLE = true;
    
    uint256 public constant FIFTEEN_MINUTES = 900;
    uint256 public constant SEVEN_DAYS = 604800;
    uint256 public constant FIFTEEN_DAYS = 1296000;
    uint256 public constant THIRTY_DAYS = 2592000;
    
    uint8 public constant MAX_ATTEMPTS = 5;
    uint32 public constant BASE_COOLDOWN = 300;
    uint32 public constant MAX_COOLDOWN = 86400;
    uint256 public constant MAX_BATCH_SIZE = 25;
    uint256 public constant MIN_GAS_PER_ITEM = 30000;
    uint256 public constant GATE_GAS_LIMIT = 50000;
    
    uint32 public constant MAX_DAILY_ATTEMPTS = 10;
    uint32 public constant MAX_FAILED_ATTEMPTS = 3;
    uint32 public constant FAILED_COOLDOWN = 3600;
    
    uint256 public constant MAX_INCENTIVE_PER_TX = 0.05 ether;
    uint256 public constant INCENTIVE_PER_ITEM = 0.002 ether;
    
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant GATE_MANAGER_ROLE = keccak256("GATE_MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
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
    error NFTNotOwnedByEscrow(address nftContract, uint256 tokenId);
    error InvalidCreator(address creator);

    // =============================================================================
    // STRUCTS
    // =============================================================================
    
    struct Gift {
        address creator;        
        address collection;     
        address gate;          
        uint96 tokenId;        
        uint40 expiresAt;      
        bool claimed;          
        bool returned;         
        bytes32 passHash;      
    }
    
    struct AttemptInfo {
        uint32 count;          
        uint32 lastAttempt;    
        uint32 lockUntil;      
    }

    struct PaymasterData {
        uint32 dailyAttempts;
        uint32 lastResetDay;
        uint32 failedAttempts;
        uint32 cooldownUntil;
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    uint256 public giftCounter;
    mapping(uint256 => Gift) public gifts;
    mapping(uint256 => string) public giftMessages;
    mapping(uint256 => AttemptInfo) public attemptInfo;
    mapping(address => bool) public disabledGates;
    mapping(uint256 => address) public giftGateOverride;
    mapping(uint256 => uint256) public giftNonces;
    mapping(bytes32 => bool) public usedSignatures;
    mapping(bytes4 => bool) public whitelistedMethods;
    mapping(address => PaymasterData) public paymasterData;
    
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
    
    event GiftRegisteredFromMint(
        uint256 indexed giftId,
        address indexed creator,
        address indexed nftContract,
        uint256 tokenId,
        uint40 expiresAt,
        address gate,
        string giftMessage,
        address registeredBy
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

    event GiftLockTriggered(
        uint256 indexed giftId,
        address indexed attacker,
        uint32 attempts,
        uint32 lockUntil
    );

    event GateStatusChanged(
        address indexed gate,
        bool disabled,
        address indexed manager
    );

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(address trustedForwarder) 
        ERC2771Context(trustedForwarder) 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        _grantRole(EMERGENCY_ROLE, _msgSender());
        _grantRole(GATE_MANAGER_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender());
        
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("GiftEscrow"),
            keccak256("2.0.0"),
            block.chainid,
            address(this)
        ));
    }

    // =============================================================================
    // REQUIRED OVERRIDES
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

    function _contextSuffixLength()
        internal
        view
        override(Context, ERC2771Context)
        returns (uint256)
    {
        return ERC2771Context._contextSuffixLength();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // =============================================================================
    // CORE FUNCTIONS - ZERO CUSTODY ARCHITECTURE
    // =============================================================================
    
    /**
     * @dev ZERO CUSTODY FUNCTION: Register NFT already minted to escrow contract
     * @param tokenId The tokenId that was minted directly to this escrow contract
     * @param nftContract The NFT contract address
     * @param creator The original creator of the gift (not msg.sender)
     * @param password Plain text password for the gift
     * @param salt Salt for password hashing
     * @param timeframe Timeframe option (0-3)
     * @param giftMessage Message for the gift
     * @param gate Optional gate contract for additional verification
     * 
     * SECURITY: Only MINTER_ROLE can call this (backend relayer)
     * VERIFICATION: Confirms NFT is owned by this escrow before registration
     */
    function registerGiftMinted(
        uint256 tokenId,
        address nftContract,
        address creator,
        string calldata password,
        bytes32 salt,
        uint256 timeframe,
        string calldata giftMessage,
        address gate
    ) external nonReentrant whenNotPaused onlyRole(MINTER_ROLE) {
        if (nftContract == address(0)) revert InvalidRecipient(nftContract);
        if (creator == address(0)) revert InvalidCreator(creator);
        if (bytes(password).length < 6 || bytes(password).length > 128) {
            revert("Password must be 6-128 characters");
        }
        if (bytes(giftMessage).length > 200) revert InvalidGiftMessage(giftMessage);
        
        // CRITICAL: Verify NFT is owned by this escrow contract
        try IERC721(nftContract).ownerOf(tokenId) returns (address owner) {
            if (owner != address(this)) {
                revert NFTNotOwnedByEscrow(nftContract, tokenId);
            }
        } catch {
            revert NFTNotOwnedByEscrow(nftContract, tokenId);
        }
        
        uint256 duration;
        if (timeframe == 0) duration = FIFTEEN_MINUTES;
        else if (timeframe == 1) duration = SEVEN_DAYS;
        else if (timeframe == 2) duration = FIFTEEN_DAYS;
        else if (timeframe == 3) duration = THIRTY_DAYS;
        else revert InvalidTimeframe(timeframe);
        
        uint256 giftId = ++giftCounter;
        uint40 expiresAt = uint40(block.timestamp + duration);
        
        bytes32 passHash = keccak256(abi.encodePacked(
            password,
            salt,
            giftId,
            address(this),
            block.chainid
        ));
        
        gifts[giftId] = Gift({
            creator: creator,
            collection: nftContract,
            gate: gate,
            tokenId: uint96(tokenId),
            expiresAt: expiresAt,
            claimed: false,
            returned: false,
            passHash: passHash
        });
        
        if (bytes(giftMessage).length > 0) {
            giftMessages[giftId] = giftMessage;
        }
        
        emit GiftRegisteredFromMint(
            giftId,
            creator,
            nftContract,
            tokenId,
            expiresAt,
            gate,
            giftMessage,
            _msgSender()
        );
    }
    
    /**
     * @dev LEGACY FUNCTION: Create gift with existing NFT transfer
     * @notice Requires msg.sender to own the NFT and approve this contract
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
        if (nftContract == address(0)) revert InvalidRecipient(nftContract);
        if (bytes(password).length < 6 || bytes(password).length > 128) {
            revert("Password must be 6-128 characters");
        }
        if (bytes(giftMessage).length > 200) revert InvalidGiftMessage(giftMessage);
        
        uint256 duration;
        if (timeframe == 0) duration = FIFTEEN_MINUTES;
        else if (timeframe == 1) duration = SEVEN_DAYS;
        else if (timeframe == 2) duration = FIFTEEN_DAYS;
        else if (timeframe == 3) duration = THIRTY_DAYS;
        else revert InvalidTimeframe(timeframe);
        
        uint256 giftId = ++giftCounter;
        uint40 expiresAt = uint40(block.timestamp + duration);
        
        bytes32 passHash = keccak256(abi.encodePacked(
            password,
            salt,
            giftId,
            address(this),
            block.chainid
        ));
        
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
        
        if (bytes(giftMessage).length > 0) {
            giftMessages[giftId] = giftMessage;
        }
        
        IERC721(nftContract).safeTransferFrom(
            _msgSender(),
            address(this),
            tokenId
        );
        
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
    
    function claimGift(
        uint256 giftId,
        string calldata password,
        bytes32 salt,
        bytes calldata gateData
    ) external nonReentrant whenNotPaused {
        Gift storage gift = gifts[giftId];
        
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        if (block.timestamp >= gift.expiresAt) revert GiftExpired(giftId, gift.expiresAt);
        
        // Anti-brute force protection
        AttemptInfo storage attempts = attemptInfo[giftId];
        if (block.timestamp < attempts.lockUntil) {
            revert GiftLocked(giftId, attempts.lockUntil);
        }
        
        bytes32 expectedHash = keccak256(abi.encodePacked(
            password,
            salt,
            giftId,
            address(this),
            block.chainid
        ));
        
        if (expectedHash != gift.passHash) {
            attempts.count++;
            attempts.lastAttempt = uint32(block.timestamp);
            
            if (attempts.count >= MAX_ATTEMPTS) {
                uint32 cooldown = _calculateCooldown(attempts.count);
                attempts.lockUntil = uint32(block.timestamp + cooldown);
                
                emit GiftLockTriggered(giftId, _msgSender(), attempts.count, attempts.lockUntil);
            }
            
            uint8 remaining = attempts.count >= MAX_ATTEMPTS ? 0 : uint8(MAX_ATTEMPTS - attempts.count);
            revert WrongPassword(giftId, remaining);
        }
        
        // Gate verification if specified
        if (gift.gate != address(0) && !disabledGates[gift.gate]) {
            try IGate(gift.gate).check{gas: GATE_GAS_LIMIT}(
                _msgSender(), 
                giftId, 
                gateData
            ) returns (bool success, string memory reason) {
                if (!success) {
                    revert GateCheckFailed(giftId, gift.gate, reason);
                }
            } catch {
                revert GateCheckFailed(giftId, gift.gate, "Gate verification failed");
            }
        }
        
        gift.claimed = true;
        
        IERC721(gift.collection).safeTransferFrom(
            address(this), 
            _msgSender(), 
            gift.tokenId
        );
        
        emit GiftClaimed(giftId, _msgSender(), _msgSender(), gift.gate, "Successfully claimed");
    }
    
    function returnExpiredGift(uint256 giftId) external nonReentrant whenNotPaused {
        Gift storage gift = gifts[giftId];
        
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        if (_msgSender() != gift.creator) revert NotGiftCreator(_msgSender(), gift.creator);
        if (block.timestamp < gift.expiresAt) revert GiftNotExpired(giftId, gift.expiresAt);
        
        gift.returned = true;
        
        IERC721(gift.collection).safeTransferFrom(
            address(this),
            gift.creator,
            gift.tokenId
        );
        
        emit GiftReturned(giftId, gift.creator, _msgSender(), block.timestamp);
    }

    // =============================================================================
    // ANTI-BRUTE FORCE HELPERS
    // =============================================================================
    
    function _calculateCooldown(uint32 attempts) internal pure returns (uint32) {
        if (attempts <= MAX_ATTEMPTS) return BASE_COOLDOWN;
        
        uint256 exponentialCooldown = uint256(BASE_COOLDOWN) * (2 ** (attempts - MAX_ATTEMPTS));
        return exponentialCooldown > MAX_COOLDOWN ? MAX_COOLDOWN : uint32(exponentialCooldown);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    function canClaimGift(uint256 giftId) external view returns (bool canClaim, uint256 timeRemaining) {
        Gift storage gift = gifts[giftId];
        
        if (gift.creator == address(0) || gift.claimed || gift.returned) {
            return (false, 0);
        }
        
        if (block.timestamp >= gift.expiresAt) {
            return (false, 0);
        }
        
        AttemptInfo storage attempts = attemptInfo[giftId];
        if (block.timestamp < attempts.lockUntil) {
            return (false, 0);
        }
        
        return (true, gift.expiresAt - block.timestamp);
    }
    
    function getGift(uint256 giftId) external view returns (
        address creator,
        uint96 expirationTime,
        address nftContract,
        uint256 tokenId,
        bytes32 passwordHash,
        uint8 status
    ) {
        Gift storage gift = gifts[giftId];
        
        uint8 giftStatus = 0;
        if (gift.claimed) giftStatus = 1;
        else if (gift.returned) giftStatus = 2;
        
        return (
            gift.creator,
            gift.expiresAt,
            gift.collection,
            gift.tokenId,
            gift.passHash,
            giftStatus
        );
    }
    
    function getGiftMessage(uint256 giftId) external view returns (string memory) {
        return giftMessages[giftId];
    }
    
    function isGiftExpired(uint256 giftId) external view returns (bool) {
        return block.timestamp >= gifts[giftId].expiresAt;
    }
    
    function getAttemptInfo(uint256 giftId) external view returns (uint32 count, uint32 lastAttempt, uint32 lockUntil) {
        AttemptInfo storage info = attemptInfo[giftId];
        return (info.count, info.lastAttempt, info.lockUntil);
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    function setGateStatus(address gate, bool disabled) external onlyRole(GATE_MANAGER_ROLE) {
        disabledGates[gate] = disabled;
        emit GateStatusChanged(gate, disabled, _msgSender());
    }
    
    function withdraw(uint256 amount, address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert InvalidRecipient(to);
        if (amount > address(this).balance) revert("Insufficient balance");
        payable(to).transfer(amount);
    }

    // =============================================================================
    // RECEIVER FUNCTIONS
    // =============================================================================
    
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    // =============================================================================
    // PAYABLE FUNCTIONS
    // =============================================================================
    
    receive() external payable {}
    
    fallback() external payable {
        revert("Function not found");
    }
}