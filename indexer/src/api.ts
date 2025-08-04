/**
 * 🌐 Indexer API Server
 * REST endpoints for monitoring and debugging
 */

import express from 'express';
import { getIndexerFullStatus, isIndexerRunning } from './indexer.js';
import { getGiftMapping, getIndexerStatus } from './database.js';
import { getBackfillSummary, getBackfillStatus } from './backfill.js';
import { getStreamStatus, streamHealthCheck } from './stream.js';
import { getReconciliationStatus } from './reconcile.js';
import { healthCheck } from './rpc.js';
import { config } from './config.js';
import { apiLogger as logger } from './logger.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware for protected endpoints
function securityMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Skip security if disabled
  if (!config.enableSecurity) {
    return next();
  }
  
  // Check IP allowlist
  if (config.allowedIps) {
    const clientIp = req.ip || req.connection.remoteAddress || '';
    const allowedIps = config.allowedIps.split(',').map(ip => ip.trim());
    
    if (!allowedIps.includes(clientIp) && !allowedIps.includes('*')) {
      logger.warn(`🚫 Blocked request from unauthorized IP: ${clientIp}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied: IP not authorized'
      });
    }
  }
  
  // Check API token
  if (config.apiToken) {
    const providedToken = req.headers.authorization?.replace('Bearer ', '') || 
                         req.query.token as string;
    
    if (!providedToken || providedToken !== config.apiToken) {
      logger.warn(`🚫 Blocked request with invalid token from ${req.ip}`);
      return res.status(401).json({
        success: false,
        error: 'Access denied: Invalid or missing token'
      });
    }
  }
  
  next();
}

// Rate limiting for public endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // per minute

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Clean old entries
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
  
  // Check current rate
  const current = rateLimitMap.get(clientIp);
  if (!current) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    logger.warn(`🚫 Rate limit exceeded for ${clientIp}: ${current.count} requests`);
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }
  
  current.count++;
  next();
}

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Request logging with security context
app.use((req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const hasAuth = req.headers.authorization ? '🔑' : '🔓';
  logger.debug(`${req.method} ${req.path} ${hasAuth} ${clientIp}`);
  next();
});

// Apply rate limiting to all endpoints
app.use(rateLimitMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const isRunning = isIndexerRunning();
    const rpcHealth = await healthCheck();
    
    const status = {
      status: isRunning ? 'healthy' : 'stopped',
      timestamp: new Date().toISOString(),
      indexer: isRunning,
      rpc: rpcHealth.http,
      websocket: rpcHealth.ws,
      latestBlock: rpcHealth.latestBlock
    };
    
    res.status(isRunning ? 200 : 503).json(status);
    
  } catch (error) {
    logger.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Full status endpoint (protected)
app.get('/status', securityMiddleware, async (req, res) => {
  try {
    const status = await getIndexerFullStatus();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: status
    });
    
  } catch (error) {
    logger.error('❌ Status request failed:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Backfill status
app.get('/backfill', async (req, res) => {
  try {
    const [summary, currentStatus] = await Promise.all([
      getBackfillSummary(),
      Promise.resolve(getBackfillStatus())
    ]);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        summary,
        current: currentStatus
      }
    });
    
  } catch (error) {
    logger.error('❌ Backfill status failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Stream status
app.get('/stream', async (req, res) => {
  try {
    const [status, health] = await Promise.all([
      Promise.resolve(getStreamStatus()),
      streamHealthCheck()
    ]);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        status,
        health
      }
    });
    
  } catch (error) {
    logger.error('❌ Stream status failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Reconciliation status
app.get('/reconcile', async (req, res) => {
  try {
    const status = await getReconciliationStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: status
    });
    
  } catch (error) {
    logger.error('❌ Reconcile status failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Database status
app.get('/database', async (req, res) => {
  try {
    const status = await getIndexerStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: status
    });
    
  } catch (error) {
    logger.error('❌ Database status failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Lookup gift mapping by tokenId
app.get('/mapping/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    if (!tokenId || isNaN(Number(tokenId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokenId parameter'
      });
    }
    
    const mapping = await getGiftMapping(tokenId);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Gift mapping not found'
      });
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: mapping
    });
    
  } catch (error) {
    logger.error(`❌ Mapping lookup failed for tokenId ${req.params.tokenId}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Configuration endpoint
app.get('/config', (req, res) => {
  // Return safe config (no secrets)
  const safeConfig = {
    chainId: config.chainId,
    contractAddress: config.contractAddress,
    deploymentBlock: config.deploymentBlock,
    batchBlocks: config.batchBlocks,
    confirmations: config.confirmations,
    reorgLookback: config.reorgLookback,
    readFrom: config.readFrom,
    port: config.port,
    logLevel: config.logLevel,
    healthCheckInterval: config.healthCheckInterval,
    maxLagSeconds: config.maxLagSeconds
  };
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: safeConfig
  });
});

// Metrics endpoint (Prometheus-compatible) with actionable alerts (protected)
app.get('/metrics', securityMiddleware, async (req, res) => {
  try {
    const status = await getIndexerFullStatus();
    const dbStatus = await getIndexerStatus();
    const { getBatchConfig } = await import('./rpc.js');
    const batchConfig = getBatchConfig();
    
    // Generate Prometheus metrics with alerting thresholds
    const metrics = [
      `# HELP indexer_running Whether the indexer is running`,
      `# TYPE indexer_running gauge`,
      `indexer_running ${status.isRunning ? 1 : 0}`,
      '',
      `# HELP indexer_uptime_seconds Indexer uptime in seconds`,
      `# TYPE indexer_uptime_seconds counter`,
      `indexer_uptime_seconds ${Math.floor(status.uptime / 1000)}`,
      '',
      `# HELP indexer_total_mappings Total number of gift mappings`,
      `# TYPE indexer_total_mappings counter`,
      `indexer_total_mappings ${dbStatus.totalMappings}`,
      '',
      `# HELP indexer_lag_seconds Indexer lag behind blockchain in seconds`,
      `# TYPE indexer_lag_seconds gauge`,
      `indexer_lag_seconds ${dbStatus.lagSeconds}`,
      '',
      `# HELP indexer_lag_high Whether lag is above threshold (alert if > 0)`,
      `# TYPE indexer_lag_high gauge`,
      `indexer_lag_high ${dbStatus.lagSeconds > config.maxLagSeconds ? 1 : 0}`,
      '',
      `# HELP indexer_dlq_count Dead letter queue entries`,
      `# TYPE indexer_dlq_count gauge`,
      `indexer_dlq_count ${dbStatus.dlqCount}`,
      '',
      `# HELP indexer_dlq_high Whether DLQ count is above threshold (alert if > 0)`,
      `# TYPE indexer_dlq_high gauge`,
      `indexer_dlq_high ${dbStatus.dlqCount > 0 ? 1 : 0}`,
      '',
      `# HELP indexer_batch_size_current Current adaptive batch size`,
      `# TYPE indexer_batch_size_current gauge`,
      `indexer_batch_size_current ${batchConfig.currentSize}`,
      '',
      `# HELP indexer_batch_errors_consecutive Consecutive batch errors`,
      `# TYPE indexer_batch_errors_consecutive gauge`,
      `indexer_batch_errors_consecutive ${batchConfig.consecutiveErrors}`,
      ''
    ];
    
    // Add backfill metrics if available
    if (status.backfill) {
      metrics.push(
        `# HELP indexer_backfill_progress Backfill progress percentage`,
        `# TYPE indexer_backfill_progress gauge`,
        `indexer_backfill_progress ${status.backfill.progressPercent || 0}`,
        '',
        `# HELP indexer_backfill_needed Whether backfill is needed (alert if > 0)`,
        `# TYPE indexer_backfill_needed gauge`,
        `indexer_backfill_needed ${status.backfill.isNeeded ? 1 : 0}`,
        ''
      );
    }
    
    // Add stream metrics if available
    if (status.stream) {
      metrics.push(
        `# HELP indexer_stream_events_total Total events processed by stream`,
        `# TYPE indexer_stream_events_total counter`,
        `indexer_stream_events_total ${status.stream.processedEvents || 0}`,
        '',
        `# HELP indexer_stream_latency_ms Average stream latency in milliseconds`,
        `# TYPE indexer_stream_latency_ms gauge`,
        `indexer_stream_latency_ms ${status.stream.averageLatencyMs || 0}`,
        '',
        `# HELP indexer_stream_failed_events Failed events in stream`,
        `# TYPE indexer_stream_failed_events counter`,
        `indexer_stream_failed_events ${status.stream.failedEvents || 0}`,
        ''
      );
    }
    
    // Add RPC health metrics
    if (status.rpc) {
      metrics.push(
        `# HELP indexer_rpc_http_healthy Whether HTTP RPC is healthy`,
        `# TYPE indexer_rpc_http_healthy gauge`,
        `indexer_rpc_http_healthy ${status.rpc.http ? 1 : 0}`,
        '',
        `# HELP indexer_rpc_ws_healthy Whether WebSocket RPC is healthy`,
        `# TYPE indexer_rpc_ws_healthy gauge`,
        `indexer_rpc_ws_healthy ${status.rpc.ws ? 1 : 0}`,
        ''
      );
    }
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
    
  } catch (error) {
    logger.error('❌ Metrics generation failed:', error);
    res.status(500).set('Content-Type', 'text/plain').send('# Error generating metrics\n');
  }
});

// Alerts endpoint for monitoring systems
app.get('/alerts', async (req, res) => {
  try {
    const status = await getIndexerFullStatus();
    const dbStatus = await getIndexerStatus();
    const alerts = [];
    
    // Critical alerts
    if (!status.isRunning) {
      alerts.push({
        severity: 'critical',
        alert: 'IndexerDown',
        message: 'Indexer is not running',
        action: 'Restart the indexer service immediately'
      });
    }
    
    if (!status.rpc?.http) {
      alerts.push({
        severity: 'critical',
        alert: 'RPCDown',
        message: 'HTTP RPC endpoint is not responding',
        action: 'Check RPC configuration and network connectivity'
      });
    }
    
    // Warning alerts
    if (dbStatus.lagSeconds > config.maxLagSeconds) {
      alerts.push({
        severity: 'warning',
        alert: 'HighIndexerLag',
        message: `Indexer lag is ${dbStatus.lagSeconds}s (threshold: ${config.maxLagSeconds}s)`,
        action: 'Check RPC rate limits and batch size configuration'
      });
    }
    
    if (dbStatus.dlqCount > 0) {
      alerts.push({
        severity: 'warning',
        alert: 'DLQEntries',
        message: `${dbStatus.dlqCount} events in dead letter queue`,
        action: 'Investigate failed events in indexer_dlq table'
      });
    }
    
    if (status.backfill?.isNeeded) {
      alerts.push({
        severity: 'info',
        alert: 'BackfillNeeded',
        message: `Backfill needed: ${status.backfill.blocksRemaining} blocks remaining`,
        action: 'Run backfill process to sync historical events'
      });
    }
    
    if (!status.rpc?.ws) {
      alerts.push({
        severity: 'warning',
        alert: 'WebSocketDown',
        message: 'WebSocket RPC endpoint is not responding',
        action: 'Check WebSocket RPC configuration, falling back to polling'
      });
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      alertsCount: alerts.length,
      data: alerts
    });
    
  } catch (error) {
    logger.error('❌ Alerts check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Debug endpoint (only in development)
app.get('/debug', async (req, res) => {
  if (config.logLevel !== 'debug' && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Debug endpoint disabled in production'
    });
  }
  
  try {
    const debug = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        LOG_LEVEL: process.env.LOG_LEVEL,
        READ_FROM: process.env.READ_FROM
      }
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: debug
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /status',
      'GET /backfill',
      'GET /stream',
      'GET /reconcile',
      'GET /database',
      'GET /mapping/:tokenId',
      'GET /config',
      'GET /metrics',
      'GET /debug'
    ]
  });
});

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('🚨 API Error:', error);
  
  res.status(500).json({
    success: false,
    timestamp: new Date().toISOString(),
    error: error.message || 'Internal server error'
  });
});

// Start API server
export async function startApiServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, () => {
      logger.info(`🌐 API server listening on port ${config.port}`);
      logger.info(`📊 Available endpoints:`);
      logger.info(`   - Health: http://localhost:${config.port}/health`);
      logger.info(`   - Status: http://localhost:${config.port}/status`);
      logger.info(`   - Mapping: http://localhost:${config.port}/mapping/:tokenId`);
      logger.info(`   - Metrics: http://localhost:${config.port}/metrics`);
      resolve();
    });
    
    server.on('error', (error) => {
      logger.error('❌ API server failed to start:', error);
      reject(error);
    });
  });
}

export default app;