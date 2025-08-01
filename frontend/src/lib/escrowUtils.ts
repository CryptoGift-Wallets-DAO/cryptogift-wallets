/**
 * CRYPTOGIFT ESCROW UTILITIES
 * Comprehensive utility functions for escrow gift management
 */

import { ethers } from 'ethers';
import { createThirdwebClient, getContract, prepareContractCall, readContract, sendTransaction, waitForReceipt } from 'thirdweb';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { baseSepolia } from 'thirdweb/chains';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from './escrowABI';
import { getGiftIdFromMapping, storeGiftMapping, batchStoreGiftMappings } from './giftMappingStore';

// Initialize ThirdWeb client lazily to avoid build-time issues
let client: ReturnType<typeof createThirdwebClient> | null = null;
function getThirdwebClient() {
  if (!client) {
    const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
    if (!clientId) throw new Error('NEXT_PUBLIC_TW_CLIENT_ID is required');
    client = createThirdwebClient({ clientId });
  }
  return client;
}

/**
 * Password and Salt Management
 */
export function generateSalt(): `0x${string}` {
  return ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`;
}

/**
 * CRITICAL FIX: Generate password hash EXACTLY as Solidity contract does
 * Contract: keccak256(abi.encodePacked(password, salt, giftId, address(this), block.chainid))
 * 
 * @param password - User provided password
 * @param salt - 32-byte salt  
 * @param giftId - Gift ID from contract
 * @param contractAddress - Escrow contract address
 * @param chainId - Blockchain chain ID (84532 for Base Sepolia)
 */
export function generatePasswordHash(
  password: string, 
  salt: string, 
  giftId: number | string | bigint,
  contractAddress: string,
  chainId: number = 84532
): `0x${string}` {
  // Use solidityPackedKeccak256 to replicate abi.encodePacked exactly
  return ethers.solidityPackedKeccak256(
    ['string', 'bytes32', 'uint256', 'address', 'uint256'],
    [password, salt, BigInt(giftId), contractAddress, BigInt(chainId)]
  ) as `0x${string}`;
}

/**
 * DEPRECATED: Legacy password hash function (INSECURE - doesn't match contract)
 * Keep temporarily for migration purposes only
 * @deprecated Use generatePasswordHash with all parameters instead
 */
export function generatePasswordHashLegacy(password: string, salt: string): `0x${string}` {
  return ethers.keccak256(ethers.toUtf8Bytes(password + salt)) as `0x${string}`;
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 50) {
    return { valid: false, message: 'Password must be less than 50 characters' };
  }
  return { valid: true };
}

/**
 * Timeframe Management
 */
export const TIMEFRAME_OPTIONS = {
  FIFTEEN_MINUTES: 0,
  SEVEN_DAYS: 1,
  FIFTEEN_DAYS: 2,
  THIRTY_DAYS: 3
} as const;

export type TimeframeOption = keyof typeof TIMEFRAME_OPTIONS;

export const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  FIFTEEN_MINUTES: '15 Minutes (Testing)',
  SEVEN_DAYS: '7 Days',
  FIFTEEN_DAYS: '15 Days',
  THIRTY_DAYS: '30 Days'
};

export const TIMEFRAME_DESCRIPTIONS: Record<TimeframeOption, string> = {
  FIFTEEN_MINUTES: 'Perfect for testing the escrow system quickly',
  SEVEN_DAYS: 'Standard gift timeframe for most occasions',
  FIFTEEN_DAYS: 'Extended timeframe for special gifts',
  THIRTY_DAYS: 'Maximum timeframe for important occasions'
};

/**
 * Contract Interaction Helpers
 */
export function getEscrowContract() {
  if (!ESCROW_CONTRACT_ADDRESS) {
    throw new Error('Escrow contract address not configured');
  }
  
  return getContract({
    client: getThirdwebClient(),
    chain: baseSepolia,
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI
  });
}

/**
 * Cache for tokenId to giftId mappings to avoid repeated RPC calls
 */
const tokenIdToGiftIdCache = new Map<string, number>();

/**
 * OPTIMIZED: Map tokenId to giftId using persistent storage first, fallback to events
 * The escrow contract uses an independent giftCounter, so tokenId ≠ giftId
 * Priority: Redis/KV lookup → Memory cache → Event querying (last resort)
 */
export async function getGiftIdFromTokenId(tokenId: string | number): Promise<number | null> {
  const tokenIdStr = tokenId.toString();
  
  // Check memory cache first (fastest)
  if (tokenIdToGiftIdCache.has(tokenIdStr)) {
    const cachedGiftId = tokenIdToGiftIdCache.get(tokenIdStr)!;
    console.log(`🎯 MAPPING MEMORY CACHE HIT: tokenId ${tokenId} → giftId ${cachedGiftId}`);
    return cachedGiftId;
  }

  // Try persistent storage (Redis/KV) - avoids RPC calls if available
  try {
    const persistentGiftId = await getGiftIdFromMapping(tokenId);
    if (persistentGiftId !== null) {
      // Cache in memory for future requests
      tokenIdToGiftIdCache.set(tokenIdStr, persistentGiftId);
      console.log(`🎯 MAPPING PERSISTENT HIT: tokenId ${tokenId} → giftId ${persistentGiftId}`);
      return persistentGiftId;
    }
  } catch (redisError) {
    console.warn(`⚠️ Redis lookup failed for ${tokenId}, proceeding with event fallback:`, redisError.message);
  }
  
  try {
    // PERFORMANCE FIX: Reduced logging for expensive RPC fallback
    console.log(`🔍 MAPPING FALLBACK: Searching blockchain events for tokenId ${tokenId} (last resort)`);
    
    // Use ethers for event querying (more reliable than ThirdWeb for this)
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
    
    // Event signature for GiftRegisteredFromMint
    const eventSignature = "GiftRegisteredFromMint(uint256,address,address,uint256,uint40,address,string,address)";
    const eventTopic = ethers.id(eventSignature);
    
    // Query events from escrow contract with RPC-safe chunking
    const currentBlock = await provider.getBlockNumber();
    const deploymentBlock = 28915000; // V2 contract deployment block
    const maxRpcBlocks = 500; // Safe RPC limit for Alchemy
    const searchRange = 10000; // Total range to search for the mapping
    
    // Start with recent blocks, most gifts will be recent
    const searchStartBlock = Math.max(deploymentBlock, currentBlock - searchRange);
    
    const allLogs: any[] = [];
    let totalChunks = Math.ceil((currentBlock - searchStartBlock) / maxRpcBlocks);
    let processedChunks = 0;
    
    // Query in safe chunks with minimal logging
    for (let fromBlock = searchStartBlock; fromBlock <= currentBlock; fromBlock += maxRpcBlocks) {
      const toBlock = Math.min(fromBlock + maxRpcBlocks - 1, currentBlock);
      processedChunks++;
      
      try {
        const chunkLogs = await provider.getLogs({
          address: ESCROW_CONTRACT_ADDRESS,
          topics: [eventTopic],
          fromBlock: fromBlock,
          toBlock: toBlock
        });
        allLogs.push(...chunkLogs);
        
        // Only log significant findings to reduce noise
        if (chunkLogs.length > 0) {
          console.log(`📦 MAPPING: Found ${chunkLogs.length} events in chunk ${processedChunks}/${totalChunks}`);
        }
      } catch (error: any) {
        // Only log critical chunk failures
        if (processedChunks % 5 === 0 || processedChunks === totalChunks) {
          console.warn(`⚠️ MAPPING: Chunk ${processedChunks}/${totalChunks} failed:`, error.message);
        }
        continue;
      }
    }
    
    // Summary log instead of per-chunk logs
    console.log(`✅ MAPPING: Processed ${processedChunks} chunks, found ${allLogs.length} total events`);
    
    // Parse ALL events and cache them for future use
    const mappings = new Map<string, number>();
    
    for (const log of allLogs) {
      try {
        // Event structure: GiftRegisteredFromMint(uint256 indexed giftId, address indexed creator, address indexed nftContract, uint256 tokenId, uint40 expiresAt, address gate, string giftMessage, address registeredBy)
        // Indexed: giftId (topics[1]), creator (topics[2]), nftContract (topics[3])
        // Non-indexed: tokenId, expiresAt, gate, giftMessage, registeredBy
        
        const giftId = BigInt(log.topics[1]).toString(); // First indexed parameter (giftId)
        
        // Parse the non-indexed data from log.data
        const abiCoder = new ethers.AbiCoder();
        const decoded = abiCoder.decode(
          ['uint256', 'uint40', 'address', 'string', 'address'], // tokenId, expiresAt, gate, giftMessage, registeredBy
          log.data
        );
        const eventTokenId = decoded[0].toString(); // tokenId is first in data
        
        // Cache this mapping in memory for batch processing
        mappings.set(eventTokenId, parseInt(giftId));
      } catch (decodeError) {
        console.warn('⚠️ MAPPING: Failed to decode event:', decodeError.message);
        continue;
      }
    }
    
    // BATCH OPTIMIZATION: Store all found mappings at once
    if (mappings.size > 0) {
      console.log(`💾 BATCH STORING: ${mappings.size} mappings to Redis...`);
      
      try {
        // Convert to batch format
        const batchMappings = Array.from(mappings.entries()).map(([tokenId, giftId]) => ({
          tokenId,
          giftId
        }));
        
        // Batch store to persistent storage
        await batchStoreGiftMappings(batchMappings);
        
        // Update memory cache
        mappings.forEach((gId, tId) => {
          tokenIdToGiftIdCache.set(tId, gId);
        });
        
        console.log(`✅ BATCH STORED: ${mappings.size} mappings (Redis + Memory)`);
      } catch (batchError) {
        console.warn('⚠️ Batch storage failed, falling back to individual stores:', batchError.message);
        
        // Fallback: individual stores
        for (const [tokenId, giftId] of mappings.entries()) {
          try {
            await storeGiftMapping(tokenId, giftId);
            tokenIdToGiftIdCache.set(tokenId, giftId);
          } catch (individualError) {
            console.warn(`⚠️ Failed to store mapping ${tokenId}→${giftId}:`, individualError.message);
          }
        }
      }
    }
    
    // Look for our specific tokenId
    const giftId = mappings.get(tokenIdStr);
    if (giftId) {
      console.log(`✅ MAPPING SUCCESS: tokenId ${tokenId} → giftId ${giftId} (cached ${mappings.size} mappings)`);
      return giftId;
    }
    
    console.log(`❌ MAPPING: No giftId found for tokenId ${tokenId} after searching ${processedChunks} chunks`);
    return null;
    
  } catch (error) {
    console.error('❌ MAPPING ERROR:', error);
    return null;
  }
}

/**
 * HELPER: Reusable NFT ownership verification with retries
 * Consolidates the duplicated ownership check logic
 */
export async function verifyNFTOwnership(
  nftContract: string,
  tokenId: string | number,
  expectedOwner: string,
  maxAttempts: number = 5,
  delayMs: number = 1000
): Promise<{ success: boolean; actualOwner?: string; error?: string }> {
  let attempts = 0;
  let currentOwner: string | undefined;
  let lastError: string | undefined;
  
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
  const nftContractABI = ["function ownerOf(uint256 tokenId) view returns (address)"];
  const nftContractCheck = new ethers.Contract(nftContract, nftContractABI, provider);
  
  console.log(`🔍 OWNERSHIP VERIFY: tokenId ${tokenId}, attempts ${maxAttempts}`);
  
  while (attempts < maxAttempts) {
    try {
      // Wait longer on subsequent attempts (exponential backoff)
      if (attempts > 0) {
        const backoffDelay = delayMs * Math.pow(1.5, attempts - 1);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
      
      currentOwner = await nftContractCheck.ownerOf(tokenId);
      
      if (currentOwner.toLowerCase() === expectedOwner.toLowerCase()) {
        console.log(`✅ OWNERSHIP CONFIRMED: tokenId ${tokenId} → ${currentOwner.slice(0,8)}...`);
        return { success: true, actualOwner: currentOwner };
      } else {
        // Only log detailed info on final attempt or every 2nd attempt
        if (attempts === maxAttempts - 1 || attempts % 2 === 1) {
          console.log(`⏳ OWNERSHIP CHECK ${attempts + 1}/${maxAttempts}: Expected ${expectedOwner.slice(0,8)}..., Got ${currentOwner.slice(0,8)}...`);
        }
        lastError = `Owner mismatch: expected ${expectedOwner}, got ${currentOwner}`;
      }
    } catch (error: any) {
      lastError = error.message;
      
      // Only log errors on critical attempts
      if (attempts === maxAttempts - 1 || attempts === 0) {
        console.log(`❌ OWNERSHIP ERROR ${attempts + 1}/${maxAttempts}: ${error.message}`);
      }
      
      // Special handling for common race condition errors (silent retry)
      if (error.message.includes('ERC721: invalid token ID') || 
          error.message.includes('ERC721NonexistentToken')) {
        // Silent retry for token existence issues
      }
    }
    attempts++;
  }
  
  const finalError = `OWNERSHIP FAILURE: After ${maxAttempts} attempts. Expected: ${expectedOwner.slice(0,8)}..., Got: ${(currentOwner || 'unknown').slice(0,8)}...`;
  
  console.error('❌ OWNERSHIP FINAL FAILURE:', finalError);
  
  return { 
    success: false, 
    actualOwner: currentOwner,
    error: finalError
  };
}

/**
 * ThirdWeb v5 Return Type Information
 * 
 * ✅ CONFIRMED BEHAVIOR IN THIRDWEB v5:
 * Contract functions that return tuples are returned as readonly arrays.
 * Access return values by array indices based on the ABI return order.
 * 
 * EXAMPLES:
 * - getGift() returns: [creator, expirationTime, nftContract, tokenId, passwordHash, status]
 * - canClaimGift() returns: [true, 86400n] (tuple format)
 * 
 * Access return values using array indices: giftData[0], giftData[1], etc.
 * 
 * USAGE PATTERN:
 * ```typescript
 * const giftData = await readContract({ contract, method: "getGift", params: [tokenId] });
 * const gift: EscrowGift = {
 *   creator: giftData[0],
 *   expirationTime: giftData[1],
 *   // ... etc
 * };
 * ```
 */


/**
 * ZERO CUSTODY FUNCTION: Prepare registerGiftMinted call for V2 contract
 * This function allows direct mint-to-escrow without requiring deployer ownership
 */
export function prepareRegisterGiftMintedCall(
  tokenId: string | number,
  nftContract: string,
  creator: string,
  password: string,
  salt: string,
  timeframeDays: number,
  giftMessage: string,
  gate: string = '0x0000000000000000000000000000000000000000'
) {
  const contract = getEscrowContract();
  
  // CRITICAL DEBUG: Log all parameters before calling contract
  const tokenIdBigInt = BigInt(tokenId);
  const timeframeBigInt = BigInt(timeframeDays);
  
  console.log('🔍 REGISTER_GIFT_MINTED PARAMS:', {
    tokenId: tokenId.toString(),
    tokenIdBigInt: tokenIdBigInt.toString(),
    nftContract: nftContract.slice(0, 10) + '...',
    creator: creator.slice(0, 10) + '...',
    passwordLength: password.length,
    saltLength: salt.length,
    timeframeDays,
    timeframeBigInt: timeframeBigInt.toString(),
    giftMessageLength: giftMessage.length,
    gate: gate.slice(0, 10) + '...'
  });
  
  // VALIDATION: Ensure tokenId is not 0
  if (tokenIdBigInt === 0n) {
    console.error('❌ CRITICAL: tokenId is 0, this will cause mapping validation to fail!');
    throw new Error(`Invalid tokenId: ${tokenId} - cannot be 0`);
  }
  
  return prepareContractCall({
    contract,
    method: "registerGiftMinted",
    params: [
      tokenIdBigInt,
      nftContract,
      creator,               // ← NEW: Original creator address
      password,              // ← Password as string, not hash
      salt as `0x${string}`, // ← Salt with type assertion
      timeframeBigInt,
      giftMessage,
      gate                   // ← Gate parameter (defaults to zero address)
    ]
  });
}

export function prepareClaimGiftCall(
  tokenId: string | number,
  password: string,
  salt: string,
  gateData: string = '0x'
) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "claimGift",
    params: [
      BigInt(tokenId),
      password,
      salt as `0x${string}`,  // ← FIX: Type assertion for salt parameter
      gateData as `0x${string}`  // ← FIX: Type assertion for gateData parameter
    ]
  });
}

/**
 * CRITICAL FIX: Prepare claim call using giftId (not tokenId)
 * Use this for the corrected escrow claim flow
 */
export function prepareClaimGiftByIdCall(
  giftId: string | number,
  password: string,
  salt: string,
  gateData: string = '0x'
) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "claimGift",
    params: [
      BigInt(giftId),
      password,
      salt as `0x${string}`,
      gateData as `0x${string}`
    ]
  });
}

// REMOVED: prepareClaimGiftForCall - function does not exist in deployed contract
// Use prepareClaimGiftCall instead

export function prepareReturnExpiredGiftCall(tokenId: string | number) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "returnExpiredGift",
    params: [BigInt(tokenId)]
  });
}

/**
 * CRITICAL FIX: Prepare return expired gift call using giftId (not tokenId)
 */
export function prepareReturnExpiredGiftByIdCall(giftId: string | number) {
  const contract = getEscrowContract();
  
  return prepareContractCall({
    contract,
    method: "returnExpiredGift",
    params: [BigInt(giftId)]
  });
}

/**
 * Check for expired gifts and return them to creators
 * This solves the issue where NFTs get stuck in escrow after expiration
 */
export async function returnExpiredGifts(): Promise<{
  success: boolean;
  returned: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let returned = 0;
  
  try {
    // Get the current giftCounter
    const escrowContract = getEscrowContract();
    const counter = await readContract({
      contract: escrowContract,
      method: "giftCounter",
      params: []
    });
    
    console.log(`🔍 RETURN EXPIRED: Checking ${counter} gifts for expiration`);
    
    // Check each gift
    for (let giftId = 1; giftId <= Number(counter); giftId++) {
      try {
        const [giftData, canClaim] = await Promise.all([
          readContract({
            contract: escrowContract,
            method: "getGift",
            params: [BigInt(giftId)]
          }),
          readContract({
            contract: escrowContract,
            method: "canClaimGift",
            params: [BigInt(giftId)]
          })
        ]);
        
        // Check if gift is expired and still active (status = 0)
        const status = giftData[5]; // status field
        const timeRemaining = Number((canClaim as any)[1]);
        
        if (status === 0 && timeRemaining === 0) {
          console.log(`🔄 RETURN EXPIRED: Gift ${giftId} is expired, attempting return...`);
          
          // Prepare return transaction
          const returnTx = prepareReturnExpiredGiftByIdCall(giftId);
          
          // Execute return (using deployer account for now)
          const deployerAccount = privateKeyToAccount({
            client: createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID! }),
            privateKey: process.env.PRIVATE_KEY_DEPLOY!
          });
          
          const result = await sendTransaction({
            transaction: returnTx,
            account: deployerAccount
          });
          
          await waitForReceipt({
            client: createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID! }),
            chain: baseSepolia,
            transactionHash: result.transactionHash
          });
          
          console.log(`✅ RETURN EXPIRED: Gift ${giftId} returned successfully`);
          returned++;
        }
      } catch (error) {
        const errorMsg = `Failed to return gift ${giftId}: ${error.message}`;
        console.error('❌ RETURN EXPIRED:', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    return {
      success: true,
      returned,
      errors
    };
    
  } catch (error) {
    const errorMsg = `Failed to check expired gifts: ${error.message}`;
    console.error('❌ RETURN EXPIRED:', errorMsg);
    return {
      success: false,
      returned,
      errors: [errorMsg, ...errors]
    };
  }
}

/**
 * Gift Status and Timing Functions
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const remainingSeconds = seconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export function isGiftExpired(expirationTime: bigint): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return Number(expirationTime) <= currentTime;
}

export function getGiftStatus(gift: EscrowGift): 'active' | 'expired' | 'claimed' | 'returned' {
  // Status from contract: 0=Active, 1=Claimed, 2=Returned
  if (gift.status === 1) return 'claimed';
  if (gift.status === 2) return 'returned';
  
  // Check if expired
  if (isGiftExpired(gift.expirationTime)) return 'expired';
  
  return 'active';
}

export function getGiftStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-600';
    case 'expired': return 'text-orange-600';
    case 'claimed': return 'text-blue-600';
    case 'returned': return 'text-gray-600';
    default: return 'text-gray-400';
  }
}

export function getGiftStatusBadgeColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'expired': return 'bg-orange-100 text-orange-800';
    case 'claimed': return 'bg-blue-100 text-blue-800';
    case 'returned': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-400';
  }
}

/**
 * Gift Link Generation
 */
export function generateGiftLink(tokenId: string | number, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/gift/claim/${tokenId}`;
}

