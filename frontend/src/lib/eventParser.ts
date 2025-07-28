/**
 * GIFT ESCROW EVENT PARSER - SOLUCIÓN DEFINITIVA
 * Parse determinístico de eventos GiftRegisteredFromMint del receipt
 * Elimina condiciones de carrera en mapping tokenId → giftId
 */

import { ethers } from 'ethers';
import { ESCROW_ABI } from './escrowABI';
import type { GiftRegisteredFromMintEvent } from './escrowABI';
import { normalizeAndValidateReceipt, needsNormalization } from './receiptNormalizer';

// ThirdWeb v5 compatible receipt interface
interface ThirdWebTransactionReceipt {
  logs: Array<{
    topics: string[];
    data: string;
    address?: string;
  }>;
  status: 'success' | 'reverted';
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
}

// Interface for parsed event result
export interface ParsedGiftEvent {
  success: true;
  giftId: number;
  tokenId: number;
  creator: string;
  nftContract: string;
  expiresAt: number;
  giftMessage: string;
  registeredBy: string;
}

export interface EventParseFailure {
  success: false;
  error: string;
  logsFound: number;
  contractAddress?: string;
}

export type EventParseResult = ParsedGiftEvent | EventParseFailure;

/**
 * CHUNKED GETLOGS: Safe getLogs with automatic chunking
 * Handles RPC limits by breaking large ranges into ≤500 block chunks
 * Includes exponential backoff retry for failed requests
 */
async function getLogsWithChunking(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  eventTopic: string,
  fromBlock: number,
  toBlock: number,
  maxChunkSize: number = 500
): Promise<ethers.Log[]> {
  const totalRange = toBlock - fromBlock + 1;
  
  console.log(`🔍 CHUNKED GETLOGS: Scanning ${totalRange} blocks (${fromBlock} → ${toBlock})`);
  
  // If range is small, do single request
  if (totalRange <= maxChunkSize) {
    console.log(`📦 SINGLE CHUNK: Range ≤${maxChunkSize}, using single request`);
    
    try {
      const logs = await provider.getLogs({
        address: contractAddress,
        fromBlock,
        toBlock,
        topics: [eventTopic]
      });
      
      console.log(`✅ SINGLE CHUNK SUCCESS: Found ${logs.length} logs`);
      return logs;
      
    } catch (error) {
      console.warn(`⚠️ SINGLE CHUNK FAILED: ${(error as Error).message.slice(0, 100)}`);
      
      // If single request fails, fall back to chunking
      if (totalRange === 1) {
        throw error; // Can't chunk a single block
      }
    }
  }
  
  // Chunk the range
  const chunks: Array<{ from: number; to: number }> = [];
  
  for (let start = fromBlock; start <= toBlock; start += maxChunkSize) {
    const end = Math.min(start + maxChunkSize - 1, toBlock);
    chunks.push({ from: start, to: end });
  }
  
  console.log(`📦 CHUNKING: Split into ${chunks.length} chunks of ≤${maxChunkSize} blocks`);
  
  const allLogs: ethers.Log[] = [];
  
  // Process chunks sequentially to avoid overwhelming RPC
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkSize = chunk.to - chunk.from + 1;
    
    console.log(`📦 CHUNK ${i + 1}/${chunks.length}: Blocks ${chunk.from}-${chunk.to} (${chunkSize} blocks)`);
    
    try {
      const chunkLogs = await getLogsWithRetry(
        provider,
        contractAddress,
        eventTopic,
        chunk.from,
        chunk.to
      );
      
      allLogs.push(...chunkLogs);
      console.log(`✅ CHUNK ${i + 1} SUCCESS: Found ${chunkLogs.length} logs`);
      
      // Small delay between chunks to be nice to RPC
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`❌ CHUNK ${i + 1} FAILED:`, (error as Error).message);
      
      // For critical failures, don't continue
      if ((error as Error).message.includes('429') || (error as Error).message.includes('rate limit')) {
        console.error('🚨 RATE LIMITED: Stopping chunked scan');
        throw error;
      }
      
      // For other errors, continue with next chunk
      console.warn(`⚠️ CHUNK ${i + 1} SKIPPED: Continuing with remaining chunks`);
    }
  }
  
  console.log(`✅ CHUNKED GETLOGS COMPLETE: Total ${allLogs.length} logs from ${chunks.length} chunks`);
  return allLogs;
}

