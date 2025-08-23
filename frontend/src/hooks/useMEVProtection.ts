/**
 * Hook for MEV Protection management
 * Handles user preferences, chain awareness, and persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getMEVConfig, isMEVProtectionAvailable, getMEVProtectionStatus } from '@/lib/mev/config';
import { getRPCEndpoint, invalidateHealthCheck, getHealthStatus } from '@/lib/mev/provider';
// Temporary toast implementation until sonner is installed
const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message),
  warning: (message: string) => console.warn('⚠️', message),
};

const STORAGE_KEY = 'mev-protection-preferences';

interface MEVPreferences {
  enabled: boolean;
  mode: 'auto' | 'fast';
  byChain: Record<number, boolean>;
}

interface MEVProtectionState {
  isAvailable: boolean;
  isEnabled: boolean;
  isProtected: boolean;
  mode: 'off' | 'auto' | 'fast';
  message: string;
  color: 'green' | 'yellow' | 'red';
}

export function useMEVProtection() {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const chainId = chain?.id || 84532; // Default to Base Sepolia
  
  const [preferences, setPreferences] = useState<MEVPreferences>(() => {
    // Load preferences from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.error('Failed to load MEV preferences:', error);
      }
    }
    
    return {
      enabled: true, // Default to enabled
      mode: 'auto',
      byChain: {},
    };
  });
  
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<number>(0);

  // Get current MEV protection state
  const getState = useCallback((): MEVProtectionState => {
    const config = getMEVConfig();
    const status = getMEVProtectionStatus(chainId);
    const isAvailable = isMEVProtectionAvailable(chainId);
    const chainEnabled = preferences.byChain[chainId] !== false; // Default to true
    const isEnabled = preferences.enabled && chainEnabled;
    
    return {
      isAvailable,
      isEnabled,
      isProtected: isAvailable && isEnabled && config.mode !== 'off',
      mode: config.mode,
      message: status.message,
      color: status.color,
    };
  }, [chainId, preferences]);

  // Toggle MEV protection for current chain
  const toggleProtection = useCallback(async () => {
    const state = getState();
    
    if (!state.isAvailable) {
      toast.error(`MEV Protection not available on this network`);
      return;
    }
    
    setIsChecking(true);
    
    try {
      // Test RPC connectivity
      const { url, isMEVProtected } = await getRPCEndpoint(chainId, !state.isEnabled);
      
      if (!state.isEnabled && !isMEVProtected) {
        toast.warning('MEV Protected RPC unavailable, using standard RPC');
      }
      
      // Update preferences
      const newPreferences: MEVPreferences = {
        ...preferences,
        byChain: {
          ...preferences.byChain,
          [chainId]: !state.isEnabled,
        },
      };
      
      setPreferences(newPreferences);
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      }
      
      const action = !state.isEnabled ? 'enabled' : 'disabled';
      toast.success(`MEV Protection ${action}`);
      
    } catch (error) {
      console.error('Failed to toggle MEV protection:', error);
      toast.error('Failed to change MEV protection setting');
    } finally {
      setIsChecking(false);
      setLastCheck(Date.now());
    }
  }, [chainId, preferences, getState]);

  // Set global enabled state
  const setGlobalEnabled = useCallback((enabled: boolean) => {
    const newPreferences: MEVPreferences = {
      ...preferences,
      enabled,
    };
    
    setPreferences(newPreferences);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    }
    
    toast.success(`MEV Protection ${enabled ? 'enabled' : 'disabled'} globally`);
  }, [preferences]);

  // Set protection mode
  const setMode = useCallback((mode: 'auto' | 'fast') => {
    const newPreferences: MEVPreferences = {
      ...preferences,
      mode,
    };
    
    setPreferences(newPreferences);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    }
    
    toast.success(`MEV Protection mode set to ${mode}`);
  }, [preferences]);

  // Force health check
  const forceHealthCheck = useCallback(async () => {
    setIsChecking(true);
    
    try {
      const { url, isMEVProtected } = await getRPCEndpoint(chainId, preferences.enabled);
      invalidateHealthCheck(url);
      
      const newCheck = await getRPCEndpoint(chainId, preferences.enabled);
      
      if (newCheck.isMEVProtected) {
        toast.success('MEV Protected RPC is healthy');
      } else {
        toast.warning('Using standard RPC (MEV protection unavailable)');
      }
      
      setLastCheck(Date.now());
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Failed to check RPC health');
    } finally {
      setIsChecking(false);
    }
  }, [chainId, preferences.enabled]);

  // Get health status for debugging
  const getDebugInfo = useCallback(() => {
    return {
      preferences,
      state: getState(),
      health: getHealthStatus(),
      lastCheck: new Date(lastCheck).toISOString(),
    };
  }, [preferences, getState, lastCheck]);

  // Auto-check health on chain change
  useEffect(() => {
    if (chainId && Date.now() - lastCheck > 60000) {
      forceHealthCheck();
    }
  }, [chainId, forceHealthCheck, lastCheck]);

  const state = getState();

  return {
    ...state,
    isChecking,
    toggleProtection,
    setGlobalEnabled,
    setMode,
    forceHealthCheck,
    getDebugInfo,
    preferences,
  };
}