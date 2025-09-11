/**
 * SERVERLESS-OPTIMIZED METRICS SYSTEM
 * Per-request sampling instead of setInterval for ephemeral environments
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

interface MetricsEvent {
  event: string;
  timestamp: number;
  metadata?: Record<string, any>;
  sessionId?: string;
}

interface MetricsCollector {
  mapping_lookup_total: number;
  mapping_json_ok: number;
  mapping_legacy_incompatible: number;
  mapping_invalid_format: number;
  mapping_missing: number;
  mapping_redis_error: number;
  claims_success: number;
  claims_failed: number;
  education_bypass_attempts: number;
}

// Lightweight in-memory counter (resets on each cold start)
const metrics: MetricsCollector = {
  mapping_lookup_total: 0,
  mapping_json_ok: 0,
  mapping_legacy_incompatible: 0,
  mapping_invalid_format: 0,
  mapping_missing: 0,
  mapping_redis_error: 0,
  claims_success: 0,
  claims_failed: 0,
  education_bypass_attempts: 0
};

// Sampling configuration
const METRIC_SAMPLING_RATE = parseFloat(process.env.METRIC_SAMPLING_RATE || '0.05'); // 5% default
const ENABLE_METRICS = process.env.ENABLE_METRICS !== 'false'; // Default: enabled

/**
 * Increment metric counter and optionally emit
 */
export function incrementMetric(
  metricName: keyof MetricsCollector, 
  metadata?: Record<string, any>
): void {
  if (!ENABLE_METRICS) return;
  
  // Always increment counter
  metrics[metricName]++;
  
  // Sample-based emission (not every request)
  if (Math.random() < METRIC_SAMPLING_RATE) {
    emitMetric(metricName, metadata);
  }
}

/**
 * Emit metric event (console log for now, can be extended to external systems)
 */
function emitMetric(
  metricName: keyof MetricsCollector, 
  metadata?: Record<string, any>
): void {
  const event: MetricsEvent = {
    event: metricName,
    timestamp: Date.now(),
    ...(metadata && { metadata })
  };
  
  // In serverless, use structured logging instead of setInterval
  console.log(JSON.stringify({
    type: 'metric',
    metric: metricName,
    current_value: metrics[metricName],
    sampling_rate: METRIC_SAMPLING_RATE,
    ...event
  }));
}

/**
 * Emit current metrics snapshot (for debugging/admin endpoints)
 */
export function emitMetricsSnapshot(): MetricsCollector {
  if (!ENABLE_METRICS) {
    return Object.keys(metrics).reduce((acc, key) => {
      acc[key as keyof MetricsCollector] = 0;
      return acc;
    }, {} as MetricsCollector);
  }
  
  console.log(JSON.stringify({
    type: 'metrics_snapshot',
    timestamp: Date.now(),
    metrics,
    sampling_rate: METRIC_SAMPLING_RATE
  }));
  
  return { ...metrics };
}

/**
 * Track gift mapping lookup result
 */
export function trackMappingLookup(reason: string, metadata?: Record<string, any>): void {
  incrementMetric('mapping_lookup_total', metadata);
  
  switch (reason) {
    case 'json_ok':
      incrementMetric('mapping_json_ok', metadata);
      break;
    case 'legacy_incompatible':
      incrementMetric('mapping_legacy_incompatible', metadata);
      break;
    case 'invalid_mapping_format':
      incrementMetric('mapping_invalid_format', metadata);
      break;
    case 'missing_mapping':
      incrementMetric('mapping_missing', metadata);
      break;
    case 'redis_error':
      incrementMetric('mapping_redis_error', metadata);
      break;
  }
}

/**
 * Track claim attempt result
 */
export function trackClaimResult(success: boolean, metadata?: Record<string, any>): void {
  if (success) {
    incrementMetric('claims_success', metadata);
  } else {
    incrementMetric('claims_failed', metadata);
  }
}

/**
 * Track education bypass attempt (security metric)
 */
export function trackEducationBypass(metadata?: Record<string, any>): void {
  incrementMetric('education_bypass_attempts', {
    ...metadata,
    security_event: true,
    requires_audit: true
  });
}