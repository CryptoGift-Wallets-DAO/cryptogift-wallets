/**
 * 🗄️ Database Connection and Operations
 * PostgreSQL client for gift mapping storage
 */

import { Pool, Client } from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

// Connection pool for high performance
let pool: Pool | null = null;

// Gift mapping interface - updated for hardened schema with block hash
export interface GiftMapping {
  contractAddr: string;
  tokenId: string;
  giftId: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockHash?: string;
  blockTime?: Date;
  creator?: string;
  nftContract?: string;
  expiresAt?: number;
  gate?: string;
  giftMessage?: string;
  registeredBy?: string;
}

// Pending event interface for crash recovery
export interface PendingEvent {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockHash?: string;
  logData: any;
}

// Checkpoint interface
export interface Checkpoint {
  id: string;
  lastBlock: number;
  updatedAt: Date;
}

// DLQ entry interface
export interface DLQEntry {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  reason: string;
  payload: any;
}

// Initialize database connection
export async function initDatabase(): Promise<void> {
  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Get database pool
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

// Upsert gift mapping (idempotent) - updated for hardened schema
export async function upsertGiftMapping(mapping: GiftMapping): Promise<void> {
  // Validate data before inserting
  validateGiftMapping(mapping);
  
  const query = `
    INSERT INTO gift_mappings(
      contract_addr, token_id, gift_id, tx_hash, log_index, block_number, block_hash, block_time, 
      creator, nft_contract, expires_at, gate, gift_message, registered_by
    )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (contract_addr, token_id) DO UPDATE
      SET gift_id = EXCLUDED.gift_id,
          block_number = EXCLUDED.block_number,
          block_hash = EXCLUDED.block_hash,
          block_time = EXCLUDED.block_time,
          updated_at = NOW()
  `;

  const values = [
    mapping.contractAddr,
    mapping.tokenId,
    mapping.giftId,
    mapping.txHash,
    mapping.logIndex,
    mapping.blockNumber,
    mapping.blockHash,
    mapping.blockTime,
    // Normalize addresses to lowercase
    mapping.creator?.toLowerCase(),
    mapping.nftContract?.toLowerCase(),
    mapping.expiresAt,
    mapping.gate?.toLowerCase(),
    mapping.giftMessage,
    mapping.registeredBy?.toLowerCase()
  ];

  try {
    await getPool().query(query, values);
    logger.debug(`💾 Upserted mapping: tokenId ${mapping.tokenId} → giftId ${mapping.giftId}`);
  } catch (error) {
    logger.error(`❌ Failed to upsert mapping for tokenId ${mapping.tokenId}:`, error);
    // Insert into DLQ
    await insertDLQ({
      txHash: mapping.txHash,
      logIndex: mapping.logIndex,
      blockNumber: mapping.blockNumber,
      reason: `Upsert failed: ${error instanceof Error ? error.message : String(error)}`,
      payload: mapping
    });
    throw error;
  }
}

// Get gift mapping by tokenId (with optional contract address for multi-contract support)
export async function getGiftMapping(
  tokenId: string, 
  contractAddr: string = config.contractAddress
): Promise<GiftMapping | null> {
  const query = `
    SELECT contract_addr, token_id, gift_id, tx_hash, log_index, block_number, block_hash, block_time,
           creator, nft_contract, expires_at, gate, gift_message, registered_by
    FROM gift_mappings 
    WHERE contract_addr = $1 AND token_id = $2
  `;

  try {
    const result = await getPool().query(query, [contractAddr, tokenId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      contractAddr: row.contract_addr,
      tokenId: row.token_id,
      giftId: row.gift_id,
      txHash: row.tx_hash,
      logIndex: row.log_index,
      blockNumber: row.block_number,
      blockHash: row.block_hash,
      blockTime: row.block_time,
      creator: row.creator,
      nftContract: row.nft_contract,
      expiresAt: row.expires_at,
      gate: row.gate,
      giftMessage: row.gift_message,
      registeredBy: row.registered_by
    };
  } catch (error) {
    logger.error(`❌ Failed to get mapping for tokenId ${tokenId}:`, error);
    throw error;
  }
}

// Get or create checkpoint with block hash support
export async function getCheckpoint(id: string): Promise<number> {
  const query = `
    SELECT last_block FROM indexer_checkpoint WHERE id = $1
  `;

  try {
    const result = await getPool().query(query, [id]);
    
    if (result.rows.length === 0) {
      // Return deployment block as default
      return config.deploymentBlock;
    }

    return result.rows[0].last_block;
  } catch (error) {
    logger.error(`❌ Failed to get checkpoint ${id}:`, error);
    return config.deploymentBlock;
  }
}

// Get checkpoint with block hash for reorg detection
export async function getCheckpointWithHash(id: string): Promise<{ block: number; hash?: string }> {
  const query = `
    SELECT last_block, last_block_hash FROM indexer_checkpoint WHERE id = $1
  `;

  try {
    const result = await getPool().query(query, [id]);
    
    if (result.rows.length === 0) {
      return { block: config.deploymentBlock };
    }

    return {
      block: result.rows[0].last_block,
      hash: result.rows[0].last_block_hash
    };
  } catch (error) {
    logger.error(`❌ Failed to get checkpoint with hash ${id}:`, error);
    return { block: config.deploymentBlock };
  }
}

// Save checkpoint
export async function saveCheckpoint(id: string, blockNumber: number): Promise<void> {
  const query = `
    INSERT INTO indexer_checkpoint (id, last_block)
    VALUES ($1, $2)
    ON CONFLICT (id) DO UPDATE
      SET last_block = EXCLUDED.last_block,
          updated_at = NOW()
  `;

  try {
    await getPool().query(query, [id, blockNumber]);
    logger.debug(`📍 Checkpoint saved: ${id} → block ${blockNumber}`);
  } catch (error) {
    logger.error(`❌ Failed to save checkpoint ${id}:`, error);
    throw error;
  }
}

// Save checkpoint with block hash for reorg detection
export async function saveCheckpointWithHash(id: string, blockNumber: number, blockHash?: string): Promise<void> {
  const query = `
    INSERT INTO indexer_checkpoint (id, last_block, last_block_hash)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE
      SET last_block = EXCLUDED.last_block,
          last_block_hash = EXCLUDED.last_block_hash,
          updated_at = NOW()
  `;

  try {
    await getPool().query(query, [id, blockNumber, blockHash]);
    logger.debug(`📍 Checkpoint saved: ${id} → block ${blockNumber} (${blockHash?.slice(0,10)}...)`);
  } catch (error) {
    logger.error(`❌ Failed to save checkpoint with hash ${id}:`, error);
    throw error;
  }
}

// Insert into Dead Letter Queue
export async function insertDLQ(entry: DLQEntry): Promise<void> {
  const query = `
    INSERT INTO indexer_dlq (tx_hash, log_index, block_number, reason, payload)
    VALUES ($1, $2, $3, $4, $5)
  `;

  try {
    await getPool().query(query, [
      entry.txHash,
      entry.logIndex,
      entry.blockNumber,
      entry.reason,
      JSON.stringify(entry.payload)
    ]);
    logger.warn(`⚠️ DLQ entry created: ${entry.reason}`);
  } catch (error) {
    logger.error('❌ Failed to insert DLQ entry:', error);
    // Don't throw - DLQ failures shouldn't break indexing
  }
}

// Get indexer status
export async function getIndexerStatus(): Promise<{
  lastBlock: number;
  lagSeconds: number;
  totalMappings: number;
  dlqCount: number;
  latestMappedBlock: number | null;
  earliestMappedBlock: number | null;
}> {
  const query = `SELECT * FROM indexer_status`;

  try {
    const result = await getPool().query(query);
    const row = result.rows[0] || {};
    
    return {
      lastBlock: row.last_block || config.deploymentBlock,
      lagSeconds: row.lag_seconds || 0,
      totalMappings: row.total_mappings || 0,
      dlqCount: row.dlq_count || 0,
      latestMappedBlock: row.latest_mapped_block,
      earliestMappedBlock: row.earliest_mapped_block
    };
  } catch (error) {
    logger.error('❌ Failed to get indexer status:', error);
    throw error;
  }
}

// Validate gift mapping data (domain validation)
export function validateGiftMapping(mapping: GiftMapping): void {
  // Contract address validation
  if (!mapping.contractAddr || !/^0x[0-9a-fA-F]{40}$/.test(mapping.contractAddr)) {
    throw new Error(`Invalid contract address: ${mapping.contractAddr}`);
  }
  
  // Token ID validation (must be valid uint256 string)
  if (!mapping.tokenId || mapping.tokenId.length === 0 || mapping.tokenId.length > 78) {
    throw new Error(`Invalid tokenId: ${mapping.tokenId}`);
  }
  
  // Gift ID validation
  if (!mapping.giftId || mapping.giftId.length === 0 || mapping.giftId.length > 78) {
    throw new Error(`Invalid giftId: ${mapping.giftId}`);
  }
  
  // Transaction hash validation
  if (!mapping.txHash || !/^0x[0-9a-fA-F]{64}$/.test(mapping.txHash)) {
    throw new Error(`Invalid transaction hash: ${mapping.txHash}`);
  }
  
  // Log index validation
  if (mapping.logIndex < 0) {
    throw new Error(`Invalid log index: ${mapping.logIndex}`);
  }
  
  // Block number validation
  if (mapping.blockNumber <= 28914999) {
    throw new Error(`Block number too low: ${mapping.blockNumber}`);
  }
  
  // Address field validations (optional fields)
  const addressFields = [
    { field: 'creator', value: mapping.creator },
    { field: 'nftContract', value: mapping.nftContract },
    { field: 'gate', value: mapping.gate },
    { field: 'registeredBy', value: mapping.registeredBy }
  ];
  
  for (const { field, value } of addressFields) {
    if (value && !/^0x[0-9a-fA-F]{40}$/.test(value)) {
      throw new Error(`Invalid ${field} address: ${value}`);
    }
  }
  
  // expires_at validation
  if (mapping.expiresAt && mapping.expiresAt <= 0) {
    throw new Error(`Invalid expires_at: ${mapping.expiresAt}`);
  }
  
  // Gift message length validation
  if (mapping.giftMessage && mapping.giftMessage.length > 1000) {
    throw new Error(`Gift message too long: ${mapping.giftMessage.length} chars`);
  }
}

// Get continuous block ranges (gap detection)
export async function detectBlockGaps(
  fromBlock: number,
  toBlock: number
): Promise<{ start: number; end: number }[]> {
  const query = `
    WITH block_series AS (
      SELECT generate_series($1, $2) AS expected_block
    ),
    actual_blocks AS (
      SELECT DISTINCT block_number 
      FROM gift_mappings 
      WHERE block_number BETWEEN $1 AND $2
    )
    SELECT 
      MIN(bs.expected_block) as start,
      MAX(bs.expected_block) as end
    FROM block_series bs
    LEFT JOIN actual_blocks ab ON bs.expected_block = ab.block_number
    WHERE ab.block_number IS NULL
    GROUP BY (
      bs.expected_block - ROW_NUMBER() OVER (ORDER BY bs.expected_block)
    )
    ORDER BY start;
  `;
  
  try {
    const result = await getPool().query(query, [fromBlock, toBlock]);
    return result.rows.map(row => ({
      start: row.start,
      end: row.end
    }));
  } catch (error) {
    logger.error('❌ Failed to detect block gaps:', error);
    return [];
  }
}

// Block timestamp cache for efficiency
const blockTimestampCache = new Map<number, Date>();
const MAX_CACHE_SIZE = 10000;

export async function getCachedBlockTimestamp(blockNumber: number): Promise<Date | null> {
  // Check cache first
  if (blockTimestampCache.has(blockNumber)) {
    return blockTimestampCache.get(blockNumber)!;
  }
  
  // Query from database
  const query = `
    SELECT block_time 
    FROM gift_mappings 
    WHERE block_number = $1 
    LIMIT 1
  `;
  
  try {
    const result = await getPool().query(query, [blockNumber]);
    
    if (result.rows.length > 0 && result.rows[0].block_time) {
      const timestamp = result.rows[0].block_time;
      
      // Add to cache (with size limit)
      if (blockTimestampCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry
        const firstKey = blockTimestampCache.keys().next().value;
        blockTimestampCache.delete(firstKey);
      }
      
      blockTimestampCache.set(blockNumber, timestamp);
      return timestamp;
    }
    
    return null;
  } catch (error) {
    logger.error(`❌ Failed to get cached block timestamp for ${blockNumber}:`, error);
    return null;
  }
}

// ========================================
// PENDING EVENTS (Crash Recovery)
// ========================================

// Insert pending event for crash recovery
export async function insertPendingEvent(event: PendingEvent): Promise<void> {
  const query = `
    INSERT INTO pending_events (tx_hash, log_index, block_number, block_hash, log_data)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (tx_hash, log_index) DO UPDATE
      SET block_number = EXCLUDED.block_number,
          block_hash = EXCLUDED.block_hash,
          log_data = EXCLUDED.log_data
  `;

  try {
    await getPool().query(query, [
      event.txHash,
      event.logIndex,
      event.blockNumber,
      event.blockHash,
      JSON.stringify(event.logData)
    ]);
    logger.debug(`💾 Pending event stored: ${event.txHash}:${event.logIndex}`);
  } catch (error) {
    logger.error('❌ Failed to insert pending event:', error);
    throw error;
  }
}

// Get all pending events (for startup recovery)
export async function getPendingEvents(): Promise<PendingEvent[]> {
  const query = `
    SELECT tx_hash, log_index, block_number, block_hash, log_data
    FROM pending_events
    ORDER BY block_number, log_index
  `;

  try {
    const result = await getPool().query(query);
    return result.rows.map(row => ({
      txHash: row.tx_hash,
      logIndex: row.log_index,
      blockNumber: row.block_number,
      blockHash: row.block_hash,
      logData: JSON.parse(row.log_data)
    }));
  } catch (error) {
    logger.error('❌ Failed to get pending events:', error);
    return [];
  }
}

// Remove pending event after successful processing
export async function removePendingEvent(txHash: string, logIndex: number): Promise<void> {
  const query = `
    DELETE FROM pending_events 
    WHERE tx_hash = $1 AND log_index = $2
  `;

  try {
    await getPool().query(query, [txHash, logIndex]);
    logger.debug(`🗑️ Pending event removed: ${txHash}:${logIndex}`);
  } catch (error) {
    logger.error('❌ Failed to remove pending event:', error);
    // Don't throw - this is cleanup
  }
}

// Cleanup old pending events (older than 24 hours)
export async function cleanupOldPendingEvents(): Promise<number> {
  const query = `
    DELETE FROM pending_events 
    WHERE created_at < NOW() - INTERVAL '24 hours'
    RETURNING tx_hash
  `;

  try {
    const result = await getPool().query(query);
    const count = result.rowCount || 0;
    if (count > 0) {
      logger.info(`🧹 Cleaned up ${count} old pending events`);
    }
    return count;
  } catch (error) {
    logger.error('❌ Failed to cleanup old pending events:', error);
    return 0;
  }
}

// ========================================
// LEADER ELECTION (Multi-instance)
// ========================================

// Acquire distributed lock
export async function acquireLock(
  resourceName: string, 
  holderId: string, 
  durationMs: number = 300000 // 5 minutes default
): Promise<boolean> {
  const query = `
    INSERT INTO indexer_locks (resource_name, holder_id, expires_at, metadata)
    VALUES ($1, $2, NOW() + INTERVAL '${durationMs} milliseconds', $3)
    ON CONFLICT (resource_name) DO UPDATE
      SET holder_id = EXCLUDED.holder_id,
          acquired_at = NOW(),
          expires_at = EXCLUDED.expires_at,
          metadata = EXCLUDED.metadata
    WHERE indexer_locks.expires_at < NOW()
    RETURNING holder_id
  `;

  try {
    const result = await getPool().query(query, [
      resourceName, 
      holderId, 
      JSON.stringify({ pid: process.pid, hostname: require('os').hostname() })
    ]);
    
    const acquired = result.rowCount > 0;
    if (acquired) {
      logger.info(`🔒 Lock acquired: ${resourceName} by ${holderId}`);
    }
    return acquired;
  } catch (error) {
    logger.error(`❌ Failed to acquire lock ${resourceName}:`, error);
    return false;
  }
}

// Release distributed lock
export async function releaseLock(resourceName: string, holderId: string): Promise<boolean> {
  const query = `
    DELETE FROM indexer_locks 
    WHERE resource_name = $1 AND holder_id = $2
    RETURNING resource_name
  `;

  try {
    const result = await getPool().query(query, [resourceName, holderId]);
    const released = result.rowCount > 0;
    if (released) {
      logger.info(`🔓 Lock released: ${resourceName} by ${holderId}`);
    }
    return released;
  } catch (error) {
    logger.error(`❌ Failed to release lock ${resourceName}:`, error);
    return false;
  }
}

// Check if we hold a specific lock
export async function holdLock(resourceName: string, holderId: string): Promise<boolean> {
  const query = `
    SELECT holder_id FROM indexer_locks 
    WHERE resource_name = $1 AND holder_id = $2 AND expires_at > NOW()
  `;

  try {
    const result = await getPool().query(query, [resourceName, holderId]);
    return result.rowCount > 0;
  } catch (error) {
    logger.error(`❌ Failed to check lock ${resourceName}:`, error);
    return false;
  }
}

// ========================================
// REORG DETECTION (Block Hash Validation)
// ========================================

// Check for reorgs by comparing stored block hashes
export async function detectReorgsByHash(
  fromBlock: number,
  toBlock: number
): Promise<{ block: number; storedHash: string; currentHash?: string }[]> {
  const query = `
    SELECT DISTINCT block_number, block_hash
    FROM gift_mappings 
    WHERE block_number BETWEEN $1 AND $2 
      AND block_hash IS NOT NULL
    ORDER BY block_number
  `;

  try {
    const result = await getPool().query(query, [fromBlock, toBlock]);
    const reorgs = [];
    
    // Import getBlock function for hash comparison
    const { getBlock } = await import('./rpc.js');
    
    for (const row of result.rows) {
      try {
        const currentBlock = await getBlock(row.block_number);
        if (currentBlock.hash !== row.block_hash) {
          reorgs.push({
            block: row.block_number,
            storedHash: row.block_hash,
            currentHash: currentBlock.hash
          });
        }
      } catch (error) {
        logger.warn(`⚠️ Failed to check block ${row.block_number} for reorg:`, error);
      }
    }
    
    return reorgs;
  } catch (error) {
    logger.error('❌ Failed to detect reorgs by hash:', error);
    return [];
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('🔌 Database connection closed');
  }
}