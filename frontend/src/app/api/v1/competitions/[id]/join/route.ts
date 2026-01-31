/**
 * 🏆 Competition Join API Endpoint
 *
 * Allows wallets to join a competition.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// =============================================================================
// TYPES
// =============================================================================

interface JoinResult {
  competition_id: string;
  wallet_address: string;
  joined_at: string;
  position: number;
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
// HELPERS
// =============================================================================

function getWalletAddress(request: NextRequest): string | null {
  return request.headers.get('X-Wallet-Address');
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * POST /api/v1/competitions/[id]/join
 * Join a competition
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<JoinResult>>> {
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const walletAddress = body.wallet_address || getWalletAddress(request);

    if (!walletAddress || !isValidAddress(walletAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_WALLET',
            message: 'Valid wallet address is required',
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // Join competition (placeholder - integrate with actual data source)
    const result: JoinResult = {
      competition_id: id,
      wallet_address: walletAddress.toLowerCase(),
      joined_at: new Date().toISOString(),
      position: 1, // Placeholder
    };

    return NextResponse.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Invalid request body',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 400 }
    );
  }
}
