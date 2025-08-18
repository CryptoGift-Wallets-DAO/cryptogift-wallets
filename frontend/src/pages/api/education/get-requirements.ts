/**
 * GET EDUCATION REQUIREMENTS API
 * Returns the required education modules for a session
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';
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
    
    // Get session data
    const sessionKey = `preclaim:session:${sessionToken}`;
    const sessionData = await kv.get<{
      tokenId: string;
      giftId: number;
      claimer: string;
      passwordValidated: boolean;
      requiresEducation: boolean;
      modules: number[];
      timestamp: number;
    }>(sessionKey);
    
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
    
    // Get progress
    const progressKey = `education:${sessionData.claimer}:${sessionData.giftId}:progress`;
    const completedModules = await kv.get<number[]>(progressKey) || [];
    
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