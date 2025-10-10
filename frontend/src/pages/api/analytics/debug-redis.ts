/**
 * DEBUG REDIS ENDPOINT
 * Checks Redis data for a given giftId or tokenId
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  try {
    const redis = validateRedisForCriticalOps('Debug Redis');

    if (!redis) {
      return res.status(503).json({
        error: 'Redis not available'
      });
    }

    // Check multiple possible keys
    const results: Record<string, any> = {};

    // 1. Check gift:detail by ID (could be giftId or tokenId)
    const giftDetailKey = `gift:detail:${id}`;
    const giftDetails = await redis.hgetall(giftDetailKey);
    results.giftDetailByParam = {
      key: giftDetailKey,
      data: giftDetails,
      hasData: giftDetails && Object.keys(giftDetails).length > 0
    };

    // 2. Try to find the actual giftId if param is tokenId
    const { getGiftIdFromTokenId } = await import('@/lib/escrowUtils');
    const resolvedGiftId = await getGiftIdFromTokenId(id);

    if (resolvedGiftId !== null) {
      const actualGiftDetailKey = `gift:detail:${resolvedGiftId}`;
      const actualGiftDetails = await redis.hgetall(actualGiftDetailKey);
      results.giftDetailByResolvedId = {
        key: actualGiftDetailKey,
        resolvedGiftId: resolvedGiftId.toString(),
        data: actualGiftDetails,
        hasData: actualGiftDetails && Object.keys(actualGiftDetails).length > 0
      };
    }

    // 3. Search all gift:detail keys for tokenId field
    const allGiftKeys = await redis.keys('gift:detail:*');
    results.searchByTokenId = {
      totalKeys: allGiftKeys.length,
      matches: []
    };

    for (const key of allGiftKeys) {
      const details = await redis.hgetall(key);
      if (details && details.tokenId?.toString() === id) {
        results.searchByTokenId.matches.push({
          key,
          giftId: key.replace('gift:detail:', ''),
          tokenId: details.tokenId,
          hasEducation: !!(details.education_score_percentage || details.educationCompleted),
          hasEmail: !!(details.email_encrypted || details.email_plain),
          hasAppointment: !!(details.appointment_scheduled || details.appointment_date),
          hasClaimer: !!details.claimer
        });
      }
    }

    // 4. Check education tracking
    const educationKey = `education:gift:${id}`;
    const educationData = await redis.get(educationKey);
    results.education = {
      key: educationKey,
      data: educationData,
      hasData: !!educationData
    };

    // 5. Check appointment data
    const appointmentKey = `appointment:gift:${id}`;
    const appointmentData = await redis.get(appointmentKey);
    results.appointment = {
      key: appointmentKey,
      data: appointmentData,
      hasData: !!appointmentData
    };

    return res.status(200).json({
      success: true,
      param: id,
      resolvedGiftId: resolvedGiftId?.toString(),
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Debug Redis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}