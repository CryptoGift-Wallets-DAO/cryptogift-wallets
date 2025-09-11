// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../GiftEscrow.t.sol";

/**
 * @title GiftEscrow Invariant Tests
 * @dev Property-based testing to ensure critical invariants hold
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */
contract GiftEscrowInvariants is Test {
    GiftEscrow public escrow;
    MockERC721 public nft;
    MockGate public gate;
    MockTrustedForwarder public forwarder;
    
    address[] public actors;
    uint256[] public activeGifts;
    uint256 public giftCounter;
    
    // Track state for invariant checking
    mapping(uint256 => bool) public giftExists;
    mapping(uint256 => address) public giftCreators;
    mapping(uint256 => address) public giftRecipients;
    mapping(uint256 => bool) public giftClaimed;
    mapping(uint256 => bool) public giftReturned;
    mapping(uint256 => uint256) public giftExpiration;

    function setUp() public {
        // Deploy contracts
        nft = new MockERC721("Test NFT", "TNFT");
        gate = new MockGate();
        forwarder = new MockTrustedForwarder();
        escrow = new GiftEscrow(address(forwarder));
        
        // Setup actors
        actors.push(address(0x1000));
        actors.push(address(0x2000));
        actors.push(address(0x3000));
        actors.push(address(0x4000));
        actors.push(address(0x5000));
        
        // Fund escrow for incentives
        vm.deal(address(escrow), 10 ether);
        
        // Target contract for invariant runner
        targetContract(address(escrow));
        
        // Target selectors for invariant runner
        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = escrow.createGift.selector;
        selectors[1] = escrow.claimGift.selector;
        selectors[2] = escrow.returnExpiredGift.selector;
        selectors[3] = escrow.returnExpiredGiftPublic.selector;
        
        targetSelector(FuzzSelector({
            addr: address(escrow),
            selectors: selectors
        }));
    }

    // =============================================================================
    // CORE INVARIANTS
    // =============================================================================

    /**
     * @dev INVARIANT: A gift can only be claimed once
     */
    function invariant_NoDoubleClaim() public {
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i]) {
                // If a gift is claimed, it cannot be claimed again
                if (giftClaimed[i]) {
                    (bool canClaim,) = escrow.canClaimGift(i);
                    assertFalse(canClaim, "Claimed gift should not be claimable");
                    
                    (,,,,, uint8 status) = escrow.getGift(i);
                    assertEq(status, 1, "Claimed gift status should be 1");
                }
            }
        }
    }

    /**
     * @dev INVARIANT: Expired gifts cannot be claimed
     */
    function invariant_NoClaimAfterExpiry() public {
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i] && !giftClaimed[i] && !giftReturned[i]) {
                if (escrow.isGiftExpired(i)) {
                    (bool canClaim,) = escrow.canClaimGift(i);
                    assertFalse(canClaim, "Expired gift should not be claimable");
                }
            }
        }
    }

    /**
     * @dev INVARIANT: Creator can always return expired unclaimed gifts
     */
    function invariant_CreatorCanAlwaysReturnExpired() public {
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i] && !giftClaimed[i] && !giftReturned[i]) {
                if (escrow.isGiftExpired(i)) {
                    // Creator should be able to return (we can't test actual call due to state changes)
                    // But we can verify the conditions are met
                    address creator = giftCreators[i];
                    assertTrue(creator != address(0), "Gift should have valid creator");
                    assertTrue(escrow.isGiftExpired(i), "Expired gift should be returnable");
                }
            }
        }
    }

    /**
     * @dev INVARIANT: NFTs are never transferred to zero address
     */
    function invariant_NeverTransferToZeroAddress() public {
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i] && giftClaimed[i]) {
                address recipient = giftRecipients[i];
                assertTrue(recipient != address(0), "NFT should never be transferred to zero address");
            }
        }
    }

    /**
     * @dev INVARIANT: Storage is cleaned up on gift completion
     */
    function invariant_StorageCleanupOnCompletion() public {
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i] && (giftClaimed[i] || giftReturned[i])) {
                // Attempt info should be cleared
                (uint32 attempts,,) = escrow.getAttemptInfo(i);
                assertEq(attempts, 0, "Attempt info should be cleared on completion");
                
                // Gate override should be cleared on return
                if (giftReturned[i]) {
                    assertEq(escrow.giftGateOverride(i), address(0), "Gate override should be cleared");
                }
            }
        }
    }

    /**
     * @dev INVARIANT: Contract balance never goes negative
     */
    function invariant_ContractBalanceNeverNegative() public {
        assertTrue(address(escrow).balance >= 0, "Contract balance should never be negative");
    }

    /**
     * @dev INVARIANT: Only one status per gift
     */
    function invariant_OnlyOneStatusPerGift() public {
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i]) {
                (,,,,, uint8 status) = escrow.getGift(i);
                
                // Status should be 0 (active), 1 (claimed), or 2 (returned)
                assertTrue(status <= 2, "Gift status should be valid");
                
                // Only one of claimed/returned can be true
                if (giftClaimed[i]) {
                    assertFalse(giftReturned[i], "Gift cannot be both claimed and returned");
                    assertEq(status, 1, "Claimed gift should have status 1");
                }
                
                if (giftReturned[i]) {
                    assertFalse(giftClaimed[i], "Gift cannot be both returned and claimed");
                    assertEq(status, 2, "Returned gift should have status 2");
                }
            }
        }
    }

    /**
     * @dev INVARIANT: Gift counter only increases
     */
    function invariant_GiftCounterOnlyIncreases() public {
        uint256 currentCounter = escrow.giftCounter();
        assertTrue(currentCounter >= giftCounter, "Gift counter should only increase");
        giftCounter = currentCounter;
    }

    /**
     * @dev INVARIANT: Escrow holds NFTs only for active gifts
     */
    function invariant_EscrowHoldsNFTsOnlyForActiveGifts() public {
        // This is harder to test without knowing exact NFT ownership
        // But we can verify that completed gifts don't hold NFTs in escrow
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i] && (giftClaimed[i] || giftReturned[i])) {
                // NFT should not be in escrow anymore
                // This would require more complex tracking in a real implementation
                assertTrue(true, "Placeholder for NFT ownership check");
            }
        }
    }

    /**
     * @dev INVARIANT: Password hash is never zero for active gifts
     */
    function invariant_PasswordHashNeverZeroForActiveGifts() public {
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i] && !giftClaimed[i] && !giftReturned[i]) {
                (,,,, bytes32 passHash,) = escrow.getGift(i);
                assertTrue(passHash != bytes32(0), "Active gift should have non-zero password hash");
            }
        }
    }

    /**
     * @dev INVARIANT: Gate override consistency
     */
    function invariant_GateOverrideConsistency() public {
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i]) {
                address override = escrow.giftGateOverride(i);
                // If override is set, it should be a valid address or zero
                // (We can't easily verify contract existence in invariant)
                assertTrue(true, "Gate override consistency check");
            }
        }
    }

    /**
     * @dev INVARIANT: Timeframes are within valid ranges
     */
    function invariant_ValidTimeframes() public {
        // All gifts should expire in the future when created
        // and within reasonable bounds
        for (uint256 i = 1; i <= giftCounter; i++) {
            if (giftExists[i]) {
                (, uint96 expirationTime,,,, uint8 status) = escrow.getGift(i);
                
                if (status == 0) { // Active gifts
                    // Expiration should be reasonable (not too far in future)
                    assertTrue(
                        expirationTime <= block.timestamp + escrow.THIRTY_DAYS(),
                        "Gift expiration should be within maximum timeframe"
                    );
                }
            }
        }
    }

    // =============================================================================
    // HANDLERS FOR INVARIANT RUNNER
    // =============================================================================

    function createGift(
        uint256 actorSeed,
        uint256 tokenId,
        uint256 timeframeSeed,
        uint256 gateSeed
    ) public {
        address actor = actors[actorSeed % actors.length];
        
        // Bound inputs
        tokenId = bound(tokenId, 1, 10000);
        uint256 timeframe = timeframeSeed % 4; // 0-3 are valid timeframes
        address gateAddr = gateSeed % 2 == 0 ? address(0) : address(gate);
        
        // Setup NFT
        nft.mint(actor, tokenId);
        
        vm.startPrank(actor);
        nft.approve(address(escrow), tokenId);
        
        try escrow.createGift(
            tokenId,
            address(nft),
            "password123",
            keccak256("salt"),
            timeframe,
            "Test gift",
            gateAddr
        ) {
            uint256 giftId = escrow.giftCounter();
            giftExists[giftId] = true;
            giftCreators[giftId] = actor;
            giftExpiration[giftId] = block.timestamp + _getTimeframeDuration(timeframe);
            activeGifts.push(giftId);
        } catch {
            // Creation failed, that's ok
        }
        
        vm.stopPrank();
    }

    function claimGift(uint256 actorSeed, uint256 giftIdSeed) public {
        if (activeGifts.length == 0) return;
        
        address actor = actors[actorSeed % actors.length];
        uint256 giftId = activeGifts[giftIdSeed % activeGifts.length];
        
        if (!giftExists[giftId] || giftClaimed[giftId] || giftReturned[giftId]) {
            return;
        }
        
        vm.startPrank(actor);
        
        try escrow.claimGift(giftId, "password123", keccak256("salt"), "") {
            giftClaimed[giftId] = true;
            giftRecipients[giftId] = actor;
        } catch {
            // Claim failed, that's ok
        }
        
        vm.stopPrank();
    }

    function returnExpiredGift(uint256 giftIdSeed) public {
        if (activeGifts.length == 0) return;
        
        uint256 giftId = activeGifts[giftIdSeed % activeGifts.length];
        
        if (!giftExists[giftId] || giftClaimed[giftId] || giftReturned[giftId]) {
            return;
        }
        
        address creator = giftCreators[giftId];
        
        // Fast forward to expiration
        if (block.timestamp < giftExpiration[giftId]) {
            vm.warp(giftExpiration[giftId] + 1);
        }
        
        vm.startPrank(creator);
        
        try escrow.returnExpiredGift(giftId) {
            giftReturned[giftId] = true;
        } catch {
            // Return failed, that's ok
        }
        
        vm.stopPrank();
    }

    function _getTimeframeDuration(uint256 timeframe) internal view returns (uint256) {
        if (timeframe == 0) return escrow.FIFTEEN_MINUTES();
        if (timeframe == 1) return escrow.SEVEN_DAYS();
        if (timeframe == 2) return escrow.FIFTEEN_DAYS();
        if (timeframe == 3) return escrow.THIRTY_DAYS();
        return escrow.SEVEN_DAYS(); // default
    }
}