/**
 * VERSION CHECK ENDPOINT
 * Diagnostic endpoint to verify which version of code is deployed
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const versionInfo = {
    endpoint: '/api/analytics/version-check',
    commitExpected: '4334ef6',
    deploymentDate: '2025-10-19',
    features: {
      tokenIdResolution: true,
      dualKeyStorage: true,
      comprehensiveLogging: true
    },
    codeSignature: {
      saveEmailManual: 'ENHANCED_WITH_RESOLUTION',
      saveAppointment: 'ENHANCED_WITH_RESOLUTION',
      hasNewLogging: true,
      hasRealGiftIdField: true
    },
    timestamp: new Date().toISOString(),
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'unknown'
  };

  console.error('🔍 VERSION CHECK CALLED:', versionInfo);

  return res.status(200).json({
    success: true,
    ...versionInfo,
    message: 'If you see this, the new code is deployed. Now test save-email-manual.'
  });
}
