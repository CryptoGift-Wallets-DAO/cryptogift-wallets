/**
 * TIME SERIES ANALYTICS API
 * Fetches time series data for gift analytics charts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getTimeSeries } from '../../../lib/giftAnalytics';
import { verifyJWT, extractTokenFromHeaders } from '../../../lib/siweAuth';

interface TimeSeriesRequest {
  campaignId: string;
  metric: 'created' | 'viewed' | 'preClaimStarted' | 'educationCompleted' | 'claimed' | 'expired' | 'returned';
  from?: string;
  to?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    // Parse request parameters
    const params: TimeSeriesRequest = req.method === 'GET' ? req.query : req.body;

    const {
      campaignId,
      metric,
      from,
      to
    } = params;

    // Validate required parameters
    if (!campaignId || !metric) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'campaignId and metric are required'
      });
    }

    // Fetch time series data from Redis
    console.log('📊 Fetching time series:', { campaignId, metric, from, to });

    const data = await getTimeSeries(
      campaignId,
      metric as any,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );

    // Return time series data
    return res.status(200).json({
      success: true,
      campaignId,
      metric,
      data,
      totalPoints: data.length,
      from: from || 'beginning',
      to: to || 'now',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📊 Time series API error:', error);

    return res.status(500).json({
      error: 'Failed to fetch time series data',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}