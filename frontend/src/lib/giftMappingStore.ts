/**
 * GIFT MAPPING PERSISTENT STORE - MANDATORY REDIS
 * Stores tokenId → giftId mappings to avoid RPC calls
 * NO FALLBACKS - Redis is mandatory for production security
 */

import { validateRedisForCriticalOps, isRedisConfigured, getRedisStatus } from './redisConfig';

// Cache keys
const MAPPING_KEY_PREFIX = 'gift_mapping:';
const REVERSE_MAPPING_KEY_PREFIX = 'reverse_mapping:';
const SALT_KEY_PREFIX = 'gift_salt:';

/**
 * Store tokenId → giftId mapping persistently with optional metadata
 * Call this immediately after registerGiftMinted succeeds
 */
export async function storeGiftMapping(
  tokenId: string | number, 
  giftId: string | number,
  metadata?: {
    educationModules?: number[];
    creator?: string;
    nftContract?: string;
    createdAt?: number;
    salt?: string;
  }
): Promise<boolean> {
  const tokenIdStr = tokenId.toString();
  const giftIdStr = giftId.toString();
  
  // RETRY LOGIC: Critical mapping storage with exponential backoff
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 MAPPING STORAGE: Attempt ${attempt}/${maxAttempts} for tokenId ${tokenId} → giftId ${giftId}`);
      
      // Try Redis first, but allow fallback in development mode
      const redis = validateRedisForCriticalOps('Gift mapping storage');
      
      // If Redis is not available (development mode), skip storage but don't fail
      if (!redis) {
        console.warn(`⚠️  [DEV MODE] Redis not available for gift mapping storage, tokenId: ${tokenId} → giftId: ${giftId}`);
        return false; // Return false but don't throw error
      }

      const mappingKey = `${MAPPING_KEY_PREFIX}${tokenIdStr}`;
      const reverseMappingKey = `${REVERSE_MAPPING_KEY_PREFIX}${giftIdStr}`;
      
      // Prepare mapping data with metadata if provided
      const mappingData = {
        giftId: giftIdStr,
        tokenId: tokenIdStr,
        ...(metadata || {})
      };
      
      // Store both directions for fast lookups with extended expiry for critical mappings
      await Promise.all([
        redis.set(mappingKey, JSON.stringify(mappingData), { ex: 86400 * 730 }), // 2 years expiry (extended for stability)
        redis.set(reverseMappingKey, tokenIdStr, { ex: 86400 * 730 }),
        // CACHE OPTIMIZATION: Store timestamp for freshness tracking
        redis.set(`${mappingKey}:timestamp`, Date.now().toString(), { ex: 86400 * 730 })
      ]);
      
      // Only log successful storage once to reduce noise
      if (attempt === 1) {
        console.log(`✅ MAPPING STORED: tokenId ${tokenId} → giftId ${giftId} (Redis, 2yr TTL)`);
      }
      return true;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ MAPPING STORAGE ATTEMPT ${attempt} FAILED:`, error);
      console.error('📊 Redis status:', getRedisStatus());
      
      if (attempt < maxAttempts) {
        const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.log(`⏳ Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  // All attempts failed
  console.error(`💥 CRITICAL: All ${maxAttempts} mapping storage attempts failed for tokenId ${tokenId} → giftId ${giftId}`);
  throw new Error(`Gift mapping storage failed after ${maxAttempts} attempts: ${lastError?.message}. This is critical for system security.`);
}

/**
 * Get giftId from tokenId (persistent lookup)
 * This replaces the expensive RPC event querying
 */
export async function getGiftIdFromMapping(tokenId: string | number): Promise<number | null> {
  const tokenIdStr = tokenId.toString();
  
  try {
    // Try Redis first, but allow fallback in development mode
    const redis = validateRedisForCriticalOps('Gift mapping lookup');
    
    // If Redis is not available (development mode), return null to trigger fallback
    if (!redis) {
      console.warn(`⚠️  [DEV MODE] Redis not available for gift mapping lookup, tokenId: ${tokenId}`);
      return null; // This will trigger blockchain event fallback
    }

    const mappingKey = `${MAPPING_KEY_PREFIX}${tokenIdStr}`;
    const giftIdStr = await redis.get(mappingKey);
    
    if (giftIdStr && typeof giftIdStr === 'string') {
      const giftId = parseInt(giftIdStr);
      if (isNaN(giftId)) {
        console.error(`❌ INVALID GIFT ID: tokenId ${tokenId} has invalid giftId "${giftIdStr}"`);
        return null;
      }
      
      // CACHE OPTIMIZATION: Check mapping freshness
      try {
        const timestampKey = `${mappingKey}:timestamp`;
        const timestampStr = await redis.get(timestampKey);
        const age = timestampStr ? Date.now() - parseInt(timestampStr as string) : 0;
        const ageHours = Math.floor(age / (1000 * 60 * 60));
        
        console.log(`✅ MAPPING FOUND: tokenId ${tokenId} → giftId ${giftId} (Redis, ${ageHours}h old)`);
      } catch {
        console.log(`✅ MAPPING FOUND: tokenId ${tokenId} → giftId ${giftId} (Redis)`);
      }
      
      return giftId;
    }
    
    // Reduced logging frequency for missing mappings
    console.log(`❌ MAPPING MISS: tokenId ${tokenId}`);
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
    
    if (tokenIdStr && typeof tokenIdStr === 'string') {
      const tokenId = parseInt(tokenIdStr);
      if (isNaN(tokenId)) {
        console.error(`❌ INVALID TOKEN ID: giftId ${giftId} has invalid tokenId "${tokenIdStr}"`);
        return null;
      }
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
    // Try Redis first, but allow fallback in development mode
    const redis = validateRedisForCriticalOps('Batch gift mapping storage');
    
    // If Redis is not available (development mode), skip storage but don't fail
    if (!redis) {
      console.warn(`⚠️  [DEV MODE] Redis not available for batch gift mapping storage`);
      console.warn(`🔄 [DEV MODE] Skipping storage of ${mappings.length} mappings (not secure for production)`);
      return 0; // Return 0 stored but don't throw error
    }

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
 * CRITICAL: Store the original mint salt for a gift
 * This fixes the core issue where claim process generates new salt instead of using original
 */
export async function storeGiftSalt(giftId: string | number, salt: string): Promise<boolean> {
  const giftIdStr = giftId.toString();
  
  if (!salt || !salt.startsWith('0x') || salt.length !== 66) {
    throw new Error(`Invalid salt format: ${salt}. Expected 0x + 64 hex chars.`);
  }
  
  try {
    const redis = validateRedisForCriticalOps('Gift salt storage');
    
    if (!redis) {
      console.warn(`⚠️  [DEV MODE] Redis not available for salt storage, giftId: ${giftId}`);
      return false;
    }

    const saltKey = `${SALT_KEY_PREFIX}${giftIdStr}`;
    
    // Store salt with extended expiry (permanent for security)
    await redis.set(saltKey, salt, { ex: 86400 * 730 }); // 2 years
    
    console.log(`✅ SALT STORED: giftId ${giftId} → ${salt.slice(0, 10)}...`);
    return true;
    
  } catch (error) {
    console.error(`❌ CRITICAL: Salt storage failed for giftId ${giftId}:`, error);
    throw new Error(`Salt storage failed: ${(error as Error).message}. This is critical for password validation.`);
  }
}

/**
 * CRITICAL: Retrieve the original mint salt for a gift
 * This is essential for claim validation to use the correct salt
 */
export async function getGiftSalt(giftId: string | number): Promise<string | null> {
  const giftIdStr = giftId.toString();
  
  try {
    const redis = validateRedisForCriticalOps('Gift salt lookup');
    
    if (!redis) {
      console.warn(`⚠️  [DEV MODE] Redis not available for salt lookup, giftId: ${giftId}`);
      return null;
    }

    const saltKey = `${SALT_KEY_PREFIX}${giftIdStr}`;
    const salt = await redis.get(saltKey);
    
    if (salt && typeof salt === 'string') {
      console.log(`✅ SALT FOUND: giftId ${giftId} → ${salt.slice(0, 10)}...`);
      return salt;
    }
    
    console.log(`❌ SALT NOT FOUND: giftId ${giftId}`);
    return null;
  } catch (error) {
    console.error(`❌ CRITICAL: Salt lookup failed for giftId ${giftId}:`, error);
    throw new Error(`Salt lookup failed: ${(error as Error).message}. Cannot validate without original salt.`);
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
    const saltKeys = await redis.keys(`${SALT_KEY_PREFIX}*`);
    const allKeys = [...mappingKeys, ...reverseMappingKeys, ...saltKeys];
    
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
    
    console.log(`✅ CLEARED ${allKeys.length} gift mapping entries (including salts)`);
    return allKeys.length;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to clear gift mappings:', error);
    console.error('📊 Redis status:', getRedisStatus());
    throw new Error(`Clear gift mappings failed: ${(error as Error).message}. This operation requires Redis for data integrity.`);
  }
}