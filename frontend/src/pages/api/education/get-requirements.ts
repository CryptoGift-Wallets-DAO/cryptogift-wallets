/**
 * GET EDUCATION REQUIREMENTS API
 * Returns the required education modules for a session
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getRedisConnection } from '../../../lib/redisConfig';
import { debugLogger } from '../../../lib/secureDebugLogger';

interface GetRequirementsRequest {
  sessionToken: string;
}

interface GetRequirementsResponse {
  success: boolean;
  modules?: number[];
  completed?: number[];
  remaining?: number[];
  details?: Array<{
    id: number;
    name: string;
    estimatedTime: number;
    description?: string;
    completed: boolean;
  }>;
  error?: string;
}

// Module definitions
const MODULE_INFO: Record<number, { name: string; estimatedTime: number; description: string }> = {
  1: {
    name: 'Crear Wallet Segura',
    estimatedTime: 10,
    description: 'Aprende a crear y proteger tu billetera de criptomonedas'
  },
  2: {
    name: 'Seguridad Básica',
    estimatedTime: 8,
    description: 'Mejores prácticas para mantener tus activos seguros'
  },
  3: {
    name: 'Entender NFTs',
    estimatedTime: 12,
    description: 'Qué son los NFTs y cómo funcionan'
  },
  4: {
    name: 'DeFi Básico',
    estimatedTime: 15,
    description: 'Introducción a las finanzas descentralizadas'
  },
  5: {
    name: 'Proyecto CryptoGift',
    estimatedTime: 20,
    description: 'Conoce nuestra visión y únete como colaborador'
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetRequirementsResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    const { sessionToken }: GetRequirementsRequest = req.body;
    
    // Validate required fields
    if (!sessionToken) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required field: sessionToken' 
      });
    }
    
    // Get session data - UNIFIED REDIS CLIENT (B1 FIX)  
    const redis = getRedisConnection();
    const sessionKey = `preclaim:session:${sessionToken}`;
    const sessionDataRaw = await redis.get(sessionKey);
    
    let sessionData: {
      tokenId: string;
      giftId: number;
      claimer: string;
      passwordValidated: boolean;
      requiresEducation: boolean;
      modules: number[];
      timestamp: number;
    } | null = null;
    
    if (sessionDataRaw && typeof sessionDataRaw === 'string') {
      try {
        sessionData = JSON.parse(sessionDataRaw);
        console.log(`✅ Session retrieved for ${sessionToken.slice(0, 10)}...`);
      } catch (parseError) {
        console.error(`❌ Invalid session JSON for ${sessionToken}:`, parseError);
        return res.status(401).json({
          success: false,
          error: 'Invalid session data format'
        });
      }
    }
    
    if (!sessionData) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired session' 
      });
    }
    
    // Check if education is required
    if (!sessionData.requiresEducation || !sessionData.modules || sessionData.modules.length === 0) {
      return res.status(200).json({
        success: true,
        modules: [],
        completed: [],
        remaining: [],
        details: []
      });
    }
    
    // Get progress - UNIFIED REDIS CLIENT (B1 FIX)
    const progressKey = `education:${sessionData.claimer}:${sessionData.giftId}:progress`;
    const progressDataRaw = await redis.get(progressKey);
    let completedModules: number[] = [];
    
    if (progressDataRaw && typeof progressDataRaw === 'string') {
      try {
        completedModules = JSON.parse(progressDataRaw);
      } catch (parseError) {
        console.warn(`❌ Invalid progress JSON for ${progressKey}:`, parseError);
        completedModules = [];
      }
    }
    
    // Calculate remaining modules
    const remainingModules = sessionData.modules.filter(m => !completedModules.includes(m));
    
    // Build detailed module information
    const details = sessionData.modules.map(moduleId => ({
      id: moduleId,
      name: MODULE_INFO[moduleId]?.name || `Module ${moduleId}`,
      estimatedTime: MODULE_INFO[moduleId]?.estimatedTime || 10,
      description: MODULE_INFO[moduleId]?.description,
      completed: completedModules.includes(moduleId)
    }));
    
    debugLogger.operation('Get education requirements', {
      sessionToken: sessionToken.slice(0, 10) + '...',
      tokenId: sessionData.tokenId,
      giftId: sessionData.giftId,
      totalModules: sessionData.modules.length,
      completedCount: completedModules.length,
      remainingCount: remainingModules.length
    });
    
    return res.status(200).json({
      success: true,
      modules: sessionData.modules,
      completed: completedModules,
      remaining: remainingModules,
      details
    });
    
  } catch (error: any) {
    console.error('💥 GET REQUIREMENTS ERROR:', error);
    debugLogger.operation('Get requirements error', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}