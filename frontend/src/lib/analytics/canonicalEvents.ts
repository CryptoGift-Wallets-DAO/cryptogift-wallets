/**
 * CANONICAL EVENT SYSTEM
 * Unified event structure for idempotent analytics tracking
 *
 * eventId format: ${txHash}:${logIndex}
 * This ensures global uniqueness across all events
 */

import { Redis } from '@upstash/redis';
import { debugLogger } from '../secureDebugLogger';

// ============================================================================
// TYPES
// ============================================================================

export interface CanonicalEvent {
  eventId: string;           // Format: ${txHash}:${logIndex}
  type: 'GiftCreated' | 'GiftClaimed' | 'GiftExpired' | 'GiftReturned' | 'GiftViewed';
  giftId: string;
  tokenId: string;
  campaignId: string;
  blockNumber: string;
  blockTimestamp: number;
  transactionHash: string;
  logIndex: number;

  // Event-specific data
  data: {
    creator?: string;
    claimer?: string;
    amount?: string;
    educationData?: string;
    referrer?: string;
    metadata?: Record<string, any>;
  };

  // Processing metadata
  processedAt: number;
  source: 'reconciliation' | 'realtime' | 'manual';
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate canonical eventId from transaction and log index
 */
export function getCanonicalEventId(txHash: string, logIndex: number | string): string {
  return `${txHash.toLowerCase()}:${logIndex}`;
}

/**
 * Check if an event has already been processed (idempotency)
 */
export async function isEventProcessed(
  redis: Redis,
  eventId: string
): Promise<boolean> {
  try {
    const exists = await redis.exists(`ga:v1:event:processed:${eventId}`);
    return exists === 1;
  } catch (error) {
    debugLogger.error('Failed to check event processed status', error as Error);
    return false;
  }
}

/**
 * Mark an event as processed with TTL
 */
export async function markEventProcessed(
  redis: Redis,
  eventId: string,
  ttlDays: number = 14 // 14 days default as recommended
): Promise<boolean> {
  try {
    // Use SETNX for atomic check-and-set with versioning
    const result = await redis.setnx(`ga:v1:event:processed:${eventId}`, '1');

    if (result === 1) {
      // Set TTL if we successfully set the key
      await redis.expire(`ga:v1:event:processed:${eventId}`, ttlDays * 86400);
      return true;
    }

    return false; // Already existed
  } catch (error) {
    debugLogger.error('Failed to mark event as processed', error as Error);
    return false;
  }
}

/**
 * Add event to Redis Stream (for event feed)
 */
export async function addEventToStream(
  redis: Redis,
  event: CanonicalEvent
): Promise<string | null> {
  try {
    // Use XADD with automatic ID generation and versioning
    const streamId = await redis.xadd(
      'ga:v1:events',
      '*', // Auto-generate ID based on Redis timestamp
      {
        eventId: event.eventId,
        type: event.type,
        giftId: event.giftId,
        tokenId: event.tokenId,
        campaignId: event.campaignId,
        blockNumber: event.blockNumber,
        blockTimestamp: event.blockTimestamp.toString(),
        transactionHash: event.transactionHash,
        logIndex: event.logIndex.toString(),
        data: JSON.stringify(event.data),
        processedAt: event.processedAt.toString(),
        source: event.source
      }
    );

    debugLogger.operation('Event added to stream', {
      streamId,
      eventId: event.eventId,
      type: event.type
    });

    return streamId;
  } catch (error) {
    debugLogger.error('Failed to add event to stream', error as Error);
    return null;
  }
}

/**
 * Process a blockchain event into canonical format
 */
export async function processBlockchainEvent(
  redis: Redis,
  eventType: string,
  txHash: string,
  logIndex: number,
  blockNumber: bigint,
  blockTimestamp: number,
  args: Record<string, any>,
  source: 'reconciliation' | 'realtime' = 'reconciliation'
): Promise<boolean> {
  const eventId = getCanonicalEventId(txHash, logIndex);

  // Check idempotency
  if (await isEventProcessed(redis, eventId)) {
    debugLogger.log('Event already processed, skipping', { eventId });
    return false;
  }

  // Build canonical event
  const canonicalEvent: CanonicalEvent = {
    eventId,
    type: eventType as CanonicalEvent['type'],
    giftId: args.giftId?.toString() || '',
    tokenId: args.tokenId?.toString() || '',
    campaignId: args.campaignId || extractCampaignId(args),
    blockNumber: blockNumber.toString(),
    blockTimestamp,
    transactionHash: txHash,
    logIndex,
    data: {
      creator: args.creator,
      claimer: args.claimer,
      amount: args.amount?.toString(),
      educationData: args.educationData,
      referrer: args.referrer,
      metadata: args.metadata
    },
    processedAt: Date.now(),
    source
  };

  // Add to stream
  const streamId = await addEventToStream(redis, canonicalEvent);
  if (!streamId) {
    return false;
  }

  // Mark as processed
  const marked = await markEventProcessed(redis, eventId);
  if (!marked) {
    debugLogger.warn('Event added to stream but marking failed', { eventId });
  }

  // Update real-time aggregates
  await updateRealtimeAggregates(redis, canonicalEvent);

  return true;
}

/**
 * Update real-time aggregates for a processed event
 */
async function updateRealtimeAggregates(
  redis: Redis,
  event: CanonicalEvent
): Promise<void> {
  try {
    const day = new Date(event.blockTimestamp).toISOString().split('T')[0];
    const hour = new Date(event.blockTimestamp).toISOString().slice(0, 13);

    // Update daily stats with versioning
    await redis.hincrby(`ga:v1:daily:${day}`, event.type, 1);
    await redis.hincrby(`ga:v1:daily:${day}`, 'total', 1);

    // Update hourly stats with versioning (for recent data)
    await redis.hincrby(`ga:v1:hourly:${hour}`, event.type, 1);
    await redis.expire(`ga:v1:hourly:${hour}`, 86400); // 24 hour TTL for hourly

    // Update campaign stats with versioning
    await redis.hincrby(`ga:v1:campaign:${event.campaignId}`, event.type, 1);
    await redis.hincrby(`ga:v1:campaign:${event.campaignId}`, 'total', 1);

    // Update global stats with versioning
    await redis.hincrby('ga:v1:global', event.type, 1);
    await redis.hincrby('ga:v1:global', 'total', 1);

    debugLogger.log('Aggregates updated', {
      eventId: event.eventId,
      day,
      hour,
      campaignId: event.campaignId
    });
  } catch (error) {
    debugLogger.error('Failed to update aggregates', error as Error);
  }
}

/**
 * Extract campaign ID from event args
 */
function extractCampaignId(args: Record<string, any>): string {
  // Try various sources for campaign ID
  if (args.campaignId) return args.campaignId;
  if (args.creator) return `campaign_${args.creator.slice(0, 10)}`;
  if (args.giftId) return `campaign_gift_${args.giftId}`;
  return 'default';
}

/**
 * Get last processed block for reconciliation
 */
export async function getLastProcessedBlock(redis: Redis): Promise<bigint> {
  try {
    const block = await redis.get('ga:v1:lastProcessedBlock');
    return block ? BigInt(block as string) : 0n;
  } catch (error) {
    debugLogger.error('Failed to get last processed block', error);
    return 0n;
  }
}

/**
 * Set last processed block for reconciliation
 */
export async function setLastProcessedBlock(
  redis: Redis,
  blockNumber: bigint
): Promise<void> {
  try {
    await redis.set('ga:v1:lastProcessedBlock', blockNumber.toString());
    await redis.set('ga:v1:lastProcessedAt', new Date().toISOString());
  } catch (error) {
    debugLogger.error('Failed to set last processed block', error);
  }
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if analytics feature is enabled
 */
export function isAnalyticsEnabled(): boolean {
  // Server-side check
  if (typeof process !== 'undefined') {
    return process.env.FEATURE_ANALYTICS === 'true';
  }

  // Client-side check (Next.js public env)
  if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true';
  }

  return false;
}

/**
 * Get analytics configuration
 */
export function getAnalyticsConfig() {
  return {
    enabled: isAnalyticsEnabled(),
    reconciliationInterval: parseInt(process.env.ANALYTICS_RECONCILIATION_INTERVAL || '120'), // 2 minutes default
    materializationInterval: parseInt(process.env.ANALYTICS_MATERIALIZATION_INTERVAL || '3600'), // 1 hour default
    rewindBlocks: parseInt(process.env.ANALYTICS_REWIND_BLOCKS || '12'), // 12 blocks for reorg protection
    blockWindow: parseInt(process.env.ANALYTICS_BLOCK_WINDOW || '2000'), // 2000 blocks per batch
    eventTTLDays: parseInt(process.env.ANALYTICS_EVENT_TTL_DAYS || '14'), // 14 days TTL
    version: process.env.ANALYTICS_VERSION || 'v1'
  };
}