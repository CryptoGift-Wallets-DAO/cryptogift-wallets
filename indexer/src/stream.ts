/**
 * 📡 Live Event Streaming
 * Real-time processing of new GiftRegisteredFromMint events
 */

import { Log } from 'viem';
import { getCurrentBlockNumber, getSafeProcessingBlock, subscribeToLogs, createEventFilter, pollForNewLogs, resetFilters } from './rpc.js';
import { processLogs } from './event-processor.js';
import { getCheckpoint, saveCheckpoint } from './database.js';
import { config } from './config.js';
import { streamLogger as logger } from './logger.js';

// Stream configuration
const STREAM_CHECKPOINT_ID = 'stream';
const BATCH_TIMEOUT_MS = 5000; // Process accumulated logs every 5 seconds
const MAX_BATCH_SIZE = 100; // Process in batches to avoid overwhelming DB
const MAX_PENDING_LOGS = 1000; // Memory limit for pending logs buffer
const MAX_PENDING_MEMORY_MB = 50; // Rough memory limit in MB
const CONFIRMATION_BLOCKS = config.confirmations;

// Stream state
interface StreamState {
  isRunning: boolean;
  startTime: Date;
  unsubscribeFn: (() => void) | null;
  pendingLogs: Log[];
  lastProcessedBlock: number;
  stats: StreamStats;
  batchTimer: NodeJS.Timeout | null;
}

// Stream statistics
export interface StreamStats {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  duplicates: number;
  blocksProcessed: number;
  averageLatencyMs: number;
  uptime: number;
  lastEventTime?: Date;
  lastProcessedBlock: number;
}

let streamState: StreamState | null = null;

// Start live streaming
export async function startStream(): Promise<void> {
  if (streamState?.isRunning) {
    throw new Error('Stream already running');
  }

  try {
    // Get safe starting block
    const lastProcessedBlock = await getCheckpoint(STREAM_CHECKPOINT_ID);
    const safeBlock = await getSafeProcessingBlock();
    const startBlock = Math.max(lastProcessedBlock, safeBlock - CONFIRMATION_BLOCKS);

    // Initialize state
    streamState = {
      isRunning: true,
      startTime: new Date(),
      unsubscribeFn: null,
      pendingLogs: [],
      lastProcessedBlock: startBlock,
      batchTimer: null,
      stats: {
        totalEvents: 0,
        processedEvents: 0,
        failedEvents: 0,
        duplicates: 0,
        blocksProcessed: 0,
        averageLatencyMs: 0,
        uptime: 0,
        lastProcessedBlock: startBlock
      }
    };

    logger.info(`🚀 Starting live stream from block ${startBlock}`);

    // Try to create event filter for efficient polling
    await createEventFilter();

    // Start WebSocket subscription
    await startWebSocketStream();

    // Start periodic batch processing
    startBatchProcessor();

    // Start smart polling with filter support
    startSmartPolling();

    logger.info('✅ Live stream started successfully');

  } catch (error) {
    logger.error('❌ Failed to start stream:', error);
    await stopStream();
    throw error;
  }
}

// Start WebSocket event subscription
async function startWebSocketStream(): Promise<void> {
  if (!streamState) return;

  try {
    const unsubscribe = await subscribeToLogs((logs: Log[]) => {
      if (!streamState?.isRunning) return;

      logger.debug(`📨 Received ${logs.length} new logs via WebSocket`);
      
      // Check memory limits before adding logs
      if (streamState.pendingLogs.length + logs.length > MAX_PENDING_LOGS) {
        logger.warn(`⚠️ Pending logs buffer at capacity (${streamState.pendingLogs.length}), forcing flush`);
        await processPendingLogs();
      }
      
      // Add to pending batch with memory check
      addLogsToPendingBuffer(logs);
      streamState.stats.totalEvents += logs.length;

      // Process immediately if batch is full
      if (streamState.pendingLogs.length >= MAX_BATCH_SIZE) {
        processPendingLogs();
      }
    });

    streamState.unsubscribeFn = unsubscribe;
    logger.info('🔔 WebSocket subscription active');

  } catch (error) {
    logger.warn('⚠️ WebSocket subscription failed, using polling fallback:', error);
    // Polling fallback will handle this
  }
}

