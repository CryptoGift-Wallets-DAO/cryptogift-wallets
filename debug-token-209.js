/**
 * DEBUG TOKEN 209 - EDUCATION REQUIREMENTS INVESTIGATION
 * Analyzes why education requirements are not being detected
 */

const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: 'https://exotic-alien-13383.upstash.io',
  token: 'ATRHAAIncDE4Y2IyNzI0MmExMzY0Zjc2YTc1ZThkYjhkZDQ0ZjAzZXAxMTMzODM',
});

async function debugToken209() {
  console.log('🔍 DEBUGGING TOKEN 209 EDUCATION REQUIREMENTS\n');
  
  try {
    // 1. Check gift mapping
    console.log('1️⃣ CHECKING GIFT MAPPING:');
    const mappingKey = 'gift_mapping:209';
    const mappingData = await redis.get(mappingKey);
    
    console.log('Raw mapping data type:', typeof mappingData);
    console.log('Raw mapping data:', mappingData);
    
    let giftId = null;
    if (typeof mappingData === 'object' && mappingData !== null) {
      console.log('✅ Redis auto-deserialized object');
      giftId = mappingData.giftId;
      console.log('Schema version:', mappingData.schemaVersion);
      console.log('Gift ID:', giftId);
      console.log('NFT Contract:', mappingData.nftContract);
      console.log('Chain ID:', mappingData.chainId);
      console.log('Metadata:', mappingData.metadata);
    } else if (typeof mappingData === 'string') {
      console.log('⚠️ Redis returned string, parsing...');
      const parsed = JSON.parse(mappingData);
      giftId = parsed.giftId;
      console.log('Parsed data:', parsed);
    } else if (typeof mappingData === 'number') {
      console.log('⚠️ Legacy number format');
      giftId = mappingData;
    } else {
      console.log('❌ No mapping found or unexpected type');
      return;
    }
    
    // 2. Check education requirements
    if (giftId) {
      console.log('\n2️⃣ CHECKING EDUCATION REQUIREMENTS:');
      const educationKey = `education:gift:${giftId}`;
      const educationData = await redis.get(educationKey);
      
      console.log('Education key:', educationKey);
      console.log('Education data type:', typeof educationData);
      console.log('Education data:', educationData);
      
      if (educationData) {
        if (typeof educationData === 'string') {
          const parsed = JSON.parse(educationData);
          console.log('✅ Education requirements found:', parsed);
        } else {
          console.log('✅ Education requirements found (auto-deserialized):', educationData);
        }
      } else {
        console.log('❌ No education requirements found');
      }
      
      // 3. Check legacy education key
      console.log('\n3️⃣ CHECKING LEGACY EDUCATION KEY:');
      const legacyKey = `education_modules:209`;
      const legacyData = await redis.get(legacyKey);
      
      console.log('Legacy key:', legacyKey);
      console.log('Legacy data:', legacyData);
    }
    
    // 4. Test the new mapping function logic
    console.log('\n4️⃣ TESTING NEW MAPPING FUNCTION LOGIC:');
    
    const testMappingData = mappingData;
    let testGiftId = null;
    let reason = 'unknown';
    
    if (!testMappingData) {
      reason = 'missing_mapping';
    } else if (typeof testMappingData === 'number') {
      reason = 'legacy_incompatible';
      testGiftId = testMappingData;
    } else if (typeof testMappingData === 'string') {
      try {
        const parsed = JSON.parse(testMappingData);
        if (parsed.schemaVersion >= 1) {
          testGiftId = parseInt(parsed.giftId);
          reason = 'json_ok';
        } else {
          reason = 'invalid_mapping_format';
        }
      } catch (e) {
        reason = 'invalid_mapping_format';
      }
    } else if (typeof testMappingData === 'object' && testMappingData !== null) {
      if (testMappingData.schemaVersion >= 1) {
        testGiftId = parseInt(testMappingData.giftId);
        reason = 'json_ok';
      } else {
        reason = 'invalid_mapping_format';
      }
    } else {
      reason = 'invalid_mapping_format';
    }
    
    console.log('Test result:', { giftId: testGiftId, reason });
    
    // 5. Check what gift-has-password would return
    console.log('\n5️⃣ SIMULATING gift-has-password API:');
    
    if (reason === 'json_ok' && testGiftId) {
      console.log('✅ Would proceed to check education requirements');
      console.log('Expected hasPassword: true');
      console.log('Expected hasEducation: depends on education data');
    } else {
      console.log('❌ Would return error/fallback');
      console.log(`Reason: ${reason}`);
      console.log('Expected hasPassword: null');
      console.log('Expected hasEducation: null');
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugToken209().catch(console.error);