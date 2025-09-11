import { NextApiRequest, NextApiResponse } from 'next';
import { kvReferralDB } from '../../../lib/referralDatabaseKV';

interface PendingReward {
  id: string;
  date: string;
  amount: number;
  referredUser: string;
  referredUserDisplay: string;
  giftAmount: number;
  giftTokenId?: string;
  estimatedCompletionDate: string;
  reason: 'blockchain_confirmation' | 'payment_processing' | 'fraud_review' | 'manual_review';
  dayCategory: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'older';
}


function categorizePendingRewards(rewards: PendingReward[]): PendingReward[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return rewards.map(reward => {
    const rewardDate = new Date(reward.date);
    const rewardDay = new Date(rewardDate.getFullYear(), rewardDate.getMonth(), rewardDate.getDate());

    let dayCategory: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'older';

    if (rewardDay.getTime() === today.getTime()) {
      dayCategory = 'today';
    } else if (rewardDay.getTime() === yesterday.getTime()) {
      dayCategory = 'yesterday';
    } else if (rewardDay >= startOfWeek) {
      dayCategory = 'this_week';
    } else if (rewardDay >= startOfMonth) {
      dayCategory = 'this_month';
    } else {
      dayCategory = 'older';
    }

    return { ...reward, dayCategory };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, dateFilter, sortBy } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    console.log('📊 Loading real pending rewards for address:', address);
    
    // Get real pending rewards from database
    const realPendingRewards = await kvReferralDB.getUserPendingRewards(address);
    console.log('🔍 Found real pending rewards:', realPendingRewards.length);
    
    // Categorize rewards by day
    let categorizedRewards = categorizePendingRewards(realPendingRewards);

    // Filter by date category
    if (dateFilter && dateFilter !== 'all') {
      categorizedRewards = categorizedRewards.filter(reward => 
        reward.dayCategory === dateFilter
      );
    }

    // Sort rewards
    if (sortBy === 'amount') {
      categorizedRewards.sort((a, b) => b.amount - a.amount);
    } else {
      // Sort by date (newest first)
      categorizedRewards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Calculate statistics
    const totalPending = categorizedRewards.reduce((sum, r) => sum + r.amount, 0);
    const todayCount = categorizedRewards.filter(r => r.dayCategory === 'today').length;
    const yesterdayCount = categorizedRewards.filter(r => r.dayCategory === 'yesterday').length;
    const thisWeekCount = categorizedRewards.filter(r => r.dayCategory === 'this_week').length;
    const thisMonthCount = categorizedRewards.filter(r => r.dayCategory === 'this_month').length;

    // Group by reason
    const reasonCounts = categorizedRewards.reduce((counts: Record<string, number>, reward) => {
      counts[reward.reason] = (counts[reward.reason] || 0) + 1;
      return counts;
    }, {});

    console.log('✅ Real pending rewards loaded successfully:', {
      totalCount: categorizedRewards.length,
      totalPending,
      todayCount,
      yesterdayCount,
      filterApplied: dateFilter
    });

    res.status(200).json({
      success: true,
      pendingRewards: categorizedRewards,
      summary: {
        totalPending,
        totalCount: categorizedRewards.length,
        todayCount,
        yesterdayCount,
        thisWeekCount,
        thisMonthCount,
        reasonCounts,
        averageAmount: categorizedRewards.length > 0 ? totalPending / categorizedRewards.length : 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching real pending rewards:', error);
    res.status(500).json({ error: 'Failed to fetch pending rewards' });
  }
}