/**
 * IN-MEMORY ANALYTICS FALLBACK
 * When Redis is not configured, store analytics data in memory
 */

interface MemoryGift {
  giftId: string;
  tokenId: string;
  campaignId: string;
  status: 'created' | 'viewed' | 'claimed';
  creator: string;
  claimer?: string;
  value: number;
  createdAt: string;
  claimedAt?: string;
  educationScore?: number;
}

interface MemoryCampaign {
  id: string;
  name: string;
  owner: string;
  gifts: MemoryGift[];
}

// Global memory store
let memoryCampaigns: Map<string, MemoryCampaign> = new Map();

export function addMemoryGift(gift: MemoryGift) {
  if (!memoryCampaigns.has(gift.campaignId)) {
    memoryCampaigns.set(gift.campaignId, {
      id: gift.campaignId,
      name: `Campaign ${gift.campaignId.slice(0, 10)}`,
      owner: gift.creator,
      gifts: []
    });
  }

  const campaign = memoryCampaigns.get(gift.campaignId)!;

  // Remove existing gift with same ID and add updated version
  campaign.gifts = campaign.gifts.filter(g => g.giftId !== gift.giftId);
  campaign.gifts.push(gift);
}

export function getMemoryStats() {
  const campaigns = Array.from(memoryCampaigns.values());

  return campaigns.map(campaign => {
    const gifts = campaign.gifts;
    const created = gifts.length;
    const viewed = gifts.filter(g => g.status === 'viewed' || g.status === 'claimed').length;
    const claimed = gifts.filter(g => g.status === 'claimed').length;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      createdAt: new Date().toISOString(),
      owner: campaign.owner,
      totalGifts: created,
      status: {
        created,
        viewed,
        preClaimStarted: viewed,
        educationCompleted: claimed,
        claimed,
        expired: 0,
        returned: 0
      },
      conversionRate: created > 0 ? (claimed / created) * 100 : 0,
      avgClaimTime: 0,
      totalValue: gifts.reduce((sum, g) => sum + g.value, 0),
      topReferrers: []
    };
  });
}

export function clearMemoryData() {
  memoryCampaigns.clear();
}

export function getMemoryStatus() {
  return {
    totalCampaigns: memoryCampaigns.size,
    totalGifts: Array.from(memoryCampaigns.values()).reduce((sum, c) => sum + c.gifts.length, 0),
    campaigns: Array.from(memoryCampaigns.keys())
  };
}