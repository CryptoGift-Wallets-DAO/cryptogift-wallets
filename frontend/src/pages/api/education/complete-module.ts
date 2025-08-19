/**
 * EDUCATION MODULE COMPLETION API
 * Records module completion and grants approval when all modules are done
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';
import { debugLogger } from '../../../lib/secureDebugLogger';

interface CompleteModuleRequest {
  sessionToken: string;
  moduleId: number;
  score: number;
  tokenId: string;
}

interface CompleteModuleResponse {
  success: boolean;
  allModulesCompleted?: boolean;
  remainingModules?: number[];
  approvalGranted?: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompleteModuleResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    const {
      sessionToken,
      moduleId,
      score,
      tokenId
    }: CompleteModuleRequest = req.body;
    
    // Validate required fields
    if (!sessionToken || !moduleId || score === undefined || !tokenId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: sessionToken, moduleId, score, tokenId' 
      });
    }
    
    // Validate score
    if (score < 0 || score > 100) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid score. Must be between 0 and 100' 
      });
    }
    
    // UNIFIED REDIS: Get session data with proper JSON parsing
    const redis = validateRedisForCriticalOps('Session retrieval');
    
    if (!redis) {
      return res.status(503).json({
        success: false,
        error: 'Session storage not available'
      });
    }
    
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
        console.log(`✅ Session retrieved for module completion: ${sessionToken.slice(0, 10)}...`);
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
    
    // Verify token ID matches
    if (sessionData.tokenId !== tokenId) {
      return res.status(403).json({ 
        success: false,
        error: 'Token ID mismatch' 
      });
    }
    
    // Check if module is required
    if (!sessionData.modules.includes(moduleId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Module not required for this gift' 
      });
    }
    
    // Check minimum passing score (usually 100% for security modules)
    const passingScores: Record<number, number> = {
      1: 100, // Wallet Security - must be perfect
      2: 100, // Basic Security - must be perfect
      3: 80,  // Understanding NFTs
      4: 80,  // DeFi Basics
      5: 70   // Project CryptoGift
    };
    
    const requiredScore = passingScores[moduleId] || 80;
    if (score < requiredScore) {
      return res.status(400).json({ 
        success: false,
        error: `Score too low. Required: ${requiredScore}%, Got: ${score}%` 
      });
    }
    
    // Record module completion
    const completionKey = `education:${sessionData.claimer}:${sessionData.giftId}:module:${moduleId}`;
    const progressKey = `education:${sessionData.claimer}:${sessionData.giftId}:progress`;
    
    await redis.setex(completionKey, 90 * 24 * 60 * 60, JSON.stringify({
      moduleId,
      score,
      completedAt: new Date().toISOString(),
      sessionToken,
      tokenId
    }));
    
    // Get current progress with proper JSON parsing
    const progressDataRaw = await redis.get(progressKey);
    let completedModules: number[] = [];
    
    if (progressDataRaw && typeof progressDataRaw === 'string') {
      try {
        completedModules = JSON.parse(progressDataRaw);
      } catch (e) {
        console.warn('Invalid progress JSON, starting fresh:', e);
      }
    }
    
    if (!completedModules.includes(moduleId)) {
      completedModules.push(moduleId);
      await redis.setex(progressKey, 90 * 24 * 60 * 60, JSON.stringify(completedModules));
    }
    
    // Check if all modules completed
    const remainingModules = sessionData.modules.filter(m => !completedModules.includes(m));
    const allCompleted = remainingModules.length === 0;
    
    let approvalGranted = false;
    
    if (allCompleted) {
      // Grant approval for this gift + claimer combination
      const approvalKey = `approval:${sessionData.giftId}:${sessionData.claimer}`;
      await redis.setex(approvalKey, 90 * 24 * 60 * 60, JSON.stringify({
        grantedAt: new Date().toISOString(),
        sessionToken,
        tokenId,
        completedModules,
        giftId: sessionData.giftId,
        claimer: sessionData.claimer
      }));
      
      approvalGranted = true;
      
      // Mark overall education as completed for this gift
      const completionFlagKey = `education:${sessionData.claimer}:${sessionData.giftId}`;
      await redis.setex(completionFlagKey, 90 * 24 * 60 * 60, 'true');
      
      // Request EIP-712 signature for stateless approval
      try {
        const approvalResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/education/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken,
            tokenId,
            claimer: sessionData.claimer,
            giftId: sessionData.giftId
          })
        });
        
        if (approvalResponse.ok) {
          const approvalData = await approvalResponse.json();
          if (approvalData.gateData) {
            // Store gate data for frontend use
            const gateDataKey = `gatedata:${sessionData.giftId}:${sessionData.claimer}`;
            await redis.setex(gateDataKey, 3600, approvalData.gateData); // 1 hour TTL
          }
        }
      } catch (error) {
        console.warn('Failed to get EIP-712 signature, will use mapping fallback:', error);
      }
      
      debugLogger.operation('All education modules completed', {
        tokenId,
        giftId: sessionData.giftId,
        claimer: sessionData.claimer.slice(0, 10) + '...',
        moduleCount: completedModules.length,
        approvalGranted: true
      });
    }
    
    debugLogger.operation('Education module completed', {
      moduleId,
      score,
      tokenId,
      giftId: sessionData.giftId,
      remainingCount: remainingModules.length,
      allCompleted
    });
    
    return res.status(200).json({
      success: true,
      allModulesCompleted: allCompleted,
      remainingModules: remainingModules,
      approvalGranted: approvalGranted,
      message: allCompleted 
        ? '🎉 All modules completed! You can now claim your gift.'
        : `Module ${moduleId} completed. ${remainingModules.length} module(s) remaining.`
    });
    
  } catch (error: any) {
    console.error('💥 COMPLETE MODULE ERROR:', error);
    debugLogger.operation('Complete module error', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}