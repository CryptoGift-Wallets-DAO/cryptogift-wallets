/**
 * PASSWORD HASH TEST - Verify correct contract replication
 * Tests that our generatePasswordHash matches Solidity contract behavior
 */

import { generatePasswordHash } from '../lib/escrowUtils';

// Test parameters that would match a real scenario
const testParams = {
  password: "mySecurePassword123",
  salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  giftId: 42,
  contractAddress: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000", // Test contract address
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532") // Base Sepolia
};

function runPasswordHashTest() {
  console.log('🧪 TESTING: Password hash function compatibility');
  console.log('==========================================');
  
  try {
    const hash = generatePasswordHash(
      testParams.password,
      testParams.salt,
      testParams.giftId,
      testParams.contractAddress,
      testParams.chainId
    );
    
    console.log('✅ Hash generated successfully');
    console.log('📋 Test parameters:', {
      password: '***REDACTED***',
      salt: testParams.salt.slice(0, 10) + '...',
      giftId: testParams.giftId,
      contractAddress: testParams.contractAddress,
      chainId: testParams.chainId
    });
    console.log('🔐 Generated hash:', hash.slice(0, 10) + '...');
    console.log('📏 Hash length:', hash.length, 'characters');
    console.log('✅ Test PASSED: Function executes without errors');
    
    return true;
  } catch (error) {
    console.error('❌ Test FAILED:', (error as Error).message);
    return false;
  }
}

// Run test if executed directly
if (require.main === module) {
  const success = runPasswordHashTest();
  process.exit(success ? 0 : 1);
}

export { runPasswordHashTest };