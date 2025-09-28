/**
 * FAST STATS API - OPTIMIZED FOR <200MS RESPONSE
 * Serves pre-aggregated data from Redis roll-ups
 * Never touches blockchain - only Redis
 *
 * Endpoints:
 * - GET /api/analytics/fast-stats?type=global
 * - GET /api/analytics/fast-stats?type=campaign&id=xxx
 * - GET /api/analytics/fast-stats?type=daily&date=2024-01-01
 * - GET /api/analytics/fast-stats?type=hourly&hour=2024-01-01T14
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { debugLogger } from '@/lib/secureDebugLogger';
import { isAnalyticsEnabled, getAnalyticsConfig } from '@/lib/analytics/canonicalEvents';

interface FastStatsResponse {
  success: boolean;
  data?: any;
  cached: boolean;
  responseTimeMs: number;
  traceId: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FastStatsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      cached: false,
      responseTimeMs: 0,
      traceId: '',
      message: 'Method not allowed'
    });
  }

  const startTime = Date.now();
  const traceId = `fast-stats-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Check feature flag
  if (!isAnalyticsEnabled()) {
    return res.status(200).json({
      success: true,
      data: {
        created: 0,
        viewed: 0,
        claimed: 0,
        expired: 0,
        returned: 0,
        totalValue: 0,
        uniqueUsers: 0,
        conversionRate: 0
      },
      cached: false,
      responseTimeMs: Date.now() - startTime,
      traceId,
      message: 'Analytics disabled'
    });
  }

  try {
    // Parse query parameters
    const { type = 'global', id, date, hour, from, to } = req.query;

    // Check Redis configuration
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.status(200).json({
        success: false,
        cached: false,
        responseTimeMs: Date.now() - startTime,
        traceId,
        message: 'Redis not configured'
      });
    }

    // Initialize Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });

    let data: any = null;
    let cacheKey: string = '';

    // Serve data based on type
    switch (type) {
      case 'global':
        // Get global aggregated stats with versioning
        cacheKey = 'ga:v1:rollup:global';
        data = await redis.hgetall(cacheKey);

        if (!data || Object.keys(data).length === 0) {
          // Fallback to calculating from recent data
          const recentKeys = await redis.keys('ga:v1:rollup:daily:*');
          if (recentKeys.length > 0) {
            // Get last 7 days of data
            const pipeline = redis.pipeline();
            const last7Days = recentKeys.slice(-7);
            for (const key of last7Days) {
              pipeline.hgetall(key);
            }
            const results = await pipeline.exec();

            // Aggregate results
            data = {
              created: 0,
              viewed: 0,
              claimed: 0,
              expired: 0,
              returned: 0,
              totalValue: 0,
              uniqueUsers: 0
            };

            for (const result of results) {
              if (result && typeof result === 'object') {
                const r = result as any;
                data.created += parseInt(r.created || '0');
                data.viewed += parseInt(r.viewed || '0');
                data.claimed += parseInt(r.claimed || '0');
                data.expired += parseInt(r.expired || '0');
                data.returned += parseInt(r.returned || '0');
                data.totalValue += parseFloat(r.totalValue || '0');
                data.uniqueUsers += parseInt(r.uniqueUsers || '0');
              }
            }

            data.conversionRate = data.created > 0
              ? ((data.claimed / data.created) * 100).toFixed(2)
              : '0';
          }
        }
        break;

      case 'campaign':
        // Get campaign-specific stats
        if (!id) {
          return res.status(400).json({
            success: false,
            cached: false,
            responseTimeMs: Date.now() - startTime,
            traceId,
            message: 'Campaign ID required'
          });
        }

        cacheKey = `ga:v1:rollup:campaign:${id}`;
        data = await redis.hgetall(cacheKey);
        break;

      case 'daily':
        // Get daily stats
        const targetDate = date || new Date().toISOString().split('T')[0];
        cacheKey = `ga:v1:rollup:daily:${targetDate}`;
        data = await redis.hgetall(cacheKey);
        break;

      case 'hourly':
        // Get hourly stats
        const targetHour = hour || new Date().toISOString().slice(0, 13);
        cacheKey = `ga:v1:rollup:hourly:${targetHour}`;
        data = await redis.hgetall(cacheKey);
        break;

      case 'range':
        // Get stats for a date range
        if (!from || !to) {
          return res.status(400).json({
            success: false,
            cached: false,
            responseTimeMs: Date.now() - startTime,
            traceId,
            message: 'From and to dates required for range query'
          });
        }

        // Generate date range
        const dates: string[] = [];
        const startDate = new Date(from as string);
        const endDate = new Date(to as string);

        for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }

        // Batch get all daily stats
        if (dates.length > 0 && dates.length <= 31) { // Max 31 days
          const pipeline = redis.pipeline();
          for (const date of dates) {
            pipeline.hgetall(`ga:v1:rollup:daily:${date}`);
          }
          const results = await pipeline.exec();

          // Format as time series
          data = dates.map((date, index) => ({
            date,
            ...(results[index] as any || {})
          }));
        } else {
          data = [];
        }
        break;

      case 'recent':
        // Get most recent events (last hour)
        const recentHour = new Date().toISOString().slice(0, 13);
        cacheKey = `ga:v1:rollup:hourly:${recentHour}`;
        const recentData = await redis.hgetall(cacheKey);

        // Also get last few events from stream
        const recentEventsRaw = await redis.xrevrange(
          'ga:v1:events',
          '+',
          '-',
          10 // Last 10 events
        );

        // Convert to array safely
        const recentEvents = (recentEventsRaw as unknown) as any[];

        data = {
          summary: recentData,
          recentEvents: recentEvents.map((entry: any) => ({
            id: entry[0],
            ...entry[1]
          }))
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          cached: false,
          responseTimeMs: Date.now() - startTime,
          traceId,
          message: `Invalid type: ${type}`
        });
    }

    // Ensure data has default structure
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      data = {
        created: 0,
        viewed: 0,
        claimed: 0,
        expired: 0,
        returned: 0,
        totalValue: 0,
        uniqueUsers: 0,
        conversionRate: 0,
        message: 'No data available - run reconciliation first'
      };
    }

    const responseTime = Date.now() - startTime;

    // Log if response time exceeds target
    if (responseTime > 200) {
      debugLogger.warn('Slow response detected', {
        traceId,
        responseTimeMs: responseTime,
        type,
        cacheKey
      });
    }

    // Add performance headers
    const config = getAnalyticsConfig();
    res.setHeader('X-Analytics-Version', 'v1');
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('X-Response-Time', responseTime.toString());
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute cache

    res.status(200).json({
      success: true,
      data,
      cached: true,
      responseTimeMs: responseTime,
      traceId
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('Fast stats error:', error);
    debugLogger.error('Fast stats failed', error);

    res.status(500).json({
      success: false,
      cached: false,
      responseTimeMs: responseTime,
      traceId,
      message: 'Internal server error'
    });
  }
}