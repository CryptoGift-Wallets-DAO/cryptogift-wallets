/**
 * RESET STREAM - Delete corrupted ga:v1:events and start fresh
 * EMERGENCY ENDPOINT - Use once to fix stream read issue
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method POST required' });
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    const results: any = {
      timestamp: new Date().toISOString(),
      actions: []
    };

    // Step 1: Get current stream info
    console.log('STEP 1: Getting current stream info...');
    try {
      const xlen = await redis.xlen('ga:v1:events');
      results.actions.push({
        action: 'Get Stream Info',
        success: true,
        xlen_before: xlen
      });
      console.log(`✅ Current stream has ${xlen} events`);
    } catch (error: any) {
      results.actions.push({
        action: 'Get Stream Info',
        success: false,
        error: error.message
      });
    }

    // Step 2: Delete corrupted stream
    console.log('STEP 2: Deleting corrupted stream...');
    try {
      const deleted = await redis.del('ga:v1:events');
      results.actions.push({
        action: 'Delete Stream',
        success: true,
        deleted_count: deleted
      });
      console.log(`✅ Stream deleted (${deleted} key removed)`);
    } catch (error: any) {
      results.actions.push({
        action: 'Delete Stream',
        success: false,
        error: error.message
      });
    }

    // Step 3: Verify deletion
    console.log('STEP 3: Verifying deletion...');
    try {
      const exists = await redis.exists('ga:v1:events');
      results.actions.push({
        action: 'Verify Deletion',
        success: true,
        stream_exists: exists === 1
      });
      console.log(`✅ Stream exists after deletion: ${exists === 1}`);
    } catch (error: any) {
      results.actions.push({
        action: 'Verify Deletion',
        success: false,
        error: error.message
      });
    }

    results.summary = {
      stream_reset: true,
      next_steps: [
        '1. Create a new gift to test tracking',
        '2. Check /api/analytics/compare-redis-live to verify XLEN increases',
        '3. Check /api/analytics/test-xadd to verify events can be read',
        '4. If successful, new events will be readable'
      ]
    };

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('💥 Reset stream failed:', error);
    return res.status(500).json({
      error: 'Reset failed',
      message: error.message,
      stack: error.stack
    });
  }
}
