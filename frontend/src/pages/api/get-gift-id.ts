/**
 * GET GIFT ID API
 * Simple endpoint to get giftId from tokenId mapping
 * Used for appointment saving and analytics
 *
 * @author CryptoGift Wallets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getGiftIdFromTokenId } from '../../lib/escrowUtils';

interface GetGiftIdResponse {
  success: boolean;
  giftId?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetGiftIdResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { tokenId } = req.query;

    // Validate tokenId
    if (!tokenId || typeof tokenId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing tokenId'
      });
    }

    // Get giftId from tokenId mapping
    const giftId = await getGiftIdFromTokenId(tokenId);

    if (giftId === null) {
      return res.status(404).json({
        success: false,
        error: 'Gift not found for this tokenId'
      });
    }

    return res.status(200).json({
      success: true,
      giftId
    });

  } catch (error: any) {
    console.error('Error getting giftId:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}