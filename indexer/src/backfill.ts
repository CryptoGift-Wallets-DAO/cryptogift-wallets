/**
 * 🔄 Historical Event Backfill
 * Process all GiftRegisteredFromMint events from deployment to current
 */

import { getCurrentBlockNumber, getSafeProcessingBlock, getLogs, getBatchConfig } from './rpc.js';
import { processLogs } from './event-processor.js';
import { getCheckpoint, saveCheckpoint } from './database.js';
import { config } from './config.js';
import { backfillLogger as logger } from './logger.js';

// Backfill configuration
const BACKFILL_CHECKPOINT_ID = 'backfill';
const REORG_SAFETY_BLOCKS = config.confirmations;

// Backfill statistics
export interface BackfillStats {
  startBlock: number;
  endBlock: number;
  currentBlock: number;
  totalBlocks: number;
  processedBlocks: number;
  remainingBlocks: number;
  batchesCompleted: number;
  totalMappings: number;
  failedLogs: number;
  duplicates: number;
  progressPercent: number;
  estimatedTimeMs: number;
  avgBlocksPerSecond: number;
}

// Backfill state
interface BackfillState {
  isRunning: boolean;
  startTime: Date;
  stats: BackfillStats;
  batchTimes: number[];
}

let backfillState: BackfillState | null = null;

// Initialize backfill process
export async function startBackfill(): Promise<void> {
  if (backfillState?.isRunning) {
    throw new Error('Backfill already in progress');
  }

  try {
    // Get safe processing boundary (respects finality)
    const safeEndBlock = await getSafeProcessingBlock();
    
    // Get last processed block
    const lastProcessedBlock = await getCheckpoint(BACKFILL_CHECKPOINT_ID);
    
    // Validate range
    if (lastProcessedBlock >= safeEndBlock) {
      logger.info(`✅ Backfill already complete: block ${lastProcessedBlock}`);
      return;
    }

    const totalBlocks = safeEndBlock - lastProcessedBlock;
    
    // Initialize state
    backfillState = {
      isRunning: true,
      startTime: new Date(),
      stats: {
        startBlock: lastProcessedBlock,
        endBlock: safeEndBlock,
        currentBlock: lastProcessedBlock,
        totalBlocks,
        processedBlocks: 0,
        remainingBlocks: totalBlocks,
        batchesCompleted: 0,
        totalMappings: 0,
        failedLogs: 0,
        duplicates: 0,
        progressPercent: 0,
        estimatedTimeMs: 0,
        avgBlocksPerSecond: 0
      },
      batchTimes: []
    };

    logger.info(`🚀 Starting backfill: blocks ${lastProcessedBlock} → ${safeEndBlock} (${totalBlocks} blocks)`);
    
    // Process in batches
    await processBackfillBatches();
    
    logger.info(`✅ Backfill completed: ${backfillState.stats.totalMappings} mappings processed`);
    
  } catch (error) {
    logger.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    if (backfillState) {
      backfillState.isRunning = false;
    }
  }
}

