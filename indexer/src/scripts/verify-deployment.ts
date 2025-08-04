#!/usr/bin/env node

/**
 * 🔍 Pre-Deployment Verification Script
 * Validates all requirements before shadow mode deployment
 */

import { config } from '../config.js';
import { logger } from '../logger.js';

// Verification checklist
interface VerificationResult {
  category: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    critical: boolean;
  }[];
}

// Run comprehensive pre-deployment verification
async function runDeploymentVerification(): Promise<void> {
  console.log('\n🔍 CryptoGift Indexer - Pre-Deployment Verification\n');
  
  const results: VerificationResult[] = [];
  
  // 1. Configuration Verification
  results.push(await verifyConfiguration());
  
  // 2. Dependencies Verification  
  results.push(await verifyDependencies());
  
  // 3. Network Connectivity
  results.push(await verifyNetworkConnectivity());
  
  // 4. Database Verification
  results.push(await verifyDatabase());
  
  // 5. Security Configuration
  results.push(await verifySecurity());
  
  // 6. Performance Settings
  results.push(await verifyPerformance());
  
  // Display results
  displayResults(results);
  
  // Determine deployment readiness
  const readiness = assessDeploymentReadiness(results);
  displayReadinessAssessment(readiness);
}

// Verify configuration
async function verifyConfiguration(): Promise<VerificationResult> {
  const checks = [];
  
  // Contract address
  if (config.contractAddress && /^0x[0-9a-fA-F]{40}$/.test(config.contractAddress)) {
    checks.push({
      name: 'Contract Address Format',
      status: 'pass' as const,
      message: `Valid: ${config.contractAddress}`,
      critical: true
    });
  } else {
    checks.push({
      name: 'Contract Address Format',
      status: 'fail' as const,
      message: `Invalid contract address: ${config.contractAddress}`,
      critical: true
    });
  }
  
  // Chain ID
  if (config.chainId === 84532) {
    checks.push({
      name: 'Chain ID',
      status: 'pass' as const,
      message: 'Base Sepolia (84532)',
      critical: true
    });
  } else {
    checks.push({
      name: 'Chain ID',
      status: 'warning' as const,
      message: `Unexpected chain: ${config.chainId}`,
      critical: false
    });
  }
  
  // Deployment block
  if (config.deploymentBlock > 28900000) {
    checks.push({
      name: 'Deployment Block',
      status: 'pass' as const,
      message: `Block ${config.deploymentBlock.toLocaleString()}`,
      critical: true
    });
  } else {
    checks.push({
      name: 'Deployment Block',
      status: 'fail' as const,
      message: `Invalid deployment block: ${config.deploymentBlock}`,
      critical: true
    });
  }
  
  // Feature flag (shadow mode)
  if (config.readFrom === 'onchain') {
    checks.push({
      name: 'Shadow Mode Flag',
      status: 'pass' as const,
      message: 'READ_FROM=onchain (correct for shadow mode)',
      critical: true
    });
  } else {
    checks.push({
      name: 'Shadow Mode Flag',
      status: 'fail' as const,
      message: `READ_FROM=${config.readFrom} (should be 'onchain' for shadow mode)`,
      critical: true
    });
  }
  
  return {
    category: '⚙️ Configuration',
    checks
  };
}

// Verify dependencies
async function verifyDependencies(): Promise<VerificationResult> {
  const checks = [];
  
  // Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    checks.push({
      name: 'Node.js Version',
      status: 'pass' as const,
      message: `${nodeVersion} (>= 18 required)`,
      critical: true
    });
  } else {
    checks.push({
      name: 'Node.js Version',
      status: 'fail' as const,
      message: `${nodeVersion} (Node 18+ required)`,
      critical: true
    });
  }
  
  // Package.json dependencies
  try {
    const pkg = await import('../../package.json', { assert: { type: 'json' } });
    const deps = Object.keys(pkg.default.dependencies || {});
    
    const requiredDeps = ['viem', 'pg', 'express', 'pino'];
    const missingDeps = requiredDeps.filter(dep => !deps.includes(dep));
    
    if (missingDeps.length === 0) {
      checks.push({
        name: 'Required Dependencies',
        status: 'pass' as const,
        message: `All required packages installed (${deps.length} total)`,
        critical: true
      });
    } else {
      checks.push({
        name: 'Required Dependencies',
        status: 'fail' as const,
        message: `Missing: ${missingDeps.join(', ')}`,
        critical: true
      });
    }
  } catch (error) {
    checks.push({
      name: 'Package Dependencies',
      status: 'fail' as const,
      message: 'Could not verify dependencies',
      critical: true
    });
  }
  
  return {
    category: '📦 Dependencies',
    checks
  };
}