export function generateGiftShareMessage(tokenId: string | number, giftMessage?: string): string {
  const link = generateGiftLink(tokenId);
  const message = giftMessage ? `"${giftMessage}"` : 'a special gift';
  
  return `🎁 You've received ${message}! Click here to claim it: ${link}`;
}

/**
 * Error Handling
 */
export function parseEscrowError(error: any): string {
  const errorMessage = error?.message || error?.reason || String(error);
  
  // Common escrow errors
  if (errorMessage.includes('Gift already claimed')) {
    return 'This gift has already been claimed.';
  }
  if (errorMessage.includes('Gift expired')) {
    return 'This gift has expired and cannot be claimed.';
  }
  if (errorMessage.includes('Invalid password')) {
    return 'The password is incorrect. Please check and try again.';
  }
  if (errorMessage.includes('Gift not found')) {
    return 'This gift does not exist or has been removed.';
  }
  if (errorMessage.includes('Only creator can return')) {
    return 'Only the gift creator can return this gift.';
  }
  if (errorMessage.includes('Gift not expired')) {
    return 'This gift has not expired yet and cannot be returned.';
  }
  
  // Generic fallback
  return errorMessage.slice(0, 100) + (errorMessage.length > 100 ? '...' : '');
}

/**
 * Validation Functions
 */
