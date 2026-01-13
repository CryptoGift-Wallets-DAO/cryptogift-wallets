/**
 * MANIFOLD MARKETS CLIENT
 * Integration with Manifold Markets API for prediction markets
 *
 * Manifold uses CPMM (Constant Product Market Maker) for probability calculations:
 * Formula: k = y^p * n^(1-p)
 * Where:
 * - y = YES pool amount
 * - n = NO pool amount
 * - p = current probability
 * - k = constant (maintains liquidity)
 *
 * API Documentation: https://docs.manifold.markets/api
 */

import type {
  ManifoldMarket,
  ManifoldBet,
  ManifoldPosition,
  CPMMState,
  APIResponse
} from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MANIFOLD_API_BASE = 'https://api.manifold.markets/v0';

// API Key placeholder - will be set from environment or runtime config
let manifoldApiKey: string | null = null;

export function setManifoldApiKey(key: string): void {
  manifoldApiKey = key;
}

export function isManifoldConfigured(): boolean {
  return manifoldApiKey !== null && manifoldApiKey.length > 0;
}

// ============================================================================
// API HELPERS
// ============================================================================

async function manifoldFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  if (!isManifoldConfigured()) {
    return {
      success: false,
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Manifold API key not configured. Set NEXT_PUBLIC_MANIFOLD_API_KEY or call setManifoldApiKey()'
      }
    };
  }

  const url = `${MANIFOLD_API_BASE}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Add auth for authenticated endpoints
  if (manifoldApiKey) {
    (headers as Record<string, string>)['Authorization'] = `Key ${manifoldApiKey}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: errorData.message || response.statusText,
          details: errorData
        }
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      meta: {
        timestamp: Date.now(),
        requestId: response.headers.get('x-request-id') || ''
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
        details: error
      }
    };
  }
}

// ============================================================================
// CPMM MATHEMATICS
// ============================================================================

/**
 * Calculate shares received for a bet using CPMM formula
 * Based on Manifold's implementation
 */
export function calculateShares(
  betAmount: number,
  outcome: 'YES' | 'NO',
  pool: { YES: number; NO: number },
  probability: number
): number {
  const p = probability;
  const y = pool.YES;
  const n = pool.NO;

  // Calculate current k
  const k = Math.pow(y, p) * Math.pow(n, 1 - p);

  if (outcome === 'YES') {
    // New YES pool after bet
    const newY = y + betAmount;
    // New NO pool to maintain k
    const newN = Math.pow(k / Math.pow(newY, p), 1 / (1 - p));
    // Shares = reduction in NO pool
    return n - newN;
  } else {
    // New NO pool after bet
    const newN = n + betAmount;
    // New YES pool to maintain k
    const newY = Math.pow(k / Math.pow(newN, 1 - p), 1 / p);
    // Shares = reduction in YES pool
    return y - newY;
  }
}

/**
 * Calculate new probability after a bet
 */
export function calculateNewProbability(
  betAmount: number,
  outcome: 'YES' | 'NO',
  pool: { YES: number; NO: number },
  currentProbability: number
): number {
  const shares = calculateShares(betAmount, outcome, pool, currentProbability);

  const newPool = {
    YES: outcome === 'YES' ? pool.YES + betAmount : pool.YES - shares,
    NO: outcome === 'NO' ? pool.NO + betAmount : pool.NO - shares
  };

  // New probability = YES / (YES + NO)
  return newPool.YES / (newPool.YES + newPool.NO);
}

/**
 * Calculate expected payout if outcome wins
 */
export function calculatePayout(shares: number): number {
  // In CPMM, if you have X shares of the winning outcome,
  // you receive X (1:1 payout)
  return shares;
}

/**
 * Get CPMM state for analysis
 */
export function getCPMMState(pool: { YES: number; NO: number }): CPMMState {
  const yesPool = pool.YES;
  const noPool = pool.NO;
  const probability = yesPool / (yesPool + noPool);
  const p = probability;
  const k = Math.pow(yesPool, p) * Math.pow(noPool, 1 - p);

  return {
    yesPool,
    noPool,
    probability,
    k
  };
}

// ============================================================================
// MARKET OPERATIONS
// ============================================================================

/**
 * Get market by ID
 */
export async function getMarket(marketId: string): Promise<APIResponse<ManifoldMarket>> {
  return manifoldFetch<ManifoldMarket>(`/market/${marketId}`);
}

/**
 * Search markets
 */
