/**
 * RETURN EXPIRED API
 * Manual return of expired gifts to their creators
 * Authenticated endpoint for gift creators or admin
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { sendTransaction, waitForReceipt } from 'thirdweb/transaction';
import { 
  prepareReturnExpiredGiftCall,
  getEscrowContract,
  getGiftStatus,
  isGiftExpired,
  parseEscrowError,
  validateTokenId,
  validateAddress
} from '../../lib/escrowUtils';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from '../../lib/escrowABI';

// Types
interface ReturnExpiredRequest {
  tokenId: string;
  creatorAddress: string; // Must match gift creator
  gasless?: boolean;
}

interface ReturnExpiredResponse {
  success: boolean;
  transactionHash?: string;
  giftInfo?: {
    tokenId: string;
    creator: string;
    wasExpired: boolean;
    returnedAt: number;
  };
  error?: string;
  gasless?: boolean;
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Authentication middleware
function authenticate(req: NextApiRequest): boolean {
  const apiToken = req.headers.authorization?.replace('Bearer ', '');
  return apiToken === process.env.API_ACCESS_TOKEN;
}

// Get gift information and validate return eligibility
async function validateReturnRequest(
  tokenId: string,
  creatorAddress: string
): Promise<{ valid: boolean; error?: string; gift?: EscrowGift }> {
  try {
    const escrowContract = getEscrowContract();
    
    // Get gift information
    const giftData = await readContract({
      contract: escrowContract,
      method: "getGift",
      params: [BigInt(tokenId)]
    });
    
    // getGift returns: [creator, expirationTime, nftContract, tokenId, passwordHash, status]
    const gift: EscrowGift = {
      creator: giftData[0],
      expirationTime: giftData[1],
      nftContract: giftData[2],
      tokenId: giftData[3],
      passwordHash: giftData[4],
      status: giftData[5]
    };
    
    // Validate creator
    if (gift.creator.toLowerCase() !== creatorAddress.toLowerCase()) {
      return { 
        valid: false, 
        error: 'Only the gift creator can return their gifts' 
      };
    }
    
    // Check if gift is already claimed
    if (gift.status === 1) {
      return { 
        valid: false, 
        error: 'Gift has already been claimed and cannot be returned' 
      };
    }
    
    // Check if gift is already returned
    if (gift.status === 2) {
      return { 
        valid: false, 
        error: 'Gift has already been returned' 
      };
    }
    
    // Check if gift is expired
    if (!isGiftExpired(gift.expirationTime)) {
      return { 
        valid: false, 
        error: 'Gift has not expired yet and cannot be returned' 
      };
    }
    
    return { valid: true, gift };
    
  } catch (error: any) {
    console.error('Return validation error:', error);
    
    if (error.message?.includes('Gift not found')) {
      return { 
        valid: false, 
        error: 'Gift not found or invalid token ID' 
      };
    }
    
    return { 
      valid: false, 
      error: parseEscrowError(error)
    };
  }
}

// Execute gasless return
async function returnExpiredGiftGasless(
  tokenId: string
): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    console.log('🔄 RETURN EXPIRED GASLESS: Starting return process for token', tokenId);
    
    // Get deployer account for gasless transactions
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    // Prepare return transaction
    const returnTransaction = prepareReturnExpiredGiftCall(tokenId);
    
    console.log('📝 Executing return transaction...');
    const result = await sendTransaction({
      transaction: returnTransaction,
      account: deployerAccount
    });
    
    const receipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: result.transactionHash
    });
    console.log('✅ Return successful, transaction hash:', result.transactionHash);
    
    return {
      success: true,
      transactionHash: result.transactionHash
    };
    
  } catch (error: any) {
    console.error('❌ Gasless return failed:', error);
    return {
      success: false,
      error: parseEscrowError(error)
    };
  }
}

// Execute gas-paid return - Real implementation without Biconomy
async function returnExpiredGiftGasPaid(
  tokenId: string
): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    console.log('💰 RETURN EXPIRED GAS-PAID: Starting gas-paid return process (deployer pays)');
    
    // Get deployer account for gas-paid transactions
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    console.log('🔑 Using deployer account for gas-paid return:', deployerAccount.address.slice(0, 10) + '...');
    
    // Prepare return transaction (regular transaction with gas)
    const returnTransaction = prepareReturnExpiredGiftCall(tokenId);
    
    console.log('📝 Executing gas-paid return transaction...');
    const result = await sendTransaction({
      transaction: returnTransaction,
      account: deployerAccount
    });
    
    const receipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: result.transactionHash
    });
    
    // CRITICAL: Verify transaction succeeded
    if (receipt.status !== 'success') {
      throw new Error(`Return transaction failed with status: ${receipt.status}`);
    }
    
    console.log('✅ Gas-paid return successful, transaction hash:', result.transactionHash);
    
    return {
      success: true,
      transactionHash: result.transactionHash
    };
    
  } catch (error: any) {
    console.error('❌ Gas-paid return failed:', error);
    return {
      success: false,
      error: parseEscrowError(error)
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReturnExpiredResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Authenticate request
    if (!authenticate(req)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
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
      creatorAddress,
      gasless = true
    }: ReturnExpiredRequest = req.body;
    
    // Basic validation
    if (!tokenId || !creatorAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: tokenId, creatorAddress' 
      });
    }
    
    const tokenIdValidation = validateTokenId(tokenId);
    if (!tokenIdValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: tokenIdValidation.message 
      });
    }
    
    const addressValidation = validateAddress(creatorAddress);
    if (!addressValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid creator address' 
      });
    }
    
    console.log('🔄 RETURN EXPIRED REQUEST:', {
      tokenId,
      creatorAddress: creatorAddress.slice(0, 10) + '...',
      gasless
    });
    
    // Validate return request
    const validation = await validateReturnRequest(tokenId, creatorAddress);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    const gift = validation.gift!;
    
    // Attempt return based on gasless preference
    let result;
    
    if (gasless) {
      console.log('🚀 Attempting gasless return...');
      result = await returnExpiredGiftGasless(tokenId);
      
      // If gasless fails, fallback to gas-paid
      if (!result.success) {
        console.log('⚠️ Gasless failed, attempting gas-paid fallback...');
        result = await returnExpiredGiftGasPaid(tokenId);
        result.gasless = false;
      } else {
        result.gasless = true;
      }
    } else {
      console.log('💰 Attempting gas-paid return...');
      result = await returnExpiredGiftGasPaid(tokenId);
      result.gasless = false;
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Return failed'
      });
    }
    
    console.log('🎉 RETURN SUCCESS:', {
      tokenId,
      creator: gift.creator,
      gasless: result.gasless,
      transactionHash: result.transactionHash
    });
    
    return res.status(200).json({
      success: true,
      transactionHash: result.transactionHash,
      giftInfo: {
        tokenId,
        creator: gift.creator,
        wasExpired: true,
        returnedAt: Math.floor(Date.now() / 1000)
      },
      gasless: result.gasless
    });
    
  } catch (error: any) {
    console.error('💥 RETURN EXPIRED API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: parseEscrowError(error)
    });
  }
}