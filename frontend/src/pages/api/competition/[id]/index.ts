/**
 * API: Get/Update Competition
 * GET/PUT /api/competition/[id]
 *
 * Retrieves or updates a competition by ID
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { Competition, TransparencyEvent } from '../../../../competencias/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Competition ID is required' });
  }

  if (req.method === 'GET') {
    return handleGet(id, req, res);
  } else if (req.method === 'PUT') {
    return handlePut(id, req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = await redis.get(`competition:${id}`);

    if (!data) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    const competition = typeof data === 'string' ? JSON.parse(data) : data;

    // Optionally include related data
    const { include } = req.query;
    const includeOptions = typeof include === 'string' ? include.split(',') : [];

    const response: {
      competition: Competition;
      votes?: unknown[];
      bets?: unknown[];
      events?: TransparencyEvent[];
    } = { competition };

    if (includeOptions.includes('votes')) {
      const votes = await redis.lrange(`competition:${id}:votes`, 0, -1);
      response.votes = votes.map(v => typeof v === 'string' ? JSON.parse(v) : v);
    }

    if (includeOptions.includes('bets')) {
      const bets = await redis.lrange(`competition:${id}:bets`, 0, -1);
      response.bets = bets.map(b => typeof b === 'string' ? JSON.parse(b) : b);
    }

    if (includeOptions.includes('events')) {
      const events = await redis.lrange(`competition:${id}:events`, 0, 100);
      response.events = events.map(e => typeof e === 'string' ? JSON.parse(e) : e);
    }

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get competition error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get competition',
    });
  }
}

async function handlePut(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const existing = await redis.get(`competition:${id}`);

    if (!existing) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    const competition = typeof existing === 'string' ? JSON.parse(existing) : existing;
    const updates = req.body;

    // Validate caller is authorized (creator or judge)
    const { callerAddress } = updates;
    if (callerAddress) {
      const isCreator = competition.creator?.address === callerAddress;
      const isJudge = competition.arbitration?.judges?.some(
        (j: { address: string }) => j.address === callerAddress
      );

      if (!isCreator && !isJudge) {
        return res.status(403).json({ error: 'Not authorized to update this competition' });
      }
    }

    // Apply allowed updates
    const allowedFields = [
      'title',
      'description',
      'status',
      'timeline',
      'rules',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        competition[field] = updates[field];
      }
    }

    // Add update event
    const updateEvent: TransparencyEvent = {
      type: 'status_changed',
      timestamp: Date.now(),
      actor: callerAddress || 'system',
      action: 'Competition updated',
      details: { updatedFields: Object.keys(updates) },
      verified: true,
    };

    if (!competition.transparency) {
      competition.transparency = { events: [], publicData: true, auditLog: true };
    }
    competition.transparency.events.unshift(updateEvent);

    // Store updated competition
    await redis.set(`competition:${id}`, JSON.stringify(competition));

    // Store event separately for efficient querying
    await redis.lpush(`competition:${id}:events`, JSON.stringify(updateEvent));

    return res.status(200).json({
      success: true,
      data: { competition },
    });
  } catch (error) {
    console.error('Update competition error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update competition',
    });
  }
}
