/**
 * API: List Competitions
 * GET /api/competition/list
 *
 * Lists competitions with filtering and pagination
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { Competition, CompetitionCategory, CompetitionStatus } from '../../../competencias/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface ListQuery {
  category?: CompetitionCategory;
  status?: CompetitionStatus;
  creator?: string;
  participant?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'prizePool' | 'participants' | 'ending';
  sortOrder?: 'asc' | 'desc';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      category,
      status,
      creator,
      participant,
      limit = '20',
      offset = '0',
      sortBy = 'created',
      sortOrder = 'desc',
    } = req.query as Record<string, string>;

    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    let competitionIds: string[] = [];

    // Determine which set to query
    if (category) {
      // Filter by category
      competitionIds = await redis.smembers(`competitions:${category}`);
    } else if (creator) {
      // Filter by creator
      competitionIds = await redis.smembers(`user:${creator}:competitions`);
    } else if (participant) {
      // Filter by participant
      competitionIds = await redis.smembers(`user:${participant}:joined`);
    } else {
      // Get all competitions (sorted by creation time)
      const allIds = await redis.zrange('competitions:all', 0, -1, {
        rev: sortOrder === 'desc',
      });
      competitionIds = allIds as string[];
    }

    // Fetch competition data
    const competitions: Competition[] = [];
    for (const id of competitionIds) {
      const data = await redis.get(`competition:${id}`);
      if (data) {
        const competition = typeof data === 'string' ? JSON.parse(data) : data;

        // Apply status filter
        if (status && competition.status !== status) {
          continue;
        }

        competitions.push(competition);
      }
    }

    // Sort competitions
    competitions.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'prizePool':
          comparison = (a.prizePool?.total || 0) - (b.prizePool?.total || 0);
          break;
        case 'participants':
          comparison = (a.participants?.current || 0) - (b.participants?.current || 0);
          break;
        case 'ending':
          const aEnd = a.timeline?.endsAt ? new Date(a.timeline.endsAt).getTime() : Infinity;
          const bEnd = b.timeline?.endsAt ? new Date(b.timeline.endsAt).getTime() : Infinity;
          comparison = aEnd - bEnd;
          break;
        case 'created':
        default:
          const aCreated = a.timeline?.createdAt ? new Date(a.timeline.createdAt).getTime() : 0;
          const bCreated = b.timeline?.createdAt ? new Date(b.timeline.createdAt).getTime() : 0;
          comparison = aCreated - bCreated;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const paginatedCompetitions = competitions.slice(offsetNum, offsetNum + limitNum);

    // Calculate stats
    const stats = {
      total: competitions.length,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      totalPrizePool: 0,
    };

    for (const comp of competitions) {
      // By status
      const s = comp.status || 'unknown';
      stats.byStatus[s] = (stats.byStatus[s] || 0) + 1;

      // By category
      const c = comp.category || 'unknown';
      stats.byCategory[c] = (stats.byCategory[c] || 0) + 1;

      // Total prize pool
      stats.totalPrizePool += comp.prizePool?.total || 0;
    }

    return res.status(200).json({
      success: true,
      data: {
        competitions: paginatedCompetitions,
        pagination: {
          total: competitions.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < competitions.length,
        },
        stats,
      },
    });
  } catch (error) {
    console.error('List competitions error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list competitions',
    });
  }
}
