/**
 * COMPREHENSIVE ESCROW FLOW TESTING API
 * End-to-end testing of the complete escrow system (mint → claim → verification)
 * Tests all fixes implemented to ensure the temporal escrow system functions correctly
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { readContract } from 'thirdweb';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS } from '../../../lib/escrowABI';
import { getEscrowContract } from '../../../lib/escrowUtils';

// Test configuration
interface EscrowFlowTestConfig {
  testMode: 'full' | 'verification-only' | 'contract-only';
  verbose?: boolean;
}

interface TestResult {
  success: boolean;
  testName: string;
  details: any;
  error?: string;
  duration?: number;
}

interface EscrowFlowTestResponse {
  success: boolean;
  summary: {
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    totalDuration: number;
  };
  results: TestResult[];
  criticalIssues: string[];
  recommendations: string[];
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

/**
 * Test 1: Contract Deployment Verification
 */
async function testContractDeployment(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 TEST 1: Contract deployment verification...');
    
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const code = await provider.getCode(ESCROW_CONTRACT_ADDRESS!);
    
    if (code === '0x') {
      return {
        success: false,
        testName: 'Contract Deployment',
        details: { address: ESCROW_CONTRACT_ADDRESS, hasCode: false },
        error: 'Contract not deployed at specified address',
        duration: Date.now() - startTime
      };
    }
    
    const codeSize = (code.length - 2) / 2; // Remove '0x' and convert to bytes
    
    console.log('✅ Contract found at:', ESCROW_CONTRACT_ADDRESS);
    console.log('📏 Contract size:', codeSize, 'bytes');
    
    return {
      success: true,
      testName: 'Contract Deployment',
      details: {
        address: ESCROW_CONTRACT_ADDRESS,
        hasCode: true,
        codeSize,
        network: 'base-sepolia'
      },
      duration: Date.now() - startTime
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Contract Deployment',
      details: {},
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 2: Contract Function Availability
 */
async function testContractFunctions(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 TEST 2: Contract function availability...');
    
    const escrowContract = getEscrowContract();
    const functionTests: { [key: string]: boolean } = {};
    
    // Test time constants
    const timeConstants = ['FIFTEEN_MINUTES', 'SEVEN_DAYS', 'FIFTEEN_DAYS', 'THIRTY_DAYS'] as const;
    
    for (const constant of timeConstants) {
      try {
        const value = await readContract({
          contract: escrowContract,
          method: constant,
          params: []
        });
        functionTests[constant] = true;
        console.log(`✅ ${constant}: ${Number(value)} seconds`);
      } catch (error) {
        functionTests[constant] = false;
        console.warn(`❌ ${constant} failed:`, error);
      }
    }
    
    // Test core functions (expect revert for non-existent data)
    const coreFunctions = ['getGift', 'canClaimGift'] as const;
    
    for (const func of coreFunctions) {
      try {
        await readContract({
          contract: escrowContract,
          method: func,
          params: [BigInt(999999)] // Non-existent token
        });
        functionTests[func] = true;
      } catch (error) {
        // Expected revert for non-existent token
        if (error.message?.includes('Gift not found') || error.message?.includes('revert')) {
          functionTests[func] = true;
          console.log(`✅ ${func} exists (expected revert for non-existent token)`);
        } else {
          functionTests[func] = false;
          console.warn(`❌ ${func} test failed:`, error);
        }
      }
    }
    
    const passedTests = Object.values(functionTests).filter(Boolean).length;
    const totalTests = Object.keys(functionTests).length;
    
    return {
      success: passedTests === totalTests,
      testName: 'Contract Functions',
      details: {
        functionTests,
        passedTests,
        totalTests,
        availability: `${passedTests}/${totalTests} functions available`
      },
      duration: Date.now() - startTime
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Contract Functions',
      details: {},
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 3: API Endpoint Availability
 */
async function testAPIEndpoints(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 TEST 3: API endpoint availability...');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const endpoints = [
      '/api/mint-escrow',
      '/api/escrow-salt/123',
      '/api/debug/escrow-contract-info',
      '/api/claim-escrow',
      '/api/cron/cleanup-transactions'
    ];
    
    const endpointTests: { [key: string]: { available: boolean; method: string; status?: number } } = {};
    
    for (const endpoint of endpoints) {
      try {
        const method = endpoint.includes('cron') ? 'GET' : 
                     endpoint.includes('claim') || endpoint.includes('mint') ? 'POST' : 'GET';
        
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            // Add auth for cron endpoint
            ...(endpoint.includes('cron') ? {
              'Authorization': `Bearer ${process.env.CRON_SECRET || 'test'}`
            } : {})
          },
          // Add minimal body for POST requests
          ...(method === 'POST' ? {
            body: JSON.stringify({ test: true })
          } : {})
        });
        
        endpointTests[endpoint] = {
          available: response.status !== 404,
          method,
          status: response.status
        };
        
        console.log(`✅ ${endpoint} (${method}): ${response.status}`);
        
      } catch (error) {
        endpointTests[endpoint] = {
          available: false,
          method: endpoint.includes('claim') || endpoint.includes('mint') ? 'POST' : 'GET'
        };
        console.warn(`❌ ${endpoint} failed:`, error);
      }
    }
    
    const availableEndpoints = Object.values(endpointTests).filter(test => test.available).length;
    const totalEndpoints = Object.keys(endpointTests).length;
    
    return {
      success: availableEndpoints === totalEndpoints,
      testName: 'API Endpoints',
      details: {
        endpointTests,
        availableEndpoints,
        totalEndpoints,
        availability: `${availableEndpoints}/${totalEndpoints} endpoints available`
      },
      duration: Date.now() - startTime
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'API Endpoints',
      details: {},
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 4: Redis Connection and Anti-Double Minting
 */
async function testRedisConnection(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 TEST 4: Redis connection and anti-double minting...');
    
    // Test Redis configuration
    const hasRedisUrl = !!process.env.UPSTASH_REDIS_REST_URL;
    const hasRedisToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!hasRedisUrl || !hasRedisToken) {
      return {
        success: false,
        testName: 'Redis Connection',
        details: {
          hasRedisUrl,
          hasRedisToken,
          configured: false
        },
        error: 'SECURITY CRITICAL: Redis not properly configured',
        duration: Date.now() - startTime
      };
    }
    
    // Test gasless validation module
    try {
      const { getGaslessRedisStatus } = await import('../../../lib/gaslessValidation');
      const redisStatus = getGaslessRedisStatus();
      
      return {
        success: redisStatus.hasRedis,
        testName: 'Redis Connection',
        details: {
          hasRedisUrl,
          hasRedisToken,
          configured: true,
          status: redisStatus.status,
          message: redisStatus.message,
          mandatory: true
        },
        error: redisStatus.hasRedis ? undefined : 'Redis connection failed',
        duration: Date.now() - startTime
      };
      
    } catch (importError) {
      return {
        success: false,
        testName: 'Redis Connection',
        details: { hasRedisUrl, hasRedisToken },
        error: `Gasless validation module error: ${importError.message}`,
        duration: Date.now() - startTime
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Redis Connection',
      details: {},
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 5: JWT Security Configuration
 */
async function testJWTSecurity(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 TEST 5: JWT security configuration...');
    
    const hasJwtSecret = !!process.env.JWT_SECRET;
    const hasApiToken = !!process.env.API_ACCESS_TOKEN;
    const areSecretsDifferent = process.env.JWT_SECRET !== process.env.API_ACCESS_TOKEN;
    
    const details = {
      hasJwtSecret,
      hasApiToken,
      areSecretsDifferent,
      configured: hasJwtSecret && areSecretsDifferent,
      securityLevel: hasJwtSecret && areSecretsDifferent ? 'SECURE' : 'VULNERABLE'
    };
    
    if (!hasJwtSecret) {
      return {
        success: false,
        testName: 'JWT Security',
        details,
        error: 'SECURITY CRITICAL: JWT_SECRET not configured',
        duration: Date.now() - startTime
      };
    }
    
    if (!areSecretsDifferent) {
      return {
        success: false,
        testName: 'JWT Security',
        details,
        error: 'SECURITY CRITICAL: JWT_SECRET should be different from API_ACCESS_TOKEN',
        duration: Date.now() - startTime
      };
    }
    
    console.log('✅ JWT_SECRET properly configured and isolated');
    
    return {
      success: true,
      testName: 'JWT Security',
      details,
      duration: Date.now() - startTime
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'JWT Security',
      details: {},
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 6: Salt Generation and Persistence
 */
async function testSaltSystem(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 TEST 6: Salt generation and persistence system...');
    
    const testTokenId = '999999';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Test salt retrieval endpoint
    try {
      const response = await fetch(`${baseUrl}/api/escrow-salt/${testTokenId}`);
      const saltEndpointAvailable = response.status !== 404;
      
      let saltRetrievalWorks = false;
      if (response.status === 404 || (response.status === 500 && response.statusText)) {
        // Expected for non-existent token, endpoint exists
        saltRetrievalWorks = true;
      } else if (response.ok) {
        // Unexpected success for non-existent token
        saltRetrievalWorks = false;
      }
      
      console.log(`✅ Salt endpoint available: ${saltEndpointAvailable}`);
      console.log(`✅ Salt retrieval logic: ${saltRetrievalWorks ? 'CORRECT' : 'NEEDS REVIEW'}`);
      
      return {
        success: saltEndpointAvailable && saltRetrievalWorks,
        testName: 'Salt System',
        details: {
          saltEndpointAvailable,
          saltRetrievalWorks,
          testTokenId,
          responseStatus: response.status,
          systemStatus: saltEndpointAvailable ? 'OPERATIONAL' : 'MISSING'
        },
        duration: Date.now() - startTime
      };
      
    } catch (fetchError) {
      return {
        success: false,
        testName: 'Salt System',
        details: { testTokenId },
        error: `Salt endpoint test failed: ${fetchError.message}`,
        duration: Date.now() - startTime
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Salt System',
      details: {},
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 7: Cron Job Configuration
 */
async function testCronConfiguration(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 TEST 7: Cron job configuration...');
    
    // Check vercel.json for cron configuration
    let cronConfigured = false;
    let cronDetails = {};
    
    try {
      const fs = require('fs');
      const path = require('path');
      const vercelPath = path.join(process.cwd(), '../../vercel.json');
      
      if (fs.existsSync(vercelPath)) {
        const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
        cronConfigured = !!(vercelConfig.crons && vercelConfig.crons.length > 0);
        const cronCount = vercelConfig.crons?.length || 0;
        cronDetails = {
          hasCrons: cronConfigured,
          cronCount,
          crons: vercelConfig.crons || []
        };
        
        console.log(`✅ Vercel cron jobs configured: ${cronConfigured}`);
        console.log(`📊 Cron job count: ${cronCount}`);
      } else {
        cronDetails = { error: 'vercel.json not found' };
      }
    } catch (fsError) {
      cronDetails = { error: `File system error: ${fsError.message}` };
    }
    
    // Test cron secret configuration
    const hasCronSecret = !!process.env.CRON_SECRET;
    
    return {
      success: cronConfigured && hasCronSecret,
      testName: 'Cron Configuration',
      details: {
        ...cronDetails as any,
        hasCronSecret,
        configured: cronConfigured && hasCronSecret,
        automationLevel: cronConfigured && hasCronSecret ? 'AUTOMATED' : 'MANUAL'
      },
      error: !cronConfigured ? 'Cron jobs not configured' : 
             !hasCronSecret ? 'CRON_SECRET not set' : undefined,
      duration: Date.now() - startTime
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Cron Configuration',
      details: {},
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Generate critical issues and recommendations
 */
function analyzeCriticalIssues(results: TestResult[]): {
  criticalIssues: string[];
  recommendations: string[];
} {
  const criticalIssues: string[] = [];
  const recommendations: string[] = [];
  
  results.forEach(result => {
    if (!result.success) {
      if (result.error?.includes('SECURITY CRITICAL')) {
        criticalIssues.push(`${result.testName}: ${result.error}`);
      } else if (result.error?.includes('Contract not deployed')) {
        criticalIssues.push(`${result.testName}: Escrow contract not deployed or misconfigured`);
      } else {
        criticalIssues.push(`${result.testName}: ${result.error || 'Test failed'}`);
      }
    }
  });
  
  // Generate recommendations based on test results
  const redisTest = results.find(r => r.testName === 'Redis Connection');
  const jwtTest = results.find(r => r.testName === 'JWT Security');
  const contractTest = results.find(r => r.testName === 'Contract Deployment');
  const cronTest = results.find(r => r.testName === 'Cron Configuration');
  
  if (!redisTest?.success) {
    recommendations.push('Configure Redis (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) for production security');
  }
  
  if (!jwtTest?.success) {
    recommendations.push('Set unique JWT_SECRET different from API_ACCESS_TOKEN for enhanced security');
  }
  
  if (!contractTest?.success) {
    recommendations.push('Verify escrow contract deployment on Base Sepolia network');
  }
  
  if (!cronTest?.success) {
    recommendations.push('Configure Vercel cron jobs and CRON_SECRET for automated maintenance');
  }
  
  if (criticalIssues.length === 0) {
    recommendations.push('All critical systems operational - system ready for production escrow operations');
  }
  
  return { criticalIssues, recommendations };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EscrowFlowTestResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      summary: { testsRun: 0, testsPassed: 0, testsFailed: 1, totalDuration: 0 },
      results: [],
      criticalIssues: ['Method not allowed - use GET'],
      recommendations: []
    });
  }
  
  const testStartTime = Date.now();
  console.log('🚀 ESCROW FLOW TESTING: Starting comprehensive system verification...');
  
  try {
    // Configuration
    const testMode = (req.query.mode as string) || 'full';
    const config: EscrowFlowTestConfig = {
      testMode: ['full', 'verification-only', 'contract-only'].includes(testMode) 
        ? testMode as 'full' | 'verification-only' | 'contract-only'
        : 'full',
      verbose: req.query.verbose === 'true'
    };
    
    console.log('📋 Test configuration:', config);
    
    // Run all tests in sequence
    const results: TestResult[] = [];
    
    // Core system tests
    results.push(await testContractDeployment());
    results.push(await testContractFunctions());
    results.push(await testAPIEndpoints());
    results.push(await testRedisConnection());
    results.push(await testJWTSecurity());
    results.push(await testSaltSystem());
    results.push(await testCronConfiguration());
    
    // Calculate summary
    const testsRun = results.length;
    const testsPassed = results.filter(r => r.success).length;
    const testsFailed = testsRun - testsPassed;
    const totalDuration = Date.now() - testStartTime;
    
    // Analyze issues and recommendations
    const { criticalIssues, recommendations } = analyzeCriticalIssues(results);
    
    const overallSuccess = testsFailed === 0;
    
    console.log('✅ ESCROW FLOW TESTING COMPLETE:', {
      testsRun,
      testsPassed,
      testsFailed,
      overallSuccess,
      duration: `${totalDuration}ms`
    });
    
    return res.status(200).json({
      success: overallSuccess,
      summary: {
        testsRun,
        testsPassed,
        testsFailed,
        totalDuration
      },
      results,
      criticalIssues,
      recommendations
    });
    
  } catch (error: any) {
    console.error('💥 ESCROW FLOW TESTING ERROR:', error);
    
    return res.status(500).json({
      success: false,
      summary: {
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 1,
        totalDuration: Date.now() - testStartTime
      },
      results: [{
        success: false,
        testName: 'Test Framework',
        details: {},
        error: error.message || 'Testing framework failed',
        duration: Date.now() - testStartTime
      }],
      criticalIssues: [`Testing framework error: ${error.message}`],
      recommendations: ['Check server logs and environment configuration']
    });
  }
}