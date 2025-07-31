"use client";

import React, { useState, useEffect } from 'react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { baseSepolia } from 'thirdweb/chains';
import { client } from '../app/client';
import { authenticateWithSiwe, getAuthState, isAuthValid } from '../lib/siweClient';
import { SafeThirdwebWrapper } from './SafeThirdwebWrapper';

interface ConnectAndAuthButtonProps {
  onAuthChange?: (isAuthenticated: boolean, address?: string) => void;
  className?: string;
  showAuthStatus?: boolean;
}

const ConnectAndAuthButtonInner: React.FC<ConnectAndAuthButtonProps> = ({
  onAuthChange,
  className = "",
  showAuthStatus = false
}) => {
  // Always call useActiveAccount - Error Boundary will handle context errors
  const account = useActiveAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check auth status when component mounts or account changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const authState = getAuthState();
      const isValid = isAuthValid();
      
      const authenticated = authState.isAuthenticated && isValid && 
                          authState.address?.toLowerCase() === account?.address?.toLowerCase();
      
      setIsAuthenticated(authenticated);
      onAuthChange?.(authenticated, account?.address);
    };

    if (account?.address) {
      checkAuthStatus();
    } else {
      setIsAuthenticated(false);
      onAuthChange?.(false);
    }
  }, [account?.address, onAuthChange]);

  const handleAuthenticate = async () => {
    if (!account?.address) {
      setAuthError('No wallet connected');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      console.log('🔐 Starting SIWE authentication for:', account.address.slice(0, 10) + '...');
      
      // Verify account supports message signing
      if (!account.signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      // Perform SIWE authentication
      const authState = await authenticateWithSiwe(account.address, account);
      
      if (authState.isAuthenticated) {
        setIsAuthenticated(true);
        setAuthError(null);
        onAuthChange?.(true, account.address);
        console.log('✅ Authentication successful!');
      } else {
        throw new Error('Authentication failed');
      }

    } catch (error: any) {
      console.error('❌ SIWE authentication failed:', error);
      setAuthError(error.message || 'Authentication failed');
      setIsAuthenticated(false);
      onAuthChange?.(false, account.address);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // If no wallet connected, show connect button
  if (!account?.address) {
    return (
      <div className={className}>
        <ConnectButton
          client={client}
          chain={baseSepolia}
          appMetadata={{
            name: "CryptoGift Wallets",
            url: "https://cryptogift-wallets.vercel.app",
          }}
          connectModal={{
            size: "wide",
            title: "Conectar Wallet",
            showThirdwebBranding: false,
            welcomeScreen: {
              title: "CryptoGift Wallets",
              subtitle: "Conecta tu wallet para comenzar"
            }
          }}
          switchButton={{
            label: "Cambiar Red"
          }}
        />
      </div>
    );
  }

  // If wallet connected but not authenticated
  if (!isAuthenticated) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center space-y-4">
          {/* Header with security emphasis */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">🔐 Firma de Seguridad Requerida</h3>
            <p className="text-sm text-gray-600">Genera tu token temporal de autenticación para proteger tus transacciones</p>
          </div>
          
          {/* Show connected wallet */}
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700 font-medium">
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
            <span className="text-xs text-green-600">0 ETH</span>
          </div>
          
          {/* Authentication button */}
          <button
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isAuthenticating ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Autenticando... (unos segundos)</span>
              </div>
            ) : (
              '✍️ Firmar Mensaje de Autenticación'
            )}
          </button>
          
          {/* Loading message during authentication */}
          {isAuthenticating && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-sm">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-500 text-lg">⏱️</div>
                <div className="text-xs text-yellow-700">
                  <p className="font-medium mb-1">Autenticación en proceso</p>
                  <p>Este proceso toma unos segundos. Por favor, firma el mensaje en tu wallet cuando aparezca.</p>
                </div>
              </div>
            </div>
          )}

          {/* Security info */}
          {!isAuthenticating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-sm">
              <div className="flex items-start space-x-2">
                <div className="text-blue-500 text-lg">🔒</div>
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">¿Por qué esta firma?</p>
                  <p>Esta firma genera un token seguro que protege tus transacciones y previene ataques maliciosos.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {authError && (
            <div className="text-red-500 text-sm text-center max-w-xs">
              {authError}
            </div>
          )}
          
          {/* Connect button for changing wallet */}
          <div className="text-xs">
            <ConnectButton
              client={client}
              appMetadata={{
                name: "CryptoGift Wallets",
                url: "https://cryptogift-wallets.vercel.app",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show status
  return (
    <div className={className}>
      <div className="flex flex-col items-center space-y-2">
        {showAuthStatus && (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Autenticado</span>
          </div>
        )}
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </div>
        
        {/* Connect button for changing wallet */}
        <div className="text-xs">
          <ConnectButton
            client={client}
            appMetadata={{
              name: "CryptoGift Wallets",
              url: "https://cryptogift-wallets.vercel.app",
            }}
          />
        </div>
        
        {/* Re-authenticate button if needed */}
        <button
          onClick={handleAuthenticate}
          className="text-xs text-purple-600 hover:text-purple-700 underline"
        >
          Re-autenticar
        </button>
      </div>
    </div>
  );
};

// Export wrapped version to handle ThirdwebProvider context errors
export const ConnectAndAuthButton: React.FC<ConnectAndAuthButtonProps> = (props) => {
  return (
    <SafeThirdwebWrapper>
      <ConnectAndAuthButtonInner {...props} />
    </SafeThirdwebWrapper>
  );
};