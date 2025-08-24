/**
 * Redis Configuration
 * Unified Redis client for all services
 */

import { Redis } from '@upstash/redis';

/**
 * Get Redis connection
 */
export function getRedisConnection(): Redis | null {
  // Try Upstash Redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  
  // Try Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  
  console.warn('[Redis] No Redis configuration found');
  return null;
}

/**
 * Redis client singleton
 */
let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  if (!redisClient) {
    redisClient = getRedisConnection();
  }
  return redisClient;
}

export default getRedis();