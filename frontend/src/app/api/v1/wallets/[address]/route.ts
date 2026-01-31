/**
 * 💼 Wallet Detail API Endpoint
 *
 * Handles operations for a specific wallet address.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// =============================================================================
// TYPES
// =============================================================================

interface WalletDetail {
  address: string;
  chainId: number;
  balance?: string;
  nfts?: number;
  gifts_sent?: number;
  gifts_received?: number;
  created_at?: string;
  updated_at?: string;
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

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/v1/wallets/[address]
 * Get detailed wallet information
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<WalletDetail>>> {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid Ethereum address format',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 400 }
    );
  }

  // Get wallet details (placeholder - integrate with actual data source)
  const walletDetail: WalletDetail = {
    address: address.toLowerCase(),
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'),
    gifts_sent: 0,
    gifts_received: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: walletDetail,
    meta: { timestamp: new Date().toISOString() },
  });
}
