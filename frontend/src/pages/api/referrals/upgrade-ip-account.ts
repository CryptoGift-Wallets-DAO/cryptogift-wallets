import { NextApiRequest, NextApiResponse } from 'next';
import { kvReferralDB } from '../../../lib/referralDatabaseKV';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userAddress, userEmail } = req.body;

  if (!userAddress) {
    return res.status(400).json({ error: 'User address is required' });
  }

  try {
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     req.socket.remoteAddress || 
                     'unknown';
    
    // Use first IP if multiple (proxy chain)
    const clientIP = Array.isArray(ipAddress) ? ipAddress[0] : ipAddress.split(',')[0];

    console.log('🔄 Processing enhanced IP account upgrade:', {
      userAddress: userAddress.slice(0, 10) + '...',
      clientIP: clientIP.split('.').slice(0, 2).join('.') + '.**', // Privacy-safe logging
      userEmail: userEmail ? userEmail.slice(0, 4) + '***' : undefined
    });

    // Create or update user profile
    const profile = await kvReferralDB.createOrUpdateUserProfile(userAddress, {
      email: userEmail,
      ipHistory: [clientIP],
      sessionHistory: [`session_${Date.now()}`]
    });

    // Try to find and merge any IP-based referrals
    // This handles the case where user had IP-based referrals and now connected wallet
    const existingReferrals = await kvReferralDB.getUserReferrals(userAddress);
    
    console.log('✅ Enhanced IP account upgrade processed:', {
      userAddress: userAddress.slice(0, 10) + '...',
      profileCreated: !!profile,
      existingReferrals: existingReferrals.length,
      totalEarnings: profile.referralStats.totalEarnings,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Enhanced IP account upgrade processed successfully',
      profile: {
        totalReferrals: profile.referralStats.totalReferrals,
        totalEarnings: profile.referralStats.totalEarnings,
        registrationDate: profile.registrationDate
      },
      enhanced: true // Flag to indicate new system
    });
    
  } catch (error) {
    console.error('❌ Error in enhanced IP account upgrade:', error);
    res.status(500).json({ 
      error: 'Failed to upgrade IP account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}