/**
 * DEBUG ENDPOINT - Check what Redis keys exist for gift 336 (tokenId) / 362 (giftId)
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

    // 1. Check specific keys for token 336
    const byTokenId336 = await redis.hgetall('gift:detail:336');
    const byGiftId362 = await redis.hgetall('gift:detail:362');

    // 2. Search for tokenId=336 in all gift:detail keys
    const allGiftDetailKeys = await redis.keys('gift:detail:*');
    const matching336 = [];
    for (const key of allGiftDetailKeys) {
      const data = await redis.hgetall(key);
      if (data && (data.tokenId === '336' || data.tokenId === 336)) {
        matching336.push({
          key,
          tokenId: data.tokenId,
          giftId: key.replace('gift:detail:', ''),
          claimer: data.claimer,
          claimedAt: data.claimedAt,
          status: data.status,
          email: data.email_plain || (data.email_encrypted ? 'ENCRYPTED' : 'NONE'),
          appointment: data.appointment_scheduled
        });
      }
    }

    // 3. Check mapping
    const { getGiftIdFromTokenId } = await import('@/lib/escrowUtils');
    const resolvedGiftId = await getGiftIdFromTokenId('336');

    // 4. Check reverse mapping
    const reverseMapping = await redis.get('reverse_mapping:362');

    // 5. Check gift_mapping
    const giftMapping336 = await redis.hgetall('gift_mapping:336');

    return res.status(200).json({
      success: true,
      tokenId: '336',
      giftId: '362',
      resolvedGiftId,
      reverseMapping,
      giftMapping336: giftMapping336 ? {
        exists: Object.keys(giftMapping336).length > 0,
        data: giftMapping336
      } : { exists: false },
      allGiftDetailKeys: allGiftDetailKeys.length,
      byTokenId336: {
        exists: !!byTokenId336 && Object.keys(byTokenId336).length > 0,
        keys: byTokenId336 ? Object.keys(byTokenId336) : [],
        claimer: (byTokenId336 as any)?.claimer,
        claimedAt: (byTokenId336 as any)?.claimedAt,
        status: (byTokenId336 as any)?.status,
        email: (byTokenId336 as any)?.email_plain || (byTokenId336 as any)?.email_encrypted ? 'ENCRYPTED' : 'NONE',
        appointment: (byTokenId336 as any)?.appointment_scheduled,
        fullData: byTokenId336
      },
      byGiftId362: {
        exists: !!byGiftId362 && Object.keys(byGiftId362).length > 0,
        keys: byGiftId362 ? Object.keys(byGiftId362) : [],
        claimer: (byGiftId362 as any)?.claimer,
        claimedAt: (byGiftId362 as any)?.claimedAt,
        status: (byGiftId362 as any)?.status,
        email: (byGiftId362 as any)?.email_plain || (byGiftId362 as any)?.email_encrypted ? 'ENCRYPTED' : 'NONE',
        appointment: (byGiftId362 as any)?.appointment_scheduled,
        fullData: byGiftId362
      },
      matching336,
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
