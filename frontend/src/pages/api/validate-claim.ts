/**
 * VALIDATE CLAIM API
 * Validates claim parameters without executing the claim transaction
 * The actual claim must be executed from frontend using user's wallet
 * This fixes ERROR 2: Claims going to deployer instead of user
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { 
  generatePasswordHash,
  getEscrowContract,
  validatePassword,
  validateAddress,
  validateTokenId,
  parseEscrowError,
  isGiftExpired,
  getGiftIdFromTokenId
} from '../../lib/escrowUtils';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from '../../lib/escrowABI';
import { verifyJWT, extractTokenFromHeaders } from '../../lib/siweAuth';
import { debugLogger } from '../../lib/secureDebugLogger';

// Types
interface ValidateClaimRequest {
  tokenId: string;
  password: string;
  salt: string;
  claimerAddress: string;
}

interface ValidateClaimResponse {
  success: boolean;
  valid: boolean;
  giftId?: number;
  giftInfo?: {
    creator: string;
    giftMessage?: string;
    expirationTime: number;
    status: number;
    nftContract: string;
  };
  claimParameters?: {
    giftId: number;
    password: string;
    salt: string;
    gateData: string;
  };
  contractAddress?: string;
  error?: string;
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// JWT Authentication middleware
function authenticate(req: NextApiRequest): { success: boolean; address?: string; error?: string } {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);
    
    if (!token) {
      return { 
        success: false, 
        error: 'Authentication required. Please provide a valid JWT token.' 
      };
    }
    
    const payload = verifyJWT(token);
    if (!payload) {
      return { 
        success: false, 
        error: 'Invalid or expired authentication token. Please sign in again.' 
      };
    }
    
    console.log('✅ Validate claim JWT authentication successful:', {
      address: payload.address.slice(0, 10) + '...',
      exp: new Date(payload.exp * 1000).toISOString()
    });
    
    return { 
      success: true, 
      address: payload.address 
    };
    
  } catch (error: any) {
    console.error('❌ JWT authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication verification failed' 
    };
  }
}

// Validate claim without executing
async function validateClaimParameters(
  tokenId: string,
  password: string,
  salt: string,
  claimerAddress: string
): Promise<{
  valid: boolean;
  giftId?: number;
  gift?: EscrowGift;
  error?: string;
}> {
  try {
    debugLogger.operation('Claim validation started', { tokenId, claimerAddress: claimerAddress.slice(0, 10) + '...' });
    
    // Step 1: Basic validation
    const tokenValidation = validateTokenId(tokenId);
    if (!tokenValidation.valid) {
      return { valid: false, error: tokenValidation.message };
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return { valid: false, error: passwordValidation.message };
    }
    
    const addressValidation = validateAddress(claimerAddress);
    if (!addressValidation.valid) {
      return { valid: false, error: addressValidation.message };
    }
    
    // Step 2: Map tokenId to giftId
    const giftId = await getGiftIdFromTokenId(tokenId);
    if (giftId === null) {
      debugLogger.operation('Gift not found', { tokenId, result: 'NOT_FOUND' });
      return { valid: false, error: 'Gift not found - this NFT is not registered in escrow' };
    }
    
    console.log(`✅ CLAIM VALIDATION: Using giftId ${giftId} for tokenId ${tokenId}`);
    
    // Step 3: Get gift information
    const escrowContract = getEscrowContract();
    const giftData = await readContract({
      contract: escrowContract,
      method: "getGift",
      params: [BigInt(giftId)]
    });
    
    // Parse gift data (ThirdWeb v5 returns array)
    const gift: EscrowGift = {
      creator: giftData[0],
      expirationTime: giftData[1],
      nftContract: giftData[2],
      tokenId: giftData[3],
      passwordHash: giftData[4],
      status: giftData[5]
    };
    
    debugLogger.operation('Gift data retrieved', { 
      giftId, 
      tokenId, 
      creator: gift.creator.slice(0, 10) + '...',
      status: gift.status,
      expired: isGiftExpired(gift.expirationTime)
    });
    
    // Step 4: Validate gift status
    if (gift.status === 1) {
      debugLogger.operation('Gift already claimed', { tokenId, giftId, status: gift.status });
      return { valid: false, error: 'This gift has already been claimed' };
    }
    
    if (gift.status === 2) {
      debugLogger.operation('Gift already returned', { tokenId, giftId, status: gift.status });
      return { valid: false, error: 'This gift has been returned to the creator' };
    }
    
    // Step 5: Check expiration
    if (isGiftExpired(gift.expirationTime)) {
      debugLogger.operation('Gift expired', { tokenId, giftId, expirationTime: Number(gift.expirationTime) });
      return { valid: false, error: 'This gift has expired and cannot be claimed' };
    }
    
    // Step 6: Validate password
    const providedPasswordHash = generatePasswordHash(
      password,
      salt,
      giftId,
      ESCROW_CONTRACT_ADDRESS!,
      84532 // Base Sepolia chain ID
    );
    
    if (providedPasswordHash.toLowerCase() !== gift.passwordHash.toLowerCase()) {
      debugLogger.operation('Password validation failed', { tokenId, giftId, result: 'INVALID' });
      return { valid: false, error: 'Invalid password' };
    }
    
    debugLogger.operation('Password validation success', { tokenId, giftId, result: 'VALID' });
    debugLogger.operation('Claim validation completed', { tokenId, giftId, result: 'VALID' });
    
    return { valid: true, giftId, gift };
    
  } catch (error: any) {
    console.error('Claim validation error:', error);
    debugLogger.operation('Claim validation error', { tokenId, error: error.message });
    return { 
      valid: false, 
      error: parseEscrowError(error)
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidateClaimResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      valid: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Authenticate request using JWT
    const authResult = authenticate(req);
    if (!authResult.success) {
      return res.status(401).json({ 
        success: false,
        valid: false,
        error: authResult.error || 'Unauthorized' 
      });
    }
    
    const authenticatedAddress = authResult.address!;
    console.log('🔐 Validate claim authenticated for address:', authenticatedAddress.slice(0, 10) + '...');
    
    // Validate required environment variables
    if (!ESCROW_CONTRACT_ADDRESS) {
      return res.status(500).json({ 
        success: false,
        valid: false,
        error: 'Server configuration error - escrow contract not configured' 
      });
    }
    
    // Parse and validate request body
    const {
      tokenId,
      password,
      salt,
      claimerAddress
    }: ValidateClaimRequest = req.body;
    
    // Validate required fields
    if (!tokenId || !password || !salt || !claimerAddress) {
      return res.status(400).json({ 
        success: false,
        valid: false,
        error: 'Missing required fields: tokenId, password, salt, claimerAddress' 
      });
    }
    
    // Verify that authenticated address matches the claimerAddress in request
    if (authenticatedAddress.toLowerCase() !== claimerAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        valid: false,
        error: 'Forbidden: You can only validate claims from your authenticated wallet address'
      });
    }
    
    console.log('🔍 VALIDATE CLAIM REQUEST:', {
      tokenId,
      claimerAddress: claimerAddress.slice(0, 10) + '...',
      hasPassword: !!password,
      hasSalt: !!salt,
      saltLength: salt.length
    });
    
    // Validate claim parameters
    const validation = await validateClaimParameters(tokenId, password, salt, claimerAddress);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: true, // API call succeeded
        valid: false,  // But validation failed
        error: validation.error || 'Claim validation failed'
      });
    }
    
    // Prepare response with claim parameters for frontend execution
    const response: ValidateClaimResponse = {
      success: true,
      valid: true,
      giftId: validation.giftId!,
      giftInfo: {
        creator: validation.gift!.creator,
        giftMessage: 'Gift message not available in validation', // Would need to be fetched separately
        expirationTime: Number(validation.gift!.expirationTime),
        status: validation.gift!.status,
        nftContract: validation.gift!.nftContract
      },
      claimParameters: {
        giftId: validation.giftId!,
        password,
        salt,
        gateData: '0x' // Default empty gate data
      },
      contractAddress: ESCROW_CONTRACT_ADDRESS
    };
    
    console.log('✅ CLAIM VALIDATION SUCCESS:', {
      tokenId,
      giftId: validation.giftId,
      claimerAddress: claimerAddress.slice(0, 10) + '...',
      valid: true
    });
    
    return res.status(200).json(response);
    
  } catch (error: any) {
    console.error('💥 VALIDATE CLAIM API ERROR:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      error: error.message || 'Internal server error'
    });
  }
}