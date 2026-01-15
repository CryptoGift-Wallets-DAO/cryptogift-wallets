/**
 * API: Join Competition
 * POST /api/competition/[id]/join
 *
 * Allows a user to join a competition
 * REQUIERE AUTENTICACIÓN SIWE
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { Competition, ParticipantEntry, TransparencyEvent } from '../../../../competencias/types';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface JoinRequest {
  position?: string; // For prediction markets
  teamId?: string; // For team competitions
  metadata?: Record<string, unknown>;
  txHash?: string;
  // NOTA: participantAddress viene del token JWT autenticado
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Competition ID is required' });
  }

  try {
    // Obtener dirección autenticada del token JWT (seguro, no manipulable)
    const participantAddress = getAuthenticatedAddress(req);

    const data = req.body as JoinRequest;

    // Get competition
    const competitionData = await redis.get(`competition:${id}`);
    if (!competitionData) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    const competition: Competition = typeof competitionData === 'string'
      ? JSON.parse(competitionData)
      : competitionData;

    // Validate competition status
    if (competition.status !== 'active' && competition.status !== 'pending') {
      return res.status(400).json({ error: 'Competition is not accepting participants' });
    }

    // Check if already joined
    const existingEntry = competition.participants?.entries?.find(
      e => e.address === participantAddress
    );
    if (existingEntry) {
      return res.status(400).json({ error: 'Already joined this competition' });
    }

    // Check max participants
    if (
      competition.participants?.maxParticipants &&
      (competition.participants.current || 0) >= competition.participants.maxParticipants
    ) {
      return res.status(400).json({ error: 'Competition is full' });
    }

    // Create participant entry
    const entry: ParticipantEntry = {
      id: uuidv4(),
      address: participantAddress,
      position: data.position,
      joinedAt: new Date().toISOString(),
      status: 'active',
      score: 0,
    };

    // Update competition
    if (!competition.participants) {
      competition.participants = {
        current: 0,
        entries: [],
      };
    }
    competition.participants.current = (competition.participants.current || 0) + 1;
    competition.participants.entries = [...(competition.participants.entries || []), entry];

    // Create transparency event
    const event: TransparencyEvent = {
      type: 'participant_joined',
      timestamp: Date.now(),
      actor: participantAddress,
      action: 'Joined competition',
      details: {
        participantId: entry.id,
        position: data.position,
        currentParticipants: competition.participants.current,
      },
      txHash: data.txHash,
      verified: !!data.txHash,
    };

    if (!competition.transparency) {
      competition.transparency = { events: [], publicData: true, auditLog: true };
    }
    competition.transparency.events.unshift(event);

    // Store updated competition
    await redis.set(`competition:${id}`, JSON.stringify(competition));

    // Store event
    await redis.lpush(`competition:${id}:events`, JSON.stringify(event));

    // Add to user's competitions
    await redis.sadd(`user:${participantAddress}:joined`, id);

    return res.status(200).json({
      success: true,
      data: {
        entry,
        participantCount: competition.participants.current,
      },
    });
  } catch (error) {
    console.error('Join competition error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to join competition',
    });
  }
}

// Exportar con middleware de autenticación
export default withAuth(handler);
