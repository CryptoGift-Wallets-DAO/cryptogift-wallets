/**
 * COMPREHENSIVE MINT TEST - WITH EDUCATION REQUIREMENTS
 * Tests the complete mint flow including education requirements storage
 * Discovers why education requirements are not being stored properly
 */

const API_BASE = 'https://cryptogift-wallets.vercel.app';
const TEST_AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHg3NDJkMzVDYzY2MzRDMDUzMjkyNWEzYjhEOGRlOEUwMGVEMTRjMGQ4IiwiZXhwIjoxNzM0Nzc0MDAwfQ.demo'; // Dummy token for test

async function testMintWithEducation() {
  console.log('🧪 TESTING: Complete mint flow with education requirements...\n');
  
  try {
    // Step 1: Test JWT authentication endpoint
    console.log('1️⃣ TESTING JWT AUTH...');
    
    const authResponse = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
      }
    });
    
    console.log('Auth status:', authResponse.status);
    if (authResponse.status === 401) {
      console.log('❌ Expected: Authentication will fail with demo token\n');
    }
    
    // Step 2: Test mint endpoint with education
    console.log('2️⃣ TESTING MINT API (without auth - should fail gracefully)...');
    
    const mintPayload = {
      imageUrl: 'https://gateway.thirdweb.com/ipfs/QmTestImage',
      message: 'Test gift with education requirements',
      timeframeDays: 30,
      password: 'TestPassword123',
      recipient: '0x742d35Cc6634C0532925a3b8D8de8E00eD14c0d8',
      educationModules: [1, 2] // CRITICAL: Include education modules
    };
    
    const mintResponse = await fetch(`${API_BASE}/api/mint-escrow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
      },
      body: JSON.stringify(mintPayload)
    });
    
    const mintResult = await mintResponse.json();
    console.log('Mint response status:', mintResponse.status);
    console.log('Mint response:', JSON.stringify(mintResult, null, 2));
    
    if (mintResult.tokenId) {
      console.log(`\n3️⃣ TESTING EDUCATION DETECTION for token ${mintResult.tokenId}...`);
      
      // Test the gift-has-password API
      const educationResponse = await fetch(`${API_BASE}/api/gift-has-password?tokenId=${mintResult.tokenId}`);
      const educationResult = await educationResponse.json();
      
      console.log('Education detection result:', JSON.stringify(educationResult, null, 2));
      
      if (educationResult.hasEducation) {
        console.log('✅ SUCCESS: Education requirements detected!');
      } else {
        console.log('❌ FAILURE: Education requirements NOT detected');
        console.log('   Reason:', educationResult.reason);
        console.log('   DataSource:', educationResult.dataSource);
      }
    }
    
  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
  }
}

// Additional: Test existing tokens
async function testExistingTokens() {
  console.log('\n🔍 TESTING EXISTING TOKENS...\n');
  
  const testTokens = [186, 200, 207]; // Test a range of tokens
  
  for (const tokenId of testTokens) {
    console.log(`Token ${tokenId}:`);
    
    try {
      const response = await fetch(`${API_BASE}/api/gift-has-password?tokenId=${tokenId}`);
      const result = await response.json();
      
      console.log(`  hasEducation: ${result.hasEducation}`);
      console.log(`  reason: ${result.reason}`);
      console.log(`  giftId: ${result.giftId}`);
      console.log(`  dataSource: ${result.dataSource}`);
      console.log('');
      
    } catch (error) {
      console.log(`  ERROR: ${error.message}\n`);
    }
  }
}

async function runFullTest() {
  await testMintWithEducation();
  await testExistingTokens();
  
  console.log('\n📋 ANALYSIS:');
  console.log('- Check if mint API returns giftId in response');
  console.log('- Verify if education modules are properly stored');
  console.log('- Identify where the storage/detection chain breaks');
  console.log('- Compare behavior across different token ranges');
}

runFullTest().catch(console.error);