/**
 * REDIS PRODUCTION DIAGNOSTIC
 * Tests Redis connectivity and configuration in production
 */

const API_BASE = 'https://cryptogift-wallets.vercel.app';

async function testRedisConfiguration() {
  console.log('🔍 TESTING REDIS CONFIGURATION IN PRODUCTION...\n');
  
  try {
    // Test the debug endpoint which might show Redis status
    console.log('1️⃣ Testing debug endpoint...');
    
    const debugResponse = await fetch(`${API_BASE}/debug`);
    const debugText = await debugResponse.text();
    
    console.log('Debug endpoint status:', debugResponse.status);
    console.log('Debug endpoint response length:', debugText.length);
    
    // Look for Redis-related information
    if (debugText.includes('Redis') || debugText.includes('KV_REST') || debugText.includes('UPSTASH')) {
      console.log('✅ Found Redis information in debug endpoint');
      const redisLines = debugText.split('\n').filter(line => 
        line.toLowerCase().includes('redis') || 
        line.includes('KV_REST') || 
        line.includes('UPSTASH')
      );
      console.log('Redis-related lines:', redisLines);
    } else {
      console.log('❌ No Redis information found in debug endpoint');
    }
    
  } catch (error) {
    console.error('❌ Failed to test debug endpoint:', error.message);
  }
  
  try {
    // Test a direct API that would use Redis
    console.log('\n2️⃣ Testing API that requires Redis...');
    
    const testResponse = await fetch(`${API_BASE}/api/gift-has-password?tokenId=999999`);
    const testResult = await testResponse.json();
    
    console.log('API response:', JSON.stringify(testResult, null, 2));
    
    if (testResult.reason && testResult.reason.includes('fallback')) {
      console.log('🚨 CRITICAL: API is using fallback methods - Redis likely not working');
    }
    
    if (testResult.giftId === null) {
      console.log('🚨 CRITICAL: giftId is null - no Redis mappings found');
    }
    
  } catch (error) {
    console.error('❌ Failed to test Redis-dependent API:', error.message);
  }
  
  console.log('\n📋 DIAGNOSIS:');
  console.log('- If all tokens show "fallback_fallback_secure" and giftId: null');
  console.log('- This indicates Redis is either:');
  console.log('  1. Not configured in Vercel environment variables');
  console.log('  2. Configured with expired/invalid tokens');
  console.log('  3. Experiencing connection failures');
  console.log('');
  console.log('🔧 SOLUTION: Check Vercel Dashboard → Settings → Environment Variables');
  console.log('- Verify KV_REST_API_URL and KV_REST_API_TOKEN are set');
  console.log('- Or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
  console.log('- Ensure tokens are not expired');
}

testRedisConfiguration().catch(console.error);