/**
 * PRE-CLAIM VALIDATION API
 * Validates gift claim requirements without executing transaction
 * Uses private RPC to protect password privacy
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { kv } from '@vercel/kv';
import { createThirdwebClient, getContract, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { 
  generatePasswordHash,
  getEscrowContract,
  validatePassword,
  validateTokenId,
  getGiftIdFromTokenId,
  isGiftExpired
} from '../../../lib/escrowUtils';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from '../../../lib/escrowABI';
import { debugLogger } from '../../../lib/secureDebugLogger';
import { secureLogger } from '../../../lib/secureLogger';
import { getPublicBaseUrl } from '../../../lib/publicBaseUrl';

// Types
interface PreClaimValidationRequest {
  tokenId: string;
  password: string;
  salt: string;
  deviceId?: string;
}

interface EducationRequirement {
  id: number;
  name: string;
  estimatedTime: number; // minutes
  description?: string;
}

interface PreClaimValidationResponse {
  success: boolean;
  valid: boolean;
  requiresEducation: boolean;
  educationRequirements?: EducationRequirement[];
  giftInfo?: {
    creator: string;
    expirationTime: number;
    status: number;
    hasGate: boolean;
  };
  sessionToken?: string; // For tracking education progress
  error?: string;
  errorCode?: string;
  remainingAttempts?: number;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5;
const BURST_LIMIT = 3;

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Education module definitions (would normally be in DB)
const EDUCATION_MODULES: Record<number, EducationRequirement> = {
  1: {
    id: 1,
    name: 'Crear Wallet Segura',
    estimatedTime: 10,
    description: 'Aprende a crear y proteger tu billetera de criptomonedas'
  },
  2: {
    id: 2,
    name: 'Seguridad Básica',
    estimatedTime: 8,
    description: 'Mejores prácticas para mantener tus activos seguros'
  },
  3: {
    id: 3,
    name: 'Entender NFTs',
    estimatedTime: 12,
    description: 'Qué son los NFTs y cómo funcionan'
  },
  4: {
    id: 4,
    name: 'DeFi Básico',
    estimatedTime: 15,
    description: 'Introducción a las finanzas descentralizadas'
  },
  5: {
    id: 5,
    name: 'Proyecto CryptoGift',
    estimatedTime: 20,
    description: 'Conoce nuestra visión y únete como colaborador'
  }
};

/**
 * Get rate limit key for the request
 */
function getRateLimitKey(req: NextApiRequest, tokenId: string): string {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const deviceId = req.body.deviceId || 'unknown';
  return `preclaim:${tokenId}:${ip}:${deviceId}`;
}

/**
 * Check and update rate limit
 */
async function checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    // Get attempts in current window
    const attempts = await kv.zrange(key, windowStart, now, { byScore: true });
    
    if (attempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
      return { allowed: false, remaining: 0 };
    }
    
    // Check burst limit (recent attempts)
    const recentWindowStart = now - (RATE_LIMIT_WINDOW / 4); // Last 15 seconds
    const recentAttempts = attempts.filter((timestamp: any) => 
      Number(timestamp) > recentWindowStart
    );
    
    if (recentAttempts.length >= BURST_LIMIT) {
      return { allowed: false, remaining: MAX_ATTEMPTS_PER_WINDOW - attempts.length };
    }
    
    // Add current attempt
    await kv.zadd(key, { score: now, member: now.toString() });
    
    // Set expiry for cleanup
    await kv.expire(key, RATE_LIMIT_WINDOW / 1000);
    
    return { 
      allowed: true, 
      remaining: MAX_ATTEMPTS_PER_WINDOW - attempts.length - 1 
    };
  } catch (error) {
    console.warn('Rate limit check failed, allowing request:', error);
    return { allowed: true, remaining: MAX_ATTEMPTS_PER_WINDOW };
  }
}

/**
 * Validate password against contract using private RPC
 */
