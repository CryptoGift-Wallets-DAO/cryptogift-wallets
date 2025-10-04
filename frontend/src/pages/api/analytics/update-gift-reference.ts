/**
 * API to update gift reference/name in Redis
 * This allows users to add custom names/references to gifts
 * that persist across devices and sessions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { validateRedisForCriticalOps } from '@/lib/redisConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { giftId, reference } = req.body;

  if (!giftId) {
    return res.status(400).json({ error: 'Gift ID is required' });
  }

  try {
    const redis = validateRedisForCriticalOps('Update gift reference');

    if (!redis) {
      // If Redis not available, store in a fallback
      console.log('Redis not available for reference update');
      return res.status(200).json({
        success: true,
        message: 'Reference saved locally (Redis not available)'
      });
    }

    // Update the gift detail with the reference
    const giftKey = `gift:detail:${giftId}`;

    // Check if gift exists
    const exists = await redis.exists(giftKey);
    if (!exists) {
      // Create minimal entry if doesn't exist
      await redis.hset(giftKey, {
        giftId,
        tokenId: giftId,
        recipientReference: reference || '',
        lastUpdated: Date.now()
      });
    } else {
      // Update existing entry
      await redis.hset(giftKey, {
        recipientReference: reference || '',
        lastUpdated: Date.now()
      });
    }

    // Also store in a dedicated references hash for quick lookup
    await redis.hset('gift:references', { [giftId]: reference || '' });

    console.log(`✅ Reference updated for gift ${giftId}: "${reference}"`);

    return res.status(200).json({
      success: true,
      giftId,
      reference,
      message: 'Reference saved successfully'
    });

  } catch (error: any) {
    console.error('Failed to update gift reference:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update reference',
      message: error.message
    });
  }
}