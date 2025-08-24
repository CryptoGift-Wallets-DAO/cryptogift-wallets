/**
 * Telemetry & Monitoring
 * Metrics, events, and error tracking
 */

interface TelemetryEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

interface Metric {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private metrics: Map<string, number[]> = new Map();
  private sessionId: string;
  private userId?: string;
  private enabled: boolean;
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.enabled = process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === 'true';
    
    // Flush queue periodically
    if (typeof window !== 'undefined' && this.enabled) {
      setInterval(() => this.flush(), 30000); // Every 30 seconds
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }
  
  /**
   * Track an event
   */
  track(name: string, properties?: Record<string, any>): void {
    if (!this.enabled) return;
    
    const event: TelemetryEvent = {
      name,
      properties: this.sanitizeProperties(properties),
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
    };
    
    this.queue.push(event);
    
    // Flush if queue is large
    if (this.queue.length >= 50) {
      this.flush();
    }
    
    // Also send to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Telemetry]', name, properties);
    }
  }
  
  /**
   * Record a metric
   */
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    if (!this.enabled) return;
    
    // Store for aggregation
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Track as event for now
    this.track(`metric.${name}`, {
      value,
      unit,
      ...tags,
    });
  }
  
  /**
   * Report an error
   */
  error(error: Error | string, context?: Record<string, any>, severity: ErrorReport['severity'] = 'medium'): void {
    const errorReport: ErrorReport = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context: this.sanitizeProperties(context),
      severity,
    };
    
    // Track as high-priority event
    this.track('error', {
      ...errorReport,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
    
    // Immediately flush errors
    if (severity === 'high' || severity === 'critical') {
      this.flush();
    }
    
    // Send to Sentry if configured
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        level: severity,
        extra: context,
      });
    }
  }
  
  /**
   * Set user ID
   */
  setUser(userId: string): void {
    this.userId = userId;
    this.track('user.identified', { userId });
  }
  
  /**
   * Clear user
   */
  clearUser(): void {
    this.userId = undefined;
    this.sessionId = this.generateSessionId();
    this.track('user.cleared');
  }
  
  /**
   * Flush queued events
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      // Send to analytics endpoint
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Re-queue events on failure
      this.queue.unshift(...events);
      console.error('[Telemetry] Flush failed:', error);
    }
  }
  
  /**
   * Sanitize properties to remove PII
   */
  private sanitizeProperties(props?: Record<string, any>): Record<string, any> | undefined {
    if (!props) return undefined;
    
    const sanitized: Record<string, any> = {};
    const piiKeys = ['password', 'secret', 'token', 'key', 'email', 'phone', 'ssn'];
    
    for (const [key, value] of Object.entries(props)) {
      // Check for PII keys
      if (piiKeys.some(pii => key.toLowerCase().includes(pii))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      
      // Sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeProperties(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get aggregated metrics
   */
  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const aggregated: Record<string, any> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length === 0) continue;
      
      aggregated[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    }
    
    return aggregated;
  }
  
  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Export singleton instance
export const telemetry = new TelemetryService();

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  
  /**
   * Start timing
   */
  start(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  /**
   * End timing and record metric
   */
  end(name: string): number {
    const start = this.marks.get(name);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.marks.delete(name);
    
    // Record metric
    telemetry.metric(`performance.${name}`, duration, 'ms');
    
    return duration;
  }
  
  /**
   * Measure async function
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }
}

export const performance = new PerformanceMonitor();

/**
 * Standard telemetry events
 */
export const TELEMETRY_EVENTS = {
  // Page views
  PAGE_VIEW: 'page.view',
  PAGE_EXIT: 'page.exit',
  
  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_ERROR: 'auth.error',
  
  // Wallet
  WALLET_CONNECT: 'wallet.connect',
  WALLET_DISCONNECT: 'wallet.disconnect',
  WALLET_SWITCH: 'wallet.switch',
  
  // Transactions
  TX_INITIATED: 'tx.initiated',
  TX_CONFIRMED: 'tx.confirmed',
  TX_FAILED: 'tx.failed',
  
  // Bridge
  BRIDGE_QUOTE: 'bridge.quote',
  BRIDGE_EXECUTE: 'bridge.execute',
  BRIDGE_SUCCESS: 'bridge.success',
  BRIDGE_FAILURE: 'bridge.failure',
  
  // On-ramp
  ONRAMP_START: 'onramp.start',
  ONRAMP_SUCCESS: 'onramp.success',
  ONRAMP_FAILURE: 'onramp.failure',
  
  // AA
  PAYMASTER_USED: 'paymaster.used',
  PAYMASTER_FALLBACK: 'paymaster.fallback',
  SESSION_CREATED: 'session.created',
  SESSION_REVOKED: 'session.revoked',
  RECOVERY_INITIATED: 'recovery.initiated',
  
  // Errors
  ERROR_BOUNDARY: 'error.boundary',
  ERROR_API: 'error.api',
  ERROR_NETWORK: 'error.network',
} as const;

/**
 * Standard metrics
 */
export const METRICS = {
  // Performance
  API_LATENCY: 'api.latency',
  RPC_LATENCY: 'rpc.latency',
  PAGE_LOAD: 'page.load',
  
  // Usage
  DAILY_ACTIVE_USERS: 'dau',
  TRANSACTIONS_COUNT: 'tx.count',
  BRIDGE_VOLUME: 'bridge.volume',
  ONRAMP_VOLUME: 'onramp.volume',
  
  // Success rates
  TX_SUCCESS_RATE: 'tx.success_rate',
  BRIDGE_SUCCESS_RATE: 'bridge.success_rate',
  PAYMASTER_SUCCESS_RATE: 'paymaster.success_rate',
  
  // Errors
  ERROR_RATE: 'error.rate',
  API_ERROR_RATE: 'api.error_rate',
} as const;