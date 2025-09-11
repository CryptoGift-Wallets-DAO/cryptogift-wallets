import { NextApiRequest, NextApiResponse } from 'next';
import { kvReferralDB } from '../../../lib/referralDatabaseKV';
import { REFERRAL_COMMISSION_PERCENT } from '../../../lib/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    referrerAddress, 
    referredAddress, 
    referredEmail, 
    tokenId, 
    giftAmount, 
    transactionHash 
  } = req.body;

  if (!referrerAddress || !tokenId || !giftAmount) {
    return res.status(400).json({ 
      error: 'Referrer address, token ID, and gift amount are required' 
    });
  }

  try {
    // Calculate commission (20% of platform earnings, not of gift amount)
    // Assuming platform takes 4% of gift amount, so commission is 20% of that 4%
    const platformFee = giftAmount * 0.04; // 4% platform fee
    const commission = platformFee * (REFERRAL_COMMISSION_PERCENT / 100); // 20% of platform fee

    // Enhanced activation tracking with KV database
    const success = await kvReferralDB.trackReferralActivation(
      referrerAddress,
      {
        address: referredAddress, // Critical: Include wallet address for proper mapping
        email: referredEmail
      },
      {
        tokenId,
        amount: giftAmount,
        commission,
        transactionHash
      }
    );

    if (!success) {
      console.warn('⚠️ Referral activation failed - no matching referral found');
      return res.status(404).json({ 
        error: 'No matching referral found for activation',
        referrerAddress: referrerAddress.slice(0, 10) + '...',
        referredAddress: referredAddress ? referredAddress.slice(0, 10) + '...' : undefined
      });
    }

    const referredIdentifier = kvReferralDB.generateUserDisplay(referredAddress, referredEmail);

    console.log('✅ Referral activation tracked (Enhanced KV):', {
      referrerAddress: referrerAddress.slice(0, 10) + '...',
      referredAddress: referredAddress ? referredAddress.slice(0, 10) + '...' : undefined,
      referredIdentifier,
      tokenId,
      giftAmount,
      commission,
      hasWallet: !!referredAddress,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Referral activation tracked successfully',
      commission,
      referredIdentifier,
      enhanced: true, // Flag to indicate new system
      realTimeUpdate: true // Indicates stats should refresh
    });
  } catch (error) {
    console.error('❌ Error tracking referral activation:', error);
    res.status(500).json({ error: 'Failed to track referral activation' });
  }
}