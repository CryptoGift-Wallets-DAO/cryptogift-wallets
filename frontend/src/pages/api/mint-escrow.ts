/**
 * MINT ESCROW API
 * Mint NFT + Create Escrow Gift in one atomic operation
 * 
 * 🚨 TEMPORARY STATUS: Gasless transactions temporarily disabled
 * Reason: Focusing on robust gas-paid implementation before re-enabling gasless
 * Status: All transactions use gas-paid method (deployer covers gas costs)
 * To re-enable: Set gaslessTemporarilyDisabled = false in handler function
 */

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * DYNAMIC BASE URL HELPER: Support for preview/custom domains
 * Constructs the public-facing base URL for tokenURI generation
 */
function getPublicBaseUrl(req?: NextApiRequest): string {
  // Priority 1: Explicit environment configuration
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }
  
  // Priority 2: Runtime detection from request headers
  if (req?.headers?.host) {
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    return `${protocol}://${req.headers.host}`;
  }
  
  // Priority 3: Local development fallback
  return 'http://localhost:3000';
}

/**
 * CRITICAL: Validate IPFS image accessibility before minting
 * Prevents minting NFTs with inaccessible images
 */
async function validateIPFSImageAccess(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 IPFS VALIDATION: Checking image accessibility:', imageUrl);
    
    // Check IPFS configuration
    const ipfsConfig = validateIPFSConfig();
    console.log('📋 IPFS Config:', ipfsConfig);
    
    if (!ipfsConfig.nftStorage && !ipfsConfig.thirdweb) {
      return {
        success: false,
        error: 'No IPFS providers configured. Cannot validate image accessibility.'
      };
    }
    
    // Convert IPFS URL to HTTP gateway for testing
    let testUrl = imageUrl;
    if (imageUrl.startsWith('ipfs://')) {
      const cid = imageUrl.replace('ipfs://', '').split('/')[0];
      testUrl = `https://nftstorage.link/ipfs/${cid}`;
      console.log('🌐 Testing via NFT.Storage gateway:', testUrl);
    }
    
    // Test accessibility with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        console.log('✅ IPFS IMAGE VALIDATION SUCCESS: Image accessible');
        return { success: true };
      } else {
        console.log('❌ IPFS IMAGE VALIDATION FAILED: HTTP', response.status);
        return {
          success: false,
          error: `Image not accessible: HTTP ${response.status}`
        };
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      console.log('❌ IPFS IMAGE VALIDATION ERROR:', fetchError.message);
      return {
        success: false,
        error: `Image accessibility test failed: ${fetchError.message}`
      };
    }
    
  } catch (error) {
    console.error('❌ IPFS VALIDATION SYSTEM ERROR:', error);
    return {
      success: false,
      error: `Validation system error: ${error.message}`
    };
  }
}
import { ethers } from 'ethers';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { 
  generateSalt,
  generatePasswordHash,
  getEscrowContract,
  prepareRegisterGiftMintedCall,
  validatePassword,
  validateGiftMessage,
  sanitizeGiftMessage,
  verifyNFTOwnership,
  TIMEFRAME_OPTIONS
} from '../../lib/escrowUtils';
import { storeGiftMapping } from '../../lib/giftMappingStore';
import { readContract } from 'thirdweb';
import {
  validateTransactionAttempt,
  registerTransactionAttempt,
  markTransactionCompleted,
  markTransactionFailed,
  verifyGaslessTransaction,
  checkRateLimit
} from '../../lib/gaslessValidation';
import { createEscrowMetadata, createDirectMintMetadata } from '../../lib/metadataUpdater';
import { parseGiftEventWithRetry } from '../../lib/eventParser';
import { validateMappingWithRetry } from '../../lib/mappingValidator';
import { Redis } from '@upstash/redis';
import { ESCROW_CONTRACT_ADDRESS } from '../../lib/escrowABI';
import { validateIPFSConfig } from '../../lib/ipfs';
import { 
  extractTokenIdFromTransferEvent, 
  validateTokenId, 
  diagnoseTokenIdZeroIssue,
  TokenIdZeroError,
  assertValidTokenId
} from '../../lib/tokenIdValidator';
import { verifyJWT, extractTokenFromHeaders } from '../../lib/siweAuth';
import { createBiconomySmartAccount, sendGaslessTransaction, validateBiconomyConfig } from '../../lib/biconomy';
import { executeMintTransaction } from '../../lib/gasPaidTransactions';
import { storeNFTMetadata, createNFTMetadata, getNFTMetadata } from '../../lib/nftMetadataStore';