export async function searchMarkets(
  query: string,
  options?: {
    limit?: number;
    sort?: 'newest' | 'score' | 'liquidity';
  }
): Promise<APIResponse<ManifoldMarket[]>> {
  const params = new URLSearchParams({
    term: query,
    limit: String(options?.limit || 20),
    sort: options?.sort || 'score'
  });

  return manifoldFetch<ManifoldMarket[]>(`/search-markets?${params}`);
}

/**
 * Get markets by creator
 */
export async function getMarketsByCreator(
  userId: string
): Promise<APIResponse<ManifoldMarket[]>> {
  return manifoldFetch<ManifoldMarket[]>(`/user/${userId}/markets`);
}

/**
 * Create a new binary market
 */
export async function createBinaryMarket(params: {
  question: string;
  description: string;
  closeTime: number;  // Unix timestamp ms
  initialProb: number;  // 1-99
  ante?: number;  // Initial liquidity
}): Promise<APIResponse<ManifoldMarket>> {
  return manifoldFetch<ManifoldMarket>('/market', {
    method: 'POST',
    body: JSON.stringify({
      outcomeType: 'BINARY',
      question: params.question,
      description: params.description,
      closeTime: params.closeTime,
      initialProb: params.initialProb,
      ante: params.ante || 100  // Manifold uses M$ units
    })
  });
}

/**
 * Create a multiple choice market
 */
export async function createMultipleChoiceMarket(params: {
  question: string;
  description: string;
  closeTime: number;
  answers: string[];
  ante?: number;
}): Promise<APIResponse<ManifoldMarket>> {
  return manifoldFetch<ManifoldMarket>('/market', {
    method: 'POST',
    body: JSON.stringify({
      outcomeType: 'MULTIPLE_CHOICE',
      question: params.question,
      description: params.description,
      closeTime: params.closeTime,
      answers: params.answers,
      ante: params.ante || 100
    })
  });
}

// ============================================================================
// BETTING OPERATIONS
// ============================================================================

/**
 * Place a bet on a market
 */
export async function placeBet(params: {
  marketId: string;
  amount: number;
  outcome: 'YES' | 'NO';
  limitProb?: number;  // For limit orders
}): Promise<APIResponse<ManifoldBet>> {
  return manifoldFetch<ManifoldBet>('/bet', {
    method: 'POST',
    body: JSON.stringify({
      contractId: params.marketId,
      amount: params.amount,
      outcome: params.outcome,
      limitProb: params.limitProb
    })
  });
}

/**
 * Cancel a limit order bet
 */
export async function cancelBet(betId: string): Promise<APIResponse<{ success: boolean }>> {
  return manifoldFetch<{ success: boolean }>(`/bet/cancel/${betId}`, {
    method: 'POST'
  });
}

/**
 * Sell shares
 */
export async function sellShares(params: {
  marketId: string;
  outcome: 'YES' | 'NO';
  shares?: number;  // If not provided, sells all
}): Promise<APIResponse<ManifoldBet>> {
  return manifoldFetch<ManifoldBet>('/market/sell', {
    method: 'POST',
    body: JSON.stringify({
      contractId: params.marketId,
      outcome: params.outcome,
      shares: params.shares
    })
  });
}

/**
 * Get user's bets on a market
 */
export async function getUserBets(
  userId: string,
  marketId?: string
): Promise<APIResponse<ManifoldBet[]>> {
  let endpoint = `/user/${userId}/bets`;
  if (marketId) {
    endpoint += `?contractId=${marketId}`;
  }
  return manifoldFetch<ManifoldBet[]>(endpoint);
}

/**
 * Get user's positions
 */
export async function getUserPositions(
  userId: string
): Promise<APIResponse<ManifoldPosition[]>> {
  const betsResponse = await getUserBets(userId);
  if (!betsResponse.success || !betsResponse.data) {
    return {
      success: false,
      error: betsResponse.error
    };
  }

  // Aggregate bets into positions
  const positionMap = new Map<string, ManifoldPosition>();

  for (const bet of betsResponse.data) {
    const key = `${bet.marketId}-${bet.outcome}`;
    const existing = positionMap.get(key);

    if (existing) {
      existing.shares += bet.shares;
      existing.invested += bet.amount;
    } else {
      positionMap.set(key, {
        outcome: bet.outcome,
        shares: bet.shares,
        invested: bet.amount,
        currentValue: 0,  // Would need market data to calculate
        pnl: 0
      });
    }
  }

  return {
    success: true,
    data: Array.from(positionMap.values())
  };
}

