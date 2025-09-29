/**
 * LOCAL ANALYTICS STORE
 *
 * Fallback storage for analytics when Redis is not available.
 * Uses in-memory storage for server-side and localStorage for client-side.
 * This ensures analytics ALWAYS work, even without Redis.
 */

interface StoredGift {
  giftId: string;
  tokenId: string;
  campaignId: string;
  status: string;
  creator?: string;
  claimer?: string;
  value?: number;
  createdAt: number;
  claimedAt?: number;
  viewedAt?: number;
  educationCompletedAt?: number;
  metadata?: any;
}

interface StoredCampaign {
  campaignId: string;
  campaignName: string;
  totalGifts: number;
  claimed: number;
  viewed: number;
  expired: number;
  totalValue: number;
}

// Server-side in-memory storage
let memoryStore: {
  gifts: Map<string, StoredGift>;
  campaigns: Map<string, StoredCampaign>;
  events: Array<any>;
} = {
  gifts: new Map(),
  campaigns: new Map(),
  events: []
};

/**
 * Store a gift in local storage
 */
export function storeGiftLocally(gift: StoredGift): void {
  // Server-side storage
  if (typeof window === 'undefined') {
    memoryStore.gifts.set(gift.giftId, gift);

    // Update campaign stats
    const campaign = memoryStore.campaigns.get(gift.campaignId) || {
      campaignId: gift.campaignId,
      campaignName: `Campaign ${gift.campaignId}`,
      totalGifts: 0,
      claimed: 0,
      viewed: 0,
      expired: 0,
      totalValue: 0
    };

    campaign.totalGifts++;
    if (gift.status === 'claimed') campaign.claimed++;
    if (gift.status === 'viewed') campaign.viewed++;
    if (gift.value) campaign.totalValue += gift.value;

    memoryStore.campaigns.set(gift.campaignId, campaign);

    // Store event
    memoryStore.events.push({
      type: `Gift${gift.status.charAt(0).toUpperCase() + gift.status.slice(1)}`,
      giftId: gift.giftId,
      timestamp: Date.now(),
      data: gift
    });

    console.log(`📊 Gift ${gift.giftId} stored locally (server memory)`);
  }
  // Client-side storage
  else {
    try {
      const stored = localStorage.getItem('cryptogift_analytics') || '{}';
      const data = JSON.parse(stored);

      if (!data.gifts) data.gifts = {};
      data.gifts[gift.giftId] = gift;

      if (!data.campaigns) data.campaigns = {};
      const campaign = data.campaigns[gift.campaignId] || {
        campaignId: gift.campaignId,
        totalGifts: 0,
        claimed: 0,
        viewed: 0,
        totalValue: 0
      };

      campaign.totalGifts++;
      if (gift.status === 'claimed') campaign.claimed++;
      if (gift.status === 'viewed') campaign.viewed++;
      if (gift.value) campaign.totalValue += gift.value;

      data.campaigns[gift.campaignId] = campaign;

      localStorage.setItem('cryptogift_analytics', JSON.stringify(data));
      console.log(`📊 Gift ${gift.giftId} stored locally (browser storage)`);
    } catch (error) {
      console.error('Failed to store in localStorage:', error);
    }
  }
}

/**
 * Get all gifts from local storage
 */
export function getLocalGifts(): StoredGift[] {
  // Server-side
  if (typeof window === 'undefined') {
    return Array.from(memoryStore.gifts.values());
  }
  // Client-side
  else {
    try {
      const stored = localStorage.getItem('cryptogift_analytics');
      if (!stored) return [];
      const data = JSON.parse(stored);
      return Object.values(data.gifts || {});
    } catch {
      return [];
    }
  }
}

/**
 * Get all campaigns from local storage
 */
export function getLocalCampaigns(): StoredCampaign[] {
  // Server-side
  if (typeof window === 'undefined') {
    return Array.from(memoryStore.campaigns.values());
  }
  // Client-side
  else {
    try {
      const stored = localStorage.getItem('cryptogift_analytics');
      if (!stored) return [];
      const data = JSON.parse(stored);
      return Object.values(data.campaigns || {});
    } catch {
      return [];
    }
  }
}

/**
 * Get a specific gift from local storage
 */
export function getLocalGift(giftId: string): StoredGift | null {
  // Server-side
  if (typeof window === 'undefined') {
    return memoryStore.gifts.get(giftId) || null;
  }
  // Client-side
  else {
    try {
      const stored = localStorage.getItem('cryptogift_analytics');
      if (!stored) return null;
      const data = JSON.parse(stored);
      return data.gifts?.[giftId] || null;
    } catch {
      return null;
    }
  }
}

/**
 * Update gift status
 */
export function updateGiftStatus(giftId: string, status: string, additionalData?: any): void {
  const gift = getLocalGift(giftId);
  if (gift) {
    gift.status = status;

    if (status === 'claimed' && additionalData?.claimer) {
      gift.claimer = additionalData.claimer;
      gift.claimedAt = Date.now();
    }
    if (status === 'viewed') {
      gift.viewedAt = Date.now();
    }
    if (status === 'educationCompleted') {
      gift.educationCompletedAt = Date.now();
    }

    storeGiftLocally(gift);
  }
}

/**
 * Clear local analytics storage
 */
export function clearLocalAnalytics(): void {
  if (typeof window === 'undefined') {
    memoryStore = {
      gifts: new Map(),
      campaigns: new Map(),
      events: []
    };
  } else {
    localStorage.removeItem('cryptogift_analytics');
  }
}

/**
 * Export analytics data
 */
export function exportLocalAnalytics() {
  return {
    gifts: getLocalGifts(),
    campaigns: getLocalCampaigns(),
    events: typeof window === 'undefined' ? memoryStore.events : [],
    timestamp: new Date().toISOString()
  };
}