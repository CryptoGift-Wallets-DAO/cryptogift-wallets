/**
 * GIFT MAPPING PERSISTENT STORE - MANDATORY REDIS
 * Stores tokenId → giftId mappings to avoid RPC calls
 * NO FALLBACKS - Redis is mandatory for production security
 */

import { validateRedisForCriticalOps, isRedisConfigured, getRedisStatus } from './redisConfig';

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
    // MANDATORY: Redis is required for mapping storage  
    const redis = validateRedisForCriticalOps('Gift mapping storage');

    const mappingKey = `${MAPPING_KEY_PREFIX}${tokenIdStr}`;
    const reverseMappingKey = `${REVERSE_MAPPING_KEY_PREFIX}${giftIdStr}`;
    
    // Store both directions for fast lookups
    await Promise.all([
      redis.set(mappingKey, giftIdStr, { ex: 86400 * 365 }), // 1 year expiry
      redis.set(reverseMappingKey, tokenIdStr, { ex: 86400 * 365 })
    ]);
    
    console.log(`✅ MAPPING STORED: tokenId ${tokenId} → giftId ${giftId} (Redis)`);
    return true;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to store gift mapping:', error);
    console.error('📊 Redis status:', getRedisStatus());
    throw new Error(`Gift mapping storage failed: ${(error as Error).message}. This is critical for system security.`);
  }
}

/**
 * Get giftId from tokenId (persistent lookup)
 * This replaces the expensive RPC event querying
 */
export async function getGiftIdFromMapping(tokenId: string | number): Promise<number | null> {
  const tokenIdStr = tokenId.toString();
  
  try {
    // MANDATORY: Redis is required for mapping lookups
    const redis = validateRedisForCriticalOps('Gift mapping lookup');

    const mappingKey = `${MAPPING_KEY_PREFIX}${tokenIdStr}`;
    const giftIdStr = await redis.get(mappingKey);
    
    if (giftIdStr) {
      const giftId = parseInt(giftIdStr);
      console.log(`✅ MAPPING FOUND: tokenId ${tokenId} → giftId ${giftId} (Redis)`);
      return giftId;
    }
    
    console.log(`❌ MAPPING NOT FOUND: tokenId ${tokenId} (check if mapping was stored)`);
    return null;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to lookup gift mapping:', error);
    console.error('📊 Redis status:', getRedisStatus());
    throw new Error(`Gift mapping lookup failed: ${(error as Error).message}. Cannot proceed without mapping data.`);
  }
}

/**
 * Get tokenId from giftId (reverse lookup)
 */
export async function getTokenIdFromMapping(giftId: string | number): Promise<number | null> {
  const giftIdStr = giftId.toString();
  
  try {
    // MANDATORY: Redis is required for reverse mapping lookups
    const redis = validateRedisForCriticalOps('Reverse gift mapping lookup');

    const reverseMappingKey = `${REVERSE_MAPPING_KEY_PREFIX}${giftIdStr}`;
    const tokenIdStr = await redis.get(reverseMappingKey);
    
    if (tokenIdStr) {
      const tokenId = parseInt(tokenIdStr);
      console.log(`✅ REVERSE MAPPING FOUND: giftId ${giftId} → tokenId ${tokenId}`);
      return tokenId;
    }
    
    console.log(`❌ REVERSE MAPPING NOT FOUND: giftId ${giftId}`);
    return null;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to lookup reverse gift mapping:', error);
    console.error('📊 Redis status:', getRedisStatus());
    throw new Error(`Reverse gift mapping lookup failed: ${(error as Error).message}. Cannot proceed without mapping data.`);
  }
}

/**
 * Batch store multiple mappings (for migration or bulk operations)
 */
export async function batchStoreGiftMappings(mappings: Array<{ tokenId: string | number; giftId: string | number }>): Promise<number> {
  try {
    // MANDATORY: Redis is required for batch mapping operations
    validateRedisForCriticalOps('Batch gift mapping storage');

    let stored = 0;
    
    for (const mapping of mappings) {
      const success = await storeGiftMapping(mapping.tokenId, mapping.giftId);
      if (success) stored++;
    }
    
    console.log(`✅ BATCH STORED: ${stored}/${mappings.length} gift mappings`);
    return stored;
  } catch (error) {
    console.error('❌ CRITICAL: Batch mapping storage failed:', error);
    console.error('📊 Redis status:', getRedisStatus());
    throw new Error(`Batch gift mapping storage failed: ${(error as Error).message}. This is critical for system security.`);
  }
}

/**
 * Clear all gift mappings (admin operation)
 */
export async function clearAllGiftMappings(): Promise<number> {
  try {
    // MANDATORY: Redis is required for clearing mappings
    const redis = validateRedisForCriticalOps('Clear all gift mappings');

    const mappingKeys = await redis.keys(`${MAPPING_KEY_PREFIX}*`);
    const reverseMappingKeys = await redis.keys(`${REVERSE_MAPPING_KEY_PREFIX}*`);
    const allKeys = [...mappingKeys, ...reverseMappingKeys];
    
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
    
    console.log(`✅ CLEARED ${allKeys.length} gift mapping entries`);
    return allKeys.length;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to clear gift mappings:', error);
    console.error('📊 Redis status:', getRedisStatus());
    throw new Error(`Clear gift mappings failed: ${(error as Error).message}. This operation requires Redis for data integrity.`);
  }
}