#!/usr/bin/env node

/**
 * 📊 Status Script
 * Check indexer status and display comprehensive information
 */

import { initDatabase, closeDatabase, getIndexerStatus, getGiftMapping } from '../database.js';
import { getBackfillSummary } from '../backfill.js';
import { getReconciliationStatus } from '../reconcile.js';
import { healthCheck, getCurrentBlockNumber } from '../rpc.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

// Format duration in human readable format
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Format numbers with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Display status information
async function displayStatus(): Promise<void> {
  try {
    logger.info('📊 Checking indexer status...');
    
    // Initialize database
    await initDatabase();
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    CRYPTOGIFT INDEXER STATUS                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    // RPC Health
    console.log('🔗 RPC CONNECTION:');
    try {
      const rpcHealth = await healthCheck();
      const currentBlock = await getCurrentBlockNumber();
      
      console.log(`   HTTP RPC: ${rpcHealth.http ? '✅ Connected' : '❌ Failed'}`);
      console.log(`   WebSocket: ${rpcHealth.ws ? '✅ Connected' : '❌ Failed'}`);
      console.log(`   Latest Block: ${formatNumber(currentBlock)}`);
      console.log(`   Chain ID: ${config.chainId}`);
    } catch (error) {
      console.log(`   Status: ❌ Connection failed - ${error.message}`);
    }
    
    console.log('\n📄 CONTRACT INFORMATION:');
    console.log(`   Address: ${config.contractAddress}`);
    console.log(`   Deployment Block: ${formatNumber(config.deploymentBlock)}`);
    console.log(`   Event: GiftRegisteredFromMint`);
    
    // Database Status
    console.log('\n🗄️ DATABASE STATUS:');
    try {
      const dbStatus = await getIndexerStatus();
      
      console.log(`   Total Mappings: ${formatNumber(dbStatus.totalMappings)}`);
      console.log(`   Latest Mapped Block: ${dbStatus.latestMappedBlock ? formatNumber(dbStatus.latestMappedBlock) : 'None'}`);
      console.log(`   Earliest Mapped Block: ${dbStatus.earliestMappedBlock ? formatNumber(dbStatus.earliestMappedBlock) : 'None'}`);
      console.log(`   Indexer Lag: ${dbStatus.lagSeconds}s`);
      console.log(`   DLQ Entries: ${formatNumber(dbStatus.dlqCount)}`);
      
      if (dbStatus.lagSeconds > config.maxLagSeconds) {
        console.log(`   ⚠️  Warning: High lag detected (max: ${config.maxLagSeconds}s)`);
      }
      
    } catch (error) {
      console.log(`   Status: ❌ Database error - ${error.message}`);
    }
    
    // Backfill Status
    console.log('\n📦 BACKFILL STATUS:');
    try {
      const backfillSummary = await getBackfillSummary();
      
      console.log(`   Is Needed: ${backfillSummary.isNeeded ? '⚠️ Yes' : '✅ No'}`);
      console.log(`   Is Running: ${backfillSummary.isRunning ? '🔄 Yes' : '⏸️ No'}`);
      console.log(`   Last Processed: Block ${formatNumber(backfillSummary.lastProcessedBlock)}`);
      console.log(`   Current Target: Block ${formatNumber(backfillSummary.currentBlock)}`);
      console.log(`   Blocks Remaining: ${formatNumber(backfillSummary.blocksRemaining)}`);
      console.log(`   Progress: ${backfillSummary.progressPercent.toFixed(2)}%`);
      
      if (backfillSummary.isNeeded) {
        const blocksPerDay = 43200; // Base Sepolia: 2s blocks
        const daysRemaining = backfillSummary.blocksRemaining / blocksPerDay;
        console.log(`   📅 Estimated: ${daysRemaining.toFixed(1)} days of events to process`);
      }
      
    } catch (error) {
      console.log(`   Status: ❌ Error - ${error.message}`);
    }
    
    // Reconciliation Status
    console.log('\n🔄 RECONCILIATION STATUS:');
    try {
      const reconcileStatus = await getReconciliationStatus();
      
      console.log(`   Last Reconciled: Block ${formatNumber(reconcileStatus.lastReconcileBlock)}`);
      console.log(`   Current Block: ${formatNumber(reconcileStatus.currentBlock)}`);
      console.log(`   Lag Blocks: ${formatNumber(reconcileStatus.lagBlocks)}`);
      console.log(`   Reconciliation Needed: ${reconcileStatus.isReconciliationNeeded ? '⚠️ Yes' : '✅ No'}`);
      
    } catch (error) {
      console.log(`   Status: ❌ Error - ${error.message}`);
    }
    
    // Configuration
    console.log('\n⚙️ CONFIGURATION:');
    console.log(`   Batch Size: ${formatNumber(config.batchBlocks)} blocks`);
    console.log(`   Confirmations: ${config.confirmations} blocks`);
    console.log(`   Reorg Lookback: ${config.reorgLookback} blocks`);
    console.log(`   Read Mode: ${config.readFrom}`);
    console.log(`   Log Level: ${config.logLevel}`);
    console.log(`   API Port: ${config.port}`);
    
    console.log('\n📡 API ENDPOINTS:');
    console.log(`   Health: http://localhost:${config.port}/health`);
    console.log(`   Status: http://localhost:${config.port}/status`);
    console.log(`   Mapping: http://localhost:${config.port}/mapping/:tokenId`);
    console.log(`   Metrics: http://localhost:${config.port}/metrics`);
    
    console.log('\n');
    
  } catch (error) {
    logger.error('❌ Status check failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Test a specific mapping lookup
async function testMapping(tokenId: string): Promise<void> {
  try {
    logger.info(`🔍 Testing mapping lookup for tokenId: ${tokenId}`);
    
    await initDatabase();
    
    const mapping = await getGiftMapping(tokenId);
    
    if (mapping) {
      console.log('\n✅ MAPPING FOUND:');
      console.log(`   Token ID: ${mapping.tokenId}`);
      console.log(`   Gift ID: ${mapping.giftId}`);
      console.log(`   Creator: ${mapping.creator}`);
      console.log(`   NFT Contract: ${mapping.nftContract}`);
      console.log(`   Transaction: ${mapping.txHash}`);
      console.log(`   Block: ${formatNumber(mapping.blockNumber)}`);
      console.log(`   Log Index: ${mapping.logIndex}`);
      if (mapping.blockTime) {
        console.log(`   Block Time: ${mapping.blockTime.toISOString()}`);
      }
      if (mapping.expiresAt) {
        console.log(`   Expires At: ${new Date(mapping.expiresAt * 1000).toISOString()}`);
      }
    } else {
      console.log(`\n❌ MAPPING NOT FOUND for tokenId: ${tokenId}`);
      console.log('   This could mean:');
      console.log('   1. The tokenId doesn\'t exist');
      console.log('   2. Backfill hasn\'t processed this event yet');
      console.log('   3. The event is in the DLQ due to processing errors');
    }
    
  } catch (error) {
    logger.error('❌ Mapping test failed:', error);
  } finally {
    await closeDatabase();
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CryptoGift Indexer - Status Script

Usage:
  npm run status                Show comprehensive status
  npm run status -- --test 68     Test specific tokenId mapping
  npm run status -- --help        Show this help

Description:
  This script displays comprehensive information about the indexer
  including RPC connectivity, database status, backfill progress,
  and configuration.

Options:
  --test <tokenId>    Test mapping lookup for specific tokenId
  --help             Show this help message

Examples:
  # Show full status
  npm run status
  
  # Test if tokenId 68 is mapped
  npm run status -- --test 68
  
  # Check status via API (if indexer is running)
  curl http://localhost:3001/status
  `);
  process.exit(0);
}

// Handle test mode
const testIndex = args.indexOf('--test');
if (testIndex !== -1 && args[testIndex + 1]) {
  const tokenId = args[testIndex + 1];
  testMapping(tokenId).catch((error) => {
    logger.fatal('💀 Mapping test crashed:', error);
    process.exit(1);
  });
} else {
  // Regular status display
  displayStatus().catch((error) => {
    logger.fatal('💀 Status script crashed:', error);
    process.exit(1);
  });
}