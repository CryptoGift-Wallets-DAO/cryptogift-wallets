/**
 * DEBUG ENDPOINT: Inspect Gift #344 Redis Data
 *
 * Diagnostic endpoint to verify current state before reconciliation:
 * - Check mapping: gift:mapping:token:344
 * - Check data: gift:detail:344
 * - Check data: gift:detail:370 (claimed mapping)
 * - Determine correct giftId for this token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    const tokenId = '344';
    const mappedGiftId = '370';

    console.error('🔍 DEBUG GIFT #344 - Starting inspection...');

    // 1. Check the mapping
    const mappingKey = `gift:mapping:token:${tokenId}`;
    const mappingData = await redis.get(mappingKey);

    console.error('📊 MAPPING:', { key: mappingKey, data: mappingData });

    // 2. Check gift:detail:344 (tokenId)
    const tokenDetailKey = `gift:detail:${tokenId}`;
    const tokenDetail = await redis.hgetall(tokenDetailKey);

    console.error('📊 TOKEN DETAIL:', {
      key: tokenDetailKey,
      hasData: !!tokenDetail && Object.keys(tokenDetail).length > 0,
      keys: tokenDetail ? Object.keys(tokenDetail) : [],
      claimer: (tokenDetail as any)?.claimer,
      claimedAt: (tokenDetail as any)?.claimedAt,
      hasEmail: !!(tokenDetail as any)?.email_plain || !!(tokenDetail as any)?.email_encrypted,
      hasAppointment: !!(tokenDetail as any)?.appointment_scheduled
    });

    // 3. Check gift:detail:370 (mapped giftId)
    const giftDetailKey = `gift:detail:${mappedGiftId}`;
    const giftDetail = await redis.hgetall(giftDetailKey);

    console.error('📊 GIFT DETAIL:', {
      key: giftDetailKey,
      hasData: !!giftDetail && Object.keys(giftDetail).length > 0,
      keys: giftDetail ? Object.keys(giftDetail) : [],
      claimer: (giftDetail as any)?.claimer,
      claimedAt: (giftDetail as any)?.claimedAt,
      hasEmail: !!(giftDetail as any)?.email_plain || !!(giftDetail as any)?.email_encrypted,
      hasAppointment: !!(giftDetail as any)?.appointment_scheduled
    });

    // 4. Check reverse mapping
    const reverseKey = `gift:mapping:gift:${mappedGiftId}`;
    const reverseMapping = await redis.get(reverseKey);

    console.error('📊 REVERSE MAPPING:', { key: reverseKey, data: reverseMapping });

    // 5. Analysis
    const analysis = {
      tokenId,
      mappedGiftId,
      mappingExists: !!mappingData,
      mappingPoints: mappingData ? (typeof mappingData === 'object' ? (mappingData as any).giftId : mappingData) : null,
      tokenDetailExists: !!tokenDetail && Object.keys(tokenDetail).length > 0,
      tokenDetailClaimer: (tokenDetail as any)?.claimer,
      giftDetailExists: !!giftDetail && Object.keys(giftDetail).length > 0,
      giftDetailClaimer: (giftDetail as any)?.claimer,
      claimersMatch: (tokenDetail as any)?.claimer === (giftDetail as any)?.claimer,
      emailLocation: (tokenDetail as any)?.email_plain || (tokenDetail as any)?.email_encrypted ? 'tokenDetail' :
                     (giftDetail as any)?.email_plain || (giftDetail as any)?.email_encrypted ? 'giftDetail' : 'NONE',
      appointmentLocation: (tokenDetail as any)?.appointment_scheduled ? 'tokenDetail' :
                           (giftDetail as any)?.appointment_scheduled ? 'giftDetail' : 'NONE',
      recommendation: ''
    };

    // Determine recommendation
    if (!analysis.claimersMatch) {
      analysis.recommendation = `MAPPING_INCORRECT: TokenId ${tokenId} and giftId ${mappedGiftId} have DIFFERENT claimers. This suggests the mapping is wrong or data is corrupted.`;
    } else if (analysis.emailLocation === 'tokenDetail' || analysis.appointmentLocation === 'tokenDetail') {
      analysis.recommendation = `DATA_MISPLACED: Email/Appointment data is in tokenDetail instead of giftDetail. Needs reconciliation.`;
    } else if (analysis.emailLocation === 'NONE' && analysis.appointmentLocation === 'NONE') {
      analysis.recommendation = `NO_DATA: No email or appointment data found in either location.`;
    } else {
      analysis.recommendation = `OK: Data appears to be in correct location (giftDetail).`;
    }

    return res.status(200).json({
      success: true,
      tokenId,
      mappedGiftId,
      mapping: {
        key: mappingKey,
        data: mappingData
      },
      tokenDetail: {
        key: tokenDetailKey,
        exists: analysis.tokenDetailExists,
        claimer: analysis.tokenDetailClaimer,
        claimedAt: (tokenDetail as any)?.claimedAt,
        email_plain: (tokenDetail as any)?.email_plain,
        email_encrypted: !!(tokenDetail as any)?.email_encrypted,
        appointment_scheduled: (tokenDetail as any)?.appointment_scheduled,
        allKeys: tokenDetail ? Object.keys(tokenDetail) : []
      },
      giftDetail: {
        key: giftDetailKey,
        exists: analysis.giftDetailExists,
        claimer: analysis.giftDetailClaimer,
        claimedAt: (giftDetail as any)?.claimedAt,
        email_plain: (giftDetail as any)?.email_plain,
        email_encrypted: !!(giftDetail as any)?.email_encrypted,
        appointment_scheduled: (giftDetail as any)?.appointment_scheduled,
        allKeys: giftDetail ? Object.keys(giftDetail) : []
      },
      reverseMapping: {
        key: reverseKey,
        data: reverseMapping
      },
      analysis
    });

  } catch (error: any) {
    console.error('❌ DEBUG ERROR:', error);
    return res.status(500).json({
      error: error.message || 'Failed to debug gift'
    });
  }
}
