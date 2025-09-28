/**
 * GIFT DETAILS API - ENTERPRISE EDITION
 * Returns COMPLETE comprehensive details for a specific gift
 * Includes ALL tracking data: education, emails, wallet, scores, questions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { validateRedisForCriticalOps } from '../../../../lib/redisConfig';
import { getGiftEducationDetails } from '../../../../lib/analytics/educationTracking';
import { debugLogger } from '../../../../lib/secureDebugLogger';

interface GiftDetails {
  // Core Identity
  giftId: string;
  tokenId: string;
  campaignId: string;
  creator: string;
  claimer?: string;
  claimerWallet?: string; // Complete wallet address
  status: 'created' | 'viewed' | 'educationStarted' | 'educationCompleted' | 'claimed' | 'expired' | 'returned';

  // Complete Timeline
  timeline: {
    createdAt: string;
    createdBlockNumber?: string;
    viewedAt?: string;
    preClaimStartedAt?: string;
    educationStartedAt?: string;
    educationCompletedAt?: string;
    claimedAt?: string;
    claimedBlockNumber?: string;
    expiresAt: string;
    expiredAt?: string;
    returnedAt?: string;
  };

  // Complete Education Data
  education?: {
    required: boolean;
    email?: string;
    moduleId: string;
    moduleName: string;
    sessionId?: string;
    totalTimeSpent?: number; // seconds
    score?: number; // percentage
    passed?: boolean;

    // Detailed Question Tracking
    questionsDetail?: Array<{
      questionId: string;
      questionText: string;
      selectedAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      timeSpent: number; // seconds
      attemptNumber: number;
    }>;

    // Summary Statistics
    totalQuestions?: number;
    correctAnswers?: number;
    incorrectAnswers?: number;

    // Engagement Metrics
    videoWatched?: boolean;
    videoWatchTime?: number;
    resourcesViewed?: string[];

    // User Info
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  };

  // Transaction Details
  transactions: {
    createTxHash?: string;
    createGasUsed?: string;
    claimTxHash?: string;
    claimGasUsed?: string;
    value?: number; // in USD or ETH
    tokenAmount?: string;
  };

  // Complete Metadata
  metadata: {
    imageUrl?: string;
    imageCid?: string;
    description?: string;
    hasPassword: boolean;
    passwordValidated?: boolean;
    passwordAttempts?: number;
    referrer?: string;
    tbaAddress?: string; // Token Bound Account
    escrowAddress?: string;
  };

  // Analytics & Performance
  analytics: {
    totalViews: number;
    uniqueViewers: number;
    viewerAddresses?: string[];
    conversionRate: number;
    timeToClaimMinutes?: number;
    educationCompletionRate?: number;
    avgEducationScore?: number;
  };

  // Events History
  events?: Array<{
    eventId: string;
    type: string;
    timestamp: string;
    txHash?: string;
    data?: any;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { giftId } = req.query;

  if (!giftId || typeof giftId !== 'string') {
    return res.status(400).json({ error: 'Invalid gift ID' });
  }

  try {
    // Get Redis instance
    const redis = validateRedisForCriticalOps('Gift details');

    if (!redis) {
      // Return mock data if Redis not configured
      const mockGift: GiftDetails = {
        giftId: giftId,
        tokenId: '305',
        campaignId: 'campaign_0xc655BF',
        creator: '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6',
        claimer: '0xA362a26F5cD0e0f3380718b30470d96c5E0aF61E',
        status: 'claimed',

        timeline: {
          createdAt: '2025-09-27T10:19:00.000Z',
          viewedAt: '2025-09-27T10:21:00.000Z',
          preClaimStartedAt: '2025-09-27T10:23:00.000Z',
          educationStartedAt: '2025-09-27T10:25:00.000Z',
          educationCompletedAt: '2025-09-27T10:33:00.000Z',
          claimedAt: '2025-09-27T10:34:36.000Z',
          expiresAt: '2025-10-27T10:19:00.000Z'
        },

        education: {
          required: true,
          moduleId: '5',
          moduleName: 'Sales Masterclass',
          score: 100,
          passed: true,
          questionsDetail: [
            {
              questionId: 'q1',
              questionText: '¿Qué es un NFT-Wallet?',
              selectedAnswer: 'Una wallet integrada en un NFT',
              correctAnswer: 'Una wallet integrada en un NFT',
              isCorrect: true,
              timeSpent: 10,
              attemptNumber: 1
            }
          ]
        },

        transactions: {
          createTxHash: '0x6351ff27f8f5aa6370223b8fee80d762883e1233b51bd626e8d1f50e2a149649',
          claimTxHash: '0xabc123def456789...',
          value: 100,
          tokenAmount: '0'
        },

        metadata: {
          imageUrl: 'https://example.com/image.png',
          imageCid: 'QmExample...',
          description: 'Mock gift for testing',
          hasPassword: true,
          passwordValidated: true,
          passwordAttempts: 1,
          referrer: '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6',
          tbaAddress: '0x1234567890abcdef...',
          escrowAddress: '0x46175CfC233500DA803841DEef7f2816e7A129E0'
        },

        analytics: {
          totalViews: 5,
          uniqueViewers: 2,
          viewerAddresses: ['0xViewer1...', '0xViewer2...'],
          conversionRate: 100,
          timeToClaimMinutes: 15,
          educationCompletionRate: 100,
          avgEducationScore: 100
        },

        events: []
      };

      return res.status(200).json({
        success: true,
        gift: mockGift,
        source: 'mock'
      });
    }

    // Get comprehensive gift details from multiple sources
    const traceId = `gift-details-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    debugLogger.operation('Fetching comprehensive gift details', { giftId, traceId });

    // Try multiple data sources
    let giftData: any = null;
    let educationData: any = null;
    let eventHistory: any[] = [];

    // 1. Get basic gift data
    const giftKey = `gift:detail:${giftId}`;
    giftData = await redis.get(giftKey);

    // 2. Get education data from tracking system
    try {
      educationData = await getGiftEducationDetails(giftId);
      debugLogger.log('Education data retrieved', { giftId, hasData: !!educationData });
    } catch (error) {
      debugLogger.error('Failed to get education data', error as Error);
    }

    // 3. Get event history from stream
    try {
      const eventsRaw = await redis.xrange(
        'ga:events',
        '-',
        '+',
        100 // Last 100 events max
      );
      const events = (eventsRaw as unknown) as any[];

      // Filter events for this gift
      eventHistory = events
        .filter(([_, fields]: [string, any]) => fields.giftId === giftId)
        .map(([id, fields]: [string, any]) => ({
          eventId: id,
          type: fields.type,
          timestamp: fields.timestamp,
          txHash: fields.transactionHash,
          data: fields.data ? JSON.parse(fields.data) : undefined
        }));
    } catch (error) {
      debugLogger.error('Failed to get event history', error as Error);
    }

    // 4. Get campaign roll-up data
    let campaignData: any = null;
    if (!giftData) {
      // Try to find campaign by scanning
      const campaignKeys = await redis.keys(`ga:rollup:campaign:*`);
      for (const key of campaignKeys) {
        const data = await redis.hgetall(key);
        if (data) {
          campaignData = data;
          break;
        }
      }
    }

    // Build comprehensive gift details from all sources
    if (!giftData && !educationData && eventHistory.length === 0) {
      // No data found - try to construct from campaign data
      if (campaignData) {
        const gift: GiftDetails = {
          giftId,
          tokenId: giftId,
          campaignId: 'unknown',
          creator: 'unknown',
          status: 'created',

          timeline: {
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },

          transactions: {},

          metadata: {
            hasPassword: false
          },

          analytics: {
            totalViews: parseInt(campaignData.viewed || '0'),
            uniqueViewers: parseInt(campaignData.uniqueUsers || '0'),
            conversionRate: parseFloat(campaignData.conversionRate || '0')
          }
        };

        return res.status(200).json({
          success: true,
          gift,
          source: 'campaign_rollup',
          traceId
        });
      }

      // No data at all
      return res.status(404).json({
        success: false,
        error: 'Gift not found',
        traceId,
        hint: 'Run reconciliation to import blockchain data'
      });
    }

    // Construct comprehensive gift details
    const gift: GiftDetails = {
      // Core Identity
      giftId,
      tokenId: giftData?.tokenId || educationData?.tokenId || giftId,
      campaignId: giftData?.campaignId || 'unknown',
      creator: giftData?.creator || giftData?.referrer || 'unknown',
      claimer: educationData?.claimerAddress || giftData?.claimer,
      claimerWallet: educationData?.claimerAddress,
      status: determineStatus(giftData, educationData, eventHistory),

      // Complete Timeline
      timeline: {
        createdAt: giftData?.createdAt || findEventTimestamp(eventHistory, 'GiftCreated') || new Date().toISOString(),
        createdBlockNumber: giftData?.blockNumber,
        viewedAt: findEventTimestamp(eventHistory, 'GiftViewed'),
        preClaimStartedAt: giftData?.preClaimStartedAt,
        educationStartedAt: educationData?.startedAt ? new Date(parseInt(educationData.startedAt)).toISOString() : undefined,
        educationCompletedAt: educationData?.completedAt ? new Date(parseInt(educationData.completedAt)).toISOString() : undefined,
        claimedAt: findEventTimestamp(eventHistory, 'GiftClaimed'),
        claimedBlockNumber: findEventData(eventHistory, 'GiftClaimed', 'blockNumber'),
        expiresAt: giftData?.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        expiredAt: findEventTimestamp(eventHistory, 'GiftExpired'),
        returnedAt: findEventTimestamp(eventHistory, 'GiftReturned')
      },

      // Complete Education Data
      education: educationData ? {
        required: true,
        email: educationData.email || undefined,
        moduleId: educationData.moduleId || '1',
        moduleName: educationData.moduleName || 'Sales Masterclass',
        sessionId: educationData.sessionId,
        totalTimeSpent: parseInt(educationData.totalTimeSpent || '0'),
        score: parseInt(educationData.score || '0'),
        passed: educationData.passed === 'true',

        // Parse questions detail if available
        questionsDetail: educationData.questionsDetail ?
          (typeof educationData.questionsDetail === 'string' ?
            JSON.parse(educationData.questionsDetail) :
            educationData.questionsDetail) : undefined,

        totalQuestions: educationData.totalQuestions,
        correctAnswers: parseInt(educationData.correctAnswers || '0'),
        incorrectAnswers: parseInt(educationData.incorrectAnswers || '0'),

        videoWatched: educationData.videoWatched,
        videoWatchTime: educationData.videoWatchTime,
        resourcesViewed: educationData.resourcesViewed,

        ipAddress: educationData.ipAddress,
        userAgent: educationData.userAgent,
        referrer: educationData.referrer
      } : undefined,

      // Transaction Details
      transactions: {
        createTxHash: giftData?.createTxHash || findEventData(eventHistory, 'GiftCreated', 'transactionHash'),
        claimTxHash: giftData?.claimTxHash || findEventData(eventHistory, 'GiftClaimed', 'transactionHash'),
        value: giftData?.value || campaignData?.totalValue,
        tokenAmount: giftData?.amount
      },

      // Complete Metadata
      metadata: {
        imageUrl: giftData?.imageUrl,
        imageCid: giftData?.imageCid,
        description: giftData?.description,
        hasPassword: giftData?.hasPassword || false,
        passwordValidated: giftData?.passwordValidated,
        passwordAttempts: giftData?.passwordAttempts,
        referrer: giftData?.referrer,
        tbaAddress: giftData?.tbaAddress,
        escrowAddress: giftData?.escrowAddress
      },

      // Analytics & Performance
      analytics: {
        totalViews: giftData?.totalViews || eventHistory.filter(e => e.type === 'GiftViewed').length || 0,
        uniqueViewers: giftData?.uniqueViewers || 1,
        viewerAddresses: giftData?.viewerAddresses,
        conversionRate: calculateConversionRate(giftData, educationData, eventHistory),
        timeToClaimMinutes: 0,
        educationCompletionRate: educationData ? 100 : 0,
        avgEducationScore: educationData?.score ? parseInt(educationData.score) : undefined
      },

      // Events History
      events: eventHistory.length > 0 ? eventHistory : undefined
    };

    debugLogger.operation('Gift details compiled', {
      giftId,
      hasEducation: !!educationData,
      eventCount: eventHistory.length,
      traceId
    });

    // Add performance headers
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('Cache-Control', 'private, max-age=10'); // 10 second cache

    return res.status(200).json({
      success: true,
      gift,
      sources: {
        basic: !!giftData,
        education: !!educationData,
        events: eventHistory.length > 0,
        campaign: !!campaignData
      },
      traceId
    });

  } catch (error: any) {
    const errorTrace = `error-${Date.now()}`;
    console.error('Gift details error:', error);
    debugLogger.error('Gift details failed', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch gift details',
      message: error.message || 'Unknown error',
      trace: errorTrace
    });
  }
}

// Helper functions

function determineStatus(giftData: any, educationData: any, events: any[]): GiftDetails['status'] {
  if (events.find(e => e.type === 'GiftReturned')) return 'returned';
  if (events.find(e => e.type === 'GiftExpired')) return 'expired';
  if (events.find(e => e.type === 'GiftClaimed')) return 'claimed';
  if (educationData?.passed === 'true') return 'educationCompleted';
  if (educationData?.startedAt) return 'educationStarted';
  if (events.find(e => e.type === 'GiftViewed')) return 'viewed';
  return 'created';
}

function findEventTimestamp(events: any[], type: string): string | undefined {
  const event = events.find(e => e.type === type);
  return event ? new Date(parseInt(event.timestamp)).toISOString() : undefined;
}

function findEventData(events: any[], type: string, field: string): any {
  const event = events.find(e => e.type === type);
  return event?.data?.[field];
}

function calculateConversionRate(giftData: any, educationData: any, events: any[]): number {
  const created = events.find(e => e.type === 'GiftCreated');
  const claimed = events.find(e => e.type === 'GiftClaimed');

  if (created && claimed) return 100;
  if (educationData?.passed === 'true') return 75;
  if (educationData?.startedAt) return 50;
  if (events.find(e => e.type === 'GiftViewed')) return 25;
  return 0;
}

function calculateTimeToClaimMinutes(timeline: GiftDetails['timeline']): number | undefined {
  if (!timeline.createdAt || !timeline.claimedAt) return undefined;

  const created = new Date(timeline.createdAt).getTime();
  const claimed = new Date(timeline.claimedAt).getTime();

  return Math.round((claimed - created) / 60000); // Convert to minutes
}