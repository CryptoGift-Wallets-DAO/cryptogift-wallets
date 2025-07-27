/**
 * DEBUG: Check actual giftId for tokenId 177 on contract
 */

const { ethers } = require('ethers');

const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e';
const ESCROW_ADDRESS = '0x46175CfC233500DA803841DEef7f2816e7A129E0';

const ESCROW_ABI = [
  "function getGiftIdFromTokenId(address nftContract, uint256 tokenId) external view returns (uint256 giftId, bool found)",
  "function getGift(uint256 giftId) external view returns (address creator, uint256 expirationTime, address nftContract, uint256 tokenId, bytes32 passwordHash, uint8 status)",
  "function giftCounter() external view returns (uint256)"
];

async function debugTokenId177() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
    
    console.log('🔍 Checking tokenId 177...');
    
    // Check current giftCounter
    const giftCounter = await escrowContract.giftCounter();
    console.log('📊 Current giftCounter:', Number(giftCounter));
    
    // Try to get giftId for tokenId 177
    const NFT_ADDRESS = '0x06cF34d3a89b3a64D4aA5c0ea7F6b3B3C7c30c76';
    
    try {
      const result = await escrowContract.getGiftIdFromTokenId(NFT_ADDRESS, 177);
      console.log('✅ getGiftIdFromTokenId result:', {
        giftId: Number(result.giftId),
        found: result.found
      });
      
      if (result.found) {
        // Get gift details
        const giftDetails = await escrowContract.getGift(result.giftId);
        console.log('🎁 Gift details:', {
          creator: giftDetails.creator,
          tokenId: Number(giftDetails.tokenId),
          status: Number(giftDetails.status)
        });
      }
    } catch (error) {
      console.log('❌ getGiftIdFromTokenId failed:', error.message);
      
      // Try checking gifts manually
      console.log('🔍 Checking gifts manually...');
      
      for (let giftId = 10; giftId <= Number(giftCounter); giftId++) {
        try {
          const gift = await escrowContract.getGift(giftId);
          if (Number(gift.tokenId) === 177) {
            console.log(`✅ FOUND: tokenId 177 is giftId ${giftId}`);
            console.log('🎁 Gift details:', {
              creator: gift.creator,
              tokenId: Number(gift.tokenId),
              status: Number(gift.status)
            });
            break;
          }
        } catch (e) {
          // Gift doesn't exist
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugTokenId177();