export function validateGiftMessage(message: string): { valid: boolean; message?: string } {
  if (message.length > 200) {
    return { valid: false, message: 'Gift message must be less than 200 characters' };
  }
  return { valid: true };
}

/**
 * Robust sanitization for gift messages to prevent XSS
 * Implements comprehensive HTML/script filtering beyond basic character replacement
 */
export function sanitizeGiftMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  let sanitized = message;

  // 1. Remove all HTML/XML tags completely
  sanitized = sanitized.replace(/<[^>]*>/gi, '');
  
  // 2. Remove script-like patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/onload/gi, '');
  sanitized = sanitized.replace(/onerror/gi, '');
  sanitized = sanitized.replace(/onclick/gi, '');
  sanitized = sanitized.replace(/onmouse/gi, '');
  sanitized = sanitized.replace(/onfocus/gi, '');
  sanitized = sanitized.replace(/onblur/gi, '');
  sanitized = sanitized.replace(/onchange/gi, '');
  sanitized = sanitized.replace(/onsubmit/gi, '');
  
  // 3. Remove data URIs and blob URLs
  sanitized = sanitized.replace(/data:[^;]*;base64,/gi, '');
  sanitized = sanitized.replace(/blob:/gi, '');
  
  // 4. Remove potentially dangerous characters and encode HTML entities
  sanitized = sanitized.replace(/[<>\"'&]/g, (match) => {
    const entities: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return entities[match] || match;
  });
  
  // 5. Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // 6. Limit consecutive whitespace
  sanitized = sanitized.replace(/\s{4,}/g, '   '); // Max 3 consecutive spaces
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  
  // 7. Trim and normalize whitespace
  sanitized = sanitized.trim();
  
  // 8. Final validation - ensure it's still under length limit
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }
  
  return sanitized;
}

