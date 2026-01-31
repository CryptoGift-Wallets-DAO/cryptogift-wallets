/**
 * 🏥 Health Check Endpoint
 *
 * Returns service health status for monitoring and load balancers.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    cache: 'ok' | 'error';
    blockchain: 'ok' | 'error';
  };
}

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthCheck>> {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Basic health checks (can be extended with real checks)
  const checks = {
    database: 'ok' as const,
    cache: 'ok' as const,
    blockchain: 'ok' as const,
  };

  const allHealthy = Object.values(checks).every((v) => v === 'ok');

  return NextResponse.json({
    service: 'CryptoGift Wallets',
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime,
    checks,
  });
}
