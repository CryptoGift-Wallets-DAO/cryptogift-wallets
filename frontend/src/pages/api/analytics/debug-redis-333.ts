/**
 * DEBUG ENDPOINT - Check what Redis keys exist for gift 333
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getRedisConnection } = await import('@/lib/redisConfig');
    const redis = getRedisConnection();

    // 1. Check ALL gift:detail keys
    const allGiftDetailKeys = await redis.keys('gift:detail:*');
    console.error('📊 ALL GIFT:DETAIL KEYS:', allGiftDetailKeys);

    // 2. Check specific keys for token 333
    const byTokenId = await redis.hgetall('gift:detail:333');
    const byGiftId359 = await redis.hgetall('gift:detail:359');

    // 3. Search for tokenId=333 in all gift:detail keys
    const matching333 = [];
    for (const key of allGiftDetailKeys) {
      const data = await redis.hgetall(key);
      if (data && (data.tokenId === '333' || data.tokenId === 333)) {
        matching333.push({
          key,
          tokenId: data.tokenId,
          giftId: key.replace('gift:detail:', ''),
          claimer: data.claimer,
          email: data.email_plain || 'ENCRYPTED',
          appointment: data.appointment_scheduled
        });
      }
    }

    // 4. Check mapping
    const { getGiftIdFromTokenId } = await import('@/lib/escrowUtils');
    const resolvedGiftId = await getGiftIdFromTokenId('333');

    // 5. Check reverse mapping
    const reverseMapping = await redis.get('reverse_mapping:359');

    return res.status(200).json({
      success: true,
      tokenId: '333',
      giftId: '359',
      resolvedGiftId,
      reverseMapping,
      allGiftDetailKeys: allGiftDetailKeys.length,
      byTokenId333: {
        exists: !!byTokenId && Object.keys(byTokenId).length > 0,
        keys: byTokenId ? Object.keys(byTokenId) : [],
        claimer: (byTokenId as any)?.claimer,
        email: (byTokenId as any)?.email_plain || (byTokenId as any)?.email_encrypted ? 'ENCRYPTED' : 'NONE',
        appointment: (byTokenId as any)?.appointment_scheduled
      },
      byGiftId359: {
        exists: !!byGiftId359 && Object.keys(byGiftId359).length > 0,
        keys: byGiftId359 ? Object.keys(byGiftId359) : [],
        claimer: (byGiftId359 as any)?.claimer,
        email: (byGiftId359 as any)?.email_plain || (byGiftId359 as any)?.email_encrypted ? 'ENCRYPTED' : 'NONE',
        appointment: (byGiftId359 as any)?.appointment_scheduled
      },
      matching333,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}
