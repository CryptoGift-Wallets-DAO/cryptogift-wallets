/**
 * MANUAL EMAIL SAVE ENDPOINT - ENHANCED WITH AUTOMATIC TOKENID → GIFTID RESOLUTION
 * Automatically resolves tokenId to real giftId and saves to BOTH keys for reliability
 *
 * CRITICAL FIX: Addresses the issue where frontend passes tokenId as giftId,
 * causing email to be saved in wrong Redis key (e.g., tokenId=340 but real giftId=366)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';
import { getGiftIdFromTokenId } from '../../../lib/escrowUtils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { giftId, tokenId, email, appointment } = req.body;

    if ((!giftId && !tokenId) || !email) {
      return res.status(400).json({
        error: 'Either giftId or tokenId is required, along with email'
      });
    }

    const redis = validateRedisForCriticalOps('Save email manually');
    if (!redis) {
      return res.status(503).json({ error: 'Redis not available' });
    }

    // CRITICAL FIX: Automatic tokenId → giftId resolution
    // This ensures we always save to the correct primary key
    let realGiftId = giftId;
    const tokenIdStr = tokenId || giftId;

    console.error('🔍 SAVE EMAIL MANUAL - RESOLUTION:', {
      receivedGiftId: giftId,
      receivedTokenId: tokenId,
      willAttemptResolution: !!tokenIdStr
    });

    if (tokenIdStr) {
      try {
        const resolvedGiftId = await getGiftIdFromTokenId(tokenIdStr);
        if (resolvedGiftId !== null) {
          realGiftId = resolvedGiftId.toString();
          console.error(`✅ RESOLVED MAPPING: tokenId ${tokenIdStr} → realGiftId ${realGiftId}`);
        } else {
          console.warn(`⚠️ NO MAPPING FOUND: tokenId ${tokenIdStr}, using provided giftId: ${giftId}`);
          // Keep realGiftId as the provided giftId
        }
      } catch (resolutionError: any) {
        console.warn(`⚠️ RESOLUTION FAILED for tokenId ${tokenIdStr}:`, resolutionError.message);
        console.warn(`⚠️ FALLBACK: Using provided giftId: ${giftId}`);
        // Keep realGiftId as the provided giftId
      }
    }

    // Prepare updates
    const updates: Record<string, any> = {
      email_plain: email,
      email_warning: 'MANUALLY_ADDED',
      email_captured_at: Date.now().toString()
    };

    if (tokenIdStr) {
      updates.tokenId = tokenIdStr.toString();
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

    // CRITICAL: Save to REAL giftId key (PRIMARY STORAGE)
    const realGiftDetailKey = `gift:detail:${realGiftId}`;
    await redis.hset(realGiftDetailKey, updates);
    console.error(`✅ PRIMARY STORAGE: Saved to ${realGiftDetailKey}`);

    // REDUNDANCY: Also save using tokenId as key for double lookup
    if (tokenIdStr && tokenIdStr !== realGiftId) {
      const tokenDetailKey = `gift:detail:${tokenIdStr}`;
      await redis.hset(tokenDetailKey, updates);
      console.error(`✅ REDUNDANT STORAGE: Also saved to ${tokenDetailKey}`);
    }

    console.error('📊 SAVE EMAIL MANUAL - COMPLETE:', {
      realGiftId,
      tokenId: tokenIdStr,
      savedToKeys: tokenIdStr !== realGiftId
        ? [realGiftDetailKey, `gift:detail:${tokenIdStr}`]
        : [realGiftDetailKey],
      fieldsWritten: Object.keys(updates).length
    });

    return res.status(200).json({
      success: true,
      message: `Email saved for gift ${realGiftId}`,
      realGiftId,
      tokenId: tokenIdStr,
      savedToKeys: tokenIdStr !== realGiftId ? 2 : 1,
      updates
    });

  } catch (error: any) {
    console.error('❌ MANUAL SAVE ERROR:', error);
    return res.status(500).json({
      error: error.message || 'Failed to save email'
    });
  }
}