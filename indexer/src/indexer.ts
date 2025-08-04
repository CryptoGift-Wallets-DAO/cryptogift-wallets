/**
 * 🚀 CryptoGift Indexer Main Application
 * Orchestrates backfill, streaming, and reconciliation
 */

import { initDatabase, closeDatabase, getIndexerStatus } from './database.js';
import { startBackfill, stopBackfill, isBackfillRunning, getBackfillSummary } from './backfill.js';
import { startStream, stopStream, isStreamRunning, getStreamStatus } from './stream.js';
import { runPeriodicReconciliation, getReconciliationStatus } from './reconcile.js';
import { healthCheck } from './rpc.js';
import { config } from './config.js';
import { logger } from './logger.js';

// Indexer state
interface IndexerState {
  isRunning: boolean;
  startTime: Date;
  backfillComplete: boolean;
  streamActive: boolean;
  reconcileTimer: NodeJS.Timeout | null;
  healthTimer: NodeJS.Timeout | null;
}

let indexerState: IndexerState = {
  isRunning: false,
  startTime: new Date(),
  backfillComplete: false,
  streamActive: false,
  reconcileTimer: null,
  healthTimer: null
};

// Start the indexer
export async function startIndexer(): Promise<void> {
  if (indexerState.isRunning) {
    throw new Error('Indexer already running');
  }

  logger.info('🚀 Starting CryptoGift Indexer...');
  
  try {
    // Initialize database connection
    await initDatabase();
    
    // Verify RPC connectivity
    const rpcHealth = await healthCheck();
    if (!rpcHealth.http) {
      throw new Error('HTTP RPC endpoint is not accessible');
    }
    
    logger.info(`🔗 RPC Health: HTTP ${rpcHealth.http ? '✅' : '❌'}, WS ${rpcHealth.ws ? '✅' : '❌'}`);
    logger.info(`📊 Latest block: ${rpcHealth.latestBlock}`);
    
    // Update state
    indexerState.isRunning = true;
    indexerState.startTime = new Date();
    
    // Start health monitoring
    startHealthMonitoring();
    
    // Check if backfill is needed
    const backfillSummary = await getBackfillSummary();
    
    if (backfillSummary.isNeeded && !backfillSummary.isRunning) {
      logger.info(`📈 Backfill needed: ${backfillSummary.blocksRemaining} blocks remaining`);
      await startBackfillProcess();
    } else if (backfillSummary.isRunning) {
      logger.info('🔄 Backfill already in progress');
      indexerState.backfillComplete = false;
    } else {
      logger.info('✅ Backfill complete');
      indexerState.backfillComplete = true;
      await startStreamProcess();
    }
    
    // Start periodic reconciliation
    startReconciliation();
    
    logger.info('✅ Indexer started successfully');
    
  } catch (error) {
    logger.error('❌ Failed to start indexer:', error);
    await stopIndexer();
    throw error;
  }
}

// Start backfill process
async function startBackfillProcess(): Promise<void> {
  try {
    logger.info('🔄 Starting backfill process...');
    
    // Start backfill (this will run until complete)
    await startBackfill();
    
    indexerState.backfillComplete = true;
    logger.info('✅ Backfill completed, starting live stream...');
    
    // Start live streaming
    await startStreamProcess();
    
  } catch (error) {
    logger.error('❌ Backfill process failed:', error);
    throw error;
  }
}

// Start streaming process
async function startStreamProcess(): Promise<void> {
  try {
    logger.info('📡 Starting live stream...');
    
    await startStream();
    indexerState.streamActive = true;
    
    logger.info('✅ Live stream started');
    
  } catch (error) {
    logger.error('❌ Failed to start live stream:', error);
    throw error;
  }
}

// Start periodic reconciliation
function startReconciliation(): void {
  // Run reconciliation every 10 minutes
  const RECONCILE_INTERVAL = 10 * 60 * 1000;
  
  indexerState.reconcileTimer = setInterval(async () => {
    try {
      await runPeriodicReconciliation();
    } catch (error) {
      logger.error('❌ Periodic reconciliation failed:', error);
    }
  }, RECONCILE_INTERVAL);
  
  logger.info(`⏰ Reconciliation scheduled every ${RECONCILE_INTERVAL / 1000}s`);
}

// Start health monitoring
function startHealthMonitoring(): void {
  const HEALTH_INTERVAL = config.healthCheckInterval;
  
  indexerState.healthTimer = setInterval(async () => {
    try {
      await performHealthCheck();
    } catch (error) {
      logger.error('❌ Health check failed:', error);
    }
  }, HEALTH_INTERVAL);
  
  logger.info(`💓 Health monitoring started (${HEALTH_INTERVAL / 1000}s interval)`);
}

