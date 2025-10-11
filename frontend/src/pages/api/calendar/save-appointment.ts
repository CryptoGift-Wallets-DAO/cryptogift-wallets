/**
 * SAVE APPOINTMENT API
 * Guarda información de citas agendadas de Calendly
 *
 * @author CryptoGift Wallets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';
import { debugLogger } from '../../../lib/secureDebugLogger';

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
    if (!giftId || !appointmentData || !appointmentData.eventDate || !appointmentData.eventTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: giftId, appointmentData.eventDate, appointmentData.eventTime'
      });
    }

    console.log('📅 Saving appointment data:', {
      giftId,
      tokenId,
      eventDate: appointmentData.eventDate,
      eventTime: appointmentData.eventTime
    });

    // Get Redis connection
    const redis = validateRedisForCriticalOps('Save appointment');

    if (!redis) {
      return res.status(503).json({
        success: false,
        error: 'Storage not available'
      });
    }

    // Prepare data to save
    const appointmentRecord = {
      giftId,
      tokenId: tokenId || '',
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

    // Save to gift:detail hash
    const giftDetailKey = `gift:detail:${giftId}`;

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
      tokenId: tokenId || ''
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

    // Update gift detail with appointment data
    await redis.hset(giftDetailKey, updates);

    // CRITICAL FIX: Double storage for tokenId lookup
    // Store the same data using tokenId as key for double lookup
    if (tokenId && tokenId !== giftId) {
      const tokenDetailKey = `gift:detail:${tokenId}`;
      await redis.hset(tokenDetailKey, updates);
      console.log(`✅ DOUBLE STORAGE: Also stored appointment in ${tokenDetailKey} for tokenId lookup`);
    }

    // Also save a separate appointment record for easy retrieval
    const appointmentKey = `appointment:gift:${giftId}`;
    await redis.setex(
      appointmentKey,
      86400 * 30, // 30 days TTL
      JSON.stringify(appointmentRecord)
    );

    console.log('✅ Appointment saved successfully:', {
      giftId,
      appointmentKey,
      eventDate: appointmentData.eventDate,
      eventTime: appointmentData.eventTime
    });

    debugLogger.operation('Appointment saved', {
      giftId,
      tokenId,
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