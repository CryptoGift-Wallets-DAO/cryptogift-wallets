/**
 * TEST XADD - Force write to ga:v1:events stream
 * Diagnose why events aren't appearing in stream
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

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Check stream exists and get length
    console.log('TEST 1: Checking stream length...');
    try {
      const xlen = await redis.xlen('ga:v1:events');

      results.tests.push({
        test: 'Stream Info',
        success: true,
        xlen,
        message: `Stream has ${xlen} events`
      });
      console.log(`✅ Stream exists, XLEN = ${xlen}`);
    } catch (error: any) {
      results.tests.push({
        test: 'Stream Info',
        success: false,
        error: error.message
      });
      console.error('❌ Stream info failed:', error.message);
    }

    // Test 2: Try to write a test event
    console.log('TEST 2: Writing test event...');
    try {
      const streamId = await redis.xadd(
        'ga:v1:events',
        '*',
        {
          eventId: 'test_' + Date.now(),
          type: 'TEST',
          giftId: '999',
          tokenId: '999',
          campaignId: 'test',
          blockNumber: '0',
          blockTimestamp: Date.now().toString(),
          transactionHash: '0xtest',
          logIndex: '0',
          data: JSON.stringify({ test: true }),
          processedAt: Date.now().toString(),
          source: 'manual'
        }
      );

      results.tests.push({
        test: 'Write Test Event',
        success: true,
        streamId,
        message: 'Successfully wrote to stream'
      });
      console.log(`✅ Test event written, stream ID: ${streamId}`);
    } catch (error: any) {
      results.tests.push({
        test: 'Write Test Event',
        success: false,
        error: error.message,
        stack: error.stack
      });
      console.error('❌ XADD failed:', error);
    }

    // Test 3: Read back events
    console.log('TEST 3: Reading events...');
    try {
      const events = await redis.xrevrange('ga:v1:events', '+', '-', 5);
      const eventsArray = Array.isArray(events) ? events : [];

      results.tests.push({
        test: 'Read Events',
        success: true,
        eventsCount: eventsArray.length,
        events: eventsArray.map(([id, fields]: [string, any]) => ({
          id,
          type: fields.type,
          giftId: fields.giftId,
          tokenId: fields.tokenId
        }))
      });
      console.log(`✅ Read ${eventsArray.length} events`);
    } catch (error: any) {
      results.tests.push({
        test: 'Read Events',
        success: false,
        error: error.message
      });
      console.error('❌ XREVRANGE failed:', error);
    }

    // Summary
    const allPassed = results.tests.every((t: any) => t.success);
    results.summary = {
      allTestsPassed: allPassed,
      diagnosis: allPassed
        ? 'Stream is functional - check processBlockchainEvent logic'
        : 'Stream has issues - see failed tests above'
    };

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('💥 Test XADD failed:', error);
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
}
