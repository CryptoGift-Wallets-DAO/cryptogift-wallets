/**
 * ADMIN API: Return Expired Gifts
 * Manually return expired gifts to their creators to solve stuck NFTs issue
 * This is an emergency function until automatic returns are implemented
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { returnExpiredGifts } from '../../../lib/escrowUtils';

interface ReturnExpiredResponse {
  success: boolean;
  returned: number;
  errors?: string[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReturnExpiredResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      returned: 0,
      message: 'Method not allowed' 
    });
  }

  try {
    console.log('🔄 ADMIN: Starting expired gifts return process...');
    
    // Execute return process
    const result = await returnExpiredGifts();
    
    if (result.success) {
      console.log(`✅ ADMIN: Successfully returned ${result.returned} expired gifts`);
      if (result.errors.length > 0) {
        console.warn(`⚠️ ADMIN: ${result.errors.length} errors occurred:`, result.errors);
      }
      
      return res.status(200).json({
        success: true,
        returned: result.returned,
        errors: result.errors.length > 0 ? result.errors : undefined,
        message: `Successfully returned ${result.returned} expired gifts${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`
      });
    } else {
      console.error('❌ ADMIN: Failed to return expired gifts:', result.errors);
      return res.status(500).json({
        success: false,
        returned: result.returned,
        errors: result.errors,
        message: 'Failed to return expired gifts'
      });
    }

  } catch (error: any) {
    console.error('💥 ADMIN: Unexpected error in return expired gifts:', error);
    return res.status(500).json({
      success: false,
      returned: 0,
      message: error.message || 'Internal server error'
    });
  }
}