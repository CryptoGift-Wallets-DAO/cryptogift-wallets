import { NextApiRequest, NextApiResponse } from 'next';
import { kvReferralDB } from '../../../lib/referralDatabaseKV';

interface EarningRecord {
  id: string;
  date: string;
  amount: number;
  referredUser: string;
  referredUserDisplay: string;
  giftAmount: number;
  giftTokenId?: string;
  transactionHash?: string;
  status: 'completed' | 'pending';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, dateRange, sortBy } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    console.log('💰 Loading real earnings history for address:', address);
    
    // Get real earnings history from database
    const realEarnings = await kvReferralDB.getUserEarningsHistory(address);
    console.log('📊 Found real earnings:', realEarnings.length);
    
    // Transform to expected format
    let earnings: EarningRecord[] = realEarnings.map(earning => ({
      id: earning.id,
      date: earning.date,
      amount: earning.amount,
      referredUser: earning.referredUser,
      referredUserDisplay: earning.referredUserDisplay,
      giftAmount: earning.giftAmount,
      giftTokenId: earning.giftTokenId,
      transactionHash: earning.transactionHash,
      status: earning.status
    }));

    // Filter by date range
    const now = new Date();
    if (dateRange !== 'all') {
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      
      earnings = earnings.filter(earning => 
        new Date(earning.date) > cutoffDate
      );
    }

    // Sort earnings
    if (sortBy === 'amount') {
      earnings.sort((a, b) => b.amount - a.amount);
    } else {
      // Sort by date (newest first)
      earnings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const completedEarnings = earnings.filter(e => e.status === 'completed');
    const pendingEarnings = earnings.filter(e => e.status === 'pending');

    console.log('✅ Real earnings history loaded:', {
      totalEarnings: earnings.length,
      completedCount: completedEarnings.length,
      pendingCount: pendingEarnings.length,
      dateRange,
      sortBy
    });

    res.status(200).json({
      success: true,
      earnings,
      summary: {
        totalEarnings: completedEarnings.reduce((sum, e) => sum + e.amount, 0),
        pendingEarnings: pendingEarnings.reduce((sum, e) => sum + e.amount, 0),
        completedCount: completedEarnings.length,
        pendingCount: pendingEarnings.length,
        averageEarning: completedEarnings.length > 0 ? completedEarnings.reduce((sum, e) => sum + e.amount, 0) / completedEarnings.length : 0
      },
      enhanced: true
    });
  } catch (error) {
    console.error('❌ Error fetching real earnings history:', error);
    res.status(500).json({ error: 'Failed to fetch earnings history' });
  }
}