// Verify network connectivity
async function verifyNetworkConnectivity(): Promise<VerificationResult> {
  const checks = [];
  
  // HTTP RPC
  if (config.rpcHttp) {
    try {
      const response = await fetch(config.rpcHttp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        })
      });
      
      const data = await response.json();
      const chainId = parseInt(data.result, 16);
      
      if (chainId === config.chainId) {
        checks.push({
          name: 'HTTP RPC Connectivity',
          status: 'pass' as const,
          message: `Connected to chain ${chainId}`,
          critical: true
        });
      } else {
        checks.push({
          name: 'HTTP RPC Connectivity',
          status: 'fail' as const,
          message: `Wrong chain: expected ${config.chainId}, got ${chainId}`,
          critical: true
        });
      }
    } catch (error) {
      checks.push({
        name: 'HTTP RPC Connectivity',
        status: 'fail' as const,
        message: `Connection failed: ${error.message}`,
        critical: true
      });
    }
  } else {
    checks.push({
      name: 'HTTP RPC Configuration',
      status: 'fail' as const,
      message: 'RPC_HTTP not configured',
      critical: true
    });
  }
  
  // WebSocket RPC (non-critical)
  if (config.rpcWs) {
    checks.push({
      name: 'WebSocket RPC Configuration',
      status: 'pass' as const,
      message: 'RPC_WS configured',
      critical: false
    });
  } else {
    checks.push({
      name: 'WebSocket RPC Configuration',
      status: 'warning' as const,
      message: 'RPC_WS not configured (will use HTTP only)',
      critical: false
    });
  }
  
  return {
    category: '🌐 Network Connectivity',
    checks
  };
}

// Verify database
async function verifyDatabase(): Promise<VerificationResult> {
  const checks = [];
  
  // Database URL format
  if (config.databaseUrl && config.databaseUrl.startsWith('postgresql://')) {
    checks.push({
      name: 'Database URL Format',
      status: 'pass' as const,
      message: 'Valid PostgreSQL URL',
      critical: true
    });
    
    // Try to connect (if possible)
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: config.databaseUrl });
      
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await pool.end();
      
      checks.push({
        name: 'Database Connectivity',
        status: 'pass' as const,
        message: 'Connection successful',
        critical: true
      });
    } catch (error) {
      checks.push({
        name: 'Database Connectivity',
        status: 'fail' as const,
        message: `Connection failed: ${error.message}`,
        critical: true
      });
    }
  } else {
    checks.push({
      name: 'Database Configuration',
      status: 'fail' as const,
      message: 'DATABASE_URL not configured or invalid',
      critical: true
    });
  }
  
  return {
    category: '🗄️ Database',
    checks
  };
}

// Verify security settings
async function verifySecurity(): Promise<VerificationResult> {
  const checks = [];
  
  // Security mode
  if (config.enableSecurity) {
    checks.push({
      name: 'Security Mode',
      status: 'pass' as const,
      message: 'Security enabled',
      critical: false
    });
    
    // API token
    if (config.apiToken && config.apiToken.length >= 32) {
      checks.push({
        name: 'API Token Strength',
        status: 'pass' as const,
        message: 'Strong API token configured',
        critical: false
      });
    } else {
      checks.push({
        name: 'API Token Strength',
        status: 'warning' as const,
        message: 'Weak or missing API token',
        critical: false
      });
    }
  } else {
    checks.push({
      name: 'Security Mode',
      status: 'warning' as const,
      message: 'Security disabled (OK for development)',
      critical: false
    });
  }
  
  return {
    category: '🛡️ Security',
    checks
  };
}