// Start batch processor timer
function startBatchProcessor(): void {
  if (!streamState) return;

  streamState.batchTimer = setInterval(() => {
    if (streamState?.pendingLogs.length > 0) {
      processPendingLogs();
    }
  }, BATCH_TIMEOUT_MS);

  logger.debug(`⏰ Batch processor started (${BATCH_TIMEOUT_MS}ms interval)`);
}

// Process accumulated logs
async function processPendingLogs(): Promise<void> {
  if (!streamState || streamState.pendingLogs.length === 0) return;

  const logs = streamState.pendingLogs.splice(0, MAX_BATCH_SIZE);
  const batchStartTime = Date.now();

  try {
    logger.debug(`🔄 Processing batch of ${logs.length} logs`);
    
    const batchStats = await processLogs(logs);
    
    // Update statistics
    streamState.stats.processedEvents += batchStats.processed;
    streamState.stats.failedEvents += batchStats.failed;
    streamState.stats.duplicates += batchStats.duplicates;
    streamState.stats.lastEventTime = new Date();
    
    // Calculate latency (rough estimate based on batch processing time)
    const latency = Date.now() - batchStartTime;
    streamState.stats.averageLatencyMs = 
      (streamState.stats.averageLatencyMs + latency) / 2;

    // Update checkpoint with latest block from batch
    if (logs.length > 0) {
      const latestBlock = Math.max(...logs.map(log => Number(log.blockNumber)));
      streamState.lastProcessedBlock = latestBlock;
      streamState.stats.lastProcessedBlock = latestBlock;
      await saveCheckpoint(STREAM_CHECKPOINT_ID, latestBlock);
    }

    logger.debug(
      `✅ Batch processed: ${batchStats.processed} stored, ` +
      `${batchStats.failed} failed, ${batchStats.duplicates} duplicates`
    );

  } catch (error) {
    logger.error('❌ Failed to process log batch:', error);
    
    // Put logs back at beginning of queue for retry
    streamState.pendingLogs.unshift(...logs);
    streamState.stats.failedEvents += logs.length;
  }
}

// Add logs to pending buffer with memory management
function addLogsToPendingBuffer(logs: Log[]): void {
  if (!streamState) return;
  
  // Estimate memory usage (rough calculation)
  const estimatedMemoryMB = (streamState.pendingLogs.length + logs.length) * 0.002; // ~2KB per log
  
  if (estimatedMemoryMB > MAX_PENDING_MEMORY_MB) {
    logger.warn(`⚠️ Pending logs approaching memory limit (${estimatedMemoryMB.toFixed(1)}MB), processing immediately`);
    processPendingLogs();
  }
  
  // Filter logs by confirmation status (ignore very recent blocks that might be flashblocks)
  const confirmedLogs = logs.filter(log => {
    const blockNumber = Number(log.blockNumber);
    // Simple heuristic: very recent blocks might be flashblocks
    return true; // Let confirmation system handle this
  });
  
  streamState.pendingLogs.push(...confirmedLogs);
}

// Smart polling with filter support
async function startSmartPolling(): Promise<void> {
  if (!streamState) return;

  const pollInterval = 15000; // Poll every 15 seconds
  
  const poller = setInterval(async () => {
    if (!streamState?.isRunning) {
      clearInterval(poller);
      return;
    }

    try {
      await smartPollForEvents();
    } catch (error) {
      logger.warn('⚠️ Smart polling error:', error);
    }
  }, pollInterval);

  logger.debug(`🔄 Smart polling started (${pollInterval}ms interval)`);
}

// Smart polling implementation
async function smartPollForEvents(): Promise<void> {
  if (!streamState) return;

  try {
    const fromBlock = streamState.lastProcessedBlock + 1;
    
    await pollForNewLogs(fromBlock, (logs: Log[]) => {
      if (!streamState?.isRunning) return;
      
      logger.debug(`📦 Found ${logs.length} events via smart polling`);
      
      // Check memory limits before adding
      if (streamState.pendingLogs.length + logs.length > MAX_PENDING_LOGS) {
        logger.warn(`⚠️ Smart polling: buffer at capacity, forcing flush`);
        processPendingLogs();
      }
      
      addLogsToPendingBuffer(logs);
      streamState.stats.totalEvents += logs.length;
    });

  } catch (error) {
    logger.warn('⚠️ Smart polling failed:', error);
  }
}

