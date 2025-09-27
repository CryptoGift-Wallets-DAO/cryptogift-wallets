/**
 * TEST TRACKING API
 * Creates a sample gift lifecycle to test the tracking system
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { trackGiftCreated, trackGiftViewed, trackGiftClaimed, trackEducationCompleted } from '../../../lib/analyticsIntegration';
import { initializeCampaign } from '../../../lib/giftAnalytics';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const campaignId = 'campaign_test_dashboard';
    const giftId = 'test_gift_dashboard';
    const tokenId = '999';

    console.log('🧪 Testing tracking system...');

    // 1. Initialize campaign
    await initializeCampaign(
      campaignId,
      'Test Dashboard Campaign',
      '0x1234567890abcdef1234567890abcdef12345678'
    );

    // 2. Track gift creation
    await trackGiftCreated({
      giftId,
      tokenId,
      campaignId,
      creator: '0x1234567890abcdef1234567890abcdef12345678',
      value: 0.1,
      txHash: '0xtest123...',
      referrer: '0x1234567890abcdef1234567890abcdef12345678'
    });

    // 3. Track gift viewed
    await trackGiftViewed({
      giftId,
      tokenId,
      campaignId,
      viewer: '0xabcdef1234567890abcdef1234567890abcdef12',
      timestamp: Date.now()
    });

    // 4. Track education completed
    await trackEducationCompleted({
      giftId,
      tokenId,
      claimer: '0xabcdef1234567890abcdef1234567890abcdef12',
      claimerAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      completedModules: [5],
      totalScore: 100,
      completedAt: new Date().toISOString()
    });

    // 5. Track gift claimed
    await trackGiftClaimed({
      giftId,
      tokenId,
      campaignId,
      claimerAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      previousOwner: '0x1234567890abcdef1234567890abcdef12345678',
      txHash: '0xclaim123...',
      metadata: {
        claimedAt: new Date().toISOString(),
        educationCompleted: true,
        emailProvided: 'test@example.com',
        educationScore: 100
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Test tracking completed successfully',
      data: {
        campaignId,
        giftId,
        tokenId,
        steps: [
          'Campaign initialized',
          'Gift created',
          'Gift viewed',
          'Education completed',
          'Gift claimed'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test tracking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test tracking failed',
      message: error.message || 'Unknown error'
    });
  }
}