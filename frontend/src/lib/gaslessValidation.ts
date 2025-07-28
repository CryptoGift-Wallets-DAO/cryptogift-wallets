/**
 * ENHANCED GASLESS VALIDATION
 * Anti-double minting mechanisms for temporal escrow system
 * Prevents transaction replay attacks and ensures single-use operations
 */

import { ethers } from 'ethers';
import { createThirdwebClient } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Transaction tracking for anti-double minting
interface TransactionAttempt {
  userAddress: string;
  nonce: string;
  timestamp: number;
  metadataHash: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
}

// MANDATORY Redis integration for anti-double minting security
import { validateRedisForCriticalOps, getRedisStatus } from './redisConfig';

// Helper function to wrap Redis operations with timeout protection
async function redisWithTimeout<T>(operation: Promise<T>, timeoutMs: number = 3000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs)
  );
  
  return Promise.race([operation, timeoutPromise]);
}

// REMOVED: Fallback in-memory stores eliminated for security
// All anti-double minting now requires Redis for persistence

/**
 * Get Redis connection status for gasless validation monitoring
 */
export function getGaslessRedisStatus(): { status: string; message: string; hasRedis: boolean } {
  const redisStatus = getRedisStatus();
  
  switch (redisStatus.status) {
    case 'connected':
      return {
        status: 'connected',
        message: 'Redis connected for gasless validation (MANDATORY)',
        hasRedis: true
      };
    case 'error':
    case 'missing':
      return {
        status: 'error',
        message: 'SECURITY CRITICAL: Redis connection failed - anti-double minting disabled',
        hasRedis: false
      };
    default:
      return {
        status: 'error',
        message: 'SECURITY CRITICAL: Redis status unknown',
        hasRedis: false
      };
  }
}

/**
 * Generate unique transaction nonce for user (Redis-based for persistence)
 */
export async function generateUserNonce(userAddress: string): Promise<`0x${string}`> {
  const redis = validateRedisForCriticalOps('Nonce generation');
  
  const userKey = `user_nonce:${userAddress.toLowerCase()}`;
  
  try {
    // Atomic increment for reliable nonce generation
    const currentNonce = await redis.incr(userKey);
    
    // Set expiration on the key (24 hours)
    await redis.expire(userKey, 24 * 60 * 60);
    
    // Include timestamp for additional uniqueness
    const timestamp = Date.now();
    const nonceString = `${userAddress.toLowerCase()}_${currentNonce}_${timestamp}`;
    
    return ethers.keccak256(ethers.toUtf8Bytes(nonceString)) as `0x${string}`;
  } catch (error) {
    console.error('❌ Nonce generation failed:', error);
    throw new Error(`Nonce generation failed: ${error.message}`);
  }
}

/**
 * Generate metadata hash for transaction deduplication
 */
export function generateMetadataHash(
  userAddress: string,
  metadataUri: string,
  amount: number,
  escrowConfig?: any
): `0x${string}` {
  const hashData = JSON.stringify({
    user: userAddress.toLowerCase(),
    metadata: metadataUri,
    amount,
    escrow: escrowConfig ? {
      password: escrowConfig.password ? '***REDACTED***' : null,
      timeframe: escrowConfig.timeframe,
      message: escrowConfig.giftMessage
    } : null,
    timestamp: Math.floor(Date.now() / 60000) // 1-minute window
  });
  
  return ethers.keccak256(ethers.toUtf8Bytes(hashData)) as `0x${string}`;
}

/**
 * Validate transaction attempt against double-minting (Redis MANDATORY)
 */