export function validateTokenId(tokenId: string): { valid: boolean; message?: string } {
  const id = parseInt(tokenId);
  if (isNaN(id) || id <= 0) {
    return { valid: false, message: 'Invalid token ID' };
  }
  return { valid: true };
}

export function validateAddress(address: string): { valid: boolean; message?: string } {
  try {
    ethers.getAddress(address);
    return { valid: true };
  } catch {
    return { valid: false, message: 'Invalid Ethereum address' };
  }
}

/**
 * Contract Constants Cache
 */
let timeConstantsCache: Record<string, number> | null = null;

export async function getTimeConstants(): Promise<Record<string, number>> {
  if (timeConstantsCache) return timeConstantsCache;
  
  try {
    const contract = getEscrowContract();
    
    const [fifteenMin, sevenDays, fifteenDays, thirtyDays] = await Promise.all([
      readContract({
        contract,
        method: "FIFTEEN_MINUTES",
        params: []
      }),
      readContract({
        contract,
        method: "SEVEN_DAYS",
        params: []
      }),
      readContract({
        contract,
        method: "FIFTEEN_DAYS",
        params: []
      }),
      readContract({
        contract,
        method: "THIRTY_DAYS",
        params: []
      })
    ]);
    
    timeConstantsCache = {
      FIFTEEN_MINUTES: Number(fifteenMin),
      SEVEN_DAYS: Number(sevenDays),
      FIFTEEN_DAYS: Number(fifteenDays),
      THIRTY_DAYS: Number(thirtyDays)
    };
    
    return timeConstantsCache;
  } catch (error) {
    console.error('Failed to get time constants:', error);
    // Fallback to known values
    return {
      FIFTEEN_MINUTES: 900,    // 15 minutes
      SEVEN_DAYS: 604800,      // 7 days
      FIFTEEN_DAYS: 1296000,   // 15 days
      THIRTY_DAYS: 2592000     // 30 days
    };
  }
}