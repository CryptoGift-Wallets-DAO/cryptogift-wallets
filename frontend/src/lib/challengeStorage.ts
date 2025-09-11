/**
 * Challenge Storage System
 * Secure storage for SIWE challenges with Redis and fallback
 * Uses timeout protection to prevent Vercel hanging issues
 */

import { Redis } from '@upstash/redis';
import { SiweChallenge, CHALLENGE_EXPIRY } from './siweAuth';

// Initialize Redis with Vercel-optimized configuration
let redis: any = null;
let redisStatus: 'connected' | 'fallback' | 'error' = 'fallback';

// Initialize Redis immediately on module load
try {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (redisUrl && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
      enableAutoPipelining: false, // Disable pipelining to prevent hanging in Vercel
      retry: false, // CRITICAL: Disable retry to prevent hanging in serverless functions
    });
    redisStatus = 'connected';
    console.log('✅ Redis client initialized for SIWE challenges (will test on first use)');
  } else {
    redisStatus = 'fallback';
    console.warn('⚠️ PRODUCTION WARNING: Redis not configured for SIWE challenges');
    console.warn('   - UPSTASH_REDIS_REST_URL:', redisUrl ? 'CONFIGURED' : 'MISSING');
    console.warn('   - UPSTASH_REDIS_REST_TOKEN:', redisToken ? 'CONFIGURED' : 'MISSING');
    console.warn('   - SIWE challenges will use memory-only storage');
    console.warn('   - Challenges will be lost on server restart');
  }
} catch (error) {
  redis = null;
  redisStatus = 'error';
  console.error('❌ CRITICAL: Redis initialization failed for SIWE challenges:', error);
  console.warn('   - Falling back to memory-only storage with limited security');
}

// Helper function to wrap Redis operations with timeout protection
async function redisWithTimeout<T>(operation: Promise<T>, timeoutMs: number = 3000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs)
  );
  
  return Promise.race([operation, timeoutPromise]);
}

// Fallback in-memory store when Redis is not available
const challengeStore = new Map<string, SiweChallenge>();

/**
 * Get Redis connection status for monitoring
 */
export function getRedisStatus(): { status: string; message: string; hasRedis: boolean } {
  switch (redisStatus) {
    case 'connected':
      return {
        status: 'connected',
        message: 'Redis connected successfully',
        hasRedis: true
      };
    case 'fallback':
      return {
        status: 'fallback',
        message: 'Redis not configured - using memory fallback (production risk)',
        hasRedis: false
      };
    case 'error':
      return {
        status: 'error',
        message: 'Redis connection failed - using memory fallback (security risk)',
        hasRedis: false
      };
  }
}

/**
 * Store SIWE challenge securely
 */
export async function storeChallenge(nonce: string, challenge: SiweChallenge): Promise<void> {
  const key = `siwe_challenge:${nonce}`;
  
  console.log('🔄 Attempting to store SIWE challenge:', {
    nonce: nonce.slice(0, 10) + '...',
    address: challenge.address.slice(0, 10) + '...',
    redisStatus,
    hasRedis: !!redis
  });
  
  if (redis && redisStatus === 'connected') {
    try {
      // Store in Redis with TTL
      const ttlSeconds = Math.floor(CHALLENGE_EXPIRY / 1000);
      const result = await redisWithTimeout(
        redis.setex(key, ttlSeconds, JSON.stringify(challenge))
      );
      
      console.log('📝 SIWE challenge stored in Redis successfully:', {
        nonce: nonce.slice(0, 10) + '...',
        address: challenge.address.slice(0, 10) + '...',
        ttl: ttlSeconds + 's',
        redisResult: result
      });
      
      // Verify the storage by immediately retrieving it
      const verification = await redisWithTimeout(redis.get(key));
      if (verification) {
        console.log('✅ Challenge storage verified in Redis');
        return;
      } else {
        console.error('❌ Challenge storage verification failed - not found immediately after storage');
        throw new Error('Challenge storage verification failed');
      }
    } catch (redisError) {
      console.error('❌ Redis challenge storage failed:', redisError);
      // Don't disable redis permanently, just fall back for this request
      redisStatus = 'error';
    }
  }
  
  // Fallback to in-memory storage
  challengeStore.set(nonce, challenge);
  
  // Clean up expired challenges in memory
  setTimeout(() => {
    challengeStore.delete(nonce);
  }, CHALLENGE_EXPIRY);
  
  console.log('📝 SIWE challenge stored in memory (fallback):', {
    nonce: nonce.slice(0, 10) + '...',
    address: challenge.address.slice(0, 10) + '...'
  });
}

