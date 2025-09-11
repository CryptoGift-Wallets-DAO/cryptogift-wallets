/**
 * FORWARD-ONLY MAPPING SYSTEM TEST SUITE
 * Tests for new JSON schema-based mapping functionality
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

const { Redis } = require('@upstash/redis');

// Test configuration
const TEST_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const TEST_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!TEST_REDIS_URL || !TEST_REDIS_TOKEN) {
  console.error('❌ TEST FAILED: Redis credentials not configured');
  process.exit(1);
}

const redis = new Redis({
  url: TEST_REDIS_URL,
  token: TEST_REDIS_TOKEN,
});

// Mock the mapping functions
const MAPPING_KEY_PREFIX = 'gift_mapping:';

// JSON Schema for validation
const validateMappingPayload = (giftId, tokenId, metadata) => {
  const giftIdNum = parseInt(giftId.toString());
  const tokenIdStr = tokenId.toString();
  
  if (isNaN(giftIdNum) || giftIdNum <= 0) {
    throw new Error(`Invalid giftId: ${giftId}. Must be positive integer.`);
  }
  
  if (!tokenIdStr || tokenIdStr.length === 0) {
    throw new Error(`Invalid tokenId: ${tokenId}. Must be non-empty string.`);
  }
  
  return {
    schemaVersion: 1,
    giftId: giftIdNum.toString(),
    tokenId: tokenIdStr,
    updatedAt: Date.now(),
    ...(metadata && { metadata })
  };
};

// Store mapping with validation
const storeGiftMapping = async (tokenId, giftId, metadata) => {
  try {
    const mappingData = validateMappingPayload(giftId, tokenId, metadata);
    const mappingKey = `${MAPPING_KEY_PREFIX}${mappingData.tokenId}`;
    
    await redis.set(mappingKey, JSON.stringify(mappingData), { ex: 86400 * 730 });
    console.log(`✅ MAPPING STORED: ${mappingKey} → schemaVersion:${mappingData.schemaVersion}, giftId:${mappingData.giftId}`);
    return true;
  } catch (error) {
    console.error(`❌ MAPPING VALIDATION FAILED:`, error.message);
    throw new Error(`Gift mapping storage failed: ${error.message}`);
  }
};

// Get mapping with reason codes
const getGiftIdFromMapping = async (tokenId) => {
  const tokenIdStr = tokenId.toString();
  const ENABLE_LEGACY_READ = process.env.ENABLE_LEGACY_READ === 'true';
  
  try {
    const mappingKey = `${MAPPING_KEY_PREFIX}${tokenIdStr}`;
    const mappingDataRaw = await redis.get(mappingKey);
    
    // NO DATA FOUND
    if (!mappingDataRaw) {
      return { giftId: null, reason: 'missing_mapping' };
    }
    
    // LEGACY DATA DETECTED - EXPLICIT FAILURE (unless emergency mode)
    if (typeof mappingDataRaw === 'number') {
      if (ENABLE_LEGACY_READ) {
        console.warn(`🚨 EMERGENCY MODE: Legacy read enabled for tokenId ${tokenId}`);
        return { giftId: mappingDataRaw, reason: 'json_ok' };
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
    let mappingData;
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
    
    // SUCCESS
    const ageHours = Math.floor((Date.now() - mappingData.updatedAt) / (1000 * 60 * 60));
    console.log(`✅ MAPPING FOUND: tokenId ${tokenId} → giftId ${giftId} (schemaVersion:${mappingData.schemaVersion}, ${ageHours}h old)`);
    
    return { giftId, reason: 'json_ok' };
    
  } catch (error) {
    console.error(`❌ MAPPING LOOKUP ERROR: tokenId ${tokenId} - ${error.message}`);
    return { giftId: null, reason: 'redis_error' };
  }
};

// TEST SUITE
async function runTests() {
  console.log('🧪 STARTING FORWARD-ONLY MAPPING TESTS\n');
  
  let passed = 0;
  let failed = 0;
  
  const test = async (name, testFunc) => {
    try {
      console.log(`🔍 TEST: ${name}`);
      await testFunc();
      console.log(`✅ PASS: ${name}\n`);
      passed++;
    } catch (error) {
      console.error(`❌ FAIL: ${name} - ${error.message}\n`);
      failed++;
    }
  };
  
  // Clean up test data first
  const testTokenIds = ['9001', '9002', '9003', '9004', '9005'];
  for (const tokenId of testTokenIds) {
    await redis.del(`gift_mapping:${tokenId}`);
  }
  
  // TEST 1: Valid JSON mapping storage and retrieval
  await test('Valid JSON mapping succeeds', async () => {
    const tokenId = '9001';
    const giftId = 134;
    const metadata = { educationModules: [1, 2], creator: '0x123' };
    
    await storeGiftMapping(tokenId, giftId, metadata);
    const result = await getGiftIdFromMapping(tokenId);
    
    if (result.reason !== 'json_ok') throw new Error(`Expected json_ok, got ${result.reason}`);
    if (result.giftId !== giftId) throw new Error(`Expected giftId ${giftId}, got ${result.giftId}`);
  });
  
  // TEST 2: Legacy number format fails explicitly
  await test('Legacy number format fails explicitly', async () => {
    const tokenId = '9002';
    const legacyGiftId = 215;
    
    // Manually store legacy format (number)
    await redis.set(`gift_mapping:${tokenId}`, legacyGiftId);
    
    const result = await getGiftIdFromMapping(tokenId);
    
    if (result.reason !== 'legacy_incompatible') {
      throw new Error(`Expected legacy_incompatible, got ${result.reason}`);
    }
    if (result.giftId !== null) {
      throw new Error(`Expected null giftId, got ${result.giftId}`);
    }
  });
  
  // TEST 3: Invalid JSON fails with clear reason
  await test('Invalid JSON fails with clear reason', async () => {
    const tokenId = '9003';
    
    // Store invalid JSON
    await redis.set(`gift_mapping:${tokenId}`, 'invalid json string');
    
    const result = await getGiftIdFromMapping(tokenId);
    
    if (result.reason !== 'invalid_mapping_format') {
      throw new Error(`Expected invalid_mapping_format, got ${result.reason}`);
    }
    if (result.giftId !== null) {
      throw new Error(`Expected null giftId, got ${result.giftId}`);
    }
  });
  
  // TEST 4: Missing mapping returns correct reason
  await test('Missing mapping returns correct reason', async () => {
    const tokenId = '9004';
    
    // Ensure no data exists
    await redis.del(`gift_mapping:${tokenId}`);
    
    const result = await getGiftIdFromMapping(tokenId);
    
    if (result.reason !== 'missing_mapping') {
      throw new Error(`Expected missing_mapping, got ${result.reason}`);
    }
    if (result.giftId !== null) {
      throw new Error(`Expected null giftId, got ${result.giftId}`);
    }
  });
  
  // TEST 5: Invalid schema version fails
  await test('Invalid schema version fails', async () => {
    const tokenId = '9005';
    
    // Store JSON with invalid schema
    const invalidSchema = { giftId: '150', tokenId: '9005', updatedAt: Date.now() }; // Missing schemaVersion
    await redis.set(`gift_mapping:${tokenId}`, JSON.stringify(invalidSchema));
    
    const result = await getGiftIdFromMapping(tokenId);
    
    if (result.reason !== 'invalid_mapping_format') {
      throw new Error(`Expected invalid_mapping_format, got ${result.reason}`);
    }
    if (result.giftId !== null) {
      throw new Error(`Expected null giftId, got ${result.giftId}`);
    }
  });
  
  // TEST 6: Validation rejects invalid input
  await test('Validation rejects invalid input', async () => {
    try {
      await storeGiftMapping('test', 0); // Invalid giftId
      throw new Error('Should have thrown validation error');
    } catch (error) {
      if (!error.message.includes('Invalid giftId')) {
        throw new Error(`Expected validation error, got: ${error.message}`);
      }
    }
    
    try {
      await storeGiftMapping('', 123); // Invalid tokenId
      throw new Error('Should have thrown validation error');
    } catch (error) {
      if (!error.message.includes('Invalid tokenId')) {
        throw new Error(`Expected validation error, got: ${error.message}`);
      }
    }
  });
  
  // TEST 7: Emergency legacy mode (when enabled)
  await test('Emergency legacy mode works when enabled', async () => {
    const originalFlag = process.env.ENABLE_LEGACY_READ;
    process.env.ENABLE_LEGACY_READ = 'true';
    
    try {
      const tokenId = '9006';
      const legacyGiftId = 999;
      
      // Store legacy format
      await redis.set(`gift_mapping:${tokenId}`, legacyGiftId);
      
      const result = await getGiftIdFromMapping(tokenId);
      
      if (result.reason !== 'json_ok') {
        throw new Error(`Expected json_ok in emergency mode, got ${result.reason}`);
      }
      if (result.giftId !== legacyGiftId) {
        throw new Error(`Expected giftId ${legacyGiftId}, got ${result.giftId}`);
      }
      
      // Clean up
      await redis.del(`gift_mapping:${tokenId}`);
    } finally {
      process.env.ENABLE_LEGACY_READ = originalFlag;
    }
  });
  
  // Clean up test data
  for (const tokenId of testTokenIds) {
    await redis.del(`gift_mapping:${tokenId}`);
  }
  await redis.del('gift_mapping:9006');
  
  console.log('📊 TEST RESULTS:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED - Review implementation');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED - Forward-only mapping system ready!');
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 TEST SUITE FAILED:', error);
  process.exit(1);
});