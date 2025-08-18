#!/usr/bin/env node

/**
 * TEST TOKEN 187 FIX
 * Validates that the architectural fix resolves the password validation issue
 * Tests the pre-claim/validate API with the production deployment
 */

const TOKEN_ID = '187';
const PASSWORD = 'Rafael1996.C';
const ORIGINAL_SALT = '0x4888c1468d952f17cd30b5b0ef7e2f36f0b655babfa141a9fdc71dbac10615b5';
const WRONG_SALT = '0x9a10007167c9dca883452c0aca65240e9db8a9a4cbc38574d2941200fab1dd51'; // Frontend generated salt

console.log('🧪 TESTING TOKEN 187 ARCHITECTURAL FIX');
console.log('======================================');
console.log(`Token: ${TOKEN_ID}`);
console.log(`Password: ${PASSWORD}`);
console.log(`Original Salt: ${ORIGINAL_SALT.slice(0, 20)}...`);
console.log(`Wrong Salt: ${WRONG_SALT.slice(0, 20)}...`);

async function testPasswordValidation(salt, testName) {
  try {
    console.log(`\n🧪 TEST: ${testName}`);
    console.log(`Using salt: ${salt.slice(0, 20)}...`);
    
    const testData = {
      tokenId: TOKEN_ID,
      password: PASSWORD,
      salt: salt,
      deviceId: 'test_architectural_fix_' + Date.now()
    };
    
    console.log('📤 Sending API request...');
    
    const response = await fetch('https://cryptogift-wallets.vercel.app/api/pre-claim/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    
    console.log(`📋 API Response:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Valid: ${data.valid}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Error: ${data.error || 'None'}`);
    
    if (data.valid) {
      console.log('✅ SUCCESS: Password validation passed!');
      console.log('🔧 ARCHITECTURAL FIX: The API correctly retrieved and used the original mint salt');
    } else {
      console.log('❌ FAILED: Password validation failed');
      if (data.error) {
        console.log(`   Reason: ${data.error}`);
      }
    }
    
    return data.valid;
    
  } catch (error) {
    console.error(`💥 TEST FAILED: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🔬 RUNNING COMPREHENSIVE TESTS');
  console.log('===============================');
  
  // Test 1: Using wrong salt (should pass because API retrieves original salt)
  const test1Result = await testPasswordValidation(WRONG_SALT, 'WRONG SALT (Should pass with fix)');
  
  // Test 2: Using correct salt (should also pass)
  const test2Result = await testPasswordValidation(ORIGINAL_SALT, 'CORRECT SALT (Should pass)');
  
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=======================');
  console.log(`Test 1 (Wrong salt): ${test1Result ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Correct salt): ${test2Result ? '✅ PASS' : '❌ FAIL'}`);
  
  if (test1Result && test2Result) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('🔧 ARCHITECTURAL FIX CONFIRMED:');
    console.log('   • The API correctly retrieves the original mint salt');
    console.log('   • Password validation works regardless of provided salt');
    console.log('   • The core issue "Invalid password" has been resolved');
    console.log('\n✅ TOKEN 187 FIX IS SUCCESSFUL');
  } else if (test2Result && !test1Result) {
    console.log('\n⚠️  PARTIAL FIX:');
    console.log('   • API works with correct salt');
    console.log('   • API does not retrieve original salt (fallback mode)');
    console.log('   • Manual salt provision required for claims');
  } else {
    console.log('\n❌ FIX NOT WORKING:');
    console.log('   • Password validation still failing');
    console.log('   • Additional investigation required');
  }
}

// Run the comprehensive test
runAllTests();