/**
 * RATE LIMITING SYSTEM - REDIS PERSISTENT
 * Persistent rate limiting for authentication requests using Redis/KV
 * Handles serverless resets and provides TTL persistence
 */

import { validateRedisForCriticalOps } from './redisConfig';

export async function checkRateLimit(userAddress: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5; // 5 requests per minute
  
  try {
    // CRITICAL: Use Redis for persistent rate limiting
    const redis = validateRedisForCriticalOps('Rate limiting');
    const userKey = `rate_limit:auth:${userAddress.toLowerCase()}`;
    
    // Get current rate limit data
    const currentData = await redis.get(userKey);
    let current: { count: number; resetTime: number } | null = null;
    
    if (currentData && typeof currentData === 'string') {
      try {
        current = JSON.parse(currentData);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse rate limit data, resetting:', parseError);
        current = null;
      }
    }
    
    if (!current || now > current.resetTime) {
      // Reset or initialize with new window
      const newData = {
        count: 1,
        resetTime: now + windowMs
      };
      
      // Store in Redis with TTL
      await redis.set(userKey, JSON.stringify(newData), { px: windowMs });
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: newData.resetTime
      };
    }
    
    if (current.count >= maxRequests) {
      console.log(`🚫 RATE LIMIT: User ${userAddress} exceeded ${maxRequests} requests/minute`);
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }
    
    // Increment counter and update Redis
    current.count += 1;
    const ttlRemaining = current.resetTime - now;
    await redis.set(userKey, JSON.stringify(current), { px: Math.max(ttlRemaining, 1000) });
    
    return {
      allowed: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime
    };
    
  } catch (error) {
    console.error('❌ CRITICAL: Rate limiting Redis error:', error);
    
    // FALLBACK: Allow request but log the failure
    // This prevents Redis issues from breaking authentication
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }
}

/**
 * Clean up expired rate limit entries (maintenance function)
 * Redis TTL handles automatic expiration, but this can be used for manual cleanup
 */
export async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    const redis = validateRedisForCriticalOps('Rate limit cleanup');
    
    // Get all rate limit keys
    const keys = await redis.keys('rate_limit:auth:*');
    let expiredCount = 0;
    const now = Date.now();
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data && typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (now > parsed.resetTime) {
            await redis.del(key);
            expiredCount++;
          }
        } catch (parseError) {
          // Remove invalid data
          await redis.del(key);
          expiredCount++;
        }
      }
    }
    
    console.log(`🧹 Rate limit cleanup completed. Removed ${expiredCount} expired entries. Active keys: ${keys.length - expiredCount}`);
    
  } catch (error) {
    console.error('❌ Rate limit cleanup failed:', error);
  }
}