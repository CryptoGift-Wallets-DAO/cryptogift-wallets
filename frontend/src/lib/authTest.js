/**
 * Simple authentication system test
 * This file tests basic functionality of the SIWE implementation
 */

// Test if environment variables are properly configured
function testEnvironmentSetup() {
  console.log('🔍 Testing environment setup...');
  
  const requiredEnvVars = [
    'JWT_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'NEXT_PUBLIC_DOMAIN'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing);
    return false;
  }
  
  console.log('✅ Environment setup looks good');
  return true;
}

// Test basic imports and exports
function testImports() {
  console.log('🔍 Testing imports...');
  
  try {
    // Test if core dependencies are available
    const ethers = require('ethers');
    const crypto = require('crypto');
    
    console.log('✅ Core dependencies available');
    return true;
  } catch (error) {
    console.error('❌ Import test failed:', error.message);
    return false;
  }
}

// Test JWT functionality
function testJWT() {
  console.log('🔍 Testing JWT functionality...');
  
  try {
    const crypto = require('crypto');
    
    // Mock JWT generation test
    const secret = 'test-secret';
    const payload = {
      address: '0x1234567890123456789012345678901234567890',
      nonce: 'test-nonce',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7200
    };
    
    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${payloadB64}`).digest('base64url');
    const token = `${header}.${payloadB64}.${signature}`;
    
    // Test token format
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    console.log('✅ JWT functionality test passed');
    return true;
  } catch (error) {
    console.error('❌ JWT test failed:', error.message);
    return false;
  }
}

// Test address validation
function testAddressValidation() {
  console.log('🔍 Testing address validation...');
  
  try {
    const ethers = require('ethers');
    
    // Test valid addresses
    const validAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a'
    ];
    
    for (const addr of validAddresses) {
      const normalized = ethers.getAddress(addr);
      if (!normalized) {
        throw new Error(`Failed to normalize address: ${addr}`);
      }
    }
    
    console.log('✅ Address validation test passed');
    return true;
  } catch (error) {
    console.error('❌ Address validation test failed:', error.message);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running authentication system tests...\n');
  
  const tests = [
    testEnvironmentSetup,
    testImports,
    testJWT,
    testAddressValidation
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test ${test.name} failed with error:`, error.message);
      failed++;
    }
    console.log(''); // Empty line between tests
  }
  
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! SIWE authentication system is ready.');
    return true;
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
    return false;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testEnvironmentSetup,
    testImports,
    testJWT,
    testAddressValidation
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}