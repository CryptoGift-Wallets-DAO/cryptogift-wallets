#!/usr/bin/env node

/**
 * LIVE TEST SCRIPT: Token 186 Password Validation
 * Protocolo v2: Test en vivo para confirmar el debug logging mejorado
 */

console.log('🧪 LIVE TEST: Token 186 Password Validation');
console.log('===========================================');

const testData = {
  tokenId: '186',
  password: 'REEMPLAZAR_CON_PASSWORD_REAL', // Usuario debe poner la contraseña real aquí
  salt: '0x' + Math.random().toString(16).substring(2).padStart(64, '0'), // Salt aleatorio
  deviceId: 'test_device_' + Date.now()
};

console.log('📋 TEST CONFIGURATION:');
console.log(`  Token ID: ${testData.tokenId}`);
console.log(`  Password: ${testData.password.substring(0, 3)}***${testData.password.substring(testData.password.length - 2)}`);
console.log(`  Salt: ${testData.salt.substring(0, 10)}...`);

async function testPasswordValidation() {
  try {
    console.log('\n🚀 Sending test request to production API...');
    
    const response = await fetch('https://cryptogift-wallets.vercel.app/api/pre-claim/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    
    const responseData = await response.json();
    console.log('📄 Response Data:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.log('❌ Request failed as expected - check the enhanced logs in production for detailed debugging info');
    } else if (responseData.valid) {
      console.log('✅ Password validation succeeded!');
    } else {
      console.log('❌ Password validation failed - enhanced logs should show detailed analysis');
    }

  } catch (error) {
    console.error('💥 Test request failed:', error);
  }
}

console.log('\n⚠️  INSTRUCTIONS:');
console.log('1. Replace "REEMPLAZAR_CON_PASSWORD_REAL" with the actual password');
console.log('2. Run this script: node test-token-186.js');
console.log('3. Check production logs for the enhanced debug information');
console.log('4. Look for logs starting with "🔍 PASSWORD VALIDATION DEBUG - DEEP ANALYSIS"');

console.log('\n🎯 EXPECTED ENHANCED LOG OUTPUT:');
console.log('- Token and Gift mapping information');
console.log('- Password analysis (length, samples)');
console.log('- Salt information and validation');
console.log('- Hash generation details with all parameters');
console.log('- Character-by-character hash comparison on failure');
console.log('- Specific error diagnosis and recommendations');

console.log('\n📊 This enhanced logging will reveal:');
console.log('✓ If tokenId → giftId mapping is working');
console.log('✓ If contract data reading is successful'); 
console.log('✓ Exact hash values being compared');
console.log('✓ Which parameter (password, salt, giftId, contract, chainId) is causing the mismatch');

if (testData.password === 'REEMPLAZAR_CON_PASSWORD_REAL') {
  console.log('\n⏸️  PAUSED: Please replace the password and run again');
} else {
  console.log('\n🚀 RUNNING TEST WITH LIVE DATA...');
  testPasswordValidation();
}