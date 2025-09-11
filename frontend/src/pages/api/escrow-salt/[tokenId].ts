/**
 * ESCROW SALT API
 * Get the salt required for claiming an escrow gift by token ID
 * Public read-only endpoint for salt retrieval during claim process
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { validateTokenId } from '../../../lib/escrowUtils';

// Types
interface SaltResponse {
  success: boolean;
  salt?: string;
  error?: string;
}

// Initialize Redis client
let redis: any = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      enableAutoPipelining: false,
      retry: false,
    });
    console.log('✅ Redis initialized for salt retrieval');
  } else {
    console.warn('⚠️ Redis not configured for salt retrieval');
  }
} catch (error) {
  console.error('❌ Redis initialization failed:', error);
}

// Retrieve salt for claim process
async function getSalt(tokenId: string): Promise<string | null> {
  if (!redis) {
    console.warn('⚠️ Cannot retrieve salt: Redis not available');
    return null;
  }
  
  try {
    const key = `escrow:salt:${tokenId}`;
    const salt = await redis.get(key);
    console.log('🔍 Salt retrieved for token:', tokenId, salt ? 'Found' : 'Not found');
    return salt;
  } catch (error) {
    console.error('❌ Failed to retrieve salt:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaltResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Extract token ID from query
    const { tokenId } = req.query;
    
    if (!tokenId || Array.isArray(tokenId)) {
      return res.status(400).json({
        success: false,
        error: 'Token ID is required'
      });
    }
    
    // Validate token ID
    const tokenIdValidation = validateTokenId(tokenId);
    if (!tokenIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: tokenIdValidation.message
      });
    }
    
    // Check Redis availability
    if (!redis) {
      return res.status(500).json({
        success: false,
        error: 'Salt storage service unavailable'
      });
    }
    
    console.log('🧂 SALT REQUEST:', { tokenId });
    
    // Get salt from storage
    const salt = await getSalt(tokenId);
    
    if (!salt) {
      return res.status(404).json({
        success: false,
        error: 'Salt not found for this token ID'
      });
    }
    
    console.log('✅ SALT RETRIEVED:', { tokenId, saltFound: true });
    
    return res.status(200).json({
      success: true,
      salt
    });
    
  } catch (error: any) {
    console.error('💥 SALT API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}