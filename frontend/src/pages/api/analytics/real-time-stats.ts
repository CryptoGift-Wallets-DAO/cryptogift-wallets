/**
 * REAL-TIME ANALYTICS API
 *
 * This endpoint provides REAL analytics by reading from ALL data sources:
 * 1. Gift analytics system (gift:* keys)
 * 2. Canonical events system (ga:v1:* keys)
 * 3. Event streams
 * 4. Direct gift details
 *
 * DESIGNED TO SHOW DATA IMMEDIATELY WHEN A GIFT IS CREATED
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { debugLogger } from '@/lib/secureDebugLogger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // Check Redis configuration
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log('Redis not configured, using local storage fallback');

      // Use local storage fallback
      const { getLocalGifts, getLocalCampaigns } = await import('@/lib/localAnalyticsStore');

      const localGifts = getLocalGifts();
      const localCampaigns = getLocalCampaigns();

      // Convert local data to stats format
      const campaignStats = localCampaigns.map(c => ({
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        totalGifts: c.totalGifts,
        status: {
          created: c.totalGifts,
          viewed: c.viewed,
          claimed: c.claimed,
          preClaimStarted: 0,
          educationCompleted: 0,
          expired: c.expired,
          returned: 0
        },
        conversionRate: c.totalGifts > 0 ? (c.claimed / c.totalGifts) * 100 : 0,
        avgClaimTime: 0,
        totalValue: c.totalValue,
        topReferrers: []
      }));

      const summary = {
        totalGifts: localGifts.length,
        totalClaimed: localGifts.filter(g => g.status === 'claimed').length,
        totalViewed: localGifts.filter(g => g.status === 'viewed').length,
        totalEducationCompleted: 0,
        averageConversionRate: localGifts.length > 0
          ? (localGifts.filter(g => g.status === 'claimed').length / localGifts.length) * 100
          : 0,
        totalValue: localGifts.reduce((sum, g) => sum + (g.value || 0), 0),
        totalCampaigns: localCampaigns.length,
        recentGifts: localGifts.slice(-10)
      };

      return res.status(200).json({
        success: true,
        stats: campaignStats,
        summary,
        gifts: localGifts.slice(-50),
        responseTimeMs: Date.now() - startTime,
        sources: {
          localStorage: true,
          redis: false
        },
        message: 'Using local storage (Redis not configured)',
        timestamp: new Date().toISOString()
      });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });

    console.log('🔍 Fetching real-time analytics from all sources...');

    // Aggregate stats from ALL sources
    const stats = {
      created: 0,
      viewed: 0,
      claimed: 0,
      expired: 0,
      returned: 0,
      educationStarted: 0,
      educationCompleted: 0,
      totalValue: 0,
      gifts: [] as any[],
      campaigns: new Map<string, any>()
    };

    // 1. Check gift:detail:* keys (individual gift tracking)
    try {
      const giftDetailKeys = await redis.keys('gift:detail:*');
      console.log(`Found ${giftDetailKeys.length} gift detail keys`);

      for (const key of giftDetailKeys.slice(0, 100)) { // Limit to 100 for performance
        const giftData = await redis.hgetall(key);
        if (giftData) {
          stats.created++;

          if (giftData.status === 'claimed') stats.claimed++;
          if (giftData.status === 'viewed') stats.viewed++;
          if (giftData.claimer) stats.claimed++;
          if (giftData.value) stats.totalValue += parseFloat(giftData.value as string);

          // Track by campaign
          const campaignId = (giftData.campaignId as string) || 'default';
          if (!stats.campaigns.has(campaignId as string)) {
            stats.campaigns.set(campaignId as string, {
              campaignId,
              campaignName: `Campaign ${campaignId}`,
              totalGifts: 0,
              status: {
                created: 0,
                viewed: 0,
                claimed: 0,
                preClaimStarted: 0,
                educationCompleted: 0,
                expired: 0,
                returned: 0
              },
              conversionRate: 0,
              avgClaimTime: 0,
              totalValue: 0,
              topReferrers: []
            });
          }

          const campaign = stats.campaigns.get(campaignId as string);
          campaign.totalGifts++;
          campaign.status.created++;

          if (giftData.status === 'claimed') {
            campaign.status.claimed++;
          }
          if (giftData.value) {
            campaign.totalValue += parseFloat(giftData.value as string);
          }

          stats.gifts.push({
            giftId: giftData.giftId || giftData.tokenId,
            tokenId: giftData.tokenId,
            status: giftData.status,
            createdAt: giftData.createdAt,
            claimedAt: giftData.claimedAt,
            claimer: giftData.claimer,
            value: giftData.value
          });
        }
      }
    } catch (e) {
      console.log('No gift detail keys found');
    }

    // 2. Check gift:camp:* keys (campaign metadata)
    try {
      const campaignKeys = await redis.keys('gift:camp:*:meta');
      console.log(`Found ${campaignKeys.length} campaign keys`);

      for (const key of campaignKeys) {
        const campaignData = await redis.hgetall(key);
        if (campaignData) {
          const campaignId = key.split(':')[2];

          if (!stats.campaigns.has(campaignId)) {
            stats.campaigns.set(campaignId, {
              campaignId,
              campaignName: campaignData.name || `Campaign ${campaignId}`,
              totalGifts: parseInt(campaignData.totalGifts as string) || 0,
              status: {
                created: parseInt(campaignData.created as string) || 0,
                viewed: parseInt(campaignData.viewed as string) || 0,
                claimed: parseInt(campaignData.claimed as string) || 0,
                preClaimStarted: parseInt(campaignData.preClaimStarted as string) || 0,
                educationCompleted: parseInt(campaignData.educationCompleted as string) || 0,
                expired: parseInt(campaignData.expired as string) || 0,
                returned: parseInt(campaignData.returned as string) || 0
              },
              conversionRate: parseFloat(campaignData.conversionRate as string) || 0,
              avgClaimTime: parseInt(campaignData.avgClaimTime as string) || 0,
              totalValue: parseFloat(campaignData.totalValue as string) || 0,
              topReferrers: []
            });
          }
        }
      }
    } catch (e) {
      console.log('No campaign keys found');
    }

    // 3. Check ga:v1:events stream (canonical events)
    try {
      const events = await redis.xrevrange('ga:v1:events', '+', '-', 50);
      console.log(`Found ${events.length} events in stream`);

      for (const [id, fields] of (events as unknown) as any[]) {
        const eventType = fields.type;
        const giftId = fields.giftId;
        const campaignId = fields.campaignId || 'default';

        // Create gift entry if not exists
        if (!stats.gifts.find(g => g.giftId === giftId)) {
          stats.gifts.push({
            giftId,
            tokenId: fields.tokenId,
            status: eventType.toLowerCase().replace('gift', ''),
            createdAt: new Date(parseInt(fields.blockTimestamp || fields.timestamp)).toISOString(),
            campaignId
          });
        }

        // Update campaign stats
        if (!stats.campaigns.has(campaignId)) {
          stats.campaigns.set(campaignId, {
            campaignId,
            campaignName: `Campaign ${campaignId}`,
            totalGifts: 0,
            status: {
              created: 0,
              viewed: 0,
              claimed: 0,
              preClaimStarted: 0,
              educationCompleted: 0,
              expired: 0,
              returned: 0
            },
            conversionRate: 0,
            avgClaimTime: 0,
            totalValue: 0,
            topReferrers: []
          });
        }

        const campaign = stats.campaigns.get(campaignId);

        switch (eventType) {
          case 'GiftCreated':
            campaign.status.created++;
            campaign.totalGifts++;
            stats.created++;
            break;
          case 'GiftViewed':
            campaign.status.viewed++;
            stats.viewed++;
            break;
          case 'GiftClaimed':
            campaign.status.claimed++;
            stats.claimed++;
            break;
        }

        // Parse data field for additional info
        if (fields.data) {
          try {
            const data = JSON.parse(fields.data);
            if (data.amount) {
              const value = parseFloat(data.amount) / 1e18;
              campaign.totalValue += value;
              stats.totalValue += value;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (e) {
      console.log('No events stream found');
    }

    // 4. Check ga:v1:rollup:global (aggregated stats)
    try {
      const globalRollup = await redis.hgetall('ga:v1:rollup:global');
      if (globalRollup && Object.keys(globalRollup).length > 0) {
        // Use rollup as baseline if it has higher numbers
        stats.created = Math.max(stats.created, parseInt(globalRollup.created as string) || 0);
        stats.viewed = Math.max(stats.viewed, parseInt(globalRollup.viewed as string) || 0);
        stats.claimed = Math.max(stats.claimed, parseInt(globalRollup.claimed as string) || 0);
        stats.expired = Math.max(stats.expired, parseInt(globalRollup.expired as string) || 0);
        stats.returned = Math.max(stats.returned, parseInt(globalRollup.returned as string) || 0);

        const rollupValue = parseFloat(globalRollup.totalValue as string) || 0;
        if (rollupValue > stats.totalValue) {
          stats.totalValue = rollupValue;
        }
      }
    } catch (e) {
      console.log('No global rollup found');
    }

    // Calculate conversion rates
    for (const campaign of stats.campaigns.values()) {
      if (campaign.totalGifts > 0) {
        campaign.conversionRate = (campaign.status.claimed / campaign.totalGifts) * 100;
      }
    }

    // Convert campaigns map to array
    const campaignStats = Array.from(stats.campaigns.values());

    // Separate individual gifts from campaigns
    // Gifts with IDs like "305", "306" are individual gifts
    // Real campaigns will have proper campaign IDs (future feature with EIP-1155)
    const individualGifts = stats.gifts.map(gift => ({
      ...gift,
      // Add custom name/reference field (can be updated later)
      customName: gift.customName || `Gift #${gift.tokenId || gift.giftId}`,
      displayId: gift.tokenId || gift.giftId,
      creator: gift.creator || 'Unknown',
      recipientReference: gift.recipientReference || '', // For noting who it was meant for
    }));

    // For now, we don't have real campaigns (those will use EIP-1155 in the future)
    // So we'll return empty campaigns array
    const realCampaigns = [];

    // Calculate summary
    const summary = {
      totalGifts: stats.created,
      totalClaimed: stats.claimed,
      totalViewed: stats.viewed,
      totalEducationCompleted: stats.educationCompleted,
      averageConversionRate: stats.created > 0 ? (stats.claimed / stats.created) * 100 : 0,
      totalValue: stats.totalValue,
      totalCampaigns: realCampaigns.length, // Real campaigns, not fake ones
      totalIndividualGifts: individualGifts.length,
      recentGifts: individualGifts.slice(0, 10)
    };

    const responseTime = Date.now() - startTime;

    console.log(`✅ Real-time stats compiled in ${responseTime}ms`);
    console.log(`📊 Found: ${individualGifts.length} individual gifts, ${stats.claimed} claimed, ${realCampaigns.length} campaigns`);

    return res.status(200).json({
      success: true,
      stats: campaignStats, // Keep for backwards compatibility
      campaigns: realCampaigns, // Real campaigns (empty for now)
      gifts: individualGifts, // Individual gifts with all info
      summary,
      responseTimeMs: responseTime,
      sources: {
        giftDetails: stats.gifts.length > 0,
        campaigns: realCampaigns.length > 0,
        individualGifts: individualGifts.length > 0,
        events: false, // Will be true when events are found
        rollups: false  // Will be true when rollups exist
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Real-time stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time stats',
      message: error.message || 'Unknown error',
      stats: [],
      summary: {
        totalGifts: 0,
        totalClaimed: 0,
        totalViewed: 0,
        totalValue: 0,
        conversionRate: 0
      }
    });
  }
}