// Helper function: Store metadata with robust retry logic
async function storeMetadataWithRetry(metadata: any, maxRetries: number = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📦 Metadata storage attempt ${attempt}/${maxRetries}`);
      
      await storeNFTMetadata(metadata);
      
      // CRITICAL: Verify storage immediately
      console.log(`🔍 Verifying metadata storage for ${metadata.contractAddress}:${metadata.tokenId}`);
      const verification = await getNFTMetadata(metadata.contractAddress, metadata.tokenId);
      
      if (verification) {
        console.log(`✅ Metadata stored and verified successfully on attempt ${attempt}`);
        return;
      } else {
        throw new Error('Verification failed - metadata not found after storage');
      }
      
    } catch (error: any) {
      console.warn(`⚠️ Metadata storage attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = 2000 * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to store and verify metadata after ${maxRetries} attempts`);
}

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
  creatorAddress: string,
  publicBaseUrl: string
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
  let passwordHash: string | undefined;
  
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
    
    // Step 2.5: IPFS IMAGE ACCESSIBILITY VALIDATION (prevent inaccessible NFTs)
    console.log('🔍 Step 2.5: Validating IPFS image accessibility...');
    const ipfsValidation = await validateIPFSImageAccess(tokenURI);
    
    if (!ipfsValidation.success) {
      console.error('❌ IPFS IMAGE VALIDATION FAILED:', ipfsValidation.error);
      // FAIL-FAST: Don't mint NFTs with inaccessible images
      throw new Error(`Image validation failed: ${ipfsValidation.error}. Please ensure your image is properly uploaded to IPFS and accessible via gateways.`);
    }
    
    console.log('✅ IPFS image accessibility validated successfully');
    
    // Step 3: Register transaction attempt
    await registerTransactionAttempt(creatorAddress, transactionNonce, tokenURI, 0, escrowConfig);
    
    // Step 4: Generate salt (password passed directly to contract)
    const salt = generateSalt();
    // NOTE: Contract generates hash internally with all parameters (password, salt, giftId, address, chainId)
    
    // Secure logging - never expose actual crypto values
    console.log('🔐 Cryptographic data generated successfully');
    
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
    
    // Step 8: HOTFIX - Mint to target address (creator for escrow, direct recipient for direct mints)
    console.log(`🎨 Preparing gasless mint NFT to target: ${to}...`);
    console.log(`🔍 Target recipient: ${to}`);
    console.log(`🔍 Backend deployer: ${creatorAddress}`);
    
    // CRITICAL FIX: Use placeholder tokenURI for initial mint, will be updated after extraction  
    const baseUrl = publicBaseUrl;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_SITE_URL or VERCEL_URL required');
    }
    const placeholderTokenURI = `${baseUrl}/api/nft-metadata/placeholder`;
    console.log(`🔍 Using placeholder tokenURI for gasless mint: ${placeholderTokenURI}`);
    
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, placeholderTokenURI] // Use placeholder, update after tokenId extraction
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
    console.log('🔍 FORCED DEBUG: About to extract token ID - checking deployment');
    console.log('🔍 FORCED DEBUG: Mint result hash:', mintResult.transactionHash);
    let tokenId: string | null = null;
    
    // ROBUST TOKEN ID EXTRACTION - NO SILENT FAILURES
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    console.log('🔍 Starting robust token ID extraction...');
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (!receipt) {
        throw new Error(`No transaction receipt found for hash: ${mintResult.transactionHash}`);
      }
      
      console.log(`🔍 Examining ${receipt.logs.length} logs for Transfer event...`);
      
      // Find Transfer event with strict validation
      const transferLog = receipt.logs.find(log => {
        const isCorrectContract = log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase();
        const isTransferEvent = log.topics[0] === transferEventSignature;
        const hasEnoughTopics = log.topics.length >= 4;
        
        console.log(`🔍 Log check - Contract: ${isCorrectContract}, Event: ${isTransferEvent}, Topics: ${hasEnoughTopics} (${log.topics.length})`);
        
        return isCorrectContract && isTransferEvent && hasEnoughTopics;
      });
      
      if (!transferLog) {
        throw new Error(`No valid Transfer event found in transaction ${mintResult.transactionHash}. Found ${receipt.logs.length} logs but none matched Transfer pattern.`);
      }
      
      // Use enhanced tokenId extraction with comprehensive validation
      const tokenIdValidation = extractTokenIdFromTransferEvent(transferLog);
      
      if (!tokenIdValidation.success) {
        console.error('❌ ENHANCED TOKEN ID EXTRACTION FAILED:', tokenIdValidation.error);
        
        // Run diagnostic to understand the issue
        const diagnostic = await diagnoseTokenIdZeroIssue(
          Array.from(receipt.logs || []),
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
        );
        
        console.error('🔍 DIAGNOSTIC RESULTS:', diagnostic);
        
        throw new TokenIdZeroError(
          `Enhanced tokenId extraction failed: ${tokenIdValidation.error}`,
          tokenIdValidation.source,
          tokenIdValidation.rawValue,
          diagnostic
        );
      }
      
      tokenId = tokenIdValidation.tokenId!;
      console.log('✅ ENHANCED TOKEN ID EXTRACTION SUCCESS:', tokenId);
      
    } catch (error) {
      console.error('❌ Transfer event extraction failed:', error);
      // NO FALLBACK - Fail fast and clear
      throw new Error(`Token ID extraction failed: ${error.message}. This prevents double minting and ensures data integrity.`);
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from mint transaction');
    }
    
    // Initialize escrow transaction hash variable
    let escrowTransactionHash: string | undefined;
    
    // Check if this is an escrow mint (password provided) or direct mint (no password)
    const isEscrowMint = !!password;
    
    if (isEscrowMint) {
      // V2 ZERO CUSTODY: NFT minted directly to escrow, register gift with registerGiftMinted
      console.log('🔒 ESCROW MINT V2: NFT minted directly to escrow, registering gift with registerGiftMinted...');
      
      console.log('🔍 DEBUG: Using escrow contract address V2:', ESCROW_CONTRACT_ADDRESS ? 'Set' : 'Missing');
      console.log('🔍 DEBUG: Token ID extracted from mint:', tokenId);
      console.log('🔍 DEBUG: Token ID type:', typeof tokenId);
      console.log('🔍 DEBUG: Creator address:', creatorAddress ? 'Set' : 'Missing');
      console.log('✅ V2: Using registerGiftMinted for zero-custody escrow');
      
      // CRITICAL FIX: Verify NFT ownership BEFORE calling registerGiftMinted to prevent race condition
      console.log('🔍 PRE-CHECK: Verifying NFT is owned by escrow before registration...');
      
      const ownershipResult = await verifyNFTOwnership(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        tokenId,
        ESCROW_CONTRACT_ADDRESS!,
        10, // Increased max attempts from 5 to 10
        2000 // Increased delay from 1000ms to 2000ms for gas-paid transactions
      );
      
      if (!ownershipResult.success) {
        console.error('❌ CRITICAL: NFT ownership verification failed - this will cause registerGiftMinted to fail');
        console.error('❌ ERROR DETAILS:', {
          expectedOwner: ESCROW_CONTRACT_ADDRESS,
          actualOwner: ownershipResult.actualOwner,
          error: ownershipResult.error
        });
        throw new Error(`RACE CONDITION DETECTED: ${ownershipResult.error || 'NFT ownership verification failed'}`);
      }
      
      // CRITICAL DEBUG: Log tokenId before registerGiftMinted call
      console.log('🔍 CRITICAL DEBUG - BEFORE registerGiftMinted:', {
        tokenId: tokenId,
        tokenIdType: typeof tokenId,
        tokenIdBigInt: BigInt(tokenId).toString(),
        contract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.slice(0,10) + '...',
        creator: creatorAddress.slice(0,10) + '...',
        timeframeDays,
        giftMessageLength: giftMessage.length
      });
      
      const registerGiftTransaction = prepareRegisterGiftMintedCall(
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        creatorAddress, // ← NEW: Pass original creator address
        password,
        salt,
        timeframeDays,
        giftMessage
      );
      
      console.log('🚀 Executing gasless gift registration...');
      const escrowResult = await sendGaslessTransaction(smartAccount, registerGiftTransaction);
      
      const escrowReceipt = await waitForReceipt({
        client,
        chain: baseSepolia,
        transactionHash: escrowResult.transactionHash as `0x${string}`
      });
      
      // CRITICAL: Verify gift registration succeeded
      if (escrowReceipt.status !== 'success') {
        throw new Error(`Gift registration failed with status: ${escrowReceipt.status}`);
      }
      
      console.log('✅ Gift registered successfully in escrow V2 contract');
      
      // RACE CONDITION FIX: IMMEDIATE WAIT-AND-VERIFY PATTERN
      console.log('🔍 CRITICAL: Wait-and-verify gift registration immediately...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for blockchain state update
      
      // RACE CONDITION FIX: Verify that registerGiftMinted actually created the gift
      console.log('🔍 RACE CONDITION VERIFICATION: Confirming gift was registered correctly...');
      try {
        const escrowContract = getEscrowContract();
        const giftCounter = await readContract({
          contract: escrowContract,
          method: "giftCounter",
          params: []
        });
        console.log(`✅ VERIFICATION: Current gift counter: ${giftCounter}`);
        
        if (Number(giftCounter) > 0) {
          const latestGift = await readContract({
            contract: escrowContract,
            method: "getGift",
            params: [BigInt(giftCounter)]
          });
          console.log('✅ VERIFICATION: Latest gift registered:', {
            creator: latestGift[0],
            tokenId: latestGift[3].toString(),
            status: latestGift[5]
          });
          
          // CRITICAL VALIDATION: Ensure tokenId matches what we sent
          const expectedTokenIdNum = Number(tokenId);
          const storedTokenIdNum = Number(latestGift[3]);
          if (storedTokenIdNum !== expectedTokenIdNum) {
            console.error('🚨 CRITICAL VALIDATION FAILED:', {
              sentTokenId: expectedTokenIdNum,
              storedTokenId: storedTokenIdNum,
              giftId: Number(giftCounter),
              creator: latestGift[0].slice(0,10) + '...'
            });
            throw new Error(`VALIDATION FAILED: registerGiftMinted stored tokenId ${storedTokenIdNum} but we sent ${expectedTokenIdNum}. This is a critical contract state corruption.`);
          }
          
          console.log('✅ CRITICAL VALIDATION SUCCESS: tokenId stored correctly in contract');
        }
      } catch (verificationError) {
        console.warn('⚠️ VERIFICATION FAILED (but gift registration succeeded):', verificationError);
      }
      
      // DETERMINISTIC SOLUTION: Parse giftId from transaction receipt events
      console.log('🔍 PARSING: Extracting giftId from transaction receipt...');
      
      // Handle gasless vs gas-paid receipt formats
      const receiptForParsing = escrowResult.receipt || escrowReceipt;
      console.log('🔧 RECEIPT TYPE:', {
        hasNormalizedReceipt: !!escrowResult.receipt,
        userOpHash: escrowResult.userOpHash?.slice(0, 20) + '...' || 'N/A',
        realTxHash: receiptForParsing.transactionHash?.slice(0, 20) + '...',
        logsCount: receiptForParsing.logs?.length || 0
      });
      
      const eventResult = await parseGiftEventWithRetry(
        receiptForParsing,
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
      );
      
      if (!eventResult.success) {
        console.error('❌ EVENT PARSE FAILED:', eventResult.success === false ? eventResult.error : 'Unknown error');
        throw new Error(`Failed to extract giftId from transaction: ${eventResult.success === false ? eventResult.error : 'Unknown error'}`);
      }
      
      const actualGiftId = eventResult.giftId;
      console.log(`✅ DETERMINISTIC: tokenId ${tokenId} → giftId ${actualGiftId} (from event)`);
      
      // Generate password hash now that we have the giftId
      passwordHash = generatePasswordHash(
        password,
        salt,
        actualGiftId,
        ESCROW_CONTRACT_ADDRESS!,
        84532 // Base Sepolia chain ID
      );
      
      // Store the mapping deterministically
      try {
        await storeGiftMapping(tokenId, actualGiftId);
        console.log(`✅ MAPPING STORED: tokenId ${tokenId} → giftId ${actualGiftId} (deterministic)`);
        
        // VALIDATION: Verify the mapping is correct (increased retries for race condition)
        const validation = await validateMappingWithRetry(
          tokenId,
          actualGiftId,
          creatorAddress,
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          6 // Increased from 3 to 6 retries for race condition recovery
        );
        
        if (!validation.valid) {
          console.error('❌ MAPPING VALIDATION FAILED:', validation.error);
          throw new Error(`Mapping validation failed: ${validation.error}`);
        }
        
        console.log('✅ MAPPING VALIDATED: Contract data confirms correct mapping');
        
      } catch (mappingError) {
        console.error('❌ Failed to store/validate gift mapping:', mappingError);
        throw new Error(`Critical mapping error: ${(mappingError as Error).message}`);
      }
      
      // Step 11: Verify NFT is in escrow contract (should already be there from direct mint)
      console.log('🔍 Verifying NFT is in escrow contract (V2 direct mint)...');
      const providerPostGasless = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const nftContractABIPostGasless = ["function ownerOf(uint256 tokenId) view returns (address)"];
      const nftContractCheckPostGasless = new ethers.Contract(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        nftContractABIPostGasless,
        providerPostGasless
      );
      
      const actualOwner = await nftContractCheckPostGasless.ownerOf(tokenId);
      console.log('🔍 Actual NFT owner after escrow creation:', actualOwner);
      console.log('🔍 Expected escrow address:', ESCROW_CONTRACT_ADDRESS ? 'Set' : 'Missing');
      
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
    
    // CLEANUP: Release any locks on failure
    try {
      const requestIdKey = `request:${transactionNonce}`;
      const requestId = await redis?.get(requestIdKey);
      if (requestId) {
        await redis?.del(`mint_lock:${requestId}`);
        await redis?.del(requestIdKey);
        console.log('🧹 Cleaned up locks for failed gasless transaction');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup locks:', cleanupError);
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
  creatorAddress: string,
  publicBaseUrl: string  // REQUIRED: Explicit injection instead of req?
): Promise<{
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  message?: string;
  error?: string;
}> {
  try {
    console.log('🎯 DIRECT MINT: Starting direct mint to creator wallet (skip escrow)');
    console.log('🎯 Target address:', to ? 'Set' : 'Missing');
    
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
    
    // CRITICAL FIX: Use placeholder tokenURI for initial mint, will be updated after extraction  
    const baseUrl = publicBaseUrl;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_SITE_URL or VERCEL_URL required');
    }
    const placeholderTokenURI = `${baseUrl}/api/nft-metadata/placeholder`;
    console.log(`🔍 Using placeholder tokenURI for direct mint: ${placeholderTokenURI}`);
    
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, placeholderTokenURI]
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
      console.error('❌ Transfer event extraction failed for direct mint:', error);
      // NO FALLBACK - Fail fast and clear to prevent double minting
      throw new Error(`Token ID extraction failed: ${error.message}. This prevents double minting and ensures data integrity.`);
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
  creatorAddress: string,
  publicBaseUrl: string  // REQUIRED: Explicit injection instead of req?
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
  let passwordHash: string | undefined;
  
  try {
    // PROTOCOL V2 TYPE C: Validate publicBaseUrl early (no broken URLs)
    if (!publicBaseUrl || !publicBaseUrl.startsWith('http')) {
      throw new Error(`Invalid publicBaseUrl: ${publicBaseUrl}. Must be a valid HTTP/HTTPS URL.`);
    }
    
    console.log('💰 MINT ESCROW GAS-PAID: Starting atomic operation (deployer pays gas)');
    console.log('🌐 Using validated publicBaseUrl:', publicBaseUrl);
    
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
    
    // Step 2.5: IPFS IMAGE ACCESSIBILITY VALIDATION (prevent inaccessible NFTs)
    console.log('🔍 Step 2.5: Validating IPFS image accessibility...');
    const ipfsValidation = await validateIPFSImageAccess(tokenURI);
    
    if (!ipfsValidation.success) {
      console.error('❌ IPFS IMAGE VALIDATION FAILED:', ipfsValidation.error);
      // FAIL-FAST: Don't mint NFTs with inaccessible images
      throw new Error(`Image validation failed: ${ipfsValidation.error}. Please ensure your image is properly uploaded to IPFS and accessible via gateways.`);
    }
    
    console.log('✅ IPFS image accessibility validated successfully');
    
    // Step 3: Register transaction attempt
    await registerTransactionAttempt(creatorAddress, transactionNonce, tokenURI, 0, escrowConfig);
    
    // Step 4: Generate salt (password passed directly to contract)
    const salt = generateSalt();
    // NOTE: Contract generates hash internally with all parameters (password, salt, giftId, address, chainId)
    
    // Secure logging - never expose actual crypto values
    console.log('🔐 Cryptographic data generated successfully');
    
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
    
    // Determine if this is an escrow mint (password provided) or direct mint (no password)
    const isEscrowMint = !!password;
    
    // Step 7: V2 ZERO CUSTODY - Mint directly to escrow contract for escrow mints
    const targetAddress = isEscrowMint ? ESCROW_CONTRACT_ADDRESS! : to;
    console.log(`🎨 Preparing gas-paid mint NFT with V2 zero-custody architecture...`);
    console.log(`🔍 Target recipient: ${targetAddress}`);
    console.log(`🔍 Is escrow mint: ${isEscrowMint}`);
    console.log(`🔍 Backend deployer: ${creatorAddress}`);
    
    // CRITICAL FIX: Use placeholder tokenURI for initial mint, will be updated after extraction
    const placeholderTokenURI = `${publicBaseUrl}/api/nft-metadata/placeholder`;
    console.log(`🔍 Using placeholder tokenURI for initial mint: ${placeholderTokenURI}`);
    
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [targetAddress, placeholderTokenURI] // Use placeholder, update after tokenId extraction
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
    console.log('🔍 FORCED DEBUG: About to extract token ID - checking deployment');
    console.log('🔍 FORCED DEBUG: Mint result hash:', mintResult.transactionHash);
    let tokenId: string | null = null;
    
    // ROBUST TOKEN ID EXTRACTION - NO SILENT FAILURES
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    console.log('🔍 Starting robust token ID extraction...');
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (!receipt) {
        throw new Error(`No transaction receipt found for hash: ${mintResult.transactionHash}`);
      }
      
      console.log(`🔍 Examining ${receipt.logs.length} logs for Transfer event...`);
      
      // Find Transfer event with strict validation
      const transferLog = receipt.logs.find(log => {
        const isCorrectContract = log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase();
        const isTransferEvent = log.topics[0] === transferEventSignature;
        const hasEnoughTopics = log.topics.length >= 4;
        
        console.log(`🔍 Log check - Contract: ${isCorrectContract}, Event: ${isTransferEvent}, Topics: ${hasEnoughTopics} (${log.topics.length})`);
        
        return isCorrectContract && isTransferEvent && hasEnoughTopics;
      });
      
      if (!transferLog) {
        throw new Error(`No valid Transfer event found in transaction ${mintResult.transactionHash}. Found ${receipt.logs.length} logs but none matched Transfer pattern.`);
      }
      
      // Use enhanced tokenId extraction with comprehensive validation
      const tokenIdValidation = extractTokenIdFromTransferEvent(transferLog);
      
      if (!tokenIdValidation.success) {
        console.error('❌ ENHANCED TOKEN ID EXTRACTION FAILED:', tokenIdValidation.error);
        
        // Run diagnostic to understand the issue
        const diagnostic = await diagnoseTokenIdZeroIssue(
          Array.from(receipt.logs || []),
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
        );
        
        console.error('🔍 DIAGNOSTIC RESULTS:', diagnostic);
        
        throw new TokenIdZeroError(
          `Enhanced tokenId extraction failed: ${tokenIdValidation.error}`,
          tokenIdValidation.source,
          tokenIdValidation.rawValue,
          diagnostic
        );
      }
      
      tokenId = tokenIdValidation.tokenId!;
      console.log('✅ ENHANCED TOKEN ID EXTRACTION SUCCESS:', tokenId);
      
    } catch (error) {
      console.error('❌ Transfer event extraction failed:', error);
      // NO FALLBACK - Fail fast and clear
      throw new Error(`Token ID extraction failed: ${error.message}. This prevents double minting and ensures data integrity.`);
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from mint transaction');
    }
    
    // CRITICAL FIX: Update metadata with real tokenId (ERROR 3 SOLUTION)
    console.log('📝 METADATA UPDATE (GAS-PAID): Creating final metadata with real tokenId:', tokenId);
    
    try {
      // CRITICAL FIX: tokenURI now contains image CID, not metadata CID
      // Format: ipfs://imageCid (sent from GiftWizard with actualImageCid)
      const imageIpfsCid = tokenURI.replace('ipfs://', '');
      
      console.log('🖼️ Using image CID for metadata creation:', imageIpfsCid);
      
      // Create new metadata with the real tokenId and correct image CID
      let metadataUpdateResult;
      
      if (isEscrowMint) {
        // Create escrow-specific metadata
        const timeConstantsMap = {
          [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 'FIFTEEN_MINUTES',
          [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 'SEVEN_DAYS', 
          [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 'FIFTEEN_DAYS',
          [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 'THIRTY_DAYS'
        };
        
        // Calculate expiration time for metadata
        const timeConstants = {
          [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 900,
          [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 604800,
          [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 1296000,
          [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 2592000
        };
        
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = currentTime + timeConstants[timeframeDays];
        
        console.log('🔒 Creating escrow metadata with real tokenId and image CID');
        
        // CRITICAL DEBUG: Log specific timeframe details for 7-day issue
        console.log('🔍 TIMEFRAME DEBUG:', {
          timeframeDaysInput: timeframeDays,
          timeframeDaysType: typeof timeframeDays,
          timeConstantsMapKeys: Object.keys(timeConstantsMap),
          mappedValue: timeConstantsMap[timeframeDays],
          timeframeDaysString: String(timeframeDays),
          allMapping: timeConstantsMap
        });
        
        metadataUpdateResult = await createEscrowMetadata(
          tokenId,
          imageIpfsCid, // FIXED: Now using actual image CID
          giftMessage,
          creatorAddress,
          expirationTime,
          timeConstantsMap[timeframeDays] || 'UNKNOWN'
        );
      } else {
        // Create direct mint metadata
        console.log('🎯 Creating direct mint metadata with real tokenId and image CID');
        metadataUpdateResult = await createDirectMintMetadata(
          tokenId,
          imageIpfsCid, // FIXED: Now using actual image CID
          giftMessage,
          creatorAddress
        );
      }
      
      if (metadataUpdateResult.success && metadataUpdateResult.metadataUrl) {
        console.log('✅ METADATA UPDATED (GAS-PAID): Real tokenId metadata created:', {
          tokenId,
          newMetadataCid: metadataUpdateResult.metadataCid,
          newMetadataUrl: metadataUpdateResult.metadataUrl,
          originalTokenURI: tokenURI
        });
        
        // CRITICAL FIX: Update tokenURI on contract with correct metadata
        console.log('🔄 UPDATING CONTRACT TOKEN URI with real tokenId metadata...');
        
        // Get NFT contract (moved outside try for retry access)
        const nftContract = getContract({
          client,
          chain: baseSepolia,
          address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
        });
        
        // Get deployer account for contract update (moved outside try for retry access)
        const deployerAccount = privateKeyToAccount({
          client,
          privateKey: process.env.PRIVATE_KEY_DEPLOY!
        });
        
        // UNIVERSAL COMPATIBILITY FIX: Use BaseScan-optimized endpoint for maximum compatibility
        const contractAddress = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!;
        
        // UNIVERSAL COMPATIBILITY: Use injected publicBaseUrl (no req dependency)
        const universalCompatibleUrl = `${publicBaseUrl}/api/nft-metadata/${contractAddress}/${tokenId}`;
        
        try {
          
          console.log('🌐 UNIVERSAL FIX: Using BaseScan-optimized endpoint for tokenURI');
          console.log(`📍 Original URL: ${metadataUpdateResult.metadataUrl}`);
          console.log(`🔗 Universal URL: ${universalCompatibleUrl}`);
          
          // Prepare updateTokenURI transaction with Universal-compatible URL
          const updateURITransaction = prepareContractCall({
            contract: nftContract,
            method: "function updateTokenURI(uint256 tokenId, string memory uri) external",
            params: [BigInt(tokenId), universalCompatibleUrl]
          });
          
          // Execute update transaction
          const updateResult = await sendTransaction({
            transaction: updateURITransaction,
            account: deployerAccount
          });
          
          console.log('📨 TokenURI update transaction sent:', updateResult.transactionHash);
          
          // Wait for update confirmation with fail-fast
          const updateReceipt = await waitForReceipt({
            client,
            chain: baseSepolia,
            transactionHash: updateResult.transactionHash
          });
          
          if (updateReceipt.status === 'success') {
            console.log('✅ TOKEN URI UPDATED ON CONTRACT (UNIVERSAL COMPATIBLE):', {
              tokenId,
              newTokenURI: universalCompatibleUrl,
              originalIpfsUrl: metadataUpdateResult.metadataUrl,
              updateTxHash: updateResult.transactionHash
            });
          } else {
            // FAIL-FAST: Status failure is critical for BaseScan compatibility
            throw new Error(`TokenURI update failed: receipt status=${updateReceipt.status}`);
          }
          
        } catch (updateError: any) {
          console.error(`❌ TokenURI update attempt 1 failed: ${updateError.message}`);
          
          // RETRY LOGIC: One retry with backoff for race conditions
          try {
            console.log(`🔁 Attempting TokenURI update retry after 1s backoff...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify token exists before retry
            const tokenExists = await readContract({
              contract: nftContract,
              method: "function ownerOf(uint256 tokenId) view returns (address)",
              params: [BigInt(tokenId)]
            });
            
            if (!tokenExists) {
              throw new Error(`Token ${tokenId} does not exist for URI update`);
            }
            
            // Retry the update
            const retryTransaction = prepareContractCall({
              contract: nftContract,
              method: "function updateTokenURI(uint256 tokenId, string memory uri) external",
              params: [BigInt(tokenId), universalCompatibleUrl]
            });
            
            const retryResult = await sendTransaction({
              transaction: retryTransaction,
              account: deployerAccount
            });
            
            const retryReceipt = await waitForReceipt({
              client,
              chain: baseSepolia,
              transactionHash: retryResult.transactionHash
            });
            
            if (retryReceipt.status === 'success') {
              console.log('✅ TOKEN URI RETRY SUCCESS:', {
                tokenId,
                newTokenURI: universalCompatibleUrl,
                retryTxHash: retryResult.transactionHash
              });
            } else {
              // CRITICAL FAILURE: Both attempts failed
              throw new Error(`TokenURI update failed after retry: receipt status=${retryReceipt.status}`);
            }
            
          } catch (retryError: any) {
            console.error(`💥 CRITICAL: TokenURI update failed after retry: ${retryError.message}`);
            // FAIL-FAST: Surface the error to caller - NFT will have incorrect URI for BaseScan
            throw new Error(`Failed to update TokenURI for BaseScan compatibility: ${retryError.message}`);
          }
        }
        
      } else {
        console.warn('⚠️ METADATA UPDATE FAILED (GAS-PAID):', metadataUpdateResult.error);
        // Continue with mint process even if metadata update fails
      }
      
    } catch (metadataError) {
      console.error('❌ METADATA UPDATE ERROR (GAS-PAID):', metadataError);
      // Continue with mint process even if metadata update fails
    }
    
    // Initialize escrow transaction hash variable
    let escrowTransactionHash: string | undefined;
    
    if (isEscrowMint) {
      // ESCROW MINT V2: NFT minted directly to escrow, register gift with registerGiftMinted
      console.log('🔒 ESCROW MINT V2: NFT minted directly to escrow, registering gift...');
      
      // CRITICAL FIX: Verify NFT ownership BEFORE calling registerGiftMinted to prevent race condition
      console.log('🔍 PRE-CHECK: Verifying NFT is owned by escrow before registration...');
      
      const ownershipResult = await verifyNFTOwnership(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        tokenId,
        ESCROW_CONTRACT_ADDRESS!,
        10, // Increased max attempts from 5 to 10
        2000 // Increased delay from 1000ms to 2000ms for gas-paid transactions
      );
      
      if (!ownershipResult.success) {
        console.error('❌ CRITICAL: NFT ownership verification failed - this will cause registerGiftMinted to fail');
        console.error('❌ ERROR DETAILS:', {
          expectedOwner: ESCROW_CONTRACT_ADDRESS,
          actualOwner: ownershipResult.actualOwner,
          error: ownershipResult.error
        });
        throw new Error(`RACE CONDITION DETECTED: ${ownershipResult.error || 'NFT ownership verification failed'}`);
      }
      
      // V2 ZERO CUSTODY: Use registerGiftMinted for direct mint-to-escrow
      console.log('✅ V2 ZERO CUSTODY: Using registerGiftMinted (NFT already in escrow)');
      
      // CRITICAL DEBUG: Log tokenId before registerGiftMinted call (gas-paid)
      console.log('🔍 CRITICAL DEBUG - BEFORE registerGiftMinted (GAS-PAID):', {
        tokenId: tokenId,
        tokenIdType: typeof tokenId,
        tokenIdBigInt: BigInt(tokenId).toString(),
        contract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.slice(0,10) + '...',
        creator: creatorAddress.slice(0,10) + '...',
        timeframeDays,
        giftMessageLength: giftMessage.length
      });
      
      const registerGiftTransaction = prepareRegisterGiftMintedCall(
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        creatorAddress, // Original creator
        password,
        salt,
        timeframeDays,
        giftMessage
      );
      
      console.log('🚀 Executing gas-paid gift registration...');
      const escrowResult = await sendTransaction({
        transaction: registerGiftTransaction,
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
      
      console.log('✅ Gift registered successfully in escrow V2 contract with gas-paid transaction');
      
      // RACE CONDITION FIX: IMMEDIATE WAIT-AND-VERIFY PATTERN (gas-paid)
      console.log('🔍 CRITICAL: Wait-and-verify gift registration immediately (gas-paid)...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for blockchain state update
      
      // RACE CONDITION FIX: Verify that registerGiftMinted actually created the gift
      console.log('🔍 RACE CONDITION VERIFICATION: Confirming gift was registered correctly (gas-paid)...');
      try {
        const escrowContract = getEscrowContract();
        const giftCounter = await readContract({
          contract: escrowContract,
          method: "giftCounter",
          params: []
        });
        console.log(`✅ VERIFICATION (GAS-PAID): Current gift counter: ${giftCounter}`);
        
        if (Number(giftCounter) > 0) {
          const latestGift = await readContract({
            contract: escrowContract,
            method: "getGift",
            params: [BigInt(giftCounter)]
          });
          console.log('✅ VERIFICATION (GAS-PAID): Latest gift registered:', {
            creator: latestGift[0],
            tokenId: latestGift[3].toString(),
            status: latestGift[5]
          });
          
          // CRITICAL VALIDATION: Ensure tokenId matches what we sent (gas-paid)
          const expectedTokenIdNum = Number(tokenId);
          const storedTokenIdNum = Number(latestGift[3]);
          if (storedTokenIdNum !== expectedTokenIdNum) {
            console.error('🚨 CRITICAL VALIDATION FAILED (GAS-PAID):', {
              sentTokenId: expectedTokenIdNum,
              storedTokenId: storedTokenIdNum,
              giftId: Number(giftCounter),
              creator: latestGift[0].slice(0,10) + '...'
            });
            throw new Error(`VALIDATION FAILED (GAS-PAID): registerGiftMinted stored tokenId ${storedTokenIdNum} but we sent ${expectedTokenIdNum}. This is a critical contract state corruption.`);
          }
          
          console.log('✅ CRITICAL VALIDATION SUCCESS (GAS-PAID): tokenId stored correctly in contract');
        }
      } catch (verificationError) {
        console.warn('⚠️ VERIFICATION FAILED (but gift registration succeeded):', verificationError);
      }
      
      // Step: Verify NFT is in escrow contract (should already be there from direct mint)
      console.log('🔍 Verifying NFT is in escrow contract (V2 direct mint)...');
      const providerPostGasPaid = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const nftContractABIPostGasPaid = ["function ownerOf(uint256 tokenId) view returns (address)"];
      const nftContractCheckPostGasPaid = new ethers.Contract(
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        nftContractABIPostGasPaid,
        providerPostGasPaid
      );
      
      const actualOwner = await nftContractCheckPostGasPaid.ownerOf(tokenId);
      console.log('🔍 Actual NFT owner after gift registration:', actualOwner);
      console.log('🔍 Expected escrow address:', ESCROW_CONTRACT_ADDRESS ? 'Set' : 'Missing');
      
      if (actualOwner.toLowerCase() !== ESCROW_CONTRACT_ADDRESS?.toLowerCase()) {
        throw new Error(`CRITICAL: NFT was not transferred to escrow contract. Expected: ${ESCROW_CONTRACT_ADDRESS}, Got: ${actualOwner}`);
      }
      
      console.log('✅ VERIFIED: NFT successfully in escrow contract (V2 zero-custody)');
      
      // DETERMINISTIC SOLUTION: Parse giftId from transaction receipt events (gas-paid)
      console.log('🔍 PARSING (GAS-PAID): Extracting giftId from transaction receipt...');
      
      // Normalize the ThirdWeb receipt to our parser format
      const normalizedGasPaidReceipt = {
        transactionHash: escrowReceipt.transactionHash,
        status: escrowReceipt.status,
        blockNumber: Number(escrowReceipt.blockNumber),
        gasUsed: escrowReceipt.gasUsed,
        logs: escrowReceipt.logs.map((log: any) => ({
          topics: log.topics || [],
          data: log.data || '0x',
          address: log.address
        }))
      };
      
      const eventResultGasPaid = await parseGiftEventWithRetry(
        normalizedGasPaidReceipt,
        tokenId,
        process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
      );
      
      if (!eventResultGasPaid.success) {
        console.error('❌ EVENT PARSE FAILED (GAS-PAID):', eventResultGasPaid.success === false ? eventResultGasPaid.error : 'Unknown error');
        throw new Error(`Failed to extract giftId from gas-paid transaction: ${eventResultGasPaid.success === false ? eventResultGasPaid.error : 'Unknown error'}`);
      }
      
      const actualGiftIdGasPaid = eventResultGasPaid.giftId;
      console.log(`✅ DETERMINISTIC (GAS-PAID): tokenId ${tokenId} → giftId ${actualGiftIdGasPaid} (from event)`);
      
      // Generate password hash now that we have the giftId
      passwordHash = generatePasswordHash(
        password,
        salt,
        actualGiftIdGasPaid,
        ESCROW_CONTRACT_ADDRESS!,
        84532 // Base Sepolia chain ID
      );
      
      // Store the mapping deterministically (gas-paid)
      try {
        await storeGiftMapping(tokenId, actualGiftIdGasPaid);
        console.log(`✅ MAPPING STORED (GAS-PAID): tokenId ${tokenId} → giftId ${actualGiftIdGasPaid} (deterministic)`);
        
        // VALIDATION: Verify the mapping is correct (gas-paid, increased retries for race condition)
        const validationGasPaid = await validateMappingWithRetry(
          tokenId,
          actualGiftIdGasPaid,
          creatorAddress,
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          6 // Increased from 3 to 6 retries for race condition recovery
        );
        
        if (!validationGasPaid.valid) {
          console.error('❌ MAPPING VALIDATION FAILED (GAS-PAID):', validationGasPaid.error);
          throw new Error(`Gas-paid mapping validation failed: ${validationGasPaid.error}`);
        }
        
        console.log('✅ MAPPING VALIDATED (GAS-PAID): Contract data confirms correct mapping');
        
      } catch (mappingError) {
        console.error('❌ Failed to store/validate gift mapping (gas-paid):', mappingError);
        throw new Error(`Critical gas-paid mapping error: ${(mappingError as Error).message}`);
      }
      
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
    
    // PROTOCOL V2 TYPE C: Resolve publicBaseUrl once for all operations (no req? fragility)
    const publicBaseUrl = getPublicBaseUrl(req);
    console.log('🌐 Public base URL resolved:', publicBaseUrl);
    
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
      configStatus: 'Environment variables loaded'
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
      gasless = false // 🚨 TEMPORARILY DISABLED: Gasless flow disabled to focus on robust gas-paid implementation
    }: MintEscrowRequest = req.body;
    
    // 🚨 TEMPORARY GASLESS DISABLE: Force gas-paid for system robustness
    const gaslessTemporarilyDisabled = true;
    const finalGasless = gaslessTemporarilyDisabled ? false : gasless;
    
    if (gasless && gaslessTemporarilyDisabled) {
      console.log('⚠️ GASLESS TEMPORARILY DISABLED: Redirecting to robust gas-paid implementation');
      console.log('📋 Reason: Focusing on gas-paid robustness before re-enabling gasless features');
    }
    
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
      // V2 ZERO CUSTODY: Mint directly to escrow contract, use registerGiftMinted
      targetAddress = ESCROW_CONTRACT_ADDRESS || '';
      timeframeIndex = TIMEFRAME_OPTIONS[timeframeDays];
      console.log('🔒 ESCROW MINT TARGET (V2 ZERO CUSTODY - direct to escrow):', targetAddress.slice(0, 10) + '...');
      
      if (!ESCROW_CONTRACT_ADDRESS) {
        throw new Error('ESCROW_CONTRACT_ADDRESS not configured');
      }
      console.log('✅ ESCROW CONTRACT ADDRESS V2:', ESCROW_CONTRACT_ADDRESS);
    }
    
    console.log('🎁 MINT ESCROW REQUEST:', {
      timeframe: timeframeDays,
      requestedGasless: gasless,
      finalGasless: finalGasless,
      gaslessStatus: gaslessTemporarilyDisabled ? 'DISABLED_FOR_ROBUSTNESS' : 'ENABLED',
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
        creatorAddress,
        publicBaseUrl
      );
      // Direct mints are always gasless from user perspective (deployer pays)
      result.gasless = true;
    } else {
      // Escrow mint - use finalGasless (which respects temporary disable)
      if (finalGasless && !gaslessTemporarilyDisabled) {
        console.log('🚀 Attempting gasless escrow mint...');
        result = await mintNFTEscrowGasless(
          targetAddress,
          metadataUri,
          password,
          timeframeIndex!,
          sanitizedGiftMessage,
          creatorAddress,
          publicBaseUrl
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
            creatorAddress,
            publicBaseUrl
          );
          result.gasless = false;
        } else {
          result.gasless = true;
        }
      } else {
        // Either gasless was not requested OR gasless is temporarily disabled
        const reason = gaslessTemporarilyDisabled ? 
          'GASLESS TEMPORARILY DISABLED for system robustness - using gas-paid' : 
          'Gas-paid mint requested by user';
        console.log(`💰 ${reason}`);
        
        result = await mintNFTEscrowGasPaid(
          targetAddress,
          metadataUri,
          password,
          timeframeIndex!,
          sanitizedGiftMessage,
          creatorAddress,
          publicBaseUrl
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
    
    // Add gasless status message if user requested gasless but it was disabled
    if (gasless && gaslessTemporarilyDisabled && !result.gasless) {
      responseData.gaslessDisabledMessage = "⚠️ Gasless transactions are temporarily disabled to ensure system robustness. Your transaction was processed using gas-paid method (deployer covers gas costs).";
      responseData.gaslessStatus = "temporarily_disabled";
    }
    
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

    // CRITICAL FIX: Store NFT metadata so it appears in user's wallets
    try {
      console.log('💾 Storing NFT metadata for wallet display...');
      
      // Extract image CID from metadataUri for proper metadata storage
      const imageIpfsCid = metadataUri.replace('ipfs://', '');
      
      // Determine the final owner of the NFT
      const finalOwner = isEscrowMint 
        ? recipientAddress || creatorAddress // For escrow, track who will claim it
        : recipientAddress || creatorAddress; // Direct mint goes to user
      
      // CRITICAL FIX: Create complete attributes array including escrow-specific data
      const baseAttributes = [
        { trait_type: "Token ID", value: result.tokenId },
        { trait_type: "Creation Date", value: new Date().toISOString() },
        { trait_type: "Platform", value: "CryptoGift Wallets" },
        { trait_type: "Gift Type", value: isEscrowMint ? "Temporal Escrow" : "Direct Mint" },
        { trait_type: "Creator", value: creatorAddress.slice(0, 10) + '...' }
      ];

      // METAMASK FIX: Add escrow-specific attributes for escrow mints
      if (isEscrowMint && timeframeIndex !== undefined) {
        console.log('🔒 ADDING ESCROW ATTRIBUTES FOR METAMASK COMPATIBILITY');
        
        // Map timeframe index back to string for display
        const timeframeMap = {
          [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 'FIFTEEN_MINUTES',
          [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 'SEVEN_DAYS', 
          [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 'FIFTEEN_DAYS',
          [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 'THIRTY_DAYS'
        };
        
        const timeframeString = timeframeMap[timeframeIndex] || 'UNKNOWN';
        console.log('🔍 ESCROW TIMEFRAME for metadata:', timeframeString);
        
        baseAttributes.push(
          { trait_type: "Timeframe", value: timeframeString },
          { trait_type: "Expires At", value: new Date((expirationTime || 0) * 1000).toISOString() },
          { trait_type: "Security", value: "Password Protected" }
        );
      }

      const nftMetadata = createNFTMetadata({
        contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
        tokenId: result.tokenId,
        name: `CryptoGift NFT #${result.tokenId}`,
        description: giftMessage || "Un regalo cripto único creado con amor",
        imageIpfsCid: imageIpfsCid,
        metadataIpfsCid: undefined, // Will be updated later with proper metadata
        attributes: baseAttributes, // Use complete attributes array
        mintTransactionHash: result.transactionHash,
        owner: finalOwner,
        creatorWallet: creatorAddress
      });
      
      // 🔄 ROBUST METADATA STORAGE with retry logic
      await storeMetadataWithRetry(nftMetadata, 3);
      console.log('✅ NFT metadata stored and verified successfully');
      
    } catch (metadataStoreError) {
      console.error('⚠️ Failed to store NFT metadata after retries:', metadataStoreError);
      // Don't fail the whole transaction for metadata storage issues, but log for recovery
      console.error('📋 Metadata that failed to store - error details:', metadataStoreError.message);
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