// Perform comprehensive health check
async function performHealthCheck(): Promise<void> {
  try {
    // RPC health
    const rpcHealth = await healthCheck();
    
    // Database status
    const dbStatus = await getIndexerStatus();
    
    // Stream status
    const streamStatus = getStreamStatus();
    
    // Backfill status
    const backfillSummary = await getBackfillSummary();
    
    // Reconciliation status
    const reconcileStatus = await getReconciliationStatus();
    
    // Calculate overall lag
    const currentTime = Date.now();
    const lagSeconds = dbStatus.lagSeconds;
    
    // Log health summary
    logger.debug(
      `💓 Health: RPC ${rpcHealth.http ? '✅' : '❌'} | ` +
      `DB ${dbStatus.totalMappings} mappings | ` +
      `Stream ${streamStatus ? '✅' : '❌'} | ` +
      `Lag ${lagSeconds}s`
    );
    
    // Alert on issues
    if (!rpcHealth.http) {
      logger.error('🚨 RPC endpoint is down!');
    }
    
    if (lagSeconds > config.maxLagSeconds) {
      logger.warn(`⚠️ High lag detected: ${lagSeconds}s (max: ${config.maxLagSeconds}s)`);
    }
    
    if (streamStatus && streamStatus.pendingCount > 1000) {
      logger.warn(`⚠️ High pending events: ${streamStatus.pendingCount}`);
    }
    
  } catch (error) {
    logger.warn('⚠️ Health check error:', error);
  }
}

// Stop the indexer
export async function stopIndexer(): Promise<void> {
  if (!indexerState.isRunning) return;
  
  logger.info('🛑 Stopping indexer...');
  
  indexerState.isRunning = false;
  
  // Stop timers
  if (indexerState.reconcileTimer) {
    clearInterval(indexerState.reconcileTimer);
    indexerState.reconcileTimer = null;
  }
  
  if (indexerState.healthTimer) {
    clearInterval(indexerState.healthTimer);
    indexerState.healthTimer = null;
  }
  
  // Stop streaming
  if (indexerState.streamActive) {
    await stopStream();
    indexerState.streamActive = false;
  }
  
  // Stop backfill if running
  if (isBackfillRunning()) {
    await stopBackfill();
  }
  
  // Close database
  await closeDatabase();
  
  logger.info('✅ Indexer stopped');
}

// Get indexer status
export async function getIndexerFullStatus(): Promise<{
  isRunning: boolean;
  uptime: number;
  backfill: any;
  stream: any;
  reconcile: any;
  database: any;
  rpc: any;
}> {
  const uptime = indexerState.isRunning ? 
    Date.now() - indexerState.startTime.getTime() : 0;
  
  try {
    const [
      backfillSummary,
      streamStatus,
      reconcileStatus,
      dbStatus,
      rpcHealth
    ] = await Promise.all([
      getBackfillSummary(),
      Promise.resolve(getStreamStatus()),
      getReconciliationStatus(),
      getIndexerStatus(),
      healthCheck()
    ]);
    
    return {
      isRunning: indexerState.isRunning,
      uptime,
      backfill: backfillSummary,
      stream: streamStatus,
      reconcile: reconcileStatus,
      database: dbStatus,
      rpc: rpcHealth
    };
    
  } catch (error) {
    logger.error('❌ Failed to get indexer status:', error);
    return {
      isRunning: indexerState.isRunning,
      uptime,
      backfill: null,
      stream: null,
      reconcile: null,
      database: null,
      rpc: null
    };
  }
}

// Graceful shutdown handler
export async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`📡 Received ${signal}, initiating graceful shutdown...`);
  
  try {
    await stopIndexer();
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Recovery procedures
export async function recoverFromError(): Promise<void> {
  logger.info('🔄 Attempting error recovery...');
  
  try {
    // Stop everything
    await stopIndexer();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Restart
    await startIndexer();
    
    logger.info('✅ Recovery successful');
    
  } catch (error) {
    logger.error('❌ Recovery failed:', error);
    throw error;
  }
}

// Export state getters
export function isIndexerRunning(): boolean {
  return indexerState.isRunning;
}

export function getIndexerUptime(): number {
  return indexerState.isRunning ? 
    Date.now() - indexerState.startTime.getTime() : 0;
}

// Setup signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Unhandled error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - attempt recovery
  recoverFromError().catch(() => {
    logger.fatal('💀 Recovery failed, exiting...');
    process.exit(1);
  });
});

process.on('uncaughtException', (error) => {
  logger.fatal('💀 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});