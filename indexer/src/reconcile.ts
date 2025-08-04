/**
 * 🔄 Reorg Reconciliation
 * Handle blockchain reorganizations and ensure data consistency
 */

import { Log, Block } from 'viem';
import { getCurrentBlockNumber, getBlock, getLogs } from './rpc.js';
import { processLogs } from './event-processor.js';
import { getPool, getCheckpoint, saveCheckpoint } from './database.js';
import { config } from './config.js';
import { reconcileLogger as logger } from './logger.js';

// Reconciliation configuration
const RECONCILE_CHECKPOINT_ID = 'reconcile';
const REORG_LOOKBACK = config.reorgLookback;
const BATCH_SIZE = 1000;

// Reconciliation statistics
export interface ReconcileStats {
  blocksChecked: number;
  reorgsDetected: number;
  invalidatedMappings: number;
  reprocessedEvents: number;
  consistencyErrors: number;
  lastReorgBlock?: number;
  lastReorgDepth?: number;
}

// Block header for reorg detection
interface BlockHeader {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
}

// Stored block info for comparison
interface StoredBlockInfo {
  blockNumber: number;
  blockHash: string;
  recordCount: number;
}

// Start reconciliation process
export async function startReconciliation(): Promise<ReconcileStats> {
  logger.info('🔄 Starting blockchain reconciliation...');
  
  const stats: ReconcileStats = {
    blocksChecked: 0,
    reorgsDetected: 0,
    invalidatedMappings: 0,
    reprocessedEvents: 0,
    consistencyErrors: 0
  };

  try {
    // Get current state
    const currentBlock = await getCurrentBlockNumber();
    const lastReconciledBlock = await getCheckpoint(RECONCILE_CHECKPOINT_ID);
    
    // Determine range to check (look back for potential reorgs)
    const startBlock = Math.max(
      lastReconciledBlock - REORG_LOOKBACK,
      config.deploymentBlock
    );
    const endBlock = Math.min(currentBlock - config.confirmations, currentBlock);
    
    if (startBlock >= endBlock) {
      logger.info('✅ No blocks to reconcile');
      return stats;
    }

    logger.info(`🔍 Reconciling blocks ${startBlock} → ${endBlock} (${endBlock - startBlock} blocks)`);
    
    // Check for reorgs and inconsistencies
    const reorgDetected = await detectReorgs(startBlock, endBlock, stats);
    
    if (reorgDetected) {
      // Handle reorg by reprocessing affected blocks
      await handleReorg(startBlock, endBlock, stats);
    } else {
      // Normal consistency check
      await checkConsistency(startBlock, endBlock, stats);
    }
    
    // Update checkpoint
    await saveCheckpoint(RECONCILE_CHECKPOINT_ID, endBlock);
    
    logger.info(
      `✅ Reconciliation complete: ${stats.blocksChecked} blocks checked, ` +
      `${stats.reorgsDetected} reorgs, ${stats.reprocessedEvents} events reprocessed`
    );
    
    return stats;
    
  } catch (error) {
    logger.error('❌ Reconciliation failed:', error);
    throw error;
  }
}

// Detect blockchain reorganizations
async function detectReorgs(
  startBlock: number, 
  endBlock: number, 
  stats: ReconcileStats
): Promise<boolean> {
  logger.debug(`🔍 Checking for reorgs in blocks ${startBlock} → ${endBlock}`);
  
  try {
    // Get stored block hashes from database
    const storedBlocks = await getStoredBlockHashes(startBlock, endBlock);
    
    // Check each block against current blockchain
    for (const storedBlock of storedBlocks) {
      const currentBlock = await getBlock(storedBlock.blockNumber);
      stats.blocksChecked++;
      
      if (currentBlock.hash !== storedBlock.blockHash) {
        logger.warn(
          `⚠️ Reorg detected at block ${storedBlock.blockNumber}: ` +
          `stored ${storedBlock.blockHash} vs current ${currentBlock.hash}`
        );
        
        stats.reorgsDetected++;
        stats.lastReorgBlock = storedBlock.blockNumber;
        
        // Calculate reorg depth
        const reorgDepth = await calculateReorgDepth(storedBlock.blockNumber);
        stats.lastReorgDepth = reorgDepth;
        
        logger.info(`📊 Reorg depth: ${reorgDepth} blocks`);
        return true;
      }
    }
    
    logger.debug('✅ No reorgs detected');
    return false;
    
  } catch (error) {
    logger.error('❌ Failed to detect reorgs:', error);
    throw error;
  }
}

