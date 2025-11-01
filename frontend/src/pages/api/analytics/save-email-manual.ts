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

    // CRITICAL: BOTH giftId and tokenId are now REQUIRED
    if (!giftId || !tokenId || !email) {
      return res.status(400).json({
        error: 'giftId, tokenId, and email are all required',
        received: { giftId: !!giftId, tokenId: !!tokenId, email: !!email }
      });
    }

    // TELEMETRY: Log if giftId === tokenId (may indicate fallback scenario)
    // RELAXED: Allow this case since server resolves realGiftId internally anyway
    if (giftId === tokenId) {
      console.warn('⚠️ TELEMETRY: giftId === tokenId (fallback scenario detected)', {
        giftId,
        tokenId,
        scenario: 'Frontend using tokenId as giftId fallback - server will resolve'
      });
      // Continue processing - server resolution will handle this correctly
    }

    const redis = validateRedisForCriticalOps('Save email manually');
    if (!redis) {
      return res.status(503).json({ error: 'Redis not available' });
    }

    // SERVER-SIDE VALIDATION: Resolve tokenId → giftId and compare with client
    const tokenIdStr = tokenId.toString();
    const clientGiftId = giftId.toString();
    let serverGiftId: string | null = null;

    console.error('🔍 SAVE EMAIL MANUAL - SERVER VALIDATION:', {
      clientGiftId,
      tokenId: tokenIdStr
    });

    try {
      const resolvedGiftId = await getGiftIdFromTokenId(tokenIdStr);
      if (resolvedGiftId !== null) {
        serverGiftId = resolvedGiftId.toString();
        console.error(`✅ SERVER RESOLVED: tokenId ${tokenIdStr} → giftId ${serverGiftId}`);

        // CRITICAL: Compare client vs server resolution
        if (serverGiftId !== clientGiftId) {
          console.error(`⚠️ MISMATCH: Client sent giftId=${clientGiftId} but server resolved giftId=${serverGiftId}`, {
            action: 'PRIORITIZING_SERVER_RESOLUTION'
          });
          // Use server-resolved giftId as source of truth
        }
      } else {
        console.warn(`⚠️ NO MAPPING FOUND: tokenId ${tokenIdStr} - using client giftId as fallback`);
        serverGiftId = clientGiftId;  // Trust client if no mapping exists
      }
    } catch (resolutionError: any) {
      console.warn(`⚠️ RESOLUTION FAILED for tokenId ${tokenIdStr}:`, resolutionError.message);
      serverGiftId = clientGiftId;  // Trust client on error
    }

    // Use server-resolved giftId as the canonical source of truth
    const realGiftId = serverGiftId || clientGiftId;

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

    // PRIMARY: Write to canonical giftId key (complete data source)
    const realGiftDetailKey = `gift:detail:${realGiftId}`;
    await redis.hset(realGiftDetailKey, updates);
    console.error(`✅ PRIMARY STORAGE: Saved to ${realGiftDetailKey}`);

    // MIRROR: Write to tokenId key for search/fallback (REQUIRED by analytics merge logic)
    // Analytics (gift-profile.ts) reads BOTH keys and merges when giftId incomplete
    if (tokenIdStr && tokenIdStr !== realGiftId) {
      const tokenDetailKey = `gift:detail:${tokenIdStr}`;
      await redis.hset(tokenDetailKey, updates);
      console.error(`✅ MIRROR STORAGE: Also saved to ${tokenDetailKey} for tokenId lookup`);
    }


    console.error('📊 SAVE EMAIL MANUAL - COMPLETE:', {
      realGiftId,
      tokenId: tokenIdStr,
      savedToKey: realGiftDetailKey,
      fieldsWritten: Object.keys(updates).length,
      clientVsServer: clientGiftId === realGiftId ? 'MATCH' : 'MISMATCH_SERVER_PRIORITIZED'
    });

    return res.status(200).json({
      success: true,
      message: `Email saved for gift ${realGiftId}`,
      realGiftId,
      tokenId: tokenIdStr,
      savedToKey: realGiftDetailKey,
      serverValidation: clientGiftId === realGiftId ? 'passed' : 'corrected',
      updates
    });

  } catch (error: any) {
    console.error('❌ MANUAL SAVE ERROR:', error);
    return res.status(500).json({
      error: error.message || 'Failed to save email'
    });
  }
}