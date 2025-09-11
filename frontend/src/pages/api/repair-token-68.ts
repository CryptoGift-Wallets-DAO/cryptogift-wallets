/**
 * REPAIR API: Fix token 68 mapping issue
 * POST endpoint to repair the specific token 68 → giftId mapping
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { storeGiftMapping } from '../../lib/giftMappingStore';
import { getGiftIdFromTokenId } from '../../lib/escrowUtils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Allow both GET and POST for flexibility
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use GET or POST to repair token 68.' 
    });
  }

  try {
    const targetTokenId = '68';
    
    console.log(`🔧 REPAIR: Starting repair process for token ${targetTokenId}`);
    
    // Step 1: Based on analysis, we know token 68 maps to giftId 107
    // This is from blockchain analysis showing the pattern
    const knownGiftId = 107;
    
    console.log(`💡 REPAIR: Using known mapping tokenId ${targetTokenId} → giftId ${knownGiftId}`);
    
    // Step 2: Force store the mapping in Redis/KV
    try {
      await storeGiftMapping(targetTokenId, knownGiftId, process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!, 84532);
      console.log(`✅ REPAIR: Stored mapping tokenId ${targetTokenId} → giftId ${knownGiftId} in Redis`);
    } catch (storeError) {
      console.error(`❌ REPAIR: Failed to store mapping:`, storeError);
      return res.status(500).json({
        success: false,
        error: 'Failed to store mapping in Redis/KV',
        storeError: storeError.message
      });
    }
    
    // Step 3: Verify the mapping works now
    console.log(`🔍 REPAIR: Verifying mapping works...`);
    const verifyMapping = await getGiftIdFromTokenId(targetTokenId);
    
    if (verifyMapping === knownGiftId) {
      console.log(`✅ REPAIR: SUCCESS! Mapping verification passed`);
      
      return res.status(200).json({
        success: true,
        repaired: true,
        tokenId: targetTokenId,
        giftId: knownGiftId,
        verifyMapping,
        message: `Successfully repaired mapping for token ${targetTokenId}`,
        instructions: `Token ${targetTokenId} should now work at: ${process.env.NEXT_PUBLIC_SITE_URL || (() => { throw new Error('NEXT_PUBLIC_SITE_URL is required for repair instructions'); })()}/gift/claim/${targetTokenId}`
      });
    } else {
      console.log(`❌ REPAIR: Verification failed. Expected ${knownGiftId}, got ${verifyMapping}`);
      
      return res.status(500).json({
        success: false,
        error: 'Mapping repair failed verification',
        expected: knownGiftId,
        actual: verifyMapping
      });
    }
    
  } catch (error: any) {
    console.error('❌ REPAIR ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}