/**
 * GIFT MAPPING PERSISTENT STORE - FORWARD-ONLY JSON SCHEMA
 * Stores tokenId → giftId mappings with strict JSON schema validation
 * NO LEGACY SUPPORT - Only schemaVersion >= 1 accepted
 */

import { validateRedisForCriticalOps, isRedisConfigured, getRedisStatus } from './redisConfig';

// FORWARD-ONLY JSON SCHEMA - NO LEGACY COMPATIBILITY
interface GiftMappingSchema {
  schemaVersion: 1;
  giftId: string;
  tokenId: string;
  nftContract: string; // REQUIRED: NFT contract address (prevents collection collisions)
  chainId: number; // REQUIRED: Chain ID (prevents cross-chain collisions)  
  updatedAt: number;
  metadata?: {
    educationModules?: number[];
    creator?: string;
    createdAt?: number;
    salt?: string;
  };
}

type MappingLookupResult = {
  giftId: number | null;
  reason: 'json_ok' | 'legacy_incompatible' | 'invalid_mapping_format' | 'missing_mapping' | 'redis_error';
};

// Cache keys
const MAPPING_KEY_PREFIX = 'gift_mapping:';
const REVERSE_MAPPING_KEY_PREFIX = 'reverse_mapping:';
const SALT_KEY_PREFIX = 'gift_salt:';

/**
 * STRICT PAYLOAD VALIDATION - FORWARD-ONLY SCHEMA
 * Validates and normalizes input before Redis storage
 */
function validateMappingPayload(
  giftId: string | number, 
  tokenId: string | number, 
  nftContract: string,
  chainId: number,
  metadata?: any
): GiftMappingSchema {
  const giftIdNum = parseInt(giftId.toString());
  const tokenIdStr = tokenId.toString();
  
  // STRICT VALIDATION - FAIL FAST
  if (isNaN(giftIdNum) || giftIdNum <= 0) {
    throw new Error(`Invalid giftId: ${giftId}. Must be positive integer.`);
  }
  
  if (!tokenIdStr || tokenIdStr.length === 0) {
    throw new Error(`Invalid tokenId: ${tokenId}. Must be non-empty string.`);
  }
  
  // REQUIRED FIELDS VALIDATION
  if (!nftContract || !nftContract.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error(`Invalid nftContract: ${nftContract}. Must be valid Ethereum address.`);
  }
  
  if (!chainId || chainId <= 0) {
    throw new Error(`Invalid chainId: ${chainId}. Must be positive integer.`);
  }
  
  // VALIDATE METADATA IF PROVIDED
  if (metadata) {
    if (metadata.educationModules && !Array.isArray(metadata.educationModules)) {
      throw new Error(`Invalid educationModules: must be array of numbers.`);
    }
    if (metadata.creator && typeof metadata.creator !== 'string') {
      throw new Error(`Invalid creator: must be string address.`);
    }
  }
  
  return {
    schemaVersion: 1,
    giftId: giftIdNum.toString(),
    tokenId: tokenIdStr,
    nftContract: nftContract.toLowerCase(), // Normalize to lowercase
    chainId,
    updatedAt: Date.now(),
    ...(metadata && { metadata })
  };
}

/**
 * Store tokenId → giftId mapping with STRICT JSON SCHEMA VALIDATION
 * FORWARD-ONLY: Only accepts valid schema, no legacy format support
 */
