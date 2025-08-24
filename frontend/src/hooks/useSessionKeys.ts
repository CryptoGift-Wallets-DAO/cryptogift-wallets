/**
 * Session Keys Hook
 * Manage temporary permissions for AA operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { 
  SessionPolicy,
  SESSION_CONFIG,
  getSessionPreset,
} from '@/lib/aa/session-keys/config';
import { getSessionKeyManager } from '@/lib/aa/session-keys/manager';

interface UseSessionKeysReturn {
  enabled: boolean;
  sessions: SessionPolicy[];
  activeSessions: SessionPolicy[];
  isCreating: boolean;
  error: string | null;
  createSession: (preset: string, customPolicy?: Partial<SessionPolicy>) => Promise<string | null>;
  revokeSession: (sessionId: string) => Promise<boolean>;
  revokeAllSessions: () => Promise<number>;
  useSession: (sessionId: string, operation: any) => Promise<boolean>;
  getSessionStats: (sessionId: string) => SessionStats | null;
}

interface SessionStats {
  usageCount: number;
  lastUsed?: number;
  remainingTime: number;
  dailySpent: string;
  isExpired: boolean;
}

export function useSessionKeys(): UseSessionKeysReturn {
  const account = useActiveAccount();
  const address = account?.address;
  
  const [sessions, setSessions] = useState<SessionPolicy[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const manager = getSessionKeyManager();
  const enabled = SESSION_CONFIG.enabled;
  
  // Load sessions for current account
  useEffect(() => {
    if (!enabled || !address) return;
    
    loadSessions();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, [address, enabled]);
  
  const loadSessions = useCallback(() => {
    if (!address) return;
    
    const accountSessions = manager.getAccountSessions(address);
    setSessions(accountSessions);
  }, [address]);
  
  /**
   * Create new session
   */
  const createSession = useCallback(async (
    presetName: string,
    customPolicy?: Partial<SessionPolicy>
  ): Promise<string | null> => {
    if (!address || !enabled) return null;
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Get preset configuration
      const preset = getSessionPreset(presetName as any);
      if (!preset) {
        throw new Error('Invalid preset');
      }
      
      // Generate session key
      const { address: sessionKey } = await manager.generateSessionKey();
      
      // Calculate expiration
      const expiresAt = Date.now() + (preset.duration * 3600000);
      
      // Create policy
      const policy: Omit<SessionPolicy, 'sessionId' | 'createdAt' | 'useCount' | 'nonceScope' | 'usedNonces'> = {
        account: address,
        sessionKey,
        name: preset.name,
        description: preset.description,
        allowedSelectors: preset.allowedSelectors,
        allowedContracts: customPolicy?.allowedContracts || [],
        spenderAllowlist: customPolicy?.spenderAllowlist || [],
        maxValue: preset.maxValue,
        maxGas: preset.maxGas,
        dailyLimit: preset.dailyLimit,
        expiresAt,
        validAfter: Date.now(),
        chainId: (account as any)?.chain?.id || 84532,
      };
      
      // Create session
      const result = await manager.createSession(address, policy);
      
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0]);
      }
      
      // Reload sessions
      loadSessions();
      
      return result.sessionId;
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [address, enabled, loadSessions]);
  
  /**
   * Revoke a session
   */
  const revokeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const success = manager.revokeSession(sessionId);
      if (success) {
        loadSessions();
      }
      return success;
    } catch (err) {
      console.error('[SessionKeys] Failed to revoke session:', err);
      return false;
    }
  }, [loadSessions]);
  
  /**
   * Revoke all sessions (Kill Switch)
   */
  const revokeAllSessions = useCallback(async (): Promise<number> => {
    if (!address) return 0;
    
    try {
      const count = manager.revokeAllSessions(address);
      loadSessions();
      return count;
    } catch (err) {
      console.error('[SessionKeys] Failed to revoke all sessions:', err);
      return 0;
    }
  }, [address, loadSessions]);
  
  /**
   * Use session for operation
   */
  const useSession = useCallback(async (
    sessionId: string,
    operation: {
      to: string;
      value: bigint;
      data: string;
      chainId: number;
    }
  ): Promise<boolean> => {
    try {
      const result = await manager.useSession(sessionId, operation);
      
      if (!result.success) {
        setError(result.error || 'Operation not allowed');
        return false;
      }
      
      // Reload to update usage stats
      loadSessions();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to use session');
      return false;
    }
  }, [loadSessions]);
  
  /**
   * Get session statistics
   */
  const getSessionStats = useCallback((sessionId: string): SessionStats | null => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return null;
    
    const now = Date.now();
    const remainingTime = Math.max(0, session.expiresAt - now);
    
    return {
      usageCount: session.useCount,
      lastUsed: session.lastUsedAt,
      remainingTime,
      dailySpent: '0', // TODO: Track actual spending
      isExpired: remainingTime === 0,
    };
  }, [sessions]);
  
  // Filter active sessions
  const activeSessions = sessions.filter(s => {
    const now = Date.now();
    return s.expiresAt > now;
  });
  
  return {
    enabled,
    sessions,
    activeSessions,
    isCreating,
    error,
    createSession,
    revokeSession,
    revokeAllSessions,
    useSession,
    getSessionStats,
  };
}