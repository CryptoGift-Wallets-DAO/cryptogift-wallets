/**
 * Gift Analytics System - Enterprise-grade tracking and analytics
 * 
 * Features:
 * - 📊 Real-time gift tracking across campaigns
 * - 🎯 Conversion funnel analytics
 * - 📈 Time-series data with Redis Sorted Sets
 * - 🔄 Event-driven updates with idempotency
 * - ⚡ Sub-millisecond query performance
 * - 🔒 Type-safe with full TypeScript support
 */

import { Redis } from '@upstash/redis';
import { debugLogger } from './secureDebugLogger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GiftStatus {
  created: number;
  viewed: number;
  preClaimStarted: number;
  educationCompleted: number;
  claimed: number;
  expired: number;
  returned: number;
}

export interface CampaignStats {
  campaignId: string;
  campaignName: string;
  createdAt: string;
  owner: string;
  totalGifts: number;
  status: GiftStatus;
  conversionRate: number;
  avgClaimTime: number; // minutes
  totalValue: number; // USD
  topReferrers: Array<{ address: string; count: number; value: number }>;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface AnalyticsFilter {
  campaignId?: string | string[];
  from?: Date;
  to?: Date;
  status?: keyof GiftStatus;
  groupBy?: 'day' | 'week' | 'month';
  limit?: number;
}

export interface GiftEvent {
  eventId: string; // txHash + logIndex for idempotency
  type: 'created' | 'viewed' | 'preClaim' | 'education' | 'claimed' | 'expired' | 'returned';
  campaignId: string;
  giftId: string;
  tokenId?: string;
  referrer?: string;
  claimer?: string;
  value?: number;
  timestamp: number;
  txHash?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// REDIS KEY PATTERNS
// ============================================================================

const KEYS = {
  // Counters by campaign and status
  counter: (campaignId: string, date: string, status: string) => 
    `gift:camp:${campaignId}:d:${date}:${status}`,
  
  // Time series data (Sorted Sets)
  timeSeries: (campaignId: string, metric: string) => 
    `gift:camp:${campaignId}:ts:${metric}`,
  
  // Campaign metadata (Hash)
  campaignMeta: (campaignId: string) => 
    `gift:camp:${campaignId}:meta`,
  
  // Top referrers leaderboard (Sorted Set)
  topReferrers: (campaignId: string) => 
    `gift:camp:${campaignId}:top-refs`,
  
  // Individual gift tracking (Hash)
  giftDetails: (giftId: string) => 
    `gift:detail:${giftId}`,
  
  // Event idempotency (Set)
  seenEvent: (eventId: string) => 
    `gift:event:seen:${eventId}`,
  
  // Global stats
  globalStats: () => `gift:global:stats`,
  
  // User-specific stats
  userStats: (address: string) => 
    `gift:user:${address}:stats`
};

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      throw new Error('Redis configuration missing for analytics');
    }
    
    redisClient = new Redis({ url, token });
  }
  
  return redisClient;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDateKey(timestamp: number = Date.now()): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getStatusFromEventType(type: GiftEvent['type']): keyof GiftStatus {
  const mapping: Record<GiftEvent['type'], keyof GiftStatus> = {
    created: 'created',
    viewed: 'viewed',
    preClaim: 'preClaimStarted',
    education: 'educationCompleted',
    claimed: 'claimed',
    expired: 'expired',
    returned: 'returned'
  };
  return mapping[type];
}

// ============================================================================
// CORE ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Record a gift event with idempotency
 */
