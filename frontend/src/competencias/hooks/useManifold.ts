/**
 * USE MANIFOLD HOOK
 * React hook for Manifold Markets prediction market interactions
 *
 * Features:
 * - Market creation and management
 * - Bet placement with CPMM calculations
 * - Real-time probability updates
 * - Position tracking
 * - Market resolution
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ManifoldMarket,
  ManifoldBet,
  ManifoldPosition,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface UseManifoldMarketOptions {
  marketId?: string;
  competitionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onProbabilityChange?: (oldProb: number, newProb: number) => void;
}

export interface UseManifoldMarketReturn {
  // State
  market: ManifoldMarket | null;
  loading: boolean;
  error: Error | null;

  // Market Data
  probability: number;
  pool: { YES: number; NO: number };
  totalVolume: number;

  // User Data
  userPosition: ManifoldPosition | null;
  userBets: ManifoldBet[];

  // Actions
  placeBet: (outcome: 'YES' | 'NO', amount: number) => Promise<BetResult | null>;
  sellShares: (outcome: 'YES' | 'NO', shares: number) => Promise<SellResult | null>;
  refetch: () => Promise<void>;

  // Calculations
  calculateShares: (amount: number, outcome: 'YES' | 'NO') => number;
  calculatePayout: (shares: number, outcome: 'YES' | 'NO') => number;
  calculatePriceImpact: (amount: number, outcome: 'YES' | 'NO') => number;
}

export interface BetResult {
  bet: ManifoldBet;
  newProbability: number;
  shares: number;
  priceImpact: number;
}

export interface SellResult {
  payout: number;
  newProbability: number;
  priceImpact: number;
}

export interface CreateMarketParams {
  question: string;
  description?: string;
  closeTime?: number;
  initialProb?: number;
  competitionId: string;
}

export interface UseCreateMarketReturn {
  createMarket: (params: CreateMarketParams) => Promise<ManifoldMarket | null>;
  loading: boolean;
  error: Error | null;
}

// =============================================================================
// CPMM CALCULATIONS
// =============================================================================

/**
 * Calculate shares received for a bet using CPMM formula
 * k = y^p * n^(1-p) must remain constant
 */
function calculateSharesFromCPMM(
  amount: number,
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
    // Buying YES: add amount to YES pool, calculate new NO pool to maintain k
    const newY = y + amount;
    // k = newY^p * newN^(1-p)
    // newN = (k / newY^p)^(1/(1-p))
    const newN = Math.pow(k / Math.pow(newY, p), 1 / (1 - p));
    // Shares received = reduction in NO pool
    return n - newN;
  } else {
    // Buying NO: add amount to NO pool, calculate new YES pool to maintain k
    const newN = n + amount;
    const newY = Math.pow(k / Math.pow(newN, 1 - p), 1 / p);
    // Shares received = reduction in YES pool
    return y - newY;
  }
}

/**
 * Calculate new probability after a bet
 */
function calculateNewProbability(
  amount: number,
  outcome: 'YES' | 'NO',
  pool: { YES: number; NO: number },
  currentProb: number
): number {
  const shares = calculateSharesFromCPMM(amount, outcome, pool, currentProb);

  let newY: number, newN: number;

  if (outcome === 'YES') {
    newY = pool.YES + amount;
    newN = pool.NO - shares;
  } else {
    newY = pool.YES - shares;
    newN = pool.NO + amount;
  }

  // New probability based on pool ratio
  // p = n / (y + n) for binary markets
  return newN / (newY + newN);
}

/**
 * Calculate price impact percentage
 */
function calculatePriceImpact(
  amount: number,
  outcome: 'YES' | 'NO',
  pool: { YES: number; NO: number },
  currentProb: number
): number {
  const newProb = calculateNewProbability(amount, outcome, pool, currentProb);
  return Math.abs(newProb - currentProb) * 100;
}

/**
 * Calculate potential payout if outcome wins
 */
function calculatePotentialPayout(
  shares: number,
  _outcome: 'YES' | 'NO'
): number {
  // Each share pays out 1 unit if correct
  return shares;
}

// =============================================================================
// API HELPERS
// =============================================================================