async function validatePasswordWithContract(
  tokenId: string,
  password: string,
  salt: string
): Promise<{ valid: boolean; giftInfo?: EscrowGift; error?: string }> {
  try {
    // Get giftId from tokenId mapping
    const giftId = await getGiftIdFromTokenId(tokenId);
    if (giftId === null) {
      return { valid: false, error: 'Gift not found for this token' };
    }
    
    // Get gift information
    const escrowContract = getEscrowContract();
    const giftData = await readContract({
      contract: escrowContract,
      method: "getGift",
      params: [BigInt(giftId)]
    });
    
    // Parse gift data
    const gift: EscrowGift = {
      creator: giftData[0],
      expirationTime: giftData[1],
      nftContract: giftData[2],
      tokenId: giftData[3],
      passwordHash: giftData[4],
      status: giftData[5]
    };
    
    // Check if gift is expired
    if (isGiftExpired(gift.expirationTime)) {
      return { valid: false, error: 'Gift has expired' };
    }
    
    // Check if already claimed
    if (gift.status === 1) {
      return { valid: false, error: 'Gift already claimed' };
    }
    
    // Validate password hash
    const providedHash = generatePasswordHash(
      password,
      salt,
      giftId,
      ESCROW_CONTRACT_ADDRESS!,
      84532 // Base Sepolia chain ID
    );
    
    // DEBUG LOGGING FOR PASSWORD VALIDATION ISSUE
    console.log('🔍 PASSWORD VALIDATION DEBUG:');
    console.log('  TokenId:', tokenId);
    console.log('  GiftId:', giftId);
    console.log('  Password length:', password.length);
    console.log('  Salt:', salt);
    console.log('  Contract:', ESCROW_CONTRACT_ADDRESS);
    console.log('  Provided Hash:', providedHash);
    console.log('  Expected Hash:', gift.passwordHash);
    console.log('  Hashes match:', providedHash.toLowerCase() === gift.passwordHash.toLowerCase());
    
    if (providedHash.toLowerCase() !== gift.passwordHash.toLowerCase()) {
      return { valid: false, error: 'Invalid password' };
    }
    
    return { valid: true, giftInfo: gift };
    
  } catch (error: any) {
    console.error('Contract validation error:', error);
    return { 
      valid: false, 
      error: error.message || 'Failed to validate with contract' 
    };
  }
}

/**
 * Check if gate requires education
 */
async function checkGateRequirements(
  giftId: number,
  claimer: string
): Promise<{ requiresEducation: boolean; modules: number[] }> {
  try {
    // For now, return hardcoded requirements based on gift configuration
    // In production, this would check the actual gate contract
    
    // Check if this gift has education requirements in KV
    const requirementsKey = `gift:${giftId}:requirements`;
    const requirements = await kv.get<number[]>(requirementsKey);
    
    if (!requirements || requirements.length === 0) {
      // No education required
      return { requiresEducation: false, modules: [] };
    }
    
    // Check if user already completed education or has approval
    const completionKey = `education:${claimer}:${giftId}`;
    const approvalKey = `approval:${giftId}:${claimer}`;
    
    const [completed, approval] = await Promise.all([
      kv.get<boolean>(completionKey),
      kv.get<any>(approvalKey)
    ]);
    
    if (completed || approval) {
      return { requiresEducation: false, modules: [] };
    }
    
    return { requiresEducation: true, modules: requirements };
    
  } catch (error) {
    console.warn('Gate check failed, assuming no requirements:', error);
    return { requiresEducation: false, modules: [] };
  }
}

/**
 * Generate session token for education tracking
 */
