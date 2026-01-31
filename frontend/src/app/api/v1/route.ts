/**
 * 🌐 API v1 Root Endpoint
 *
 * Returns service information and available endpoints.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    service: 'CryptoGift Wallets',
    version: 'v1',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/v1/health',
      wallets: '/api/v1/wallets',
      competitions: '/api/v1/competitions',
      escrow: '/api/v1/escrow',
      notifications: '/api/v1/notifications',
    },
    documentation: 'https://docs.gifts.mbxarts.com/api',
  });
}
