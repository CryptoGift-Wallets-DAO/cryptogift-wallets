import { kv } from "@vercel/kv";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetTime: number;
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  try {
    // Get current count
    const currentCount = await kv.get<number>(key) || 0;
    
    if (currentCount >= config.maxRequests) {
      return {
        allowed: false,
        count: currentCount,
        resetTime: windowStart + config.windowMs,
      };
    }
    
    // Increment counter
    const newCount = currentCount + 1;
    await kv.set(key, newCount, { px: config.windowMs });
    
    return {
      allowed: true,
      count: newCount,
      resetTime: windowStart + config.windowMs,
    };
    
  } catch (error) {
    console.error('Rate limit error:', error);
    
    // In case of Redis error, allow the request but log it
    return {
      allowed: true,
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
}

// Common rate limit configurations
export const RATE_LIMITS = {
  MINT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 2,
    keyPrefix: 'mint',
  },
  TRANSFORM: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyPrefix: 'transform',
  },
  SWAP: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'swap',
  },
} as const;

// Helper function to get client identifier
export function getClientIdentifier(req: any): string {
  // Try to get wallet address from request body
  if (req.body?.address) {
    return req.body.address;
  }
  
  // Fallback to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  
  return ip || 'unknown';
}

// Middleware function for API routes
export function withRateLimit(config: RateLimitConfig) {
  return async (req: any, res: any, next: () => void) => {
    const identifier = getClientIdentifier(req);
    const result = await rateLimit(identifier, config);
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        resetTime: result.resetTime,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      });
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', config.maxRequests - result.count);
    res.setHeader('X-RateLimit-Reset', result.resetTime);
    
    next();
  };
}