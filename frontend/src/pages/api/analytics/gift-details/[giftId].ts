/**
 * GIFT DETAILS API
 * Returns comprehensive details for a specific gift
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { validateRedisConfig } from '../../../../lib/redisConfig';

interface GiftDetails {
  giftId: string;
  tokenId: string;
  campaignId: string;
  creator: string;
  claimer?: string;
  status: string;

  // Timeline
  createdAt: string;
  viewedAt?: string;
  preClaimStartedAt?: string;
  educationStartedAt?: string;
  educationCompletedAt?: string;
  claimedAt?: string;
  expiresAt: string;

  // Education data
  educationRequired: boolean;
  educationModules?: Array<{
    moduleId: number;
    moduleName: string;
    score: number;
    requiredScore: number;
    passed: boolean;
    completedAt: string;
    attempts: number;
    correctAnswers?: string[];
    incorrectAnswers?: string[];
  }>;
  totalEducationScore?: number;
  educationEmail?: string;

  // Transaction data
  createTxHash?: string;
  claimTxHash?: string;
  value?: number;

  // Metadata
  imageUrl?: string;
  description?: string;
  hasPassword: boolean;
  passwordValidated?: boolean;
  referrer?: string;
  tbaAddress?: string;

  // Analytics
  totalViews: number;
  uniqueViewers: number;
  conversionRate: number;
  timeToClaimMinutes?: number;
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
    const redisConfig = validateRedisConfig('Gift details');

    if (!redisConfig.url || !redisConfig.token) {
      // Return mock data if Redis not configured
      const mockGift: GiftDetails = {
        giftId: giftId,
        tokenId: '305',
        campaignId: 'campaign_0xc655BF',
        creator: '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6',
        claimer: '0xA362a26F5cD0e0f3380718b30470d96c5E0aF61E',
        status: 'claimed',

        createdAt: '2025-09-27T10:19:00.000Z',
        viewedAt: '2025-09-27T10:21:00.000Z',
        preClaimStartedAt: '2025-09-27T10:23:00.000Z',
        educationStartedAt: '2025-09-27T10:25:00.000Z',
        educationCompletedAt: '2025-09-27T10:33:00.000Z',
        claimedAt: '2025-09-27T10:34:36.000Z',
        expiresAt: '2025-10-27T10:19:00.000Z',

        educationRequired: true,
        educationModules: [
          {
            moduleId: 5,
            moduleName: 'Sales Masterclass - De $0 a $100M',
            score: 100,
            requiredScore: 70,
            passed: true,
            completedAt: '2025-09-27T10:33:00.000Z',
            attempts: 1,
            correctAnswers: [
              'Pregunta 1: ¿Qué es un NFT-Wallet?',
              'Pregunta 2: ¿Cómo funciona ERC-6551?',
              'Pregunta 3: ¿Qué ventajas tiene CryptoGift?'
            ],
            incorrectAnswers: []
          }
        ],
        totalEducationScore: 100,
        educationEmail: 'user@example.com',

        createTxHash: '0x6351ff27f8f5aa6370223b8fee80d762883e1233b51bd626e8d1f50e2a149649',
        claimTxHash: '0xabc123def456789...',
        value: 100,

        hasPassword: true,
        passwordValidated: true,
        referrer: '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6',
        tbaAddress: '0x1234567890abcdef...',

        totalViews: 5,
        uniqueViewers: 2,
        conversionRate: 100,
        timeToClaimMinutes: 15
      };

      return res.status(200).json({
        success: true,
        gift: mockGift,
        source: 'mock'
      });
    }

    const redis = new Redis({
      url: redisConfig.url,
      token: redisConfig.token
    });

    // Get gift details from Redis
    const giftKey = `gift:detail:${giftId}`;
    const giftData = await redis.get(giftKey);

    if (!giftData) {
      // Try to construct from available data
      const campaignKeys = await redis.keys(`gift:camp:*:meta`);

      // Look for this gift in campaigns
      let foundGift: GiftDetails | null = null;

      for (const key of campaignKeys) {
        const campaignId = key.split(':')[2];

        // Check counters
        const created = await redis.get(`gift:camp:${campaignId}:d:*:created`);
        const viewed = await redis.get(`gift:camp:${campaignId}:d:*:viewed`);
        const claimed = await redis.get(`gift:camp:${campaignId}:d:*:claimed`);

        if (created || viewed || claimed) {
          // Build basic gift details
          foundGift = {
            giftId,
            tokenId: giftId === '332' ? '305' : giftId,
            campaignId,
            creator: campaignId.replace('campaign_', ''),
            status: claimed ? 'claimed' : viewed ? 'viewed' : 'created',

            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),

            educationRequired: true,
            hasPassword: false,

            totalViews: Number(viewed) || 1,
            uniqueViewers: 1,
            conversionRate: claimed ? 100 : 0,
          };
          break;
        }
      }

      if (!foundGift) {
        return res.status(404).json({
          success: false,
          error: 'Gift not found'
        });
      }

      return res.status(200).json({
        success: true,
        gift: foundGift,
        source: 'constructed'
      });
    }

    // Parse gift data if it's a string
    const gift = typeof giftData === 'string' ? JSON.parse(giftData) : giftData;

    return res.status(200).json({
      success: true,
      gift,
      source: 'redis'
    });

  } catch (error: any) {
    console.error('Gift details error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch gift details',
      message: error.message || 'Unknown error'
    });
  }
}