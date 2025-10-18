/**
 * COMPREHENSIVE SEARCH - Look for Gift #336 data in ALL Redis keys
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

    console.error('🔍 COMPREHENSIVE SEARCH: Looking for Gift #336 data everywhere...');

    // 1. Check education keys
    const education362 = await redis.get('education:gift:362');
    const education336 = await redis.get('education:gift:336');

    // 2. Check pre-claim session keys (might be expired)
    const allKeys = await redis.keys('*336*');
    const allKeys362 = await redis.keys('*362*');

    console.error('📊 Keys found:', {
      keys336: allKeys.length,
      keys362: allKeys362.length
    });

    // 3. Sample all keys with 336 or 362
    const keySamples: any = {};
    for (const key of [...allKeys, ...allKeys362].slice(0, 50)) {
      try {
        const type = await redis.type(key);
        let value;

        if (type === 'string') {
          value = await redis.get(key);
        } else if (type === 'hash') {
          value = await redis.hgetall(key);
        } else if (type === 'list') {
          value = await redis.lrange(key, 0, -1);
        }

        keySamples[key] = {
          type,
          value: value,
          hasEmail: JSON.stringify(value).includes('email'),
          hasAppointment: JSON.stringify(value).includes('appointment')
        };
      } catch (e) {
        keySamples[key] = { error: (e as Error).message };
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),

      education: {
        education362: {
          exists: !!education362,
          type: typeof education362,
          data: education362
        },
        education336: {
          exists: !!education336,
          type: typeof education336,
          data: education336
        }
      },

      allKeysFound: {
        with336: allKeys,
        with362: allKeys362
      },

      keySamples,

      summary: {
        totalKeysFound: allKeys.length + allKeys362.length,
        anyHasEmail: Object.values(keySamples).some((v: any) => v.hasEmail),
        anyHasAppointment: Object.values(keySamples).some((v: any) => v.hasAppointment)
      }
    });

  } catch (error: any) {
    console.error('❌ SEARCH ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
