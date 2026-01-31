/**
 * 🔐 Escrow Detail API Endpoint
 *
 * Handles operations for a specific escrow transaction.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// =============================================================================
// TYPES
// =============================================================================

interface EscrowTransaction {
  id: string;
  sender_address: string;
  recipient_address?: string;
  amount: string;
  token_address?: string;
  status: 'pending' | 'claimed' | 'refunded' | 'expired';
  gift_code?: string;
  message?: string;
  created_at: string;
  expires_at: string;
  claimed_at?: string;
  tx_hash?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
  };
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/v1/escrow/[id]
 * Get escrow transaction details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<EscrowTransaction>>> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Escrow ID is required',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 400 }
    );
  }

  // Get escrow details (placeholder - integrate with contract/database)
  // For now, return a 404 as no real data exists
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Escrow transaction not found',
      },
      meta: { timestamp: new Date().toISOString() },
    },
    { status: 404 }
  );
}
