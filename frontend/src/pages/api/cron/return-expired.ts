/**
 * CRON: RETURN EXPIRED GIFTS [DISABLED]
 * 
 * ❌ DISABLED due to Zero Custody Architecture V2
 * 
 * REASON: Contract has NotGiftCreator restriction - only gift creators
 * can return their own expired gifts, not deployer/admin accounts.
 * 
 * SOLUTION: Users return expired gifts via ExpiredGiftManager component
 * using their own wallets, preserving zero custody principles.
 * 
 * Protected with CRON_SECRET authentication (when enabled)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { returnExpiredGifts } from '../../../lib/escrowUtils';

interface CronResponse {
  success: boolean;
  returned?: number;
  errors?: string[];
  error?: string;
  timestamp: number;
}

// SECURE: CRON authentication middleware
function authenticateCron(req: NextApiRequest): boolean {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.error('❌ CRON_SECRET not configured');
    return false;
  }
  
  if (cronSecret !== expectedSecret) {
    console.error('❌ Invalid CRON_SECRET provided');
    return false;
  }
  
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      timestamp: Date.now()
    });
  }
  
  try {
    // ZERO CUSTODY ARCHITECTURE: Auto-return disabled
    // Users must return their own expired gifts with their wallets
    return res.status(501).json({
      success: false,
      error: 'Auto-return disabled - Zero Custody Architecture',
      message: 'Users must return their own expired gifts using the ExpiredGiftManager in their wallet dashboard',
      timestamp: Date.now()
    });

    // SECURE: Authenticate CRON request (DISABLED)
    if (!authenticateCron(req)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized - invalid CRON secret',
        timestamp: Date.now()
      });
    }
    
    console.log('🤖 CRON: Starting expired gifts return process...');
    
    // Execute expired gifts return
    const result = await returnExpiredGifts();
    
    if (!result.success) {
      console.error('❌ CRON: Return expired gifts failed');
      return res.status(500).json({
        success: false,
        error: 'Failed to return expired gifts',
        errors: result.errors,
        timestamp: Date.now()
      });
    }
    
    console.log(`✅ CRON: Successfully returned ${result.returned} expired gifts`);
    
    return res.status(200).json({
      success: true,
      returned: result.returned,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: Date.now()
    });
    
  } catch (error: any) {
    console.error('💥 CRON ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: Date.now()
    });
  }
}