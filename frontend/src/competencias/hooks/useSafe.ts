/**
 * USE SAFE HOOK
 * React hook for Gnosis Safe multisig operations
 *
 * Features:
 * - Safe creation and management
 * - Transaction proposal and execution
 * - Signature collection
 * - Module management
 * - Real-time confirmation tracking
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { GnosisSafe, SafeTransaction, TransparencyEvent } from '../types';
import { getAuthHeader, isAuthValid } from '../../lib/siweClient';
import { signSafeTxHash } from '../lib/safeEIP712';

// =============================================================================
// TYPES
// =============================================================================

export interface UseSafeOptions {
  safeAddress?: string;
  competitionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onTransactionConfirmed?: (tx: SafeTransaction) => void;
  onTransactionExecuted?: (tx: SafeTransaction) => void;
}

export interface UseSafeReturn {
  // State
  safe: GnosisSafe | null;
  loading: boolean;
  error: Error | null;

  // Safe Data
  owners: string[];
  threshold: number;
  balance: string;
  nonce: number;
  modules: SafeModule[];
  guards: string[];

  // Pending Transactions
  pendingTransactions: SafeTransaction[];
  executedTransactions: SafeTransaction[];

  // User Status
  isOwner: boolean;
  canPropose: boolean;
  canExecute: boolean;

  // Actions
  proposeTransaction: (tx: ProposedTransaction) => Promise<SafeTransaction | null>;
  confirmTransaction: (safeTxHash: string) => Promise<boolean>;
  executeTransaction: (safeTxHash: string) => Promise<ExecutionResult | null>;
  rejectTransaction: (safeTxHash: string) => Promise<boolean>;
  refetch: () => Promise<void>;

  // Module Actions
  enableModule: (moduleAddress: string) => Promise<boolean>;
  disableModule: (moduleAddress: string) => Promise<boolean>;
}

export interface SafeModule {
  address: string;
  type: 'delay' | 'roles' | 'allowance' | 'custom';
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface ProposedTransaction {
  to: string;
  value: string;
  data: string;
  operation?: 0 | 1; // 0 = CALL, 1 = DELEGATECALL
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  transactionHash: string;
  gasUsed: string;
  events: TransparencyEvent[];
}

export interface UseCreateSafeOptions {
  onProgress?: (step: string, progress: number) => void;
  onError?: (error: Error) => void;
}

export interface UseCreateSafeReturn {
  createSafe: (params: CreateSafeParams) => Promise<GnosisSafe | null>;
  loading: boolean;
  error: Error | null;
  progress: number;
  currentStep: string;
}

export interface CreateSafeParams {
  owners: string[];
  threshold: number;
  competitionId?: string;
  modules?: {
    delay?: { cooldown: number; expiration: number };
    roles?: { roles: Array<{ address: string; permissions: string[] }> };
    allowance?: { token: string; amount: string; resetPeriod: number };
  };
  guard?: string;
  saltNonce?: string;
}

// =============================================================================
// API HELPERS
// =============================================================================

async function fetchSafe(safeAddress: string): Promise<GnosisSafe | null> {
  try {
    const response = await fetch(`/api/safe/${safeAddress}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch safe');
    }
    const data = await response.json();
    return data.data.safe;
  } catch (error) {
    console.error('Fetch safe error:', error);
    return null;
  }
}

async function fetchSafeByCompetition(competitionId: string): Promise<GnosisSafe | null> {
  try {
    const response = await fetch(`/api/competition/${competitionId}?include=safe`);
    if (!response.ok) return null;
    const data = await response.json();

    // Reconstruct Safe from competition data
    const competition = data.data.competition;
    if (!competition?.custody?.safeAddress) return null;

    return {
      address: competition.custody.safeAddress,
      chainId: 8453, // Base Mainnet
      owners: competition.custody.owners || [],
      threshold: competition.custody.threshold || 1,
      nonce: 0,
      modules: [],
      guards: [],
      balance: competition.prizePool?.total?.toString() || '0',
    };
  } catch (error) {
    console.error('Fetch safe by competition error:', error);
    return null;
  }
}

async function fetchPendingTransactions(safeAddress: string): Promise<SafeTransaction[]> {
  try {
    const response = await fetch(`/api/safe/${safeAddress}/transactions?status=pending`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data.transactions || [];
  } catch (error) {
    console.error('Fetch pending transactions error:', error);
    return [];
  }
}

async function fetchExecutedTransactions(
  safeAddress: string,
  limit: number = 20
): Promise<SafeTransaction[]> {
  try {
    const response = await fetch(
      `/api/safe/${safeAddress}/transactions?status=executed&limit=${limit}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.data.transactions || [];
  } catch (error) {
    console.error('Fetch executed transactions error:', error);
    return [];
  }
}

async function fetchModules(safeAddress: string): Promise<SafeModule[]> {
  try {
    const response = await fetch(`/api/safe/${safeAddress}/modules`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data.modules || [];
  } catch (error) {
    console.error('Fetch modules error:', error);
    return [];
  }
}

// =============================================================================
// USE SAFE HOOK
// =============================================================================

export function useSafe(options: UseSafeOptions = {}): UseSafeReturn {
  const {
    safeAddress,
    competitionId,
    autoRefresh = false,
    refreshInterval = 15000,
    onError,
    onTransactionConfirmed,
    onTransactionExecuted,
  } = options;

  // Use ThirdWeb account for wallet integration
  const account = useActiveAccount();
  const userAddress = account?.address || null;

  const [safe, setSafe] = useState<GnosisSafe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<SafeTransaction[]>([]);
  const [executedTransactions, setExecutedTransactions] = useState<SafeTransaction[]>([]);
  const [modules, setModules] = useState<SafeModule[]>([]);
  const [previousPending, setPreviousPending] = useState<string[]>([]);

  // Fetch safe data
  const refetch = useCallback(async () => {
    if (!safeAddress && !competitionId) return;

    setLoading(true);
    setError(null);

    try {
      let fetchedSafe: GnosisSafe | null = null;

      if (safeAddress) {
        fetchedSafe = await fetchSafe(safeAddress);
      } else if (competitionId) {
        fetchedSafe = await fetchSafeByCompetition(competitionId);
      }

      if (fetchedSafe) {
        setSafe(fetchedSafe);

        // Fetch pending transactions
        const pending = await fetchPendingTransactions(fetchedSafe.address);

        // Check for newly confirmed transactions
        const currentPendingHashes = pending.map(tx => tx.safeTxHash);
        for (const prevHash of previousPending) {
          if (!currentPendingHashes.includes(prevHash)) {
            // Transaction was either confirmed or executed
            const executed = await fetchExecutedTransactions(fetchedSafe.address, 5);
            const executedTx = executed.find(tx => tx.safeTxHash === prevHash);
            if (executedTx) {
              onTransactionExecuted?.(executedTx);
            }
          }
        }

        // Check for transactions that gained confirmations
        for (const tx of pending) {
          const prevTx = pendingTransactions.find(p => p.safeTxHash === tx.safeTxHash);
          if (prevTx && tx.confirmations.length > prevTx.confirmations.length) {
            onTransactionConfirmed?.(tx);
          }
        }

        setPreviousPending(currentPendingHashes);
        setPendingTransactions(pending);

        // Fetch executed transactions
        const executed = await fetchExecutedTransactions(fetchedSafe.address);
        setExecutedTransactions(executed);

        // Fetch modules
        const safeModules = await fetchModules(fetchedSafe.address);
        setModules(safeModules);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [safeAddress, competitionId, previousPending, pendingTransactions, onError, onTransactionConfirmed, onTransactionExecuted]);

  // Initial fetch
  useEffect(() => {
    if (safeAddress || competitionId) {
      refetch();
    }
  }, [safeAddress, competitionId, refetch]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || (!safeAddress && !competitionId)) return;

    const interval = setInterval(refetch, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, safeAddress, competitionId, refetch, refreshInterval]);

  // Computed values
  const owners = useMemo(() => safe?.owners || [], [safe]);
  const threshold = useMemo(() => safe?.threshold || 1, [safe]);
  const balance = useMemo(() => safe?.balance || '0', [safe]);
  const nonce = useMemo(() => safe?.nonce || 0, [safe]);
  const guards = useMemo(() => safe?.guard ? [safe.guard] : [], [safe]);

  const isOwner = useMemo(() => {
    if (!userAddress || !owners.length) return false;
    return owners.some(o => o.toLowerCase() === userAddress.toLowerCase());
  }, [userAddress, owners]);

  const canPropose = useMemo(() => isOwner, [isOwner]);

  const canExecute = useMemo(() => {
    if (!isOwner || !pendingTransactions.length) return false;
    // Can execute if any transaction has enough confirmations
    return pendingTransactions.some(tx => tx.confirmations.length >= threshold);
  }, [isOwner, pendingTransactions, threshold]);

  // Propose a new transaction (two-step process: prepare -> sign -> propose)
  const proposeTransaction = useCallback(async (
    tx: ProposedTransaction
  ): Promise<SafeTransaction | null> => {
    if (!safe || !userAddress || !account) return null;

    // Check SIWE authentication
    if (!isAuthValid()) {
      const authError = new Error('Please sign in with your wallet first');
      setError(authError);
      onError?.(authError);
      return null;
    }

    try {
      // Step 1: Prepare transaction and get safeTxHash
      const prepareResponse = await fetch(`/api/safe/${safe.address}/prepare-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          to: tx.to,
          value: tx.value,
          data: tx.data,
          operation: tx.operation || 0,
        }),
      });

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || 'Failed to prepare transaction');
      }

      const prepareData = await prepareResponse.json();
      const { safeTxHash, safeTransactionData } = prepareData.data;

      // Step 2: Sign the safeTxHash with user's wallet
      const signature = await signSafeTxHash(account, safeTxHash);

      // Step 3: Submit the signed transaction
      const proposeResponse = await fetch(`/api/safe/${safe.address}/propose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          safeTransactionData,
          safeTxHash,
          senderAddress: userAddress,
          senderSignature: signature,
          origin: tx.description || 'CryptoGift Competencias',
        }),
      });

      if (!proposeResponse.ok) {
        const errorData = await proposeResponse.json();
        throw new Error(errorData.error || 'Failed to propose transaction');
      }

      const data = await proposeResponse.json();

      // Refetch to get updated pending transactions
      await refetch();

      return data.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to propose');
      setError(error);
      onError?.(error);
      return null;
    }
  }, [safe, userAddress, account, refetch, onError]);

  // Confirm a pending transaction (sign safeTxHash and submit)
  const confirmTransaction = useCallback(async (safeTxHash: string): Promise<boolean> => {
    if (!safe || !userAddress || !account) return false;

    // Check SIWE authentication
    if (!isAuthValid()) {
      const authError = new Error('Please sign in with your wallet first');
      setError(authError);
      onError?.(authError);
      return false;
    }

    try {
      // Sign the safeTxHash with user's wallet
      const signature = await signSafeTxHash(account, safeTxHash);

      // Submit the signature
      const response = await fetch(`/api/safe/${safe.address}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          safeTxHash,
          signature,
          signerAddress: userAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm transaction');
      }

      // Refetch to get updated confirmations
      await refetch();

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to confirm');
      setError(error);
      onError?.(error);
      return false;
    }
  }, [safe, userAddress, account, refetch, onError]);

  // Execute a pending transaction
  const executeTransaction = useCallback(async (
    safeTxHash: string
  ): Promise<ExecutionResult | null> => {
    if (!safe || !userAddress) return null;

    try {
      const response = await fetch(`/api/safe/${safe.address}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          safeTxHash,
          executor: userAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute transaction');
      }

      const data = await response.json();

      // Refetch to update state
      await refetch();

      return data.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute');
      setError(error);
      onError?.(error);
      return null;
    }
  }, [safe, userAddress, refetch, onError]);

  // Reject a pending transaction (by creating a rejection tx with same nonce)
  const rejectTransaction = useCallback(async (safeTxHash: string): Promise<boolean> => {
    if (!safe || !userAddress) return false;

    try {
      const response = await fetch(`/api/safe/${safe.address}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          safeTxHash,
          rejectorAddress: userAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject transaction');
      }

      await refetch();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reject');
      setError(error);
      onError?.(error);
      return false;
    }
  }, [safe, userAddress, refetch, onError]);

  // Enable a module
  const enableModule = useCallback(async (moduleAddress: string): Promise<boolean> => {
    if (!safe || !userAddress) return false;

    try {
      // This creates a proposal to enable the module
      const tx = await proposeTransaction({
        to: safe.address,
        value: '0',
        data: encodeEnableModule(moduleAddress),
        description: `Enable module: ${moduleAddress}`,
      });

      return tx !== null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to enable module');
      setError(error);
      onError?.(error);
      return false;
    }
  }, [safe, userAddress, proposeTransaction, onError]);

  // Disable a module
  const disableModule = useCallback(async (moduleAddress: string): Promise<boolean> => {
    if (!safe || !userAddress) return false;

    try {
      // Find the previous module in the linked list
      const prevModule = findPrevModule(modules, moduleAddress);

      const tx = await proposeTransaction({
        to: safe.address,
        value: '0',
        data: encodeDisableModule(prevModule, moduleAddress),
        description: `Disable module: ${moduleAddress}`,
      });

      return tx !== null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disable module');
      setError(error);
      onError?.(error);
      return false;
    }
  }, [safe, userAddress, modules, proposeTransaction, onError]);

  return {
    safe,
    loading,
    error,
    owners,
    threshold,
    balance,
    nonce,
    modules,
    guards,
    pendingTransactions,
    executedTransactions,
    isOwner,
    canPropose,
    canExecute,
    proposeTransaction,
    confirmTransaction,
    executeTransaction,
    rejectTransaction,
    refetch,
    enableModule,
    disableModule,
  };
}

// =============================================================================
// USE CREATE SAFE HOOK
// =============================================================================

export function useCreateSafe(options: UseCreateSafeOptions = {}): UseCreateSafeReturn {
  const { onProgress, onError } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const updateProgress = useCallback((step: string, pct: number) => {
    setCurrentStep(step);
    setProgress(pct);
    onProgress?.(step, pct);
  }, [onProgress]);

  const createSafe = useCallback(async (params: CreateSafeParams): Promise<GnosisSafe | null> => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      updateProgress('Validating parameters', 10);

      // Validate owners
      if (!params.owners || params.owners.length === 0) {
        throw new Error('At least one owner is required');
      }

      if (params.threshold > params.owners.length) {
        throw new Error('Threshold cannot exceed number of owners');
      }

      updateProgress('Creating Safe', 30);

      const response = await fetch('/api/safe/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Safe');
      }

      const data = await response.json();
      const safe = data.data.safe;

      updateProgress('Deploying Safe', 50);

      // If modules are specified, set them up
      if (params.modules) {
        updateProgress('Setting up modules', 70);

        if (params.modules.delay) {
          await setupDelayModule(safe.address, params.modules.delay);
        }

        if (params.modules.roles) {
          await setupRolesModule(safe.address, params.modules.roles);
        }

        if (params.modules.allowance) {
          await setupAllowanceModule(safe.address, params.modules.allowance);
        }
      }

      // If guard is specified, set it up
      if (params.guard) {
        updateProgress('Setting up guard', 85);
        await setupGuard(safe.address, params.guard);
      }

      updateProgress('Finalizing', 95);

      // Link to competition if specified
      if (params.competitionId) {
        await linkSafeToCompetition(safe.address, params.competitionId);
      }

      updateProgress('Complete', 100);

      return safe;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create Safe');
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [updateProgress, onError]);

  return {
    createSafe,
    loading,
    error,
    progress,
    currentStep,
  };
}

// =============================================================================
// USE SAFE HISTORY HOOK
// =============================================================================

export interface SafeHistoryEntry {
  type: 'transaction' | 'module' | 'owner' | 'threshold';
  timestamp: number;
  details: Record<string, unknown>;
  transactionHash?: string;
}

export interface UseSafeHistoryReturn {
  history: SafeHistoryEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSafeHistory(
  safeAddress: string | undefined,
  limit: number = 50
): UseSafeHistoryReturn {
  const [history, setHistory] = useState<SafeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!safeAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/safe/${safeAddress}/history?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch Safe history');
      }

      const data = await response.json();
      setHistory(data.data.history || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [safeAddress, limit]);

  useEffect(() => {
    if (safeAddress) {
      refetch();
    }
  }, [safeAddress, refetch]);

  return {
    history,
    loading,
    error,
    refetch,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function encodeEnableModule(moduleAddress: string): string {
  // Encode enableModule(address module) call
  // Function selector: 0x610b5925
  const selector = '0x610b5925';
  const paddedAddress = moduleAddress.slice(2).padStart(64, '0');
  return selector + paddedAddress;
}

function encodeDisableModule(prevModule: string, moduleAddress: string): string {
  // Encode disableModule(address prevModule, address module) call
  // Function selector: 0xe009cfde
  const selector = '0xe009cfde';
  const paddedPrev = prevModule.slice(2).padStart(64, '0');
  const paddedModule = moduleAddress.slice(2).padStart(64, '0');
  return selector + paddedPrev + paddedModule;
}

function findPrevModule(modules: SafeModule[], moduleAddress: string): string {
  // Gnosis Safe modules are stored in a linked list
  // SENTINEL_ADDRESS marks the start
  const SENTINEL = '0x0000000000000000000000000000000000000001';

  const moduleIndex = modules.findIndex(
    m => m.address.toLowerCase() === moduleAddress.toLowerCase()
  );

  if (moduleIndex <= 0) return SENTINEL;
  return modules[moduleIndex - 1].address;
}

async function setupDelayModule(
  safeAddress: string,
  config: { cooldown: number; expiration: number }
): Promise<void> {
  await fetch('/api/safe/module/delay/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ safeAddress, ...config }),
  });
}

async function setupRolesModule(
  safeAddress: string,
  config: { roles: Array<{ address: string; permissions: string[] }> }
): Promise<void> {
  await fetch('/api/safe/module/roles/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ safeAddress, ...config }),
  });
}

async function setupAllowanceModule(
  safeAddress: string,
  config: { token: string; amount: string; resetPeriod: number }
): Promise<void> {
  await fetch('/api/safe/module/allowance/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ safeAddress, ...config }),
  });
}

async function setupGuard(safeAddress: string, guardAddress: string): Promise<void> {
  await fetch('/api/safe/guard/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ safeAddress, guardAddress }),
  });
}

async function linkSafeToCompetition(
  safeAddress: string,
  competitionId: string
): Promise<void> {
  await fetch(`/api/competition/${competitionId}/link-safe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ safeAddress }),
  });
}

export default useSafe;
