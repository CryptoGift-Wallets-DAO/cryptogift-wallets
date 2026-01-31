/**
 * 🔐 Escrow Claim API Endpoint
 *
 * Handles claiming an escrow transaction.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// =============================================================================
// TYPES
// =============================================================================

interface ClaimResult {
  escrow_id: string;
  claimed_by: string;
  amount: string;
  claimed_at: string;
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
 * POST /api/v1/escrow/[id]/claim
 * Claim an escrow transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ClaimResult>>> {
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const walletAddress = body.wallet_address || getWalletAddress(request);
    const giftCode = body.gift_code;

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

    if (!giftCode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_CODE',
            message: 'Gift code is required to claim',
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // Claim escrow (placeholder - integrate with contract)
    const result: ClaimResult = {
      escrow_id: id,
      claimed_by: walletAddress.toLowerCase(),
      amount: '0', // Would come from actual escrow
      claimed_at: new Date().toISOString(),
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
