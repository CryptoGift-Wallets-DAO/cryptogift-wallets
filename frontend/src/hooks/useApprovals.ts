/**
 * React Hook for Token Approvals Management
 * Provides scanning, caching, and revocation functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import type { Address } from 'viem';
import { ApprovalScanner, type TokenApproval, type ScanProgress } from '@/lib/approvals/scanner';
import { ApprovalRevoker, type RevocationResult } from '@/lib/approvals/revoker';
import { 
  getApprovalsConfig, 
  isApprovalsEnabled,
  identifySpender,
  calculateRisk,
} from '@/lib/approvals/config';

// Temporary toast implementation
const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message),
  warning: (message: string) => console.warn('⚠️', message),
  info: (message: string) => console.info('ℹ️', message),
};

interface ApprovalsState {
  approvals: TokenApproval[];
  isLoading: boolean;
  isScanning: boolean;
  error: string | null;
  progress: ScanProgress | null;
  lastScan: number | null;
}

interface ApprovalWithMetadata extends TokenApproval {
  spenderInfo: {
    label: string;
    risk: 'low' | 'medium' | 'high' | 'trusted' | 'unknown';
    isKnown: boolean;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const CACHE_KEY_PREFIX = 'approvals-cache';
const LAST_SCAN_KEY_PREFIX = 'approvals-last-scan';

export function useApprovals() {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const chainId = chain?.id || 84532;
  const owner = account?.address as Address;
  
  const [state, setState] = useState<ApprovalsState>({
    approvals: [],
    isLoading: false,
    isScanning: false,
    error: null,
    progress: null,
    lastScan: null,
  });
  
  const scannerRef = useRef<ApprovalScanner | null>(null);
  const revokerRef = useRef<ApprovalRevoker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Check if feature is enabled
  const isEnabled = isApprovalsEnabled();
  const config = getApprovalsConfig();
  
  // Load cached data on mount
  useEffect(() => {
    if (!isEnabled || !owner || !chainId) return;
    
    const cacheKey = `${CACHE_KEY_PREFIX}-${chainId}-${owner}`;
    const lastScanKey = `${LAST_SCAN_KEY_PREFIX}-${chainId}-${owner}`;
    
    try {
      // Load cached approvals
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setState(prev => ({
          ...prev,
          approvals: parsed.approvals || [],
          lastScan: parsed.timestamp || null,
        }));
      }
      
      // Load last scan block
      const lastScan = localStorage.getItem(lastScanKey);
      if (lastScan) {
        setState(prev => ({
          ...prev,
          lastScan: parseInt(lastScan),
        }));
      }
    } catch (error) {
      console.error('Failed to load cached approvals:', error);
    }
  }, [isEnabled, owner, chainId]);
  
  // Initialize scanner and revoker
  useEffect(() => {
    if (!isEnabled || !chainId || !account) return;
    
    scannerRef.current = new ApprovalScanner(chainId);
    // TODO: Initialize revoker with proper ThirdWeb client
    // revokerRef.current = new ApprovalRevoker(client, account);
    
    return () => {
      scannerRef.current = null;
      revokerRef.current = null;
    };
  }, [isEnabled, chainId, account]);
  
  /**
   * Scan for approvals
   */
  const scanApprovals = useCallback(async (
    options: {
      forceRefresh?: boolean;
      fromBlock?: bigint;
    } = {}
  ) => {
    if (!isEnabled || !owner || !chainId || !scannerRef.current) {
      return;
    }
    
    // Check cache validity
    if (!options.forceRefresh && state.lastScan) {
      const cacheAge = Date.now() - state.lastScan;
      if (cacheAge < config.cacheTTL * 1000) {
        toast.info('Using cached approval data');
        return;
      }
    }
    
    setState(prev => ({
      ...prev,
      isScanning: true,
      error: null,
      progress: null,
    }));
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      const approvals = await scannerRef.current.scanApprovals(owner, {
        fromBlock: options.fromBlock,
        signal: abortControllerRef.current.signal,
        onProgress: (progress) => {
          setState(prev => ({
            ...prev,
            progress,
          }));
        },
      });
      
      // Cache results
      const cacheKey = `${CACHE_KEY_PREFIX}-${chainId}-${owner}`;
      const cacheData = {
        approvals,
        timestamp: Date.now(),
      };
      
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (error) {
        console.error('Failed to cache approvals:', error);
      }
      
      setState(prev => ({
        ...prev,
        approvals,
        isScanning: false,
        lastScan: Date.now(),
        progress: null,
      }));
      
      toast.success(`Found ${approvals.length} active approvals`);
      
      // Check for high-risk approvals
      const highRiskCount = approvals.filter(a => {
        const metadata = getApprovalMetadata(a);
        return metadata.riskLevel === 'high' || metadata.riskLevel === 'critical';
      }).length;
      
      if (highRiskCount > 0) {
        toast.warning(`⚠️ ${highRiskCount} high-risk approvals detected!`);
      }
      
    } catch (error: any) {
      if (error.message === 'Scan aborted') {
        toast.info('Scan cancelled');
      } else {
        console.error('Approval scan failed:', error);
        toast.error('Failed to scan approvals');
        setState(prev => ({
          ...prev,
          error: error.message || 'Scan failed',
        }));
      }
    } finally {
      setState(prev => ({
        ...prev,
        isScanning: false,
        progress: null,
      }));
      abortControllerRef.current = null;
    }
  }, [isEnabled, owner, chainId, config.cacheTTL, state.lastScan]);
  
  /**
   * Cancel ongoing scan
   */
  const cancelScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      scannerRef.current?.abort();
    }
  }, []);
  
  /**
   * Revoke an approval
   */
  const revokeApproval = useCallback(async (
    approval: TokenApproval,
    options: {
      simulate?: boolean;
    } = {}
  ): Promise<RevocationResult> => {
    if (!revokerRef.current) {
      return {
        success: false,
        error: 'Revoker not initialized',
      };
    }
    
    try {
      toast.info(`Revoking approval for ${approval.tokenSymbol}...`);
      
      const result = await revokerRef.current.revokeApproval({
        approval,
        simulate: options.simulate !== false,
      });
      
      if (result.success) {
        toast.success(`Successfully revoked ${approval.tokenSymbol} approval`);
        
        // Remove from state
        setState(prev => ({
          ...prev,
          approvals: prev.approvals.filter(a => 
            !(a.token === approval.token && 
              a.spender === approval.spender && 
              a.tokenId === approval.tokenId)
          ),
        }));
        
        // Update cache
        const cacheKey = `${CACHE_KEY_PREFIX}-${chainId}-${owner}`;
        const cacheData = {
          approvals: state.approvals.filter(a => 
            !(a.token === approval.token && 
              a.spender === approval.spender && 
              a.tokenId === approval.tokenId)
          ),
          timestamp: Date.now(),
        };
        
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
          console.error('Failed to update cache:', error);
        }
      } else {
        toast.error(`Failed to revoke: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message || 'Revocation failed',
      };
      toast.error(`Revocation error: ${result.error}`);
      return result;
    }
  }, [chainId, owner, state.approvals]);
  
  /**
   * Batch revoke multiple approvals
   */
  const batchRevokeApprovals = useCallback(async (
    approvals: TokenApproval[]
  ) => {
    if (!revokerRef.current || approvals.length === 0) {
      return null;
    }
    
    toast.info(`Revoking ${approvals.length} approvals...`);
    
    const result = await revokerRef.current.batchRevokeApprovals(
      approvals.map(approval => ({ approval }))
    );
    
    if (result.successful > 0) {
      toast.success(`Revoked ${result.successful} approvals`);
      
      // Update state
      const revokedTokens = new Set(
        Array.from(result.results.entries())
          .filter(([_, r]) => r.success)
          .map(([key]) => key)
      );
      
      setState(prev => ({
        ...prev,
        approvals: prev.approvals.filter(a => {
          const key = `${a.token}-${a.spender}-${a.tokenId || 'all'}`;
          return !revokedTokens.has(key);
        }),
      }));
    }
    
    if (result.failed > 0) {
      toast.error(`Failed to revoke ${result.failed} approvals`);
    }
    
    return result;
  }, []);
  
  /**
   * Get approval with metadata
   */
  const getApprovalMetadata = useCallback((approval: TokenApproval): ApprovalWithMetadata => {
    const spenderInfo = identifySpender(approval.spender);
    
    // For risk calculation, we need total supply (simplified for now)
    const totalSupply = BigInt('1000000000000000000000000'); // Placeholder
    
    const riskLevel = calculateRisk(
      approval.allowance || BigInt(0),
      totalSupply,
      spenderInfo.risk
    );
    
    return {
      ...approval,
      spenderInfo,
      riskLevel,
    };
  }, []);
  
  /**
   * Get approvals with metadata
   */
  const getApprovalsWithMetadata = useCallback((): ApprovalWithMetadata[] => {
    return state.approvals.map(getApprovalMetadata);
  }, [state.approvals, getApprovalMetadata]);
  
  // Auto-scan on mount if enabled
  useEffect(() => {
    if (isEnabled && owner && chainId && !state.isScanning && !state.lastScan) {
      scanApprovals();
    }
  }, [isEnabled, owner, chainId, scanApprovals, state.isScanning, state.lastScan]);
  
  return {
    // State
    approvals: getApprovalsWithMetadata(),
    isLoading: state.isLoading,
    isScanning: state.isScanning,
    error: state.error,
    progress: state.progress,
    lastScan: state.lastScan,
    
    // Actions
    scanApprovals,
    cancelScan,
    revokeApproval,
    batchRevokeApprovals,
    
    // Config
    isEnabled,
    config,
  };
}