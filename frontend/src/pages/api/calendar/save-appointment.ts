/**
 * SAVE APPOINTMENT API - ENHANCED WITH AUTOMATIC TOKENID → GIFTID RESOLUTION
 * Guarda información de citas agendadas de Calendly
 * Automatically resolves tokenId to real giftId and saves to BOTH keys for reliability
 *
 * CRITICAL FIX: Addresses the issue where frontend passes tokenId as giftId,
 * causing appointment to be saved in wrong Redis key (e.g., tokenId=340 but real giftId=366)
 *
 * @author CryptoGift Wallets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';
import { debugLogger } from '../../../lib/secureDebugLogger';
import { getGiftIdFromTokenId } from '../../../lib/escrowUtils';

interface AppointmentRequest {
  giftId: string;
  tokenId?: string;
  appointmentData: {
    eventName?: string;
    eventDate: string;
    eventTime?: string; // ENHANCED: Now optional - will fallback to '00:00' if not provided
    duration?: number;
    timezone?: string;
    meetingUrl?: string;
    inviteeName?: string;
    inviteeEmail?: string;
    additionalInfo?: any;
  };
}

interface AppointmentResponse {
  success: boolean;
  message?: string;
  error?: string;
  received?: any;
  hint?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AppointmentResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      giftId,
      tokenId,
      appointmentData
    }: AppointmentRequest = req.body;

    // CRITICAL: BOTH giftId and tokenId are now REQUIRED
    // ENHANCED: eventTime is now optional with sensible fallback
    if (!giftId || !tokenId || !appointmentData || !appointmentData.eventDate) {
      return res.status(400).json({
        success: false,
        error: 'giftId, tokenId, and appointmentData.eventDate are required (eventTime is optional)',
        received: {
          giftId: !!giftId,
          tokenId: !!tokenId,
          eventDate: !!appointmentData?.eventDate,
          eventTime: !!appointmentData?.eventTime
        }
      });
    }

    // GUARD: Reject if giftId === tokenId (integration error)
    if (giftId === tokenId) {
      console.error('❌ GUARD VIOLATION: giftId === tokenId (misuse detected)', {
        giftId,
        tokenId
      });
      return res.status(400).json({
        success: false,
        error: 'giftId and tokenId must be different - integration error',
        hint: 'Parent component must resolve giftId from tokenId before calling this endpoint'
      });
    }

    // Get Redis connection
    const redis = validateRedisForCriticalOps('Save appointment');

    if (!redis) {
      return res.status(503).json({
        success: false,
        error: 'Storage not available'
      });
    }

    // SERVER-SIDE VALIDATION: Resolve tokenId → giftId and compare with client
    const tokenIdStr = tokenId.toString();
    const clientGiftId = giftId.toString();
    let serverGiftId: string | null = null;

    console.error('🔍 SAVE APPOINTMENT - SERVER VALIDATION:', {
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

    console.log('📅 Saving appointment data:', {
      realGiftId,
      tokenId: tokenIdStr,
      eventDate: appointmentData.eventDate,
      eventTime: appointmentData.eventTime
    });

    // Prepare data to save
    // ENHANCED: Use fallback for eventTime if not provided
    const eventTime = appointmentData.eventTime || '00:00';

    console.log('📅 Using eventTime:', {
      provided: appointmentData.eventTime,
      fallback: !appointmentData.eventTime,
      final: eventTime
    });

    const appointmentRecord = {
      giftId: realGiftId,
      tokenId: tokenIdStr || '',
      eventName: appointmentData.eventName || 'Consulta CryptoGift',
      eventDate: appointmentData.eventDate,
      eventTime, // Use fallback-enhanced eventTime
      duration: appointmentData.duration || 30,
      timezone: appointmentData.timezone || 'UTC',
      meetingUrl: appointmentData.meetingUrl || '',
      inviteeName: appointmentData.inviteeName || '',
      inviteeEmail: appointmentData.inviteeEmail || '',
      additionalInfo: appointmentData.additionalInfo ? JSON.stringify(appointmentData.additionalInfo) : '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // CRITICAL: Save to REAL giftId key (PRIMARY STORAGE)
    const realGiftDetailKey = `gift:detail:${realGiftId}`;

    // Store appointment data
    const updates: Record<string, any> = {
      appointment_scheduled: 'true',
      appointment_date: appointmentData.eventDate,
      appointment_time: eventTime, // Use fallback-enhanced eventTime
      appointment_duration: appointmentRecord.duration,
      appointment_timezone: appointmentRecord.timezone,
      appointment_meeting_url: appointmentRecord.meetingUrl,
      appointment_invitee_name: appointmentRecord.inviteeName,
      appointment_created_at: appointmentRecord.createdAt,
      // CRITICAL FIX: Always store tokenId to enable fallback search
      tokenId: tokenIdStr || ''
    };

    // If we have invitee email, encrypt it if PII encryption is available
    if (appointmentData.inviteeEmail) {
      try {
        const { safeEncryptEmail, isPIIEncryptionEnabled } = await import('../../../lib/piiEncryption');

        if (isPIIEncryptionEnabled()) {
          const encryptedData = safeEncryptEmail(appointmentData.inviteeEmail);
          if (encryptedData) {
            updates.appointment_invitee_email_encrypted = encryptedData.encrypted;
            updates.appointment_invitee_email_hmac = encryptedData.hmac;
          } else {
            updates.appointment_invitee_email_plain = appointmentData.inviteeEmail;
          }
        } else {
          updates.appointment_invitee_email_plain = appointmentData.inviteeEmail;
        }
      } catch (error) {
        console.error('Error encrypting appointment email:', error);
        updates.appointment_invitee_email_plain = appointmentData.inviteeEmail;
      }
    }

    // CRITICAL: Save ONLY to canonical giftId key (SINGLE SOURCE OF TRUTH)
    await redis.hset(realGiftDetailKey, updates);
    console.error(`✅ CANONICAL STORAGE: Saved appointment to ${realGiftDetailKey} (no tokenId key)`);

    // TELEMETRY: Alert if we would have written to tokenId key (regression detection)
    if (tokenIdStr && tokenIdStr !== realGiftId) {
      console.error('📊 TELEMETRY: Would have written to tokenId key in old code', {
        wouldHaveWrittenTo: `gift:detail:${tokenIdStr}`,
        actuallyWroteTo: realGiftDetailKey,
        prevention: 'GUARD_ACTIVE'
      });
    }

    // Also save a separate appointment record for easy retrieval
    const appointmentKey = `appointment:gift:${realGiftId}`;
    await redis.setex(
      appointmentKey,
      86400 * 30, // 30 days TTL
      JSON.stringify(appointmentRecord)
    );

    console.error('📊 SAVE APPOINTMENT - COMPLETE:', {
      realGiftId,
      tokenId: tokenIdStr,
      savedToKey: realGiftDetailKey,
      appointmentKey,
      eventDate: appointmentData.eventDate,
      eventTime, // Use fallback-enhanced eventTime
      eventTimeSource: appointmentData.eventTime ? 'calendly' : 'fallback',
      clientVsServer: clientGiftId === realGiftId ? 'MATCH' : 'MISMATCH_SERVER_PRIORITIZED'
    });

    console.log('✅ Appointment saved successfully:', {
      realGiftId,
      appointmentKey,
      eventDate: appointmentData.eventDate,
      eventTime, // Use fallback-enhanced eventTime
      usedFallback: !appointmentData.eventTime
    });

    debugLogger.operation('Appointment saved', {
      realGiftId,
      tokenId: tokenIdStr,
      eventDate: appointmentData.eventDate,
      eventTime, // Use fallback-enhanced eventTime
      timezone: appointmentData.timezone
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment saved successfully'
    });

  } catch (error: any) {
    console.error('💥 SAVE APPOINTMENT ERROR:', error);
    debugLogger.error('Failed to save appointment', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}