export async function validateTransactionAttempt(
  userAddress: string,
  metadataUri: string,
  amount: number,
  escrowConfig?: any
): Promise<{
  valid: boolean;
  nonce: string;
  reason?: string;
  existingTxHash?: string;
}> {
  const redis = validateRedisForCriticalOps('Transaction validation');
  
  const metadataHash = generateMetadataHash(userAddress, metadataUri, amount, escrowConfig);
  
  try {
    const key = `tx_attempt:${userAddress.toLowerCase()}:${metadataHash}`;
    
    const existing = await redisWithTimeout(redis.get(key));
    
    if (existing && typeof existing === 'string') {
      const attemptData = JSON.parse(existing);
      
      // Check if completed transaction exists
      if (attemptData.status === 'completed') {
        return {
          valid: false,
          nonce: '',
          reason: 'Identical transaction already completed',
          existingTxHash: attemptData.transactionHash
        };
      }
      
      // Check if recent pending transaction exists (< 2 minutes)
      if (attemptData.status === 'pending' && 
          Date.now() - attemptData.timestamp < (2 * 60 * 1000)) {
        return {
          valid: false,
          nonce: '',
          reason: 'Similar transaction already in progress'
        };
      }
    }
    
    // Generate new nonce for valid transaction
    const nonce = await generateUserNonce(userAddress);
    
    console.log('✅ Redis validation passed for user:', userAddress.slice(0, 10) + '...');
    return { valid: true, nonce };
    
  } catch (error) {
    console.error('❌ Transaction validation failed:', error);
    throw new Error(`Transaction validation failed: ${error.message}`);
  }
}

/**
 * Register transaction attempt (Redis MANDATORY)
 */
export async function registerTransactionAttempt(
  userAddress: string,
  nonce: string,
  metadataUri: string,
  amount: number,
  escrowConfig?: any
): Promise<void> {
  const redis = validateRedisForCriticalOps('Transaction registration');
  
  const metadataHash = generateMetadataHash(userAddress, metadataUri, amount, escrowConfig);
  
  const attempt: TransactionAttempt = {
    userAddress: userAddress.toLowerCase(),
    nonce,
    timestamp: Date.now(),
    metadataHash,
    status: 'pending'
  };
  
  try {
    const key = `tx_attempt:${userAddress.toLowerCase()}:${metadataHash}`;
    
    await redisWithTimeout(
      redis.setex(key, 300, JSON.stringify(attempt)) // 5 minutes TTL
    );
    console.log('📝 Transaction attempt registered in Redis:', {
      nonce: nonce.slice(0, 10) + '...',
      user: userAddress.slice(0, 10) + '...',
      metadataHash: metadataHash.slice(0, 10) + '...'
    });
  } catch (error) {
    console.error('❌ Transaction registration failed:', error);
    throw new Error(`Transaction registration failed: ${error.message}`);
  }
}

/**
 * Mark transaction as completed (Redis MANDATORY)
 */
export async function markTransactionCompleted(
  nonce: string,
  transactionHash: string
): Promise<void> {
  const redis = validateRedisForCriticalOps('Transaction completion tracking');
  
  try {
    // Store completion record with nonce mapping
    const completionKey = `tx_completed:${nonce}`;
    const completionData = {
      nonce,
      transactionHash,
      timestamp: Date.now(),
      status: 'completed'
    };
    
    await redisWithTimeout(
      redis.setex(completionKey, 24 * 60 * 60, JSON.stringify(completionData)) // 24 hours TTL
    );
    
    console.log('✅ Transaction completed (Redis):', {
      nonce: nonce.slice(0, 10) + '...',
      txHash: transactionHash
    });
  } catch (error) {
    console.error('❌ Transaction completion tracking failed:', error);
    throw new Error(`Transaction completion tracking failed: ${error.message}`);
  }
}

/**
 * Mark transaction as failed (Redis MANDATORY)
 */
export async function markTransactionFailed(nonce: string, reason?: string): Promise<void> {
  const redis = validateRedisForCriticalOps('Transaction failure tracking');
  
  try {
    // Store failure record with nonce mapping
    const failureKey = `tx_failed:${nonce}`;
    const failureData = {
      nonce,
      reason: reason || 'Unknown error',
      timestamp: Date.now(),
      status: 'failed'
    };
    
    await redisWithTimeout(
      redis.setex(failureKey, 24 * 60 * 60, JSON.stringify(failureData)) // 24 hours TTL
    );
    
    console.log('❌ Transaction failed (Redis):', {
      nonce: nonce.slice(0, 10) + '...',
      reason: reason || 'Unknown error'
    });
  } catch (error) {
    console.error('❌ Transaction failure tracking failed:', error);
    throw new Error(`Transaction failure tracking failed: ${error.message}`);
  }
}

