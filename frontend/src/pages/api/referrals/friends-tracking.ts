import { NextApiRequest, NextApiResponse } from 'next';
import { kvReferralDB, ReferralRecord } from '../../../lib/referralDatabaseKV';

interface ReferredFriend {
  id: string;
  joinDate: string;
  userIdentifier: string;
  status: 'registered' | 'activated' | 'active';
  totalGifts: number;
  totalSpent: number;
  lastActivity: string;
  source?: string;
  earningsGenerated: number;
  giftHistory: {
    id: string;
    date: string;
    amount: number;
    tokenId?: string;
  }[];
}

// Transform ReferralRecord to ReferredFriend format
function transformReferralToFriend(referral: ReferralRecord): ReferredFriend {
  return {
    id: referral.id,
    joinDate: referral.registrationDate,
    userIdentifier: referral.referredUserDisplay,
    status: referral.status,
    totalGifts: referral.gifts.length,
    totalSpent: referral.gifts.reduce((sum, gift) => sum + gift.amount, 0),
    lastActivity: referral.lastActivity,
    source: referral.source,
    earningsGenerated: referral.totalEarnings,
    giftHistory: referral.gifts.map(gift => ({
      id: gift.id,
      date: gift.date,
      amount: gift.amount,
      tokenId: gift.tokenId
    }))
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, filter, sortBy } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    console.log('🔍 Loading real referral data for address:', address);
    
    // Get real referral data from database
    const referralRecords = await kvReferralDB.getUserReferrals(address);
    console.log('📊 Found referral records:', referralRecords.length);
    
    // Transform to ReferredFriend format
    let friends = referralRecords.map(transformReferralToFriend);
    
    // Filter by status
    if (filter && filter !== 'all') {
      friends = friends.filter(friend => friend.status === filter);
      console.log('🔍 Filtered by status:', filter, 'count:', friends.length);
    }

    // Sort friends
    if (sortBy === 'earnings') {
      friends.sort((a, b) => b.earningsGenerated - a.earningsGenerated);
    } else if (sortBy === 'activity') {
      friends.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    } else {
      // Sort by join date (newest first)
      friends.sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());
    }

    const totalFriends = referralRecords.length;
    const activatedFriends = referralRecords.filter(f => f.status === 'activated' || f.status === 'active').length;
    const totalEarnings = referralRecords.reduce((sum, f) => sum + f.totalEarnings, 0);

    console.log('✅ Real referral tracking data loaded:', {
      totalFriends,
      activatedFriends,
      totalEarnings,
      filterApplied: filter
    });

    res.status(200).json({
      success: true,
      friends,
      summary: {
        totalFriends,
        activatedFriends,
        registeredOnly: referralRecords.filter(f => f.status === 'registered').length,
        totalEarnings,
        conversionRate: totalFriends > 0 ? (activatedFriends / totalFriends) * 100 : 0,
        averageEarningPerFriend: activatedFriends > 0 ? totalEarnings / activatedFriends : 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching real friends tracking data:', error);
    res.status(500).json({ error: 'Failed to fetch friends tracking data' });
  }
}