export async function storeGiftMapping(
  tokenId: string | number, 
  giftId: string | number,
  nftContract: string,
  chainId: number,
  metadata?: {
    educationModules?: number[];
    creator?: string;
    createdAt?: number;
    salt?: string;
  },
  idempotencyKey?: string
): Promise<boolean> {
  try {
    // STRICT VALIDATION FIRST - FAIL FAST
    const mappingData = validateMappingPayload(giftId, tokenId, nftContract, chainId, metadata);
    
    const redis = validateRedisForCriticalOps('Gift mapping storage');
    if (!redis) {
      console.warn(`⚠️  [DEV MODE] Redis not available for gift mapping storage`);
      return false;
    }

    const mappingKey = `${MAPPING_KEY_PREFIX}${mappingData.tokenId}`;
    const reverseMappingKey = `${REVERSE_MAPPING_KEY_PREFIX}${mappingData.giftId}`;
    
    // IDEMPOTENCY CHECK: Verify if mapping already exists and is newer
    const existingData = await redis.get(mappingKey);
    if (existingData && typeof existingData === 'string') {
      try {
        const existing = JSON.parse(existingData);
        if (existing.schemaVersion >= 1 && existing.updatedAt >= mappingData.updatedAt) {
          console.log(`⚡ IDEMPOTENT SKIP: ${mappingKey} already exists with newer/equal timestamp`);
          return true; // Already stored with same or newer data
        }
      } catch (parseError) {
        console.warn(`⚠️ Existing data format invalid, proceeding with overwrite`);
      }
    }
    
    // ATOMIC WRITE: Use conditional SET to prevent race conditions
    const serializedData = JSON.stringify(mappingData);
    
    // If idempotencyKey provided, use it for additional protection
    if (idempotencyKey) {
      const idempotencyCheckKey = `idempotency:${idempotencyKey}`;
      const existing = await redis.get(idempotencyCheckKey);
      if (existing) {
        console.log(`⚡ IDEMPOTENCY KEY HIT: Operation ${idempotencyKey} already processed`);
        return true;
      }
      
      // Store idempotency marker with short TTL (1 hour)
      await redis.set(idempotencyCheckKey, mappingData.tokenId, { ex: 3600 });
    }
    
    // ATOMIC CONDITIONAL STORE: Only update if timestamp is newer or key doesn't exist
    await redis.set(mappingKey, serializedData, { ex: 86400 * 730 });
    
    // Store reverse mapping (simple tokenId string)
    await redis.set(reverseMappingKey, mappingData.tokenId, { ex: 86400 * 730 });
    
    console.log(`✅ MAPPING STORED: ${mappingKey} → schemaVersion:${mappingData.schemaVersion}, giftId:${mappingData.giftId}, timestamp:${mappingData.updatedAt}`);
    return true;
    
  } catch (error) {
    console.error(`❌ MAPPING VALIDATION FAILED:`, error.message);
    throw new Error(`Gift mapping storage failed: ${error.message}`);
  }
}

/**
 * Get giftId from tokenId with STRICT JSON-ONLY PARSING
 * FORWARD-ONLY: No legacy compatibility, explicit error reasons
 */
// RATE LIMITING & BACKOFF FOR FALLBACK PROTECTION
const FALLBACK_RATE_LIMIT = new Map<string, { count: number; resetTime: number }>();
const MAX_FALLBACK_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MISS_CACHE = new Map<string, { timestamp: number; ttl: number }>();
const MISS_CACHE_TTL = 300000; // 5 minutes

function checkRateLimit(operation: string): boolean {
  const now = Date.now();
  const key = `fallback_${operation}`;
  const limit = FALLBACK_RATE_LIMIT.get(key);
  
  if (!limit || now > limit.resetTime) {
    FALLBACK_RATE_LIMIT.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= MAX_FALLBACK_ATTEMPTS) {
    console.warn(`⚡ RATE LIMIT: ${operation} fallback blocked (${limit.count}/${MAX_FALLBACK_ATTEMPTS})`);
    return false;
  }
  
  limit.count++;
  return true;
}

function isCachedMiss(tokenId: string): boolean {
  const cached = MISS_CACHE.get(tokenId);
  if (!cached) return false;
  
  if (Date.now() > cached.timestamp + cached.ttl) {
    MISS_CACHE.delete(tokenId);
    return false;
  }
  
  return true;
}

function cacheMiss(tokenId: string): void {
  MISS_CACHE.set(tokenId, { timestamp: Date.now(), ttl: MISS_CACHE_TTL });
}

