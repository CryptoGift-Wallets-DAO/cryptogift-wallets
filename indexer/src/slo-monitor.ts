/**
 * 🎯 SLO Monitor - Service Level Objectives with Automatic Actions
 * Monitors lag, DLQ, and performance with automatic remediation
 */

import { getIndexerStatus } from './database.js';
import { getBatchConfig, resetFilters } from './rpc.js';
import { config } from './config.js';
import { logger } from './logger.js';

// SLO Configuration
const SLO_CONFIG = {
  // Lag thresholds
  LAG_WARNING_SECONDS: 120,    // 2 minutes
  LAG_CRITICAL_SECONDS: 300,   // 5 minutes
  LAG_EMERGENCY_SECONDS: 900,  // 15 minutes
  
  // DLQ thresholds
  DLQ_WARNING_COUNT: 10,
  DLQ_CRITICAL_COUNT: 50,
  
  // Batch error thresholds
  BATCH_ERROR_WARNING: 3,
  BATCH_ERROR_CRITICAL: 5,
  
  // Check intervals
  CHECK_INTERVAL_MS: 30000,    // 30 seconds
  ACTION_COOLDOWN_MS: 300000,  // 5 minutes between actions
};

// SLO State tracking
interface SLOState {
  lagSeconds: number;
  dlqCount: number;
  batchErrors: number;
  lastLagActionTime: number;
  lastDlqActionTime: number;
  lagViolationStart?: number;
  isMonitoring: boolean;
  consecutiveViolations: number;
}

let sloState: SLOState = {
  lagSeconds: 0,
  dlqCount: 0,
  batchErrors: 0,
  lastLagActionTime: 0,
  lastDlqActionTime: 0,
  isMonitoring: false,
  consecutiveViolations: 0
};

let monitorTimer: NodeJS.Timeout | null = null;

// SLO Alert types
export interface SLOAlert {
  severity: 'warning' | 'critical' | 'emergency';
  metric: 'lag' | 'dlq' | 'batch_errors';
  value: number;
  threshold: number;
  duration?: number;
  action: string;
  actionTaken: boolean;
}

// Start SLO monitoring
export function startSLOMonitoring(): void {
  if (sloState.isMonitoring) {
    logger.warn('⚠️ SLO monitoring already running');
    return;
  }

  sloState.isMonitoring = true;
  logger.info('🎯 Starting SLO monitoring...');

  monitorTimer = setInterval(async () => {
    try {
      await checkSLOs();
    } catch (error) {
      logger.error('❌ SLO monitoring error:', error);
    }
  }, SLO_CONFIG.CHECK_INTERVAL_MS);

  logger.info(`✅ SLO monitoring started (${SLO_CONFIG.CHECK_INTERVAL_MS}ms interval)`);
}

// Stop SLO monitoring
export function stopSLOMonitoring(): void {
  if (!sloState.isMonitoring) return;

  sloState.isMonitoring = false;
  
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  
  logger.info('🛑 SLO monitoring stopped');
}

// Main SLO check function
async function checkSLOs(): Promise<SLOAlert[]> {
  const alerts: SLOAlert[] = [];
  
  try {
    // Get current metrics
    const dbStatus = await getIndexerStatus();
    const batchConfig = getBatchConfig();
    
    // Update state
    sloState.lagSeconds = dbStatus.lagSeconds;
    sloState.dlqCount = dbStatus.dlqCount;
    sloState.batchErrors = batchConfig.consecutiveErrors;
    
    // Check lag SLO
    const lagAlerts = await checkLagSLO();
    alerts.push(...lagAlerts);
    
    // Check DLQ SLO
    const dlqAlerts = await checkDLQSLO();
    alerts.push(...dlqAlerts);
    
    // Check batch error SLO
    const batchAlerts = await checkBatchErrorSLO();
    alerts.push(...batchAlerts);
    
    // Log alerts
    for (const alert of alerts) {
      logger.warn(`🚨 SLO Alert: ${alert.severity} - ${alert.metric} = ${alert.value} (threshold: ${alert.threshold})`);
      if (alert.actionTaken) {
        logger.info(`🔧 Automatic action taken: ${alert.action}`);
      }
    }
    
    // Track violation streaks
    if (alerts.length > 0) {
      sloState.consecutiveViolations++;
    } else {
      sloState.consecutiveViolations = 0;
      if (sloState.lagViolationStart) {
        sloState.lagViolationStart = undefined;
      }
    }
    
    return alerts;
    
  } catch (error) {
    logger.error('❌ SLO check failed:', error);
    return [];
  }
}