/**
 * Clean up old transaction attempts (Redis-based, run periodically)
 */
export async function cleanupOldTransactions(): Promise<void> {
  try {
    const redis = validateRedisForCriticalOps('Transaction cleanup');
    // Note: Redis TTL handles automatic cleanup, this is for manual cleanup if needed
    console.log('🧹 Redis TTL handles automatic cleanup of old transactions');
  } catch (error) {
    console.warn('⚠️ Cannot cleanup: Redis required for transaction cleanup');
    console.error('❌ Transaction cleanup failed:', error);
  }
}

/**
 * Enhanced gasless transaction verification with better error handling
 */
export async function verifyGaslessTransaction(
  transactionHash: string,
  expectedUserAddress: string,
  expectedTokenId?: string
): Promise<{
  verified: boolean;
  tokenId?: string;
  events?: any[];
  error?: string;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Get transaction receipt with retry logic
    let receipt = null;
    for (let i = 0; i < 3; i++) {
      try {
        receipt = await provider.getTransactionReceipt(transactionHash);
        if (receipt) break;
        
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (retryError) {
        console.warn(`Transaction receipt retry ${i + 1} failed:`, retryError);
      }
    }
    
    if (!receipt) {
      return { verified: false, error: 'Transaction receipt not found after retries' };
    }
    
    if (receipt.status !== 1) {
      return { verified: false, error: 'Transaction failed on blockchain' };
    }
    
    // Parse events from logs with enhanced error handling
    const events = [];
    let foundTokenId = null;
    let foundEscrowCreation = false;
    
    console.log(`🔍 Analyzing ${receipt.logs.length} transaction logs for verification`);
    
    for (const log of receipt.logs) {
      try {
        // Check for Transfer event (ERC721)
        const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        if (log.topics[0] === transferEventSignature && log.topics.length >= 4) {
          const tokenId = BigInt(log.topics[3]).toString();
          const to = ethers.getAddress('0x' + log.topics[2].slice(26));
          const from = ethers.getAddress('0x' + log.topics[1].slice(26));
          
          events.push({
            type: 'Transfer',
            tokenId,
            from,
            to,
            address: log.address,
            contract: log.address
          });
          
          console.log(`📝 Found Transfer event: Token ${tokenId} from ${from.slice(0, 10)}... to ${to.slice(0, 10)}...`);
          
          // For escrow mints, NFT should go to escrow contract
          // For direct mints, NFT should go to user
          foundTokenId = tokenId;
        }
        
        // Check for GiftCreated event (if escrow)
        const giftCreatedSignature = ethers.id("GiftCreated(uint256,address,address,uint256,string)");
        if (log.topics[0] === giftCreatedSignature) {
          const tokenId = BigInt(log.topics[1]).toString();
          const creator = ethers.getAddress('0x' + log.topics[2].slice(26));
          
          events.push({
            type: 'GiftCreated',
            tokenId,
            creator,
            address: log.address
          });
          
          console.log(`🎁 Found GiftCreated event: Token ${tokenId} by creator ${creator.slice(0, 10)}...`);
          foundEscrowCreation = true;
          foundTokenId = tokenId;
        }
        
      } catch (logError) {
        console.warn('⚠️ Error parsing log:', logError);
        continue;
      }
    }
    
    // Enhanced verification logic
    if (expectedTokenId && foundTokenId !== expectedTokenId) {
      return { 
        verified: false, 
        error: `Token ID mismatch: expected ${expectedTokenId}, found ${foundTokenId}`,
        tokenId: foundTokenId,
        events 
      };
    }
    
    // Consider transaction verified if we found any token ID
    const isVerified = foundTokenId !== null;
    
    console.log(`✅ Transaction verification result:`, {
      verified: isVerified,
      tokenId: foundTokenId,
      hasEscrowEvent: foundEscrowCreation,
      eventsFound: events.length
    });
    
    return {
      verified: isVerified,
      tokenId: foundTokenId,
      events
    };
    
  } catch (error: any) {
    console.error('❌ Transaction verification failed:', error);
    return { 
      verified: false, 
      error: error.message || 'Verification failed' 
    };
  }
}