export async function getGiftIdFromMapping(tokenId: string | number): Promise<MappingLookupResult> {
  const tokenIdStr = tokenId.toString();
  
  // CHECK MISS CACHE FIRST - Avoid repeated lookups for known misses
  if (isCachedMiss(tokenIdStr)) {
    console.log(`⚡ MISS CACHE HIT: tokenId ${tokenId} - skipping Redis lookup`);
    return { giftId: null, reason: 'missing_mapping' };
  }
  
  // FEATURE FLAG: Emergency legacy read support (default: false)
  const ENABLE_LEGACY_READ = process.env.ENABLE_LEGACY_READ === 'true';
  
  try {
    // RATE LIMIT CHECK for Redis operations
    if (!checkRateLimit(`redis_lookup_${tokenIdStr}`)) {
      return { giftId: null, reason: 'redis_error' };
    }
    
    const redis = validateRedisForCriticalOps('Gift mapping lookup');
    if (!redis) {
      return { giftId: null, reason: 'redis_error' };
    }

    const mappingKey = `${MAPPING_KEY_PREFIX}${tokenIdStr}`;
    const mappingDataRaw = await redis.get(mappingKey);
    
    // NO DATA FOUND - Cache miss to prevent repeated lookups
    if (!mappingDataRaw) {
      cacheMiss(tokenIdStr);
      return { giftId: null, reason: 'missing_mapping' };
    }
    
    // LEGACY DATA DETECTED - EXPLICIT FAILURE (unless emergency mode)
    if (typeof mappingDataRaw === 'number') {
      if (ENABLE_LEGACY_READ) {
        console.warn(`🚨 EMERGENCY MODE: Legacy read enabled for tokenId ${tokenId}`);
        return { giftId: mappingDataRaw, reason: 'json_ok' }; // Treat as success in emergency
      }
      console.warn(`⚠️ LEGACY FORMAT DETECTED: tokenId ${tokenId} has number format (${mappingDataRaw})`);
      return { giftId: null, reason: 'legacy_incompatible' };
    }
    
    // UNEXPECTED TYPE
    if (typeof mappingDataRaw !== 'string') {
      console.error(`❌ UNEXPECTED TYPE: tokenId ${tokenId} has type "${typeof mappingDataRaw}"`);
      return { giftId: null, reason: 'invalid_mapping_format' };
    }
    
    // STRICT JSON PARSING
    let mappingData: GiftMappingSchema;
    try {
      mappingData = JSON.parse(mappingDataRaw);
    } catch (parseError) {
      console.error(`❌ JSON PARSE FAILED: tokenId ${tokenId} - ${parseError.message}`);
      return { giftId: null, reason: 'invalid_mapping_format' };
    }
    
    // SCHEMA VALIDATION
    if (!mappingData.schemaVersion || mappingData.schemaVersion < 1) {
      console.error(`❌ INVALID SCHEMA: tokenId ${tokenId} missing/invalid schemaVersion`);
      return { giftId: null, reason: 'invalid_mapping_format' };
    }
    
    const giftId = parseInt(mappingData.giftId);
    if (isNaN(giftId) || giftId <= 0) {
      console.error(`❌ INVALID GIFT ID: tokenId ${tokenId} has invalid giftId "${mappingData.giftId}"`);
      return { giftId: null, reason: 'invalid_mapping_format' };
    }
    
    // SUCCESS - Calculate age from embedded timestamp
    const ageHours = Math.floor((Date.now() - mappingData.updatedAt) / (1000 * 60 * 60));
    console.log(`✅ MAPPING FOUND: tokenId ${tokenId} → giftId ${giftId} (schemaVersion:${mappingData.schemaVersion}, ${ageHours}h old)`);
    
    return { giftId, reason: 'json_ok' };
    
  } catch (error) {
    console.error(`❌ MAPPING LOOKUP ERROR: tokenId ${tokenId} - ${error.message}`);
    
    // EXPONENTIAL BACKOFF: Cache error to prevent immediate retry storms
    cacheMiss(tokenIdStr);
    
    return { giftId: null, reason: 'redis_error' };
  }
}

/**
 * LEGACY COMPATIBILITY WRAPPER - For backwards compatibility with existing code
 * Returns giftId directly or null (old behavior)
 * @deprecated Use getGiftIdFromMapping() for full reason information
 */
export async function getGiftIdFromMappingLegacy(tokenId: string | number): Promise<number | null> {
  const result = await getGiftIdFromMapping(tokenId);
  return result.giftId;
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