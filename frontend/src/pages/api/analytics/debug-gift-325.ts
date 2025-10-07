/**
 * DEBUG ENDPOINT: Check Redis data for gift #325
 * Copy of debug-gift-322 but for gift #325 (giftId 352)
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

    const tokenId = '325';
    const giftId = '352';

    const results: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    // 1. Check gift_mapping (tokenId → giftId)
    console.error(`🔍 CHECK 1: gift_mapping:${tokenId}`);
    const mapping = await redis.get(`gift_mapping:${tokenId}`);
    results.checks.push({
      key: `gift_mapping:${tokenId}`,
      exists: !!mapping,
      value: mapping,
      type: typeof mapping
    });

    // 2. Check reverse_mapping (giftId → tokenId)
    console.error(`🔍 CHECK 2: reverse_mapping:${giftId}`);
    const reverseMapping = await redis.get(`reverse_mapping:${giftId}`);
    results.checks.push({
      key: `reverse_mapping:${giftId}`,
      exists: !!reverseMapping,
      value: reverseMapping,
      type: typeof reverseMapping
    });

    // 3. Check gift:detail:{giftId}
    console.error(`🔍 CHECK 3: gift:detail:${giftId}`);
    const giftDetail = await redis.hgetall(`gift:detail:${giftId}`);
    results.checks.push({
      key: `gift:detail:${giftId}`,
      exists: !!giftDetail && Object.keys(giftDetail || {}).length > 0,
      value: giftDetail,
      keys: giftDetail ? Object.keys(giftDetail) : []
    });

    // 4. Check education:gift:{giftId}
    console.error(`🔍 CHECK 4: education:gift:${giftId}`);
    const education = await redis.get(`education:gift:${giftId}`);
    results.checks.push({
      key: `education:gift:${giftId}`,
      exists: !!education,
      value: education,
      type: typeof education
    });

    // 5. Check ga:v1:events stream for this giftId
    console.error(`🔍 CHECK 5: ga:v1:events stream`);
    const eventsRaw = await redis.xrevrange('ga:v1:events', '+', '-', 100);
    const events = Array.isArray(eventsRaw)
      ? eventsRaw
      : Object.entries(eventsRaw || {});

    const giftEvents = events.filter(([_, fields]: [string, any]) => {
      return fields.giftId === giftId || fields.tokenId === tokenId;
    });

    results.checks.push({
      key: 'ga:v1:events',
      totalEvents: events.length,
      giftEventsCount: giftEvents.length,
      giftEvents: giftEvents.map(([id, fields]: [string, any]) => ({
        streamId: id,
        type: fields.type,
        giftId: fields.giftId,
        tokenId: fields.tokenId,
        timestamp: fields.blockTimestamp
      }))
    });

    // 6. Summary
    results.summary = {
      hasMappingData: results.checks[0].exists || results.checks[1].exists,
      hasGiftDetail: results.checks[2].exists,
      hasEducation: results.checks[3].exists,
      hasEvents: results.checks[4].giftEventsCount > 0,
      diagnosis: ''
    };

    if (!results.summary.hasMappingData) {
      results.summary.diagnosis = 'CRITICAL: No mapping data found - gift may not have been minted correctly';
    } else if (!results.summary.hasGiftDetail) {
      results.summary.diagnosis = 'ERROR: Mapping exists but gift:detail missing - tracking system failed';
    } else if (!results.summary.hasEvents) {
      results.summary.diagnosis = 'WARNING: gift:detail exists but no events in stream';
    } else {
      results.summary.diagnosis = 'OK: All data present';
    }

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
