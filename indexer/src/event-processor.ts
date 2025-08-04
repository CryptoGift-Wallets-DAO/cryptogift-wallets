/**
 * 🔄 Event Processing Logic
 * Parse and store GiftRegisteredFromMint events
 */

import { Log } from 'viem';
import { decodeEventLog } from 'viem';
import { config, GIFT_EVENT_ABI } from './config.js';
import { upsertGiftMapping, insertDLQ, type GiftMapping } from './database.js';
import { getBlock } from './rpc.js';
import { logger } from './logger.js';

// Processed event interface
export interface ProcessedGiftEvent {
  tokenId: string;
  giftId: string;
  creator: string;
  nftContract: string;
  expiresAt: number;
  gate: string;
  giftMessage: string;
  registeredBy: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockTime?: Date;
}

// Process a single log entry
export async function processLog(log: Log): Promise<ProcessedGiftEvent | null> {
  try {
    logger.debug(`🔄 Processing log: ${log.transactionHash}:${log.logIndex}`);

    // Decode the event using Viem
    const decodedEvent = decodeEventLog({
      abi: GIFT_EVENT_ABI,
      data: log.data,
      topics: log.topics,
    });

    // Verify this is the correct event
    if (decodedEvent.eventName !== 'GiftRegisteredFromMint') {
      logger.warn(`⚠️ Unexpected event: ${decodedEvent.eventName}`);
      return null;
    }

    // Extract event arguments
    const args = decodedEvent.args as {
      giftId: bigint;
      creator: string;
      nftContract: string;
      tokenId: bigint;
      expiresAt: bigint;
      gate: string;
      giftMessage: string;
      registeredBy: string;
    };

    // Get block timestamp
    let blockTime: Date | undefined;
    try {
      const block = await getBlock(Number(log.blockNumber));
      blockTime = new Date(Number(block.timestamp) * 1000);
    } catch (error) {
      logger.warn(`⚠️ Failed to get block timestamp for ${log.blockNumber}:`, error);
    }

    // Create processed event
    const processedEvent: ProcessedGiftEvent = {
      tokenId: args.tokenId.toString(),
      giftId: args.giftId.toString(),
      creator: args.creator,
      nftContract: args.nftContract,
      expiresAt: Number(args.expiresAt),
      gate: args.gate,
      giftMessage: args.giftMessage,
      registeredBy: args.registeredBy,
      txHash: log.transactionHash || '',
      logIndex: Number(log.logIndex),
      blockNumber: Number(log.blockNumber),
      blockTime
    };

    logger.debug(`✅ Processed event: tokenId ${processedEvent.tokenId} → giftId ${processedEvent.giftId}`);
    return processedEvent;

  } catch (error) {
    logger.error(`❌ Failed to process log ${log.transactionHash}:${log.logIndex}:`, error);
    
    // Insert into DLQ
    await insertDLQ({
      txHash: log.transactionHash || '',
      logIndex: Number(log.logIndex),
      blockNumber: Number(log.blockNumber),
      reason: `Event processing failed: ${error instanceof Error ? error.message : String(error)}`,
      payload: {
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockHash: log.blockHash,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        logIndex: log.logIndex,
        removed: log.removed
      }
    });

    return null;
  }
}

// Store processed event in database
export async function storeProcessedEvent(event: ProcessedGiftEvent): Promise<void> {
  const mapping: GiftMapping = {
    tokenId: event.tokenId,
    giftId: event.giftId,
    txHash: event.txHash,
    logIndex: event.logIndex,
    blockNumber: event.blockNumber,
    blockTime: event.blockTime,
    contractAddr: config.contractAddress,
    creator: event.creator,
    nftContract: event.nftContract,
    expiresAt: event.expiresAt,
    gate: event.gate,
    giftMessage: event.giftMessage,
    registeredBy: event.registeredBy
  };

  await upsertGiftMapping(mapping);
  logger.debug(`💾 Stored mapping: tokenId ${event.tokenId} → giftId ${event.giftId}`);
}

// Process multiple logs in batch
export async function processLogs(logs: Log[]): Promise<{
  processed: number;
  failed: number;
  duplicates: number;
}> {
  const stats = {
    processed: 0,
    failed: 0,
    duplicates: 0
  };

  // Track processed token IDs to detect duplicates in batch
  const processedTokenIds = new Set<string>();

  for (const log of logs) {
    try {
      const processedEvent = await processLog(log);
      
      if (!processedEvent) {
        stats.failed++;
        continue;
      }

      // Check for duplicates within this batch
      if (processedTokenIds.has(processedEvent.tokenId)) {
        logger.warn(`⚠️ Duplicate tokenId in batch: ${processedEvent.tokenId}`);
        stats.duplicates++;
        continue;
      }

      // Store the event
      await storeProcessedEvent(processedEvent);
      processedTokenIds.add(processedEvent.tokenId);
      stats.processed++;

    } catch (error) {
      logger.error(`❌ Failed to process log:`, error);
      stats.failed++;
    }
  }

  logger.info(`📊 Batch processed: ${stats.processed} stored, ${stats.failed} failed, ${stats.duplicates} duplicates`);
  return stats;
}

// Validate event data
export function validateGiftEvent(event: ProcessedGiftEvent): boolean {
  // Basic validation
  if (!event.tokenId || !event.giftId) {
    logger.warn(`⚠️ Invalid event: missing tokenId or giftId`);
    return false;
  }

  if (!event.creator || !event.nftContract) {
    logger.warn(`⚠️ Invalid event: missing creator or nftContract`);
    return false;
  }

  if (!event.txHash || !event.blockNumber) {
    logger.warn(`⚠️ Invalid event: missing txHash or blockNumber`);
    return false;
  }

  // Check for reasonable values
  const tokenIdNum = parseInt(event.tokenId);
  const giftIdNum = parseInt(event.giftId);

  if (isNaN(tokenIdNum) || tokenIdNum < 0) {
    logger.warn(`⚠️ Invalid tokenId: ${event.tokenId}`);
    return false;
  }

  if (isNaN(giftIdNum) || giftIdNum < 0) {
    logger.warn(`⚠️ Invalid giftId: ${event.giftId}`);
    return false;
  }

  return true;
}