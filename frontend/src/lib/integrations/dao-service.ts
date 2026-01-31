/**
 * 🏛️ DAO Service Client
 *
 * API client for communicating with the DAO service (mbxarts.com).
 * Provides typed methods for profiles, referrals, tasks, and governance.
 *
 * USAGE:
 * ```typescript
 * import { daoService } from '@/lib/integrations/dao-service';
 *
 * // Get profile
 * const profile = await daoService.getProfile('0x...');
 *
 * // Track referral
 * await daoService.trackReferral('REF-CODE', '0x...');
 * ```
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { apiGet, apiPost, apiPatch, type ApiResponse } from './api-client';
import { buildApiUrl, SERVICES, TIMEOUTS } from './config';

// =============================================================================
// TYPES
// =============================================================================

// Profile Types
export interface UserProfile {
  wallet_address: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
  email_verified?: boolean;
  twitter_handle?: string;
  twitter_verified?: boolean;
  discord_id?: string;
  discord_verified?: boolean;
  telegram_id?: string;
  telegram_verified?: boolean;
  reputation_score: number;
  tier: string;
  tier_color: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateRequest {
  display_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
}

// Referral Types
export interface ReferralCode {
  code: string;
  wallet_address: string;
  created_at: string;
  total_referrals: number;
  total_earnings: string;
}

export interface ReferralStats {
  total_referrals: number;
  level1_count: number;
  level2_count: number;
  level3_count: number;
  total_earnings: string;
  pending_rewards: string;
  tier: string;
}

export interface ReferralNetwork {
  wallet_address: string;
  referrer_wallet?: string;
  referral_code?: string;
  level: number;
  referred_users: ReferralNetwork[];
}

// Task Types
export interface Task {
  id: string;
  title: string;
  description: string;
  reward_amount: string;
  status: 'available' | 'claimed' | 'in_progress' | 'pending_review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  difficulty: string;
  estimated_hours: number;
  deadline?: string;
  assignee_wallet?: string;
  created_at: string;
  completed_at?: string;
}

// CGC Token Types
export interface CGCStats {
  total_supply: string;
  circulating_supply: string;
  holders_count: number;
  price_usd?: string;
}

// =============================================================================
// INTERNAL API KEY
// =============================================================================

function getInternalApiKey(): string {
  const key = process.env.DAO_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
  if (!key) {
    console.warn('⚠️ DAO_INTERNAL_API_KEY not configured. Some features may be limited.');
  }
  return key || '';
}

// =============================================================================
// DAO SERVICE CLIENT
// =============================================================================

class DAOServiceClient {
  private internalApiKey: string;

  constructor() {
    this.internalApiKey = getInternalApiKey();
  }

  private buildUrl(path: string): string {
    return buildApiUrl('DAO', path, true);
  }

  private getAuthHeaders(walletAddress?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.internalApiKey) {
      headers['X-API-Key'] = this.internalApiKey;
    }
    if (walletAddress) {
      headers['X-Wallet-Address'] = walletAddress;
    }
    return headers;
  }

  // ===========================================================================
  // PROFILE OPERATIONS
  // ===========================================================================

  /**
   * Get user profile by wallet address
   */
  async getProfile(walletAddress: string): Promise<ApiResponse<UserProfile>> {
    return apiGet<UserProfile>(
      this.buildUrl(`/profiles/${walletAddress}`),
      {
        headers: this.getAuthHeaders(),
        timeout: TIMEOUTS.default,
      }
    );
  }

  /**
   * Get or create profile (auto-creates if doesn't exist)
   */
  async getOrCreateProfile(walletAddress: string): Promise<ApiResponse<UserProfile>> {
    return apiPost<UserProfile>(
      this.buildUrl('/profiles'),
      { wallet_address: walletAddress },
      {
        headers: this.getAuthHeaders(walletAddress),
        timeout: TIMEOUTS.default,
      }
    );
  }

  /**
   * Update user profile
   */
  async updateProfile(
    walletAddress: string,
    updates: ProfileUpdateRequest
  ): Promise<ApiResponse<UserProfile>> {
    return apiPatch<UserProfile>(
      this.buildUrl(`/profiles/${walletAddress}`),
      updates,
      {
        headers: this.getAuthHeaders(walletAddress),
        timeout: TIMEOUTS.default,
      }
    );
  }

  // ===========================================================================
  // REFERRAL OPERATIONS
  // ===========================================================================

  /**
   * Get referral code for wallet (creates if doesn't exist)
   */
  async getReferralCode(walletAddress: string): Promise<ApiResponse<ReferralCode>> {
    return apiGet<ReferralCode>(
      this.buildUrl(`/referrals/code?wallet=${walletAddress}`),
      {
        headers: this.getAuthHeaders(walletAddress),
        timeout: TIMEOUTS.default,
      }
    );
  }

  /**
   * Track referral click/usage
   */
  async trackReferral(
    code: string,
    referredWallet: string,
    source?: string
  ): Promise<ApiResponse<{ tracked: boolean }>> {
    return apiPost<{ tracked: boolean }>(
      this.buildUrl('/referrals/track'),
      { code, referred_wallet: referredWallet, source },
      {
        headers: this.getAuthHeaders(referredWallet),
        timeout: TIMEOUTS.default,
      }
    );
  }

  /**
   * Get referral stats for wallet
   */
  async getReferralStats(walletAddress: string): Promise<ApiResponse<ReferralStats>> {
    return apiGet<ReferralStats>(
      this.buildUrl(`/referrals/stats?wallet=${walletAddress}`),
      {
        headers: this.getAuthHeaders(walletAddress),
        timeout: TIMEOUTS.default,
      }
    );
  }

  /**
   * Get referral network tree
   */
  async getReferralNetwork(
    walletAddress: string,
    depth = 3
  ): Promise<ApiResponse<ReferralNetwork>> {
    return apiGet<ReferralNetwork>(
      this.buildUrl(`/referrals/network?wallet=${walletAddress}&depth=${depth}`),
      {
        headers: this.getAuthHeaders(walletAddress),
        timeout: TIMEOUTS.default,
      }
    );
  }

  /**
   * Claim referral rewards
   */
  async claimReferralRewards(walletAddress: string): Promise<ApiResponse<{ txHash: string; amount: string }>> {
    return apiPost<{ txHash: string; amount: string }>(
      this.buildUrl('/referrals/rewards/claim'),
      { wallet_address: walletAddress },
      {
        headers: this.getAuthHeaders(walletAddress),
        timeout: TIMEOUTS.long,
      }
    );
  }

  // ===========================================================================
  // TASK OPERATIONS
  // ===========================================================================

  /**
   * Get available tasks
   */
  async getTasks(params?: {
    status?: Task['status'];
    category?: string;
    assignee?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ tasks: Task[]; total: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.assignee) searchParams.set('assignee', params.assignee);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return apiGet<{ tasks: Task[]; total: number }>(
      this.buildUrl(`/tasks${query ? `?${query}` : ''}`),
      {
        headers: this.getAuthHeaders(),
        timeout: TIMEOUTS.default,
      }
    );
  }

  /**
   * Claim a task
   */
  async claimTask(
    taskId: string,
    walletAddress: string
  ): Promise<ApiResponse<Task>> {
    return apiPost<Task>(
      this.buildUrl(`/tasks/${taskId}/claim`),
      { wallet_address: walletAddress },
      {
        headers: this.getAuthHeaders(walletAddress),
        timeout: TIMEOUTS.default,
      }
    );
  }

  // ===========================================================================
  // CGC TOKEN OPERATIONS
  // ===========================================================================

  /**
   * Get CGC token stats
   */
  async getCGCStats(): Promise<ApiResponse<CGCStats>> {
    return apiGet<CGCStats>(
      this.buildUrl('/cgc/stats'),
      {
        timeout: TIMEOUTS.default,
      }
    );
  }

  /**
   * Get CGC balance for wallet
   */
  async getCGCBalance(walletAddress: string): Promise<ApiResponse<{ balance: string }>> {
    return apiGet<{ balance: string }>(
      this.buildUrl(`/cgc/balance/${walletAddress}`),
      {
        headers: this.getAuthHeaders(),
        timeout: TIMEOUTS.default,
      }
    );
  }

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  /**
   * Check if DAO service is healthy
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return apiGet<{ status: string; timestamp: string }>(
      this.buildUrl('/health'),
      {
        timeout: TIMEOUTS.internal,
        noRetry: true,
      }
    );
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const daoService = new DAOServiceClient();

export { DAOServiceClient };
