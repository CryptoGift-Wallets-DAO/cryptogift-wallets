/**
 * API Rate Limiter
 * Token bucket algorithm with Redis backend
 */

import { headers } from 'next/headers';

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Max requests per interval
  keyPrefix?: string; // Redis key prefix
  bypassToken?: string; // Token to bypass rate limiting
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// Default configurations
export const RATE_LIMITS = {
  // General API
  api: {
    interval: 60000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'rl:api',
  },
  
  // Authentication
  auth: {
    interval: 300000, // 5 minutes
    maxRequests: 10,
    keyPrefix: 'rl:auth',
  },
  
  // Wallet operations
  wallet: {
    interval: 60000, // 1 minute
    maxRequests: 30,
    keyPrefix: 'rl:wallet',
  },
  
  // Bridge operations
  bridge: {
    interval: 60000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'rl:bridge',
  },
  
  // On-ramp operations
  onramp: {
    interval: 300000, // 5 minutes
    maxRequests: 5,
    keyPrefix: 'rl:onramp',
  },
  
  // Sensitive operations
  sensitive: {
    interval: 3600000, // 1 hour
    maxRequests: 10,
    keyPrefix: 'rl:sensitive',
  },
};

/**
 * Get client identifier (IP or wallet address)
 */
export async function getClientId(request?: Request): Promise<string> {
  if (!request) {
    // Server component - use headers
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
    return ip;
  }
  
  // API route - extract from request
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  return ip;
}

/**
 * Rate limit implementation using Redis
 */
export async function rateLimit(
  clientId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Check bypass token
  if (config.bypassToken && process.env.RATE_LIMIT_BYPASS_TOKEN === config.bypassToken) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      reset: Date.now() + config.interval,
    };
  }
  
  // Get Redis client
  const redis = await getRedisClient();
  if (!redis) {
    // Redis not available - allow by default (fail open)
    console.warn('[RateLimit] Redis not available, allowing request');
    return {
      allowed: true,
      remaining: config.maxRequests,
      reset: Date.now() + config.interval,
    };
  }
  
  const key = `${config.keyPrefix}:${clientId}`;
  const now = Date.now();
  const windowStart = now - config.interval;
  
  try {
    // Remove old entries
    await redis.zremrangebyscore(key, '-inf', windowStart.toString());
    
    // Count current requests in window
    const count = await redis.zcard(key);
    
    if (count >= config.maxRequests) {
      // Rate limit exceeded
      const oldestEntry = await redis.zrange(key, 0, 0, { withScores: true });
      const oldestTime = oldestEntry?.[1] ? parseInt(oldestEntry[1] as string) : now;
      const reset = oldestTime + config.interval;
      
      return {
        allowed: false,
        remaining: 0,
        reset,
        retryAfter: Math.ceil((reset - now) / 1000),
      };
    }
    
    // Add current request
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(key, Math.ceil(config.interval / 1000));
    
    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      reset: now + config.interval,
    };
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    // Fail open on error
    return {
      allowed: true,
      remaining: config.maxRequests,
      reset: now + config.interval,
    };
  }
}

/**
 * Express-style middleware for rate limiting
 */
export function rateLimitMiddleware(configName: keyof typeof RATE_LIMITS) {
  return async (req: Request): Promise<Response | null> => {
    const config = RATE_LIMITS[configName];
    const clientId = getClientId(req);
    
    const result = await rateLimit(clientId, config);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': result.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
          },
        }
      );
    }
    
    // Add rate limit headers to response
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', result.reset.toString());
    
    return null; // Continue processing
  };
}

/**
 * Get Redis client (lazy loading)
 */
async function getRedisClient() {
  try {
    // Try Upstash Redis
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = await import('@upstash/redis');
      return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    
    // Try Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { Redis } = await import('@upstash/redis');
      return new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    }
    
    return null;
  } catch (error) {
    console.error('[Redis] Connection error:', error);
    return null;
  }
}

/**
 * Circuit breaker for external services
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 120000 // 2 minutes
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      
      // Reset on success
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
        console.error('[CircuitBreaker] Opening circuit after', this.failures, 'failures');
      }
      
      throw error;
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime,
    };
  }
}