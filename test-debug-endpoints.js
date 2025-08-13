#!/usr/bin/env node

/**
 * FASE 7A: Test Debug Endpoints Functionality
 * 
 * Tests debug endpoint access in development vs production mode
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;

async function testDebugEndpoint(endpoint, description, useToken = false) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 Endpoint: ${BASE_URL}${endpoint}`);
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (useToken && ADMIN_TOKEN) {
    headers['X-Admin-Token'] = ADMIN_TOKEN;
    console.log('🔐 Using admin token for authentication');
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawResponse: text };
    }
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`🔍 Response: ${JSON.stringify(data, null, 2)}`);
    
    if (response.ok) {
      console.log('✅ Test PASSED');
      return true;
    } else {
      console.log('❌ Test FAILED');
      return false;
    }
  } catch (error) {
    console.log(`💥 Request failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🔥 FASE 7A: Debug Endpoints Functionality Test');
  console.log('============================================');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`🔐 Admin Token: ${ADMIN_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'not set'}`);
  
  const results = [];
  
  // Test 1: Latest error endpoint (basic functionality)
  results.push(await testDebugEndpoint(
    '/api/debug/latest-error',
    'Latest Error Debug Endpoint'
  ));
  
  // Test 2: Mint logs endpoint (core for our debugging)
  results.push(await testDebugEndpoint(
    '/api/debug/mint-logs',
    'Mint Logs Debug Endpoint'  
  ));
  
  // Test 3: Add a test log (POST functionality)
  console.log('\n🧪 Testing: POST test log functionality');
  try {
    const response = await fetch(`${BASE_URL}/api/debug/mint-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_TOKEN ? { 'X-Admin-Token': ADMIN_TOKEN } : {})
      },
      body: JSON.stringify({
        level: 'INFO',
        step: 'FASE_7A_TEST',
        data: { message: 'Debug endpoints enabled successfully', timestamp: new Date().toISOString() }
      })
    });
    
    const data = await response.json();
    console.log(`📊 POST Status: ${response.status}`);
    console.log(`🔍 POST Response: ${JSON.stringify(data, null, 2)}`);
    results.push(response.ok);
  } catch (error) {
    console.log(`💥 POST test failed: ${error.message}`);
    results.push(false);
  }
  
  // Test 4: Verify test log was added
  results.push(await testDebugEndpoint(
    '/api/debug/mint-logs',
    'Verify Test Log Added'
  ));
  
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log('\n🎯 FASE 7A TEST SUMMARY');
  console.log('===================');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Debug endpoints are functional!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed - check configuration');
    process.exit(1);
  }
}

runTests().catch(console.error);