function generateSessionToken(tokenId: string, claimer: string): string {
  const data = `${tokenId}:${claimer}:${Date.now()}`;
  return Buffer.from(data).toString('base64url');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreClaimValidationResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      valid: false,
      requiresEducation: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    const {
      tokenId,
      password,
      salt,
      deviceId
    }: PreClaimValidationRequest = req.body;
    
    // Validate required fields
    if (!tokenId || !password || !salt) {
      return res.status(400).json({ 
        success: false,
        valid: false,
        requiresEducation: false,
        error: 'Missing required fields: tokenId, password, salt' 
      });
    }
    
    // Validate input formats
    const tokenValidation = validateTokenId(tokenId);
    if (!tokenValidation.valid) {
      return res.status(400).json({ 
        success: false,
        valid: false,
        requiresEducation: false,
        error: tokenValidation.message 
      });
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        success: false,
        valid: false,
        requiresEducation: false,
        error: passwordValidation.message 
      });
    }
    
    // Check rate limit
    const rateLimitKey = getRateLimitKey(req, tokenId);
    const { allowed, remaining } = await checkRateLimit(rateLimitKey);
    
    if (!allowed) {
      debugLogger.operation('Pre-claim rate limited', {
        tokenId,
        key: rateLimitKey,
        remaining
      });
      
      return res.status(429).json({
        success: false,
        valid: false,
        requiresEducation: false,
        error: 'Too many attempts. Please wait before trying again.',
        errorCode: 'RATE_LIMITED',
        remainingAttempts: remaining
      });
    }
    
    // Log validation attempt (secure - no password logged)
    secureLogger.info('Pre-claim validation attempt', {
      tokenId,
      passwordHash: ethers.keccak256(ethers.toUtf8Bytes(password)).slice(0, 8) + '...',
      deviceId,
      remaining
    });
    
    // Validate password with contract
    const validation = await validatePasswordWithContract(tokenId, password, salt);
    
    if (!validation.valid) {
      debugLogger.operation('Pre-claim validation failed', {
        tokenId,
        error: validation.error,
        remaining
      });
      
      return res.status(400).json({
        success: true, // API call succeeded
        valid: false,  // But validation failed
        requiresEducation: false,
        error: validation.error || 'Validation failed',
        remainingAttempts: remaining
      });
    }
    
    // Password is valid! Now check if education is required
    const giftId = await getGiftIdFromTokenId(tokenId);
    if (giftId === null) {
      return res.status(400).json({
        success: false,
        valid: false,
        requiresEducation: false,
        error: 'Gift mapping not found'
      });
    }
    
    // For demo, use a placeholder claimer address
    // In production, this would come from the authenticated user
    const claimer = '0x0000000000000000000000000000000000000000';
    
    const gateCheck = await checkGateRequirements(giftId, claimer);
    
    // Generate session token for tracking
    const sessionToken = generateSessionToken(tokenId, claimer);
    
    // Store session in KV for later use
    await kv.setex(
      `preclaim:session:${sessionToken}`,
      3600, // 1 hour TTL
      JSON.stringify({
        tokenId,
        giftId,
        claimer,
        passwordValidated: true,
        requiresEducation: gateCheck.requiresEducation,
        modules: gateCheck.modules,
        timestamp: Date.now()
      })
    );
    
    debugLogger.operation('Pre-claim validation success', {
      tokenId,
      giftId,
      requiresEducation: gateCheck.requiresEducation,
      moduleCount: gateCheck.modules.length
    });
    
    // Prepare response
    const response: PreClaimValidationResponse = {
      success: true,
      valid: true,
      requiresEducation: gateCheck.requiresEducation,
      sessionToken,
      giftInfo: validation.giftInfo ? {
        creator: validation.giftInfo.creator,
        expirationTime: Number(validation.giftInfo.expirationTime),
        status: validation.giftInfo.status,
        hasGate: gateCheck.requiresEducation
      } : undefined
    };
    
    // Add education requirements if needed
    if (gateCheck.requiresEducation) {
      response.educationRequirements = gateCheck.modules
        .map(moduleId => EDUCATION_MODULES[moduleId])
        .filter(Boolean);
    }
    
    return res.status(200).json(response);
    
  } catch (error: any) {
    console.error('💥 PRE-CLAIM VALIDATION ERROR:', error);
    debugLogger.operation('Pre-claim validation error', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      valid: false,
      requiresEducation: false,
      error: error.message || 'Internal server error'
    });
  }
}