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
    eventTime: string;
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

    // Validate required fields
    if ((!giftId && !tokenId) || !appointmentData || !appointmentData.eventDate || !appointmentData.eventTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: (giftId or tokenId), appointmentData.eventDate, appointmentData.eventTime'
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

    // CRITICAL FIX: Automatic tokenId → giftId resolution
    // This ensures we always save to the correct primary key
    let realGiftId = giftId;
    const tokenIdStr = tokenId || giftId;

    console.error('🔍 SAVE APPOINTMENT - RESOLUTION:', {
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

    console.log('📅 Saving appointment data:', {
      realGiftId,
      tokenId: tokenIdStr,
      eventDate: appointmentData.eventDate,
      eventTime: appointmentData.eventTime
    });

    // Prepare data to save
    const appointmentRecord = {
      giftId: realGiftId,
      tokenId: tokenIdStr || '',
      eventName: appointmentData.eventName || 'Consulta CryptoGift',
      eventDate: appointmentData.eventDate,
      eventTime: appointmentData.eventTime,
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
      appointment_time: appointmentData.eventTime,
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

    // CRITICAL: Save to REAL giftId key (PRIMARY STORAGE)
    await redis.hset(realGiftDetailKey, updates);
    console.error(`✅ PRIMARY STORAGE: Saved appointment to ${realGiftDetailKey}`);

    // REDUNDANCY: Also save using tokenId as key for double lookup
    if (tokenIdStr && tokenIdStr !== realGiftId) {
      const tokenDetailKey = `gift:detail:${tokenIdStr}`;
      await redis.hset(tokenDetailKey, updates);
      console.error(`✅ REDUNDANT STORAGE: Also saved appointment to ${tokenDetailKey}`);
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
      savedToKeys: tokenIdStr !== realGiftId
        ? [realGiftDetailKey, `gift:detail:${tokenIdStr}`]
        : [realGiftDetailKey],
      appointmentKey,
      eventDate: appointmentData.eventDate,
      eventTime: appointmentData.eventTime
    });

    console.log('✅ Appointment saved successfully:', {
      realGiftId,
      appointmentKey,
      eventDate: appointmentData.eventDate,
      eventTime: appointmentData.eventTime
    });

    debugLogger.operation('Appointment saved', {
      realGiftId,
      tokenId: tokenIdStr,
      eventDate: appointmentData.eventDate,
      eventTime: appointmentData.eventTime,
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