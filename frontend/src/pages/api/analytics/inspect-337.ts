/**
 * TEMPORARY DIAGNOSTIC - Inspect exact Redis data for Gift #337
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    console.error('🔍 INSPECTING Gift #337 (tokenId=337, giftId=363)');

    // Read BOTH keys
    const dataByGiftId = await redis.hgetall('gift:detail:363');
    const dataByTokenId = await redis.hgetall('gift:detail:337');

    console.error('📊 Data by giftId 363:', {
      exists: !!dataByGiftId && Object.keys(dataByGiftId).length > 0,
      fieldCount: dataByGiftId ? Object.keys(dataByGiftId).length : 0,
      fields: dataByGiftId ? Object.keys(dataByGiftId) : []
    });

    console.error('📊 Data by tokenId 337:', {
      exists: !!dataByTokenId && Object.keys(dataByTokenId).length > 0,
      fieldCount: dataByTokenId ? Object.keys(dataByTokenId).length : 0,
      fields: dataByTokenId ? Object.keys(dataByTokenId) : []
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),

      byGiftId363: {
        exists: !!dataByGiftId && Object.keys(dataByGiftId).length > 0,
        fieldCount: dataByGiftId ? Object.keys(dataByGiftId).length : 0,
        allFields: dataByGiftId ? Object.keys(dataByGiftId) : [],

        // Critical fields
        tokenId: (dataByGiftId as any)?.tokenId,

        // Email fields
        email_plain: (dataByGiftId as any)?.email_plain || 'NOT_FOUND',
        email_encrypted: (dataByGiftId as any)?.email_encrypted ? 'EXISTS' : 'NOT_FOUND',
        email_hmac: (dataByGiftId as any)?.email_hmac ? 'EXISTS' : 'NOT_FOUND',
        email_warning: (dataByGiftId as any)?.email_warning,
        email_captured_at: (dataByGiftId as any)?.email_captured_at,

        // Education fields
        education_score_correct: (dataByGiftId as any)?.education_score_correct,
        education_score_total: (dataByGiftId as any)?.education_score_total,
        education_score_percentage: (dataByGiftId as any)?.education_score_percentage,
        education_completed_at: (dataByGiftId as any)?.education_completed_at,

        // Appointment fields
        appointment_scheduled: (dataByGiftId as any)?.appointment_scheduled,
        appointment_date: (dataByGiftId as any)?.appointment_date,
        appointment_time: (dataByGiftId as any)?.appointment_time,

        // Claim fields
        claimer: (dataByGiftId as any)?.claimer,
        claimedAt: (dataByGiftId as any)?.claimedAt,

        fullData: dataByGiftId
      },

      byTokenId337: {
        exists: !!dataByTokenId && Object.keys(dataByTokenId).length > 0,
        fieldCount: dataByTokenId ? Object.keys(dataByTokenId).length : 0,
        allFields: dataByTokenId ? Object.keys(dataByTokenId) : [],

        // Critical fields
        tokenId: (dataByTokenId as any)?.tokenId,

        // Email fields
        email_plain: (dataByTokenId as any)?.email_plain || 'NOT_FOUND',
        email_encrypted: (dataByTokenId as any)?.email_encrypted ? 'EXISTS' : 'NOT_FOUND',
        email_hmac: (dataByTokenId as any)?.email_hmac ? 'EXISTS' : 'NOT_FOUND',
        email_warning: (dataByTokenId as any)?.email_warning,
        email_captured_at: (dataByTokenId as any)?.email_captured_at,

        // Education fields
        education_score_correct: (dataByTokenId as any)?.education_score_correct,
        education_score_total: (dataByTokenId as any)?.education_score_total,
        education_score_percentage: (dataByTokenId as any)?.education_score_percentage,
        education_completed_at: (dataByTokenId as any)?.education_completed_at,

        // Appointment fields
        appointment_scheduled: (dataByTokenId as any)?.appointment_scheduled,
        appointment_date: (dataByTokenId as any)?.appointment_date,
        appointment_time: (dataByTokenId as any)?.appointment_time,

        // Claim fields
        claimer: (dataByTokenId as any)?.claimer,
        claimedAt: (dataByTokenId as any)?.claimedAt,

        fullData: dataByTokenId
      },

      analysis: {
        emailLocation: (dataByGiftId as any)?.email_plain || (dataByGiftId as any)?.email_encrypted ? '363' :
                       (dataByTokenId as any)?.email_plain || (dataByTokenId as any)?.email_encrypted ? '337' : 'NONE',
        appointmentLocation: (dataByGiftId as any)?.appointment_date ? '363' :
                            (dataByTokenId as any)?.appointment_date ? '337' : 'NONE',
        educationLocation: (dataByGiftId as any)?.education_score_percentage ? '363' :
                          (dataByTokenId as any)?.education_score_percentage ? '337' : 'NONE'
      }
    });

  } catch (error: any) {
    console.error('❌ INSPECT ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
