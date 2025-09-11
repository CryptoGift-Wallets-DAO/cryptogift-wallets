#!/usr/bin/env node

/**
 * PRODUCTION ENVIRONMENT AUDIT
 * Verifies all critical environment variables are correctly set
 */

console.log('🔍 PRODUCTION ENVIRONMENT AUDIT');
console.log('===============================');

// Critical environment variables to check
const criticalVars = {
  'NEXT_PUBLIC_TW_CLIENT_ID': process.env.NEXT_PUBLIC_TW_CLIENT_ID,
  'NEXT_PUBLIC_RPC_URL': process.env.NEXT_PUBLIC_RPC_URL,
  'NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS': process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS,
  'ESCROW_CONTRACT_ADDRESS': process.env.ESCROW_CONTRACT_ADDRESS,
  'NEXT_PUBLIC_CHAIN_ID': process.env.NEXT_PUBLIC_CHAIN_ID,
  'NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS': process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
  'PRIVATE_KEY_DEPLOY': process.env.PRIVATE_KEY_DEPLOY,
  'KV_REST_API_URL': process.env.KV_REST_API_URL,
  'KV_REST_API_TOKEN': process.env.KV_REST_API_TOKEN,
  'UPSTASH_REDIS_REST_URL': process.env.UPSTASH_REDIS_REST_URL,
  'UPSTASH_REDIS_REST_TOKEN': process.env.UPSTASH_REDIS_REST_TOKEN
};

// Expected values (from .env.example and our audit findings)
const expectedValues = {
  'NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS': '0x46175CfC233500DA803841DEef7f2816e7A129E0',
  'ESCROW_CONTRACT_ADDRESS': '0x46175CfC233500DA803841DEef7f2816e7A129E0',
  'NEXT_PUBLIC_CHAIN_ID': '84532',
  'NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS': '0xE9F316159a0830114252a96a6B7CA6efD874650F'
};

console.log('📊 ENVIRONMENT VARIABLES CHECK:');
console.log('================================');

let hasErrors = false;

Object.entries(criticalVars).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const displayValue = value ? 
    (key.includes('PRIVATE_KEY') || key.includes('TOKEN') || key.includes('SECRET')) ? 
      `${value.substring(0, 10)}...` : 
      value : 
    'UNDEFINED';
  
  console.log(`${status} ${key}: ${displayValue}`);
  
  if (!value) {
    hasErrors = true;
  }
  
  // Check expected values
  if (expectedValues[key] && value !== expectedValues[key]) {
    console.log(`   ⚠️  MISMATCH: Expected ${expectedValues[key]}, got ${value}`);
    hasErrors = true;
  }
});

console.log('\n🔍 SPECIFIC CHECKS:');
console.log('==================');

// Check ThirdWeb Client ID format
const twClientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
if (twClientId) {
  if (twClientId.length >= 20) {
    console.log('✅ NEXT_PUBLIC_TW_CLIENT_ID: Valid format');
  } else {
    console.log('❌ NEXT_PUBLIC_TW_CLIENT_ID: Too short, might be invalid');
    hasErrors = true;
  }
} else {
  console.log('❌ NEXT_PUBLIC_TW_CLIENT_ID: Missing');
  hasErrors = true;
}

// Check RPC URL format
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
if (rpcUrl) {
  if (rpcUrl.includes('alchemy.com') && rpcUrl.includes('base-sepolia')) {
    console.log('✅ NEXT_PUBLIC_RPC_URL: Valid Alchemy Base Sepolia URL');
  } else {
    console.log('⚠️  NEXT_PUBLIC_RPC_URL: Non-standard URL format');
  }
} else {
  console.log('❌ NEXT_PUBLIC_RPC_URL: Missing');
  hasErrors = true;
}

// Check contract addresses format (case-sensitive)
const escrowAddr1 = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
const escrowAddr2 = process.env.ESCROW_CONTRACT_ADDRESS;

if (escrowAddr1 && escrowAddr2) {
  if (escrowAddr1 === escrowAddr2) {
    console.log('✅ ESCROW_CONTRACT_ADDRESS: Both variables match');
  } else {
    console.log('❌ ESCROW_CONTRACT_ADDRESS: Mismatch between NEXT_PUBLIC_ and regular versions');
    console.log(`   NEXT_PUBLIC_: ${escrowAddr1}`);
    console.log(`   Regular:      ${escrowAddr2}`);
    hasErrors = true;
  }
  
  // Check exact case
  const expectedAddr = '0x46175CfC233500DA803841DEef7f2816e7A129E0';
  if (escrowAddr1 === expectedAddr) {
    console.log('✅ ESCROW_CONTRACT_ADDRESS: Exact case match');
  } else {
    console.log('❌ ESCROW_CONTRACT_ADDRESS: Case mismatch (case-sensitive!)');
    console.log(`   Expected: ${expectedAddr}`);
    console.log(`   Actual:   ${escrowAddr1}`);
    hasErrors = true;
  }
}

// Check Redis configuration
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (kvUrl && kvToken) {
  console.log('✅ REDIS: Configuration present');
  if (kvUrl.includes('upstash.io')) {
    console.log('✅ REDIS: Valid Upstash URL');
  } else {
    console.log('⚠️  REDIS: Non-Upstash URL');
  }
} else {
  console.log('❌ REDIS: Missing configuration (KV_REST_API_* or UPSTASH_REDIS_REST_*)');
  hasErrors = true;
}

console.log('\n📊 AUDIT SUMMARY:');
console.log('=================');

if (hasErrors) {
  console.log('❌ AUDIT FAILED: Critical environment variables have issues');
  console.log('🔧 REQUIRED ACTIONS:');
  console.log('   1. Fix missing or incorrect environment variables');
  console.log('   2. Ensure exact case sensitivity for contract addresses');
  console.log('   3. Verify RPC URL is accessible');
  console.log('   4. Confirm Redis configuration');
  process.exit(1);
} else {
  console.log('✅ AUDIT PASSED: All critical environment variables are correctly configured');
}

console.log('\n🎯 NEXT STEPS:');
console.log('==============');
console.log('1. Deploy these fixes to production');
console.log('2. Test password validation with token 186');
console.log('3. Monitor logs for improved debugging output');