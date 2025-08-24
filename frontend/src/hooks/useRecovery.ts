/**
 * Recovery Hook
 * Manages guardians, passkeys, and recovery operations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { RECOVERY_CONFIG, type Guardian, type RecoveryRequest, type PasskeyCredential } from '@/lib/aa/recovery/config';
import {
  getGuardianStorage,
  addGuardian,
  removeGuardian,
  createRecoveryRequest,
  approveRecoveryRequest,
  executeRecoveryRequest,
  cancelRecoveryRequest,
  getRecoveryStatus,
  updateRecoveryPolicy,
} from '@/lib/aa/recovery/guardian-manager';
import {
  getPasskeyStorage,
  createPasskey,
  authenticateWithPasskey,
  removePasskey,
  getPasskeyStatus,
  isWebAuthnSupported,
} from '@/lib/aa/recovery/passkey-manager';

export function useRecovery() {
  const account = useActiveAccount();
  const address = account?.address;
  const chainId = (account as any)?.chain?.id || 84532; // Base Sepolia default
  
  const [enabled] = useState(() => RECOVERY_CONFIG.enabled);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [activeRequest, setActiveRequest] = useState<RecoveryRequest | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load data
  const loadData = useCallback(() => {
    if (!address) return;
    
    const guardianStorage = getGuardianStorage(address);
    setGuardians(guardianStorage.guardians);
    
    const passkeyStorage = getPasskeyStorage(address);
    setPasskeys(passkeyStorage.credentials);
    
    const status = getRecoveryStatus(address);
    setActiveRequest(status.activeRequest);
  }, [address]);
  
  useEffect(() => {
    if (enabled && address) {
      loadData();
    }
  }, [enabled, address, loadData]);
  
  // Guardian management
  const inviteGuardian = useCallback(async (
    guardianAddress: string,
    name: string,
    email?: string
  ): Promise<boolean> => {
    if (!address) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = addGuardian(address, {
        address: guardianAddress,
        name,
        email,
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to add guardian');
        return false;
      }
      
      loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, loadData]);
  
  const revokeGuardian = useCallback(async (
    guardianAddress: string
  ): Promise<boolean> => {
    if (!address) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = removeGuardian(address, guardianAddress);
      
      if (!result.success) {
        setError(result.error || 'Failed to remove guardian');
        return false;
      }
      
      loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, loadData]);
  
  // Passkey management
  const addPasskey = useCallback(async (
    name: string
  ): Promise<PasskeyCredential | null> => {
    if (!address) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createPasskey(address, name, chainId);
      
      if (!result.success) {
        setError(result.error || 'Failed to create passkey');
        return null;
      }
      
      loadData();
      return result.credential!;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, loadData]);
  
  const deletePasskey = useCallback(async (
    credentialId: string
  ): Promise<boolean> => {
    if (!address) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = removePasskey(address, credentialId);
      
      if (!result.success) {
        setError(result.error || 'Failed to remove passkey');
        return false;
      }
      
      loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, loadData]);
  
  const signWithPasskey = useCallback(async (
    credentialId?: string
  ): Promise<string | null> => {
    if (!address) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authenticateWithPasskey(address, credentialId);
      
      if (!result.success) {
        setError(result.error || 'Authentication failed');
        return null;
      }
      
      return result.signature!;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);
  
  // Recovery operations
  const initiateRecovery = useCallback(async (
    newOwner: string
  ): Promise<string | null> => {
    if (!address) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = createRecoveryRequest(address, address, newOwner);
      
      if (!result.success) {
        setError(result.error || 'Failed to initiate recovery');
        return null;
      }
      
      loadData();
      return result.requestId!;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, loadData]);
  
  const approveRecovery = useCallback(async (
    requestId: string,
    guardianAddress: string
  ): Promise<boolean> => {
    if (!address) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = approveRecoveryRequest(address, requestId, guardianAddress);
      
      if (!result.success) {
        setError(result.error || 'Failed to approve recovery');
        return false;
      }
      
      loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, loadData]);
  
  const executeRecovery = useCallback(async (
    requestId: string
  ): Promise<boolean> => {
    if (!address) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = executeRecoveryRequest(address, requestId);
      
      if (!result.success) {
        setError(result.error || 'Failed to execute recovery');
        return false;
      }
      
      loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, loadData]);
  
  const cancelRecovery = useCallback(async (
    requestId: string
  ): Promise<boolean> => {
    if (!address) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = cancelRecoveryRequest(address, requestId, address);
      
      if (!result.success) {
        setError(result.error || 'Failed to cancel recovery');
        return false;
      }
      
      loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, loadData]);
  
  // Get current status
  const recoveryStatus = address ? getRecoveryStatus(address) : null;
  const passkeyStatus = address ? getPasskeyStatus(address) : null;
  
  return {
    // Feature flag
    enabled,
    
    // Data
    guardians,
    passkeys,
    activeRequest,
    
    // Status
    recoveryStatus,
    passkeyStatus,
    webauthnSupported: isWebAuthnSupported(),
    p256Supported: RECOVERY_CONFIG.p256Support[chainId as keyof typeof RECOVERY_CONFIG.p256Support] || false,
    
    // Guardian operations
    inviteGuardian,
    revokeGuardian,
    
    // Passkey operations
    addPasskey,
    deletePasskey,
    signWithPasskey,
    
    // Recovery operations
    initiateRecovery,
    approveRecovery,
    executeRecovery,
    cancelRecovery,
    
    // Policy
    policy: address ? getGuardianStorage(address).policy : RECOVERY_CONFIG.defaultPolicy,
    updatePolicy: (updates: any) => address ? updateRecoveryPolicy(address, updates) : { success: false },
    
    // State
    isLoading,
    error,
    refresh: loadData,
  };
}