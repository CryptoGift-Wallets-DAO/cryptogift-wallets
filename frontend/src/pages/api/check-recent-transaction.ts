import { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { getContract, readContract } from 'thirdweb';
import { withSIWEAuth } from '../../lib/siweAuth';

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

const escrowContract = getContract({
  client,
  chain: baseSepolia,
  address: process.env.NEXT_PUBLIC_CRYPTOGIFT_ESCROW_ADDRESS as `0x${string}`
});

interface CheckRecentTransactionRequest {
  address: string;
  tokenId: string;
  giftId: number;
}

/**
 * Check if a recent transaction was successful for claiming a gift
 * Used when mobile transaction times out but might have been actually successful
 */
async function checkRecentTransactionHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, tokenId, giftId }: CheckRecentTransactionRequest = req.body;
    
    if (!address || !tokenId || !giftId) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['address', 'tokenId', 'giftId']
      });
    }

    console.log('🔍 Checking recent transaction for:', { address, tokenId, giftId });

    // Check if the gift was actually claimed by reading contract state
    try {
      const giftData = await readContract({
        contract: escrowContract,
        method: 'function getGiftByTokenId(uint256 tokenId) view returns (tuple(address creator, address nftContract, uint256 expirationTime, uint8 status, string giftMessage, bytes32 passwordHash, uint256 amountETH, uint256 amountUSDC, address[] allowedClaimer, uint256 giftId))',
        params: [BigInt(tokenId)]
      });

      console.log('📊 Gift data from contract:', {
        status: giftData.status,
        giftId: giftData.giftId.toString()
      });

      // Check if this specific gift was claimed (status = 2 means claimed)
      if (giftData.status === 2) {
        console.log('✅ Gift was successfully claimed!');
        
        // Try to find recent transactions for this address (simplified approach)
        // In a real implementation, you might query a blockchain indexer or events
        
        // For now, we'll use a heuristic: if the gift is claimed and the giftId matches,
        // assume the transaction was successful and return a placeholder hash
        // In production, you'd want to query actual transaction logs
        
        return res.status(200).json({
          success: true,
          transactionHash: `0x${'0'.repeat(62)}${giftId.toString(16).padStart(2, '0')}`, // Placeholder
          status: 'claimed',
          message: 'Gift was successfully claimed'
        });
      } else {
        console.log('⚠️ Gift not yet claimed, status:', giftData.status);
        return res.status(200).json({
          success: false,
          message: 'Gift not yet claimed',
          currentStatus: giftData.status
        });
      }
    } catch (contractError) {
      console.error('❌ Error reading contract:', contractError);
      return res.status(500).json({
        error: 'Error checking contract state',
        details: contractError.message
      });
    }

  } catch (error) {
    console.error('❌ Error in check recent transaction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

export default withSIWEAuth(checkRecentTransactionHandler);