// Handle blockchain reorganization
async function handleReorg(
  startBlock: number, 
  endBlock: number, 
  stats: ReconcileStats
): Promise<void> {
  logger.info(`🔄 Handling reorg: reprocessing blocks ${startBlock} → ${endBlock}`);
  
  try {
    // Invalidate mappings in reorg range
    const invalidatedCount = await invalidateMappingsInRange(startBlock, endBlock);
    stats.invalidatedMappings += invalidatedCount;
    
    logger.info(`🗑️ Invalidated ${invalidatedCount} mappings in reorg range`);
    
    // Reprocess events in batches
    let currentBlock = startBlock;
    
    while (currentBlock <= endBlock) {
      const batchEnd = Math.min(currentBlock + BATCH_SIZE, endBlock);
      
      logger.debug(`🔄 Reprocessing batch: blocks ${currentBlock} → ${batchEnd}`);
      
      try {
        // Get fresh logs from blockchain
        const logs = await getLogs(currentBlock, batchEnd);
        
        // Process logs (this will create new mappings)
        const batchStats = await processLogs(logs);
        stats.reprocessedEvents += batchStats.processed;
        
        logger.debug(
          `✅ Reprocessed batch: ${batchStats.processed} events, ` +
          `${batchStats.failed} failed`
        );
        
      } catch (error) {
        logger.error(`❌ Failed to reprocess batch ${currentBlock}-${batchEnd}:`, error);
        stats.consistencyErrors++;
      }
      
      currentBlock = batchEnd + 1;
    }
    
    logger.info(`✅ Reorg handling complete: ${stats.reprocessedEvents} events reprocessed`);
    
  } catch (error) {
    logger.error('❌ Failed to handle reorg:', error);
    throw error;
  }
}

// Normal consistency check (no reorg detected)
async function checkConsistency(
  startBlock: number, 
  endBlock: number, 
  stats: ReconcileStats
): Promise<void> {
  logger.debug(`🔍 Performing consistency check: blocks ${startBlock} → ${endBlock}`);
  
  try {
    // Sample check: verify some recent mappings against blockchain
    const sampleSize = Math.min(100, endBlock - startBlock);
    const sampleBlocks = generateSampleBlocks(startBlock, endBlock, sampleSize);
    
    for (const blockNumber of sampleBlocks) {
      try {
        await verifyBlockConsistency(blockNumber);
        stats.blocksChecked++;
      } catch (error) {
        logger.warn(`⚠️ Consistency error at block ${blockNumber}:`, error);
        stats.consistencyErrors++;
      }
    }
    
    logger.debug(`✅ Consistency check complete: ${stats.blocksChecked} blocks verified`);
    
  } catch (error) {
    logger.error('❌ Consistency check failed:', error);
    throw error;
  }
}

// Calculate depth of reorganization
async function calculateReorgDepth(reorgBlock: number): Promise<number> {
  let depth = 1;
  let currentBlock = reorgBlock - 1;
  
  try {
    while (currentBlock >= config.deploymentBlock && depth < 100) {
      const storedHashes = await getStoredBlockHashes(currentBlock, currentBlock);
      
      if (storedHashes.length === 0) break;
      
      const currentBlockData = await getBlock(currentBlock);
      
      if (currentBlockData.hash === storedHashes[0].blockHash) {
        break; // Found common ancestor
      }
      
      depth++;
      currentBlock--;
    }
    
    return depth;
    
  } catch (error) {
    logger.warn(`⚠️ Failed to calculate reorg depth:`, error);
    return depth;
  }
}

// Get stored block hashes from database
async function getStoredBlockHashes(
  fromBlock: number, 
  toBlock: number
): Promise<StoredBlockInfo[]> {
  const query = `
    SELECT 
      block_number,
      tx_hash as block_hash,
      COUNT(*) as record_count
    FROM gift_mappings 
    WHERE block_number BETWEEN $1 AND $2
    GROUP BY block_number, tx_hash
    ORDER BY block_number
  `;
  
  try {
    const result = await getPool().query(query, [fromBlock, toBlock]);
    
    return result.rows.map(row => ({
      blockNumber: row.block_number,
      blockHash: row.block_hash,
      recordCount: row.record_count
    }));
    
  } catch (error) {
    logger.error('❌ Failed to get stored block hashes:', error);
    return [];
  }
}