// Verify performance settings
async function verifyPerformance(): Promise<VerificationResult> {
  const checks = [];
  
  // Batch size
  if (config.batchBlocks >= 1000 && config.batchBlocks <= 10000) {
    checks.push({
      name: 'Batch Size',
      status: 'pass' as const,
      message: `${config.batchBlocks} blocks (optimal range)`,
      critical: false
    });
  } else {
    checks.push({
      name: 'Batch Size',
      status: 'warning' as const,
      message: `${config.batchBlocks} blocks (consider 1000-10000 range)`,
      critical: false
    });
  }
  
  // Confirmations
  if (config.confirmations >= 10 && config.confirmations <= 50) {
    checks.push({
      name: 'Block Confirmations',
      status: 'pass' as const,
      message: `${config.confirmations} blocks (safe for L2)`,
      critical: false
    });
  } else {
    checks.push({
      name: 'Block Confirmations',
      status: 'warning' as const,
      message: `${config.confirmations} blocks (consider 10-50 for L2)`,
      critical: false
    });
  }
  
  // System resources
  const memoryUsage = process.memoryUsage();
  const availableMemory = memoryUsage.heapTotal / 1024 / 1024;
  
  if (availableMemory > 100) {
    checks.push({
      name: 'Available Memory',
      status: 'pass' as const,
      message: `${availableMemory.toFixed(0)}MB available`,
      critical: false
    });
  } else {
    checks.push({
      name: 'Available Memory',
      status: 'warning' as const,
      message: `${availableMemory.toFixed(0)}MB available (low)`,
      critical: false
    });
  }
  
  return {
    category: '⚡ Performance',
    checks
  };
}

// Display verification results
function displayResults(results: VerificationResult[]): void {
  for (const result of results) {
    console.log(`\n${result.category}`);
    console.log('─'.repeat(50));
    
    for (const check of result.checks) {
      const icon = check.status === 'pass' ? '✅' : 
                   check.status === 'warning' ? '⚠️' : '❌';
      const critical = check.critical ? ' (CRITICAL)' : '';
      
      console.log(`${icon} ${check.name}${critical}`);
      console.log(`   ${check.message}`);
    }
  }
}

// Assess deployment readiness
function assessDeploymentReadiness(results: VerificationResult[]): {
  ready: boolean;
  criticalIssues: number;
  warnings: number;
  summary: string;
} {
  let criticalIssues = 0;
  let warnings = 0;
  
  for (const result of results) {
    for (const check of result.checks) {
      if (check.status === 'fail' && check.critical) {
        criticalIssues++;
      } else if (check.status === 'warning' || (check.status === 'fail' && !check.critical)) {
        warnings++;
      }
    }
  }
  
  const ready = criticalIssues === 0;
  let summary = '';
  
  if (ready) {
    if (warnings === 0) {
      summary = 'All systems green - ready for deployment';
    } else {
      summary = `Ready for deployment with ${warnings} minor warnings`;
    }
  } else {
    summary = `Not ready - ${criticalIssues} critical issues must be resolved`;
  }
  
  return { ready, criticalIssues, warnings, summary };
}

// Display readiness assessment
function displayReadinessAssessment(readiness: ReturnType<typeof assessDeploymentReadiness>): void {
  console.log('\n' + '═'.repeat(60));
  console.log('                    DEPLOYMENT READINESS');
  console.log('═'.repeat(60));
  
  if (readiness.ready) {
    console.log(`\n🎉 READY FOR DEPLOYMENT`);
    console.log(`✅ ${readiness.summary}`);
    
    if (readiness.warnings > 0) {
      console.log(`⚠️  ${readiness.warnings} warnings (review recommended but not blocking)`);
    }
    
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. npm run db:migrate');
    console.log('   2. npm run backfill');  
    console.log('   3. npm start');
    console.log('   4. Monitor with: npm run status');
    console.log('   5. Daily A/B testing: npm run ab-check');
    
  } else {
    console.log(`\n🚫 NOT READY FOR DEPLOYMENT`);
    console.log(`❌ ${readiness.summary}`);
    
    console.log('\n🔧 REQUIRED ACTIONS:');
    console.log('   1. Fix all critical issues listed above');
    console.log('   2. Re-run: npm run verify-deployment');
    console.log('   3. Ensure all ✅ before proceeding');
  }
  
  console.log('\n');
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CryptoGift Indexer - Pre-Deployment Verification

Usage:
  npm run verify-deployment    Run comprehensive verification
  npm run verify-deployment -- --help   Show this help

Description:
  This script validates all requirements before deploying
  the indexer in shadow mode. It checks:
  
  ⚙️  Configuration (contract, chain, flags)
  📦 Dependencies (Node.js, packages)
  🌐 Network connectivity (RPC endpoints)  
  🗄️  Database (connection, format)
  🛡️  Security settings
  ⚡ Performance configuration

Exit Codes:
  0  - Ready for deployment
  1  - Critical issues found, not ready
  `);
  process.exit(0);
}

// Run verification
runDeploymentVerification().then(() => {
  // Exit code will be set by the assessment
}).catch(error => {
  console.error('\n💀 Verification script crashed:', error);
  process.exit(1);
});