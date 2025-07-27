/**
 * GIFT MAPPING PERSISTENT STORE
 * Stores tokenId → giftId mappings to avoid RPC calls
 * Uses Redis/KV for persistence across serverless invocations
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
let redis: any = null;

try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    console.log('✅ Gift mapping store using Vercel KV with Upstash backend');
  } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('✅ Gift mapping store using direct Upstash Redis');
  } else {
    console.warn('⚠️ No Redis configuration found - gift mappings will use fallback');
  }
} catch (error) {
  console.error('❌ Failed to initialize Redis for gift mappings:', error);
}

// Cache keys
const MAPPING_KEY_PREFIX = 'gift_mapping:';
const REVERSE_MAPPING_KEY_PREFIX = 'reverse_mapping:';

/**
 * Store tokenId → giftId mapping persistently
 * Call this immediately after registerGiftMinted succeeds
 */
export async function storeGiftMapping(tokenId: string | number, giftId: string | number): Promise<boolean> {
  const tokenIdStr = tokenId.toString();
  const giftIdStr = giftId.toString();
  
  try {
    if (!redis) {
      console.warn('⚠️ No Redis client - cannot persist gift mapping');
      return false;
    }

    const mappingKey = `${MAPPING_KEY_PREFIX}${tokenIdStr}`;
    const reverseMappingKey = `${REVERSE_MAPPING_KEY_PREFIX}${giftIdStr}`;
    
    // Store both directions for fast lookups
    await Promise.all([
      redis.set(mappingKey, giftIdStr, { ex: 86400 * 365 }), // 1 year expiry
      redis.set(reverseMappingKey, tokenIdStr, { ex: 86400 * 365 })
    ]);
    
    console.log(`✅ MAPPING STORED: tokenId ${tokenId} → giftId ${giftId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to store gift mapping:', error);
    return false;
  }
}

/**
 * Get giftId from tokenId (persistent lookup)
 * This replaces the expensive RPC event querying
 */
export async function getGiftIdFromMapping(tokenId: string | number): Promise<number | null> {
  const tokenIdStr = tokenId.toString();
  
  try {
    if (!redis) {
      console.warn('⚠️ No Redis client - cannot lookup gift mapping');
      return null;
    }

    const mappingKey = `${MAPPING_KEY_PREFIX}${tokenIdStr}`;
    const giftIdStr = await redis.get(mappingKey);
    
    if (giftIdStr) {
      const giftId = parseInt(giftIdStr);
      console.log(`✅ MAPPING FOUND: tokenId ${tokenId} → giftId ${giftId}`);
      return giftId;
    }
    
    console.log(`❌ MAPPING NOT FOUND: tokenId ${tokenId}`);
    return null;
  } catch (error) {
    console.error('❌ Failed to lookup gift mapping:', error);
    return null;
  }
}

/**
 * Get tokenId from giftId (reverse lookup)
 */
export async function getTokenIdFromMapping(giftId: string | number): Promise<number | null> {
  const giftIdStr = giftId.toString();
  
  try {
    if (!redis) {
      return null;
    }

    const reverseMappingKey = `${REVERSE_MAPPING_KEY_PREFIX}${giftIdStr}`;
    const tokenIdStr = await redis.get(reverseMappingKey);
    
    if (tokenIdStr) {
      const tokenId = parseInt(tokenIdStr);
      console.log(`✅ REVERSE MAPPING FOUND: giftId ${giftId} → tokenId ${tokenId}`);
      return tokenId;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to lookup reverse gift mapping:', error);
    return null;
  }
}

/**
 * Batch store multiple mappings (for migration or bulk operations)
 */
export async function batchStoreGiftMappings(mappings: Array<{ tokenId: string | number; giftId: string | number }>): Promise<number> {
  if (!redis) {
    return 0;
  }

  let stored = 0;
  
  for (const mapping of mappings) {
    const success = await storeGiftMapping(mapping.tokenId, mapping.giftId);
    if (success) stored++;
  }
  
  console.log(`✅ BATCH STORED: ${stored}/${mappings.length} gift mappings`);
  return stored;
}

/**
 * Clear all gift mappings (admin operation)
 */
export async function clearAllGiftMappings(): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    const mappingKeys = await redis.keys(`${MAPPING_KEY_PREFIX}*`);
    const reverseMappingKeys = await redis.keys(`${REVERSE_MAPPING_KEY_PREFIX}*`);
    const allKeys = [...mappingKeys, ...reverseMappingKeys];
    
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
    
    console.log(`✅ CLEARED ${allKeys.length} gift mapping entries`);
    return allKeys.length;
  } catch (error) {
    console.error('❌ Failed to clear gift mappings:', error);
    return 0;
  }
}