/**
 * Check if a "failed" gasless transaction actually succeeded on-chain
 */
export async function checkGaslessTransactionActuallySucceeded(
  deployerAddress: string,
  expectedTokenId?: string,
  maxBlocksToCheck: number = 10
): Promise<{
  found: boolean;
  transactionHash?: string;
  tokenId?: string;
  blockNumber?: number;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`🔍 Checking last ${maxBlocksToCheck} blocks for potential gasless success...`);
    
    // Check recent blocks for transactions from deployer
    for (let i = 0; i < maxBlocksToCheck; i++) {
      const blockNumber = currentBlock - i;
      
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block || !block.transactions) continue;
        
        for (const tx of block.transactions) {
          // Skip if tx is just a hash string instead of transaction object
          if (typeof tx === 'string') continue;
          
          // Type assertion after string check
          const transaction = tx as any;
          
          // Check if transaction is from deployer (gasless transactions appear as deployer transactions)
          if (transaction.from && transaction.from.toLowerCase() === deployerAddress.toLowerCase()) {
            
            // Get transaction receipt to check for NFT mint events
            const receipt = await provider.getTransactionReceipt(transaction.hash);
            if (!receipt || receipt.status !== 1) continue;
            
            // Parse logs for Transfer events
            for (const log of receipt.logs) {
              const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
              
              if (log.topics[0] === transferEventSignature && log.topics.length >= 4) {
                const tokenId = BigInt(log.topics[3]).toString();
                
                // If we have an expected token ID, check for match
                if (expectedTokenId && tokenId === expectedTokenId) {
                  console.log(`✅ Found matching gasless transaction: ${transaction.hash} with token ${tokenId}`);
                  return {
                    found: true,
                    transactionHash: transaction.hash,
                    tokenId,
                    blockNumber
                  };
                }
                
                // If no expected token ID, return the most recent mint transaction
                if (!expectedTokenId) {
                  console.log(`✅ Found recent gasless transaction: ${transaction.hash} with token ${tokenId}`);
                  return {
                    found: true,
                    transactionHash: transaction.hash,
                    tokenId,
                    blockNumber
                  };
                }
              }
            }
          }
        }
      } catch (blockError) {
        console.warn(`⚠️ Error checking block ${blockNumber}:`, blockError);
        continue;
      }
    }
    
    console.log('❌ No matching gasless transaction found in recent blocks');
    return { found: false };
    
  } catch (error: any) {
    console.error('❌ Error checking for gasless transaction success:', error);
    return { found: false };
  }
}

/**
 * Enhanced biconomy transaction status checking
 */
export async function checkBiconomyTransactionStatus(
  userOpHash: string,
  maxRetries: number = 30,
  retryInterval: number = 2000
): Promise<{
  success: boolean;
  transactionHash?: string;
  receipt?: any;
  error?: string;
}> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // This would integrate with Biconomy's status API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL}/status/${userOpHash}`);
      
      if (response.ok) {
        const status = await response.json();
        
        if (status.transactionHash) {
          // Verify the transaction on-chain
          const verification = await verifyGaslessTransaction(
            status.transactionHash,
            status.userAddress,
            status.tokenId
          );
          
          return {
            success: verification.verified,
            transactionHash: status.transactionHash,
            receipt: status,
            error: verification.error
          };
        }
        
        if (status.status === 'failed') {
          return {
            success: false,
            error: status.reason || 'User operation failed'
          };
        }
      }
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
      
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxRetries - 1) {
        return {
          success: false,
          error: error.message || 'Status check failed'
        };
      }
    }
  }
  
  return {
    success: false,
    error: 'Transaction status check timed out'
  };
}

/**
 * Rate limiting for gasless transactions per user
 */
const userRateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userAddress: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5; // 5 transactions per minute
  
  const userKey = userAddress.toLowerCase();
  const current = userRateLimits.get(userKey);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    userRateLimits.set(userKey, {
      count: 1,
      resetTime: now + windowMs
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }
  
  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  current.count += 1;
  
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime
  };
}

// REMOVED: Client-side cleanup eliminated
// Server-side cleanup now handled by dedicated API endpoint
// See /api/admin/cleanup-transactions.ts for programmatic cleanup