// Process backfill in batches
async function processBackfillBatches(): Promise<void> {
  if (!backfillState) return;

  const { stats } = backfillState;
  let currentBlock = stats.currentBlock;

  while (currentBlock < stats.endBlock && backfillState.isRunning) {
    const batchStartTime = Date.now();
    
    // Use adaptive batch size from RPC client
    const batchConfig = getBatchConfig();
    
    // Calculate batch end (don't exceed end block or current batch size)
    const batchEnd = Math.min(
      currentBlock + batchConfig.currentSize,
      stats.endBlock
    );
    
    const batchSize = batchEnd - currentBlock;
    
    try {
      logger.debug(`📦 Processing batch: blocks ${currentBlock} → ${batchEnd} (${batchSize} blocks)`);
      
      // Get logs for this batch
      const logs = await getLogs(currentBlock + 1, batchEnd);
      
      // Process the logs
      const batchStats = await processLogs(logs);
      
      // Update statistics
      stats.processedBlocks += batchSize;
      stats.remainingBlocks = stats.endBlock - (currentBlock + batchSize);
      stats.currentBlock = batchEnd;
      stats.batchesCompleted++;
      stats.totalMappings += batchStats.processed;
      stats.failedLogs += batchStats.failed;
      stats.duplicates += batchStats.duplicates;
      stats.progressPercent = (stats.processedBlocks / stats.totalBlocks) * 100;
      
      // Calculate performance metrics
      const batchTime = Date.now() - batchStartTime;
      backfillState.batchTimes.push(batchTime);
      
      // Keep only last 10 batch times for rolling average
      if (backfillState.batchTimes.length > 10) {
        backfillState.batchTimes.shift();
      }
      
      const avgBatchTime = backfillState.batchTimes.reduce((a, b) => a + b, 0) / backfillState.batchTimes.length;
      stats.avgBlocksPerSecond = (batchSize * 1000) / avgBatchTime;
      stats.estimatedTimeMs = (stats.remainingBlocks / stats.avgBlocksPerSecond) * 1000;
      
      // Save checkpoint
      await saveCheckpoint(BACKFILL_CHECKPOINT_ID, batchEnd);
      
      logger.info(
        `📊 Batch complete: ${stats.progressPercent.toFixed(1)}% | ` +
        `${stats.totalMappings} mappings | ` +
        `${stats.avgBlocksPerSecond.toFixed(1)} blocks/s | ` +
        `ETA: ${formatDuration(stats.estimatedTimeMs)}`
      );
      
      // Move to next batch
      currentBlock = batchEnd;
      
      // Brief pause to avoid overwhelming RPC
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      logger.error(`❌ Batch failed (blocks ${currentBlock}-${batchEnd}):`, error);
      
      // Exponential backoff for retries
      const retryCount = 3;
      let retryDelay = 1000;
      
      for (let i = 0; i < retryCount; i++) {
        logger.info(`🔄 Retrying batch in ${retryDelay}ms (attempt ${i + 1}/${retryCount})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        try {
          const logs = await getLogs(currentBlock + 1, batchEnd);
          const batchStats = await processLogs(logs);
          
          // Update stats on successful retry
          stats.processedBlocks += batchSize;
          stats.remainingBlocks = stats.endBlock - (currentBlock + batchSize);
          stats.currentBlock = batchEnd;
          stats.totalMappings += batchStats.processed;
          
          await saveCheckpoint(BACKFILL_CHECKPOINT_ID, batchEnd);
          logger.info(`✅ Batch retry successful`);
          currentBlock = batchEnd;
          break;
          
        } catch (retryError) {
          logger.warn(`⚠️ Retry ${i + 1} failed:`, retryError);
          retryDelay *= 2; // Exponential backoff
          
          if (i === retryCount - 1) {
            throw new Error(`Batch failed after ${retryCount} retries`);
          }
        }
      }
    }
  }
}

// Get current backfill status
export function getBackfillStatus(): BackfillStats | null {
  return backfillState?.stats || null;
}

// Check if backfill is running
export function isBackfillRunning(): boolean {
  return backfillState?.isRunning || false;
}

// Stop backfill (graceful shutdown)
export async function stopBackfill(): Promise<void> {
  if (backfillState?.isRunning) {
    logger.info('🛑 Stopping backfill...');
    backfillState.isRunning = false;
    
    // Wait for current batch to complete
    while (backfillState.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info('✅ Backfill stopped');
  }
}

// Resume backfill from last checkpoint
export async function resumeBackfill(): Promise<void> {
  logger.info('🔄 Resuming backfill from last checkpoint...');
  await startBackfill();
}

// Check if backfill is needed
export async function isBackfillNeeded(): Promise<boolean> {
  try {
    const safeEndBlock = await getSafeProcessingBlock();
    const lastProcessedBlock = await getCheckpoint(BACKFILL_CHECKPOINT_ID);
    
    return lastProcessedBlock < safeEndBlock;
  } catch (error) {
    logger.error('❌ Failed to check backfill status:', error);
    return true; // Assume backfill is needed if we can't check
  }
}

// Get backfill progress summary
export async function getBackfillSummary(): Promise<{
  isNeeded: boolean;
  isRunning: boolean;
  lastProcessedBlock: number;
  currentBlock: number;
  blocksRemaining: number;
  progressPercent: number;
}> {
  const safeEndBlock = await getSafeProcessingBlock();
  const lastProcessedBlock = await getCheckpoint(BACKFILL_CHECKPOINT_ID);
  const blocksRemaining = Math.max(0, safeEndBlock - lastProcessedBlock);
  const totalBlocks = safeEndBlock - config.deploymentBlock;
  const processedBlocks = lastProcessedBlock - config.deploymentBlock;
  const progressPercent = totalBlocks > 0 ? (processedBlocks / totalBlocks) * 100 : 100;

  return {
    isNeeded: blocksRemaining > 0,
    isRunning: isBackfillRunning(),
    lastProcessedBlock,
    currentBlock: safeEndBlock,
    blocksRemaining,
    progressPercent
  };
}

// Utility: Format duration in human-readable format
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}