/**
 * TEMPORARY TEST ENDPOINT - Direct Redis check for Gift #336 data
 * This will show EXACTLY what's in Redis for email and appointment
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // CRITICAL: Use direct instantiation that WORKS
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    console.error('🔍 TEST: Starting Gift #336 data check...');

    // Read BOTH keys directly
    const data362 = await redis.hgetall('gift:detail:362');
    const data336 = await redis.hgetall('gift:detail:336');

    console.error('📊 TEST: Data fetched', {
      '362_exists': !!data362 && Object.keys(data362).length > 0,
      '362_keys': data362 ? Object.keys(data362) : [],
      '336_exists': !!data336 && Object.keys(data336).length > 0,
      '336_keys': data336 ? Object.keys(data336) : []
    });

    // Extract critical fields
    const result = {
      success: true,
      timestamp: new Date().toISOString(),

      giftDetail362: {
        exists: !!data362 && Object.keys(data362).length > 0,
        totalFields: data362 ? Object.keys(data362).length : 0,

        // Claimer
        claimer: (data362 as any)?.claimer || 'NOT_FOUND',
        claimedAt: (data362 as any)?.claimedAt || 'NOT_FOUND',

        // Email
        email_plain: (data362 as any)?.email_plain || 'NOT_FOUND',
        email_encrypted: (data362 as any)?.email_encrypted ? 'EXISTS' : 'NOT_FOUND',
        email_hmac: (data362 as any)?.email_hmac ? 'EXISTS' : 'NOT_FOUND',

        // Appointment
        appointment_scheduled: (data362 as any)?.appointment_scheduled || 'NOT_FOUND',
        appointment_date: (data362 as any)?.appointment_date || 'NOT_FOUND',
        appointment_time: (data362 as any)?.appointment_time || 'NOT_FOUND',

        allKeys: data362 ? Object.keys(data362) : []
      },

      giftDetail336: {
        exists: !!data336 && Object.keys(data336).length > 0,
        totalFields: data336 ? Object.keys(data336).length : 0,

        // Claimer
        claimer: (data336 as any)?.claimer || 'NOT_FOUND',
        claimedAt: (data336 as any)?.claimedAt || 'NOT_FOUND',

        // Email
        email_plain: (data336 as any)?.email_plain || 'NOT_FOUND',
        email_encrypted: (data336 as any)?.email_encrypted ? 'EXISTS' : 'NOT_FOUND',
        email_hmac: (data336 as any)?.email_hmac ? 'EXISTS' : 'NOT_FOUND',

        // Appointment
        appointment_scheduled: (data336 as any)?.appointment_scheduled || 'NOT_FOUND',
        appointment_date: (data336 as any)?.appointment_date || 'NOT_FOUND',
        appointment_time: (data336 as any)?.appointment_time || 'NOT_FOUND',

        allKeys: data336 ? Object.keys(data336) : []
      },

      analysis: {
        claimerLocation: (data362 as any)?.claimer ? '362' : (data336 as any)?.claimer ? '336' : 'NONE',
        emailLocation: (data362 as any)?.email_plain || (data362 as any)?.email_encrypted ? '362' :
                       (data336 as any)?.email_plain || (data336 as any)?.email_encrypted ? '336' : 'NONE',
        appointmentLocation: (data362 as any)?.appointment_date ? '362' :
                            (data336 as any)?.appointment_date ? '336' : 'NONE',
        needsMerge: ((data362 as any)?.claimer || (data336 as any)?.claimer) &&
                    ((data362 as any)?.email_plain || (data336 as any)?.email_plain ||
                     (data362 as any)?.appointment_date || (data336 as any)?.appointment_date)
      }
    };

    console.error('✅ TEST: Analysis complete', result.analysis);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('❌ TEST ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
