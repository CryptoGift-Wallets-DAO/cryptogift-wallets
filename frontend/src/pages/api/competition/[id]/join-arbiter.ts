/**
 * API: Join Competition as Arbiter/Judge
 * POST /api/competition/[id]/join-arbiter
 *
 * Allows a user to register as a judge for a competition
 * REQUIERE AUTENTICACION SIWE
 *
 * Business Logic:
 * - Anyone can join as a judge during draft/pending phase
 * - When competition is pending, participants are automatically judges too
 * - Judges can vote to determine winners
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { Competition, TransparencyEvent, Judge } from '../../../../competencias/types';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';
import { emitJudgeRegistered } from '../../../../competencias/lib/eventSystem';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface JoinArbiterRequest {
  metadata?: Record<string, unknown>;
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
    // Get authenticated address from JWT (secure, not manipulable)
    const arbiterAddress = getAuthenticatedAddress(req);

    const data = req.body as JoinArbiterRequest;

    // Get competition
    const competitionData = await redis.get(`competition:${id}`);
    if (!competitionData) {
      return res.status(404).json({
        error: 'Competition not found',
        code: 'NOT_FOUND'
      });
    }

    const competition: Competition = typeof competitionData === 'string'
      ? JSON.parse(competitionData)
      : competitionData;

    // Validate competition status - only draft or pending accept new judges
    if (competition.status !== 'draft' && competition.status !== 'pending') {
      return res.status(400).json({
        error: 'Esta competencia ya no acepta nuevos jueces',
        code: 'INVALID_STATUS',
        status: competition.status
      });
    }

    // Check if already a judge
    const existingJudge = competition.arbitration?.judges?.find(
      (j: Judge) => j.address.toLowerCase() === arbiterAddress.toLowerCase()
    );
    if (existingJudge) {
      return res.status(400).json({
        error: 'Ya eres juez de esta competencia',
        code: 'ALREADY_JUDGE'
      });
    }

    // Create judge entry
    const newJudge: Judge = {
      address: arbiterAddress,
      role: 'arbiter',
      reputation: 1,
    };

    // Initialize arbitration if not exists
    if (!competition.arbitration) {
      competition.arbitration = {
        method: 'multisig_panel',
        judges: [],
        votingThreshold: 66,
        votes: [],
      };
    }

    // Add judge to competition
    competition.arbitration.judges = [
      ...(competition.arbitration.judges || []),
      newJudge,
    ];

    // Create transparency event
    const event: TransparencyEvent = {
      type: 'judge_registered',
      timestamp: Date.now(),
      actor: arbiterAddress,
      action: 'Registered as judge',
      details: {
        judgeAddress: arbiterAddress,
        role: 'arbiter',
        totalJudges: competition.arbitration.judges.length,
        metadata: data.metadata,
      },
      verified: true,
    };

    // Update transparency events
    if (!competition.transparency) {
      competition.transparency = {
        events: [],
        lastUpdated: Date.now(),
        verifiedCount: 0,
      };
    }
    competition.transparency.events.unshift(event);
    competition.transparency.lastUpdated = Date.now();

    // Store updated competition
    await redis.set(`competition:${id}`, JSON.stringify(competition));

    // Store event separately for efficient querying
    await redis.lpush(`competition:${id}:events`, JSON.stringify(event));

    // Emit SSE event for real-time updates
    try {
      emitJudgeRegistered(id, arbiterAddress);
    } catch (e) {
      // SSE emit is optional, don't fail the request
      console.warn('SSE emit failed:', e);
    }

    console.log(`Judge registered: ${arbiterAddress} for competition ${id}`);

    return res.status(200).json({
      success: true,
      data: {
        judge: newJudge,
        totalJudges: competition.arbitration.judges.length,
        competition: {
          id: competition.id,
          title: competition.title,
          status: competition.status,
        },
      },
    });
  } catch (error) {
    console.error('Join as arbiter error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to register as judge',
    });
  }
}

// Export with authentication middleware
export default withAuth(handler);
