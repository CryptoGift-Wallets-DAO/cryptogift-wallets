/**
 * USE COMPETITION HOOK
 * React hook for managing competition state and operations
 *
 * Features:
 * - Competition CRUD operations
 * - Real-time updates
 * - Caching and optimistic updates
 * - Error handling
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Competition,
  CompetitionCategory,
  CompetitionStatus,
  ParticipantEntry,
  Vote,
  TransparencyEvent,
  getParticipantCount,
  getMaxParticipants,
  getParticipantsList,
  getCreatorAddress,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCompetitionOptions {
  competitionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onEvent?: (event: TransparencyEvent) => void;
}

export interface UseCompetitionReturn {
  // State
  competition: Competition | null;
  loading: boolean;
  error: Error | null;

  // Queries
  refetch: () => Promise<void>;
  getVotes: () => Vote[];
  getEvents: () => TransparencyEvent[];

  // Mutations
  join: (position?: string) => Promise<{ entry: ParticipantEntry } | null>;
  leave: () => Promise<boolean>;
  update: (updates: Partial<Competition>) => Promise<boolean>;

  // Computed
  canJoin: boolean;
  isParticipant: boolean;
  isCreator: boolean;
  isJudge: boolean;
  participantCount: number;
  timeRemaining: number | null;
  progress: number;
}

export interface UseCompetitionsOptions {
  category?: CompetitionCategory;
  status?: CompetitionStatus;
  creator?: string;
  participant?: string;
  limit?: number;
  sortBy?: 'created' | 'prizePool' | 'participants' | 'ending';
  sortOrder?: 'asc' | 'desc';
  autoRefresh?: boolean;
}

export interface UseCompetitionsReturn {
  competitions: Competition[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  stats: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    totalPrizePool: number;
  } | null;
}

// =============================================================================
// API HELPERS
// =============================================================================

async function fetchCompetition(id: string): Promise<Competition> {
  const response = await fetch(`/api/competition/${id}?include=votes,events`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch competition');
  }
  const data = await response.json();
  return data.data.competition;
}

async function fetchCompetitions(options: UseCompetitionsOptions & { offset?: number }): Promise<{
  competitions: Competition[];
  pagination: { total: number; hasMore: boolean };
  stats: UseCompetitionsReturn['stats'];
}> {
  const params = new URLSearchParams();
  if (options.category) params.set('category', options.category);
  if (options.status) params.set('status', options.status);
  if (options.creator) params.set('creator', options.creator);
  if (options.participant) params.set('participant', options.participant);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sortOrder) params.set('sortOrder', options.sortOrder);

  const response = await fetch(`/api/competition/list?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch competitions');
  }
  const data = await response.json();
  return {
    competitions: data.data.competitions,
    pagination: data.data.pagination,
    stats: data.data.stats,
  };
}

// =============================================================================
// USE COMPETITION HOOK
// =============================================================================

export function useCompetition(
  options: UseCompetitionOptions = {}
): UseCompetitionReturn {
  const {
    competitionId,
    autoRefresh = false,
    refreshInterval = 30000,
    onError,
    onEvent,
  } = options;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  // Get user address (from wallet connection)
  useEffect(() => {
    // In real implementation, this would come from wallet context
    const address = typeof window !== 'undefined'
      ? (window as unknown as { ethereum?: { selectedAddress?: string } }).ethereum?.selectedAddress
      : null;
    setUserAddress(address || null);
  }, []);

  // Fetch competition
  const refetch = useCallback(async () => {
    if (!competitionId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCompetition(competitionId);
      setCompetition(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [competitionId, onError]);

  // Initial fetch
  useEffect(() => {
    if (competitionId) {
      refetch();
    }
  }, [competitionId, refetch]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !competitionId) return;

    const interval = setInterval(refetch, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, competitionId, refetch, refreshInterval]);

  // Get votes
  const getVotes = useCallback((): Vote[] => {
    return competition?.arbitration?.votes || [];
  }, [competition]);

  // Get events
  const getEvents = useCallback((): TransparencyEvent[] => {
    return competition?.transparency?.events || [];
  }, [competition]);

  // Join competition
  const join = useCallback(async (position?: string): Promise<{ entry: ParticipantEntry } | null> => {
    if (!competitionId || !userAddress) return null;

    try {
      const response = await fetch(`/api/competition/${competitionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantAddress: userAddress, position }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join');
      }

      const data = await response.json();

      // Refetch to get updated state
      await refetch();

      return data.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to join');
      setError(error);
      onError?.(error);
      return null;
    }
  }, [competitionId, userAddress, refetch, onError]);

  // Leave competition
  const leave = useCallback(async (): Promise<boolean> => {
    // Implementation would call leave API
    return false;
  }, []);

  // Update competition
  const update = useCallback(async (updates: Partial<Competition>): Promise<boolean> => {
    if (!competitionId || !userAddress) return false;

    try {
      const response = await fetch(`/api/competition/${competitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, callerAddress: userAddress }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update');
      }

      await refetch();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update');
      setError(error);
      onError?.(error);
      return false;
    }
  }, [competitionId, userAddress, refetch, onError]);

  // Computed values
  const canJoin = useMemo(() => {
    if (!competition) return false;
    if (competition.status !== 'active' && competition.status !== 'pending') return false;
    if (!userAddress) return false;

    const maxParticipants = getMaxParticipants(competition.participants);
    const currentParticipants = getParticipantCount(competition.participants);
    if (maxParticipants && currentParticipants >= maxParticipants) return false;

    const participantsList = getParticipantsList(competition.participants);
    const isAlreadyJoined = participantsList.some(
      e => e.address === userAddress
    );
    if (isAlreadyJoined) return false;

    return true;
  }, [competition, userAddress]);

  const isParticipant = useMemo(() => {
    if (!competition || !userAddress) return false;
    const participantsList = getParticipantsList(competition.participants);
    return participantsList.some(e => e.address === userAddress);
  }, [competition, userAddress]);

  const isCreator = useMemo(() => {
    if (!competition || !userAddress) return false;
    return getCreatorAddress(competition.creator) === userAddress;
  }, [competition, userAddress]);

  const isJudge = useMemo(() => {
    if (!competition || !userAddress) return false;
    return competition.arbitration?.judges?.some(j => j.address === userAddress) || false;
  }, [competition, userAddress]);

  const participantCount = useMemo(() => {
    if (!competition) return 0;
    return getParticipantCount(competition.participants);
  }, [competition]);

  const timeRemaining = useMemo(() => {
    if (!competition?.timeline?.endsAt) return null;
    const end = new Date(competition.timeline.endsAt).getTime();
    const now = Date.now();
    return Math.max(0, end - now);
  }, [competition]);

  const progress = useMemo(() => {
    if (!competition?.timeline?.startsAt || !competition?.timeline?.endsAt) return 0;

    const start = new Date(competition.timeline.startsAt).getTime();
    const end = new Date(competition.timeline.endsAt).getTime();
    const now = Date.now();

    if (now >= end) return 100;
    if (now <= start) return 0;

    return Math.round(((now - start) / (end - start)) * 100);
  }, [competition]);

  return {
    competition,
    loading,
    error,
    refetch,
    getVotes,
    getEvents,
    join,
    leave,
    update,
    canJoin,
    isParticipant,
    isCreator,
    isJudge,
    participantCount,
    timeRemaining,
    progress,
  };
}

// =============================================================================
// USE COMPETITIONS HOOK (LIST)
// =============================================================================

export function useCompetitions(
  options: UseCompetitionsOptions = {}
): UseCompetitionsReturn {
  const {
    category,
    status,
    creator,
    participant,
    limit = 20,
    sortBy = 'created',
    sortOrder = 'desc',
    autoRefresh = false,
  } = options;

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<UseCompetitionsReturn['stats']>(null);

  // Fetch competitions
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOffset(0);

    try {
      const data = await fetchCompetitions({
        category,
        status,
        creator,
        participant,
        limit,
        sortBy,
        sortOrder,
        offset: 0,
      });

      setCompetitions(data.competitions);
      setHasMore(data.pagination.hasMore);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [category, status, creator, participant, limit, sortBy, sortOrder]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  // Load more
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);

    try {
      const newOffset = offset + limit;
      const data = await fetchCompetitions({
        category,
        status,
        creator,
        participant,
        limit,
        sortBy,
        sortOrder,
        offset: newOffset,
      });

      setCompetitions(prev => [...prev, ...data.competitions]);
      setOffset(newOffset);
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [category, status, creator, participant, limit, sortBy, sortOrder, offset, hasMore, loading]);

  return {
    competitions,
    loading,
    error,
    refetch,
    loadMore,
    hasMore,
    stats,
  };
}

// =============================================================================
// USE CREATE COMPETITION HOOK
// =============================================================================

export interface CreateCompetitionParams {
  title: string;
  description?: string;
  category: CompetitionCategory;
  currency?: string;
  initialPrize?: number;
  entryFee?: number;
  startsAt?: string;
  endsAt?: string;
  maxParticipants?: number;
  resolutionMethod: string;
  judges?: string[];
  createMarket?: boolean;
  marketQuestion?: string;
}

export function useCreateCompetition() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCompetition = useCallback(async (
    params: CreateCompetitionParams,
    creatorAddress: string
  ): Promise<Competition | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/competition/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, creatorAddress }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create competition');
      }

      const data = await response.json();
      return data.data.competition;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createCompetition,
    loading,
    error,
  };
}

export default useCompetition;
