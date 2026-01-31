/**
 * 🏆 Competitions API Endpoint
 *
 * Handles competition-related operations for the CryptoGift platform.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// =============================================================================
// TYPES
// =============================================================================

interface Competition {
  id: string;
  title: string;
  description: string;
  prize_pool: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'ended';
  participants_count: number;
  rules?: string;
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

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/v1/competitions
 * List competitions with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Competition[]>>> {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as Competition['status'] | null;
  const limit = parseInt(searchParams.get('limit') || '10');
  const page = parseInt(searchParams.get('page') || '1');

  // Placeholder competitions (integrate with actual data source)
  const competitions: Competition[] = [
    {
      id: 'comp-1',
      title: 'CryptoGift Launch Competition',
      description: 'Celebrate the launch of CryptoGift with amazing prizes!',
      prize_pool: '10000 CGC',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      participants_count: 0,
      created_at: new Date().toISOString(),
    },
  ];

  // Filter by status if provided
  const filtered = status ? competitions.filter((c) => c.status === status) : competitions;

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
 * POST /api/v1/competitions
 * Create a new competition (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Competition>>> {
  // Validate internal API key
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
    const { title, description, prize_pool, start_date, end_date, rules } = body;

    if (!title || !description || !prize_pool) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Title, description, and prize_pool are required',
          },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // Create competition (placeholder - integrate with actual data source)
    const competition: Competition = {
      id: `comp-${Date.now()}`,
      title,
      description,
      prize_pool,
      start_date: start_date || new Date().toISOString(),
      end_date: end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      participants_count: 0,
      rules,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: competition,
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
