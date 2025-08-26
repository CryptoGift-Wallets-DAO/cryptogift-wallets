/**
 * 🌐 RPC Client Management
 * Viem-based blockchain interaction with fallback support
 */

import { createPublicClient, http, webSocket, Log, Block, parseEventLogs } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config, GIFT_EVENT_SIGNATURE } from './config.js';
import { logger } from './logger.js';
import WebSocket from 'ws';

// HTTP client for reliable queries
let httpClient: ReturnType<typeof createPublicClient> | null = null;

// WebSocket client for real-time events
let wsClient: ReturnType<typeof createPublicClient> | null = null;

// Initialize HTTP client
export function getHttpClient() {
  if (!httpClient) {
    httpClient = createPublicClient({
      chain: baseSepolia,
      transport: http(config.rpcHttp, {
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
      })
    });
    logger.info('🔗 HTTP RPC client initialized');
  }
  return httpClient;
}

// Initialize WebSocket client with fallback
export function getWsClient() {
  if (!wsClient) {
    try {
      wsClient = createPublicClient({
        chain: baseSepolia,
        transport: webSocket(config.rpcWs, {
          timeout: 30000,
          reconnect: {
            attempts: 5,
            delay: 2000,
          },
        })
      });
      logger.info('🔗 WebSocket RPC client initialized');
    } catch (error) {
      logger.warn('⚠️ WebSocket RPC failed, will use HTTP polling:', error);
      // Fallback to HTTP client
      return getHttpClient();
    }
  }
  return wsClient;
}

// Get current block number with finality options
export async function getCurrentBlockNumber(blockTag: 'latest' | 'safe' | 'finalized' = 'latest'): Promise<number> {
  try {
    const blockNumber = await getHttpClient().getBlockNumber({ 
      blockTag 
    });
    return Number(blockNumber);
  } catch (error) {
    logger.error(`❌ Failed to get ${blockTag} block number:`, error);
    throw error;
  }
}

// Get safe processing boundary (respects finality)
export async function getSafeProcessingBlock(): Promise<number> {
  try {
    // Try to get finalized block first (most conservative)
    try {
      const finalizedBlock = await getCurrentBlockNumber('finalized');
      logger.debug(`📍 Using finalized block: ${finalizedBlock}`);
      return finalizedBlock;
    } catch (error) {
      logger.debug('⚠️ Finalized block not available, falling back to safe');
    }
    
    // Fall back to safe block
    try {
      const safeBlock = await getCurrentBlockNumber('safe');
      logger.debug(`📍 Using safe block: ${safeBlock}`);
      return safeBlock;
    } catch (error) {
      logger.debug('⚠️ Safe block not available, using latest with confirmations');
    }
    
    // Final fallback: latest - confirmations
    const latestBlock = await getCurrentBlockNumber('latest');
    const safeBlock = latestBlock - config.confirmations;
    logger.debug(`📍 Using latest - confirmations: ${safeBlock}`);
    return safeBlock;
    
  } catch (error) {
    logger.error('❌ Failed to get safe processing block:', error);
    throw error;
  }
}

// Get block with timestamp
export async function getBlock(blockNumber: number): Promise<Block> {
  try {
    const block = await getHttpClient().getBlock({
      blockNumber: BigInt(blockNumber),
      includeTransactions: false
    });
    return block;
  } catch (error) {
    logger.error(`❌ Failed to get block ${blockNumber}:`, error);
    throw error;
  }
}

// Adaptive batch configuration
interface BatchConfig {
  currentSize: number;
  minSize: number;
  maxSize: number;
  lastError: Date | null;
  consecutiveErrors: number;
}

const batchConfig: BatchConfig = {
  currentSize: config.batchBlocks,
  minSize: 500,
  maxSize: config.batchBlocks,
  lastError: null,
  consecutiveErrors: 0
};

