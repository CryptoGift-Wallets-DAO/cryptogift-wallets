/**
 * TEST RUNNER - Execute concurrency test with proper validation
 * Validates the deterministic event-based mapping solution
 */

import { runConcurrencyTest } from './concurrency-test';

async function runAllTests() {
  console.log('🧪 STARTING COMPREHENSIVE TEST SUITE');
  console.log('=====================================\n');
  
  try {
    // Check environment
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.log('⚠️ NEXT_PUBLIC_APP_URL not set, using localhost');
    }
    
    if (!process.env.TEST_JWT_TOKEN) {
      console.log('⚠️ TEST_JWT_TOKEN not set, test will fail authentication');
      console.log('💡 To run real tests, set TEST_JWT_TOKEN environment variable\n');
    }
    
    // Run concurrency test
    console.log('🎯 TEST 1: Concurrency mapping validation');
    console.log('------------------------------------------');
    await runConcurrencyTest();
    
    console.log('\n✅ ALL TESTS PASSED');
    console.log('====================');
    console.log('🎉 Deterministic event-based mapping validated successfully!');
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED');
    console.error('=====================');
    console.error('Error:', (error as Error).message);
    throw error;
  }
}

// Export for use in other files
export { runAllTests };

// CLI execution
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n🏆 Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error.message);
      process.exit(1);
    });
}