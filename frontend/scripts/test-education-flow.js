/**
 * TEST EDUCATION FLOW END-TO-END
 * Tests the complete pre-claim education system
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

const axios = require('axios');
const { ethers } = require('ethers');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TOKEN_ID = process.env.TEST_TOKEN_ID || '1';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123';
const TEST_DEVICE_ID = 'test-device-' + Date.now();

// Test data
const TEST_MODULES = [1, 2]; // Wallet Security + Basic Security
const QUIZ_ANSWERS = {
  1: { // Wallet Security Module
    q1: 1, // Paper wallet
    q2: 1, // metamask.io verification
    q3: 2  // Never share seed phrase
  },
  2: { // Basic Security Module
    q1: 1, // Phishing most common
    q2: 2  // Don't touch free tokens
  }
};

/**
 * Step 1: Test Pre-Claim Validation
 */
async function testPreClaimValidation() {
  console.log('\n📋 Step 1: Testing Pre-Claim Validation...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/pre-claim/validate`, {
      tokenId: TEST_TOKEN_ID,
      password: TEST_PASSWORD,
      salt: ethers.hexlify(ethers.randomBytes(32)),
      deviceId: TEST_DEVICE_ID
    });
    
    const { valid, requiresEducation, educationRequirements, sessionToken } = response.data;
    
    console.log('✅ Validation response received:');
    console.log('  - Password valid:', valid);
    console.log('  - Education required:', requiresEducation);
    console.log('  - Session token:', sessionToken?.slice(0, 20) + '...');
    
    if (educationRequirements) {
      console.log('  - Required modules:', educationRequirements.map(m => m.name).join(', '));
    }
    
    return { success: true, sessionToken, requiresEducation, modules: educationRequirements };
    
  } catch (error) {
    console.error('❌ Pre-claim validation failed:', error.response?.data || error.message);
    return { success: false };
  }
}

/**
 * Step 2: Test Getting Education Requirements
 */
async function testGetRequirements(sessionToken) {
  console.log('\n📋 Step 2: Testing Get Education Requirements...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/education/get-requirements`, {
      sessionToken
    });
    
    const { modules, completed, remaining, details } = response.data;
    
    console.log('✅ Requirements retrieved:');
    console.log('  - Total modules:', modules.length);
    console.log('  - Completed:', completed.length);
    console.log('  - Remaining:', remaining.length);
    
    if (details) {
      details.forEach(module => {
        console.log(`  - ${module.name}: ${module.completed ? '✓' : '○'} (${module.estimatedTime} min)`);
      });
    }
    
    return { success: true, modules, remaining };
    
  } catch (error) {
    console.error('❌ Get requirements failed:', error.response?.data || error.message);
    return { success: false };
  }
}

/**
 * Step 3: Test Completing Education Modules
 */
async function testCompleteModules(sessionToken, modules) {
  console.log('\n📋 Step 3: Testing Module Completion...');
  
  for (const moduleId of modules) {
    console.log(`\n  Testing Module ${moduleId}...`);
    
    try {
      // Simulate quiz completion with perfect score
      const response = await axios.post(`${BASE_URL}/api/education/complete-module`, {
        sessionToken,
        moduleId,
        score: 100, // Perfect score
        tokenId: TEST_TOKEN_ID
      });
      
      const { allModulesCompleted, remainingModules, approvalGranted } = response.data;
      
      console.log(`  ✅ Module ${moduleId} completed`);
      console.log(`    - All modules done: ${allModulesCompleted}`);
      console.log(`    - Remaining: ${remainingModules?.length || 0}`);
      console.log(`    - Approval granted: ${approvalGranted}`);
      
      if (allModulesCompleted) {
        console.log('\n🎉 All education modules completed! Approval granted.');
        return { success: true, approvalGranted: true };
      }
      
    } catch (error) {
      console.error(`  ❌ Module ${moduleId} completion failed:`, error.response?.data || error.message);
      return { success: false };
    }
  }
  
  return { success: true, approvalGranted: false };
}

/**
 * Step 4: Test Re-validation After Education
 */
async function testPostEducationValidation() {
  console.log('\n📋 Step 4: Testing Post-Education Validation...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/pre-claim/validate`, {
      tokenId: TEST_TOKEN_ID,
      password: TEST_PASSWORD,
      salt: ethers.hexlify(ethers.randomBytes(32)),
      deviceId: TEST_DEVICE_ID
    });
    
    const { valid, requiresEducation } = response.data;
    
    console.log('✅ Post-education validation:');
    console.log('  - Password valid:', valid);
    console.log('  - Education required:', requiresEducation);
    
    if (!requiresEducation) {
      console.log('  ✓ User can now proceed to claim!');
      return { success: true, canClaim: true };
    } else {
      console.log('  ⚠️ Education still required (unexpected)');
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ Post-education validation failed:', error.response?.data || error.message);
    return { success: false };
  }
}

/**
 * Main test runner
 */
async function runEducationFlowTest() {
  console.log('========================================');
  console.log('🎓 EDUCATION FLOW END-TO-END TEST');
  console.log('========================================');
  console.log('Configuration:');
  console.log('  - Base URL:', BASE_URL);
  console.log('  - Token ID:', TEST_TOKEN_ID);
  console.log('  - Device ID:', TEST_DEVICE_ID);
  
  let allTestsPassed = true;
  
  // Step 1: Initial validation
  console.log('\n--- PHASE 1: PRE-CLAIM VALIDATION ---');
  const validationResult = await testPreClaimValidation();
  if (!validationResult.success) {
    console.error('\n❌ TEST FAILED: Pre-claim validation failed');
    return false;
  }
  
  const { sessionToken, requiresEducation, modules } = validationResult;
  
  if (!requiresEducation) {
    console.log('\n⚠️ No education required for this gift. Test complete.');
    return true;
  }
  
  // Step 2: Get requirements
  console.log('\n--- PHASE 2: EDUCATION REQUIREMENTS ---');
  const requirementsResult = await testGetRequirements(sessionToken);
  if (!requirementsResult.success) {
    console.error('\n❌ TEST FAILED: Could not get requirements');
    return false;
  }
  
  // Step 3: Complete modules
  console.log('\n--- PHASE 3: MODULE COMPLETION ---');
  const moduleIds = requirementsResult.modules || TEST_MODULES;
  const completionResult = await testCompleteModules(sessionToken, moduleIds);
  if (!completionResult.success) {
    console.error('\n❌ TEST FAILED: Module completion failed');
    return false;
  }
  
  // Step 4: Verify approval
  console.log('\n--- PHASE 4: APPROVAL VERIFICATION ---');
  const postEducationResult = await testPostEducationValidation();
  if (!postEducationResult.success || !postEducationResult.canClaim) {
    console.error('\n❌ TEST FAILED: Post-education validation failed');
    return false;
  }
  
  // Summary
  console.log('\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================');
  console.log('✅ Pre-claim validation: PASSED');
  console.log('✅ Education requirements: PASSED');
  console.log('✅ Module completion: PASSED');
  console.log('✅ Approval verification: PASSED');
  console.log('\n🎉 ALL TESTS PASSED! Education flow working correctly.');
  
  return true;
}

// Run tests if called directly
if (require.main === module) {
  runEducationFlowTest()
    .then(success => {
      if (success) {
        console.log('\n✅ Test suite completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Test suite failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { runEducationFlowTest };