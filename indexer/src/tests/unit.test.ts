/**
 * 🧪 Unit Tests - Critical functionality validation
 * Minimal but essential tests for core components
 */

import { decodeEventLog } from 'viem';
import { GIFT_EVENT_ABI } from '../config.js';
import { validateGiftMapping } from '../database.js';
import { processLog } from '../event-processor.js';

// Mock Log for testing
const mockLog = {
  address: '0x46175CfC233500DA803841DEef7f2816e7A129E0',
  blockHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  blockNumber: BigInt(28915001),
  data: '0x0000000000000000000000000000000000000000000000000000000000000044000000000000000000000000000000000000000000000000000000006750b2500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000134865792074686973206973206120746573742100000000000000000000000000',
  logIndex: 0,
  removed: false,
  topics: [
    '0x3b7b75d2b3f6e0c8e9a1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3',
    '0x0000000000000000000000000000000000000000000000000000000000000001', // giftId
    '0x000000000000000000000000742d35cc6e9d9f1e6f4e8f8a9b3d9c8d9e0f1a2b', // creator
    '0x000000000000000000000000a1b2c3d4e5f6789012345678901234567890abcd'  // nftContract
  ],
  transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  transactionIndex: 0
} as any;

// Simple test runner that runs immediately
async function runAllTests() {
  console.log('\n🧪 Running CryptoGift Indexer Unit Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Event Decoding  
  console.log('📦 Testing Event Decoding...');
  try {
    const decoded = decodeEventLog({
      abi: GIFT_EVENT_ABI,
      data: mockLog.data,
      topics: mockLog.topics
    });
    
    if (decoded.eventName === 'GiftRegisteredFromMint' && decoded.args) {
      console.log('  ✅ Valid event decoding');
      passed++;
    } else {
      console.log('  ❌ Event decoding failed');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ Event decoding error:', error.message);
    failed++;
  }
  
  // Test 2: Invalid Event Handling
  try {
    decodeEventLog({
      abi: GIFT_EVENT_ABI,
      data: '0xinvalid',
      topics: mockLog.topics
    });
    console.log('  ❌ Should have rejected invalid data');
    failed++;
  } catch (error) {
    console.log('  ✅ Invalid event data rejected correctly');
    passed++;
  }
  
  // Test 3: Data Validation  
  try {
    validateGiftMapping({
      contractAddr: '0x46175CfC233500DA803841DEef7f2816e7A129E0',
      tokenId: '68',
      giftId: '1',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      logIndex: 0,
      blockNumber: 28915001
    });
    console.log('  ✅ Valid mapping accepted');
    passed++;
  } catch (error) {
    console.log('  ❌ Valid mapping rejected:', error.message);
    failed++;
  }
  
  // Test 4: Invalid Address Validation
  try {
    validateGiftMapping({
      contractAddr: 'invalid_address',
      tokenId: '68', 
      giftId: '1',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      logIndex: 0,
      blockNumber: 28915001
    });
    console.log('  ❌ Should have rejected invalid address');
    failed++;
  } catch (error) {
    console.log('  ✅ Invalid address rejected correctly');
    passed++;
  }
  
  // Test 5: Block Number Validation
  try {
    validateGiftMapping({
      contractAddr: '0x46175CfC233500DA803841DEef7f2816e7A129E0',
      tokenId: '68',
      giftId: '1', 
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      logIndex: 0,
      blockNumber: 1000 // Before deployment
    });
    console.log('  ❌ Should have rejected low block number');
    failed++;
  } catch (error) {
    console.log('  ✅ Low block number rejected correctly');
    passed++;
  }
  
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Core functionality validated.');
  } else {
    console.log(`⚠️ ${failed} test(s) failed - review before deployment`);
  }
  
  return { passed, failed };
}

// Run tests immediately when file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}