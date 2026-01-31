/**
 * 🔐 Escrow API Endpoint
 *
 * Handles escrow operations for CryptoGift transactions.
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
    total?: number;
    page?: number;
    limit?: number;
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
 * GET /api/v1/escrow
 * List escrow transactions for a wallet
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<EscrowTransaction[]>>> {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet') || getWalletAddress(request);
  const status = searchParams.get('status') as EscrowTransaction['status'] | null;
  const limit = parseInt(searchParams.get('limit') || '20');
  const page = parseInt(searchParams.get('page') || '1');

  if (!wallet) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_WALLET',
          message: 'Wallet address is required',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 400 }
    );
  }

  // Get escrow transactions (placeholder - integrate with contract/database)
  const transactions: EscrowTransaction[] = [];

  // Filter by status if provided
  const filtered = status ? transactions.filter((t) => t.status === status) : transactions;

  return NextResponse.json({
    success: true,
    data: filtered,
    meta: {
      timestamp: new Date().toISOString(),
      total: filtered.length,
      page,
      limit,
    },
  });
}

/**
 * POST /api/v1/escrow
 * Create a new escrow transaction
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<EscrowTransaction>>> {
  // Validate API key for internal calls
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
    const { sender_address, recipient_address, amount, token_address, message, expires_in_days } = body;

    if (!sender_address || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Sender address and amount are required',
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // Create escrow transaction (placeholder - integrate with contract)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 30));

    const transaction: EscrowTransaction = {
      id: `escrow-${Date.now()}`,
      sender_address: sender_address.toLowerCase(),
      recipient_address: recipient_address?.toLowerCase(),
      amount,
      token_address,
      status: 'pending',
      gift_code: `GIFT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      message,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: transaction,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201 }
    );
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
