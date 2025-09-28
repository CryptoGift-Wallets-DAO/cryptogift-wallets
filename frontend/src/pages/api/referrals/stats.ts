import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignStats, getTimeSeries, type AnalyticsFilter } from '@/lib/giftAnalytics';
import { verifyJWT, extractTokenFromHeaders } from '@/lib/siweAuth';
import { debugLogger } from '@/lib/secureDebugLogger';

/**
 * GET /api/referrals/stats
 * 
 * Returns gift analytics statistics with optional filtering
 * Supports campaign filtering, date ranges, and status filtering
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check feature flag
  const analyticsEnabled = process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true' ||
                          process.env.FEATURE_ANALYTICS === 'true';

  if (!analyticsEnabled) {
    // Return 200 with disabled flag to preserve UI compatibility
    return res.status(200).json({
      success: true,
      disabled: true,
      stats: [],
      message: 'Analytics feature is currently disabled'
    });
  }

  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional authentication for private campaigns
    let authenticatedAddress: string | null = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = extractTokenFromHeaders(authHeader);
      if (token) {
        const payload = verifyJWT(token);
        if (payload) {
          authenticatedAddress = payload.address;
        }
      }
    }
    
    // Parse filter from query or body
    const filter: AnalyticsFilter = req.method === 'POST' 
      ? req.body
      : {
          campaignId: req.query.campaignId as string | string[] | undefined,
          from: req.query.from ? new Date(req.query.from as string) : undefined,
          to: req.query.to ? new Date(req.query.to as string) : undefined,
          status: req.query.status as any,
          groupBy: req.query.groupBy as any || 'day',
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
        };
    
    debugLogger.operation('Fetching gift analytics', {
      method: req.method,
      filter,
      authenticated: !!authenticatedAddress
    });
    
    // Get campaign stats
    const stats = await getCampaignStats(filter);
    
    // Filter by owner if authenticated (optional privacy feature)
    const filteredStats = authenticatedAddress 
      ? stats // Could filter by owner here if needed
      : stats.filter(s => !s.campaignName.toLowerCase().includes('private'));
    
    // Get time series for first campaign (or all if requested)
    let timeSeries = [];
    if (filteredStats.length > 0) {
      const campaignId = Array.isArray(filter.campaignId) 
        ? filter.campaignId[0] 
        : filter.campaignId || filteredStats[0].campaignId;
      
      timeSeries = await getTimeSeries(
        campaignId,
        'claimed', // Default metric
        filter.from,
        filter.to
      );
    }
    
    // Calculate summary metrics
    const summary = {
      totalCampaigns: filteredStats.length,
      totalGifts: filteredStats.reduce((sum, s) => sum + s.totalGifts, 0),
      totalClaimed: filteredStats.reduce((sum, s) => sum + s.status.claimed, 0),
      totalValue: filteredStats.reduce((sum, s) => sum + s.totalValue, 0),
      avgConversionRate: filteredStats.length > 0
        ? filteredStats.reduce((sum, s) => sum + s.conversionRate, 0) / filteredStats.length
        : 0
    };
    
    res.status(200).json({
      success: true,
      stats: filteredStats,
      timeSeries,
      summary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    debugLogger.error('Analytics fetch error', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
}