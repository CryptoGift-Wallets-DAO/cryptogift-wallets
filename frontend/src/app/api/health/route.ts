/**
 * Health Check Endpoint
 * System health and readiness monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductionConfig, getProductionReadiness } from '@/lib/config/production';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const config = getProductionConfig();
    const readiness = getProductionReadiness();
    
    // Check various system components
    const checks = {
      app: await checkApp(),
      database: await checkDatabase(),
      redis: await checkRedis(),
      rpc: await checkRPC(),
      ipfs: await checkIPFS(),
    };
    
    // Calculate overall health
    const healthy = Object.values(checks).every(check => check.status === 'healthy');
    const degraded = Object.values(checks).some(check => check.status === 'degraded');
    
    const response = {
      status: healthy ? 'healthy' : degraded ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      environment: config.environment,
      version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'unknown',
      checks,
      readiness: {
        ready: readiness.ready,
        checks: readiness.checks.map(c => ({
          name: c.name,
          status: c.status ? 'pass' : 'fail',
          required: c.required,
        })),
      },
    };
    
    // Return appropriate status code
    const statusCode = healthy ? 200 : degraded ? 200 : 503;
    
    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Health] Check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}

/**
 * Check app health
 */
async function checkApp(): Promise<HealthCheck> {
  try {
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (heapUsedPercent > 90) {
      return {
        status: 'unhealthy',
        message: 'High memory usage',
        details: { heapUsedPercent },
      };
    }
    
    if (heapUsedPercent > 75) {
      return {
        status: 'degraded',
        message: 'Elevated memory usage',
        details: { heapUsedPercent },
      };
    }
    
    return {
      status: 'healthy',
      message: 'Application running normally',
      details: {
        heapUsedPercent,
        uptime: process.uptime(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Failed to check app health',
      error: (error as Error).message,
    };
  }
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<HealthCheck> {
  try {
    // Database is not used in this project
    // Return healthy status as it's not a required component
    return {
      status: 'healthy',
      message: 'Database not configured (not required)',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database check failed',
      error: (error as Error).message,
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<HealthCheck> {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      return {
        status: 'healthy',
        message: 'Redis not configured',
      };
    }
    
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    const startTime = Date.now();
    await redis.ping();
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 500) {
      return {
        status: 'degraded',
        message: 'Slow Redis response',
        details: { responseTime },
      };
    }
    
    return {
      status: 'healthy',
      message: 'Redis connected',
      details: { responseTime },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Redis connection failed',
      error: (error as Error).message,
    };
  }
}

/**
 * Check RPC health
 */
async function checkRPC(): Promise<HealthCheck> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      return {
        status: 'unhealthy',
        message: 'RPC not configured',
      };
    }
    
    const startTime = Date.now();
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        status: 'unhealthy',
        message: 'RPC request failed',
        details: { status: response.status },
      };
    }
    
    const data = await response.json();
    if (data.error) {
      return {
        status: 'unhealthy',
        message: 'RPC returned error',
        error: data.error.message,
      };
    }
    
    if (responseTime > 2000) {
      return {
        status: 'degraded',
        message: 'Slow RPC response',
        details: { responseTime },
      };
    }
    
    return {
      status: 'healthy',
      message: 'RPC connected',
      details: {
        responseTime,
        blockNumber: parseInt(data.result, 16),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'RPC connection failed',
      error: (error as Error).message,
    };
  }
}

/**
 * Check IPFS health
 */
async function checkIPFS(): Promise<HealthCheck> {
  try {
    const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io';
    
    const startTime = Date.now();
    const response = await fetch(`${ipfsGateway}/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        status: 'degraded',
        message: 'IPFS gateway not responding',
        details: { status: response.status },
      };
    }
    
    if (responseTime > 3000) {
      return {
        status: 'degraded',
        message: 'Slow IPFS response',
        details: { responseTime },
      };
    }
    
    return {
      status: 'healthy',
      message: 'IPFS gateway available',
      details: { responseTime },
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: 'IPFS check failed',
      error: (error as Error).message,
    };
  }
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, any>;
  error?: string;
}