/**
 * Retrieve and validate SIWE challenge
 */
export async function getChallenge(nonce: string): Promise<SiweChallenge | null> {
  const key = `siwe_challenge:${nonce}`;
  
  console.log('🔍 Attempting to retrieve SIWE challenge:', {
    nonce: nonce.slice(0, 10) + '...',
    redisStatus,
    hasRedis: !!redis
  });
  
  if (redis && redisStatus !== 'error') {
    try {
      const stored = await redisWithTimeout(redis.get(key));
      
      console.log('🔍 Redis get result:', {
        nonce: nonce.slice(0, 10) + '...',
        found: !!stored,
        type: typeof stored,
        redisStatus
      });
      
      if (stored) {
        // Upstash Redis automatically parses JSON, so handle both string and object responses
        const challenge = typeof stored === 'string' ? JSON.parse(stored) : stored as SiweChallenge;
        
        // Validate expiration
        if (Date.now() - challenge.timestamp > CHALLENGE_EXPIRY) {
          console.log('⏰ SIWE challenge expired (Redis):', nonce.slice(0, 10) + '...');
          await redisWithTimeout(redis.del(key)); // Clean up expired challenge
          return null;
        }
        
        console.log('✅ SIWE challenge retrieved from Redis:', {
          nonce: nonce.slice(0, 10) + '...',
          address: challenge.address.slice(0, 10) + '...',
          age: Math.floor((Date.now() - challenge.timestamp) / 1000) + 's'
        });
        
        return challenge;
      }
    } catch (redisError) {
      console.error('❌ Redis challenge retrieval failed:', redisError);
      console.log('🔄 Falling back to memory storage for this request');
      // Mark redis as having errors but don't disable it completely
      redisStatus = 'error';
    }
  }
  
  // Fallback to in-memory storage
  const challenge = challengeStore.get(nonce);
  
  if (challenge) {
    // Validate expiration
    if (Date.now() - challenge.timestamp > CHALLENGE_EXPIRY) {
      console.log('⏰ SIWE challenge expired (memory):', nonce.slice(0, 10) + '...');
      challengeStore.delete(nonce);
      return null;
    }
    
    console.log('✅ SIWE challenge retrieved from memory (fallback):', {
      nonce: nonce.slice(0, 10) + '...',
      address: challenge.address.slice(0, 10) + '...',
      age: Math.floor((Date.now() - challenge.timestamp) / 1000) + 's'
    });
    
    return challenge;
  }
  
  console.log('❌ SIWE challenge not found:', nonce.slice(0, 10) + '...');
  return null;
}

/**
 * Remove SIWE challenge after successful verification
 */
export async function removeChallenge(nonce: string): Promise<void> {
  const key = `siwe_challenge:${nonce}`;
  
  if (redis) {
    try {
      await redisWithTimeout(redis.del(key));
      console.log('🗑️ SIWE challenge removed from Redis:', nonce.slice(0, 10) + '...');
      return;
    } catch (redisError) {
      console.warn('⚠️ Redis challenge removal failed:', redisError);
    }
  }
  
  // Fallback to in-memory storage
  const removed = challengeStore.delete(nonce);
  if (removed) {
    console.log('🗑️ SIWE challenge removed from memory (fallback):', nonce.slice(0, 10) + '...');
  }
}

/**
 * Clean up expired challenges (maintenance function)
 */
export async function cleanupExpiredChallenges(): Promise<void> {
  const now = Date.now();
  
  // Clean up in-memory challenges
  for (const [nonce, challenge] of challengeStore.entries()) {
    if (now - challenge.timestamp > CHALLENGE_EXPIRY) {
      challengeStore.delete(nonce);
      console.log('🧹 Cleaned up expired challenge from memory:', nonce.slice(0, 10) + '...');
    }
  }
  
  console.log('🧹 Challenge cleanup completed. Active challenges:', challengeStore.size);
}