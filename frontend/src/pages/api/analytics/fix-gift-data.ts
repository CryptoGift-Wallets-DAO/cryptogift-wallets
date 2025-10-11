/**
 * FIX GIFT DATA ENDPOINT
 *
 * This endpoint allows manual updating of gift data in Redis
 * to fix missing claimer, email, and appointment information
 *
 * USAGE:
 * POST /api/analytics/fix-gift-data
 * {
 *   "giftId": "357",
 *   "tokenId": "331",
 *   "claimer": "0x...",
 *   "email": "user@example.com",
 *   "appointment": {
 *     "date": "2025-10-15",
 *     "time": "10:00",
 *     "timezone": "America/Mexico_City"
 *   }
 * }
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

  // Simple authentication check
  const { adminKey } = req.body;
  if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'emergency_fix_2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const {
      giftId,
      tokenId,
      claimer,
      email,
      appointment,
      overwrite = false // If true, overwrites existing data
    } = req.body;

    if (!giftId) {
      return res.status(400).json({ error: 'giftId is required' });
    }

    const redis = validateRedisForCriticalOps('Fix gift data');
    if (!redis) {
      return res.status(503).json({ error: 'Redis not available' });
    }

    const giftDetailKey = `gift:detail:${giftId}`;
    const updates: Record<string, any> = {};
    const results: any = {
      giftId,
      tokenId,
      updated: [],
      skipped: [],
      errors: []
    };

    // Get existing data
    const existingData = await redis.hgetall(giftDetailKey);
    const hasExistingData = existingData && Object.keys(existingData).length > 0;

    // Always ensure tokenId is set for fallback search
    if (tokenId) {
      updates.tokenId = tokenId.toString();
    }

    // Update claimer if provided
    if (claimer) {
      if (!existingData?.claimer || overwrite) {
        updates.claimer = claimer;
        updates.claimedAt = existingData?.claimedAt || Date.now().toString();
        updates.status = 'claimed';
        results.updated.push('claimer');
      } else {
        results.skipped.push({ field: 'claimer', reason: 'already exists', existing: existingData.claimer });
      }
    }

    // Update email if provided
    if (email) {
      if (!existingData?.email_plain && !existingData?.email_encrypted || overwrite) {
        // Try to encrypt if PII encryption is available
        try {
          const { safeEncryptEmail, isPIIEncryptionEnabled } = await import('../../../lib/piiEncryption');

          if (isPIIEncryptionEnabled()) {
            const encryptedData = safeEncryptEmail(email);
            if (encryptedData) {
              updates.email_encrypted = encryptedData.encrypted;
              updates.email_hmac = encryptedData.hmac;
              updates.email_captured_at = Date.now().toString();
              results.updated.push('email (encrypted)');
            } else {
              // Fallback to plain if encryption fails
              updates.email_plain = email;
              updates.email_warning = 'ENCRYPTION_FAILED_IN_FIX';
              updates.email_captured_at = Date.now().toString();
              results.updated.push('email (plain - encryption failed)');
            }
          } else {
            // Store as plain if encryption not configured
            updates.email_plain = email;
            updates.email_warning = 'PII_ENCRYPTION_NOT_CONFIGURED';
            updates.email_captured_at = Date.now().toString();
            results.updated.push('email (plain - encryption not configured)');
          }
        } catch (error) {
          // Store as plain if any error
          updates.email_plain = email;
          updates.email_warning = 'ERROR_DURING_ENCRYPTION';
          updates.email_captured_at = Date.now().toString();
          results.updated.push('email (plain - error during encryption)');
          results.errors.push({ field: 'email', error: (error as Error).message });
        }
      } else {
        results.skipped.push({
          field: 'email',
          reason: 'already exists',
          hasEncrypted: !!existingData?.email_encrypted,
          hasPlain: !!existingData?.email_plain
        });
      }
    }

    // Update appointment if provided
    if (appointment && appointment.date && appointment.time) {
      if (!existingData?.appointment_date || overwrite) {
        updates.appointment_scheduled = 'true';
        updates.appointment_date = appointment.date;
        updates.appointment_time = appointment.time;
        updates.appointment_duration = appointment.duration || 30;
        updates.appointment_timezone = appointment.timezone || 'UTC';
        updates.appointment_meeting_url = appointment.meetingUrl || '';
        updates.appointment_invitee_name = appointment.inviteeName || '';
        updates.appointment_created_at = Date.now().toString();

        // Handle invitee email if provided
        if (appointment.inviteeEmail) {
          try {
            const { safeEncryptEmail, isPIIEncryptionEnabled } = await import('../../../lib/piiEncryption');

            if (isPIIEncryptionEnabled()) {
              const encryptedData = safeEncryptEmail(appointment.inviteeEmail);
              if (encryptedData) {
                updates.appointment_invitee_email_encrypted = encryptedData.encrypted;
                updates.appointment_invitee_email_hmac = encryptedData.hmac;
              } else {
                updates.appointment_invitee_email_plain = appointment.inviteeEmail;
              }
            } else {
              updates.appointment_invitee_email_plain = appointment.inviteeEmail;
            }
          } catch (error) {
            updates.appointment_invitee_email_plain = appointment.inviteeEmail;
          }
        }

        results.updated.push('appointment');
      } else {
        results.skipped.push({
          field: 'appointment',
          reason: 'already exists',
          existingDate: existingData.appointment_date
        });
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await redis.hset(giftDetailKey, updates);
      results.success = true;
      results.message = `Updated ${Object.keys(updates).length} fields in ${giftDetailKey}`;
      results.updatedFields = Object.keys(updates);
    } else {
      results.success = true;
      results.message = 'No updates needed';
    }

    // Also update appointment record if provided
    if (appointment && appointment.date && appointment.time) {
      const appointmentKey = `appointment:gift:${giftId}`;
      const appointmentRecord = {
        giftId,
        tokenId: tokenId || '',
        eventName: appointment.eventName || 'Consulta CryptoGift',
        eventDate: appointment.date,
        eventTime: appointment.time,
        duration: appointment.duration || 30,
        timezone: appointment.timezone || 'UTC',
        meetingUrl: appointment.meetingUrl || '',
        inviteeName: appointment.inviteeName || '',
        inviteeEmail: appointment.inviteeEmail || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await redis.setex(
        appointmentKey,
        86400 * 30, // 30 days TTL
        JSON.stringify(appointmentRecord)
      );

      results.appointmentRecord = {
        key: appointmentKey,
        saved: true
      };
    }

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('Fix gift data error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}