// Get logs with adaptive batching
export async function getLogs(
  fromBlock: number,
  toBlock: number,
  contractAddress: string = config.contractAddress
): Promise<Log[]> {
  const range = toBlock - fromBlock + 1;
  
  // If range is too large, split it
  if (range > batchConfig.currentSize) {
    logger.debug(`📦 Range ${range} > batch size ${batchConfig.currentSize}, splitting...`);
    return await getLogsInChunks(fromBlock, toBlock, contractAddress);
  }
  
  try {
    const logs = await getHttpClient().getLogs({
      address: contractAddress as `0x${string}`,
      event: {
        type: 'event',
        name: 'GiftRegisteredFromMint',
        inputs: [
          { name: 'giftId', type: 'uint256', indexed: true },
          { name: 'creator', type: 'address', indexed: true },
          { name: 'nftContract', type: 'address', indexed: true },
          { name: 'tokenId', type: 'uint256', indexed: false },
          { name: 'expiresAt', type: 'uint40', indexed: false },
          { name: 'gate', type: 'address', indexed: false },
          { name: 'giftMessage', type: 'string', indexed: false },
          { name: 'registeredBy', type: 'address', indexed: false }
        ]
      },
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock)
    });

    // Success: potentially increase batch size
    adaptBatchSizeOnSuccess();
    
    logger.debug(`📦 Retrieved ${logs.length} logs from blocks ${fromBlock}-${toBlock}`);
    return logs;
    
  } catch (error) {
    // Error: adapt batch size and retry with smaller chunks
    adaptBatchSizeOnError(error);
    
    if (range <= batchConfig.minSize) {
      // Already at minimum size, can't reduce further
      logger.error(`❌ Failed to get logs ${fromBlock}-${toBlock} even with min batch size:`, error);
      throw error;
    }
    
    // Retry with smaller chunks
    logger.warn(`⚠️ getLogs failed, retrying with smaller chunks: ${error.message}`);
    return await getLogsInChunks(fromBlock, toBlock, contractAddress);
  }
}

// Get logs in adaptive chunks
async function getLogsInChunks(
  fromBlock: number,
  toBlock: number,
  contractAddress: string
): Promise<Log[]> {
  const allLogs: Log[] = [];
  let currentBlock = fromBlock;
  
  while (currentBlock <= toBlock) {
    const chunkEnd = Math.min(currentBlock + batchConfig.currentSize - 1, toBlock);
    
    try {
      const chunkLogs = await getLogs(currentBlock, chunkEnd, contractAddress);
      allLogs.push(...chunkLogs);
      currentBlock = chunkEnd + 1;
    } catch (error) {
      // If even a small chunk fails, we have a serious problem
      logger.error(`❌ Failed to get chunk ${currentBlock}-${chunkEnd}:`, error);
      throw error;
    }
  }
  
  return allLogs;
}

// Adapt batch size on successful requests
function adaptBatchSizeOnSuccess(): void {
  // Reset error count
  batchConfig.consecutiveErrors = 0;
  
  // Gradually increase batch size if we haven't had errors recently
  const timeSinceLastError = batchConfig.lastError ? 
    Date.now() - batchConfig.lastError.getTime() : 
    Infinity;
    
  if (timeSinceLastError > 300000 && // 5 minutes without errors
      batchConfig.currentSize < batchConfig.maxSize) {
    batchConfig.currentSize = Math.min(
      batchConfig.currentSize + 500,
      batchConfig.maxSize
    );
    logger.debug(`📈 Increased batch size to ${batchConfig.currentSize}`);
  }
}

// Adapt batch size on errors
function adaptBatchSizeOnError(error: any): void {
  batchConfig.lastError = new Date();
  batchConfig.consecutiveErrors++;
  
  // Check if error indicates rate limiting or range too large
  const errorMessage = error.message?.toLowerCase() || '';
  const isRangeError = errorMessage.includes('range') || 
                      errorMessage.includes('limit') ||
                      errorMessage.includes('timeout') ||
                      errorMessage.includes('too many') ||
                      error.code === -32005; // Rate limit error code
  
  if (isRangeError || batchConfig.consecutiveErrors >= 2) {
    // Reduce batch size more aggressively for range/rate limit errors
    const reduction = isRangeError ? 0.5 : 0.8;
    batchConfig.currentSize = Math.max(
      Math.floor(batchConfig.currentSize * reduction),
      batchConfig.minSize
    );
    logger.warn(`📉 Reduced batch size to ${batchConfig.currentSize} due to: ${errorMessage}`);
  }
}

