// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/GiftEscrowEnterprise.sol";
import "../contracts/CryptoGiftNFT.sol";

contract GiftEscrowEnterpriseTest is Test {
    GiftEscrowEnterprise public escrow;
    CryptoGiftNFT public nft;
    
    address public owner = makeAddr("owner");
    address public creator = makeAddr("creator");
    address public claimer = makeAddr("claimer");
    address public trustedForwarder = makeAddr("forwarder");
    
    string constant PASSWORD = "test_password_123";
    bytes32 constant SALT = keccak256("test_salt");
    string constant GIFT_MESSAGE = "Happy Birthday!";
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        escrow = new GiftEscrowEnterprise(trustedForwarder);
        nft = new CryptoGiftNFT(owner);
        
        // Mint NFT for testing
        nft.mintTo(creator, "ipfs://test-uri");
        
        vm.stopPrank();
        
        // Give creator approval
        vm.prank(creator);
        nft.setApprovalForAll(address(escrow), true);
    }
    
    function testCreateGift() public {
        vm.prank(creator);
        
        escrow.createGift(
            1, // tokenId
            address(nft),
            PASSWORD,
            SALT,
            1, // SEVEN_DAYS
            GIFT_MESSAGE,
            address(0) // no gate
        );
        
        (address giftCreator, uint96 expirationTime, address nftContract, uint256 tokenId, , uint8 status) = 
            escrow.getGift(1);
        
        assertEq(giftCreator, creator);
        assertEq(nftContract, address(nft));
        assertEq(tokenId, 1);
        assertEq(status, 0); // not claimed or returned
        assertGt(expirationTime, block.timestamp);
        
        // Check NFT was transferred to escrow
        assertEq(nft.ownerOf(1), address(escrow));
        
        // Check gift message
        assertEq(escrow.getGiftMessage(1), GIFT_MESSAGE);
    }
    
    function testClaimGift() public {
        // Create gift first
        vm.prank(creator);
        escrow.createGift(
            1,
            address(nft),
            PASSWORD,
            SALT,
            1, // SEVEN_DAYS
            GIFT_MESSAGE,
            address(0)
        );
        
        // Claim gift
        vm.prank(claimer);
        escrow.claimGift(1, PASSWORD, SALT, "");
        
        // Verify claim
        (, , , , , uint8 status) = escrow.getGift(1);
        assertEq(status, 1); // claimed
        
        // Check NFT was transferred to claimer
        assertEq(nft.ownerOf(1), claimer);
    }
    
    function testWrongPassword() public {
        // Create gift
        vm.prank(creator);
        escrow.createGift(1, address(nft), PASSWORD, SALT, 1, GIFT_MESSAGE, address(0));
        
        // Try to claim with wrong password
        vm.prank(claimer);
        vm.expectRevert(abi.encodeWithSelector(GiftEscrowEnterprise.WrongPassword.selector, 1, 4));
        escrow.claimGift(1, "wrong_password", SALT, "");
    }
    
    function testAntiBruteForce() public {
        // Create gift
        vm.prank(creator);
        escrow.createGift(1, address(nft), PASSWORD, SALT, 1, GIFT_MESSAGE, address(0));
        
        // Make MAX_ATTEMPTS wrong attempts
        vm.startPrank(claimer);
        for (uint i = 0; i < escrow.MAX_ATTEMPTS(); i++) {
            try escrow.claimGift(1, "wrong_password", SALT, "") {
                fail("Should have reverted");
            } catch {}
        }
        
        // Next attempt should be locked
        vm.expectRevert(abi.encodeWithSelector(GiftEscrowEnterprise.GiftLocked.selector, 1, block.timestamp + 300));
        escrow.claimGift(1, PASSWORD, SALT, "");
        vm.stopPrank();
    }
    
    function testReturnExpiredGift() public {
        // Create gift with short timeframe
        vm.prank(creator);
        escrow.createGift(1, address(nft), PASSWORD, SALT, 0, GIFT_MESSAGE, address(0)); // FIFTEEN_MINUTES
        
        // Fast forward past expiration
        vm.warp(block.timestamp + 901); // 15 minutes + 1 second
        
        // Return expired gift
        vm.prank(creator);
        escrow.returnExpiredGift(1);
        
        // Verify return
        (, , , , , uint8 status) = escrow.getGift(1);
        assertEq(status, 2); // returned
        
        // Check NFT was returned to creator
        assertEq(nft.ownerOf(1), creator);
    }
    
    function testCannotReturnBeforeExpiration() public {
        // Create gift
        vm.prank(creator);
        escrow.createGift(1, address(nft), PASSWORD, SALT, 1, GIFT_MESSAGE, address(0));
        
        // Try to return before expiration
        vm.prank(creator);
        vm.expectRevert();
        escrow.returnExpiredGift(1);
    }
    
    function testPauseUnpause() public {
        // Pause contract
        vm.prank(owner);
        escrow.pause();
        
        // Try to create gift while paused
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        escrow.createGift(1, address(nft), PASSWORD, SALT, 1, GIFT_MESSAGE, address(0));
        
        // Unpause
        vm.prank(owner);
        escrow.unpause();
        
        // Should work now
        vm.prank(creator);
        escrow.createGift(1, address(nft), PASSWORD, SALT, 1, GIFT_MESSAGE, address(0));
        
        assertEq(escrow.giftCounter(), 1);
    }
    
    function testAccessControl() public {
        // Non-owner cannot pause
        vm.prank(claimer);
        vm.expectRevert();
        escrow.pause();
        
        // Non-admin cannot withdraw
        vm.prank(claimer);
        vm.expectRevert();
        escrow.withdraw(1 ether, claimer);
    }
    
    function testCanClaimGift() public {
        // Create gift
        vm.prank(creator);
        escrow.createGift(1, address(nft), PASSWORD, SALT, 1, GIFT_MESSAGE, address(0));
        
        // Check can claim
        (bool canClaim, uint256 timeRemaining) = escrow.canClaimGift(1);
        assertTrue(canClaim);
        assertGt(timeRemaining, 0);
        
        // Claim gift
        vm.prank(claimer);
        escrow.claimGift(1, PASSWORD, SALT, "");
        
        // Check cannot claim again
        (canClaim, timeRemaining) = escrow.canClaimGift(1);
        assertFalse(canClaim);
        assertEq(timeRemaining, 0);
    }
}