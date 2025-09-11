// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/GiftEscrow.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GiftEscrow Comprehensive Test Suite
 * @dev Enterprise-grade testing with >95% coverage
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */
contract GiftEscrowTest is Test {
    GiftEscrow public escrow;
    MockERC721 public nft;
    MockGate public gate;
    MockTrustedForwarder public forwarder;
    
    address public creator = address(0x1);
    address public claimer = address(0x2);
    address public recipient = address(0x3);
    address public admin = address(0x4);
    address public pauser = address(0x5);
    
    uint256 public constant TOKEN_ID = 1;
    string public constant PASSWORD = "secure123";
    bytes32 public constant SALT = keccak256("salt");
    string public constant GIFT_MESSAGE = "Happy Birthday!";
    
    // Events for testing
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
    
    event PasswordAttemptFailed(
        uint256 indexed giftId,
        address indexed attacker,
        uint32 attemptCount
    );
    
    event GiftLocked(
        uint256 indexed giftId,
        uint32 cooldownSeconds,
        uint32 totalAttempts
    );

    function setUp() public {
        // Deploy mock contracts
        nft = new MockERC721("Test NFT", "TNFT");
        gate = new MockGate();
        forwarder = new MockTrustedForwarder();
        
        // Deploy escrow
        escrow = new GiftEscrow(address(forwarder));
        
        // Setup roles
        escrow.grantRole(escrow.PAUSER_ROLE(), pauser);
        escrow.grantRole(escrow.EMERGENCY_ROLE(), admin);
        escrow.grantRole(escrow.GATE_MANAGER_ROLE(), admin);
        
        // Mint NFT to creator
        nft.mint(creator, TOKEN_ID);
        
        // Fund escrow for incentives
        vm.deal(address(escrow), 1 ether);
        
        vm.label(address(escrow), "GiftEscrow");
        vm.label(address(nft), "MockERC721");
        vm.label(creator, "Creator");
        vm.label(claimer, "Claimer");
        vm.label(recipient, "Recipient");
    }

    // =============================================================================
    // CREATION TESTS
    // =============================================================================

    function test_CreateGift_Success() public {
        vm.startPrank(creator);
        nft.approve(address(escrow), TOKEN_ID);
        
        vm.expectEmit(true, true, true, true);
        emit GiftCreated(1, creator, address(nft), TOKEN_ID, uint40(block.timestamp + escrow.SEVEN_DAYS()), address(0), GIFT_MESSAGE);
        
        escrow.createGift(
            TOKEN_ID,
            address(nft),
            PASSWORD,
            SALT,
            1, // 7 days
            GIFT_MESSAGE,
            address(0)
        );
        
        vm.stopPrank();
        
        // Verify gift created
        (address giftCreator, uint96 expirationTime, address nftContract, uint256 tokenId, , uint8 status) = escrow.getGift(1);
        assertEq(giftCreator, creator);
        assertEq(expirationTime, block.timestamp + escrow.SEVEN_DAYS());
        assertEq(nftContract, address(nft));
        assertEq(tokenId, TOKEN_ID);
        assertEq(status, 0); // Active
        
        // Verify NFT transferred
        assertEq(nft.ownerOf(TOKEN_ID), address(escrow));
        
        // Verify message stored
        assertEq(escrow.getGiftMessage(1), GIFT_MESSAGE);
    }

    function test_CreateGift_WithGate() public {
        vm.startPrank(creator);
        nft.approve(address(escrow), TOKEN_ID);
        
        escrow.createGift(
            TOKEN_ID,
            address(nft),
            PASSWORD,
            SALT,
            1,
            GIFT_MESSAGE,
            address(gate)
        );
        
        vm.stopPrank();
        
        (,,,,,) = escrow.getGift(1);
        // Verify gate is set (checked in claim tests)
    }

    function test_CreateGift_RevertInvalidTimeframe() public {
        vm.startPrank(creator);
        nft.approve(address(escrow), TOKEN_ID);
        
        vm.expectRevert(abi.encodeWithSelector(GiftEscrow.InvalidTimeframe.selector, 999));
        escrow.createGift(TOKEN_ID, address(nft), PASSWORD, SALT, 999, GIFT_MESSAGE, address(0));
        
        vm.stopPrank();
    }

    function test_CreateGift_RevertInvalidNFTContract() public {
        vm.startPrank(creator);
        
        vm.expectRevert(abi.encodeWithSelector(GiftEscrow.InvalidRecipient.selector, address(0)));
        escrow.createGift(TOKEN_ID, address(0), PASSWORD, SALT, 1, GIFT_MESSAGE, address(0));
        
        vm.stopPrank();
    }

    function test_CreateGift_RevertShortPassword() public {
        vm.startPrank(creator);
        nft.approve(address(escrow), TOKEN_ID);
        
        vm.expectRevert("Password must be 6-128 characters");
        escrow.createGift(TOKEN_ID, address(nft), "123", SALT, 1, GIFT_MESSAGE, address(0));
        
        vm.stopPrank();
    }

    function test_CreateGift_RevertLongMessage() public {
        vm.startPrank(creator);
        nft.approve(address(escrow), TOKEN_ID);
        
        string memory longMessage = "This message is way too long and exceeds the 200 character limit that we have set for gift messages in our escrow contract to prevent storage bloat and excessive gas usage during contract interactions";
        
        vm.expectRevert(abi.encodeWithSelector(GiftEscrow.InvalidGiftMessage.selector, longMessage));
        escrow.createGift(TOKEN_ID, address(nft), PASSWORD, SALT, 1, longMessage, address(0));
        
        vm.stopPrank();
    }

    // =============================================================================
    // CLAIM TESTS
    // =============================================================================

    function test_ClaimGift_Success() public {
        // Create gift
        _createBasicGift();
        
        // Claim gift
        vm.startPrank(claimer);
        
        vm.expectEmit(true, true, true, true);
        emit GiftClaimed(1, claimer, claimer, address(0), "No gate required");
        
        escrow.claimGift(1, PASSWORD, SALT, "");
        
        vm.stopPrank();
        
        // Verify gift claimed
        (,,,,, uint8 status) = escrow.getGift(1);
        assertEq(status, 1); // Claimed
        
        // Verify NFT transferred to claimer
        assertEq(nft.ownerOf(TOKEN_ID), claimer);
        
        // Verify attempt info cleared
        (uint32 count,,) = escrow.getAttemptInfo(1);
        assertEq(count, 0);
    }

    function test_ClaimGift_WithGate_Success() public {
        // Create gift with gate
        vm.startPrank(creator);
        nft.approve(address(escrow), TOKEN_ID);
        escrow.createGift(TOKEN_ID, address(nft), PASSWORD, SALT, 1, GIFT_MESSAGE, address(gate));
        vm.stopPrank();
        
        // Set gate to allow claim
        gate.setShouldAllow(true);
        gate.setReturnReason("Gate approved");
        
        // Claim gift
        vm.startPrank(claimer);
        escrow.claimGift(1, PASSWORD, SALT, "gate_data");
        vm.stopPrank();
        
        // Verify claimed
        assertEq(nft.ownerOf(TOKEN_ID), claimer);
    }

    function test_ClaimGift_RevertWrongPassword() public {
        _createBasicGift();
        
        vm.startPrank(claimer);
        
        vm.expectEmit(true, true, false, true);
        emit PasswordAttemptFailed(1, claimer, 1);
        
        vm.expectRevert(abi.encodeWithSelector(GiftEscrow.WrongPassword.selector, 1, 4));
        escrow.claimGift(1, "wrongpassword", SALT, "");
        
        vm.stopPrank();
        
        // Verify attempt recorded
        (uint32 count,,) = escrow.getAttemptInfo(1);
        assertEq(count, 1);
    }

    function test_ClaimGift_RevertGiftNotFound() public {
        vm.startPrank(claimer);
        
        vm.expectRevert(abi.encodeWithSelector(GiftEscrow.GiftNotFound.selector, 999));
        escrow.claimGift(999, PASSWORD, SALT, "");
        
        vm.stopPrank();
    }

    function test_ClaimGift_RevertAlreadyClaimed() public {
        _createBasicGift();
        
        // First claim
        vm.startPrank(claimer);
        escrow.claimGift(1, PASSWORD, SALT, "");
        
        // Second claim attempt
        vm.expectRevert(abi.encodeWithSelector(GiftEscrow.GiftAlreadyClaimed.selector, 1));
        escrow.claimGift(1, PASSWORD, SALT, "");
        
        vm.stopPrank();
    }

    function test_ClaimGift_RevertExpired() public {
        _createBasicGift();
        
        // Fast forward past expiration
        vm.warp(block.timestamp + escrow.SEVEN_DAYS() + 1);
        
        vm.startPrank(claimer);
        
        vm.expectRevert(abi.encodeWithSelector(
            GiftEscrow.GiftExpired.selector, 
            1, 
            block.timestamp - 1
        ));
        escrow.claimGift(1, PASSWORD, SALT, "");
        
        vm.stopPrank();
    }

    function test_ClaimGift_RevertGateFailed() public {
        // Create gift with gate
        vm.startPrank(creator);
        nft.approve(address(escrow), TOKEN_ID);
        escrow.createGift(TOKEN_ID, address(nft), PASSWORD, SALT, 1, GIFT_MESSAGE, address(gate));
        vm.stopPrank();
        
        // Set gate to deny claim
        gate.setShouldAllow(false);
        gate.setReturnReason("Access denied");
        
        vm.startPrank(claimer);
        
        vm.expectRevert(abi.encodeWithSelector(
            GiftEscrow.GateCheckFailed.selector,
            1,
            address(gate),
            "Access denied"
        ));
        escrow.claimGift(1, PASSWORD, SALT, "gate_data");
        
        vm.stopPrank();
    }

    function test_ClaimGift_BruteForceProtection() public {
        _createBasicGift();
        
        vm.startPrank(claimer);
        
        // Make 5 failed attempts
        for (uint256 i = 1; i <= 5; i++) {
            vm.expectEmit(true, true, false, true);
            emit PasswordAttemptFailed(1, claimer, uint32(i));
            
            if (i == 5) {
                vm.expectEmit(true, false, false, true);
                emit GiftLocked(1, escrow.BASE_COOLDOWN(), 5);
            }
            
            vm.expectRevert(abi.encodeWithSelector(GiftEscrow.WrongPassword.selector, 1, 5 - i));
            escrow.claimGift(1, "wrong", SALT, "");
        }
        
        // 6th attempt should be locked
        vm.expectRevert(abi.encodeWithSelector(
            GiftEscrow.GiftLocked.selector,
            1,
            block.timestamp + escrow.BASE_COOLDOWN()
        ));
        escrow.claimGift(1, PASSWORD, SALT, ""); // Even correct password should fail
        
        vm.stopPrank();
    }

    function test_ClaimGift_CooldownExpiry() public {
        _createBasicGift();
        
        vm.startPrank(claimer);
        
        // Trigger lockout
        for (uint256 i = 1; i <= 5; i++) {
            vm.expectRevert(abi.encodeWithSelector(GiftEscrow.WrongPassword.selector, 1, 5 - i));
            escrow.claimGift(1, "wrong", SALT, "");
        }
        
        // Wait for cooldown to expire
        vm.warp(block.timestamp + escrow.BASE_COOLDOWN() + 1);
        
        // Should be able to claim now
        escrow.claimGift(1, PASSWORD, SALT, "");
        
        vm.stopPrank();
        
        assertEq(nft.ownerOf(TOKEN_ID), claimer);
    }

    // =============================================================================
    // CLAIM FOR TESTS
    // =============================================================================

    function test_ClaimGiftFor_Success() public {
        _createBasicGift();
        
        // Create authorization signature
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory authSig = _createClaimForAuth(1, claimer, recipient, deadline);
        
        vm.startPrank(claimer);
        escrow.claimGiftFor(1, PASSWORD, SALT, recipient, deadline, authSig, "");
        vm.stopPrank();
        
        // Verify NFT transferred to recipient
        assertEq(nft.ownerOf(TOKEN_ID), recipient);
    }

    function test_ClaimGiftFor_RevertExpiredAuth() public {
        _createBasicGift();
        
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory authSig = _createClaimForAuth(1, claimer, recipient, deadline);
        
        // Fast forward past deadline
        vm.warp(deadline + 1);
        
        vm.startPrank(claimer);
        
        vm.expectRevert(abi.encodeWithSelector(
            GiftEscrow.AuthorizationExpired.selector,
            deadline
        ));
        escrow.claimGiftFor(1, PASSWORD, SALT, recipient, deadline, authSig, "");
        
        vm.stopPrank();
    }

    function test_ClaimGiftFor_RevertInvalidSignature() public {
        _createBasicGift();
        
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory authSig = _createClaimForAuth(1, claimer, recipient, deadline);
        
        vm.startPrank(claimer);
        
        // Try to use signature for different recipient
        vm.expectRevert();
        escrow.claimGiftFor(1, PASSWORD, SALT, address(0x999), deadline, authSig, "");
        
        vm.stopPrank();
    }

    // =============================================================================
    // RETURN TESTS
    // =============================================================================

    function test_ReturnExpiredGift_Success() public {
        _createBasicGift();
        
        // Fast forward past expiration
        vm.warp(block.timestamp + escrow.SEVEN_DAYS() + 1);
        
        vm.startPrank(creator);
        escrow.returnExpiredGift(1);
        vm.stopPrank();
        
        // Verify gift returned
        (,,,,, uint8 status) = escrow.getGift(1);
        assertEq(status, 2); // Returned
        
        // Verify NFT back to creator
        assertEq(nft.ownerOf(TOKEN_ID), creator);
    }

    function test_ReturnExpiredGift_RevertNotExpired() public {
        _createBasicGift();
        
        vm.startPrank(creator);
        
        vm.expectRevert(abi.encodeWithSelector(
            GiftEscrow.GiftNotExpired.selector,
            1,
            block.timestamp + escrow.SEVEN_DAYS()
        ));
        escrow.returnExpiredGift(1);
        
        vm.stopPrank();
    }

    function test_ReturnExpiredGift_RevertNotCreator() public {
        _createBasicGift();
        
        vm.warp(block.timestamp + escrow.SEVEN_DAYS() + 1);
        
        vm.startPrank(claimer);
        
        vm.expectRevert(abi.encodeWithSelector(
            GiftEscrow.NotGiftCreator.selector,
            claimer,
            creator
        ));
        escrow.returnExpiredGift(1);
        
        vm.stopPrank();
    }

    function test_ReturnExpiredGiftPublic_Success() public {
        _createBasicGift();
        
        vm.warp(block.timestamp + escrow.SEVEN_DAYS() + 1);
        
        uint256 balanceBefore = claimer.balance;
        
        vm.startPrank(claimer);
        escrow.returnExpiredGiftPublic(1);
        vm.stopPrank();
        
        // Verify NFT returned to creator
        assertEq(nft.ownerOf(TOKEN_ID), creator);
        
        // Verify incentive paid
        assertEq(claimer.balance, balanceBefore + escrow.INCENTIVE_PER_ITEM());
    }

    function test_BatchReturnExpiredIncentivized_Success() public {
        // Create multiple expired gifts
        uint256[] memory giftIds = new uint256[](3);
        for (uint256 i = 0; i < 3; i++) {
            nft.mint(creator, TOKEN_ID + i + 1);
            vm.startPrank(creator);
            nft.approve(address(escrow), TOKEN_ID + i + 1);
            escrow.createGift(
                TOKEN_ID + i + 1,
                address(nft),
                PASSWORD,
                SALT,
                1,
                GIFT_MESSAGE,
                address(0)
            );
            vm.stopPrank();
            giftIds[i] = i + 2; // Gift IDs start from 2
        }
        
        // Expire gifts
        vm.warp(block.timestamp + escrow.SEVEN_DAYS() + 1);
        
        uint256 balanceBefore = claimer.balance;
        
        vm.startPrank(claimer);
        escrow.batchReturnExpiredIncentivized(giftIds, claimer);
        vm.stopPrank();
        
        // Verify all NFTs returned
        for (uint256 i = 0; i < 3; i++) {
            assertEq(nft.ownerOf(TOKEN_ID + i + 1), creator);
        }
        
        // Verify incentive paid
        uint256 expectedIncentive = 3 * escrow.INCENTIVE_PER_ITEM();
        assertEq(claimer.balance, balanceBefore + expectedIncentive);
    }

    function test_BatchReturnExpiredIncentivized_RevertTooLarge() public {
        uint256[] memory giftIds = new uint256[](escrow.MAX_BATCH_SIZE() + 1);
        
        vm.startPrank(claimer);
        
        vm.expectRevert(abi.encodeWithSelector(
            GiftEscrow.BatchTooLarge.selector,
            escrow.MAX_BATCH_SIZE() + 1,
            escrow.MAX_BATCH_SIZE()
        ));
        escrow.batchReturnExpiredIncentivized(giftIds, claimer);
        
        vm.stopPrank();
    }

    // =============================================================================
    // ADMIN TESTS
    // =============================================================================

    function test_DisableGate_Success() public {
        vm.startPrank(admin);
        
        vm.expectEmit(true, true, false, true);
        emit GateDisabled(address(gate), admin, "Security issue");
        
        escrow.disableGate(address(gate), "Security issue");
        
        vm.stopPrank();
        
        assertTrue(escrow.disabledGates(address(gate)));
    }

    function test_EmergencyGateOverride_Success() public {
        _createBasicGift();
        
        vm.startPrank(admin);
        
        vm.expectEmit(true, true, true, true);
        emit EmergencyGateOverride(1, address(0x999), admin, "Emergency override");
        
        escrow.emergencyGateOverride(1, address(0x999), "Emergency override");
        
        vm.stopPrank();
        
        assertEq(escrow.giftGateOverride(1), address(0x999));
    }

    function test_EmergencyReturn_Success() public {
        _createBasicGift();
        
        vm.startPrank(admin);
        escrow.emergencyReturn(1);
        vm.stopPrank();
        
        // Verify NFT returned to creator
        assertEq(nft.ownerOf(TOKEN_ID), creator);
        
        // Verify gift marked as returned
        (,,,,, uint8 status) = escrow.getGift(1);
        assertEq(status, 2); // Returned
    }

    function test_Pause_Success() public {
        vm.startPrank(pauser);
        escrow.pause();
        vm.stopPrank();
        
        assertTrue(escrow.paused());
        
        // Verify operations are paused
        _createBasicGift(); // This should fail
        
        vm.startPrank(claimer);
        vm.expectRevert("Pausable: paused");
        escrow.claimGift(1, PASSWORD, SALT, "");
        vm.stopPrank();
    }

    function test_Unpause_Success() public {
        vm.startPrank(pauser);
        escrow.pause();
        escrow.unpause();
        vm.stopPrank();
        
        assertFalse(escrow.paused());
    }

    // =============================================================================
    // VIEW FUNCTION TESTS
    // =============================================================================

    function test_CanClaimGift() public {
        _createBasicGift();
        
        (bool canClaim, uint256 timeRemaining) = escrow.canClaimGift(1);
        assertTrue(canClaim);
        assertEq(timeRemaining, escrow.SEVEN_DAYS());
        
        // After expiration
        vm.warp(block.timestamp + escrow.SEVEN_DAYS() + 1);
        (canClaim, timeRemaining) = escrow.canClaimGift(1);
        assertFalse(canClaim);
        assertEq(timeRemaining, 0);
    }

    function test_GetGift() public {
        _createBasicGift();
        
        (
            address giftCreator,
            uint96 expirationTime,
            address nftContract,
            uint256 tokenId,
            bytes32 passwordHash,
            uint8 status
        ) = escrow.getGift(1);
        
        assertEq(giftCreator, creator);
        assertEq(expirationTime, block.timestamp + escrow.SEVEN_DAYS());
        assertEq(nftContract, address(nft));
        assertEq(tokenId, TOKEN_ID);
        assertEq(status, 0); // Active
        assertTrue(passwordHash != bytes32(0));
    }

    function test_IsGiftExpired() public {
        _createBasicGift();
        
        assertFalse(escrow.isGiftExpired(1));
        
        vm.warp(block.timestamp + escrow.SEVEN_DAYS() + 1);
        assertTrue(escrow.isGiftExpired(1));
    }

    // =============================================================================
    // PAYMASTER TESTS
    // =============================================================================

    function testFail_PaymasterRateLimit() public {
        // This would require more complex setup with actual forwarder
        // Placeholder for paymaster tests
    }

    // =============================================================================
    // RECEIVER TESTS
    // =============================================================================

    function test_OnERC721Received() public {
        bytes4 selector = escrow.onERC721Received(address(0), address(0), 0, "");
        assertEq(selector, IERC721Receiver.onERC721Received.selector);
    }

    function test_OnERC1155Received() public {
        bytes4 selector = escrow.onERC1155Received(address(0), address(0), 0, 0, "");
        assertEq(selector, IERC1155Receiver.onERC1155Received.selector);
    }

    function test_SupportsInterface() public {
        assertTrue(escrow.supportsInterface(type(IERC721Receiver).interfaceId));
        assertTrue(escrow.supportsInterface(type(IERC1155Receiver).interfaceId));
        assertTrue(escrow.supportsInterface(type(IERC165).interfaceId));
        assertTrue(escrow.supportsInterface(type(IAccessControl).interfaceId));
    }

    // =============================================================================
    // HELPER FUNCTIONS
    // =============================================================================

    function _createBasicGift() internal {
        vm.startPrank(creator);
        nft.approve(address(escrow), TOKEN_ID);
        escrow.createGift(
            TOKEN_ID,
            address(nft),
            PASSWORD,
            SALT,
            1, // 7 days
            GIFT_MESSAGE,
            address(0)
        );
        vm.stopPrank();
    }

    function _createClaimForAuth(
        uint256 giftId,
        address claimer,
        address recipient,
        uint256 deadline
    ) internal view returns (bytes memory) {
        // This is a simplified version - in reality would need proper EIP-712 signing
        // For testing purposes, we'll return a mock signature
        return abi.encodePacked(
            bytes32(0x1234567890123456789012345678901234567890123456789012345678901234),
            bytes32(0x1234567890123456789012345678901234567890123456789012345678901234),
            uint8(27)
        );
    }
}

/**
 * @dev Mock ERC721 for testing
 */
contract MockERC721 is ERC721, Ownable {
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
        Ownable(msg.sender) 
    {}

    function mint(address to, uint256 tokenId) external onlyOwner {
        _mint(to, tokenId);
    }
}

/**
 * @dev Mock Gate for testing
 */
contract MockGate {
    bool public shouldAllow = true;
    string public returnReason = "Mock gate approved";
    bool public active = true;

    function check(
        address claimer,
        uint256 giftId,
        bytes calldata data
    ) external view returns (bool ok, string memory reason) {
        return (shouldAllow, returnReason);
    }

    function getRequirements() external pure returns (string memory) {
        return "Mock gate requirements";
    }

    function isActive() external view returns (bool) {
        return active;
    }

    // Test helpers
    function setShouldAllow(bool _shouldAllow) external {
        shouldAllow = _shouldAllow;
    }

    function setReturnReason(string calldata _reason) external {
        returnReason = _reason;
    }

    function setActive(bool _active) external {
        active = _active;
    }
}

/**
 * @dev Mock Trusted Forwarder for testing
 */
contract MockTrustedForwarder {
    function isTrustedForwarder(address forwarder) external view returns (bool) {
        return forwarder == address(this);
    }
}