/**
 * RETRY WRAPPER: getLogs with exponential backoff
 * Handles temporary RPC failures with intelligent retry
 */
async function getLogsWithRetry(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  eventTopic: string,
  fromBlock: number,
  toBlock: number,
  maxRetries: number = 3
): Promise<ethers.Log[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const logs = await provider.getLogs({
        address: contractAddress,
        fromBlock,
        toBlock,
        topics: [eventTopic]
      });
      
      if (attempt > 1) {
        console.log(`✅ RETRY SUCCESS: Attempt ${attempt} succeeded`);
      }
      
      return logs;
      
    } catch (error) {
      lastError = error as Error;
      
      console.warn(`⚠️ GETLOGS ATTEMPT ${attempt}/${maxRetries} FAILED:`, lastError.message.slice(0, 100));
      
      // Don't retry on certain errors
      if (lastError.message.includes('invalid') || lastError.message.includes('unsupported')) {
        console.error('🚫 NON-RETRYABLE ERROR: Not retrying');
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ RETRY DELAY: Waiting ${delay}ms before attempt ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`All ${maxRetries} getLogs attempts failed. Last error: ${lastError?.message}`);
}

/**
 * FALLBACK: Get logs by block range with chunking support
 * Uses provider.getLogs with intelligent chunking (≤500 blocks per request)
 * Handles RPC limits and ensures complete event discovery
 */
async function fallbackGetLogsByBlock(
  transactionHash: string,
  blockNumber: number,
  expectedTokenId?: string | number,
  contractAddress?: string
): Promise<EventParseResult> {
  try {
    console.log(`🔍 FALLBACK: Scanning block ${blockNumber} for GiftRegisteredFromMint event...`);
    
    // Create provider for direct RPC access
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Create event filter for GiftRegisteredFromMint
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
    if (!escrowAddress) {
      return {
        success: false,
        error: 'ESCROW_CONTRACT_ADDRESS not configured for fallback',
        logsFound: 0
      };
    }
    
    const iface = new ethers.Interface(ESCROW_ABI);
    const eventFragment = iface.getEvent('GiftRegisteredFromMint');
    const eventTopic = eventFragment.topicHash;
    
    console.log('🔍 FALLBACK: Event topic:', eventTopic);
    
    // Use chunked getLogs for better reliability
    const logs = await getLogsWithChunking(
      provider,
      escrowAddress,
      eventTopic,
      blockNumber,
      blockNumber
    );
    
    console.log(`📋 FALLBACK: Found ${logs.length} GiftRegisteredFromMint events in block ${blockNumber}`);
    
    // Parse each log to find our specific transaction
    for (const log of logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsed || parsed.name !== 'GiftRegisteredFromMint') continue;
        
        // Check if this log belongs to our transaction
        if (log.transactionHash.toLowerCase() !== transactionHash.toLowerCase()) {
          console.log(`⚠️ FALLBACK: Skipping event from different tx: ${log.transactionHash}`);
          continue;
        }
        
        const args = parsed.args;
        const eventData: ParsedGiftEvent = {
          success: true,
          giftId: Number(args.giftId),
          tokenId: Number(args.tokenId),
          creator: args.creator,
          nftContract: args.nftContract,
          expiresAt: Number(args.expiresAt),
          giftMessage: args.giftMessage || '',
          registeredBy: args.registeredBy
        };
        
        // Apply same strict filters as main parser
        if (expectedTokenId !== undefined && eventData.tokenId !== Number(expectedTokenId)) {
          console.warn(`⚠️ FALLBACK FILTER: TokenId mismatch. Expected ${expectedTokenId}, got ${eventData.tokenId}`);
          continue;
        }
        
        if (contractAddress && eventData.nftContract.toLowerCase() !== contractAddress.toLowerCase()) {
          console.warn(`⚠️ FALLBACK FILTER: Contract mismatch. Expected ${contractAddress}, got ${eventData.nftContract}`);
          continue;
        }
        
        console.log('✅ FALLBACK SUCCESS: Found matching event in block logs');
        return eventData;
        
      } catch (parseError) {
        console.warn('⚠️ FALLBACK: Failed to parse log:', (parseError as Error).message);
        continue;
      }
    }
    
    return {
      success: false,
      error: `No matching GiftRegisteredFromMint event found in block ${blockNumber} for tx ${transactionHash}`,
      logsFound: logs.length
    };
    
  } catch (error) {
    console.error('❌ FALLBACK ERROR:', error);
    return {
      success: false,
      error: `Fallback getLogs failed: ${(error as Error).message}`,
      logsFound: 0
    };
  }
}

