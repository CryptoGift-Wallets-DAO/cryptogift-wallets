/**
 * DEBUG: Check actual giftId for tokenId 177 on contract
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { readContract } from 'thirdweb';
import { ESCROW_CONTRACT_ADDRESS } from '../../../lib/escrowABI';
import { withDebugAuth } from '../../../lib/debugAuth';
import { debugLogger } from '../../../lib/secureDebugLogger';

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

const escrowContract = getContract({
  client,
  chain: baseSepolia,
  address: ESCROW_CONTRACT_ADDRESS!
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    debugLogger.operation('TokenId 177 giftId verification', { targetTokenId: 177 });
    
    // 1. Get current giftCounter
    const giftCounter = await readContract({
      contract: escrowContract,
      method: "giftCounter",
      params: []
    }) as bigint;
    
    debugLogger.contractCall('giftCounter', true, undefined);
    
    // 2. Try to find tokenId 177 by checking all gifts
    const NFT_ADDRESS = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!;
    let foundGiftId = null;
    
    debugLogger.operation('Gift search initiated', { 
      totalGifts: Number(giftCounter), 
      targetContract: NFT_ADDRESS 
    });
    
    for (let giftId = 1; giftId <= Number(giftCounter); giftId++) {
      try {
        const gift = await readContract({
          contract: escrowContract,
          method: "getGift",
          params: [BigInt(giftId)]
        }) as readonly [string, bigint, string, bigint, string, number];
        
        // getGift returns: [creator, expirationTime, nftContract, tokenId, passwordHash, status]
        const tokenId = Number(gift[3]);
        const nftContract = gift[2];
        
        debugLogger.giftMapping(tokenId, giftId);
        
        if (tokenId === 177 && nftContract.toLowerCase() === NFT_ADDRESS.toLowerCase()) {
          foundGiftId = giftId;
          debugLogger.operation('Target gift found', { 
            searchedTokenId: 177, 
            foundGiftId: giftId,
            verified: true 
          });
          
          return res.status(200).json({
            success: true,
            tokenId: 177,
            actualGiftId: giftId,
            currentGiftCounter: Number(giftCounter),
            mappingInLogs: 15, // From Vercel logs
            isCorrect: giftId === 15,
            verification: {
              found: true,
              tokenIdMatches: Number(gift[3]) === 177,
              contractMatches: gift[2].toLowerCase() === NFT_ADDRESS.toLowerCase(),
              giftIdFromLogs: 15,
              actualGiftId: giftId,
              dataConsistency: giftId === 15 ? 'CONSISTENT' : 'INCONSISTENT'
            }
          });
        }
      } catch (error) {
        // Gift doesn't exist or error reading it
        debugLogger.error(`Gift ${giftId} read`, error as Error);
      }
    }
    
    if (foundGiftId === null) {
      return res.status(404).json({
        success: false,
        error: 'tokenId 177 not found in any gift',
        currentGiftCounter: Number(giftCounter),
        searchedGifts: Number(giftCounter)
      });
    }
    
  } catch (error: any) {
    debugLogger.error('TokenId 177 verification', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// Export with debug authentication
export default withDebugAuth(handler);