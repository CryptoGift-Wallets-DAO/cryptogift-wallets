/**
 * MATERIALIZATION SERVICE
 * Processes events from Redis Streams and creates optimized roll-ups
 *
 * Designed for QStash scheduled execution (hourly)
 * Creates pre-aggregated data for fast API responses (<200ms)
 *
 * QStash Headers:
 * - Upstash-Cron: 0 * * * *
 * - Upstash-Schedule-Id: ga-materialize-hourly
 * - Authorization: Bearer {INTERNAL_API_SECRET}
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { debugLogger } from '@/lib/secureDebugLogger';
import { isAnalyticsEnabled, getAnalyticsConfig } from '@/lib/analytics/canonicalEvents';

interface MaterializationResult {
  hourly: Record<string, any>;
  daily: Record<string, any>;
  campaigns: Record<string, any>;
  global: Record<string, any>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check feature flag
  if (!isAnalyticsEnabled()) {
    return res.status(200).json({
      success: true,
      disabled: true,
      message: 'Analytics feature is disabled'
    });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.authorization;
    const qstashSignature = req.headers['upstash-signature'];
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      console.error('INTERNAL_API_SECRET not configured');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const providedSecret = authHeader?.replace('Bearer ', '');
    const isAuthorized = providedSecret === expectedSecret || !!qstashSignature;

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const startTime = Date.now();
    const traceId = `materialize-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const config = getAnalyticsConfig();

    debugLogger.operation('Starting materialization', { traceId, config });

    // Initialize Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    // Get time boundaries for processing
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour
    const dayAgo = now - 86400000; // 24 hours
    const currentHour = new Date(now).toISOString().slice(0, 13);
    const currentDay = new Date(now).toISOString().split('T')[0];

    // Initialize result tracking
    const results: MaterializationResult = {
      hourly: {},
      daily: {},
      campaigns: {},
      global: {}
    };

    // Read events from Redis Stream for the last hour
    // Using XRANGE with stream IDs (not raw timestamps)
    const streamEndId = '+'; // Latest
    const streamStartId = `${hourAgo}-0`; // Hour ago

    debugLogger.operation('Reading events from stream', {
      streamKey: 'ga:events',
      startId: streamStartId,
      endId: streamEndId
    });

    let events: any[] = [];
    try {
      events = await redis.xrange('ga:events', streamStartId, streamEndId, 1000) as any[];
    } catch (error) {
      debugLogger.error('Failed to read stream', error as Error);
      // Continue even if stream doesn't exist yet
    }

    debugLogger.operation('Processing events', {
      eventCount: events.length,
      traceId
    });

    // Process events into aggregates
    const hourlyStats: Record<string, any> = {};
    const dailyStats: Record<string, any> = {};
    const campaignStats: Record<string, any> = {};
    const globalStats = {
      created: 0,
      viewed: 0,
      claimed: 0,
      expired: 0,
      returned: 0,
      totalValue: 0,
      uniqueUsers: new Set<string>(),
      uniqueGifts: new Set<string>()
    };

    for (const [streamId, fields] of events) {
      try {
        const eventData = fields as Record<string, string>;
        const eventType = eventData.type;
        const giftId = eventData.giftId;
        const campaignId = eventData.campaignId;
        const timestamp = parseInt(eventData.blockTimestamp || eventData.timestamp || '0');

        // Parse additional data
        let data: any = {};
        if (eventData.data) {
          try {
            data = JSON.parse(eventData.data);
          } catch (e) {
            // Continue with empty data
          }
        }

        // Update global stats
        switch (eventType) {
          case 'GiftCreated':
            globalStats.created++;
            if (data.amount) {
              globalStats.totalValue += parseFloat(data.amount) / 1e18;
            }
            break;
          case 'GiftViewed':
            globalStats.viewed++;
            break;
          case 'GiftClaimed':
            globalStats.claimed++;
            if (data.claimer) {
              globalStats.uniqueUsers.add(data.claimer);
            }
            break;
          case 'GiftExpired':
            globalStats.expired++;
            break;
          case 'GiftReturned':
            globalStats.returned++;
            break;
        }

        if (giftId) {
          globalStats.uniqueGifts.add(giftId);
        }

        // Update hourly stats
        const eventHour = new Date(timestamp).toISOString().slice(0, 13);
        if (!hourlyStats[eventHour]) {
          hourlyStats[eventHour] = {
            created: 0,
            viewed: 0,
            claimed: 0,
            expired: 0,
            returned: 0,
            totalValue: 0,
            uniqueUsers: new Set<string>()
          };
        }

        hourlyStats[eventHour][eventType.replace('Gift', '').toLowerCase()]++;
        if (data.amount) {
          hourlyStats[eventHour].totalValue += parseFloat(data.amount) / 1e18;
        }
        if (data.claimer) {
          hourlyStats[eventHour].uniqueUsers.add(data.claimer);
        }

        // Update daily stats
        const eventDay = new Date(timestamp).toISOString().split('T')[0];
        if (!dailyStats[eventDay]) {
          dailyStats[eventDay] = {
            created: 0,
            viewed: 0,
            claimed: 0,
            expired: 0,
            returned: 0,
            totalValue: 0,
            uniqueUsers: new Set<string>()
          };
        }

        dailyStats[eventDay][eventType.replace('Gift', '').toLowerCase()]++;
        if (data.amount) {
          dailyStats[eventDay].totalValue += parseFloat(data.amount) / 1e18;
        }
        if (data.claimer) {
          dailyStats[eventDay].uniqueUsers.add(data.claimer);
        }

        // Update campaign stats
        if (campaignId) {
          if (!campaignStats[campaignId]) {
            campaignStats[campaignId] = {
              created: 0,
              viewed: 0,
              claimed: 0,
              expired: 0,
              returned: 0,
              totalValue: 0,
              uniqueUsers: new Set<string>(),
              conversionRate: 0
            };
          }

          campaignStats[campaignId][eventType.replace('Gift', '').toLowerCase()]++;
          if (data.amount) {
            campaignStats[campaignId].totalValue += parseFloat(data.amount) / 1e18;
          }
          if (data.claimer) {
            campaignStats[campaignId].uniqueUsers.add(data.claimer);
          }
        }

      } catch (error) {
        debugLogger.error('Error processing event', error as Error);
        continue;
      }
    }

    // Calculate conversion rates
    for (const campaign of Object.values(campaignStats)) {
      if (campaign.created > 0) {
        campaign.conversionRate = (campaign.claimed / campaign.created) * 100;
      }
    }

    // Save roll-ups to Redis
    const pipeline = redis.pipeline();

    // Save hourly roll-ups (24 hour TTL)
    for (const [hour, stats] of Object.entries(hourlyStats)) {
      const key = `ga:rollup:hourly:${hour}`;
      pipeline.hset(key, {
        created: stats.created.toString(),
        viewed: stats.viewed.toString(),
        claimed: stats.claimed.toString(),
        expired: stats.expired.toString(),
        returned: stats.returned.toString(),
        totalValue: stats.totalValue.toFixed(2),
        uniqueUsers: stats.uniqueUsers.size.toString(),
        conversionRate: stats.created > 0
          ? ((stats.claimed / stats.created) * 100).toFixed(2)
          : '0'
      });
      pipeline.expire(key, 86400); // 24 hour TTL
      results.hourly[hour] = stats;
    }

    // Save daily roll-ups (30 day TTL)
    for (const [day, stats] of Object.entries(dailyStats)) {
      const key = `ga:rollup:daily:${day}`;
      pipeline.hset(key, {
        created: stats.created.toString(),
        viewed: stats.viewed.toString(),
        claimed: stats.claimed.toString(),
        expired: stats.expired.toString(),
        returned: stats.returned.toString(),
        totalValue: stats.totalValue.toFixed(2),
        uniqueUsers: stats.uniqueUsers.size.toString(),
        conversionRate: stats.created > 0
          ? ((stats.claimed / stats.created) * 100).toFixed(2)
          : '0'
      });
      pipeline.expire(key, 2592000); // 30 day TTL
      results.daily[day] = stats;
    }

    // Save campaign roll-ups (no TTL - permanent)
    for (const [campaignId, stats] of Object.entries(campaignStats)) {
      const key = `ga:rollup:campaign:${campaignId}`;
      pipeline.hset(key, {
        created: stats.created.toString(),
        viewed: stats.viewed.toString(),
        claimed: stats.claimed.toString(),
        expired: stats.expired.toString(),
        returned: stats.returned.toString(),
        totalValue: stats.totalValue.toFixed(2),
        uniqueUsers: stats.uniqueUsers.size.toString(),
        conversionRate: stats.conversionRate.toFixed(2),
        lastUpdated: new Date().toISOString()
      });
      results.campaigns[campaignId] = stats;
    }

    // Save global stats
    const globalKey = 'ga:rollup:global';
    pipeline.hset(globalKey, {
      created: globalStats.created.toString(),
      viewed: globalStats.viewed.toString(),
      claimed: globalStats.claimed.toString(),
      expired: globalStats.expired.toString(),
      returned: globalStats.returned.toString(),
      totalValue: globalStats.totalValue.toFixed(2),
      uniqueUsers: globalStats.uniqueUsers.size.toString(),
      uniqueGifts: globalStats.uniqueGifts.size.toString(),
      conversionRate: globalStats.created > 0
        ? ((globalStats.claimed / globalStats.created) * 100).toFixed(2)
        : '0',
      lastUpdated: new Date().toISOString()
    });
    results.global = globalStats;

    // Save metadata about materialization
    pipeline.set('ga:materialization:lastRun', new Date().toISOString());
    pipeline.set('ga:materialization:lastEventCount', events.length.toString());

    // Execute pipeline
    await pipeline.exec();

    const processingTime = Date.now() - startTime;

    debugLogger.operation('Materialization completed', {
      traceId,
      eventsProcessed: events.length,
      hourlyRollups: Object.keys(hourlyStats).length,
      dailyRollups: Object.keys(dailyStats).length,
      campaignRollups: Object.keys(campaignStats).length,
      processingTimeMs: processingTime
    });

    // Add observability headers
    res.setHeader('X-Analytics-Version', 'v1');
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('X-Processing-Time', processingTime.toString());

    res.status(200).json({
      success: true,
      eventsProcessed: events.length,
      rollups: {
        hourly: Object.keys(hourlyStats).length,
        daily: Object.keys(dailyStats).length,
        campaigns: Object.keys(campaignStats).length
      },
      processingTimeMs: processingTime,
      traceId
    });

  } catch (error: any) {
    const errorTrace = `error-${Date.now()}`;
    console.error('Materialization error:', error);
    debugLogger.error('Materialization failed', error);

    res.status(500).json({
      success: false,
      error: 'Materialization failed',
      trace: errorTrace
    });
  }
}