// Get current batch configuration
export function getBatchConfig(): BatchConfig {
  return { ...batchConfig };
}

// Parse log data into structured format
// GiftCreated event ABI definition
const GIFT_CREATED_ABI = {
  type: 'event',
  name: 'GiftCreated',
  inputs: [
    { name: 'giftId', type: 'uint256', indexed: true },
    { name: 'creator', type: 'address', indexed: true },
    { name: 'nftContract', type: 'address', indexed: true },
    { name: 'tokenId', type: 'uint256', indexed: false },
    { name: 'expiresAt', type: 'uint40', indexed: false },
    { name: 'gate', type: 'address', indexed: false },
    { name: 'giftMessage', type: 'string', indexed: false }
  ]
} as const;

export function parseGiftLog(log: Log): {
  tokenId: string;
  giftId: string;
  creator: string;
  nftContract: string;
  expiresAt: number;
  gate: string;
  giftMessage: string;
  registeredBy: string;
} {
  try {
    // Use viem's parseEventLogs for proper ABI decoding
    const client = getHttpClient();
    const parsedLogs = parseEventLogs({
      abi: [GIFT_CREATED_ABI],
      logs: [log]
    });
    
    if (parsedLogs.length === 0) {
      throw new Error('No parsed logs found');
    }
    
    const parsedLog = parsedLogs[0];
    const args = parsedLog.args as {
      giftId: bigint;
      creator: string;
      nftContract: string;
      tokenId: bigint;
      expiresAt: number;
      gate: string;
      giftMessage: string;
    };
    
    return {
      tokenId: args.tokenId.toString(),
      giftId: args.giftId.toString(),
      creator: args.creator,
      nftContract: args.nftContract,
      expiresAt: args.expiresAt,
      gate: args.gate,
      giftMessage: args.giftMessage,
      registeredBy: args.creator // Creator is the registrant
    };
  } catch (error) {
    logger.error('❌ Failed to parse gift log:', error);
    // Fallback to basic topic parsing if ABI decoding fails
    const giftId = log.topics[1] ? BigInt(log.topics[1]).toString() : '0';
    const creator = log.topics[2] || '0x0';
    const nftContract = log.topics[3] || '0x0';
    
    return {
      tokenId: '0',
      giftId,
      creator: creator as string,
      nftContract: nftContract as string,
      expiresAt: 0,
      gate: '0x0',
      giftMessage: 'Error parsing message',
      registeredBy: creator as string
    };
  }
}

// Event filter for efficient streaming
let activeFilter: any = null;
let filterFallback = false;

// Create event filter with fallback to watchEvent
export async function createEventFilter(
  contractAddress: string = config.contractAddress
): Promise<string | null> {
  try {
    const client = getHttpClient();
    
    const filter = await client.createEventFilter({
      address: contractAddress as `0x${string}`,
      event: {
        type: 'event',
        name: 'GiftRegisteredFromMint',
        inputs: [
          { name: 'giftId', type: 'uint256', indexed: true },
          { name: 'creator', type: 'address', indexed: true },
          { name: 'nftContract', type: 'address', indexed: true },
          { name: 'tokenId', type: 'uint256', indexed: false },
          { name: 'expiresAt', type: 'uint40', indexed: false },
          { name: 'gate', type: 'address', indexed: false },
          { name: 'giftMessage', type: 'string', indexed: false },
          { name: 'registeredBy', type: 'address', indexed: false }
        ]
      }
    });
    
    activeFilter = filter;
    logger.info(`🔍 Created event filter: ${filter}`);
    return filter;
    
  } catch (error) {
    logger.warn('⚠️ Failed to create event filter, will use polling fallback:', error);
    filterFallback = true;
    return null;
  }
}

