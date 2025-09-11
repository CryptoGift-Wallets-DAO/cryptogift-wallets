#!/usr/bin/env node

/**
 * FIX TOKEN 187 SALT STORAGE
 * Manually store the original mint salt for token 187 to fix claim validation
 */

const { Redis } = require('@upstash/redis');

// From our investigation, we found token 187's original salt
const TOKEN_ID = '187';
const GIFT_ID = '216'; 
const ORIGINAL_SALT = '0x4888c1468d952f17cd30b5b0ef7e2f36f0b655babfa141a9fdc71dbac10615b5';

// Redis configuration
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

console.log('🔧 FIXING TOKEN 187 SALT STORAGE');
console.log('===============================');
console.log(`Token ID: ${TOKEN_ID}`);
console.log(`Gift ID: ${GIFT_ID}`);
console.log(`Original Salt: ${ORIGINAL_SALT}`);

async function fixToken187Salt() {
  try {
    // Initialize Redis client
    const redis = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
      enableAutoPipelining: false,
      retry: false,
    });

    console.log('\n🔍 Testing Redis connection...');
    
    // Test connection
    const testKey = 'test_fix_' + Date.now();
    await redis.setex(testKey, 60, 'test');
    const testResult = await redis.get(testKey);
    await redis.del(testKey);
    
    if (testResult !== 'test') {
      throw new Error('Redis connection test failed');
    }
    
    console.log('✅ Redis connection OK');
    
    // Store the salt for gift 216 (token 187)
    const saltKey = `gift_salt:${GIFT_ID}`;
    
    console.log(`\n💾 Storing salt for Gift ${GIFT_ID}...`);
    console.log(`Salt key: ${saltKey}`);
    
    await redis.set(saltKey, ORIGINAL_SALT, { ex: 86400 * 730 }); // 2 years expiry
    
    console.log('✅ Salt stored successfully!');
    
    // Verify the storage
    console.log('\n🔍 Verifying salt storage...');
    const storedSalt = await redis.get(saltKey);
    
    console.log(`Stored salt: ${storedSalt}`);
    console.log(`Original salt: ${ORIGINAL_SALT}`);
    console.log(`Match: ${storedSalt === ORIGINAL_SALT ? '✅' : '❌'}`);
    
    if (storedSalt === ORIGINAL_SALT) {
      console.log('\n🎉 SUCCESS! Token 187 salt has been fixed.');
      console.log('🔧 Now the claim validation should work correctly.');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Test claim validation with token 187');
      console.log('2. Verify the password "Rafael1996.C" now works');
      console.log('3. Check that the API retrieves the original salt');
    } else {
      console.error('\n❌ STORAGE VERIFICATION FAILED');
      console.error('The salt was not stored correctly.');
    }
    
  } catch (error) {
    console.error('💥 SALT FIX FAILED:', error);
    console.error('Manual intervention may be required.');
  }
}

// Run the fix
fixToken187Salt();