async function fetchMarket(marketId: string): Promise<ManifoldMarket | null> {
  try {
    const response = await fetch(`/api/manifold/market/${marketId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch market');
    }
    const data = await response.json();
    return data.data.market;
  } catch (error) {
    console.error('Fetch market error:', error);
    return null;
  }
}

async function fetchMarketByCompetition(competitionId: string): Promise<ManifoldMarket | null> {
  try {
    const response = await fetch(`/api/competition/${competitionId}?include=market`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data.competition?.market || null;
  } catch (error) {
    console.error('Fetch market by competition error:', error);
    return null;
  }
}

async function fetchUserBets(
  marketId: string,
  userAddress: string
): Promise<ManifoldBet[]> {
  try {
    const response = await fetch(
      `/api/manifold/market/${marketId}/bets?user=${userAddress}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.data.bets || [];
  } catch (error) {
    console.error('Fetch user bets error:', error);
    return [];
  }
}

// =============================================================================
// USE MANIFOLD MARKET HOOK
// =============================================================================

export function useManifoldMarket(
  options: UseManifoldMarketOptions = {}
): UseManifoldMarketReturn {
  const {
    marketId,
    competitionId,
    autoRefresh = false,
    refreshInterval = 10000,
    onError,
    onProbabilityChange,
  } = options;

  const [market, setMarket] = useState<ManifoldMarket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userBets, setUserBets] = useState<ManifoldBet[]>([]);
  const [previousProb, setPreviousProb] = useState<number | null>(null);

  // Get user address from wallet
  useEffect(() => {
    const address = typeof window !== 'undefined'
      ? (window as unknown as { ethereum?: { selectedAddress?: string } }).ethereum?.selectedAddress
      : null;
    setUserAddress(address || null);
  }, []);

  // Fetch market data
  const refetch = useCallback(async () => {
    if (!marketId && !competitionId) return;

    setLoading(true);
    setError(null);

    try {
      let fetchedMarket: ManifoldMarket | null = null;

      if (marketId) {
        fetchedMarket = await fetchMarket(marketId);
      } else if (competitionId) {
        fetchedMarket = await fetchMarketByCompetition(competitionId);
      }

      if (fetchedMarket) {
        // Track probability changes
        if (previousProb !== null && fetchedMarket.probability !== previousProb) {
          onProbabilityChange?.(previousProb, fetchedMarket.probability);
        }
        setPreviousProb(fetchedMarket.probability);
        setMarket(fetchedMarket);

        // Fetch user bets if we have an address
        if (userAddress && fetchedMarket.manifoldId) {
          const bets = await fetchUserBets(fetchedMarket.manifoldId, userAddress);
          setUserBets(bets);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [marketId, competitionId, userAddress, previousProb, onError, onProbabilityChange]);

  // Initial fetch
  useEffect(() => {
    if (marketId || competitionId) {
      refetch();
    }
  }, [marketId, competitionId, refetch]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || (!marketId && !competitionId)) return;

    const interval = setInterval(refetch, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, marketId, competitionId, refetch, refreshInterval]);

  // Current pool values
  const pool = useMemo(() => ({
    YES: market?.pool?.yesPool || 100,
    NO: market?.pool?.noPool || 100,
  }), [market]);

  // Current probability
  const probability = useMemo(() => market?.probability || 0.5, [market]);

  // Total volume
  const totalVolume = useMemo(() => market?.totalVolume || 0, [market]);

  // Calculate user position
  const userPosition = useMemo((): ManifoldPosition | null => {
    if (!userBets.length) return null;

    let yesShares = 0;
    let noShares = 0;
    let totalInvested = 0;

    for (const bet of userBets) {
      if (bet.outcome === 'YES') {
        yesShares += bet.shares;
      } else {
        noShares += bet.shares;
      }
      totalInvested += bet.amount;
    }

    const currentValue = yesShares * probability + noShares * (1 - probability);
    const pnl = currentValue - totalInvested;

    return {
      yesShares,
      noShares,
      invested: totalInvested,
      currentValue,
      pnl,
      pnlPercent: totalInvested > 0 ? (pnl / totalInvested) * 100 : 0,
    };
  }, [userBets, probability]);

  // Calculate shares for a potential bet
  const calculateShares = useCallback((amount: number, outcome: 'YES' | 'NO'): number => {
    return calculateSharesFromCPMM(amount, outcome, pool, probability);
  }, [pool, probability]);

  // Calculate potential payout
  const calculatePayout = useCallback((shares: number, outcome: 'YES' | 'NO'): number => {
    return calculatePotentialPayout(shares, outcome);
  }, []);

  // Calculate price impact
  const calcPriceImpact = useCallback((amount: number, outcome: 'YES' | 'NO'): number => {
    return calculatePriceImpact(amount, outcome, pool, probability);
  }, [pool, probability]);

  // Place a bet
  const placeBet = useCallback(async (
    outcome: 'YES' | 'NO',
    amount: number
  ): Promise<BetResult | null> => {
    if (!competitionId || !userAddress) return null;

    try {
      const response = await fetch(`/api/competition/${competitionId}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          outcome,
          amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place bet');
      }

      const data = await response.json();

      // Refetch market data
      await refetch();

      return {
        bet: data.data.bet,
        newProbability: data.data.newProbability,
        shares: data.data.bet.shares,
        priceImpact: Math.abs(data.data.newProbability - probability) * 100,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to place bet');
      setError(error);
      onError?.(error);
      return null;
    }
  }, [competitionId, userAddress, probability, refetch, onError]);

  // Sell shares
  const sellShares = useCallback(async (
    outcome: 'YES' | 'NO',
    shares: number
  ): Promise<SellResult | null> => {
    if (!competitionId || !userAddress) return null;

    try {
      const response = await fetch(`/api/competition/${competitionId}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          outcome,
          shares,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sell shares');
      }

      const data = await response.json();

      // Refetch market data
      await refetch();

      return {
        payout: data.data.payout,
        newProbability: data.data.newProbability,
        priceImpact: Math.abs(data.data.newProbability - probability) * 100,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sell shares');
      setError(error);
      onError?.(error);
      return null;
    }
  }, [competitionId, userAddress, probability, refetch, onError]);

  return {
    market,
    loading,
    error,
    probability,
    pool,
    totalVolume,
    userPosition,
    userBets,
    placeBet,
    sellShares,
    refetch,
    calculateShares,
    calculatePayout,
    calculatePriceImpact: calcPriceImpact,
  };
}

// =============================================================================
// USE CREATE MARKET HOOK
// =============================================================================

export function useCreateMarket(): UseCreateMarketReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMarket = useCallback(async (
    params: CreateMarketParams
  ): Promise<ManifoldMarket | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/manifold/create-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create market');
      }

      const data = await response.json();
      return data.data.market;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create market');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createMarket,
    loading,
    error,
  };
}

// =============================================================================
// USE MARKET HISTORY HOOK
// =============================================================================

export interface MarketHistoryPoint {
  timestamp: number;
  probability: number;
  volume: number;
}

export interface UseMarketHistoryReturn {
  history: MarketHistoryPoint[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMarketHistory(
  marketId: string | undefined,
  timeRange: '1h' | '24h' | '7d' | '30d' | 'all' = '24h'
): UseMarketHistoryReturn {
  const [history, setHistory] = useState<MarketHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!marketId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/manifold/market/${marketId}/history?range=${timeRange}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch market history');
      }

      const data = await response.json();
      setHistory(data.data.history || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [marketId, timeRange]);

  useEffect(() => {
    if (marketId) {
      refetch();
    }
  }, [marketId, timeRange, refetch]);

  return {
    history,
    loading,
    error,
    refetch,
  };
}

// =============================================================================
// USE LEADERBOARD HOOK
// =============================================================================

export interface LeaderboardEntry {
  address: string;
  totalProfit: number;
  totalBets: number;
  winRate: number;
  rank: number;
}

export interface UseLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  error: Error | null;
  userRank: number | null;
  refetch: () => Promise<void>;
}

export function useLeaderboard(
  competitionId: string | undefined,
  limit: number = 10
): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  const refetch = useCallback(async () => {
    if (!competitionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/competition/${competitionId}/leaderboard?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.data.leaderboard || []);
      setUserRank(data.data.userRank || null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [competitionId, limit]);

  useEffect(() => {
    if (competitionId) {
      refetch();
    }
  }, [competitionId, refetch]);

  return {
    leaderboard,
    loading,
    error,
    userRank,
    refetch,
  };
}

export default useManifoldMarket;
