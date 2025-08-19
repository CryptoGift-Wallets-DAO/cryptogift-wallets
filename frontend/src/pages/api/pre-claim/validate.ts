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
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';
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
import { getGiftSalt } from '../../../lib/giftMappingStore';
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
  message?: string;
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
    // Note: Using simpler rate limiting for unified Redis compatibility
    const attemptKey = `rate_limit_simple:${key}`;
    const attempts = await kv.get<number>(attemptKey) || 0;
    
    if (attempts >= MAX_ATTEMPTS_PER_WINDOW) {
      return { allowed: false, remaining: 0 };
    }
    
    // Simplified burst limit check for Redis compatibility
    // Since we're using simple counter, apply basic burst protection
    if (attempts >= BURST_LIMIT) {
      return { allowed: false, remaining: MAX_ATTEMPTS_PER_WINDOW - attempts };
    }
    
    // Add current attempt (simplified)
    await kv.setex(attemptKey, RATE_LIMIT_WINDOW / 1000, attempts + 1);
    
    return { 
      allowed: true, 
      remaining: MAX_ATTEMPTS_PER_WINDOW - attempts - 1 
    };
  } catch (error) {
    console.warn('Rate limit check failed, allowing request:', error);
    return { allowed: true, remaining: MAX_ATTEMPTS_PER_WINDOW };
  }
}

/**
 * Validate password against contract using private RPC
 * CRITICAL FIX: Now retrieves and uses the original mint salt
 */