/**
 * ENHANCED FALLBACK: Scan block range with chunking for missing events
 * Used when transaction is missing from receipt but we know approximate block
 */
export async function fallbackGetLogsByRange(
  contractAddress: string,
  expectedTokenId?: string | number,
  fromBlock?: number,
  toBlock?: number,
  maxBlockRange: number = 1000
): Promise<EventParseResult> {
  try {
    console.log('🔍 ENHANCED FALLBACK: Starting range scan for missing events...');
    
    // Create provider for direct RPC access
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Get escrow contract address
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
    if (!escrowAddress) {
      return {
        success: false,
        error: 'ESCROW_CONTRACT_ADDRESS not configured for range fallback',
        logsFound: 0
      };
    }
    
    // Determine scan range
    let scanFromBlock: number;
    let scanToBlock: number;
    
    if (fromBlock && toBlock) {
      scanFromBlock = fromBlock;
      scanToBlock = toBlock;
    } else if (fromBlock) {
      scanFromBlock = fromBlock;
      scanToBlock = fromBlock + maxBlockRange;
    } else {
      // Get latest block and scan backwards
      const latestBlock = await provider.getBlockNumber();
      scanToBlock = latestBlock;
      scanFromBlock = Math.max(0, latestBlock - maxBlockRange);
    }
    
    // Limit scan range to prevent excessive RPC calls
    const actualRange = scanToBlock - scanFromBlock + 1;
    if (actualRange > maxBlockRange) {
      scanToBlock = scanFromBlock + maxBlockRange - 1;
      console.warn(`⚠️ RANGE LIMITED: Capped scan to ${maxBlockRange} blocks (${scanFromBlock}-${scanToBlock})`);
    }
    
    console.log(`🔍 RANGE SCAN: Blocks ${scanFromBlock}-${scanToBlock} (${scanToBlock - scanFromBlock + 1} blocks)`);
    
    // Create event filter
    const iface = new ethers.Interface(ESCROW_ABI);
    const eventFragment = iface.getEvent('GiftRegisteredFromMint');
    const eventTopic = eventFragment.topicHash;
    
    // Use chunked getLogs
    const logs = await getLogsWithChunking(
      provider,
      escrowAddress,
      eventTopic,
      scanFromBlock,
      scanToBlock
    );
    
    console.log(`📋 RANGE SCAN: Found ${logs.length} GiftRegisteredFromMint events in range`);
    
    // Filter events by expectedTokenId if provided
    for (const log of logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsed || parsed.name !== 'GiftRegisteredFromMint') continue;
        
        const args = parsed.args;
        const eventData: ParsedGiftEvent = {
          success: true,
          giftId: Number(args.giftId),
          tokenId: Number(args.tokenId),
          creator: args.creator,
          nftContract: args.nftContract,
          expiresAt: Number(args.expiresAt),
          giftMessage: args.giftMessage || '',
          registeredBy: args.registeredBy
        };
        
        // Apply tokenId filter if provided
        if (expectedTokenId !== undefined && eventData.tokenId !== Number(expectedTokenId)) {
          continue;
        }
        
        // Apply contract filter if provided
        if (contractAddress && eventData.nftContract.toLowerCase() !== contractAddress.toLowerCase()) {
          continue;
        }
        
        console.log('✅ RANGE FALLBACK SUCCESS: Found matching event in range');
        console.log('📋 Event details:', {
          giftId: eventData.giftId,
          tokenId: eventData.tokenId,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash?.slice(0, 10) + '...'
        });
        
        return eventData;
        
      } catch (parseError) {
        console.warn('⚠️ RANGE SCAN: Failed to parse log:', (parseError as Error).message);
        continue;
      }
    }
    
    return {
      success: false,
      error: `No matching GiftRegisteredFromMint event found in range ${scanFromBlock}-${scanToBlock}`,
      logsFound: logs.length
    };
    
  } catch (error) {
    console.error('❌ RANGE FALLBACK ERROR:', error);
    return {
      success: false,
      error: `Range fallback failed: ${(error as Error).message}`,
      logsFound: 0
    };
  }
}

