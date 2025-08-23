/**
 * MEV Protection Metrics
 * Tracks transaction routing and protection effectiveness
 * NO PII - Only aggregated metrics
 */

interface MEVMetrics {
  totalTransactions: number;
  protectedTransactions: number;
  publicTransactions: number;
  fallbackCount: number;
  avgInclusionTime: number; // in blocks
  refundsReceived: number; // in wei
  lastUpdated: number;
}

interface TransactionMetric {
  txHash: string;
  timestamp: number;
  chainId: number;
  isProtected: boolean;
  inclusionTime?: number; // blocks
  gasUsed?: bigint;
  refundReceived?: bigint;
}

const METRICS_STORAGE_KEY = 'mev-metrics';
const TX_METRICS_STORAGE_KEY = 'mev-tx-metrics';
const MAX_TX_METRICS = 100; // Keep last 100 transactions

class MEVMetricsTracker {
  private metrics: MEVMetrics;
  private txMetrics: TransactionMetric[];

  constructor() {
    this.metrics = this.loadMetrics();
    this.txMetrics = this.loadTxMetrics();
  }

  private loadMetrics(): MEVMetrics {
    if (typeof window === 'undefined') {
      return this.getDefaultMetrics();
    }

    try {
      const stored = localStorage.getItem(METRICS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load MEV metrics:', error);
    }

    return this.getDefaultMetrics();
  }

  private loadTxMetrics(): TransactionMetric[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(TX_METRICS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load transaction metrics:', error);
    }

    return [];
  }

  private getDefaultMetrics(): MEVMetrics {
    return {
      totalTransactions: 0,
      protectedTransactions: 0,
      publicTransactions: 0,
      fallbackCount: 0,
      avgInclusionTime: 0,
      refundsReceived: 0,
      lastUpdated: Date.now(),
    };
  }

  private saveMetrics(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(this.metrics));
      localStorage.setItem(TX_METRICS_STORAGE_KEY, JSON.stringify(this.txMetrics));
    } catch (error) {
      console.error('Failed to save MEV metrics:', error);
    }
  }

  /**
   * Track a new transaction
   */
  trackTransaction(
    txHash: string,
    chainId: number,
    isProtected: boolean
  ): void {
    // Update counters
    this.metrics.totalTransactions++;
    if (isProtected) {
      this.metrics.protectedTransactions++;
    } else {
      this.metrics.publicTransactions++;
    }
    this.metrics.lastUpdated = Date.now();

    // Add to transaction metrics
    const metric: TransactionMetric = {
      txHash,
      timestamp: Date.now(),
      chainId,
      isProtected,
    };

    this.txMetrics.unshift(metric);

    // Limit stored transactions
    if (this.txMetrics.length > MAX_TX_METRICS) {
      this.txMetrics = this.txMetrics.slice(0, MAX_TX_METRICS);
    }

    this.saveMetrics();
  }

  /**
   * Track a fallback event
   */
  trackFallback(): void {
    this.metrics.fallbackCount++;
    this.metrics.lastUpdated = Date.now();
    this.saveMetrics();
  }

  /**
   * Update transaction with inclusion data
   */
  updateTransactionInclusion(
    txHash: string,
    inclusionTime: number,
    gasUsed?: bigint,
    refundReceived?: bigint
  ): void {
    const metric = this.txMetrics.find(m => m.txHash === txHash);
    if (metric) {
      metric.inclusionTime = inclusionTime;
      if (gasUsed) metric.gasUsed = gasUsed;
      if (refundReceived) {
        metric.refundReceived = refundReceived;
        this.metrics.refundsReceived += Number(refundReceived);
      }

      // Update average inclusion time
      const metricsWithTime = this.txMetrics.filter(m => m.inclusionTime !== undefined);
      if (metricsWithTime.length > 0) {
        const totalTime = metricsWithTime.reduce((sum, m) => sum + (m.inclusionTime || 0), 0);
        this.metrics.avgInclusionTime = Math.round(totalTime / metricsWithTime.length);
      }

      this.metrics.lastUpdated = Date.now();
      this.saveMetrics();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): MEVMetrics {
    return { ...this.metrics };
  }

  /**
   * Get transaction metrics
   */
  getTransactionMetrics(limit: number = 20): TransactionMetric[] {
    return this.txMetrics.slice(0, limit);
  }

  /**
   * Get protection rate
   */
  getProtectionRate(): number {
    if (this.metrics.totalTransactions === 0) return 0;
    return (this.metrics.protectedTransactions / this.metrics.totalTransactions) * 100;
  }

  /**
   * Get fallback rate
   */
  getFallbackRate(): number {
    if (this.metrics.protectedTransactions === 0) return 0;
    return (this.metrics.fallbackCount / this.metrics.protectedTransactions) * 100;
  }

  /**
   * Reset metrics (admin only)
   */
  resetMetrics(): void {
    this.metrics = this.getDefaultMetrics();
    this.txMetrics = [];
    this.saveMetrics();
  }
}

// Singleton instance
export const mevMetrics = new MEVMetricsTracker();

// Export convenience functions
export const trackMEVTransaction = (
  txHash: string,
  chainId: number,
  isProtected: boolean
) => mevMetrics.trackTransaction(txHash, chainId, isProtected);

export const trackMEVFallback = () => mevMetrics.trackFallback();

export const updateMEVTransactionInclusion = (
  txHash: string,
  inclusionTime: number,
  gasUsed?: bigint,
  refundReceived?: bigint
) => mevMetrics.updateTransactionInclusion(txHash, inclusionTime, gasUsed, refundReceived);

export const getMEVMetrics = () => mevMetrics.getMetrics();
export const getMEVTransactionMetrics = (limit?: number) => mevMetrics.getTransactionMetrics(limit);
export const getMEVProtectionRate = () => mevMetrics.getProtectionRate();
export const getMEVFallbackRate = () => mevMetrics.getFallbackRate();