export async function recordGiftEvent(event: GiftEvent): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const dateKey = getDateKey(event.timestamp);
    const status = getStatusFromEventType(event.type);
    
    // Check idempotency
    const eventKey = KEYS.seenEvent(event.eventId);
    const isNew = await redis.setnx(eventKey, 1);
    if (!isNew) {
      debugLogger.log('Event already processed', { eventId: event.eventId });
      return false;
    }
    
    // Set expiry for seen events (30 days)
    await redis.expire(eventKey, 30 * 24 * 60 * 60);
    
    // Multi-exec for atomic updates
    const pipeline = redis.pipeline();
    
    // 1. Increment counter
    pipeline.incr(KEYS.counter(event.campaignId, dateKey, status));
    
    // 2. Add to time series (score = timestamp)
    pipeline.zadd(KEYS.timeSeries(event.campaignId, status), {
      score: event.timestamp,
      member: `${event.timestamp}:${event.giftId}`
    });
    
    // 3. Update campaign metadata
    pipeline.hincrby(KEYS.campaignMeta(event.campaignId), `total_${status}`, 1);
    
    // 4. Track referrer if present
    if (event.referrer) {
      pipeline.zincrby(KEYS.topReferrers(event.campaignId), 1, event.referrer);
      
      if (event.value) {
        pipeline.hincrby(
          KEYS.userStats(event.referrer), 
          'total_value', 
          Math.floor(event.value * 100) // Store as cents
        );
      }
    }
    
    // 5. Store gift details
    if (event.type === 'created') {
      pipeline.hset(KEYS.giftDetails(event.giftId), {
        campaignId: event.campaignId,
        createdAt: event.timestamp,
        status: 'created',
        value: event.value || 0,
        referrer: event.referrer || ''
      });
    } else {
      pipeline.hset(KEYS.giftDetails(event.giftId), {
        [`${status}At`]: event.timestamp,
        status: status,
        ...(event.claimer && { claimer: event.claimer })
      });
    }
    
    // 6. Update global stats
    pipeline.hincrby(KEYS.globalStats(), `total_${status}`, 1);
    
    await pipeline.exec();
    
    debugLogger.operation('Gift event recorded', {
      eventId: event.eventId,
      type: event.type,
      campaignId: event.campaignId
    });
    
    return true;
  } catch (error) {
    console.error('Failed to record gift event:', error);
    throw error;
  }
}

/**
 * Get campaign statistics with optional filtering
 */
export async function getCampaignStats(
  filter: AnalyticsFilter
): Promise<CampaignStats[]> {
  try {
    const redis = getRedisClient();
    const campaigns = Array.isArray(filter.campaignId) 
      ? filter.campaignId 
      : filter.campaignId 
      ? [filter.campaignId]
      : await getAllCampaignIds();
    
    const stats: CampaignStats[] = [];
    
    for (const campaignId of campaigns) {
      const meta = await redis.hgetall(KEYS.campaignMeta(campaignId));
      
      if (!meta || Object.keys(meta).length === 0) {
        continue;
      }
      
      // Calculate status counts
      const status: GiftStatus = {
        created: parseInt(meta.total_created as string || '0'),
        viewed: parseInt(meta.total_viewed as string || '0'),
        preClaimStarted: parseInt(meta.total_preClaimStarted as string || '0'),
        educationCompleted: parseInt(meta.total_educationCompleted as string || '0'),
        claimed: parseInt(meta.total_claimed as string || '0'),
        expired: parseInt(meta.total_expired as string || '0'),
        returned: parseInt(meta.total_returned as string || '0')
      };
      
      // Get top referrers
      const topRefs = await redis.zrange(
        KEYS.topReferrers(campaignId), 
        0, 
        4, 
        { withScores: true, rev: true }
      );
      
      const topReferrers = [];
      for (let i = 0; i < topRefs.length; i += 2) {
        const address = topRefs[i] as string;
        const count = topRefs[i + 1] as number;
        const userStats = await redis.hgetall(KEYS.userStats(address));
        
        topReferrers.push({
          address,
          count,
          value: parseInt(userStats?.total_value as string || '0') / 100
        });
      }
      
      // Calculate conversion rate
      const conversionRate = status.created > 0 
        ? (status.claimed / status.created) * 100 
        : 0;
      
      stats.push({
        campaignId,
        campaignName: meta.name as string || `Campaign ${campaignId}`,
        createdAt: meta.createdAt as string || new Date().toISOString(),
        owner: meta.owner as string || '',
        totalGifts: status.created,
        status,
        conversionRate,
        avgClaimTime: parseInt(meta.avg_claim_time as string || '0'),
        totalValue: parseInt(meta.total_value as string || '0') / 100,
        topReferrers
      });
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get campaign stats:', error);
    throw error;
  }
}

/**
 * Get time series data for a metric
 */
export async function getTimeSeries(
  campaignId: string,
  metric: keyof GiftStatus,
  from?: Date,
  to?: Date
): Promise<TimeSeriesPoint[]> {
  try {
    const redis = getRedisClient();
    const key = KEYS.timeSeries(campaignId, metric);
    
    const fromScore = from ? from.getTime() : '-inf';
    const toScore = to ? to.getTime() : '+inf';
    
    const data = await redis.zrange(key, fromScore, toScore, {
      byScore: true,
      withScores: true
    });
    
    const points: TimeSeriesPoint[] = [];
    for (let i = 0; i < data.length; i += 2) {
      points.push({
        timestamp: data[i + 1] as number,
        value: 1, // Each entry represents one event
        label: new Date(data[i + 1] as number).toLocaleDateString()
      });
    }
    
    // Aggregate by day if needed
    const aggregated = new Map<string, TimeSeriesPoint>();
    for (const point of points) {
      const dayKey = getDateKey(point.timestamp);
      const existing = aggregated.get(dayKey);
      
      if (existing) {
        existing.value += point.value;
      } else {
        aggregated.set(dayKey, {
          timestamp: point.timestamp,
          value: point.value,
          label: point.label
        });
      }
    }
    
    return Array.from(aggregated.values()).sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Failed to get time series:', error);
    throw error;
  }
}

/**
 * Get all campaign IDs (for filtering)
 */
async function getAllCampaignIds(): Promise<string[]> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys('gift:camp:*:meta');
    
    return keys.map(key => {
      const match = key.match(/gift:camp:(.+):meta/);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];
  } catch (error) {
    console.error('Failed to get campaign IDs:', error);
    return [];
  }
}

