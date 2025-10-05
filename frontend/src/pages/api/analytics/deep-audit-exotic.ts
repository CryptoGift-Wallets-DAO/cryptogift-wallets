/**
 * DEEP AUDIT - Search ALL keys in exotic-alien for gift #313
 * Tests multiple possible key patterns and data structures
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { tokenId = '313', giftId } = req.query;

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    const results: any = {
      timestamp: new Date().toISOString(),
      tokenId,
      giftId: giftId || 'unknown',
      redisInstance: process.env.UPSTASH_REDIS_REST_URL,
      searches: {}
    };

    console.log('🔍 DEEP AUDIT: Searching for gift #313 in exotic-alien...');

    // 1. Search for mapping
    console.log('1. Checking gift_mapping...');
    const mapping = await redis.hgetall(`gift_mapping:${tokenId}`);
    results.searches.gift_mapping = {
      key: `gift_mapping:${tokenId}`,
      type: 'hash',
      found: !!mapping && Object.keys(mapping).length > 0,
      data: mapping || null
    };

    const resolvedGiftId = mapping?.giftId || giftId;
    console.log(`   Resolved giftId: ${resolvedGiftId}`);

    // 2. Search for gift:detail
    if (resolvedGiftId) {
      console.log(`2. Checking gift:detail:${resolvedGiftId}...`);
      const detail = await redis.hgetall(`gift:detail:${resolvedGiftId}`);
      results.searches.gift_detail = {
        key: `gift:detail:${resolvedGiftId}`,
        type: 'hash',
        found: !!detail && Object.keys(detail).length > 0,
        data: detail || null
      };
    }

    // 3. Search in events stream
    console.log('3. Checking ga:v1:events stream...');
    try {
      const events = await redis.xrevrange('ga:v1:events', '+', '-', 100);
      const eventsArray = Array.isArray(events) ? events : [];

      const relevantEvents = eventsArray.filter(([_, fields]: [string, any]) =>
        fields.giftId === resolvedGiftId?.toString() ||
        fields.tokenId === tokenId.toString()
      );

      results.searches.canonical_events = {
        key: 'ga:v1:events',
        type: 'stream',
        totalEvents: eventsArray.length,
        relevantEvents: relevantEvents.length,
        found: relevantEvents.length > 0,
        data: relevantEvents.length > 0
          ? relevantEvents.map(([id, fields]: [string, any]) => ({ id, ...fields }))
          : null
      };
      console.log(`   Found ${relevantEvents.length} relevant events`);
    } catch (e: any) {
      results.searches.canonical_events = {
        key: 'ga:v1:events',
        type: 'stream',
        error: e.message
      };
    }

    // 4. Search all keys matching pattern
    console.log('4. Searching all keys with pattern *313*...');
    try {
      const allKeys = await redis.keys('*313*');
      results.searches.pattern_search = {
        pattern: '*313*',
        keysFound: allKeys?.length || 0,
        keys: allKeys || []
      };
      console.log(`   Found ${allKeys?.length || 0} keys matching *313*`);
    } catch (e: any) {
      results.searches.pattern_search = {
        pattern: '*313*',
        error: e.message
      };
    }

    // 5. Search for education data
    if (resolvedGiftId) {
      console.log(`5. Checking education:gift:${resolvedGiftId}...`);
      try {
        const education = await redis.hgetall(`education:gift:${resolvedGiftId}`);
        results.searches.education = {
          key: `education:gift:${resolvedGiftId}`,
          type: 'hash',
          found: !!education && Object.keys(education).length > 0,
          data: education || null
        };
      } catch (e: any) {
        results.searches.education = {
          key: `education:gift:${resolvedGiftId}`,
          error: e.message
        };
      }
    }

    // 6. Get Redis info
    console.log('6. Getting Redis stats...');
    try {
      const dbsize = await redis.dbsize();
      results.redisStats = {
        totalKeys: dbsize,
        instance: 'exotic-alien-13383'
      };
      console.log(`   Total keys in database: ${dbsize}`);
    } catch (e: any) {
      results.redisStats = {
        error: e.message
      };
    }

    // Summary
    const foundAnyData = Object.values(results.searches).some(
      (search: any) => search.found === true
    );

    results.summary = {
      giftDataFound: foundAnyData,
      resolvedGiftId,
      keysChecked: Object.keys(results.searches).length,
      diagnosis: foundAnyData
        ? 'Data EXISTS in exotic-alien'
        : 'NO DATA found for this gift - tracking never executed'
    };

    console.log(`✅ AUDIT COMPLETE: ${results.summary.diagnosis}`);

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('💥 Deep audit failed:', error);
    return res.status(500).json({
      error: 'Audit failed',
      message: error.message,
      stack: error.stack
    });
  }
}
