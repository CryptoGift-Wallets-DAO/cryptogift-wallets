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
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ParticipantEntry, TransparencyEvent } from '../../../../competencias/types';
import { withAuth, getAuthenticatedAddress } from '../../../../competencias/lib/authMiddleware';
import { atomicJoinCompetition } from '../../../../competencias/lib/atomicOperations';
import { emitParticipantJoined } from '../../../../competencias/lib/eventSystem';

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

    // Create participant entry
    const entry: ParticipantEntry = {
      address: participantAddress,
      position: data.position || 'participant',
      amount: data.amount || '0',
      joinedAt: Date.now(),
    };

    // Create transparency event
    const event: TransparencyEvent = {
      type: 'participant_joined',
      timestamp: Date.now(),
      actor: participantAddress,
      action: 'Joined competition',
      details: {
        participantAddress: entry.address,
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

    // Emit SSE event for real-time updates
    emitParticipantJoined(
      id,
      participantAddress,
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
