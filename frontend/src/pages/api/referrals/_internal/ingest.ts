import type { NextApiRequest, NextApiResponse } from 'next';
import { recordGiftEvent, type GiftEvent } from '@/lib/giftAnalytics';
import { debugLogger } from '@/lib/secureDebugLogger';

/**
 * POST /api/referrals/_internal/ingest
 * 
 * Internal endpoint for recording gift events
 * Called by business logic flows (mint, claim, expire, etc.)
 * Protected by internal secret
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check feature flag
  const analyticsEnabled = process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true' ||
                          process.env.FEATURE_ANALYTICS === 'true';

  if (!analyticsEnabled) {
    // Silently accept but don't process when disabled
    return res.status(200).json({ success: true, processed: false });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify internal secret
    const internalSecret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    
    if (!expectedSecret || internalSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Parse and validate event
    const event: GiftEvent = req.body;
    
    if (!event.eventId || !event.type || !event.campaignId || !event.giftId) {
      return res.status(400).json({ 
        error: 'Invalid event data',
        missing: ['eventId', 'type', 'campaignId', 'giftId'].filter(f => !event[f as keyof GiftEvent])
      });
    }
    
    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    
    debugLogger.operation('Ingesting gift event', {
      eventId: event.eventId,
      type: event.type,
      campaignId: event.campaignId,
      giftId: event.giftId
    });
    
    // Record the event
    const recorded = await recordGiftEvent(event);
    
    if (!recorded) {
      // Event was duplicate (already processed)
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Event already processed'
      });
    }
    
    res.status(200).json({
      success: true,
      duplicate: false,
      message: 'Event recorded successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error ingesting event:', error);
    debugLogger.error('Event ingestion error', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to ingest event',
      message: error.message
    });
  }
}