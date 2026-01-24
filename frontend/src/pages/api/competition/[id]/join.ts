/**
 * API: Join Competition
 * POST /api/competition/[id]/join
 *
 * Allows a user to join a competition
 * REQUIERE AUTENTICACIÓN SIWE
 *
 * Uses atomic Redis operations to prevent race conditions:
 * - Prevents double-join (same user joining twice)
 * - Prevents overselling (joining full competition)
 * - Ensures accurate participant count
 *
 * VOTING LOGIC (Issue #1 - Implemented):
 * ========================================
 * Participants are automatically added as judges with role 'participant_judge':
 * - All competitors can vote on winners
 * - If they don't vote, their vote defaults to themselves (implicit self-vote)
 * - See /api/competition/[id]/vote.ts for full voting logic
 *
 * CHAIN: Base Mainnet (8453) - PRODUCCIÓN
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { Competition, ParticipantEntry, TransparencyEvent } from '../../../../competencias/types';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';
import { atomicJoinCompetition } from '../../../../competencias/lib/atomicOperations';
import { emitParticipantJoined } from '../../../../competencias/lib/eventSystem';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface JoinRequest {
  position?: string; // For prediction markets
  teamId?: string; // For team competitions
  amount?: string; // Wei amount for entry
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

    // CRITICAL: Normalize address to lowercase for consistent comparison
    const normalizedAddress = participantAddress.toLowerCase();

    // Create participant entry
    const entry: ParticipantEntry = {
      address: normalizedAddress, // Always lowercase for consistent matching
      position: data.position || 'participant',
      amount: data.amount || '0',
      joinedAt: Date.now(),
    };

    // Create transparency event
    const event: TransparencyEvent = {
      type: 'participant_joined',
      timestamp: Date.now(),
      actor: normalizedAddress,
      action: 'Joined competition',
      details: {
        participantAddress: normalizedAddress,
        position: data.position,
      },
      txHash: data.txHash,
      verified: !!data.txHash,
    };

    // Execute atomic join operation
    // This prevents race conditions by:
    // 1. Reading competition state
    // 2. Validating all conditions
    // 3. Updating atomically
    // All in a single Redis transaction
    const result = await atomicJoinCompetition(
      id,
      participantAddress,
      entry,
      event
    );

    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        INVALID_STATUS: 400,
        ALREADY_JOINED: 400,
        FULL: 400,
        SCRIPT_ERROR: 500,
      };

      const status = statusMap[result.code || ''] || 400;
      return res.status(status).json({
        error: result.error,
        code: result.code,
      });
    }

    // VOTING LOGIC: Add participant as judge (participants are judges by default)
    // This allows all competitors to vote on winners
    try {
      const compData = await redis.get(`competition:${id}`);
      if (compData) {
        const competition: Competition = typeof compData === 'string'
          ? JSON.parse(compData)
          : compData;

        // Initialize arbitration if needed
        if (!competition.arbitration) {
          competition.arbitration = {
            method: 'multisig_panel',
            judges: [],
            votingThreshold: 51, // Simple majority for participant voting
            votes: [],
          };
        }

        // Check if already a judge (use normalizedAddress for consistent comparison)
        const isAlreadyJudge = competition.arbitration.judges?.some(
          (j: { address: string }) => j.address.toLowerCase() === normalizedAddress
        );

        if (!isAlreadyJudge) {
          // Add participant as a judge with 'participant_judge' role
          // This allows all competitors to vote on winners
          const participantJudge = {
            address: normalizedAddress, // Always lowercase for consistent matching
            role: 'participant_judge' as const,
            reputation: 1,
          };

          competition.arbitration.judges = [
            ...(competition.arbitration.judges || []),
            participantJudge,
          ];

          // Save updated competition
          await redis.set(`competition:${id}`, JSON.stringify(competition));
          console.log(`Added participant ${normalizedAddress.slice(0, 10)}... as judge for competition ${id}`);
        }
      }
    } catch (judgeError) {
      // Log but don't fail the join if adding as judge fails
      console.error('Failed to add participant as judge:', judgeError);
    }

    // Emit SSE event for real-time updates
    emitParticipantJoined(
      id,
      normalizedAddress,
      data.amount ? Number(data.amount) / 1e18 : undefined
    );

    return res.status(200).json({
      success: true,
      data: result.data,
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
