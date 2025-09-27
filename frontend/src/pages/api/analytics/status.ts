/**
 * ANALYTICS STATUS API
 * Check Redis connection and stored data status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { getCampaignStats } from '../../../lib/giftAnalytics';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check Redis configuration
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return res.status(500).json({
        success: false,
        error: 'Redis not configured',
        message: 'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables'
      });
    }

    // Try to connect to Redis
    const redis = new Redis({ url, token });

    // Test Redis connection
    try {
      await redis.ping();
    } catch (pingError: any) {
      return res.status(500).json({
        success: false,
        error: 'Redis connection failed',
        message: pingError.message || 'Could not connect to Redis'
      });
    }

    // Get some sample keys to check data
    const sampleKeys = await redis.keys('gift:*');
    const keyCount = sampleKeys.length;

    // Get campaign stats
    let stats = [];
    try {
      stats = await getCampaignStats({});
    } catch (statsError) {
      console.error('Error fetching stats:', statsError);
    }

    // Check for specific key patterns
    const patterns = {
      campaigns: await redis.keys('gift:camp:*:meta'),
      events: await redis.keys('gift:event:seen:*'),
      timeSeries: await redis.keys('gift:camp:*:ts:*'),
      gifts: await redis.keys('gift:detail:*'),
      counters: await redis.keys('gift:camp:*:d:*:*')
    };

    return res.status(200).json({
      success: true,
      redis: {
        connected: true,
        url: url.replace(/([^:]+:\/\/[^:]+:)[^@]+(@.+)/, '$1***$2'), // Hide token
        totalKeys: keyCount
      },
      data: {
        campaigns: patterns.campaigns.length,
        events: patterns.events.length,
        timeSeries: patterns.timeSeries.length,
        gifts: patterns.gifts.length,
        counters: patterns.counters.length,
        stats: stats.length
      },
      summary: {
        hasCampaigns: patterns.campaigns.length > 0,
        hasEvents: patterns.events.length > 0,
        hasAnalytics: keyCount > 0
      },
      sampleKeys: sampleKeys.slice(0, 10), // Show first 10 keys
      message: keyCount > 0
        ? `Found ${keyCount} analytics keys in Redis`
        : 'No analytics data found. Import historical data or create new gifts to start tracking.'
    });

  } catch (error: any) {
    console.error('Analytics status error:', error);

    return res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: error.message || 'Unknown error',
      details: error.stack?.substring(0, 500)
    });
  }
}