/**
 * Initialize campaign metadata
 */
export async function initializeCampaign(
  campaignId: string,
  name: string,
  owner: string
): Promise<void> {
  try {
    const redis = getRedisClient();
    
    await redis.hset(KEYS.campaignMeta(campaignId), {
      name,
      owner,
      createdAt: new Date().toISOString(),
      total_created: 0,
      total_viewed: 0,
      total_preClaimStarted: 0,
      total_educationCompleted: 0,
      total_claimed: 0,
      total_expired: 0,
      total_returned: 0,
      total_value: 0,
      avg_claim_time: 0
    });
    
    debugLogger.operation('Campaign initialized', { campaignId, name, owner });
  } catch (error) {
    console.error('Failed to initialize campaign:', error);
    throw error;
  }
}

/**
 * Export analytics data to CSV format
 * Uses neutral numeric format (no thousand separators, dot for decimals)
 * for universal compatibility across locales
 */
export function exportToCSV(stats: CampaignStats[]): string {
  const headers = [
    'Campaign ID',
    'Campaign Name',
    'Created At',
    'Owner',
    'Total Gifts',
    'Created',
    'Viewed',
    'Pre-Claim Started',
    'Education Completed',
    'Claimed',
    'Expired',
    'Returned',
    'Conversion Rate',
    'Avg Claim Time (min)',
    'Total Value'
  ].join(',');

  const rows = stats.map(stat => {
    // Escape quotes in campaign name for CSV
    const escapedName = stat.campaignName.replace(/"/g, '""');

    return [
      stat.campaignId,
      `"${escapedName}"`,
      stat.createdAt,
      stat.owner,
      stat.totalGifts.toString(),
      stat.status.created.toString(),
      stat.status.viewed.toString(),
      stat.status.preClaimStarted.toString(),
      stat.status.educationCompleted.toString(),
      stat.status.claimed.toString(),
      stat.status.expired.toString(),
      stat.status.returned.toString(),
      (stat.conversionRate / 100).toFixed(4), // Store as decimal, not percentage
      stat.avgClaimTime.toString(),
      stat.totalValue.toFixed(2)
    ].join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Clean up old time series data (retention policy)
 */
export async function cleanupOldData(daysToKeep: number = 180): Promise<void> {
  try {
    const redis = getRedisClient();
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    // Get all time series keys
    const tsKeys = await redis.keys('gift:camp:*:ts:*');
    
    for (const key of tsKeys) {
      // Remove old entries from sorted sets
      await redis.zremrangebyscore(key, '-inf', cutoffTime.toString());
    }
    
    debugLogger.operation('Old analytics data cleaned up', { 
      daysToKeep, 
      keysProcessed: tsKeys.length 
    });
  } catch (error) {
    console.error('Failed to cleanup old data:', error);
  }
}