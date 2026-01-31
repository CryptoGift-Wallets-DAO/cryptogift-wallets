/**
 * 🏆 Competition Detail API Endpoint
 *
 * Handles operations for a specific competition.
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
  leaderboard?: LeaderboardEntry[];
  created_at: string;
  updated_at?: string;
}

interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  score: number;
  prizes?: string;
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
 * GET /api/v1/competitions/[id]
 * Get competition details with leaderboard
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Competition>>> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Competition ID is required',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 400 }
    );
  }

  // Get competition (placeholder - integrate with actual data source)
  const competition: Competition = {
    id,
    title: 'CryptoGift Launch Competition',
    description: 'Celebrate the launch of CryptoGift with amazing prizes!',
    prize_pool: '10000 CGC',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    participants_count: 0,
    leaderboard: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: competition,
    meta: { timestamp: new Date().toISOString() },
  });
}
