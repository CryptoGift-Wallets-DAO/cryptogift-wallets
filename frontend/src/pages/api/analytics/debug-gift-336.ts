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
    // CRITICAL FIX: Use direct Redis instantiation (same pattern as gift-profile)
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });
    console.error('✅ DEBUG: Redis connected directly');

    // 1. Check specific keys for token 336
    const byTokenId336 = await redis.hgetall('gift:detail:336');
    const byGiftId362 = await redis.hgetall('gift:detail:362');

    console.error('🔍 DEBUG: Redis data fetched', {
      byTokenId336Keys: byTokenId336 ? Object.keys(byTokenId336) : [],
      byGiftId362Keys: byGiftId362 ? Object.keys(byGiftId362) : []
    });

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

    // 5. Check gift_mapping (CRITICAL FIX: use GET not HGETALL - it's JSON not hash)
    let giftMapping336 = null;
    try {
      const mappingRaw = await redis.get('gift_mapping:336');
      giftMapping336 = mappingRaw ? (typeof mappingRaw === 'string' ? JSON.parse(mappingRaw) : mappingRaw) : null;
    } catch (e) {
      console.error('gift_mapping:336 parse error:', e);
    }

    return res.status(200).json({
      success: true,
      tokenId: '336',
      giftId: '362',
      resolvedGiftId,
      reverseMapping,
      giftMapping336: giftMapping336 ? {
        exists: true,
        data: giftMapping336
      } : { exists: false },
      allGiftDetailKeys: allGiftDetailKeys.length,
      byTokenId336: {
        exists: !!byTokenId336 && Object.keys(byTokenId336).length > 0,
        keys: byTokenId336 ? Object.keys(byTokenId336) : [],
        claimer: (byTokenId336 as any)?.claimer,
        claimedAt: (byTokenId336 as any)?.claimedAt,
        status: (byTokenId336 as any)?.status,
        emailPlain: (byTokenId336 as any)?.email_plain,
        emailEncrypted: (byTokenId336 as any)?.email_encrypted ? 'EXISTS' : 'NO',
        appointmentScheduled: (byTokenId336 as any)?.appointment_scheduled,
        appointmentDate: (byTokenId336 as any)?.appointment_date,
        appointmentTime: (byTokenId336 as any)?.appointment_time,
        fullData: byTokenId336
      },
      byGiftId362: {
        exists: !!byGiftId362 && Object.keys(byGiftId362).length > 0,
        keys: byGiftId362 ? Object.keys(byGiftId362) : [],
        claimer: (byGiftId362 as any)?.claimer,
        claimedAt: (byGiftId362 as any)?.claimedAt,
        status: (byGiftId362 as any)?.status,
        emailPlain: (byGiftId362 as any)?.email_plain,
        emailEncrypted: (byGiftId362 as any)?.email_encrypted ? 'EXISTS' : 'NO',
        appointmentScheduled: (byGiftId362 as any)?.appointment_scheduled,
        appointmentDate: (byGiftId362 as any)?.appointment_date,
        appointmentTime: (byGiftId362 as any)?.appointment_time,
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
