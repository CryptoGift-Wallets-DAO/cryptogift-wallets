/**
 * 🔔 Notifications API Endpoint
 *
 * Handles notification operations for wallets.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// =============================================================================
// TYPES
// =============================================================================

interface Notification {
  id: string;
  wallet_address: string;
  type: 'gift_received' | 'gift_claimed' | 'competition' | 'referral' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
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
    unread?: number;
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
 * GET /api/v1/notifications
 * Get notifications for a wallet
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Notification[]>>> {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet') || getWalletAddress(request);
  const unreadOnly = searchParams.get('unread') === 'true';

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

  // Get notifications (placeholder - integrate with database)
  const notifications: Notification[] = [];

  const filtered = unreadOnly ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({
    success: true,
    data: filtered,
    meta: {
      timestamp: new Date().toISOString(),
      total: filtered.length,
      unread: unreadCount,
    },
  });
}

/**
 * POST /api/v1/notifications
 * Send a notification to a wallet (internal use)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Notification>>> {
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
    const { wallet_address, type, title, message, data } = body;

    if (!wallet_address || !type || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'wallet_address, type, title, and message are required',
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // Create notification (placeholder - integrate with database/push service)
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      wallet_address: wallet_address.toLowerCase(),
      type,
      title,
      message,
      read: false,
      data,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: notification,
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
