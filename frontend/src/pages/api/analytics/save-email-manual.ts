/**
 * MANUAL EMAIL SAVE ENDPOINT
 * Endpoint temporal para guardar email manualmente cuando falla la captura automática
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { giftId, tokenId, email, appointment } = req.body;

    if (!giftId || !email) {
      return res.status(400).json({ error: 'giftId and email are required' });
    }

    const redis = validateRedisForCriticalOps('Save email manually');
    if (!redis) {
      return res.status(503).json({ error: 'Redis not available' });
    }

    // Prepare updates
    const updates: Record<string, any> = {
      email_plain: email,
      email_warning: 'MANUALLY_ADDED',
      email_captured_at: Date.now().toString()
    };

    if (tokenId) {
      updates.tokenId = tokenId.toString();
    }

    // Add appointment if provided
    if (appointment) {
      updates.appointment_scheduled = 'true';
      updates.appointment_date = appointment.date;
      updates.appointment_time = appointment.time;
      updates.appointment_duration = appointment.duration || 30;
      updates.appointment_timezone = appointment.timezone || 'America/Mexico_City';
      updates.appointment_invitee_name = appointment.name || '';
      updates.appointment_created_at = Date.now().toString();
    }

    // Save to Redis
    const giftDetailKey = `gift:detail:${giftId}`;
    await redis.hset(giftDetailKey, updates);

    // ALSO save using tokenId as key for double lookup
    if (tokenId && tokenId !== giftId) {
      const tokenDetailKey = `gift:detail:${tokenId}`;
      await redis.hset(tokenDetailKey, updates);
      console.log(`✅ Also saved to ${tokenDetailKey}`);
    }

    return res.status(200).json({
      success: true,
      message: `Email saved for gift ${giftId}`,
      updates
    });

  } catch (error: any) {
    console.error('Manual save error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to save email'
    });
  }
}