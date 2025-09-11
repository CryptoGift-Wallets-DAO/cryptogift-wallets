// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GiftEscrow v1.0 - Deployment Version
 * @dev Minimal version for initial deployment and testing
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */
contract GiftEscrowDeploy is ReentrancyGuard, IERC721Receiver {
    
    string public constant VERSION = "1.0.0";
    bool public constant IMMUTABLE = true;
    
    uint256 public constant FIFTEEN_MINUTES = 900;
    uint256 public constant SEVEN_DAYS = 604800;
    uint256 public constant FIFTEEN_DAYS = 1296000;
    uint256 public constant THIRTY_DAYS = 2592000;
    
    uint8 public constant MAX_ATTEMPTS = 5;
    uint256 public constant MAX_BATCH_SIZE = 25;
    uint256 public constant GATE_GAS_LIMIT = 50000;
    
    struct Gift {
        address creator;        
        address collection;     
        uint96 tokenId;        
        uint40 expiresAt;      
        bool claimed;          
        bool returned;         
        bytes32 passHash;      
    }
    
    uint256 public giftCounter;
    mapping(uint256 => Gift) public gifts;
    mapping(uint256 => string) public giftMessages;
    
    address public owner;
    bool public paused;
    
    // Custom errors
    error GiftNotFound(uint256 giftId);
    error GiftAlreadyClaimed(uint256 giftId);
    error GiftAlreadyReturned(uint256 giftId);
    error GiftExpired(uint256 giftId, uint256 expiredAt);
    error GiftNotExpired(uint256 giftId, uint256 expiresAt);
    error WrongPassword(uint256 giftId, uint8 attemptsRemaining);
    error InvalidRecipient(address recipient);
    error InvalidTimeframe(uint256 timeframe);
    error NotGiftCreator(address caller, address creator);
    error OnlyOwner();
    error ContractPaused();

    event GiftCreated(
        uint256 indexed giftId,
        address indexed creator,
        address indexed nftContract,
        uint256 tokenId,
        uint40 expiresAt,
        string giftMessage
    );
    
    event GiftClaimed(
        uint256 indexed giftId,
        address indexed claimer,
        address indexed recipient
    );
    
    event GiftReturned(
        uint256 indexed giftId,
        address indexed creator,
        address indexed returnedBy,
        uint256 timestamp
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createGift(
        uint256 tokenId,
        address nftContract,
        string calldata password,
        bytes32 salt,
        uint256 timeframe,
        string calldata giftMessage
    ) external nonReentrant whenNotPaused {
        if (nftContract == address(0)) revert InvalidRecipient(nftContract);
        if (bytes(password).length < 6 || bytes(password).length > 128) {
            revert("Password must be 6-128 characters");
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
            creator: msg.sender,
            collection: nftContract,
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
            msg.sender,
            address(this),
            tokenId
        );
        
        emit GiftCreated(
            giftId,
            msg.sender,
            nftContract,
            tokenId,
            expiresAt,
            giftMessage
        );
    }
    
    function claimGift(
        uint256 giftId,
        string calldata password,
        bytes32 salt
    ) external nonReentrant whenNotPaused {
        Gift storage gift = gifts[giftId];
        
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        if (block.timestamp >= gift.expiresAt) revert GiftExpired(giftId, gift.expiresAt);
        
        bytes32 expectedHash = keccak256(abi.encodePacked(
            password,
            salt,
            giftId,
            address(this),
            block.chainid
        ));
        
        if (expectedHash != gift.passHash) {
            revert WrongPassword(giftId, 0);
        }
        
        gift.claimed = true;
        
        IERC721(gift.collection).safeTransferFrom(
            address(this), 
            msg.sender, 
            gift.tokenId
        );
        
        emit GiftClaimed(giftId, msg.sender, msg.sender);
    }
    
    function returnExpiredGift(uint256 giftId) external nonReentrant whenNotPaused {
        Gift storage gift = gifts[giftId];
        
        if (gift.creator == address(0)) revert GiftNotFound(giftId);
        if (gift.claimed) revert GiftAlreadyClaimed(giftId);
        if (gift.returned) revert GiftAlreadyReturned(giftId);
        if (msg.sender != gift.creator) revert NotGiftCreator(msg.sender, gift.creator);
        if (block.timestamp < gift.expiresAt) revert GiftNotExpired(giftId, gift.expiresAt);
        
        gift.returned = true;
        
        IERC721(gift.collection).safeTransferFrom(
            address(this),
            gift.creator,
            gift.tokenId
        );
        
        emit GiftReturned(giftId, gift.creator, msg.sender, block.timestamp);
    }

    // View functions
    function canClaimGift(uint256 giftId) external view returns (bool canClaim, uint256 timeRemaining) {
        Gift storage gift = gifts[giftId];
        
        if (gift.creator == address(0) || gift.claimed || gift.returned) {
            return (false, 0);
        }
        
        if (block.timestamp >= gift.expiresAt) {
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

    // Admin functions
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
    
    function withdraw(uint256 amount, address to) external onlyOwner {
        if (to == address(0)) revert InvalidRecipient(to);
        if (amount > address(this).balance) revert("Insufficient balance");
        payable(to).transfer(amount);
    }

    // ERC721 Receiver
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // Payable
    receive() external payable {}
}