/**
 * REDIS CONFIGURATION - CENTRALIZED & MANDATORY
 * Provides fail-fast Redis configuration for critical production features
 * NO FALLBACKS - Redis is mandatory for production security
 */

import { Redis } from '@upstash/redis';

// Redis connection singleton
let redis: Redis | null = null;
let redisStatus: 'uninitialized' | 'connected' | 'error' | 'missing' = 'uninitialized';
let redisError: string | null = null;

/**
 * Critical Redis environment variables
 */
const REQUIRED_REDIS_VARS = {
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  // Alternative Upstash format
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN
};

/**
 * Initialize Redis connection with fail-fast for production
 */
function initializeRedis(): Redis {
  if (redis && redisStatus === 'connected') {
    return redis;
  }

  try {
    // Try Vercel KV format first (preferred)
    if (REQUIRED_REDIS_VARS.KV_REST_API_URL && REQUIRED_REDIS_VARS.KV_REST_API_TOKEN) {
      redis = new Redis({
        url: REQUIRED_REDIS_VARS.KV_REST_API_URL,
        token: REQUIRED_REDIS_VARS.KV_REST_API_TOKEN,
      });
      redisStatus = 'connected';
      console.log('✅ Redis connected: Vercel KV with Upstash backend');
      return redis;
    }
    
    // Try direct Upstash format
    if (REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_URL && REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_URL,
        token: REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_TOKEN,
      });
      redisStatus = 'connected';
      console.log('✅ Redis connected: Direct Upstash');
      return redis;
    }

    // No valid configuration found
    redisStatus = 'missing';
    redisError = 'Redis configuration missing - no valid environment variables found';
    
    const missingVars = {
      vercelKV: {
        KV_REST_API_URL: !!REQUIRED_REDIS_VARS.KV_REST_API_URL,
        KV_REST_API_TOKEN: !!REQUIRED_REDIS_VARS.KV_REST_API_TOKEN
      },
      upstash: {
        UPSTASH_REDIS_REST_URL: !!REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: !!REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_TOKEN
      }
    };

    console.error('❌ CRITICAL: Redis configuration missing!');
    console.error('📊 Environment variables status:', missingVars);
    console.error('🔧 Required setup:');
    console.error('   1. Go to Vercel Dashboard → Project → Settings → Environment Variables');  
    console.error('   2. Add Redis integration or set variables manually:');
    console.error('      - KV_REST_API_URL=https://your-redis.upstash.io');
    console.error('      - KV_REST_API_TOKEN=your_token_here');
    console.error('   3. Redeploy the application');
    
    throw new Error(`SECURITY CRITICAL: Redis is mandatory for production. Missing environment variables. Status: ${JSON.stringify(missingVars)}`);

  } catch (error) {
    redisStatus = 'error';
    redisError = (error as Error).message;
    console.error('❌ Redis initialization failed:', error);
    throw error;
  }
}

/**
 * Get Redis connection with mandatory validation
 * Throws error if Redis is not available (fail-fast)
 */
export function getRedisConnection(): Redis {
  if (redisStatus === 'connected' && redis) {
    return redis;
  }

  if (redisStatus === 'error' || redisStatus === 'missing') {
    throw new Error(`Redis unavailable: ${redisError}. This feature requires Redis for production security.`);
  }

  return initializeRedis();
}

/**
 * Check if Redis is properly configured (non-throwing)
 */
export function isRedisConfigured(): boolean {
  return !!(
    (REQUIRED_REDIS_VARS.KV_REST_API_URL && REQUIRED_REDIS_VARS.KV_REST_API_TOKEN) ||
    (REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_URL && REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_TOKEN)
  );
}

/**
 * Get Redis status for debugging
 */
export function getRedisStatus(): { 
  status: typeof redisStatus; 
  error: string | null; 
  configured: boolean;
  variables: typeof REQUIRED_REDIS_VARS;
} {
  return {
    status: redisStatus,
    error: redisError,
    configured: isRedisConfigured(),
    variables: {
      KV_REST_API_URL: REQUIRED_REDIS_VARS.KV_REST_API_URL ? 'SET' : 'MISSING',
      KV_REST_API_TOKEN: REQUIRED_REDIS_VARS.KV_REST_API_TOKEN ? 'SET' : 'MISSING',
      UPSTASH_REDIS_REST_URL: REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_URL ? 'SET' : 'MISSING',
      UPSTASH_REDIS_REST_TOKEN: REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_TOKEN ? 'SET' : 'MISSING'
    }
  };
}

/**
 * Validate Redis for critical operations (anti-double minting, mappings)
 * NO FALLBACKS - These operations require Redis for security
 */
export function validateRedisForCriticalOps(operationName: string): Redis {
  if (!isRedisConfigured()) {
    const error = `
🚨 CRITICAL SECURITY REQUIREMENT MISSING 🚨

Operation: ${operationName}
Issue: Redis/KV storage is not configured
Risk: Without Redis, this operation is vulnerable to:
  • Double-minting attacks
  • Race conditions  
  • Data inconsistency
  • Security breaches

IMMEDIATE ACTION REQUIRED:
1. Configure Redis in Vercel Dashboard:
   Settings → Environment Variables → Add Integration → Upstash Redis
   
2. Or manually set:
   KV_REST_API_URL=https://your-redis.upstash.io
   KV_REST_API_TOKEN=your_secure_token
   
3. Redeploy application

This is NOT OPTIONAL for production security.
    `.trim();
    
    console.error(error);
    throw new Error(`Redis mandatory for ${operationName} - security requirement not met`);
  }

  return getRedisConnection();
}

// Initialize Redis on module load for early detection
try {
  if (isRedisConfigured()) {
    initializeRedis();
  } else {
    console.warn('⚠️  Redis not configured - some features will be unavailable');
  }
} catch (error) {
  console.error('❌ Redis initialization error on module load:', (error as Error).message);
}