// Invalidate mappings in reorg range
async function invalidateMappingsInRange(
  fromBlock: number, 
  toBlock: number
): Promise<number> {
  const query = `
    DELETE FROM gift_mappings 
    WHERE block_number BETWEEN $1 AND $2
  `;
  
  try {
    const result = await getPool().query(query, [fromBlock, toBlock]);
    return result.rowCount || 0;
    
  } catch (error) {
    logger.error('❌ Failed to invalidate mappings:', error);
    throw error;
  }
}

// Verify consistency of a specific block
async function verifyBlockConsistency(blockNumber: number): Promise<void> {
  try {
    // Get mappings for this block from database
    const dbQuery = `
      SELECT token_id, gift_id, tx_hash, log_index 
      FROM gift_mappings 
      WHERE block_number = $1
      ORDER BY log_index
    `;
    
    const dbResult = await getPool().query(dbQuery, [blockNumber]);
    
    if (dbResult.rows.length === 0) {
      return; // No mappings to verify
    }
    
    // Get actual logs from blockchain
    const logs = await getLogs(blockNumber, blockNumber);
    
    // Compare counts
    if (logs.length !== dbResult.rows.length) {
      throw new Error(
        `Event count mismatch: blockchain has ${logs.length}, ` +
        `database has ${dbResult.rows.length}`
      );
    }
    
    // Spot check: verify a few specific events
    for (let i = 0; i < Math.min(5, logs.length); i++) {
      const log = logs[i];
      const dbRow = dbResult.rows[i];
      
      if (log.transactionHash !== dbRow.tx_hash || 
          Number(log.logIndex) !== dbRow.log_index) {
        throw new Error(
          `Event mismatch at index ${i}: ` +
          `log ${log.transactionHash}:${log.logIndex} vs ` +
          `db ${dbRow.tx_hash}:${dbRow.log_index}`
        );
      }
    }
    
  } catch (error) {
    throw new Error(`Block ${blockNumber} consistency check failed: ${error.message}`);
  }
}

// Generate sample blocks for consistency checking
function generateSampleBlocks(
  fromBlock: number, 
  toBlock: number, 
  sampleSize: number
): number[] {
  const blocks: number[] = [];
  const totalBlocks = toBlock - fromBlock + 1;
  
  if (sampleSize >= totalBlocks) {
    // Return all blocks if sample size is larger
    for (let i = fromBlock; i <= toBlock; i++) {
      blocks.push(i);
    }
  } else {
    // Random sampling
    const step = totalBlocks / sampleSize;
    for (let i = 0; i < sampleSize; i++) {
      const blockNumber = fromBlock + Math.floor(i * step);
      blocks.push(blockNumber);
    }
  }
  
  return blocks;
}

// Run periodic reconciliation (should be called by scheduler)
export async function runPeriodicReconciliation(): Promise<void> {
  try {
    logger.info('⏰ Starting periodic reconciliation...');
    
    const stats = await startReconciliation();
    
    // Log summary
    if (stats.reorgsDetected > 0) {
      logger.warn(
        `⚠️ Reconciliation found issues: ${stats.reorgsDetected} reorgs, ` +
        `${stats.consistencyErrors} consistency errors`
      );
    } else {
      logger.info('✅ Reconciliation clean: no issues detected');
    }
    
  } catch (error) {
    logger.error('❌ Periodic reconciliation failed:', error);
    // Don't throw - let scheduler continue
  }
}

// Get reconciliation status
export async function getReconciliationStatus(): Promise<{
  lastReconcileBlock: number;
  currentBlock: number;
  lagBlocks: number;
  isReconciliationNeeded: boolean;
}> {
  try {
    const currentBlock = await getCurrentBlockNumber();
    const lastReconcileBlock = await getCheckpoint(RECONCILE_CHECKPOINT_ID);
    const lagBlocks = currentBlock - lastReconcileBlock;
    const isReconciliationNeeded = lagBlocks > REORG_LOOKBACK;
    
    return {
      lastReconcileBlock,
      currentBlock,
      lagBlocks,
      isReconciliationNeeded
    };
    
  } catch (error) {
    logger.error('❌ Failed to get reconciliation status:', error);
    throw error;
  }
}