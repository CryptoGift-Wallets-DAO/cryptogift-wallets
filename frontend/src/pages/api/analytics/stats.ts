/**
 * ANALYTICS STATS API
 * Fetches real-time analytics data from Redis
 *
 * This endpoint provides comprehensive gift campaign statistics
 * including creation, claims, education progress, and conversion metrics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignStats, getTimeSeries, exportToCSV } from '../../../lib/giftAnalytics';
import { verifyJWT, extractTokenFromHeaders } from '../../../lib/siweAuth';
import { getMemoryStats, getMemoryStatus } from '../../../lib/memoryAnalytics';

interface StatsRequest {
  campaignIds?: string[];
  from?: string;
  to?: string;
  status?: string;
  groupBy?: 'day' | 'week' | 'month';
  limit?: number;
  format?: 'json' | 'csv';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    // Optional authentication (not required for public stats)
    let authenticatedAddress: string | null = null;
    try {
      const authHeader = req.headers.authorization;
      const token = extractTokenFromHeaders(authHeader);

      if (token) {
        const payload = verifyJWT(token);
        if (payload) {
          authenticatedAddress = payload.address;
          console.log('📊 Analytics request authenticated:', authenticatedAddress.slice(0, 10) + '...');
        }
      }
    } catch (authError) {
      // Authentication is optional for analytics
      console.log('📊 Analytics request without authentication');
    }

    // Parse request parameters
    const params: StatsRequest = req.method === 'GET' ? req.query : req.body;

    const {
      campaignIds,
      from,
      to,
      status,
      groupBy,
      limit,
      format = 'json'
    } = params;

    // Build filter object
    const filter = {
      campaignId: campaignIds,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status: status as any,
      groupBy,
      limit
    };

    // Fetch campaign statistics from Redis
    console.log('📊 Fetching campaign stats with filter:', filter);

    // Add debugging to check Redis connection
    try {
      const { validateRedisForCriticalOps } = require('../../../lib/redisConfig');
      const redis = validateRedisForCriticalOps('Stats API');

      if (!redis) {
        console.log('❌ Redis not configured in stats API');
        return res.status(200).json({
          success: false,
          stats: [],
          message: 'Redis not configured - please check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
          debug: {
            redisConfigured: false
          }
        });
      }

      // Check if any keys exist
      const allKeys = await redis.keys('gift:*');
      console.log(`📊 Found ${allKeys.length} total Redis keys`);

      if (allKeys.length > 0) {
        console.log('📊 Sample keys:', allKeys.slice(0, 5));
      }
    } catch (debugError) {
      console.error('❌ Debug error:', debugError);
    }

    let stats;

    // Try Redis first, fallback to memory
    try {
      stats = await getCampaignStats(filter);
    } catch (redisError) {
      console.log('📊 Redis error, trying memory fallback');
      stats = [];
    }

    // If no Redis data, try memory data
    if (!stats || stats.length === 0) {
      console.log('📊 No Redis data, checking memory...');
      const memoryStats = getMemoryStats();
      const memoryStatus = getMemoryStatus();

      if (memoryStats.length > 0) {
        console.log(`📊 Found ${memoryStats.length} campaigns in memory`);
        stats = memoryStats;
      } else {
        console.log('📊 No data in memory either');
        return res.status(200).json({
          success: true,
          stats: [],
          message: 'No campaign data available yet. Try importing real gifts first!',
          debug: {
            redisKeys: 0,
            memoryStatus,
            hint: 'Go to /referrals/analytics/debug and click "🔥 IMPORT REAL GIFTS FROM BLOCKCHAIN"'
          }
        });
      }
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csvData = exportToCSV(stats);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="gift-analytics.csv"');
      return res.status(200).send(csvData);
    }

    // Return JSON response
    return res.status(200).json({
      success: true,
      stats,
      totalCampaigns: stats.length,
      summary: {
        totalGifts: stats.reduce((sum, s) => sum + s.totalGifts, 0),
        totalClaimed: stats.reduce((sum, s) => sum + s.status.claimed, 0),
        totalViewed: stats.reduce((sum, s) => sum + s.status.viewed, 0),
        totalEducationCompleted: stats.reduce((sum, s) => sum + s.status.educationCompleted, 0),
        averageConversionRate: stats.length > 0
          ? stats.reduce((sum, s) => sum + s.conversionRate, 0) / stats.length
          : 0,
        totalValue: stats.reduce((sum, s) => sum + s.totalValue, 0)
      },
      requestedBy: authenticatedAddress,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📊 Analytics API error:', error);

    return res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}