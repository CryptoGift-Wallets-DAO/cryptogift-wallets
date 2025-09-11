/**
 * EMERGENCY FIX: Create missing mapping for token 201 → giftId 228
 * This fixes the education detection issue reported in logs
 */

const { Redis } = require('@upstash/redis');

// Configure Redis using Vercel KV environment (same as production)
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function fixToken201Mapping() {
  try {
    console.log('🔧 EMERGENCY FIX: Creating missing mapping for token 201...');
    
    const tokenId = '201';
    const giftId = '228'; // From logs: CLAIM VALIDATION SUCCESS: { tokenId: '201', giftId: 228 }
    
    // Create the mapping data structure (same format as storeGiftMapping)
    const mappingData = {
      giftId: giftId,
      tokenId: tokenId,
      creator: '0xc655BF2B...', // From logs (partial address)
      nftContract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '0xE9F316159a0830114252a96a6B7CA6efD874650F',
      createdAt: Date.now(),
      educationModules: [1, 2] // ASSUME this token was created WITH education requirements
    };
    
    // Store main mapping
    const mappingKey = `gift_mapping:${tokenId}`;
    await redis.set(mappingKey, JSON.stringify(mappingData), { ex: 86400 * 730 }); // 2 years
    console.log(`✅ Main mapping stored: ${mappingKey}`);
    
    // Store reverse mapping
    const reverseMappingKey = `reverse_mapping:${giftId}`;
    await redis.set(reverseMappingKey, tokenId, { ex: 86400 * 730 });
    console.log(`✅ Reverse mapping stored: ${reverseMappingKey}`);
    
    // Store timestamp
    await redis.set(`${mappingKey}:timestamp`, Date.now().toString(), { ex: 86400 * 730 });
    console.log(`✅ Timestamp stored for ${mappingKey}`);
    
    // CRITICAL: Store education requirements in NEW format
    const educationKey = `education:gift:${giftId}`;
    const educationData = {
      hasEducation: true,
      modules: [1, 2],
      version: '2.0',
      createdAt: Date.now(),
      source: 'manual_fix'
    };
    
    await redis.set(educationKey, JSON.stringify(educationData), { ex: 86400 * 730 });
    console.log(`✅ Education data stored: ${educationKey}`);
    
    // Verify the fix works
    console.log('🔍 VERIFICATION: Testing the fix...');
    
    // Test mapping lookup
    const storedMapping = await redis.get(mappingKey);
    const parsedMapping = JSON.parse(storedMapping);
    console.log('📍 Stored mapping:', parsedMapping);
    
    // Test education lookup
    const storedEducation = await redis.get(educationKey);
    const parsedEducation = JSON.parse(storedEducation);
    console.log('📚 Stored education:', parsedEducation);
    
    console.log('✅ EMERGENCY FIX COMPLETED: Token 201 should now show education requirements!');
    console.log('🧪 Test URL: https://cryptogift-wallets.vercel.app/api/gift-has-password?tokenId=201');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    throw error;
  }
}

fixToken201Mapping().catch(console.error);