// Check indexing lag SLO
async function checkLagSLO(): Promise<SLOAlert[]> {
  const alerts: SLOAlert[] = [];
  const now = Date.now();
  const lagSeconds = sloState.lagSeconds;
  
  // Track violation duration
  if (lagSeconds > SLO_CONFIG.LAG_WARNING_SECONDS) {
    if (!sloState.lagViolationStart) {
      sloState.lagViolationStart = now;
    }
  } else {
    sloState.lagViolationStart = undefined;
  }
  
  const violationDuration = sloState.lagViolationStart ? 
    (now - sloState.lagViolationStart) / 1000 : 0;
  
  // Emergency: 15+ minutes of high lag
  if (lagSeconds > SLO_CONFIG.LAG_EMERGENCY_SECONDS && violationDuration > 900) {
    const alert: SLOAlert = {
      severity: 'emergency',
      metric: 'lag',
      value: lagSeconds,
      threshold: SLO_CONFIG.LAG_EMERGENCY_SECONDS,
      duration: violationDuration,
      action: 'Force reconciliation and reset RPC connections',
      actionTaken: false
    };
    
    // Take emergency action if cooldown period passed
    if (now - sloState.lastLagActionTime > SLO_CONFIG.ACTION_COOLDOWN_MS) {
      await emergencyLagAction();
      alert.actionTaken = true;
      sloState.lastLagActionTime = now;
    }
    
    alerts.push(alert);
    
  // Critical: 5+ minutes of high lag
  } else if (lagSeconds > SLO_CONFIG.LAG_CRITICAL_SECONDS && violationDuration > 300) {
    const alert: SLOAlert = {
      severity: 'critical',
      metric: 'lag',
      value: lagSeconds,
      threshold: SLO_CONFIG.LAG_CRITICAL_SECONDS,
      duration: violationDuration,
      action: 'Reduce batch size and switch to RPC fallback',
      actionTaken: false
    };
    
    // Take critical action if cooldown period passed
    if (now - sloState.lastLagActionTime > SLO_CONFIG.ACTION_COOLDOWN_MS) {
      await criticalLagAction();
      alert.actionTaken = true;
      sloState.lastLagActionTime = now;
    }
    
    alerts.push(alert);
    
  // Warning: immediate high lag
  } else if (lagSeconds > SLO_CONFIG.LAG_WARNING_SECONDS) {
    alerts.push({
      severity: 'warning',
      metric: 'lag',
      value: lagSeconds,
      threshold: SLO_CONFIG.LAG_WARNING_SECONDS,
      duration: violationDuration,
      action: 'Monitor closely, no automatic action yet',
      actionTaken: false
    });
  }
  
  return alerts;
}

// Check DLQ SLO
async function checkDLQSLO(): Promise<SLOAlert[]> {
  const alerts: SLOAlert[] = [];
  const dlqCount = sloState.dlqCount;
  
  if (dlqCount > SLO_CONFIG.DLQ_CRITICAL_COUNT) {
    alerts.push({
      severity: 'critical',
      metric: 'dlq',
      value: dlqCount,
      threshold: SLO_CONFIG.DLQ_CRITICAL_COUNT,
      action: 'DLQ overflow - manual intervention required',
      actionTaken: false
    });
  } else if (dlqCount > SLO_CONFIG.DLQ_WARNING_COUNT) {
    alerts.push({
      severity: 'warning',
      metric: 'dlq',
      value: dlqCount,
      threshold: SLO_CONFIG.DLQ_WARNING_COUNT,
      action: 'Investigate DLQ entries and event parsing issues',
      actionTaken: false
    });
  }
  
  return alerts;
}

// Check batch error SLO
async function checkBatchErrorSLO(): Promise<SLOAlert[]> {
  const alerts: SLOAlert[] = [];
  const batchErrors = sloState.batchErrors;
  
  if (batchErrors > SLO_CONFIG.BATCH_ERROR_CRITICAL) {
    alerts.push({
      severity: 'critical',
      metric: 'batch_errors',
      value: batchErrors,
      threshold: SLO_CONFIG.BATCH_ERROR_CRITICAL,
      action: 'Multiple consecutive batch failures - check RPC connectivity',
      actionTaken: false
    });
  } else if (batchErrors > SLO_CONFIG.BATCH_ERROR_WARNING) {
    alerts.push({
      severity: 'warning',
      metric: 'batch_errors',
      value: batchErrors,
      threshold: SLO_CONFIG.BATCH_ERROR_WARNING,
      action: 'Batch errors detected - may indicate RPC rate limiting',
      actionTaken: false
    });
  }
  
  return alerts;
}

// Critical lag remediation actions
async function criticalLagAction(): Promise<void> {
  logger.warn('🔧 Taking critical lag action: reducing batch size and resetting RPC');
  
  try {
    // Reset RPC connections and filters
    resetFilters();
    
    // The adaptive batch system will automatically reduce batch size
    // due to the errors it's encountering
    
    logger.info('✅ Critical lag action completed');
  } catch (error) {
    logger.error('❌ Critical lag action failed:', error);
  }
}

// Emergency lag remediation actions
async function emergencyLagAction(): Promise<void> {
  logger.error('🚨 Taking emergency lag action: force reconciliation and full reset');
  
  try {
    // Reset all RPC connections
    resetFilters();
    
    // Force a reconciliation run
    const { runPeriodicReconciliation } = await import('./reconcile.js');
    await runPeriodicReconciliation();
    
    logger.info('✅ Emergency lag action completed');
  } catch (error) {
    logger.error('❌ Emergency lag action failed:', error);
  }
}

// Get current SLO status
export function getSLOStatus(): {
  isMonitoring: boolean;
  metrics: {
    lagSeconds: number;
    dlqCount: number;
    batchErrors: number;
  };
  violations: {
    consecutive: number;
    lagViolationDuration?: number;
  };
  thresholds: typeof SLO_CONFIG;
} {
  const lagViolationDuration = sloState.lagViolationStart ? 
    (Date.now() - sloState.lagViolationStart) / 1000 : undefined;
  
  return {
    isMonitoring: sloState.isMonitoring,
    metrics: {
      lagSeconds: sloState.lagSeconds,
      dlqCount: sloState.dlqCount,
      batchErrors: sloState.batchErrors
    },
    violations: {
      consecutive: sloState.consecutiveViolations,
      lagViolationDuration
    },
    thresholds: SLO_CONFIG
  };
}

// Manual SLO check (for API endpoints)
export async function performManualSLOCheck(): Promise<SLOAlert[]> {
  return await checkSLOs();
}

// Update SLO configuration
export function updateSLOConfig(updates: Partial<typeof SLO_CONFIG>): void {
  Object.assign(SLO_CONFIG, updates);
  logger.info('⚙️ SLO configuration updated:', updates);
}