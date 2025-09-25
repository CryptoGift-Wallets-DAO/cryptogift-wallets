/**
 * Analytics Integration Helper
 * 
 * Provides easy integration points for tracking gift events
 * throughout the application without coupling business logic
 * to analytics implementation
 */

import { recordGiftEvent, initializeCampaign, type GiftEvent } from './giftAnalytics';
import { debugLogger } from './secureDebugLogger';

/**
 * Track gift creation (mint)
 */
export async function trackGiftCreated(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  referrer?: string;
  value?: number;
  txHash?: string;
  metadata?: any;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: params.txHash ? `${params.txHash}-0` : `mint-${params.tokenId}-${Date.now()}`,
      type: 'created',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      referrer: params.referrer,
      value: params.value,
      timestamp: Date.now(),
      txHash: params.txHash,
      metadata: params.metadata
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift created tracked', { tokenId: params.tokenId });
  } catch (error) {
    // Don't fail the main flow if analytics fails
    console.error('Failed to track gift creation:', error);
  }
}

/**
 * Track gift view (landing page)
 */
export async function trackGiftViewed(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  viewerIp?: string;
  metadata?: any;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: `view-${params.tokenId}-${Date.now()}`,
      type: 'viewed',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      timestamp: Date.now(),
      metadata: {
        ...params.metadata,
        viewerIp: params.viewerIp
      }
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift view tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track gift view:', error);
  }
}

/**
 * Track pre-claim started
 */
export async function trackPreClaimStarted(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  claimerAddress?: string;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: `preclaim-${params.tokenId}-${Date.now()}`,
      type: 'preClaim',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      claimer: params.claimerAddress,
      timestamp: Date.now()
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Pre-claim tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track pre-claim:', error);
  }
}

/**
 * Track education completed
 */
export async function trackEducationCompleted(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  claimerAddress?: string;
  educationModules?: string[];
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: `education-${params.tokenId}-${Date.now()}`,
      type: 'education',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      claimer: params.claimerAddress,
      timestamp: Date.now(),
      metadata: {
        modules: params.educationModules
      }
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Education completion tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track education completion:', error);
  }
}

/**
 * Track gift claimed
 */
export async function trackGiftClaimed(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  claimerAddress: string;
  txHash?: string;
  value?: number;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: params.txHash ? `${params.txHash}-0` : `claim-${params.tokenId}-${Date.now()}`,
      type: 'claimed',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      claimer: params.claimerAddress,
      value: params.value,
      timestamp: Date.now(),
      txHash: params.txHash
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift claim tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track gift claim:', error);
  }
}

/**
 * Track gift expired
 */
export async function trackGiftExpired(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  txHash?: string;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: params.txHash ? `${params.txHash}-0` : `expire-${params.tokenId}-${Date.now()}`,
      type: 'expired',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      timestamp: Date.now(),
      txHash: params.txHash
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift expiration tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track gift expiration:', error);
  }
}

/**
 * Track gift returned
 */
export async function trackGiftReturned(params: {
  tokenId: string;
  giftId?: string;
  campaignId?: string;
  returnedTo?: string;
  txHash?: string;
}): Promise<void> {
  try {
    const event: GiftEvent = {
      eventId: params.txHash ? `${params.txHash}-0` : `return-${params.tokenId}-${Date.now()}`,
      type: 'returned',
      campaignId: params.campaignId || 'default',
      giftId: params.giftId || params.tokenId,
      tokenId: params.tokenId,
      timestamp: Date.now(),
      txHash: params.txHash,
      metadata: {
        returnedTo: params.returnedTo
      }
    };
    
    await recordGiftEvent(event);
    debugLogger.operation('Gift return tracked', { tokenId: params.tokenId });
  } catch (error) {
    console.error('Failed to track gift return:', error);
  }
}

/**
 * Initialize a new campaign
 */
export async function trackCampaignCreated(params: {
  campaignId: string;
  name: string;
  owner: string;
  metadata?: any;
}): Promise<void> {
  try {
    await initializeCampaign(params.campaignId, params.name, params.owner);
    debugLogger.operation('Campaign created', { campaignId: params.campaignId });
  } catch (error) {
    console.error('Failed to track campaign creation:', error);
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

/**
 * Send event to internal ingestion API
 * Used for client-side tracking
 */
export async function sendAnalyticsEvent(event: Partial<GiftEvent>): Promise<void> {
  if (!isAnalyticsEnabled()) {
    return;
  }
  
  try {
    const response = await fetch('/api/referrals/_internal/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || ''
      },
      body: JSON.stringify(event)
    });
    
    if (!response.ok) {
      console.error('Failed to send analytics event:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to send analytics event:', error);
  }
}