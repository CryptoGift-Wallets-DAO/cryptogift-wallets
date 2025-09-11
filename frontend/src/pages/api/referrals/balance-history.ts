import { NextApiRequest, NextApiResponse } from 'next';
import { kvReferralDB } from '../../../lib/referralDatabaseKV';

interface BalanceTransaction {
  id: string;
  date: string;
  type: 'earning' | 'withdrawal';
  amount: number;
  description: string;
  referredUser?: string;
  transactionHash?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, dateRange, filter } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    console.log('📊 Loading real balance history for address:', address);
    
    // Get real earnings history from database
    const earningsHistory = await kvReferralDB.getUserEarningsHistory(address);
    console.log('💰 Found earnings:', earningsHistory.length);
    
    // Transform earnings to balance transactions
    let transactions: BalanceTransaction[] = earningsHistory.map(earning => ({
      id: earning.id,
      date: earning.date,
      type: 'earning' as const,
      amount: earning.amount,
      description: 'Comisión por referido',
      referredUser: earning.referredUser,
      transactionHash: earning.transactionHash
    }));

    // Filter by date range
    const now = new Date();
    if (dateRange !== 'all') {
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      
      transactions = transactions.filter(tx => 
        new Date(tx.date) > cutoffDate
      );
    }

    // Filter by transaction type
    if (filter && filter !== 'all') {
      transactions = transactions.filter(tx => tx.type === filter);
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('✅ Real balance history loaded:', {
      totalTransactions: transactions.length,
      dateRange,
      filter
    });

    res.status(200).json({
      success: true,
      transactions,
      summary: {
        totalEarnings: transactions.filter(tx => tx.type === 'earning').reduce((sum, tx) => sum + tx.amount, 0),
        totalWithdrawals: transactions.filter(tx => tx.type === 'withdrawal').reduce((sum, tx) => sum + tx.amount, 0),
        transactionCount: transactions.length
      },
      enhanced: true
    });
  } catch (error) {
    console.error('❌ Error fetching real balance history:', error);
    res.status(500).json({ error: 'Failed to fetch balance history' });
  }
}