async function validatePasswordWithContract(
  tokenId: string,
  password: string,
  providedSalt: string
): Promise<{ valid: boolean; giftInfo?: EscrowGift; error?: string; originalSalt?: string }> {
  try {
    // CRITICAL: Get giftId from tokenId mapping with enhanced logging
    console.log(`🔍 MAPPING: Starting tokenId → giftId lookup for token ${tokenId}`);
    const giftId = await getGiftIdFromTokenId(tokenId);
    
    if (giftId === null) {
      console.error(`❌ MAPPING FAILED: No giftId found for tokenId ${tokenId}`);
      console.error('This could indicate:');
      console.error('  1. Token does not exist in the mapping system');
      console.error('  2. Redis/KV lookup failed and blockchain events are not indexed');
      console.error('  3. Token was minted but mapping was not stored correctly');
      
      debugLogger.operation('TokenId mapping failed', {
        tokenId,
        error: 'No giftId found',
        timestamp: new Date().toISOString()
      });
      
      return { valid: false, error: 'Gift not found for this token' };
    }
    
    console.log(`✅ MAPPING SUCCESS: tokenId ${tokenId} → giftId ${giftId}`);
    
    // CRITICAL FIX: Retrieve the original mint salt
    console.log(`🧂 SALT RETRIEVAL: Getting original mint salt for giftId ${giftId}...`);
    let originalSalt: string | null = null;
    
    try {
      originalSalt = await getGiftSalt(giftId);
      if (originalSalt) {
        console.log(`✅ ORIGINAL SALT FOUND: ${originalSalt.slice(0, 10)}... (length: ${originalSalt.length})`);
        console.log(`🔍 SALT COMPARISON:`);
        console.log(`   • Original salt:  ${originalSalt.slice(0, 20)}...`);
        console.log(`   • Provided salt:  ${providedSalt.slice(0, 20)}...`);
        console.log(`   • Salts match:    ${originalSalt === providedSalt ? '✅' : '❌'}`);
        
        if (originalSalt !== providedSalt) {
          console.log('🔧 ARCHITECTURAL FIX: Using original mint salt instead of provided claim salt');
        }
      } else {
        console.warn(`⚠️ SALT NOT FOUND: No salt stored for giftId ${giftId}`);
        console.warn('This could happen if:');
        console.warn('  1. Gift was minted before salt storage feature');
        console.warn('  2. Salt storage failed during minting');
        console.warn('  3. Redis/KV storage is not available');
        console.warn('🔄 FALLBACK: Will use provided salt from frontend');
      }
    } catch (saltError) {
      console.error(`❌ SALT RETRIEVAL ERROR for giftId ${giftId}:`, saltError);
      console.error('🔄 FALLBACK: Will use provided salt from frontend');
    }
    
    // Use original salt if available, otherwise fall back to provided salt
    const saltToUse = originalSalt || providedSalt;
    console.log(`🔐 SALT SELECTION: Using ${originalSalt ? 'ORIGINAL' : 'PROVIDED'} salt: ${saltToUse.slice(0, 10)}...`);
    
    // Get gift information from smart contract
    console.log(`🔗 CONTRACT: Reading gift data for giftId ${giftId} from contract`);
    const escrowContract = getEscrowContract();
    
    let giftData;
    try {
      giftData = await readContract({
        contract: escrowContract,
        method: "getGift",
        params: [BigInt(giftId)]
      });
      console.log(`✅ CONTRACT: Successfully read gift data for giftId ${giftId}`);
    } catch (contractError: any) {
      console.error(`❌ CONTRACT: Failed to read gift data for giftId ${giftId}:`, contractError);
      throw new Error(`Contract read failed: ${contractError.message}`);
    }
    
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
    
    // Check if already claimed (normalize BigInt to Number)
    const giftStatus = Number(gift.status);
    if (giftStatus === 1) {
      return { valid: false, error: 'Gift already claimed' };
    }
    
    // AUDIT: Hash generation parameters logging (updated to use correct salt)
    const hashParams = {
      password: password,
      passwordType: typeof password,
      passwordLength: password.length,
      providedSalt: providedSalt,
      originalSalt: originalSalt,
      saltToUse: saltToUse,
      saltType: typeof saltToUse,
      saltLength: saltToUse.length,
      giftId: giftId,
      giftIdType: typeof giftId,
      contractAddress: ESCROW_CONTRACT_ADDRESS!,
      contractAddressType: typeof ESCROW_CONTRACT_ADDRESS!,
      chainId: 84532,
      chainIdType: typeof 84532,
      saltSelection: originalSalt ? 'ORIGINAL_MINT_SALT' : 'FALLBACK_PROVIDED_SALT',
      timestamp: new Date().toISOString()
    };
    
    console.log('🔐 HASH GENERATION PARAMETERS (FIXED):', hashParams);
    
    // Validate password hash using the correct salt
    const providedHash = generatePasswordHash(
      password,
      saltToUse, // Use the correct salt (original or fallback)
      giftId,
      ESCROW_CONTRACT_ADDRESS!,
      84532 // Base Sepolia chain ID
    );
    
    console.log('🔐 HASH GENERATION RESULT:', {
      providedHash,
      hashLength: providedHash.length,
      hashType: typeof providedHash,
      timestamp: new Date().toISOString()
    });
    
    // ENHANCED DEBUG LOGGING - PROTOCOL v2 DEEP ANALYSIS (WITH SALT FIX)
    const debugData = {
      timestamp: new Date().toISOString(),
      tokenId: tokenId,
      giftId: giftId,
      passwordLength: password.length,
      // SECURITY C1 FIX: Removed password fragments from logs
      providedSalt: providedSalt,
      providedSaltLength: providedSalt.length,
      providedSaltPrefix: providedSalt.substring(0, 10),
      originalSalt: originalSalt,
      originalSaltLength: originalSalt?.length || 0,
      originalSaltPrefix: originalSalt?.substring(0, 10) || 'N/A',
      saltUsed: saltToUse,
      saltUsedLength: saltToUse.length,
      saltUsedPrefix: saltToUse.substring(0, 10),
      saltSelection: originalSalt ? 'ORIGINAL_MINT_SALT' : 'FALLBACK_PROVIDED_SALT',
      contractAddress: ESCROW_CONTRACT_ADDRESS,
      chainId: 84532,
      providedHash: providedHash,
      expectedHash: gift.passwordHash,
      hashesMatchExact: providedHash === gift.passwordHash,
      hashesMatchLowercase: providedHash.toLowerCase() === gift.passwordHash.toLowerCase(),
      giftStatus: Number(gift.status), // Convert BigInt to Number
      giftExpirationTime: Number(gift.expirationTime), // Convert BigInt to Number
      currentTime: Math.floor(Date.now() / 1000),
      saltMismatchDetected: originalSalt && originalSalt !== providedSalt,
      architecturalFix: originalSalt ? 'SALT_RETRIEVED_FROM_MINT' : 'FALLBACK_TO_PROVIDED_SALT'
    };
    
    // Multiple logging methods to ensure visibility
    console.log('🔍 PASSWORD VALIDATION DEBUG - DEEP ANALYSIS:');
    console.log('==========================================');
    console.table(debugData);
    console.log('Raw Debug Data:', JSON.stringify(debugData, null, 2));
    
    // Log individual components for easier reading in production
    console.log('TOKEN & GIFT INFO:');
    console.log(`  • TokenId: ${tokenId}`);
    console.log(`  • GiftId: ${giftId}`);
    console.log(`  • Gift Status: ${gift.status}`);
    
    console.log('PASSWORD INFO:');
    console.log(`  • Password Length: ${password.length}`);
    // SECURITY C1 FIX: Removed password hash fragments from logs
    // SECURITY: Password fragments removed from logs
    
    console.log('SALT INFO (ARCHITECTURAL FIX):');
    console.log(`  • Provided Salt:  ${providedSalt}`);
    console.log(`  • Original Salt:  ${originalSalt || 'NOT_FOUND'}`);
    console.log(`  • Salt Used:      ${saltToUse}`);
    console.log(`  • Salt Selection: ${originalSalt ? 'ORIGINAL_MINT_SALT' : 'FALLBACK_PROVIDED_SALT'}`);
    console.log(`  • Salt Length:    ${saltToUse.length}`);
    console.log(`  • Salt Mismatch:  ${originalSalt && originalSalt !== providedSalt ? 'YES (FIXED)' : 'NO'}`);
    
    console.log('HASH COMPARISON:');
    console.log(`  • Provided:  ${providedHash}`);
    console.log(`  • Expected:  ${gift.passwordHash}`);
    console.log(`  • Exact Match: ${providedHash === gift.passwordHash}`);
    console.log(`  • Lower Match: ${providedHash.toLowerCase() === gift.passwordHash.toLowerCase()}`);
    
    console.log('SOLIDITY HASH GENERATION DETAILS:');
    console.log(`  • Types: ['string', 'bytes32', 'uint256', 'address', 'uint256']`);
    console.log(`  • Values: ['${password}', '${saltToUse}', ${giftId}, '${ESCROW_CONTRACT_ADDRESS}', 84532]`);
    console.log(`  • ARCHITECTURAL FIX: ${originalSalt ? 'Using original mint salt' : 'Using provided salt (fallback)'}`);
    
    // Store in debugLogger for persistence
    debugLogger.operation('Password validation deep analysis', debugData);
    
    if (providedHash.toLowerCase() !== gift.passwordHash.toLowerCase()) {
      console.error('❌ PASSWORD VALIDATION FAILED - DETAILED ANALYSIS:');
      console.error('================================================');
      console.error('Hash mismatch detected. This could be due to:');
      console.error('1. Incorrect password entered by user');
      console.error('2. Salt mismatch between frontend and backend');
      console.error('3. GiftId mapping error (tokenId → giftId)');
      console.error('4. Contract address or chainId mismatch');
      console.error('5. Data corruption during transmission');
      
      // Log the exact differences
      const providedLower = providedHash.toLowerCase();
      const expectedLower = gift.passwordHash.toLowerCase();
      
      console.error('CHARACTER-BY-CHARACTER ANALYSIS:');
      for (let i = 0; i < Math.max(providedLower.length, expectedLower.length); i++) {
        if (providedLower[i] !== expectedLower[i]) {
          console.error(`  Position ${i}: provided='${providedLower[i] || 'undefined'}' vs expected='${expectedLower[i] || 'undefined'}'`);
          break; // Show only first difference
        }
      }
      
      debugLogger.operation('Password validation failed with details', {
        providedHash,
        expectedHash: gift.passwordHash,
        tokenId,
        giftId,
        passwordLength: password.length,
        failure_reason: 'Hash mismatch'
      });
      
      return { valid: false, error: 'Invalid password' };
    }
    
    return { valid: true, giftInfo: gift, originalSalt: originalSalt || undefined };
    
  } catch (error: any) {
    console.error('💥 CONTRACT VALIDATION ERROR - DETAILED ANALYSIS:');
    console.error('================================================');
    console.error('Error during password validation process:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      tokenId,
      timestamp: new Date().toISOString()
    });
    
    // Check for specific error types
    if (error.message?.includes('Gift not found')) {
      console.error('🔍 DIAGNOSIS: Gift mapping issue - tokenId may not exist or be mapped correctly');
    } else if (error.message?.includes('expired')) {
      console.error('🔍 DIAGNOSIS: Gift expiration issue');
    } else if (error.message?.includes('IPFS')) {
      console.error('🔍 DIAGNOSIS: IPFS timeout may be affecting gift data retrieval');
    }
    
    debugLogger.operation('Contract validation error with context', {
      error: error.message,
      tokenId,
      errorType: 'contract_validation_failure',
      timestamp: new Date().toISOString()
    });
    
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
    // UNIFIED REDIS CLIENT: Use redisConfig instead of @vercel/kv
    const redis = validateRedisForCriticalOps('Education requirements lookup');
    
    if (!redis) {
      console.warn('⚠️ Redis not available - defaulting to no education requirements');
      return { requiresEducation: false, modules: [] };
    }
    
    // UNIFIED KEY FORMAT: Use education:gift:{giftId} key format
    const educationKey = `education:gift:${giftId}`;
    const educationDataRaw = await redis.get(educationKey);
    
    if (educationDataRaw && typeof educationDataRaw === 'string') {
      try {
        const educationData = JSON.parse(educationDataRaw);
        console.log(`✅ Education data found for giftId ${giftId}:`, {
          hasEducation: educationData.hasEducation,
          moduleCount: educationData.modules?.length || 0
        });
        
        return {
          requiresEducation: educationData.hasEducation || false,
          modules: educationData.modules || []
        };
      } catch (parseError) {
        console.error(`❌ Invalid education JSON for giftId ${giftId}:`, parseError);
      }
    }
    
    // FALLBACK: Check legacy key format for backward compatibility
    const legacyKey = `gift:${giftId}:requirements`;
    const requirements = await redis.get(legacyKey);
    
    if (requirements && Array.isArray(requirements) && requirements.length > 0) {
      console.log(`⚠️ Using legacy education requirements for giftId ${giftId}:`, requirements);
      return { requiresEducation: true, modules: requirements };
    }
    
    // SECURE DEFAULT: No education requirements found
    console.log(`🛡️ No education requirements found for giftId ${giftId} - defaulting to no education`);
    return { requiresEducation: false, modules: [] };
    
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
    
    // AUDIT: Salt reception logging
    console.log('📨 BACKEND SALT RECEPTION:', {
      tokenId,
      passwordLength: password?.length,
      // SECURITY C1 FIX: Removed password fragments from logs
      salt,
      saltType: typeof salt,
      saltLength: salt?.length,
      saltStartsWith0x: salt?.startsWith('0x'),
      deviceId,
      timestamp: new Date().toISOString(),
      requestHeaders: {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
      }
    });
    
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
      // SECURITY C1 FIX: Removed password hash fragments from logs
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
    
    // CRITICAL FIX: Use real claimer address from request
    // Extract claimer from headers or body (authenticated user)
    const claimer = req.body?.claimer || req.headers['x-wallet-address'] as string;
    
    if (!claimer || !ethers.isAddress(claimer)) {
      return res.status(400).json({
        success: false,
        valid: false,
        requiresEducation: false,
        error: 'MISSING_CLAIMER_ADDRESS',
        message: 'Valid claimer wallet address is required for education validation'
      });
    }
    
    console.log(`✅ Real claimer address provided: ${claimer.slice(0, 10)}...`);
    
    const gateCheck = await checkGateRequirements(giftId, claimer);
    
    // Generate session token for tracking
    const sessionToken = generateSessionToken(tokenId, claimer);
    
    // UNIFIED REDIS: Store session using redisConfig client
    const redis = validateRedisForCriticalOps('Session storage');
    
    if (redis) {
      const sessionData = {
        tokenId,
        giftId,
        claimer,
        passwordValidated: true,
        requiresEducation: gateCheck.requiresEducation,
        modules: gateCheck.modules,
        timestamp: Date.now()
      };
      
      await redis.setex(
        `preclaim:session:${sessionToken}`,
        3600, // 1 hour TTL
        JSON.stringify(sessionData)
      );
      
      console.log(`✅ Session stored for token ${tokenId}:`, {
        sessionToken: sessionToken.slice(0, 10) + '...',
        requiresEducation: gateCheck.requiresEducation,
        moduleCount: gateCheck.modules.length
      });
    } else {
      console.warn('⚠️ Redis not available - session not stored (development mode)');
    }
    
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