/**
 * CLAIM ESCROW API
 * Claim escrow gift with password validation
 * 
 * 🚨 TEMPORARY STATUS: Gasless transactions temporarily disabled
 * Reason: Focusing on robust gas-paid implementation before re-enabling gasless
 * Status: All claims use gas-paid method (deployer covers gas costs)
 * To re-enable: Set gaslessTemporarilyDisabled = false in handler function
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { readContract } from 'thirdweb';
import { 
  generatePasswordHash,
  getEscrowContract,
  prepareClaimGiftCall,
  prepareClaimGiftByIdCall,
  validatePassword,
  validateAddress,
  validateTokenId,
  parseEscrowError,
  isGiftExpired,
  getGiftIdFromTokenId
} from '../../lib/escrowUtils';
import {
  validateTransactionAttempt,
  registerTransactionAttempt,
  markTransactionCompleted,
  markTransactionFailed,
  verifyGaslessTransaction,
  checkRateLimit
} from '../../lib/gaslessValidation';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from '../../lib/escrowABI';
import { verifyJWT, extractTokenFromHeaders } from '../../lib/siweAuth';
import { executeClaimTransaction } from '../../lib/gasPaidTransactions';

// Types
interface ClaimEscrowRequest {
  tokenId: string;
  password: string;
  salt: string;
  claimerAddress: string; // Who is initiating the claim
  gasless?: boolean;
}

interface ClaimEscrowResponse {
  success: boolean;
  transactionHash?: string;
  recipientAddress?: string;
  giftInfo?: {
    creator: string;
    giftMessage?: string;
    expirationTime: number;
  };
  nonce?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
  error?: string;
  gasless?: boolean;
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
    
    console.log('✅ Claim escrow JWT authentication successful:', {
      address: payload.address.slice(0, 10) + '...',
      exp: new Date(payload.exp * 1000).toISOString()
    });
    
    return { 
      success: true, 
      address: payload.address 
    };
    
  } catch (error: any) {
    console.error('❌ Claim escrow JWT authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication verification failed' 
    };
  }
}

// Get gift information from contract
async function getGiftInfo(tokenId: string): Promise<EscrowGift | null> {
  try {
    const escrowContract = getEscrowContract();
    
    // CRITICAL FIX: Map tokenId to giftId first
    const giftId = await getGiftIdFromTokenId(tokenId);
    
    if (giftId === null) {
      console.log('❌ CLAIM: No giftId found for tokenId', tokenId);
      return null;
    }
    
    console.log(`✅ CLAIM: Mapped tokenId ${tokenId} → giftId ${giftId}`);
    
    const giftData = await readContract({
      contract: escrowContract,
      method: "getGift",
      params: [BigInt(giftId)]
    });
    
    // getGift returns: [creator, expirationTime, nftContract, tokenId, passwordHash, status]
    return {
      creator: giftData[0],
      expirationTime: giftData[1],
      nftContract: giftData[2],
      tokenId: giftData[3],
      passwordHash: giftData[4],
      status: giftData[5]
    };
  } catch (error) {
    console.error('Failed to get gift info:', error);
    return null;
  }
}

// Validate claim request against contract state
async function validateClaimRequest(
  tokenId: string,
  password: string,
  salt: string
): Promise<{ valid: boolean; error?: string; gift?: EscrowGift }> {
  try {
    // Get gift information
    const gift = await getGiftInfo(tokenId);
    
    if (!gift) {
      return { valid: false, error: 'Gift not found or invalid token ID' };
    }
    
    // Check if gift is already claimed
    if (gift.status === 1) {
      return { valid: false, error: 'Gift has already been claimed' };
    }
    
    // Check if gift was returned
    if (gift.status === 2) {
      return { valid: false, error: 'Gift has been returned to creator' };
    }
    
    // Check if gift is expired
    if (isGiftExpired(gift.expirationTime)) {
      return { valid: false, error: 'Gift has expired and cannot be claimed' };
    }
    
    // CRITICAL FIX: Get giftId for proper password hashing
    const giftId = await getGiftIdFromTokenId(tokenId);
    if (giftId === null) {
      return { valid: false, error: 'Unable to determine gift ID for password validation' };
    }
    
    // CRITICAL FIX: Generate password hash EXACTLY as contract does
    // Contract: keccak256(abi.encodePacked(password, salt, giftId, address(this), block.chainid))
    const contractAddress = ESCROW_CONTRACT_ADDRESS;
    const chainId = 84532; // Base Sepolia
    const providedPasswordHash = generatePasswordHash(password, salt, giftId, contractAddress, chainId);
    
    console.log('🔐 PASSWORD VALIDATION:', {
      tokenId,
      giftId,
      contractAddress: contractAddress.slice(0, 10) + '...',
      chainId,
      providedHash: providedPasswordHash.slice(0, 10) + '...',
      contractHash: gift.passwordHash.slice(0, 10) + '...',
      matches: providedPasswordHash.toLowerCase() === gift.passwordHash.toLowerCase()
    });
    
    if (providedPasswordHash.toLowerCase() !== gift.passwordHash.toLowerCase()) {
      console.log('❌ PASSWORD MISMATCH: Provided hash does not match contract hash');
      return { valid: false, error: 'Invalid password' };
    }
    
    console.log('✅ PASSWORD VALIDATION: Hash matches - claim authorized');
    
    return { valid: true, gift };
    
  } catch (error: any) {
    console.error('Claim validation error:', error);
    return { 
      valid: false, 
      error: parseEscrowError(error)
    };
  }
}

// Execute gasless claim with anti-double claiming
async function claimEscrowGasless(
  tokenId: string,
  password: string,
  salt: string,
  claimerAddress: string
): Promise<{
  success: boolean;
  transactionHash?: string;
  nonce?: string;
  error?: string;
}> {
  let transactionNonce = '';
  
  try {
    console.log('🚀 CLAIM ESCROW GASLESS: Starting enhanced claim process');
    
    // Step 1: Rate limiting check
    const rateLimit = checkRateLimit(claimerAddress);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    console.log('✅ Claim rate limit check passed. Remaining:', rateLimit.remaining);
    
    // Step 2: Anti-double claiming validation
    const claimConfig = { tokenId, password };
    const validation = await validateTransactionAttempt(claimerAddress, `claim_${tokenId}`, 0, claimConfig);
    
    if (!validation.valid) {
      throw new Error(validation.reason || 'Claim validation failed');
    }
    
    transactionNonce = validation.nonce;
    console.log('✅ Anti-double claiming validation passed. Nonce:', transactionNonce.slice(0, 10) + '...');
    
    // Step 3: Register claim attempt
    await registerTransactionAttempt(claimerAddress, transactionNonce, `claim_${tokenId}`, 0, claimConfig);
    
    // Step 4: Get deployer account (for now, we use deployer for gasless claims)
    // In production, this would use Biconomy smart accounts
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    // Step 5: Map tokenId to giftId for correct claim
    const giftId = await getGiftIdFromTokenId(tokenId);
    if (giftId === null) {
      throw new Error('Gift not found - this NFT is not registered in escrow');
    }
    
    console.log(`✅ CLAIM: Using giftId ${giftId} for tokenId ${tokenId}`);
    
    // Step 6: Prepare claim transaction using correct giftId
    const claimTransaction = prepareClaimGiftByIdCall(giftId, password, salt);
    
    console.log('📝 Executing claim transaction...');
    const result = await sendTransaction({
      transaction: claimTransaction,
      account: deployerAccount
    });
    
    const receipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: result.transactionHash
    });
    console.log('✅ Claim successful, transaction hash:', result.transactionHash);
    
    // Step 6: Verify transaction on-chain
    const verification = await verifyGaslessTransaction(
      result.transactionHash,
      claimerAddress,
      tokenId
    );
    
    if (!verification.verified) {
      throw new Error(`Transaction verification failed: ${verification.error}`);
    }
    
    // Step 7: Mark transaction as completed
    await markTransactionCompleted(transactionNonce, result.transactionHash);
    
    console.log('🎉 Enhanced gasless claim completed with verification');
    
    return {
      success: true,
      transactionHash: result.transactionHash,
      nonce: transactionNonce
    };
    
  } catch (error: any) {
    console.error('❌ Enhanced gasless claim failed:', error);
    
    // Mark transaction as failed if nonce was generated
    if (transactionNonce) {
      await markTransactionFailed(transactionNonce, error.message);
    }
    
    return {
      success: false,
      error: parseEscrowError(error),
      nonce: transactionNonce
    };
  }
}

// Execute gas-paid claim using unified gas-paid system
async function claimEscrowGasPaid(
  tokenId: string,
  password: string,
  salt: string,
  claimerAddress: string
): Promise<{
  success: boolean;
  transactionHash?: string;
  nonce?: string;
  error?: string;
}> {
  try {
    console.log('💰 CLAIM ESCROW GAS-PAID: Starting unified gas-paid claim process');
    
    // Step 1: Map tokenId to giftId for correct claim
    const giftId = await getGiftIdFromTokenId(tokenId);
    if (giftId === null) {
      throw new Error('Gift not found - this NFT is not registered in escrow');
    }
    
    console.log(`✅ CLAIM GAS-PAID: Using giftId ${giftId} for tokenId ${tokenId}`);
    
    // Step 2: Prepare claim transaction using correct giftId
    const claimTransaction = prepareClaimGiftByIdCall(giftId, password, salt);
    
    // Step 3: Execute using unified gas-paid system
    const result = await executeClaimTransaction(
      claimTransaction,
      claimerAddress,
      tokenId,
      password
    );
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Unified claim transaction failed',
        nonce: result.nonce
      };
    }
    
    console.log('🎉 Unified gas-paid claim completed successfully');
    
    return {
      success: true,
      transactionHash: result.transactionHash!,
      nonce: result.nonce
    };
    
  } catch (error: any) {
    console.error('❌ Unified gas-paid claim failed:', error);
    
    return {
      success: false,
      error: parseEscrowError(error)
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClaimEscrowResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Authenticate request using JWT
    const authResult = authenticate(req);
    if (!authResult.success) {
      return res.status(401).json({ 
        success: false, 
        error: authResult.error || 'Unauthorized' 
      });
    }
    
    const authenticatedAddress = authResult.address!;
    console.log('🔐 Claim escrow authenticated for address:', authenticatedAddress.slice(0, 10) + '...');
    
    // Validate required environment variables
    if (!process.env.PRIVATE_KEY_DEPLOY || !ESCROW_CONTRACT_ADDRESS) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }
    
    // Parse and validate request body
    const {
      tokenId,
      password,
      salt,
      claimerAddress,
      gasless = false // 🚨 TEMPORARILY DISABLED: Gasless flow disabled to focus on robust gas-paid implementation
    }: ClaimEscrowRequest = req.body;
    
    // 🚨 TEMPORARY GASLESS DISABLE: Force gas-paid for system robustness
    const gaslessTemporarilyDisabled = true;
    const finalGasless = gaslessTemporarilyDisabled ? false : gasless;
    
    if (gasless && gaslessTemporarilyDisabled) {
      console.log('⚠️ GASLESS TEMPORARILY DISABLED: Redirecting to robust gas-paid claiming');
      console.log('📋 Reason: Focusing on gas-paid robustness before re-enabling gasless features');
    }
    
    // Basic validation
    if (!tokenId || !password || !salt || !claimerAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Verify that authenticated address matches the claimer address
    if (authenticatedAddress.toLowerCase() !== claimerAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only claim gifts from your authenticated wallet address'
      });
    }
    
    const tokenIdValidation = validateTokenId(tokenId);
    if (!tokenIdValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: tokenIdValidation.message 
      });
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: passwordValidation.message 
      });
    }
    
    
    console.log('🎁 CLAIM ESCROW REQUEST:', {
      tokenId,
      gasless,
      claimerAddress: claimerAddress.slice(0, 10) + '...'
    });
    
    // Validate claim request against contract
    const validation = await validateClaimRequest(tokenId, password, salt);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    const gift = validation.gift!;
    
    // Attempt claim based on finalGasless (which respects temporary disable)
    let result;
    
    if (finalGasless && !gaslessTemporarilyDisabled) {
      console.log('🚀 Attempting enhanced gasless claim...');
      result = await claimEscrowGasless(tokenId, password, salt, claimerAddress);
      
      // If gasless fails, fallback to gas-paid
      if (!result.success) {
        console.log('⚠️ Gasless failed, attempting gas-paid fallback...');
        result = await claimEscrowGasPaid(tokenId, password, salt, claimerAddress);
        result.gasless = false;
      } else {
        result.gasless = true;
      }
    } else {
      // Either gasless was not requested OR gasless is temporarily disabled
      const reason = gaslessTemporarilyDisabled ? 
        'GASLESS TEMPORARILY DISABLED for system robustness - using gas-paid' : 
        'Gas-paid claim requested by user';
      console.log(`💰 ${reason}`);
      
      result = await claimEscrowGasPaid(tokenId, password, salt, claimerAddress);
      result.gasless = false;
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Claim failed'
      });
    }
    
    // Final recipient is always the claimer (no claimGiftFor in contract)
    const finalRecipient = claimerAddress;
    
    // Get final rate limit status
    const finalRateLimit = checkRateLimit(claimerAddress);
    
    console.log('🎉 ENHANCED CLAIM SUCCESS:', {
      tokenId,
      gasless: result.gasless,
      transactionHash: result.transactionHash,
      recipientAddress: finalRecipient,
      nonce: result.nonce?.slice(0, 10) + '...',
      rateLimit: finalRateLimit
    });
    
    const responseData: any = {
      success: true,
      transactionHash: result.transactionHash,
      recipientAddress: finalRecipient,
      giftInfo: {
        creator: gift.creator,
        expirationTime: Number(gift.expirationTime)
      },
      nonce: result.nonce,
      rateLimit: {
        remaining: finalRateLimit.remaining,
        resetTime: finalRateLimit.resetTime
      },
      gasless: result.gasless
    };
    
    // Add gasless status message if user requested gasless but it was disabled
    if (gasless && gaslessTemporarilyDisabled && !result.gasless) {
      responseData.gaslessDisabledMessage = "⚠️ Gasless transactions are temporarily disabled to ensure system robustness. Your claim was processed using gas-paid method (deployer covers gas costs).";
      responseData.gaslessStatus = "temporarily_disabled";
    }
    
    return res.status(200).json(responseData);
    
  } catch (error: any) {
    console.error('💥 CLAIM ESCROW API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: parseEscrowError(error)
    });
  }
}