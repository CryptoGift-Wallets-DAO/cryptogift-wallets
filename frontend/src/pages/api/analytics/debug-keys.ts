/**
 * DEBUG KEYS API
 * Shows all Redis keys to help debug the analytics system
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const redis = validateRedisForCriticalOps('Debug keys');

    if (!redis) {
      return res.status(200).json({
        success: false,
        error: 'Redis not configured',
        keys: []
      });
    }

    // Get all gift-related keys
    const allKeys = await redis.keys('gift:*');

    // Group keys by type
    const keyTypes = {
      campaignMeta: [] as string[],
      counters: [] as string[],
      giftDetails: [] as string[],
      events: [] as string[],
      timeSeries: [] as string[],
      other: [] as string[]
    };

    for (const key of allKeys) {
      if (key.includes(':meta')) {
        keyTypes.campaignMeta.push(key);
      } else if (key.includes(':d:')) {
        keyTypes.counters.push(key);
      } else if (key.includes('gift:detail:')) {
        keyTypes.giftDetails.push(key);
      } else if (key.includes('gift:event:')) {
        keyTypes.events.push(key);
      } else if (key.includes(':ts:')) {
        keyTypes.timeSeries.push(key);
      } else {
        keyTypes.other.push(key);
      }
    }

    // Sample some key values
    const sampleData: Record<string, any> = {};

    // Get campaign metadata
    for (const key of keyTypes.campaignMeta.slice(0, 3)) {
      sampleData[key] = await redis.hgetall(key);
    }

    // Get counter values
    for (const key of keyTypes.counters.slice(0, 5)) {
      sampleData[key] = await redis.get(key);
    }

    // Get gift details
    for (const key of keyTypes.giftDetails.slice(0, 3)) {
      sampleData[key] = await redis.hgetall(key);
    }

    return res.status(200).json({
      success: true,
      totalKeys: allKeys.length,
      keyTypes: {
        campaignMeta: keyTypes.campaignMeta.length,
        counters: keyTypes.counters.length,
        giftDetails: keyTypes.giftDetails.length,
        events: keyTypes.events.length,
        timeSeries: keyTypes.timeSeries.length,
        other: keyTypes.other.length
      },
      keys: keyTypes,
      sampleData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Debug keys error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch keys',
      message: error.message || 'Unknown error'
    });
  }
}