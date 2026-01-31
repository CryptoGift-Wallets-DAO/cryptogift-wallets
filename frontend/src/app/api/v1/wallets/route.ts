/**
 * 💼 Wallets API Endpoint
 *
 * Handles wallet-related operations for the CryptoGift platform.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// =============================================================================
// TYPES
// =============================================================================

interface WalletInfo {
  address: string;
  chainId: number;
  balance?: string;
  nfts?: number;
  created_at?: string;
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

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const internalKey = process.env.INTERNAL_API_KEY || process.env.WALLETS_INTERNAL_API_KEY;

  if (!internalKey) {
    console.warn('⚠️ INTERNAL_API_KEY not configured');
    return false;
  }

  return apiKey === internalKey;
}

function getWalletAddress(request: NextRequest): string | null {
  return request.headers.get('X-Wallet-Address');
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/v1/wallets
 * List wallets or get wallet info
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<WalletInfo | WalletInfo[]>>> {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') || getWalletAddress(request);

  if (!address) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_ADDRESS',
          message: 'Wallet address is required',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 400 }
    );
  }

  // Return wallet info (placeholder - integrate with actual data source)
  const walletInfo: WalletInfo = {
    address: address.toLowerCase(),
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'),
    created_at: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: walletInfo,
    meta: { timestamp: new Date().toISOString() },
  });
}

/**
 * POST /api/v1/wallets
 * Register or update wallet
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<WalletInfo>>> {
  // Validate internal API key for service-to-service calls
  if (!validateApiKey(request)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing API key',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { address, chainId } = body;

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Wallet address is required',
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // Register/update wallet (placeholder - integrate with actual data source)
    const walletInfo: WalletInfo = {
      address: address.toLowerCase(),
      chainId: chainId || parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'),
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: walletInfo,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Invalid JSON body',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 400 }
    );
  }
}
