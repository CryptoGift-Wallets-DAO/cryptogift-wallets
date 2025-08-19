/**
 * EDUCATION APPROVAL API - EIP-712 SIGNATURE
 * Emits EIP-712 signatures for education completion
 * Stateless approval without on-chain writes
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';
import { kv } from '@vercel/kv';
import { debugLogger } from '../../../lib/secureDebugLogger';
import { secureLogger } from '../../../lib/secureLogger';
import { getApproverWallet, validateApproverConfig, APPROVAL_GATE_ADDRESS } from '../../../lib/approverConfig';

interface ApprovalRequest {
  sessionToken: string;
  tokenId: string;
  claimer: string;
  giftId: number;
}

interface ApprovalResponse {
  success: boolean;
  signature?: string;
  deadline?: number;
  gateData?: string; // Encoded signature + deadline for contract
  message?: string;
  error?: string;
}

// EIP-712 Domain Configuration
// Use the constant from approverConfig to ensure consistency
const EIP712_DOMAIN = {
  name: 'SimpleApprovalGate',
  version: '1',
  chainId: 84532, // Base Sepolia
  verifyingContract: APPROVAL_GATE_ADDRESS // Always use the deployed contract address
};

const EIP712_TYPES = {
  EducationApproval: [
    { name: 'claimer', type: 'address' },
    { name: 'giftId', type: 'uint256' },
    { name: 'requirementsVersion', type: 'uint16' },
    { name: 'deadline', type: 'uint256' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' }
  ]
};

const REQUIREMENTS_VERSION = 1; // Must match contract
const SIGNATURE_TTL = 3600; // 1 hour validity

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApprovalResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
  // SECURITY: Rate limiting for education approval endpoint  
  // FIXED: Use req.socket.remoteAddress instead of deprecated req.connection
  const clientIP = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const rateLimitKey = `rate_limit:education_approve:${clientIP}:${userAgent.slice(0, 50)}`;
  
  // UNIFIED REDIS: Rate limiting with redisConfig client
  const redisRateLimit = validateRedisForCriticalOps('Rate limiting');
  
  if (redisRateLimit) {
    try {
      // Check current rate limit
      const currentCount = await redisRateLimit.get(rateLimitKey);
      const count = typeof currentCount === 'string' ? parseInt(currentCount) : (currentCount as number || 0);
      
      if ((count as number) >= 5) { // 5 attempts per minute
        return res.status(429).json({ 
          success: false,
          error: 'Rate limit exceeded - max 5 education approvals per minute' 
        });
      }
      
      // Increment rate limit counter
      await redisRateLimit.setex(rateLimitKey, 60, (count as number) + 1); // 60 seconds TTL
      
    } catch (rateLimitError) {
      console.warn('⚠️ Rate limiting failed:', rateLimitError);
      // Continue without rate limiting in case of Redis issues
    }
  } else {
    console.warn('⚠️ Rate limiting disabled - Redis not available');
  }
  
  try {
    const {
      sessionToken,
      tokenId,
      claimer
    }: Omit<ApprovalRequest, 'giftId'> & { giftId?: number } = req.body;
    
    // Validate required fields
    if (!sessionToken || !tokenId || !claimer) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: sessionToken, tokenId, claimer' 
      });
    }
    
    // Validate claimer address
    if (!ethers.isAddress(claimer)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid claimer address' 
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
    
    console.log(`🔍 Looking for session with key: ${sessionKey}`);
    console.log(`Session token received: ${sessionToken}`);
    
    const sessionDataRaw = await redis.get(sessionKey);
    
    console.log(`📦 Raw session data retrieved:`, {
      exists: !!sessionDataRaw,
      type: typeof sessionDataRaw,
      isString: typeof sessionDataRaw === 'string',
      length: sessionDataRaw ? String(sessionDataRaw).length : 0
    });
    
    let sessionData: {
      tokenId: string;
      giftId: number;
      claimer: string;
      passwordValidated: boolean;
      requiresEducation: boolean;
      modules: number[];
      timestamp: number;
    } | null = null;
    
    // Handle both string (JSON) and direct object formats from Redis
    if (sessionDataRaw) {
      if (typeof sessionDataRaw === 'string') {
        try {
          sessionData = JSON.parse(sessionDataRaw);
          console.log(`✅ Session retrieved (from JSON) for ${sessionToken.slice(0, 10)}...`);
        } catch (parseError) {
          console.error(`❌ Invalid session JSON for ${sessionToken}:`, parseError);
          return res.status(401).json({
            success: false,
            error: 'Invalid session data format'
          });
        }
      } else if (typeof sessionDataRaw === 'object') {
        // Redis/KV sometimes returns the object directly
        sessionData = sessionDataRaw as any;
        console.log(`✅ Session retrieved (direct object) for ${sessionToken.slice(0, 10)}...`);
      }
    }
    
    if (!sessionData) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired session' 
      });
    }
    
    // Use giftId from session data (authoritative source)
    const giftId = sessionData.giftId;
    
    // Verify session matches request
    if (sessionData.tokenId !== tokenId) {
      return res.status(403).json({ 
        success: false,
        error: 'Session mismatch - tokenId' 
      });
    }
    
    // SECURITY: Verify claimer matches authenticated address from session
    // NOTE: Session might have 'pending' if wallet wasn't connected during validation
    // We update the session claimer to the real address for bypass
    if (sessionData.claimer === 'pending' || sessionData.claimer === null) {
      // Update session with real claimer address
      sessionData.claimer = claimer;
      
      // Update stored session with real claimer
      await redis.setex(
        sessionKey,
        3600, // Keep same TTL
        JSON.stringify(sessionData)
      );
      
      console.log(`✅ Session updated with real claimer: ${claimer.slice(0, 10)}...`);
    } else if (sessionData.claimer !== claimer) {
      // If session already has a different claimer, that's an error
      return res.status(403).json({ 
        success: false,
        error: 'Identity mismatch - claimer address does not match session' 
      });
    }
    
    // Check if education is completed OR if this is a bypass request
    const completionKey = `education:${claimer}:${giftId}`;
    const approvalKey = `approval:${giftId}:${claimer}`;
    
    // Check completion and approval status with unified Redis
    const [completionRaw, approvalRaw] = await Promise.all([
      redis.get(completionKey),
      redis.get(approvalKey)
    ]);
    
    // Handle both string and boolean/object formats from Redis
    const isCompleted = completionRaw === 'true' || completionRaw === true;
    
    let existingApproval: any = null;
    if (approvalRaw) {
      if (typeof approvalRaw === 'string') {
        try {
          existingApproval = JSON.parse(approvalRaw);
        } catch (e) {
          // If JSON parse fails, use as string
          existingApproval = approvalRaw;
        }
      } else {
        // Direct object or other type from Redis
        existingApproval = approvalRaw;
      }
    }
    
    // BYPASS MODE: Allow approval if session is valid (simulates education completed)
    const isBypassRequest = sessionData.passwordValidated && sessionData.requiresEducation;
    
    if (!isCompleted && !existingApproval && !isBypassRequest) {
      return res.status(403).json({ 
        success: false,
        error: 'Education not completed and bypass not active' 
      });
    }
    
    // If this is a bypass request, mark education as completed
    if (isBypassRequest && !isCompleted) {
      try {
        await redis.setex(completionKey, 86400 * 30, 'true'); // 30 days
        debugLogger.operation('Education bypass activated', {
          tokenId,
          giftId,
          claimer: claimer.slice(0, 10) + '...',
          bypassMode: true
        });
      } catch (error) {
        console.error('Failed to mark education as completed via bypass:', error);
      }
    }
    
    // Get the properly configured approver wallet
    const approverWallet = getApproverWallet();
    
    if (!approverWallet) {
      // Log the configuration issue
      const configValidation = validateApproverConfig();
      console.error('❌ CRITICAL: Approver wallet not properly configured');
      console.error('Validation result:', configValidation);
      
      debugLogger.operation('Approval requested but approver not configured', {
        tokenId,
        giftId,
        claimer: claimer.slice(0, 10) + '...',
        error: configValidation.error || 'NO_VALID_APPROVER',
        requiredApprover: '0x1dBa3F54F9ef623b94398D96323B6a27F2A7b37B'
      });
      
      return res.status(500).json({
        success: false,
        error: 'Education approval system not configured correctly.',
        message: 'The approver private key must match the deployed contract approver: 0x1dBa3F54F9ef623b94398D96323B6a27F2A7b37B'
      });
    }
    
    console.log('🔑 APPROVER CONFIGURATION:', {
      approverAddress: approverWallet.address,
      verifyingContract: EIP712_DOMAIN.verifyingContract,
      chainId: EIP712_DOMAIN.chainId,
      giftId: giftId,
      requirementsVersion: REQUIREMENTS_VERSION
    });
    
    // Calculate deadline (current time + TTL)
    const deadline = Math.floor(Date.now() / 1000) + SIGNATURE_TTL;
    
    // Prepare EIP-712 message with strict validation
    const message = {
      claimer: ethers.getAddress(claimer), // Normalize address with checksum
      giftId: BigInt(giftId),
      requirementsVersion: REQUIREMENTS_VERSION,
      deadline: BigInt(deadline),
      chainId: BigInt(EIP712_DOMAIN.chainId),
      verifyingContract: ethers.getAddress(EIP712_DOMAIN.verifyingContract) // Normalize with checksum
    };
    
    // CRITICAL: Validate all EIP-712 parameters strictly
    console.log('🔐 EIP-712 MESSAGE VALIDATION:', {
      claimer: message.claimer,
      giftId: giftId,
      requirementsVersion: REQUIREMENTS_VERSION,
      deadline: deadline,
      chainId: EIP712_DOMAIN.chainId,
      verifyingContract: message.verifyingContract
    });
    
    // Sign the message
    const signature = await approverWallet.signTypedData(
      EIP712_DOMAIN,
      EIP712_TYPES,
      message
    );
    
    // Encode gate data for contract (signature + deadline)
    const gateData = ethers.concat([
      signature,
      ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [deadline])
    ]);
    
    // Log approval (secure - no private data)
    secureLogger.info('Education approval signature issued', {
      tokenId,
      giftId,
      claimer: claimer.slice(0, 10) + '...',
      deadline,
      signatureHash: ethers.keccak256(signature).slice(0, 10) + '...',
      approver: approverWallet.address
    });
    
    debugLogger.operation('EIP-712 approval signature created', {
      tokenId,
      giftId,
      requirementsVersion: REQUIREMENTS_VERSION,
      deadline,
      ttl: SIGNATURE_TTL,
      chainId: EIP712_DOMAIN.chainId,
      verifyingContract: EIP712_DOMAIN.verifyingContract
    });
    
    return res.status(200).json({
      success: true,
      signature,
      deadline,
      gateData: gateData,
      message: `Approval signature valid until ${new Date(deadline * 1000).toISOString()}`
    });
    
  } catch (error: any) {
    console.error('💥 APPROVAL SIGNATURE ERROR:', error);
    debugLogger.operation('Approval signature error', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}