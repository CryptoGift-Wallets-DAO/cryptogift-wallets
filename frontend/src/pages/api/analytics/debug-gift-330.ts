/**
 * DEBUG ENDPOINT: Check Redis data for gift #330
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    const tokenId = '330';
    const giftId = '356';

    const results: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    // Check gift:detail:{giftId}
    console.error(`🔍 CHECK: gift:detail:${giftId}`);
    const giftDetail = await redis.hgetall(`gift:detail:${giftId}`);
    results.checks.push({
      key: `gift:detail:${giftId}`,
      exists: !!giftDetail && Object.keys(giftDetail || {}).length > 0,
      value: giftDetail,
      keys: giftDetail ? Object.keys(giftDetail) : [],
      hasClaimer: !!(giftDetail as any)?.claimer,
      claimerValue: (giftDetail as any)?.claimer
    });

    // Summary
    results.summary = {
      hasGiftDetail: results.checks[0].exists,
      hasClaimer: results.checks[0].hasClaimer,
      claimerAddress: results.checks[0].claimerValue,
      diagnosis: !results.checks[0].exists ? 'NO DATA IN REDIS' :
                 !results.checks[0].hasClaimer ? 'NO CLAIMER - NOT CLAIMED YET' :
                 'HAS CLAIMER - SHOULD DISPLAY'
    };

    console.error('✅ DEBUG COMPLETE:', results.summary);

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('💥 Debug endpoint failed:', error);
    return res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      stack: error.stack
    });
  }
}