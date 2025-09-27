/**
 * POPULATE TEST DATA API
 * Creates test data to verify analytics system is working
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { recordGiftEvent, initializeCampaign } from '../../../lib/giftAnalytics';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // First check Redis connection
    const redis = validateRedisForCriticalOps('Populate test data');

    if (!redis) {
      return res.status(500).json({
        success: false,
        error: 'Redis not configured',
        message: 'Please configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local'
      });
    }

    // Test Redis connection
    try {
      await redis.ping();
    } catch (pingError: any) {
      return res.status(500).json({
        success: false,
        error: 'Redis connection failed',
        message: pingError.message
      });
    }

    const results = [];
    const now = Date.now();

    // Create multiple test campaigns
    for (let i = 1; i <= 3; i++) {
      const campaignId = `test_campaign_${i}`;
      const creator = `0x${i.toString().repeat(40).slice(0, 40)}`;

      // Initialize campaign
      await initializeCampaign(
        campaignId,
        `Test Campaign ${i}`,
        creator
      );
      results.push(`Campaign ${i} initialized`);

      // Create multiple gifts per campaign
      for (let j = 1; j <= 5; j++) {
        const giftId = `test_gift_${i}_${j}`;
        const tokenId = `${i * 100 + j}`;

        // Track creation
        await recordGiftEvent({
          eventId: `create_${giftId}_${now}`,
          type: 'created',
          campaignId,
          giftId,
          tokenId,
          referrer: creator,
          value: Math.floor(Math.random() * 500) + 50,
          timestamp: now - (j * 60000), // Stagger timestamps
          metadata: {
            test: true,
            createdBy: 'populate-test-data'
          }
        });

        // Track view (70% of gifts)
        if (Math.random() < 0.7) {
          await recordGiftEvent({
            eventId: `view_${giftId}_${now}`,
            type: 'viewed',
            campaignId,
            giftId,
            tokenId,
            timestamp: now - (j * 30000),
            metadata: { test: true }
          });
        }

        // Track claim (40% of gifts)
        if (Math.random() < 0.4) {
          await recordGiftEvent({
            eventId: `claim_${giftId}_${now}`,
            type: 'claimed',
            campaignId,
            giftId,
            tokenId,
            claimer: `0x${j.toString().repeat(40).slice(0, 40)}`,
            timestamp: now - (j * 10000),
            metadata: {
              test: true,
              educationCompleted: true,
              educationScore: 80 + Math.floor(Math.random() * 20)
            }
          });
        }
      }
      results.push(`Campaign ${i}: 5 gifts created`);
    }

    // Verify data was saved
    const allKeys = await redis.keys('gift:*');
    const campaignKeys = allKeys.filter(k => k.includes(':meta'));
    const counterKeys = allKeys.filter(k => k.includes(':d:'));

    return res.status(200).json({
      success: true,
      message: 'Test data populated successfully',
      results,
      verification: {
        totalKeys: allKeys.length,
        campaigns: campaignKeys.length,
        counters: counterKeys.length,
        sampleKeys: allKeys.slice(0, 10)
      },
      instructions: 'Now refresh /referrals/analytics to see the data',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Populate test data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to populate test data',
      message: error.message || 'Unknown error',
      stack: error.stack
    });
  }
}