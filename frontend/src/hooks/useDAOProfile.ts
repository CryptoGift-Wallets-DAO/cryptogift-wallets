/**
 * DAO Profile Hook
 *
 * Fetches user profile from CryptoGift DAO platform.
 * Enables unified identity across DAO and Wallets platforms.
 *
 * Made by mbxarts.com The Moon in a Box property
 *
 * Co-Author: Godez22
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// =====================================================
// TYPES
// =====================================================

export interface DAOProfile {
  wallet_address: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  tier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Starter';
  tier_color: string;
  total_cgc_earned: number;
  total_tasks_completed: number;
  reputation_score: number;
  twitter_handle: string | null;
  discord_handle: string | null;
}

export interface UseDAOProfileResult {
  profile: DAOProfile | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  hasProfile: boolean;
  createProfile: () => Promise<DAOProfile | null>;
}

// =====================================================
// CONSTANTS
// =====================================================

const DAO_API_URL = process.env.NEXT_PUBLIC_DAO_API_URL || 'https://mbxarts.com';
const CACHE_KEY_PREFIX = 'dao_profile_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getCachedProfile(wallet: string): DAOProfile | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${wallet.toLowerCase()}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${wallet.toLowerCase()}`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedProfile(wallet: string, profile: DAOProfile): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}${wallet.toLowerCase()}`,
      JSON.stringify({ data: profile, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
}

// =====================================================
// HOOK
// =====================================================

/**
 * Hook to fetch and manage DAO profile data
 *
 * @param walletAddress - The wallet address to fetch profile for
 * @returns Profile data, loading state, and helper functions
 *
 * @example
 * ```tsx
 * const { profile, isLoading, hasProfile } = useDAOProfile(address);
 *
 * if (hasProfile) {
 *   return <ProfileCard profile={profile} />;
 * }
 * ```
 */
export function useDAOProfile(walletAddress?: string): UseDAOProfileResult {
  const [profile, setProfile] = useState<DAOProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async (address: string) => {
    // Check cache first
    const cached = getCachedProfile(address);
    if (cached) {
      setProfile(cached);
      return cached;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch(
        `${DAO_API_URL}/api/cross-platform/profile?wallet=${address}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setCachedProfile(address, result.data);
        setProfile(result.data);
        return result.data;
      } else {
        setProfile(null);
        return null;
      }
    } catch (err) {
      console.error('Error fetching DAO profile:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setProfile(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProfile = useCallback(async (): Promise<DAOProfile | null> => {
    if (!walletAddress) return null;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch(
        `${DAO_API_URL}/api/cross-platform/profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ wallet: walletAddress }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create profile: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setCachedProfile(walletAddress, result.data);
        setProfile(result.data);
        return result.data;
      }

      return null;
    } catch (err) {
      console.error('Error creating DAO profile:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  const refetch = useCallback(() => {
    if (walletAddress) {
      // Clear cache to force refresh
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`${CACHE_KEY_PREFIX}${walletAddress.toLowerCase()}`);
      }
      fetchProfile(walletAddress);
    }
  }, [walletAddress, fetchProfile]);

  // Initial fetch
  useEffect(() => {
    if (walletAddress) {
      fetchProfile(walletAddress);
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [walletAddress, fetchProfile]);

  return {
    profile,
    isLoading,
    isError,
    error,
    refetch,
    hasProfile: !!profile,
    createProfile,
  };
}

export default useDAOProfile;
