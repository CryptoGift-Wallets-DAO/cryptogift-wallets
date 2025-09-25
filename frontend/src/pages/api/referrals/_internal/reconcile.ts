import type { NextApiRequest, NextApiResponse } from 'next';
import { getContract, prepareContractCall, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';
import { recordGiftEvent, type GiftEvent } from '@/lib/giftAnalytics';
import { debugLogger } from '@/lib/secureDebugLogger';
import { Redis } from '@upstash/redis';

/**
 * POST /api/referrals/_internal/reconcile
 * 
 * Reconciliation cron job that syncs blockchain events with analytics
 * Designed to be called by QStash on a schedule (every 15-60 minutes)
 * 
 * Headers for QStash:
 * - Upstash-Cron: "*/15 * * * *" (every 15 minutes)
 * - Upstash-Forward-X-Internal-Secret: {INTERNAL_API_SECRET}
 */

interface BlockchainEvent {
  eventName: string;
  args: any;
  transactionHash: string;
  blockNumber: bigint;
  logIndex: number;
  timestamp?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Verify internal secret or QStash signature
    const internalSecret = req.headers['x-internal-secret'];
    const qstashSignature = req.headers['upstash-signature'];
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    
    if (!expectedSecret || (internalSecret !== expectedSecret && !qstashSignature)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const startTime = Date.now();
    debugLogger.operation('Starting blockchain reconciliation');
    
    // Get last processed block from Redis or use default
    const lastProcessedBlock = await getLastProcessedBlock();
    const fromBlock = req.body.fromBlock 
      ? BigInt(req.body.fromBlock) 
      : lastProcessedBlock + 1n;
    
    // Get current block (with some buffer for reorgs)
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY
    });
    
    const currentBlock = await getCurrentBlock();
    const toBlock = currentBlock - 3n; // 3 block confirmations
    
    if (fromBlock > toBlock) {
      return res.status(200).json({
        success: true,
        message: 'No new blocks to process',
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        eventsProcessed: 0
      });
    }
    
    // Limit range to avoid timeouts (max 2000 blocks per run)
    const maxBlockRange = 2000n;
    const actualToBlock = fromBlock + maxBlockRange > toBlock 
      ? toBlock 
      : fromBlock + maxBlockRange - 1n;
    
    debugLogger.operation('Processing block range', {
      fromBlock: fromBlock.toString(),
      toBlock: actualToBlock.toString(),
      range: (actualToBlock - fromBlock + 1n).toString()
    });
    
    // Get NFT and Escrow contract instances
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS as `0x${string}`
    });
    
    const escrowContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}`
    });
    
    // Fetch events (using thirdweb v5's getContractEvents)
    const events: BlockchainEvent[] = [];
    let eventsProcessed = 0;
    
    // Get GiftCreated events
    try {
      const giftCreatedEvents = await getContractEvents({
        contract: escrowContract,
        eventName: 'GiftCreated',
        fromBlock,
        toBlock: actualToBlock
      });
      
      for (const event of giftCreatedEvents) {
        const giftEvent: GiftEvent = {
          eventId: `${event.transactionHash}-${event.logIndex}`,
          type: 'created',
          campaignId: extractCampaignId(event),
          giftId: event.args.giftId?.toString() || '',
          tokenId: event.args.tokenId?.toString(),
          referrer: event.args.creator,
          value: parseFloat(event.args.amount?.toString() || '0') / 1e18, // Convert from wei
          timestamp: await getBlockTimestamp(event.blockNumber),
          txHash: event.transactionHash
        };
        
        const recorded = await recordGiftEvent(giftEvent);
        if (recorded) eventsProcessed++;
      }
    } catch (error) {
      console.error('Error fetching GiftCreated events:', error);
    }
    
    // Get GiftClaimed events
    try {
      const giftClaimedEvents = await getContractEvents({
        contract: escrowContract,
        eventName: 'GiftClaimed',
        fromBlock,
        toBlock: actualToBlock
      });
      
      for (const event of giftClaimedEvents) {
        const giftEvent: GiftEvent = {
          eventId: `${event.transactionHash}-${event.logIndex}`,
          type: 'claimed',
          campaignId: extractCampaignId(event),
          giftId: event.args.giftId?.toString() || '',
          tokenId: event.args.tokenId?.toString(),
          claimer: event.args.claimer,
          timestamp: await getBlockTimestamp(event.blockNumber),
          txHash: event.transactionHash
        };
        
        const recorded = await recordGiftEvent(giftEvent);
        if (recorded) eventsProcessed++;
      }
    } catch (error) {
      console.error('Error fetching GiftClaimed events:', error);
    }
    
    // Get GiftExpired events
    try {
      const giftExpiredEvents = await getContractEvents({
        contract: escrowContract,
        eventName: 'GiftExpired',
        fromBlock,
        toBlock: actualToBlock
      });
      
      for (const event of giftExpiredEvents) {
        const giftEvent: GiftEvent = {
          eventId: `${event.transactionHash}-${event.logIndex}`,
          type: 'expired',
          campaignId: extractCampaignId(event),
          giftId: event.args.giftId?.toString() || '',
          tokenId: event.args.tokenId?.toString(),
          timestamp: await getBlockTimestamp(event.blockNumber),
          txHash: event.transactionHash
        };
        
        const recorded = await recordGiftEvent(giftEvent);
        if (recorded) eventsProcessed++;
      }
    } catch (error) {
      console.error('Error fetching GiftExpired events:', error);
    }
    
    // Get GiftReturned events
    try {
      const giftReturnedEvents = await getContractEvents({
        contract: escrowContract,
        eventName: 'GiftReturned',
        fromBlock,
        toBlock: actualToBlock
      });
      
      for (const event of giftReturnedEvents) {
        const giftEvent: GiftEvent = {
          eventId: `${event.transactionHash}-${event.logIndex}`,
          type: 'returned',
          campaignId: extractCampaignId(event),
          giftId: event.args.giftId?.toString() || '',
          tokenId: event.args.tokenId?.toString(),
          timestamp: await getBlockTimestamp(event.blockNumber),
          txHash: event.transactionHash
        };
        
        const recorded = await recordGiftEvent(giftEvent);
        if (recorded) eventsProcessed++;
      }
    } catch (error) {
      console.error('Error fetching GiftReturned events:', error);
    }
    
    // Update last processed block
    await saveLastProcessedBlock(actualToBlock);
    
    const processingTime = Date.now() - startTime;
    
    debugLogger.operation('Blockchain reconciliation completed', {
      fromBlock: fromBlock.toString(),
      toBlock: actualToBlock.toString(),
      eventsProcessed,
      processingTimeMs: processingTime
    });
    
    res.status(200).json({
      success: true,
      fromBlock: fromBlock.toString(),
      toBlock: actualToBlock.toString(),
      eventsProcessed,
      processingTimeMs: processingTime,
      nextBlock: (actualToBlock + 1n).toString(),
      hasMore: actualToBlock < toBlock
    });
    
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    debugLogger.error('Reconciliation failed', error);
    
    res.status(500).json({
      success: false,
      error: 'Reconciliation failed',
      message: error.message
    });
  }
}

// Helper functions

async function getCurrentBlock(): Promise<bigint> {
  // TODO: Implement using thirdweb or viem
  // For now, return a mock value
  return BigInt(1000000);
}

async function getBlockTimestamp(blockNumber: bigint): Promise<number> {
  // TODO: Implement block timestamp fetching
  // For now, estimate based on 2 second block time
  const currentBlock = await getCurrentBlock();
  const blocksDiff = Number(currentBlock - blockNumber);
  return Date.now() - (blocksDiff * 2000);
}

async function getLastProcessedBlock(): Promise<bigint> {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      debugLogger.log('Redis not configured, using default block');
      return BigInt(999000); // Default fallback
    }

    const redis = new Redis({ url, token });
    const stored = await redis.get('gift:reconciliation:lastProcessedBlock');

    if (stored) {
      return BigInt(stored as string);
    }

    // Default to a reasonable starting point (adjust based on deployment)
    return BigInt(999000);
  } catch (error) {
    console.error('Error getting last processed block:', error);
    return BigInt(999000);
  }
}

async function saveLastProcessedBlock(blockNumber: bigint): Promise<void> {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      debugLogger.log('Redis not configured, cannot save block number');
      return;
    }

    const redis = new Redis({ url, token });

    // Save with metadata for debugging
    await redis.set('gift:reconciliation:lastProcessedBlock', blockNumber.toString());
    await redis.set('gift:reconciliation:lastProcessedAt', new Date().toISOString());

    debugLogger.operation('Saved last processed block', {
      blockNumber: blockNumber.toString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving last processed block:', error);
    // Don't throw - this is not critical for the reconciliation to continue
  }
}

function extractCampaignId(event: BlockchainEvent): string {
  // Extract campaign ID from event args or metadata
  // This might need custom logic based on your contract structure
  return event.args.campaignId || event.args.metadata?.campaignId || 'default';
}

async function getContractEvents(params: {
  contract: any;
  eventName: string;
  fromBlock: bigint;
  toBlock: bigint;
}): Promise<BlockchainEvent[]> {
  // TODO: Implement using thirdweb v5's actual getContractEvents
  // This is a placeholder
  return [];
}