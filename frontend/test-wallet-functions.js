#!/usr/bin/env node

/**
 * Test script para verificar funcionalidades críticas del wallet
 * Ejecutar con: node test-wallet-functions.js
 */

const https = require('https');
const crypto = require('crypto');

// Configuración desde .env.local
const CONFIG = {
  RPC_URL: 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e',
  REDIS_URL: 'https://exotic-alien-13383.upstash.io',
  REDIS_TOKEN: 'ATRHAAIncDE4Y2IyNzI0MmExMzY0Zjc2YTc1ZThkYjhkZDQ0ZjAzZXAxMTMzODM',
  ESCROW_CONTRACT: '0x46175CfC233500DA803841DEef7f2816e7A129E0',
  NFT_CONTRACT: '0xE9F316159a0830114252a96a6B7CA6efD874650F',
  USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  CHAIN_ID: 84532,
  SITE_URL: 'https://cryptogift-wallets.vercel.app',
  TEST_WALLET: '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6',
};

const tests = {
  passed: 0,
  failed: 0,
  errors: []
};

// Color codes para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test 1: Verificar RPC
async function testRPC() {
  log('\n🔍 Testing RPC Connection...', 'cyan');
  
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_blockNumber',
    params: [],
    id: 1
  });

  return new Promise((resolve) => {
    const url = new URL(CONFIG.RPC_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.result) {
            const blockNumber = parseInt(result.result, 16);
            log(`  ✅ RPC Working - Block #${blockNumber}`, 'green');
            tests.passed++;
          } else {
            log(`  ❌ RPC Error: ${JSON.stringify(result)}`, 'red');
            tests.failed++;
            tests.errors.push('RPC failed');
          }
        } catch (err) {
          log(`  ❌ RPC Parse Error: ${err.message}`, 'red');
          tests.failed++;
          tests.errors.push(`RPC error: ${err.message}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      log(`  ❌ RPC Connection Error: ${err.message}`, 'red');
      tests.failed++;
      tests.errors.push(`RPC connection: ${err.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// Test 2: Verificar Redis/Upstash
async function testRedis() {
  log('\n🔍 Testing Redis Connection...', 'cyan');
  
  const testKey = `test_${Date.now()}`;
  const testValue = { test: true, timestamp: Date.now() };

  return new Promise((resolve) => {
    const url = new URL(`${CONFIG.REDIS_URL}/set/${testKey}`);
    const payload = JSON.stringify([JSON.stringify(testValue), 'EX', 60]);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.REDIS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.result === 'OK') {
            log(`  ✅ Redis Working - Key stored: ${testKey}`, 'green');
            tests.passed++;
            // Clean up
            deleteRedisKey(testKey);
          } else {
            log(`  ❌ Redis Error: ${JSON.stringify(result)}`, 'red');
            tests.failed++;
            tests.errors.push('Redis failed');
          }
        } catch (err) {
          log(`  ❌ Redis Parse Error: ${err.message}`, 'red');
          tests.failed++;
          tests.errors.push(`Redis error: ${err.message}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      log(`  ❌ Redis Connection Error: ${err.message}`, 'red');
      tests.failed++;
      tests.errors.push(`Redis connection: ${err.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

function deleteRedisKey(key) {
  const url = new URL(`${CONFIG.REDIS_URL}/del/${key}`);
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.REDIS_TOKEN}`,
    }
  };
  
  const req = https.request(options);
  req.end();
}

// Test 3: Verificar contrato NFT
async function testNFTContract() {
  log('\n🔍 Testing NFT Contract...', 'cyan');
  
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{
      to: CONFIG.NFT_CONTRACT,
      data: '0x18160ddd' // totalSupply()
    }, 'latest'],
    id: 1
  });

  return new Promise((resolve) => {
    const url = new URL(CONFIG.RPC_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.result) {
            const supply = parseInt(result.result, 16);
            log(`  ✅ NFT Contract Working - Total Supply: ${supply}`, 'green');
            tests.passed++;
          } else {
            log(`  ❌ NFT Contract Error: ${JSON.stringify(result)}`, 'red');
            tests.failed++;
            tests.errors.push('NFT contract failed');
          }
        } catch (err) {
          log(`  ❌ NFT Contract Parse Error: ${err.message}`, 'red');
          tests.failed++;
          tests.errors.push(`NFT contract: ${err.message}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      log(`  ❌ NFT Contract Connection Error: ${err.message}`, 'red');
      tests.failed++;
      tests.errors.push(`NFT connection: ${err.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// Test 4: Verificar contrato Escrow
async function testEscrowContract() {
  log('\n🔍 Testing Escrow Contract...', 'cyan');
  
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{
      to: CONFIG.ESCROW_CONTRACT,
      data: '0x7ebee30f' // giftCounter()
    }, 'latest'],
    id: 1
  });

  return new Promise((resolve) => {
    const url = new URL(CONFIG.RPC_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.result) {
            const giftCount = parseInt(result.result, 16);
            log(`  ✅ Escrow Contract Working - Gift Count: ${giftCount}`, 'green');
            tests.passed++;
          } else {
            log(`  ❌ Escrow Contract Error: ${JSON.stringify(result)}`, 'red');
            tests.failed++;
            tests.errors.push('Escrow contract failed');
          }
        } catch (err) {
          log(`  ❌ Escrow Contract Parse Error: ${err.message}`, 'red');
          tests.failed++;
          tests.errors.push(`Escrow contract: ${err.message}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      log(`  ❌ Escrow Contract Connection Error: ${err.message}`, 'red');
      tests.failed++;
      tests.errors.push(`Escrow connection: ${err.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// Test 5: Verificar API endpoints
async function testAPIEndpoints() {
  log('\n🔍 Testing API Endpoints...', 'cyan');
  
  const endpoints = [
    '/api/health',
    '/api/user/nft-wallets?userAddress=' + CONFIG.TEST_WALLET,
    '/api/auth/challenge',
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
}

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const url = new URL(CONFIG.SITE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: path.includes('challenge') ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (path.includes('challenge')) {
      const body = JSON.stringify({ address: CONFIG.TEST_WALLET });
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          log(`  ✅ ${path} - Status ${res.statusCode}`, 'green');
          tests.passed++;
        } else {
          log(`  ❌ ${path} - Status ${res.statusCode}`, 'red');
          tests.failed++;
          tests.errors.push(`API ${path}: ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      log(`  ❌ ${path} - Error: ${err.message}`, 'red');
      tests.failed++;
      tests.errors.push(`API ${path}: ${err.message}`);
      resolve();
    });

    if (path.includes('challenge')) {
      req.write(JSON.stringify({ address: CONFIG.TEST_WALLET }));
    }
    req.end();
  });
}

// Run all tests
async function runTests() {
  log('\n====================================', 'blue');
  log('🧪 WALLET DASHBOARD FUNCTIONALITY TEST', 'blue');
  log('====================================', 'blue');
  
  await testRPC();
  await testRedis();
  await testNFTContract();
  await testEscrowContract();
  await testAPIEndpoints();
  
  log('\n====================================', 'blue');
  log('📊 TEST RESULTS', 'blue');
  log('====================================', 'blue');
  log(`  ✅ Passed: ${tests.passed}`, 'green');
  log(`  ❌ Failed: ${tests.failed}`, tests.failed > 0 ? 'red' : 'green');
  
  if (tests.errors.length > 0) {
    log('\n⚠️  ERRORS FOUND:', 'yellow');
    tests.errors.forEach(err => {
      log(`  - ${err}`, 'red');
    });
  }
  
  if (tests.failed === 0) {
    log('\n🎉 ALL CRITICAL SYSTEMS OPERATIONAL!', 'green');
  } else {
    log('\n⚠️  SOME SYSTEMS NEED ATTENTION!', 'yellow');
  }
}

// Execute tests
runTests().catch(err => {
  log(`\n❌ Fatal Error: ${err.message}`, 'red');
  process.exit(1);
});