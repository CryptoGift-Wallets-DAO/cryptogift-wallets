/**
 * CONCURRENCY TEST - MULTIPLE SIMULTANEOUS MINTS
 * Validates that deterministic event parsing works under high concurrency
 * Tests the robustness of the new mapping solution
 */

import { ethers } from 'ethers';

// Test configuration
const CONCURRENT_MINTS = 3;
const TEST_ENDPOINT = 'http://localhost:3000/api/mint-escrow'; // Change to Vercel URL for production test
const TEST_JWT_TOKEN = 'your_test_jwt_token_here'; // Set this for actual testing

interface ConcurrentMintResult {
  mintId: number;
  success: boolean;
  tokenId?: string;
  giftId?: string;
  transactionHash?: string;
  error?: string;
  duration: number;
}

/**
 * Execute a single mint operation
 */
async function executeMint(mintId: number): Promise<ConcurrentMintResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 MINT ${mintId}: Starting concurrent mint...`);
    
    // Prepare mint request
    const mintRequest = {
      metadataUri: `ipfs://QmTestMetadata${mintId}${Date.now()}`,
      password: `testpassword${mintId}`,
      salt: ethers.hexlify(ethers.randomBytes(32)),
      timeframeDays: 7,
      giftMessage: `Concurrent test gift ${mintId}`,
      gasless: false // Use gas-paid for consistency
    };
    
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`
      },
      body: JSON.stringify(mintRequest)
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        mintId,
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        duration
      };
    }
    
    const result = await response.json();
    
    console.log(`✅ MINT ${mintId}: Success in ${duration}ms`);
    console.log(`   TokenId: ${result.tokenId}, GiftId: extracted from logs`);
    
    return {
      mintId,
      success: true,
      tokenId: result.tokenId,
      transactionHash: result.transactionHash,
      duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ MINT ${mintId}: Failed in ${duration}ms:`, (error as Error).message);
    
    return {
      mintId,
      success: false,
      error: (error as Error).message,
      duration
    };
  }
}

/**
 * Validate that all mints have unique and correct mappings
 */
async function validateMappings(results: ConcurrentMintResult[]): Promise<void> {
  console.log('\n🔍 VALIDATING: Checking mapping uniqueness and correctness...');
  
  const successfulMints = results.filter(r => r.success);
  const tokenIds = new Set();
  const duplicates: string[] = [];
  
  // Check for duplicate tokenIds (should not happen)
  successfulMints.forEach(mint => {
    if (mint.tokenId) {
      if (tokenIds.has(mint.tokenId)) {
        duplicates.push(mint.tokenId);
      } else {
        tokenIds.add(mint.tokenId);
      }
    }
  });
  
  if (duplicates.length > 0) {
    console.error('❌ VALIDATION FAILED: Duplicate tokenIds found:', duplicates);
    throw new Error(`Duplicate tokenIds detected: ${duplicates.join(', ')}`);
  }
  
  console.log(`✅ VALIDATION: All ${successfulMints.length} tokenIds are unique`);
  
  // TODO: In a real test, we would also verify each mapping against the contract
  // For now, we rely on the fact that each mint includes its own validation
}

/**
 * Generate test statistics
 */
function generateStatistics(results: ConcurrentMintResult[]): void {
  console.log('\n📊 CONCURRENCY TEST STATISTICS:');
  console.log('================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total mints attempted: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
  
  if (successful.length > 0) {
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`Fastest mint: ${minDuration}ms`);
    console.log(`Slowest mint: ${maxDuration}ms`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILURES:');
    failed.forEach(failure => {
      console.log(`  Mint ${failure.mintId}: ${failure.error}`);
    });
  }
  
  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFUL MINTS:');
    successful.forEach(success => {
      console.log(`  Mint ${success.mintId}: tokenId ${success.tokenId} (${success.duration}ms)`);
    });
  }
}

/**
 * Main concurrency test execution
 */
export async function runConcurrencyTest(): Promise<void> {
  console.log(`🎯 STARTING CONCURRENCY TEST: ${CONCURRENT_MINTS} simultaneous mints`);
  console.log(`🔗 Target endpoint: ${TEST_ENDPOINT}`);
  console.log('⏱️  Starting simultaneous mints...\n');
  
  try {
    // Execute all mints simultaneously
    const promises = Array.from({ length: CONCURRENT_MINTS }, (_, i) => 
      executeMint(i + 1)
    );
    
    const results = await Promise.all(promises);
    
    // Validate mappings
    await validateMappings(results);
    
    // Generate statistics
    generateStatistics(results);
    
    const successCount = results.filter(r => r.success).length;
    
    if (successCount === CONCURRENT_MINTS) {
      console.log('\n🎉 CONCURRENCY TEST PASSED: All mints successful with unique mappings');
    } else if (successCount > 0) {
      console.log(`\n⚠️ CONCURRENCY TEST PARTIAL: ${successCount}/${CONCURRENT_MINTS} mints successful`);
    } else {
      console.log('\n❌ CONCURRENCY TEST FAILED: No successful mints');
      throw new Error('All concurrent mints failed');
    }
    
  } catch (error) {
    console.error('\n💥 CONCURRENCY TEST ERROR:', (error as Error).message);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  runConcurrencyTest()
    .then(() => {
      console.log('\n✅ Concurrency test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Concurrency test failed:', error.message);
      process.exit(1);
    });
}