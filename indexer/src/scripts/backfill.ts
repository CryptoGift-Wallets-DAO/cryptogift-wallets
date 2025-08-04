#!/usr/bin/env node

/**
 * 🔄 Backfill Script
 * Standalone script to run historical event backfill
 */

import { initDatabase, closeDatabase } from '../database.js';
import { startBackfill, getBackfillSummary } from '../backfill.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

async function runBackfill(): Promise<void> {
  try {
    logger.info('🚀 Starting standalone backfill...');
    
    // Initialize database
    await initDatabase();
    
    // Check current status
    const summary = await getBackfillSummary();
    
    if (!summary.isNeeded) {
      logger.info('✅ Backfill already complete');
      await closeDatabase();
      return;
    }
    
    logger.info(`📊 Backfill Status:`);
    logger.info(`   - Last processed block: ${summary.lastProcessedBlock}`);
    logger.info(`   - Current block: ${summary.currentBlock}`);
    logger.info(`   - Blocks remaining: ${summary.blocksRemaining}`);
    logger.info(`   - Progress: ${summary.progressPercent.toFixed(2)}%`);
    
    if (summary.isRunning) {
      logger.warn('⚠️ Backfill already running in another process');
      await closeDatabase();
      return;
    }
    
    // Start backfill
    logger.info('🔄 Starting backfill process...');
    await startBackfill();
    
    // Final status
    const finalSummary = await getBackfillSummary();
    logger.info('✅ Backfill completed successfully!');
    logger.info(`📊 Final Status:`);
    logger.info(`   - Total blocks processed: ${finalSummary.currentBlock - config.deploymentBlock}`);
    logger.info(`   - Progress: ${finalSummary.progressPercent.toFixed(2)}%`);
    
  } catch (error) {
    logger.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CryptoGift Indexer - Backfill Script

Usage:
  npm run backfill          Run historical event backfill
  npm run backfill -- --help    Show this help

Description:
  This script processes all historical GiftRegisteredFromMint events
  from the contract deployment block to the current blockchain state.
  
  The backfill runs in batches and is resumable - if interrupted,
  it will continue from the last processed block on restart.

Environment Variables:
  All the same environment variables as the main indexer are required.
  See 'npm start -- --help' for the full list.

Examples:
  # Run backfill with default settings
  npm run backfill
  
  # Run backfill with custom batch size
  BATCH_BLOCKS=2000 npm run backfill
  
  # Check backfill status without running
  npm run status
  `);
  process.exit(0);
}

// Validate environment
const required = ['DATABASE_URL', 'RPC_HTTP'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  logger.fatal(`💀 Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Run backfill
runBackfill().catch((error) => {
  logger.fatal('💀 Backfill script crashed:', error);
  process.exit(1);
});