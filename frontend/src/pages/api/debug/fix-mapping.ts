/**
 * DEBUG: Fix incorrect tokenId → giftId mapping
 * CRITICAL FIX for tokenId 173 → giftId should be 11, not 12
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { storeGiftMapping } from '../../../lib/giftMappingStore';
import { withDebugAuth } from '../../../lib/debugAuth';
import { debugLogger } from '../../../lib/secureDebugLogger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenId, correctGiftId } = req.body;

    if (!tokenId || correctGiftId === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: tokenId, correctGiftId' 
      });
    }

    debugLogger.operation(`🔧 FIXING MAPPING: tokenId ${tokenId} → giftId ${correctGiftId}`);
    
    // Store the corrected mapping
    const success = await storeGiftMapping(tokenId, correctGiftId, process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!, 84532);
    
    if (success) {
      debugLogger.operation(`✅ MAPPING FIXED: tokenId ${tokenId} → giftId ${correctGiftId}`);
      return res.status(200).json({
        success: true,
        message: `Mapping fixed: tokenId ${tokenId} → giftId ${correctGiftId}`,
        tokenId: tokenId.toString(),
        giftId: correctGiftId.toString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to store corrected mapping'
      });
    }

  } catch (error: any) {
    console.error('❌ FIX MAPPING ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// Export with debug authentication
export default withDebugAuth(handler);