/**
 * Parse GiftRegisteredFromMint event from transaction receipt
 * DETERMINISTIC - returns exactly what happened on-chain
 * NORMALIZED - handles gasless/userOp receipts automatically
 */
export async function parseGiftRegisteredFromMintEvent(
  receipt: any, // Accept any receipt format
  expectedTokenId?: string | number,
  contractAddress?: string
): Promise<EventParseResult> {
  try {
    console.log('🔍 PARSING: Starting deterministic event parse with normalization...');
    console.log('📝 Original receipt type:', typeof receipt);
    
    // Step 1: Normalize receipt if needed (gasless/userOp → real receipt)
    let normalizedReceipt: ThirdWebTransactionReceipt;
    
    if (needsNormalization(receipt)) {
      console.log('🔄 NORMALIZATION: Receipt needs normalization (gasless/userOp)');
      
      const normalizationResult = await normalizeAndValidateReceipt(receipt);
      
      if (!normalizationResult.success) {
        const errorMsg = normalizationResult.success === false ? normalizationResult.error : 'Unknown normalization error';
        console.error('❌ NORMALIZATION FAILED:', errorMsg);
        return {
          success: false,
          error: `Receipt normalization failed: ${errorMsg}`,
          logsFound: 0
        };
      }
      
      normalizedReceipt = normalizationResult.receipt;
      
      console.log('✅ NORMALIZATION SUCCESS:', {
        realTxHash: normalizationResult.realTxHash.slice(0, 10) + '...',
        source: normalizationResult.source,
        logsCount: normalizedReceipt.logs.length
      });
      
    } else {
      console.log('✅ DIRECT RECEIPT: No normalization needed');
      normalizedReceipt = receipt as ThirdWebTransactionReceipt;
    }
    
    console.log('📝 Final receipt logs count:', normalizedReceipt.logs?.length || 0);
    
    if (!normalizedReceipt.logs || normalizedReceipt.logs.length === 0) {
      return {
        success: false,
        error: 'No logs found in normalized transaction receipt',
        logsFound: 0
      };
    }

    // Create ethers interface for parsing
    const iface = new ethers.Interface(ESCROW_ABI);
    
    // Search through all logs
    for (let i = 0; i < normalizedReceipt.logs.length; i++) {
      const log = normalizedReceipt.logs[i];
      
      try {
        // Parse log with ethers
        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsed) continue;
        
        console.log(`📋 Log ${i}: Parsed event '${parsed.name}'`);
        
        // STRICT FILTERING: Check if this is our target event with all validations
        if (parsed.name === 'GiftRegisteredFromMint') {
          const args = parsed.args;
          
          // FILTER 1: Event name ✅ (already checked)
          console.log(`📋 Log ${i}: Found GiftRegisteredFromMint event, applying strict filters...`);
          
          // FILTER 2: Contract address must match escrow contract (MANDATORY)
          const expectedEscrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
          if (!expectedEscrowAddress) {
            console.error('❌ CRITICAL: NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS not configured');
            return {
              success: false,
              error: 'Escrow contract address not configured',
              logsFound: normalizedReceipt.logs.length
            };
          }
          
          if (!log.address || log.address.toLowerCase() !== expectedEscrowAddress.toLowerCase()) {
            console.warn(`⚠️ FILTER REJECT: Wrong contract address. Expected ${expectedEscrowAddress}, got ${log.address || 'undefined'}`);
            continue;
          }
          
          console.log(`✅ FILTER PASS: Contract address matches escrow (${expectedEscrowAddress.slice(0, 10)}...)`);
          
          const eventData: ParsedGiftEvent = {
            success: true,
            giftId: Number(args.giftId),
            tokenId: Number(args.tokenId), 
            creator: args.creator,
            nftContract: args.nftContract,
            expiresAt: Number(args.expiresAt),
            giftMessage: args.giftMessage || '',
            registeredBy: args.registeredBy
          };
          
          // FILTER 3: TokenId must match expected (if provided)
          if (expectedTokenId !== undefined) {
            const expectedNum = Number(expectedTokenId);
            if (eventData.tokenId !== expectedNum) {
              console.warn(`⚠️ FILTER REJECT: TokenId mismatch. Expected ${expectedNum}, got ${eventData.tokenId}`);
              continue;
            }
            console.log(`✅ FILTER PASS: TokenId matches expected (${expectedNum})`);
          }
          
          // FILTER 4: NFT contract must match expected (if provided)
          if (contractAddress && eventData.nftContract.toLowerCase() !== contractAddress.toLowerCase()) {
            console.warn(`⚠️ FILTER REJECT: NFT contract mismatch. Expected ${contractAddress}, got ${eventData.nftContract}`);
            continue;
          }
          if (contractAddress) {
            console.log(`✅ FILTER PASS: NFT contract matches expected (${contractAddress.slice(0, 10)}...)`);
          }
          
          // FILTER 5: GiftId must be > 0 (valid gift)
          if (eventData.giftId <= 0) {
            console.warn(`⚠️ FILTER REJECT: Invalid giftId. Got ${eventData.giftId}, must be > 0`);
            continue;
          }
          console.log(`✅ FILTER PASS: GiftId is valid (${eventData.giftId})`);
          
          // FILTER 6: TokenId must be >= 0 (valid token)
          if (eventData.tokenId < 0) {
            console.warn(`⚠️ FILTER REJECT: Invalid tokenId. Got ${eventData.tokenId}, must be >= 0`);
            continue;
          }
          console.log(`✅ FILTER PASS: TokenId is valid (${eventData.tokenId})`);
          
          // FILTER 7: Creator must not be zero address
          if (!ethers.isAddress(eventData.creator) || eventData.creator === ethers.ZeroAddress) {
            console.warn(`⚠️ FILTER REJECT: Invalid creator address. Got ${eventData.creator}`);
            continue;
          }
          console.log(`✅ FILTER PASS: Creator address is valid (${eventData.creator.slice(0, 10)}...)`);
          
          // FILTER 8: NFT contract must be valid address
          if (!ethers.isAddress(eventData.nftContract) || eventData.nftContract === ethers.ZeroAddress) {
            console.warn(`⚠️ FILTER REJECT: Invalid NFT contract address. Got ${eventData.nftContract}`);
            continue;
          }
          console.log(`✅ FILTER PASS: NFT contract address is valid (${eventData.nftContract.slice(0, 10)}...)`);
          
          // FILTER 9: Registered by must be valid address (deployer or user)
          if (!ethers.isAddress(eventData.registeredBy) || eventData.registeredBy === ethers.ZeroAddress) {
            console.warn(`⚠️ FILTER REJECT: Invalid registeredBy address. Got ${eventData.registeredBy}`);
            continue;
          }
          console.log(`✅ FILTER PASS: RegisteredBy address is valid (${eventData.registeredBy.slice(0, 10)}...)`);
          
          console.log('✅ ALL STRICT FILTERS PASSED:', {
            giftId: eventData.giftId,
            tokenId: eventData.tokenId,
            creator: eventData.creator.slice(0, 10) + '...',
            nftContract: eventData.nftContract.slice(0, 10) + '...',
            logAddress: log.address?.slice(0, 10) + '...'
          });
          
          console.log('🎯 DETERMINISTIC RESULT: Event parsing successful with strict validation');
          return eventData;
        }
        
      } catch (parseError) {
        // Failed to parse this log - not necessarily an error
        console.log(`⚠️ Log ${i}: Failed to parse (likely different contract)`, (parseError as Error).message.slice(0, 50));
        continue;
      }
    }
    
    // FALLBACK: No matching event found in receipt, try getLogs by block
    console.log('⚠️ No event found in normalized receipt, attempting fallback getLogs by block...');
    
    try {
      const fallbackResult = await fallbackGetLogsByBlock(
        normalizedReceipt.transactionHash,
        normalizedReceipt.blockNumber,
        expectedTokenId,
        contractAddress
      );
      
      if (fallbackResult.success) {
        console.log('✅ FALLBACK SUCCESS: Found event via getLogs');
        return fallbackResult;
      }
      
      console.log('❌ FALLBACK FAILED:', fallbackResult.success === false ? fallbackResult.error : 'Unknown error');
    } catch (fallbackError) {
      console.error('❌ FALLBACK ERROR:', fallbackError);
    }
    
    // Final failure
    return {
      success: false,
      error: 'GiftRegisteredFromMint event not found in normalized receipt logs or block fallback',
      logsFound: normalizedReceipt.logs.length,
      contractAddress
    };
    
  } catch (error) {
    console.error('❌ EVENT PARSE ERROR:', error);
    return {
      success: false,
      error: `Event parsing failed: ${(error as Error).message}`,
      logsFound: (receipt as any)?.logs?.length || 0
    };
  }
}

