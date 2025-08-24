/**
 * Rate Limiter for AA Operations
 * Prevent abuse of paymaster sponsorship
 */

import { getAAConfig } from './config';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  dailySpentUSD: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config = getAAConfig(84532); // Default config
  
  /**
   * Check if operation is allowed
   */
  async checkLimit(
    account: string,
    estimatedCostUSD: number
  ): Promise<{
    allowed: boolean;
    reason?: string;
    remainingDailyUSD?: number;
    remainingRequests?: number;
  }> {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour
    const dayAgo = now - 86400000; // 24 hours
    
    // Get or create entry
    let entry = this.limits.get(account);
    
    if (!entry) {
      entry = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        dailySpentUSD: 0,
      };
      this.limits.set(account, entry);
    }
    
    // Reset counters if needed
    if (entry.firstRequest < dayAgo) {
      entry.count = 0;
      entry.dailySpentUSD = 0;
      entry.firstRequest = now;
    }
    
    // Check transaction limit
    if (estimatedCostUSD > this.config.paymaster.transactionLimitUSD) {
      return {
        allowed: false,
        reason: `Transaction exceeds limit of $${this.config.paymaster.transactionLimitUSD}`,
      };
    }
    
    // Check daily limit
    const newDailyTotal = entry.dailySpentUSD + estimatedCostUSD;
    if (newDailyTotal > this.config.paymaster.dailyLimitUSD) {
      return {
        allowed: false,
        reason: `Daily limit of $${this.config.paymaster.dailyLimitUSD} exceeded`,
        remainingDailyUSD: Math.max(0, this.config.paymaster.dailyLimitUSD - entry.dailySpentUSD),
      };
    }
    
    // Check hourly rate limit
    const recentRequests = this.getRecentRequestCount(account, hourAgo);
    if (recentRequests >= this.config.paymaster.rateLimit.maxRequestsPerHour) {
      return {
        allowed: false,
        reason: 'Hourly rate limit exceeded',
        remainingRequests: 0,
      };
    }
    
    // Check daily rate limit
    if (entry.count >= this.config.paymaster.rateLimit.maxRequestsPerDay) {
      return {
        allowed: false,
        reason: 'Daily request limit exceeded',
        remainingRequests: 0,
      };
    }
    
    // Update entry
    entry.count++;
    entry.lastRequest = now;
    entry.dailySpentUSD = newDailyTotal;
    
    return {
      allowed: true,
      remainingDailyUSD: this.config.paymaster.dailyLimitUSD - newDailyTotal,
      remainingRequests: this.config.paymaster.rateLimit.maxRequestsPerDay - entry.count,
    };
  }
  
  /**
   * Get recent request count
   */
  private getRecentRequestCount(account: string, since: number): number {
    const entry = this.limits.get(account);
    if (!entry) return 0;
    
    // Simplified: count all requests if last was within the hour
    // In production, store request timestamps
    if (entry.lastRequest > since) {
      return Math.min(entry.count, this.config.paymaster.rateLimit.maxRequestsPerHour);
    }
    
    return 0;
  }
  
  /**
   * Record successful operation
   */
  recordSuccess(account: string, costUSD: number) {
    const entry = this.limits.get(account);
    if (entry) {
      console.log('[RateLimiter] Operation recorded:', {
        account: account.slice(0, 10) + '...',
        costUSD,
        dailyTotal: entry.dailySpentUSD,
      });
    }
  }
  
  /**
   * Get account statistics
   */
  getStats(account: string): {
    requestsToday: number;
    spentTodayUSD: number;
    remainingDailyUSD: number;
    lastRequestTime: number;
  } | null {
    const entry = this.limits.get(account);
    if (!entry) return null;
    
    return {
      requestsToday: entry.count,
      spentTodayUSD: entry.dailySpentUSD,
      remainingDailyUSD: Math.max(0, this.config.paymaster.dailyLimitUSD - entry.dailySpentUSD),
      lastRequestTime: entry.lastRequest,
    };
  }
  
  /**
   * Clean up old entries
   */
  cleanup() {
    const dayAgo = Date.now() - 86400000;
    
    for (const [account, entry] of this.limits.entries()) {
      if (entry.lastRequest < dayAgo) {
        this.limits.delete(account);
      }
    }
    
    console.log('[RateLimiter] Cleanup completed, active accounts:', this.limits.size);
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Cleanup every hour
if (typeof window !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 3600000);
}

export { rateLimiter };

/**
 * Check if paymaster operation is allowed
 */
export async function checkPaymasterLimit(
  account: string,
  estimatedCostUSD: number
): Promise<boolean> {
  const result = await rateLimiter.checkLimit(account, estimatedCostUSD);
  
  if (!result.allowed) {
    console.warn('[Paymaster] Operation blocked:', result.reason);
  }
  
  return result.allowed;
}

/**
 * Get account usage statistics
 */
export function getAccountStats(account: string) {
  return rateLimiter.getStats(account);
}