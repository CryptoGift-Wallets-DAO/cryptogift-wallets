import { NextApiRequest, NextApiResponse } from 'next';
import { kvReferralDB } from '../../../lib/referralDatabaseKV';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { referrerAddress, referredAddress, referredEmail, source, userAgent } = req.body;

  if (!referrerAddress) {
    return res.status(400).json({ error: 'Referrer address is required' });
  }

  try {
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     req.socket.remoteAddress || 
                     'unknown';
    
    // Use first IP if multiple (proxy chain)
    const clientIP = Array.isArray(ipAddress) ? ipAddress[0] : ipAddress.split(',')[0];
    
    // Determine source from user agent or provided source
    let detectedSource = source;
    if (!detectedSource && userAgent) {
      if (userAgent.includes('WhatsApp')) detectedSource = 'WhatsApp';
      else if (userAgent.includes('Twitter')) detectedSource = 'Twitter';
      else if (userAgent.includes('Telegram')) detectedSource = 'Telegram';
      else if (userAgent.includes('Facebook')) detectedSource = 'Facebook';
      else detectedSource = 'Direct';
    }

    // Enhanced tracking with KV database - includes wallet address when available
    const referralId = await kvReferralDB.trackReferralClick(
      referrerAddress,
      {
        address: referredAddress, // Now properly saved when available
        email: referredEmail,
        ip: clientIP,
        userAgent
      },
      detectedSource
    );

    const referredIdentifier = kvReferralDB.generateUserDisplay(
      referredAddress, 
      referredEmail, 
      clientIP
    );

    console.log('✅ Referral click tracked (Enhanced KV):', {
      referralId,
      referrerAddress: referrerAddress.slice(0, 10) + '...',
      referredAddress: referredAddress ? referredAddress.slice(0, 10) + '...' : undefined,
      referredEmail: referredEmail ? referredEmail.slice(0, 4) + '***' : undefined,
      referredIdentifier,
      source: detectedSource,
      hasWallet: !!referredAddress,
      clientIP: clientIP.split('.').slice(0, 2).join('.') + '.**',
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Referral click tracked successfully',
      referralId,
      referredIdentifier,
      enhanced: true // Flag to indicate new system
    });
  } catch (error) {
    console.error('❌ Error tracking referral click:', error);
    res.status(500).json({ error: 'Failed to track referral click' });
  }
}