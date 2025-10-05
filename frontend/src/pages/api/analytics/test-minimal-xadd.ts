/**
 * TEST MINIMAL XADD - Find which field corrupts the stream
 * Progressive testing to isolate the problematic field
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

    // Test 1: Minimal fields
    console.log('TEST 1: Minimal fields (2 only)...');
    try {
      const streamId1 = await redis.xadd(
        'test:minimal',
        '*',
        {
          field1: 'value1',
          field2: 'value2'
        }
      );

      const read1 = await redis.xrevrange('test:minimal', '+', '-', 1);

      results.tests.push({
        test: 'Minimal (2 fields)',
        write: { success: true, streamId: streamId1 },
        read: { success: true, count: Array.isArray(read1) ? read1.length : 0, data: read1 }
      });
    } catch (error: any) {
      results.tests.push({
        test: 'Minimal (2 fields)',
        error: error.message
      });
    }

    // Test 2: With JSON.stringify
    console.log('TEST 2: With JSON.stringify field...');
    try {
      const streamId2 = await redis.xadd(
        'test:json',
        '*',
        {
          field1: 'value1',
          data: JSON.stringify({ test: true })
        }
      );

      const read2 = await redis.xrevrange('test:json', '+', '-', 1);

      results.tests.push({
        test: 'With JSON.stringify',
        write: { success: true, streamId: streamId2 },
        read: { success: true, count: Array.isArray(read2) ? read2.length : 0, data: read2 }
      });
    } catch (error: any) {
      results.tests.push({
        test: 'With JSON.stringify',
        error: error.message
      });
    }

    // Test 3: With empty JSON.stringify
    console.log('TEST 3: With empty object JSON.stringify...');
    try {
      const streamId3 = await redis.xadd(
        'test:emptyjson',
        '*',
        {
          field1: 'value1',
          data: JSON.stringify({})
        }
      );

      const read3 = await redis.xrevrange('test:emptyjson', '+', '-', 1);

      results.tests.push({
        test: 'Empty JSON object',
        write: { success: true, streamId: streamId3 },
        read: { success: true, count: Array.isArray(read3) ? read3.length : 0, data: read3 }
      });
    } catch (error: any) {
      results.tests.push({
        test: 'Empty JSON object',
        error: error.message
      });
    }

    // Test 4: With nested object (undefined fields)
    console.log('TEST 4: With object containing undefined...');
    try {
      const streamId4 = await redis.xadd(
        'test:undefined',
        '*',
        {
          field1: 'value1',
          data: JSON.stringify({
            creator: undefined,
            claimer: undefined,
            amount: undefined
          })
        }
      );

      const read4 = await redis.xrevrange('test:undefined', '+', '-', 1);

      results.tests.push({
        test: 'Object with undefined fields',
        write: { success: true, streamId: streamId4 },
        read: { success: true, count: Array.isArray(read4) ? read4.length : 0, data: read4 }
      });
    } catch (error: any) {
      results.tests.push({
        test: 'Object with undefined fields',
        error: error.message
      });
    }

    // Test 5: Exact replica of canonical event format
    console.log('TEST 5: Exact canonical event format...');
    try {
      const testData = {
        creator: undefined,
        claimer: undefined,
        amount: undefined,
        educationData: undefined,
        referrer: undefined,
        metadata: undefined
      };

      const streamId5 = await redis.xadd(
        'test:canonical',
        '*',
        {
          eventId: 'test_event_id',
          type: 'GiftCreated',
          giftId: '999',
          tokenId: '999',
          campaignId: 'test_campaign',
          blockNumber: '0',
          blockTimestamp: Date.now().toString(),
          transactionHash: '0xtest',
          logIndex: '0',
          data: JSON.stringify(testData),
          processedAt: Date.now().toString(),
          source: 'manual'
        }
      );

      const read5 = await redis.xrevrange('test:canonical', '+', '-', 1);

      results.tests.push({
        test: 'Canonical event format',
        write: { success: true, streamId: streamId5 },
        read: { success: true, count: Array.isArray(read5) ? read5.length : 0, data: read5 }
      });
    } catch (error: any) {
      results.tests.push({
        test: 'Canonical event format',
        error: error.message
      });
    }

    // Cleanup test streams
    await redis.del('test:minimal');
    await redis.del('test:json');
    await redis.del('test:emptyjson');
    await redis.del('test:undefined');
    await redis.del('test:canonical');

    results.summary = {
      diagnosis: 'Check which test has count: 0 - that format corrupts the stream'
    };

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('💥 Test minimal XADD failed:', error);
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
}
