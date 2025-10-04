/**
 * DEBUG ENDPOINT - Check Redis data for a specific gift
 * TEMPORARY - For troubleshooting gift #310 tracking issue
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { giftId, tokenId } = req.query;

  if (!giftId && !tokenId) {
    return res.status(400).json({
      error: 'Provide either giftId or tokenId as query parameter'
    });
  }

  try {
    // Check Redis configuration
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return res.status(500).json({
        error: 'Redis NOT configured in environment',
        redisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        redisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
      });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    const diagnostics: any = {
      query: { giftId, tokenId },
      timestamp: new Date().toISOString(),
      redisConfigured: true,
      data: {}
    };

    // If tokenId provided, check mapping
    if (tokenId) {
      const mappingKey = `gift_mapping:${tokenId}`;
      const mapping = await redis.hgetall(mappingKey);
      diagnostics.data.mapping = mapping || 'NOT_FOUND';

      // If mapping found, use its giftId
      if (mapping && mapping.giftId) {
        diagnostics.resolvedGiftId = mapping.giftId;
      }
    }

    // Check gift:detail
    const targetGiftId = giftId || diagnostics.resolvedGiftId;
    if (targetGiftId) {
      const detailKey = `gift:detail:${targetGiftId}`;
      const detail = await redis.hgetall(detailKey);
      diagnostics.data.giftDetail = detail || 'NOT_FOUND';

      // Check if events exist
      try {
        const events = await redis.xrevrange('ga:v1:events', '+', '-', 100);
        const relevantEvents = (events as any[]).filter(([_, fields]) =>
          fields.giftId === targetGiftId.toString() ||
          fields.tokenId === (tokenId || '').toString()
        );
        diagnostics.data.canonicalEvents = relevantEvents.length > 0
          ? relevantEvents.map(([id, fields]) => ({ id, ...fields }))
          : 'NO_MATCHING_EVENTS';
      } catch (e) {
        diagnostics.data.canonicalEvents = 'ERROR: ' + e.message;
      }

      // Check education data
      try {
        const educationKey = `education:gift:${targetGiftId}`;
        const education = await redis.hgetall(educationKey);
        diagnostics.data.education = education || 'NOT_FOUND';
      } catch (e) {
        diagnostics.data.education = 'ERROR: ' + e.message;
      }
    }

    return res.status(200).json(diagnostics);

  } catch (error: any) {
    return res.status(500).json({
      error: 'Redis check failed',
      message: error.message,
      stack: error.stack
    });
  }
}
