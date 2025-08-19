/**
 * EDUCATION REQUIREMENTS API
 * Stores education requirements for a gift
 * Called after gift creation to set educational gate requirements
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getRedisConnection } from '../../../lib/redisConfig';
import { verifyJWT, extractTokenFromHeaders } from '../../../lib/siweAuth';
import { debugLogger } from '../../../lib/secureDebugLogger';

interface SetRequirementsRequest {
  giftId: number;
  tokenId: string;
  educationModules: number[];
  creatorAddress: string;
}

interface SetRequirementsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SetRequirementsResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Verify JWT authentication
    const token = extractTokenFromHeaders(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    const jwtPayload = await verifyJWT(token);
    if (!jwtPayload || !jwtPayload.address) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid authentication token' 
      });
    }
    
    const {
      giftId,
      tokenId,
      educationModules,
      creatorAddress
    }: SetRequirementsRequest = req.body;
    
    // Validate required fields
    if (giftId === undefined || !tokenId || !educationModules || !creatorAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: giftId, tokenId, educationModules, creatorAddress' 
      });
    }
    
    // Verify the authenticated user is the creator
    if (jwtPayload.address.toLowerCase() !== creatorAddress.toLowerCase()) {
      return res.status(403).json({ 
        success: false,
        error: 'Only the gift creator can set education requirements' 
      });
    }
    
    // Validate education modules
    const validModules = [1, 2, 3, 4, 5]; // Available module IDs
    const invalidModules = educationModules.filter(m => !validModules.includes(m));
    if (invalidModules.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: `Invalid module IDs: ${invalidModules.join(', ')}` 
      });
    }
    
    // Store education requirements - UNIFIED REDIS CLIENT & KEYS (B2 FIX)
    const redis = getRedisConnection();
    const educationKey = `education:gift:${giftId}`;
    
    // Unified versioned payload format matching mint-escrow.ts
    const educationData = {
      version: '1.0',
      modules: educationModules,
      creatorAddress,
      createdAt: new Date().toISOString(),
      giftId,
      tokenId,
      // DETERMINISTIC HASH: Sort modules for stable hash
      modulesHash: educationModules.sort((a, b) => a - b).join(',')
    };
    
    // Store with 90 day TTL (longer than max escrow time)
    await redis.setex(educationKey, 90 * 24 * 60 * 60, JSON.stringify(educationData));
    
    debugLogger.operation('Education requirements set', {
      giftId,
      tokenId,
      moduleCount: educationModules.length,
      modules: educationModules,
      creator: creatorAddress.slice(0, 10) + '...'
    });
    
    return res.status(200).json({
      success: true,
      message: `Education requirements set successfully for gift ${giftId}`
    });
    
  } catch (error: any) {
    console.error('💥 SET EDUCATION REQUIREMENTS ERROR:', error);
    debugLogger.operation('Set education requirements error', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}