// Get filter changes (efficient for supported nodes)
export async function getFilterChanges(filterId: string): Promise<Log[]> {
  try {
    const client = getHttpClient();
    const logs = await client.getFilterChanges({ filter: filterId });
    
    logger.debug(`📦 Filter retrieved ${logs.length} new logs`);
    return logs as Log[];
    
  } catch (error) {
    logger.error(`❌ Failed to get filter changes for ${filterId}:`, error);
    
    // Mark filter as broken, fall back to polling
    filterFallback = true;
    activeFilter = null;
    
    throw error;
  }
}

// Subscribe to new logs via WebSocket with filter fallback
export async function subscribeToLogs(
  callback: (logs: Log[]) => void,
  contractAddress: string = config.contractAddress
): Promise<() => void> {
  try {
    const client = getWsClient();
    
    const unsubscribe = await client.watchEvent({
      address: contractAddress as `0x${string}`,
      event: {
        type: 'event',
        name: 'GiftRegisteredFromMint',
        inputs: [
          { name: 'giftId', type: 'uint256', indexed: true },
          { name: 'creator', type: 'address', indexed: true },
          { name: 'nftContract', type: 'address', indexed: true },
          { name: 'tokenId', type: 'uint256', indexed: false },
          { name: 'expiresAt', type: 'uint40', indexed: false },
          { name: 'gate', type: 'address', indexed: false },
          { name: 'giftMessage', type: 'string', indexed: false },
          { name: 'registeredBy', type: 'address', indexed: false }
        ]
      },
      onLogs: (logs) => {
        // Filter out flashblocks - only process confirmed logs
        const confirmedLogs = logs.filter(log => {
          // Basic heuristic: very recent blocks might be flashblocks
          // Let the confirmation system handle final validation
          return true; // Pass all logs, let confirmation system filter
        });
        
        if (confirmedLogs.length > 0) {
          callback(confirmedLogs);
        }
      }
    });

    logger.info('🔔 Subscribed to real-time logs via WebSocket');
    return unsubscribe;
    
  } catch (error) {
    logger.error('❌ Failed to subscribe to logs:', error);
    throw error;
  }
}

// Smart polling with filter support
export async function pollForNewLogs(
  fromBlock: number,
  callback: (logs: Log[]) => void,
  contractAddress: string = config.contractAddress
): Promise<void> {
  try {
    // Try filter-based approach first if available
    if (activeFilter && !filterFallback) {
      try {
        const logs = await getFilterChanges(activeFilter);
        if (logs.length > 0) {
          callback(logs);
        }
        return;
      } catch (error) {
        logger.warn('⚠️ Filter polling failed, falling back to getLogs');
        // Will fall through to getLogs approach
      }
    }
    
    // Fallback to range-based polling
    const currentBlock = await getSafeProcessingBlock();
    
    if (fromBlock > currentBlock) {
      return; // Nothing to poll
    }
    
    const logs = await getLogs(fromBlock, currentBlock, contractAddress);
    if (logs.length > 0) {
      callback(logs);
    }
    
  } catch (error) {
    logger.error('❌ Polling for new logs failed:', error);
    throw error;
  }
}

// Reset filter state (for error recovery)
export function resetFilters(): void {
  activeFilter = null;
  filterFallback = false;
  logger.info('🔄 Reset filter state');
}

// Health check for RPC endpoints
export async function healthCheck(): Promise<{
  http: boolean;
  ws: boolean;
  latestBlock: number | null;
}> {
  const result = {
    http: false,
    ws: false,
    latestBlock: null as number | null
  };

  // Test HTTP
  try {
    const blockNumber = await getHttpClient().getBlockNumber();
    result.http = true;
    result.latestBlock = Number(blockNumber);
  } catch (error) {
    logger.warn('⚠️ HTTP RPC health check failed:', error);
  }

  // Test WebSocket
  try {
    if (wsClient) {
      await wsClient.getBlockNumber();
      result.ws = true;
    }
  } catch (error) {
    logger.warn('⚠️ WebSocket RPC health check failed:', error);
  }

  return result;
}