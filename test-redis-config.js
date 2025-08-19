process.env.NODE_ENV = 'production';
process.env.VERCEL_ENV = 'production';

// Simular que NO hay variables KV en Vercel
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

// Simular que SÍ hay variables UPSTASH en Vercel
process.env.UPSTASH_REDIS_REST_URL = 'https://exotic-alien-13383.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'ATRHAAIncDE4Y2IyNzI0MmExMzY0Zjc2YTc1ZThkYjhkZDQ0ZjAzZXAxMTMzODM';

const REQUIRED_REDIS_VARS = {
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN
};

console.log('🔍 Variables estado:');
console.log('KV_REST_API_URL:', REQUIRED_REDIS_VARS.KV_REST_API_URL);
console.log('KV_REST_API_TOKEN:', REQUIRED_REDIS_VARS.KV_REST_API_TOKEN);
console.log('UPSTASH_REDIS_REST_URL present:', !!REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_URL);
console.log('UPSTASH_REDIS_REST_TOKEN present:', !!REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_TOKEN);

function isRedisConfigured() {
  const hasKV = REQUIRED_REDIS_VARS.KV_REST_API_URL && REQUIRED_REDIS_VARS.KV_REST_API_TOKEN;
  const hasUpstash = REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_URL && REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_TOKEN;
  console.log('hasKV:', hasKV);
  console.log('hasUpstash:', hasUpstash);
  return hasKV || hasUpstash;
}

console.log('\n🎯 isRedisConfigured():', isRedisConfigured());

function validateRedisForCriticalOps(operationName) {
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.VERCEL_ENV === 'development' ||
                       !process.env.VERCEL_ENV;
                       
  console.log('\n🔍 ENVIRONMENT DETECTION:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('isDevelopment:', isDevelopment);
  
  if (!isRedisConfigured()) {
    if (isDevelopment) {
      console.log('⚠️ [DEV MODE] Would return null - fallback mode');
      return null;
    } else {
      console.log('🚨 [PROD MODE] Would throw error - strict mode');
      throw new Error('Redis mandatory for production');
    }
  }
  
  // Try Vercel KV format first (preferred)
  if (REQUIRED_REDIS_VARS.KV_REST_API_URL && REQUIRED_REDIS_VARS.KV_REST_API_TOKEN) {
    console.log('✅ Would use Vercel KV format');
    return 'REDIS_VIA_KV';
  }
  
  // Try direct Upstash format
  if (REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_URL && REQUIRED_REDIS_VARS.UPSTASH_REDIS_REST_TOKEN) {
    console.log('✅ Would use Direct Upstash format');
    return 'REDIS_VIA_UPSTASH';
  }
  
  return null;
}

console.log('\n🎯 FINAL RESULT:');
try {
  const result = validateRedisForCriticalOps('Gift mapping lookup');
  console.log('Redis connection would be:', result);
} catch (error) {
  console.log('Would throw error:', error.message);
}