// Check for events missed by WebSocket
async function checkForMissedEvents(): Promise<void> {
  if (!streamState) return;

  try {
    const currentBlock = await getCurrentBlockNumber();
    const safeBlock = currentBlock - CONFIRMATION_BLOCKS;
    const fromBlock = streamState.lastProcessedBlock + 1;

    if (fromBlock > safeBlock) return; // Nothing to poll

    logger.debug(`🔍 Polling for missed events: blocks ${fromBlock} → ${safeBlock}`);

    // Import getLogs function
    const { getLogs } = await import('./rpc.js');
    const logs = await getLogs(fromBlock, safeBlock);

    if (logs.length > 0) {
      logger.info(`📦 Found ${logs.length} missed events via polling`);
      streamState.pendingLogs.push(...logs);
      streamState.stats.totalEvents += logs.length;
    }

  } catch (error) {
    logger.warn('⚠️ Failed to poll for missed events:', error);
  }
}

// Stop live streaming
export async function stopStream(): Promise<void> {
  if (!streamState?.isRunning) return;

  logger.info('🛑 Stopping live stream...');
  
  streamState.isRunning = false;

  // Clear timers
  if (streamState.batchTimer) {
    clearInterval(streamState.batchTimer);
    streamState.batchTimer = null;
  }

  // Unsubscribe from WebSocket
  if (streamState.unsubscribeFn) {
    try {
      streamState.unsubscribeFn();
      streamState.unsubscribeFn = null;
    } catch (error) {
      logger.warn('⚠️ Error unsubscribing from WebSocket:', error);
    }
  }

  // Process any remaining pending logs
  if (streamState.pendingLogs.length > 0) {
    logger.info(`🔄 Processing ${streamState.pendingLogs.length} remaining logs...`);
    await processPendingLogs();
  }

  logger.info('✅ Live stream stopped');
  streamState = null;
}

// Get current stream status
export function getStreamStatus(): StreamStats | null {
  if (!streamState) return null;

  // Update uptime
  streamState.stats.uptime = Date.now() - streamState.startTime.getTime();

  return { ...streamState.stats };
}

// Check if stream is running
export function isStreamRunning(): boolean {
  return streamState?.isRunning || false;
}

// Get pending logs count
export function getPendingLogsCount(): number {
  return streamState?.pendingLogs.length || 0;
}

// Force process pending logs (for debugging)
export async function flushPendingLogs(): Promise<void> {
  if (streamState?.pendingLogs.length > 0) {
    logger.info(`🚀 Flushing ${streamState.pendingLogs.length} pending logs`);
    await processPendingLogs();
  }
}

// Restart stream (useful for recovery)
export async function restartStream(): Promise<void> {
  logger.info('🔄 Restarting live stream...');
  
  await stopStream();
  
  // Brief pause before restart
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await startStream();
}

// Health check for stream
export async function streamHealthCheck(): Promise<{
  isRunning: boolean;
  hasWebSocket: boolean;
  pendingCount: number;
  lagBlocks: number;
  uptime: number;
}> {
  const isRunning = isStreamRunning();
  
  if (!isRunning) {
    return {
      isRunning: false,
      hasWebSocket: false,
      pendingCount: 0,
      lagBlocks: 0,
      uptime: 0
    };
  }

  try {
    const currentBlock = await getCurrentBlockNumber();
    const lastProcessedBlock = streamState?.lastProcessedBlock || 0;
    const lagBlocks = Math.max(0, currentBlock - lastProcessedBlock);

    return {
      isRunning: true,
      hasWebSocket: !!streamState?.unsubscribeFn,
      pendingCount: getPendingLogsCount(),
      lagBlocks,
      uptime: streamState?.stats.uptime || 0
    };
  } catch (error) {
    logger.error('❌ Stream health check failed:', error);
    return {
      isRunning: true,
      hasWebSocket: false,
      pendingCount: 0,
      lagBlocks: 999999, // Indicate error
      uptime: streamState?.stats.uptime || 0
    };
  }
}