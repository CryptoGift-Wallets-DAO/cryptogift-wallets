/**
 * MANUAL TRACKING API
 * Endpoint temporal para registrar eventos manualmente en analytics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { recordGiftEvent, initializeCampaign } from '../../../lib/giftAnalytics';
import { trackGiftCreated, trackGiftViewed, trackGiftClaimed, trackEducationCompleted } from '../../../lib/analyticsIntegration';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, data } = req.body;

    console.log('📊 Manual tracking request:', { action, data });

    switch (action) {
      case 'track-claim-305':
        // Initialize campaign if it doesn't exist
        await initializeCampaign(
          'campaign_0xc655BF',
          'Test Campaign Gift 305',
          '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6'
        );

        // Registrar el claim del regalo 305
        await trackGiftClaimed({
          giftId: '332',
          tokenId: '305',
          campaignId: 'campaign_0xc655BF',
          claimerAddress: '0xA362a26F5cD0e0f3380718b30470d96c5E0aF61E',
          previousOwner: '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6',
          txHash: '0x' + Math.random().toString(16).slice(2),
          metadata: {
            claimedAt: '2025-09-27T10:34:36.000Z',
            educationCompleted: true,
            emailProvided: 'user@example.com',
            educationScore: 100,
            modulesCompleted: ['sales-masterclass']
          }
        });

        // También registrar la educación completada
        await trackEducationCompleted({
          giftId: '332',
          tokenId: '305',
          claimer: '0xA362a26F5cD0e0f3380718b30470d96c5E0aF61E',
          claimerAddress: '0xA362a26F5cD0e0f3380718b30470d96c5E0aF61E',
          completedModules: [5],
          totalScore: 100,
          completedAt: '2025-09-27T10:33:00.000Z'
        });

        return res.status(200).json({
          success: true,
          message: 'Gift 305 claim tracked successfully',
          details: {
            giftId: '332',
            tokenId: '305',
            claimerAddress: '0xA362a26F5cD0e0f3380718b30470d96c5E0aF61E',
            educationScore: 100
          }
        });

      case 'track-custom':
        // Permite tracking personalizado
        if (!data) {
          return res.status(400).json({ error: 'Missing data for custom tracking' });
        }

        await recordGiftEvent(data);

        return res.status(200).json({
          success: true,
          message: 'Custom event tracked',
          event: data
        });

      case 'init-campaign':
        // Initialize campaign metadata retroactively
        const { campaignId, name, owner } = req.body;

        if (!campaignId) {
          return res.status(400).json({ error: 'Missing campaignId' });
        }

        await initializeCampaign(
          campaignId,
          name || `Campaign ${campaignId.slice(0, 10)}...`,
          owner || 'Unknown'
        );

        return res.status(200).json({
          success: true,
          message: 'Campaign initialized',
          campaignId,
          name: name || `Campaign ${campaignId.slice(0, 10)}...`,
          owner: owner || 'Unknown'
        });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('Manual tracking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Tracking failed',
      message: error.message || 'Unknown error'
    });
  }
}