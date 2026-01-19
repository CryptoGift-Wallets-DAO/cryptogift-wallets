/**
 * API: Submit Vote
 * POST /api/competition/[id]/vote
 *
 * Allows judges to vote on competition resolution
 * REQUIERE AUTENTICACIÓN SIWE - El juez debe estar autenticado con su wallet
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { Competition, Vote, TransparencyEvent } from '../../../../competencias/types';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';
import { emitVoteCast, emitCompetitionResolved } from '../../../../competencias/lib/eventSystem';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface VoteRequest {
  vote: string;
  comment?: string;
  signature?: string;
  // NOTA: judgeAddress viene del token JWT autenticado (no del body)
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
    const judgeAddress = getAuthenticatedAddress(req);

    const data = req.body as VoteRequest;

    // Validate vote value
    if (!data.vote) {
      return res.status(400).json({ error: 'Vote is required' });
    }

    // Get competition
    const competitionData = await redis.get(`competition:${id}`);
    if (!competitionData) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    const competition: Competition = typeof competitionData === 'string'
      ? JSON.parse(competitionData)
      : competitionData;

    // Validate competition status
    if (competition.status !== 'resolving' && competition.status !== 'active') {
      return res.status(400).json({ error: 'Competition is not in voting phase' });
    }

    // Validate judge authorization - CRÍTICO: verificar que el usuario autenticado es juez
    const judge = competition.arbitration?.judges?.find(
      j => j.address.toLowerCase() === judgeAddress.toLowerCase()
    );
    if (!judge) {
      return res.status(403).json({
        error: 'Not authorized to vote on this competition',
        code: 'NOT_JUDGE',
        message: `Address ${judgeAddress} is not a judge for this competition`,
      });
    }

    // Check if already voted
    const existingVote = competition.arbitration?.votes?.find(
      v => v.judge.toLowerCase() === judgeAddress.toLowerCase()
    );
    if (existingVote) {
      return res.status(400).json({ error: 'Already voted on this competition' });
    }

    // Create vote
    const vote: Vote = {
      id: uuidv4(),
      competitionId: id,
      judge: judgeAddress,
      vote: data.vote,
      comment: data.comment,
      timestamp: Date.now(),
      weight: judge.reputation || 1,
    };

    // Update competition
    if (!competition.arbitration) {
      competition.arbitration = {
        method: 'multisig_panel',
        judges: [],
        votingThreshold: 66,
        votes: [],
      };
    }
    competition.arbitration.votes = [...(competition.arbitration.votes || []), vote];

    // Calculate voting progress
    const totalJudges = competition.arbitration.judges?.filter(j =>
      j.role === 'arbiter' || j.role === 'reviewer' || j.role === 'verifier'
    ).length || 1;
    const votedCount = competition.arbitration.votes.length;
    const threshold = competition.arbitration.votingThreshold || 66;
    const requiredVotes = Math.ceil((totalJudges * threshold) / 100);

    // Check if threshold reached
    const approvalVotes = competition.arbitration.votes.filter(
      v => v.vote === 'approve' || v.vote === 'yes'
    ).length;
    const rejectionVotes = competition.arbitration.votes.filter(
      v => v.vote === 'reject' || v.vote === 'no'
    ).length;

    let resolutionReached = false;
    let outcome: string | undefined;

    if (approvalVotes >= requiredVotes) {
      resolutionReached = true;
      outcome = 'approved';
    } else if (rejectionVotes >= requiredVotes) {
      resolutionReached = true;
      outcome = 'rejected';
    }

    // If resolution reached, update status
    if (resolutionReached && outcome) {
      competition.status = 'completed';
      // Update resolution through arbitration state
      if (competition.arbitration) {
        competition.arbitration.votingStatus = 'completed';
      }
    }

    // Create transparency event
    const event: TransparencyEvent = {
      type: 'vote_submitted',
      timestamp: Date.now(),
      actor: judgeAddress,
      action: `Vote: ${data.vote}`,
      details: {
        voteId: vote.id,
        vote: data.vote,
        votedCount,
        requiredVotes,
        resolutionReached,
        outcome,
      },
      verified: !!data.signature,
    };

    if (!competition.transparency) {
      competition.transparency = { events: [], lastUpdated: Date.now(), verifiedCount: 0 };
    }
    competition.transparency.events.unshift(event);

    // Store updated competition
    await redis.set(`competition:${id}`, JSON.stringify(competition));

    // Store vote separately
    await redis.lpush(`competition:${id}:votes`, JSON.stringify(vote));

    // Store event
    await redis.lpush(`competition:${id}:events`, JSON.stringify(event));

    // Emit SSE events for real-time updates
    emitVoteCast(id, judgeAddress, data.vote, judge.reputation || 1);

    // If resolution reached, emit resolution event
    if (resolutionReached && outcome) {
      emitCompetitionResolved(id, outcome, judgeAddress);
    }

    return res.status(200).json({
      success: true,
      data: {
        vote,
        votingProgress: {
          voted: votedCount,
          required: requiredVotes,
          total: totalJudges,
          approvals: approvalVotes,
          rejections: rejectionVotes,
        },
        resolutionReached,
        outcome,
      },
    });
  } catch (error) {
    console.error('Submit vote error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to submit vote',
    });
  }
}

// Exportar con middleware de autenticación
export default withAuth(handler);
