/**
 * MINT ESCROW API
 * Mint NFT + Create Escrow Gift in one atomic operation
 * Supports gasless transactions with anti-double minting
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract, prepareContractCall } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { sendTransaction, waitForReceipt } from 'thirdweb/transaction';
import { 
  generatePasswordHash,
  generateSalt,
  getEscrowContract,
  prepareCreateGiftCall,
  validatePassword,
  validateGiftMessage,
  sanitizeGiftMessage,
  TIMEFRAME_OPTIONS
} from '../../lib/escrowUtils';
import {
  validateTransactionAttempt,
  registerTransactionAttempt,
  markTransactionCompleted,
  markTransactionFailed,
  verifyGaslessTransaction,
  checkRateLimit
} from '../../lib/gaslessValidation';
import { Redis } from '@upstash/redis';
import { ESCROW_CONTRACT_ADDRESS } from '../../lib/escrowABI';
import { verifyJWT, extractTokenFromHeaders } from '../../lib/siweAuth';
import { createBiconomySmartAccount, sendGaslessTransaction, validateBiconomyConfig } from '../../lib/biconomy';

// Types
interface MintEscrowRequest {
  metadataUri: string;
  recipientAddress?: string; // If not provided, uses neutral custody
  password: string;
  timeframeDays: keyof typeof TIMEFRAME_OPTIONS;
  giftMessage: string;
  creatorAddress: string; // For tracking and returns
  gasless?: boolean;
}

interface MintEscrowResponse {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  escrowTransactionHash?: string;
  giftLink?: string;
  salt?: string;
  passwordHash?: string;
  expirationTime?: number;
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

// Initialize Redis client for salt persistence
let redis: any = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      enableAutoPipelining: false,
      retry: false,
    });
    console.log('✅ Redis initialized for salt persistence');
  } else {
    console.warn('⚠️ Redis not configured for salt persistence');
  }
} catch (error) {
  console.error('❌ Redis initialization failed:', error);
}

// Store salt for later retrieval during claim
async function storeSalt(tokenId: string, salt: string): Promise<void> {
  if (!redis) {
    console.warn('⚠️ Cannot store salt: Redis not available');
    return;
  }
  
  try {
    // Store salt with expiration (90 days max)
    const key = `escrow:salt:${tokenId}`;
    await redis.setex(key, 90 * 24 * 60 * 60, salt); // 90 days TTL
    console.log('💾 Salt stored for token:', tokenId);
  } catch (error) {
    console.error('❌ Failed to store salt:', error);
  }
}

// Retrieve salt for claim process
async function getSalt(tokenId: string): Promise<string | null> {
  if (!redis) {
    console.warn('⚠️ Cannot retrieve salt: Redis not available');
    return null;
  }
  
  try {
    const key = `escrow:salt:${tokenId}`;
    const salt = await redis.get(key);
    console.log('🔍 Salt retrieved for token:', tokenId, salt ? 'Found' : 'Not found');
    return salt;
  } catch (error) {
    console.error('❌ Failed to retrieve salt:', error);
    return null;
  }
}

// JWT Authentication middleware
function authenticate(req: NextApiRequest): { success: boolean; address?: string; error?: string } {
  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);
    
    if (!token) {
      console.warn('⚠️ No JWT token provided in Authorization header');
      return { 
        success: false, 
        error: 'Authentication required. Please provide a valid JWT token.' 
      };
    }
    
    // Verify JWT token
    const payload = verifyJWT(token);
    if (!payload) {
      console.warn('⚠️ Invalid or expired JWT token');
      return { 
        success: false, 
        error: 'Invalid or expired authentication token. Please sign in again.' 
      };
    }
    
    console.log('✅ JWT authentication successful:', {
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

// Enhanced gasless minting with anti-double minting
async function mintNFTEscrowGasless(
  to: string,
  tokenURI: string,
  password: string,
  timeframeDays: number,
  giftMessage: string,
  creatorAddress: string
): Promise<{
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  escrowTransactionHash?: string;
  salt?: string;
  passwordHash?: string;
  nonce?: string;
  error?: string;
  details?: string;
}> {
  let transactionNonce = '';
  
  try {
    console.log('🚀 MINT ESCROW GASLESS: Starting atomic operation with anti-double minting');
    
    // Step 1: Rate limiting check
    const rateLimit = checkRateLimit(creatorAddress);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    console.log('✅ Rate limit check passed. Remaining: ', rateLimit.remaining);
    
    // Step 2: Anti-double minting validation
    const escrowConfig = { password, timeframe: timeframeDays, giftMessage };
    const validation = await validateTransactionAttempt(creatorAddress, tokenURI, 0, escrowConfig);
    
    if (!validation.valid) {
      throw new Error(validation.reason || 'Transaction validation failed');
    }
    
    transactionNonce = validation.nonce;
    console.log('✅ Anti-double minting validation passed. Nonce:', transactionNonce.slice(0, 10) + '...');
    
    // Step 3: Register transaction attempt
    await registerTransactionAttempt(creatorAddress, transactionNonce, tokenURI, 0, escrowConfig);
    
    // Step 4: Generate salt and password hash
    const salt = generateSalt();
    const passwordHash = generatePasswordHash(password, salt);
    
    console.log('🔐 Password hash generated:', passwordHash.slice(0, 10) + '...');
    console.log('🧂 Salt generated:', salt.slice(0, 10) + '...');
    
    // Step 5: Validate Biconomy configuration for gasless
    if (!validateBiconomyConfig()) {
      throw new Error('Biconomy gasless configuration is incomplete. Check environment variables.');
    }
    
    // Step 6: Create Biconomy smart account for true gasless transactions
    console.log('🔧 Creating Biconomy smart account for gasless minting...');
    const smartAccount = await createBiconomySmartAccount(process.env.PRIVATE_KEY_DEPLOY!);
    
    // Step 7: Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    });
    
    // Step 8: Prepare mint transaction for gasless execution
    console.log(`🎨 Preparing gasless mint NFT to: ${to}...`);
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, tokenURI] // ← FIX: Use the actual 'to' parameter
    });
    
    // Step 9: Execute gasless mint transaction through Biconomy
    console.log('🚀 Executing gasless mint transaction...');
    const mintResult = await sendGaslessTransaction(smartAccount, mintTransaction);
    
    console.log('✅ NFT minted, transaction hash:', mintResult.transactionHash);
    
    // Step 8: Extract token ID from mint transaction
    const mintReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: mintResult.transactionHash as `0x${string}`
    });
    
    // CRITICAL: Verify transaction succeeded
    if (mintReceipt.status !== 'success') {
      throw new Error(`Mint transaction failed with status: ${mintReceipt.status}`);
    }
    
    console.log('✅ Mint transaction confirmed successful');
    let tokenId: string | null = null;
    
    // Parse Transfer event to get exact token ID from mint transaction
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    // Try to parse Transfer events using ethers for precise tokenId extraction
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (receipt) {
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase() &&
            log.topics[0] === transferEventSignature &&
            log.topics.length >= 4
          ) {
            // Third topic (index 3) contains the tokenId for Transfer(from, to, tokenId)
            tokenId = BigInt(log.topics[3]).toString();
            console.log('🎯 Token ID extracted from Transfer event:', tokenId);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse Transfer events, trying totalSupply fallback:', error);
    }
    
    // Fallback to totalSupply if Transfer event parsing failed
    if (!tokenId) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const nftContractABI = ["function totalSupply() public view returns (uint256)"];
        const nftContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          nftContractABI,
          provider
        );
        
        const totalSupply = await nftContract.totalSupply();
        tokenId = totalSupply.toString();
        console.log('🎯 Token ID extracted from totalSupply (fallback):', tokenId);
      } catch (error) {
        console.error('Both Transfer event parsing and totalSupply failed:', error);
        throw new Error('Failed to extract token ID from mint transaction');
      }
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from mint transaction');
    }
    
    // Initialize escrow transaction hash variable
    let escrowTransactionHash: string | undefined;
    
    // Check if this is an escrow mint (password provided) or direct mint (no password)
    const isEscrowMint = !!password;
    
    if (isEscrowMint) {
      // ESCROW MINT: NFT is with creator, need to transfer to escrow via createGift
      console.log('🔒 ESCROW MINT: NFT minted to creator, creating escrow gift (will transfer to escrow)...');
      
      // Create the escrow gift (this will transfer NFT from creator to escrow contract)
      console.log('🔍 DEBUG: Using escrow contract address:', ESCROW_CONTRACT_ADDRESS);
      console.log('🔍 DEBUG: Environment escrow address:', process.env.ESCROW_CONTRACT_ADDRESS);
      console.log('🔍 DEBUG: Public environment escrow address:', process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS);
      console.log('🔍 DEBUG: Token ID extracted from mint:', tokenId);
      console.log('🔍 DEBUG: Token ID type:', typeof tokenId);
      console.log('🔍 DEBUG: NFT contract address:', process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
      
      const createGiftTransaction = prepareCreateGiftCall(
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        password,
        salt,
        timeframeDays,
        giftMessage
      );
      
      console.log('🚀 Executing gasless escrow gift creation (transfers NFT to escrow)...');
      const escrowResult = await sendGaslessTransaction(smartAccount, createGiftTransaction);
      
      const escrowReceipt = await waitForReceipt({
        client,
        chain: baseSepolia,
        transactionHash: escrowResult.transactionHash as `0x${string}`
      });
      
      // CRITICAL: Verify escrow creation succeeded
      if (escrowReceipt.status !== 'success') {
        throw new Error(`Escrow gift creation failed with status: ${escrowReceipt.status}`);
      }
      
      console.log('✅ Escrow gift created successfully, NFT transferred to escrow contract');
      
      // Step 11: Verify NFT is now correctly owned by escrow contract
      console.log('🔍 Verifying NFT was transferred to escrow contract...');
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const nftContractABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
      const nftContractCheck = new ethers.Contract(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        nftContractABI,
        provider
      );
      
      const actualOwner = await nftContractCheck.ownerOf(tokenId);
      console.log('🔍 Actual NFT owner after escrow creation:', actualOwner);
      console.log('🔍 Expected escrow address:', ESCROW_CONTRACT_ADDRESS);
      
      if (actualOwner.toLowerCase() !== ESCROW_CONTRACT_ADDRESS?.toLowerCase()) {
        throw new Error(`CRITICAL: NFT was not transferred to escrow contract. Expected: ${ESCROW_CONTRACT_ADDRESS}, Got: ${actualOwner}`);
      }
      
      console.log('✅ VERIFIED: NFT successfully transferred to escrow contract');
      
      // Set escrow transaction hash for response
      escrowTransactionHash = escrowResult.transactionHash;
      
    } else {
      // DIRECT MINT: NFT was minted directly to creator, no escrow needed
      console.log('🎯 DIRECT MINT: NFT minted directly to creator, no escrow transfer needed');
      escrowTransactionHash = undefined; // No escrow transaction for direct mints
    }
    
    // Step 12: Verify mint transaction on-chain
    const mintVerification = await verifyGaslessTransaction(
      mintResult.transactionHash,
      creatorAddress,
      tokenId
    );
    
    if (!mintVerification.verified) {
      throw new Error(`Mint transaction verification failed: ${mintVerification.error}`);
    }
    
    // Step 13: Verify escrow transaction if there was one
    if (escrowTransactionHash) {
      const escrowVerification = await verifyGaslessTransaction(
        escrowTransactionHash,
        creatorAddress,
        tokenId
      );
      
      if (!escrowVerification.verified) {
        console.warn('⚠️ Escrow verification failed but mint succeeded:', escrowVerification.error);
      }
    }
    
    // Step 14: Store salt for later claim process
    await storeSalt(tokenId, salt);
    
    // Step 15: Mark transaction as completed
    await markTransactionCompleted(transactionNonce, escrowTransactionHash || mintResult.transactionHash);
    
    console.log('🎉 Enhanced gasless mint completed with verification');
    console.log('📊 Final result:', {
      tokenId,
      mintTxHash: mintResult.transactionHash,
      escrowTxHash: escrowTransactionHash,
      isEscrow: !!escrowTransactionHash,
      nftOwner: escrowTransactionHash ? 'ESCROW_CONTRACT' : 'CREATOR_WALLET'
    });
    
    return {
      success: true,
      tokenId,
      transactionHash: mintResult.transactionHash,
      escrowTransactionHash: escrowTransactionHash,
      salt,
      passwordHash,
      nonce: transactionNonce
    };
    
  } catch (error: any) {
    console.error('❌ Enhanced gasless escrow mint failed:', error);
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      step: 'mintNFTEscrowGasless'
    });
    
    // Mark transaction as failed if nonce was generated
    if (transactionNonce) {
      await markTransactionFailed(transactionNonce, error.message);
    }
    
    return {
      success: false,
      error: `Gasless escrow mint failed: ${error.message || 'Unknown error'}`,
      nonce: transactionNonce,
      details: error.stack?.substring(0, 500) // Truncated stack trace for debugging
    };
  }
}

// Direct mint (skip escrow) - mints directly to creator wallet
async function mintNFTDirectly(
  to: string,
  tokenURI: string,
  giftMessage: string,
  creatorAddress: string
): Promise<{
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  message?: string;
  error?: string;
}> {
  try {
    console.log('🎯 DIRECT MINT: Starting direct mint to creator wallet (skip escrow)');
    console.log('🎯 Target address:', to);
    
    // Validate Biconomy configuration for gasless
    if (!validateBiconomyConfig()) {
      throw new Error('Biconomy gasless configuration is incomplete. Check environment variables.');
    }
    
    // Create Biconomy smart account for gasless direct minting
    console.log('🔧 Creating Biconomy smart account for gasless direct minting...');
    const smartAccount = await createBiconomySmartAccount(process.env.PRIVATE_KEY_DEPLOY!);
    
    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    });
    
    // Prepare mint transaction for gasless execution
    console.log(`🎨 Preparing gasless direct mint NFT to creator: ${to}...`);
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, tokenURI]
    });
    
    // Execute gasless direct mint transaction
    console.log('🚀 Executing gasless direct mint transaction...');
    const mintResult = await sendGaslessTransaction(smartAccount, mintTransaction);
    
    console.log('✅ NFT minted directly, transaction hash:', mintResult.transactionHash);
    
    // Wait for transaction confirmation
    const mintReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: mintResult.transactionHash as `0x${string}`
    });
    
    // Verify transaction succeeded
    if (mintReceipt.status !== 'success') {
      throw new Error(`Direct mint transaction failed with status: ${mintReceipt.status}`);
    }
    
    console.log('✅ Direct mint transaction confirmed successful');
    
    // Extract token ID using same logic as escrow mint
    let tokenId: string | null = null;
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (receipt) {
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase() &&
            log.topics[0] === transferEventSignature &&
            log.topics.length >= 4
          ) {
            tokenId = BigInt(log.topics[3]).toString();
            console.log('🎯 Token ID extracted from Transfer event (direct):', tokenId);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse Transfer events for direct mint, trying totalSupply fallback:', error);
    }
    
    // Fallback to totalSupply if needed
    if (!tokenId) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const nftContractABI = ["function totalSupply() public view returns (uint256)"];
        const nftContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          nftContractABI,
          provider
        );
        
        const totalSupply = await nftContract.totalSupply();
        tokenId = totalSupply.toString();
        console.log('🎯 Token ID extracted from totalSupply (direct fallback):', tokenId);
      } catch (error) {
        console.error('Both Transfer event parsing and totalSupply failed for direct mint:', error);
        throw new Error('Failed to extract token ID from direct mint transaction');
      }
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from direct mint transaction');
    }
    
    console.log('🎉 Direct mint completed successfully - NFT delivered to creator wallet');
    
    return {
      success: true,
      tokenId,
      transactionHash: mintResult.transactionHash,
      message: `NFT minted directly to your wallet (skip escrow). Token ID: ${tokenId}`
    };
    
  } catch (error: any) {
    console.error('❌ Direct mint failed:', error);
    return {
      success: false,
      error: error.message || 'Direct mint failed'
    };
  }
}

// Gas-paid fallback for escrow minting - Real implementation without Biconomy
async function mintNFTEscrowGasPaid(
  to: string,
  tokenURI: string,
  password: string,
  timeframeDays: number,
  giftMessage: string,
  creatorAddress: string
): Promise<{
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  escrowTransactionHash?: string;
  salt?: string;
  passwordHash?: string;
  error?: string;
  details?: string;
}> {
  let transactionNonce = '';
  
  try {
    console.log('💰 MINT ESCROW GAS-PAID: Starting atomic operation (deployer pays gas)');
    
    // Step 1: Rate limiting check
    const rateLimit = checkRateLimit(creatorAddress);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    console.log('✅ Rate limit check passed. Remaining: ', rateLimit.remaining);
    
    // Step 2: Anti-double minting validation
    const escrowConfig = { password, timeframe: timeframeDays, giftMessage };
    const validation = await validateTransactionAttempt(creatorAddress, tokenURI, 0, escrowConfig);
    
    if (!validation.valid) {
      throw new Error(validation.reason || 'Transaction validation failed');
    }
    
    transactionNonce = validation.nonce;
    console.log('✅ Anti-double minting validation passed. Nonce:', transactionNonce.slice(0, 10) + '...');
    
    // Step 3: Register transaction attempt
    await registerTransactionAttempt(creatorAddress, transactionNonce, tokenURI, 0, escrowConfig);
    
    // Step 4: Generate salt and password hash
    const salt = generateSalt();
    const passwordHash = generatePasswordHash(password, salt);
    
    console.log('🔐 Password hash generated:', passwordHash.slice(0, 10) + '...');
    console.log('🧂 Salt generated:', salt.slice(0, 10) + '...');
    
    // Step 5: Create deployer account for gas-paid transactions
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    console.log('🔑 Using deployer account for gas-paid transactions:', deployerAccount.address.slice(0, 10) + '...');
    
    // Step 6: Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    });
    
    // Step 7: Prepare mint transaction (regular transaction with gas)
    console.log(`🎨 Preparing gas-paid mint NFT to: ${to}...`);
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, tokenURI]
    });
    
    // Step 8: Execute gas-paid mint transaction using deployer account
    console.log('🚀 Executing gas-paid mint transaction (deployer pays)...');
    const mintResult = await sendTransaction({
      transaction: mintTransaction,
      account: deployerAccount
    });
    
    console.log('✅ NFT minted with gas-paid transaction:', mintResult.transactionHash);
    
    // Step 9: Wait for mint confirmation
    const mintReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: mintResult.transactionHash
    });
    
    // CRITICAL: Verify transaction succeeded
    if (mintReceipt.status !== 'success') {
      throw new Error(`Mint transaction failed with status: ${mintReceipt.status}`);
    }
    
    console.log('✅ Mint transaction confirmed successful');
    let tokenId: string | null = null;
    
    // Parse Transfer event to get exact token ID from mint transaction
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    // Try to parse Transfer events using ethers for precise tokenId extraction
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (receipt) {
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase() &&
            log.topics[0] === transferEventSignature &&
            log.topics.length >= 4
          ) {
            // Third topic (index 3) contains the tokenId for Transfer(from, to, tokenId)
            tokenId = BigInt(log.topics[3]).toString();
            console.log('🎯 Token ID extracted from Transfer event:', tokenId);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse Transfer events, trying totalSupply fallback:', error);
    }
    
    // Fallback to totalSupply if Transfer event parsing failed
    if (!tokenId) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const nftContractABI = ["function totalSupply() public view returns (uint256)"];
        const nftContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          nftContractABI,
          provider
        );
        
        const totalSupply = await nftContract.totalSupply();
        tokenId = totalSupply.toString();
        console.log('🎯 Token ID extracted from totalSupply (fallback):', tokenId);
      } catch (error) {
        console.error('Both Transfer event parsing and totalSupply failed:', error);
        throw new Error('Failed to extract token ID from mint transaction');
      }
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from mint transaction');
    }
    
    // Initialize escrow transaction hash variable
    let escrowTransactionHash: string | undefined;
    
    // Check if this is an escrow mint (password provided) or direct mint (no password)
    const isEscrowMint = !!password;
    
    if (isEscrowMint) {
      // ESCROW MINT: NFT is with creator, need to transfer to escrow via createGift
      console.log('🔒 ESCROW MINT: NFT minted to creator, creating escrow gift (will transfer to escrow)...');
      
      // Prepare create gift transaction (this will transfer NFT from creator to escrow contract)
      const createGiftTransaction = prepareCreateGiftCall(
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        password,
        salt,
        timeframeDays,
        giftMessage
      );
      
      console.log('🚀 Executing gas-paid escrow gift creation (transfers NFT to escrow)...');
      const escrowResult = await sendTransaction({
        transaction: createGiftTransaction,
        account: deployerAccount
      });
      
      const escrowReceipt = await waitForReceipt({
        client,
        chain: baseSepolia,
        transactionHash: escrowResult.transactionHash
      });
      
      // CRITICAL: Verify escrow creation succeeded
      if (escrowReceipt.status !== 'success') {
        throw new Error(`Escrow gift creation failed with status: ${escrowReceipt.status}`);
      }
      
      console.log('✅ Escrow gift created successfully with gas-paid transaction');
      
      // Step: Verify NFT was transferred to escrow contract
      console.log('🔍 Verifying NFT was transferred to escrow contract...');
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const nftContractABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
      const nftContractCheck = new ethers.Contract(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        nftContractABI,
        provider
      );
      
      const actualOwner = await nftContractCheck.ownerOf(tokenId);
      console.log('🔍 Actual NFT owner after escrow creation:', actualOwner);
      console.log('🔍 Expected escrow address:', ESCROW_CONTRACT_ADDRESS);
      
      if (actualOwner.toLowerCase() !== ESCROW_CONTRACT_ADDRESS?.toLowerCase()) {
        throw new Error(`CRITICAL: NFT was not transferred to escrow contract. Expected: ${ESCROW_CONTRACT_ADDRESS}, Got: ${actualOwner}`);
      }
      
      console.log('✅ VERIFIED: NFT successfully transferred to escrow contract');
      
      // Set escrow transaction hash for response
      escrowTransactionHash = escrowResult.transactionHash;
      
    } else {
      // DIRECT MINT: NFT was minted directly to creator, no escrow needed
      console.log('🎯 DIRECT MINT: NFT minted directly to creator, no escrow transfer needed');
      escrowTransactionHash = undefined;
    }
    
    // Step: Store salt for later claim process
    await storeSalt(tokenId, salt);
    
    // Step: Mark transaction as completed
    await markTransactionCompleted(transactionNonce, escrowTransactionHash || mintResult.transactionHash);
    
    console.log('🎉 Gas-paid escrow mint completed successfully');
    console.log('📊 Final result:', {
      tokenId,
      mintTxHash: mintResult.transactionHash,
      escrowTxHash: escrowTransactionHash,
      isEscrow: !!escrowTransactionHash,
      nftOwner: escrowTransactionHash ? 'ESCROW_CONTRACT' : 'CREATOR_WALLET'
    });
    
    return {
      success: true,
      tokenId,
      transactionHash: mintResult.transactionHash,
      escrowTransactionHash: escrowTransactionHash,
      salt,
      passwordHash
    };
    
  } catch (error: any) {
    console.error('❌ Gas-paid escrow mint failed:', error);
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      step: 'mintNFTEscrowGasPaid'
    });
    
    // Mark transaction as failed if nonce was generated
    if (transactionNonce) {
      await markTransactionFailed(transactionNonce, error.message);
    }
    
    return {
      success: false,
      error: `Gas-paid escrow mint failed: ${error.message || 'Unknown error'}`,
      details: error.stack?.substring(0, 500)
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MintEscrowResponse>
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
    console.log('🔐 Request authenticated for address:', authenticatedAddress.slice(0, 10) + '...');
    
    // Enhanced environment variable validation with detailed logging
    const requiredEnvVars = {
      PRIVATE_KEY_DEPLOY: process.env.PRIVATE_KEY_DEPLOY,
      NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
      ESCROW_CONTRACT_ADDRESS: ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
      NEXT_PUBLIC_TW_CLIENT_ID: process.env.NEXT_PUBLIC_TW_CLIENT_ID
    };
    
    console.log('🔍 Environment variables check:', {
      PRIVATE_KEY_DEPLOY: !!process.env.PRIVATE_KEY_DEPLOY,
      NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: !!process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
      ESCROW_CONTRACT_ADDRESS: !!ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS: !!process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_RPC_URL: !!process.env.NEXT_PUBLIC_RPC_URL,
      NEXT_PUBLIC_TW_CLIENT_ID: !!process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      actualEscrowAddress: ESCROW_CONTRACT_ADDRESS?.substring(0, 10) + '...'
    });
    
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      return res.status(500).json({ 
        success: false, 
        error: `Server configuration error: Missing ${missingVars.join(', ')}` 
      });
    }
    
    console.log('✅ Environment validation passed for mint-escrow API');
    
    // Parse and validate request body
    const {
      metadataUri,
      recipientAddress,
      password,
      timeframeDays,
      giftMessage,
      creatorAddress,
      gasless = true
    }: MintEscrowRequest = req.body;
    
    // Validation - password is optional for direct minting (skip escrow)
    if (!metadataUri || !giftMessage || !creatorAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: metadataUri, giftMessage, creatorAddress' 
      });
    }
    
    // Verify that authenticated address matches the creatorAddress in request
    if (authenticatedAddress.toLowerCase() !== creatorAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only create gifts from your authenticated wallet address'
      });
    }
    
    // Determine if this is escrow or direct mint
    const isEscrowMint = !!password;
    const isDirectMint = !password;
    
    // For escrow mints, password is required and must be valid
    if (isEscrowMint) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: passwordValidation.message 
        });
      }
    }
    
    // For direct mint (skip escrow), password is not required
    if (isDirectMint) {
      console.log('🚀 DIRECT MINT MODE: Skip escrow enabled, minting directly to creator');
    }
    
    const messageValidation = validateGiftMessage(giftMessage);
    if (!messageValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: messageValidation.message 
      });
    }
    
    // Sanitize gift message to prevent XSS
    const sanitizedGiftMessage = sanitizeGiftMessage(giftMessage);
    
    // For escrow mints, timeframe is required and must be valid
    if (isEscrowMint && !(timeframeDays in TIMEFRAME_OPTIONS)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid timeframe option' 
      });
    }
    
    // Derive deployer address from private key for neutral custody
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    // Determine target address and timeframe based on mint type
    let targetAddress: string;
    let timeframeIndex: number | undefined;
    
    if (isDirectMint) {
      // Direct mint: Always mint to creator (skip escrow)
      targetAddress = creatorAddress;
      timeframeIndex = undefined; // No timeframe needed for direct mints
      console.log('🎯 DIRECT MINT TARGET:', targetAddress.slice(0, 10) + '...');
    } else {
      // CRITICAL FIX: Escrow mint should go to CREATOR first, then transfer to escrow
      // This avoids "ERC721: transfer to non ERC721Receiver implementer" error
      targetAddress = creatorAddress; // ← FIX: Mint to creator first, then transfer in escrow creation
      timeframeIndex = TIMEFRAME_OPTIONS[timeframeDays];
      console.log('🔒 ESCROW MINT TARGET (FIXED - mint to creator, transfer in escrow):', targetAddress.slice(0, 10) + '...');
      
      if (!ESCROW_CONTRACT_ADDRESS) {
        throw new Error('ESCROW_CONTRACT_ADDRESS not configured');
      }
      console.log('✅ ESCROW CONTRACT ADDRESS:', ESCROW_CONTRACT_ADDRESS);
    }
    
    console.log('🎁 MINT ESCROW REQUEST:', {
      timeframe: timeframeDays,
      gasless,
      recipientAddress: targetAddress.slice(0, 10) + '...',
      messageLength: giftMessage.length,
      escrowContract: ESCROW_CONTRACT_ADDRESS?.slice(0, 10) + '...',
      nftContract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS?.slice(0, 10) + '...',
      hasRpcUrl: !!process.env.NEXT_PUBLIC_RPC_URL
    });
    
    // Choose minting strategy based on escrow vs direct mint
    let result;
    
    if (isDirectMint) {
      console.log('🎯 DIRECT MINT: Bypassing escrow, minting directly to creator');
      result = await mintNFTDirectly(
        targetAddress,
        metadataUri,
        sanitizedGiftMessage,
        creatorAddress
      );
      // Direct mints are always gasless from user perspective (deployer pays)
      result.gasless = true;
    } else {
      // Escrow mint - attempt based on gasless preference
      if (gasless) {
        console.log('🚀 Attempting gasless escrow mint...');
        result = await mintNFTEscrowGasless(
          targetAddress,
          metadataUri,
          password,
          timeframeIndex!,
          sanitizedGiftMessage,
          creatorAddress
        );
        
        // If gasless fails, fallback to gas-paid
        if (!result.success) {
          console.log('⚠️ Gasless failed, attempting gas-paid fallback...');
          result = await mintNFTEscrowGasPaid(
            targetAddress,
            metadataUri,
            password,
            timeframeIndex!,
            sanitizedGiftMessage,
            creatorAddress
          );
          result.gasless = false;
        } else {
          result.gasless = true;
        }
      } else {
        console.log('💰 Attempting gas-paid escrow mint...');
        result = await mintNFTEscrowGasPaid(
          targetAddress,
          metadataUri,
          password,
          timeframeIndex!,
          sanitizedGiftMessage,
          creatorAddress
        );
        result.gasless = false;
      }
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Escrow mint failed'
      });
    }
    
    // Calculate expiration time (only for escrow mints)
    let expirationTime: number | undefined;
    let giftLink: string | undefined;
    
    if (isEscrowMint && timeframeIndex !== undefined) {
      const timeConstants = {
        [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 900,    // 15 minutes
        [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 604800,      // 7 days
        [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 1296000,   // 15 days
        [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 2592000     // 30 days
      };
      
      const currentTime = Math.floor(Date.now() / 1000);
      expirationTime = currentTime + timeConstants[timeframeIndex];
      
      // Generate gift link for escrow mints
      const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
      giftLink = `${baseUrl}/gift/claim/${result.tokenId}`;
    } else {
      // Direct mints don't have expiration or gift links
      expirationTime = undefined;
      giftLink = undefined;
    }
    
    // Get current rate limit status
    const finalRateLimit = checkRateLimit(creatorAddress);
    
    const logMessage = isDirectMint ? 'DIRECT MINT SUCCESS' : 'ENHANCED ESCROW MINT SUCCESS';
    console.log(`🎉 ${logMessage}:`, {
      mintType: isDirectMint ? 'DIRECT' : 'ESCROW',
      tokenId: result.tokenId,
      gasless: result.gasless,
      transactionHash: result.transactionHash,
      escrowTransactionHash: result.escrowTransactionHash,
      nonce: result.nonce?.slice(0, 10) + '...',
      message: result.message,
      rateLimit: finalRateLimit
    });
    
    // Build response based on mint type
    const responseData: any = {
      success: true,
      tokenId: result.tokenId,
      transactionHash: result.transactionHash,
      gasless: result.gasless,
      rateLimit: {
        remaining: finalRateLimit.remaining,
        resetTime: finalRateLimit.resetTime
      }
    };
    
    if (isEscrowMint) {
      // Add escrow-specific fields
      responseData.escrowTransactionHash = result.escrowTransactionHash;
      responseData.giftLink = giftLink;
      responseData.salt = result.salt;
      responseData.passwordHash = result.passwordHash;
      responseData.expirationTime = expirationTime;
      responseData.nonce = result.nonce;
    } else {
      // Add direct mint specific message
      responseData.message = result.message || `NFT minted directly to your wallet. Token ID: ${result.tokenId}`;
      responseData.directMint = true;
    }
    
    return res.status(200).json(responseData);
    
  } catch (error: any) {
    console.error('💥 MINT ESCROW API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}