// ============================================================================
// RESOLUTION OPERATIONS
// ============================================================================

/**
 * Resolve a market (creator only)
 */
export async function resolveMarket(params: {
  marketId: string;
  outcome: 'YES' | 'NO' | 'MKT' | 'CANCEL';
  probabilityInt?: number;  // For MKT resolution, 0-100
}): Promise<APIResponse<ManifoldMarket>> {
  return manifoldFetch<ManifoldMarket>(`/market/${params.marketId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({
      outcome: params.outcome,
      probabilityInt: params.probabilityInt
    })
  });
}

// ============================================================================
// LIQUIDITY OPERATIONS
// ============================================================================

/**
 * Add liquidity to a market
 */
export async function addLiquidity(params: {
  marketId: string;
  amount: number;
}): Promise<APIResponse<{ success: boolean }>> {
  return manifoldFetch<{ success: boolean }>(`/market/${params.marketId}/add-liquidity`, {
    method: 'POST',
    body: JSON.stringify({
      amount: params.amount
    })
  });
}

// ============================================================================
// COMMENTS
// ============================================================================

/**
 * Post a comment on a market
 */
export async function postComment(params: {
  marketId: string;
  content: string;
}): Promise<APIResponse<{ id: string }>> {
  return manifoldFetch<{ id: string }>('/comment', {
    method: 'POST',
    body: JSON.stringify({
      contractId: params.marketId,
      content: params.content
    })
  });
}

/**
 * Get comments on a market
 */
export async function getComments(
  marketId: string
): Promise<APIResponse<Array<{ id: string; content: string; userId: string; createdTime: number }>>> {
  return manifoldFetch(`/market/${marketId}/comments`);
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get current user info
 */
export async function getMe(): Promise<APIResponse<{
  id: string;
  username: string;
  balance: number;
  totalDeposits: number;
}>> {
  return manifoldFetch('/me');
}

/**
 * Get user by username
 */
export async function getUserByUsername(
  username: string
): Promise<APIResponse<{
  id: string;
  username: string;
  balance: number;
}>> {
  return manifoldFetch(`/user/${username}`);
}

// ============================================================================
// WEBHOOK/EVENTS
// ============================================================================

/**
 * Process Manifold webhook event
 * (For receiving updates from Manifold)
 */
export function processWebhookEvent(event: {
  type: 'bet' | 'comment' | 'resolved';
  data: unknown;
}): {
  eventType: string;
  marketId?: string;
  data: unknown;
} {
  switch (event.type) {
    case 'bet':
      const betData = event.data as ManifoldBet;
      return {
        eventType: 'BET_PLACED',
        marketId: betData.marketId,
        data: {
          betId: betData.id,
          amount: betData.amount,
          outcome: betData.outcome,
          shares: betData.shares,
          probBefore: betData.probBefore,
          probAfter: betData.probAfter
        }
      };

    case 'comment':
      return {
        eventType: 'COMMENT_POSTED',
        data: event.data
      };

    case 'resolved':
      return {
        eventType: 'MARKET_RESOLVED',
        data: event.data
      };

    default:
      return {
        eventType: 'UNKNOWN',
        data: event.data
      };
  }
}

// ============================================================================
// SIMULATION (For testing without API)
// ============================================================================

/**
 * Simulate market behavior for testing
 */
export function simulateMarket(
  initialProb: number = 0.5,
  liquidity: number = 1000
): {
  pool: { YES: number; NO: number };
  probability: number;
  placeBet: (amount: number, outcome: 'YES' | 'NO') => {
    shares: number;
    newProbability: number;
  };
} {
  let pool = {
    YES: liquidity * initialProb,
    NO: liquidity * (1 - initialProb)
  };
  let probability = initialProb;

  return {
    get pool() { return { ...pool }; },
    get probability() { return probability; },
    placeBet(amount: number, outcome: 'YES' | 'NO') {
      const shares = calculateShares(amount, outcome, pool, probability);
      probability = calculateNewProbability(amount, outcome, pool, probability);

      if (outcome === 'YES') {
        pool.YES += amount;
        pool.NO -= shares;
      } else {
        pool.NO += amount;
        pool.YES -= shares;
      }

      return { shares, newProbability: probability };
    }
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Try to load API key from environment
if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MANIFOLD_API_KEY) {
  setManifoldApiKey(process.env.NEXT_PUBLIC_MANIFOLD_API_KEY);
}