/**
 * Retry logic for event parsing with exponential backoff
 * Handles RPC failures and temporary issues
 */
export async function parseGiftEventWithRetry(
  receipt: any, // Accept any receipt format (gasless/userOp/direct)
  expectedTokenId?: string | number,
  contractAddress?: string,
  maxRetries: number = 3
): Promise<EventParseResult> {
  let lastError: string = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 EVENT PARSE ATTEMPT ${attempt}/${maxRetries}`);
    
    try {
      const result = await parseGiftRegisteredFromMintEvent(receipt, expectedTokenId, contractAddress);
      
      if (result.success) {
        console.log(`✅ Event parsing successful on attempt ${attempt}`);
        return result;
      }
      
      lastError = result.success === false ? result.error : 'Unknown error';
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      lastError = (error as Error).message;
      console.error(`❌ Attempt ${attempt} failed:`, lastError);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: `All ${maxRetries} attempts failed. Last error: ${lastError}`,
    logsFound: 0
  };
}

/**
 * Validation helper - verify parsed event data makes sense
 */
export function validateParsedEvent(
  event: ParsedGiftEvent,
  expectedTokenId?: string | number,
  expectedCreator?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (event.giftId < 0) {
    errors.push(`Invalid giftId: ${event.giftId}`);
  }
  
  if (event.tokenId < 0) {
    errors.push(`Invalid tokenId: ${event.tokenId}`);
  }
  
  if (!ethers.isAddress(event.creator)) {
    errors.push(`Invalid creator address: ${event.creator}`);
  }
  
  if (!ethers.isAddress(event.nftContract)) {
    errors.push(`Invalid nftContract address: ${event.nftContract}`);
  }
  
  if (event.expiresAt <= 0) {
    errors.push(`Invalid expiresAt: ${event.expiresAt}`);
  }
  
  // Expected values validation
  if (expectedTokenId !== undefined && event.tokenId !== Number(expectedTokenId)) {
    errors.push(`TokenId mismatch: expected ${expectedTokenId}, got ${event.tokenId}`);
  }
  
  if (expectedCreator && event.creator.toLowerCase() !== expectedCreator.toLowerCase()) {
    errors.push(`Creator mismatch: expected ${expectedCreator}, got ${event.creator}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}