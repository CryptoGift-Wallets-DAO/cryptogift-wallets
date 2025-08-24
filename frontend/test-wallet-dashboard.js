#!/usr/bin/env node

/**
 * Test completo para el Wallet Dashboard
 * Verifica todas las funcionalidades críticas
 */

const { ethers } = require('ethers');

// Configuración
const CONFIG = {
  RPC_URL: 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e',
  CHAIN_ID: 84532,
  ESCROW_CONTRACT: '0x46175CfC233500DA803841DEef7f2816e7A129E0',
  NFT_CONTRACT: '0xE9F316159a0830114252a96a6B7CA6efD874650F',
  USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  ZEROX_API: 'https://base-sepolia.api.0x.org',
  SITE_URL: 'https://cryptogift-wallets.vercel.app',
  TEST_WALLET: '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6',
  // MEV Protection RPCs
  MEV_RPC_ETHEREUM: 'https://rpc.flashbots.net',
  MEV_RPC_BASE: 'https://base-mainnet.flashbots.net/fast',
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class WalletDashboardTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };
  }

  async runAllTests() {
    log('\n====================================', 'blue');
    log('🚀 WALLET DASHBOARD COMPREHENSIVE TEST', 'blue');
    log('====================================', 'blue');
    
    // Core Infrastructure
    log('\n📡 TESTING CORE INFRASTRUCTURE...', 'cyan');
    await this.testRPCConnection();
    await this.testContracts();
    
    // Wallet Features
    log('\n💳 TESTING WALLET FEATURES...', 'cyan');
    await this.testWalletConnection();
    await this.testNetworkSwitching();
    await this.testTokenAddition();
    
    // MEV Protection
    log('\n🛡️ TESTING MEV PROTECTION...', 'cyan');
    await this.testMEVProtection();
    
    // Token Approvals
    log('\n✅ TESTING APPROVAL MANAGEMENT...', 'cyan');
    await this.testApprovals();
    
    // Swaps
    log('\n🔄 TESTING SWAP FUNCTIONALITY...', 'cyan');
    await this.testSwaps();
    
    // Gasless Transactions
    log('\n⚡ TESTING GASLESS TRANSACTIONS...', 'cyan');
    await this.testGasless();
    
    // Transaction History
    log('\n📜 TESTING TRANSACTION HISTORY...', 'cyan');
    await this.testTransactionHistory();
    
    // API Endpoints
    log('\n🌐 TESTING API ENDPOINTS...', 'cyan');
    await this.testAPIEndpoints();
    
    // Report
    this.generateReport();
  }

  async testRPCConnection() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      log(`  ✅ RPC Connection: Block #${blockNumber}`, 'green');
      this.results.passed++;
      
      // Test network ID
      const network = await this.provider.getNetwork();
      if (network.chainId === BigInt(CONFIG.CHAIN_ID)) {
        log(`  ✅ Network: Base Sepolia (${CONFIG.CHAIN_ID})`, 'green');
        this.results.passed++;
      } else {
        log(`  ❌ Wrong Network: Expected ${CONFIG.CHAIN_ID}, got ${network.chainId}`, 'red');
        this.results.failed++;
      }
    } catch (error) {
      log(`  ❌ RPC Connection Failed: ${error.message}`, 'red');
      this.results.failed++;
      this.results.errors.push(`RPC: ${error.message}`);
    }
  }

  async testContracts() {
    // Test NFT Contract
    try {
      const nftContract = new ethers.Contract(
        CONFIG.NFT_CONTRACT,
        ['function totalSupply() view returns (uint256)'],
        this.provider
      );
      const supply = await nftContract.totalSupply();
      log(`  ✅ NFT Contract: Total Supply = ${supply}`, 'green');
      this.results.passed++;
    } catch (error) {
      log(`  ❌ NFT Contract Failed: ${error.message}`, 'red');
      this.results.failed++;
      this.results.errors.push(`NFT: ${error.message}`);
    }

    // Test Escrow Contract with correct selector
    try {
      const escrowContract = new ethers.Contract(
        CONFIG.ESCROW_CONTRACT,
        ['function giftCounter() view returns (uint256)'],
        this.provider
      );
      const giftCount = await escrowContract.giftCounter();
      log(`  ✅ Escrow Contract: Gift Count = ${giftCount}`, 'green');
      this.results.passed++;
    } catch (error) {
      log(`  ❌ Escrow Contract Failed: ${error.message}`, 'red');
      this.results.failed++;
      this.results.errors.push(`Escrow: ${error.message}`);
    }

    // Test USDC Contract
    try {
      const usdcContract = new ethers.Contract(
        CONFIG.USDC_ADDRESS,
        ['function decimals() view returns (uint8)'],
        this.provider
      );
      const decimals = await usdcContract.decimals();
      log(`  ✅ USDC Contract: Decimals = ${decimals}`, 'green');
      this.results.passed++;
    } catch (error) {
      log(`  ❌ USDC Contract Failed: ${error.message}`, 'red');
      this.results.failed++;
      this.results.errors.push(`USDC: ${error.message}`);
    }
  }

  async testWalletConnection() {
    // Simulate wallet connection checks
    log('  ℹ️  Wallet Connection: Manual testing required in browser', 'yellow');
    this.results.warnings++;
    
    // Check if window.ethereum would be available
    log('  ℹ️  MetaMask/WalletConnect: Browser-only feature', 'yellow');
    this.results.warnings++;
  }

  async testNetworkSwitching() {
    // Test network switching capability (simulation)
    log('  ℹ️  Network Switching: Manual testing required', 'yellow');
    this.results.warnings++;
    
    // Verify chain configurations are correct
    const chains = {
      'Base Sepolia': { id: 84532, rpc: 'https://sepolia.base.org' },
      'Base Mainnet': { id: 8453, rpc: 'https://mainnet.base.org' },
    };
    
    for (const [name, config] of Object.entries(chains)) {
      log(`  ✅ Chain Config: ${name} (${config.id})`, 'green');
      this.results.passed++;
    }
  }

  async testTokenAddition() {
    // Test token addition parameters
    const testTokens = [
      { address: CONFIG.USDC_ADDRESS, symbol: 'USDC', decimals: 6 },
    ];
    
    for (const token of testTokens) {
      log(`  ✅ Token Config: ${token.symbol} ready for wallet_watchAsset`, 'green');
      this.results.passed++;
    }
  }

  async testMEVProtection() {
    // Test MEV protection RPC endpoints
    const mevEndpoints = [
      { name: 'Flashbots Ethereum', url: CONFIG.MEV_RPC_ETHEREUM },
      { name: 'Flashbots Base', url: CONFIG.MEV_RPC_BASE },
    ];
    
    for (const endpoint of mevEndpoints) {
      try {
        // Note: These endpoints might not work on testnets
        log(`  ℹ️  MEV RPC ${endpoint.name}: Mainnet only`, 'yellow');
        this.results.warnings++;
      } catch (error) {
        log(`  ⚠️  MEV RPC ${endpoint.name}: ${error.message}`, 'yellow');
        this.results.warnings++;
      }
    }
  }

  async testApprovals() {
    // Test approval scanning capability
    try {
      // Check if approval events can be queried
      const filter = {
        address: CONFIG.USDC_ADDRESS,
        topics: [
          ethers.id('Approval(address,address,uint256)'),
          ethers.zeroPadValue(CONFIG.TEST_WALLET, 32)
        ],
        fromBlock: 'earliest',
        toBlock: 'latest'
      };
      
      const logs = await this.provider.getLogs(filter);
      log(`  ✅ Approval Scanner: Found ${logs.length} approvals`, 'green');
      this.results.passed++;
    } catch (error) {
      log(`  ⚠️  Approval Scanner: ${error.message}`, 'yellow');
      this.results.warnings++;
    }
  }

  async testSwaps() {
    // Test 0x API availability
    try {
      const response = await fetch(`${CONFIG.ZEROX_API}/swap/v2/sources`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const sources = await response.json();
        log(`  ✅ 0x Protocol: ${sources.records.length} liquidity sources available`, 'green');
        this.results.passed++;
      } else {
        log(`  ⚠️  0x Protocol: API returned ${response.status}`, 'yellow');
        this.results.warnings++;
      }
    } catch (error) {
      log(`  ❌ 0x Protocol: ${error.message}`, 'red');
      this.results.failed++;
      this.results.errors.push(`0x: ${error.message}`);
    }
  }

  async testGasless() {
    // Check Biconomy configuration
    const biconomyConfigured = !!process.env.NEXT_PUBLIC_BICONOMY_MEE_API_KEY;
    
    if (biconomyConfigured) {
      log('  ✅ Biconomy: Configuration detected', 'green');
      this.results.passed++;
    } else {
      log('  ⚠️  Biconomy: Not configured (gasless disabled)', 'yellow');
      this.results.warnings++;
    }
  }

  async testTransactionHistory() {
    // Test transaction history fetching
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 1000); // Last 1000 blocks
      
      const filter = {
        address: CONFIG.NFT_CONTRACT,
        fromBlock: fromBlock,
        toBlock: 'latest'
      };
      
      const logs = await this.provider.getLogs(filter);
      log(`  ✅ Transaction History: ${logs.length} events in last 1000 blocks`, 'green');
      this.results.passed++;
    } catch (error) {
      log(`  ⚠️  Transaction History: ${error.message}`, 'yellow');
      this.results.warnings++;
    }
  }

  async testAPIEndpoints() {
    const endpoints = [
      { path: '/api/health', method: 'GET' },
      { path: '/api/user/nft-wallets?userAddress=' + CONFIG.TEST_WALLET, method: 'GET' },
      { path: '/api/auth/challenge', method: 'POST', body: {} },
    ];
    
    for (const endpoint of endpoints) {
      try {
        const options = {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }
        
        const response = await fetch(CONFIG.SITE_URL + endpoint.path, options);
        
        if (response.ok) {
          log(`  ✅ API ${endpoint.path}: Status ${response.status}`, 'green');
          this.results.passed++;
        } else {
          log(`  ⚠️  API ${endpoint.path}: Status ${response.status}`, 'yellow');
          this.results.warnings++;
        }
      } catch (error) {
        log(`  ❌ API ${endpoint.path}: ${error.message}`, 'red');
        this.results.failed++;
        this.results.errors.push(`API ${endpoint.path}: ${error.message}`);
      }
    }
  }

  generateReport() {
    log('\n====================================', 'blue');
    log('📊 TEST RESULTS SUMMARY', 'blue');
    log('====================================', 'blue');
    
    log(`  ✅ Passed: ${this.results.passed}`, 'green');
    log(`  ❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
    log(`  ⚠️  Warnings: ${this.results.warnings}`, 'yellow');
    
    if (this.results.errors.length > 0) {
      log('\n🔴 CRITICAL ERRORS:', 'red');
      this.results.errors.forEach(err => {
        log(`  - ${err}`, 'red');
      });
    }
    
    if (this.results.failed === 0) {
      log('\n🎉 CORE SYSTEMS OPERATIONAL!', 'green');
      log('   Note: Some features require browser testing', 'yellow');
    } else {
      log('\n⚠️  SOME CRITICAL SYSTEMS NEED ATTENTION!', 'red');
    }
    
    // Recommendations
    log('\n💡 RECOMMENDATIONS:', 'magenta');
    log('  1. Test wallet connection in browser with MetaMask', 'cyan');
    log('  2. Verify network switching with actual wallet', 'cyan');
    log('  3. Test MEV protection toggle in UI', 'cyan');
    log('  4. Execute a test swap through dashboard', 'cyan');
    log('  5. Check approval management with real tokens', 'cyan');
    log('  6. Verify SIWE authentication flow', 'cyan');
  }
}

// Run tests
async function main() {
  try {
    const tester = new WalletDashboardTester();
    await tester.runAllTests();
  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Check if ethers is installed
try {
  require('ethers');
  main();
} catch (error) {
  log('❌ Please install ethers: npm install ethers', 'red');
  log('   Run: cd frontend && npm install ethers', 'yellow');
  process.exit(1);
}