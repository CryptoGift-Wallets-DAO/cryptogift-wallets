import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { getAuthState, isAuthValid, clearAuth } from '../lib/siweClient';

export interface AuthState {
  isAuthenticated: boolean;
  isConnected: boolean;
  address?: string;
  token?: string;
  expiresAt?: number;
}

export function useAuth(): AuthState {
  const account = useActiveAccount();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isConnected: false
  });

  useEffect(() => {
    const checkAuthStatus = () => {
      const siweState = getAuthState();
      const isValid = isAuthValid();
      const isConnected = !!account?.address;
      
      // Authentication is valid only if:
      // 1. Wallet is connected
      // 2. SIWE state shows authenticated
      // 3. Token is still valid
      // 4. Address matches connected wallet
      const isAuthenticated = isConnected && 
                             siweState.isAuthenticated && 
                             isValid && 
                             siweState.address?.toLowerCase() === account?.address?.toLowerCase();

      const newState: AuthState = {
        isAuthenticated,
        isConnected,
        address: account?.address,
        token: siweState.token,
        expiresAt: siweState.expiresAt
      };

      setAuthState(newState);

      // If wallet disconnected, clear auth state
      if (!isConnected && siweState.isAuthenticated) {
        clearAuth();
      }
    };

    checkAuthStatus();
    
    // Check auth status every 30 seconds
    const interval = setInterval(checkAuthStatus, 30000);
    return () => clearInterval(interval);
  }, [account?.address]);

  return authState;
}