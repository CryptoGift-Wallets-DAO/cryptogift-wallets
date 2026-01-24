"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Competition } from '../types';
import { getAuthHeader, isAuthValid } from '@/lib/siweClient';

interface CompetitionStats {
  totalCompetitions: number;
  activeCompetitions: number;
  totalPrizePool: string;
  totalParticipants: number;
  totalVolume: string;
  avgProbability: number;
}

interface UseCompetitionsResult {
  competitions: Competition[];
  isLoading: boolean;
  error: string | null;
  stats: CompetitionStats;
  refetch: () => Promise<void>;
}

export function useCompetitions(): UseCompetitionsResult {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CompetitionStats>({
    totalCompetitions: 0,
    activeCompetitions: 0,
    totalPrizePool: '0',
    totalParticipants: 0,
    totalVolume: '0',
    avgProbability: 50,
  });

  const fetchCompetitions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add auth header if authenticated
      if (isAuthValid()) {
        const authHeader = getAuthHeader();
        if (authHeader) {
          headers['Authorization'] = authHeader;
        }
      }

      const response = await fetch('/api/competition/list', { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch competitions: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const comps = data.data.competitions || [];
        setCompetitions(comps);

        // Calculate stats
        const activeComps = comps.filter((c: Competition) => c.status === 'active');
        const totalPrize = comps.reduce((sum: number, c: Competition) => {
          const prize = typeof c.prizePool === 'string'
            ? parseFloat(c.prizePool)
            : c.prizePool?.total || 0;
          return sum + prize;
        }, 0);
        const totalParts = comps.reduce((sum: number, c: Competition) => {
          const count = Array.isArray(c.participants)
            ? c.participants.length
            : c.participants?.current || 0;
          return sum + count;
        }, 0);
        const totalVol = comps.reduce((sum: number, c: Competition) => {
          return sum + (c.market?.totalVolume || 0);
        }, 0);
        const avgProb = comps.length > 0
          ? comps.reduce((sum: number, c: Competition) => {
              return sum + (c.currentProbability || c.market?.probability || 50);
            }, 0) / comps.length
          : 50;

        setStats({
          totalCompetitions: comps.length,
          activeCompetitions: activeComps.length,
          totalPrizePool: totalPrize.toString(),
          totalParticipants: totalParts,
          totalVolume: totalVol.toString(),
          avgProbability: avgProb,
        });
      } else {
        setCompetitions([]);
      }
    } catch (err) {
      console.error('Error fetching competitions:', err);
      setError(err instanceof Error ? err.message : 'Error fetching competitions');
      setCompetitions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  return {
    competitions,
    isLoading,
    error,
    stats,
    refetch: fetchCompetitions,
  };
}

// Hook for single competition
export function useCompetition(id: string) {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetition = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/competition/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch competition: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setCompetition(data.data);
      } else {
        setError(data.error || 'Competition not found');
      }
    } catch (err) {
      console.error('Error fetching competition:', err);
      setError(err instanceof Error ? err.message : 'Error fetching competition');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompetition();
  }, [fetchCompetition]);

  return {
    competition,
    isLoading,
    error,
    refetch: fetchCompetition,
  };
}
