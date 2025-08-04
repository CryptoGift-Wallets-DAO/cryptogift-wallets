#!/usr/bin/env node

/**
 * 🎯 CryptoGift Indexer Entry Point
 * Main application that starts the indexer and API server
 */

import { startIndexer, stopIndexer } from './indexer.js';
import { startApiServer } from './api.js';
import { logger } from './logger.js';
import { config } from './config.js';

// ASCII Art Banner
const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎁 CryptoGift Indexer v1.0.0                             ║
║   Zero-custody blockchain event indexer                      ║
║                                                              ║
║   Chain: Base Sepolia (${config.chainId})                          ║
║   Contract: ${config.contractAddress}     ║
║   Deployment Block: ${config.deploymentBlock}                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

// Main application
async function main(): Promise<void> {
  try {
    // Print banner
    console.log(BANNER);
    
    logger.info('🚀 Starting CryptoGift Indexer...');
    logger.info(`📊 Configuration:`);
    logger.info(`   - Chain ID: ${config.chainId}`);
    logger.info(`   - Contract: ${config.contractAddress}`);
    logger.info(`   - Deployment Block: ${config.deploymentBlock}`);
    logger.info(`   - Batch Size: ${config.batchBlocks} blocks`);
    logger.info(`   - Confirmations: ${config.confirmations} blocks`);
    logger.info(`   - Read Mode: ${config.readFrom}`);
    logger.info(`   - API Port: ${config.port}`);
    
    // Start API server first
    logger.info('🌐 Starting API server...');
    await startApiServer();
    
    // Start main indexer
    logger.info('⚡ Starting indexer engine...');
    await startIndexer();
    
    logger.info('✅ All systems operational!');
    logger.info(`📡 API available at: http://localhost:${config.port}`);
    logger.info(`📊 Health check: http://localhost:${config.port}/health`);
    logger.info(`🎯 Status dashboard: http://localhost:${config.port}/status`);
    
    // Keep process alive
    logger.info('🔄 Indexer running... Press Ctrl+C to stop');
    
  } catch (error) {
    logger.fatal('💀 Failed to start indexer:', error);
    process.exit(1);
  }
}

// Handle CLI arguments
function handleCliArgs(): void {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
CryptoGift Indexer - Zero-custody blockchain event indexer

Usage:
  npm start                 Start the indexer
  npm run backfill         Run backfill only
  npm run status           Check indexer status
  npm run dev              Start in development mode

Environment Variables:
  DATABASE_URL             PostgreSQL connection string (required)
  RPC_HTTP                 HTTP RPC endpoint (required)
  RPC_WS                   WebSocket RPC endpoint (required)
  CONTRACT_ADDRESS         Contract address (default: 0x46175CfC233500DA803841DEef7f2816e7A129E0)
  DEPLOYMENT_BLOCK         Contract deployment block (default: 28915000)
  CHAIN_ID                 Chain ID (default: 84532)
  BATCH_BLOCKS             Batch size for processing (default: 4000)
  CONFIRMATIONS            Block confirmations to wait (default: 20)
  READ_FROM                Read mode: 'onchain' or 'db' (default: onchain)
  PORT                     API server port (default: 3001)
  LOG_LEVEL                Log level (default: info)

Examples:
  # Start with custom config
  DATABASE_URL=postgres://... RPC_HTTP=https://... npm start
  
  # Run backfill only
  npm run backfill
  
  # Check status
  curl http://localhost:3001/status
  
  # Query gift mapping
  curl http://localhost:3001/mapping/68

Documentation:
  https://github.com/cryptogift/indexer
    `);
    process.exit(0);
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log('CryptoGift Indexer v1.0.0');
    process.exit(0);
  }
}

// Validate environment
function validateEnvironment(): void {
  const required = ['DATABASE_URL', 'RPC_HTTP', 'RPC_WS'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.fatal(`💀 Missing required environment variables: ${missing.join(', ')}`);
    logger.fatal('💡 Set these variables or create a .env file');
    logger.fatal('📖 See --help for more information');
    process.exit(1);
  }
}

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal('💀 Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`📡 Received ${signal}, shutting down gracefully...`);
  
  try {
    await stopIndexer();
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  handleCliArgs();
  validateEnvironment();
  main().catch((error) => {
    logger.fatal('💀 Application crashed:', error);
    process.exit(1);
  });
}