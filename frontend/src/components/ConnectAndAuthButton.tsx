"use client";

import React, { useState, useEffect } from 'react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { baseSepolia } from 'thirdweb/chains';
import { client } from '../app/client';
import { authenticateWithSiwe, getAuthState, isAuthValid } from '../lib/siweClient';
import { SafeThirdwebWrapper } from './SafeThirdwebWrapper';
import { MobileWalletRedirect } from './ui/MobileWalletRedirect';

// Mobile detection utility
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768);
};

// R1: Smart deeplink handler - POST authentication only
// No longer interferes with ThirdWeb v5 wallet connection flow
const handlePostAuthDeeplink = async (account: any, isMobile: boolean) => {
  if (!isMobile || typeof window === 'undefined') return;

  try {
    console.log('📱 Post-auth deeplink starting...');
    
    // Detect wallet type via ThirdWeb
    const walletName = account?.wallet?.getConfig?.()?.name?.toLowerCase() || 'unknown';
    
    // MetaMask-specific deeplink enhancement
    if (walletName.includes('metamask') && window.ethereum?.isMetaMask) {
      console.log('🦊 MetaMask detected - using native permissions request');
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
    }
    
    // Deeplink success indication (no redirect)
    console.log('📱 Mobile authentication completed - staying on current page');
    
  } catch (error) {
    console.log('📱 Deeplink enhancement failed, continuing normally:', error);
    // Non-blocking - user can continue in browser
  }
};

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
  const [isMobile, setIsMobile] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showMobileRedirect, setShowMobileRedirect] = useState(false);

  // Check if mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

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
    // ✅ FIX CRÍTICO: No más redirecciones prematuras que rompan user-activation
    // ThirdWeb v5 ya maneja todas las wallets correctamente
    
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

      // 📱 MOBILE: Show redirect popup when signing starts
      if (isMobile) {
        setShowMobileRedirect(true);
        console.log('📱 Mobile detected - showing wallet redirect popup');
      }

      // ✅ DIRECTO AL SIWE SIN REDIRECCIONES
      const authState = await authenticateWithSiwe(account.address, account);
      
      if (authState.isAuthenticated) {
        setIsAuthenticated(true);
        setAuthError(null);
        setShowSuccessMessage(true);
        setShowMobileRedirect(false); // Hide mobile popup on success
        onAuthChange?.(true, account.address);
        console.log('✅ Authentication successful!');
        
        // Hide success message after 4 seconds
        setTimeout(() => setShowSuccessMessage(false), 4000);
        
        // ✅ DEEPLINK INTELIGENTE SOLO DESPUÉS DEL ÉXITO
        await handlePostAuthDeeplink(account, isMobile);
        
      } else {
        throw new Error('Authentication failed');
      }

    } catch (error: any) {
      console.error('❌ SIWE authentication failed:', error);
      setAuthError(error.message || 'Authentication failed');
      setIsAuthenticated(false);
      setShowMobileRedirect(false); // Hide popup on error
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
          {/* Header with enhanced security emphasis */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">🔐 Firma de Seguridad Requerida</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Genera tu token temporal de autenticación para proteger tus transacciones</p>
          </div>
          
          {/* Show connected wallet */}
          <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700 dark:text-green-400 font-medium">
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
            <span className="text-xs text-green-600 dark:text-green-500">0.1 ETH</span>
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
          
          {/* Enhanced loading message during authentication */}
          {isAuthenticating && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 max-w-sm">
              <div className="flex items-start space-x-3">
                <div className="text-yellow-500 dark:text-yellow-400 text-lg">🛡️</div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium mb-2">🔐 Generando Token de Seguridad Temporal</p>
                  <p className="mb-2">Estamos creando un token de autenticación que expirará en 30 minutos para proteger todas tus transacciones.</p>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                    <p>✅ Previene ataques maliciosos</p>
                    <p>✅ Protege tus fondos</p>
                    <p>✅ Expira automáticamente por seguridad</p>
                  </div>
                  {isMobile ? (
                    <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-800/30 rounded border">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">📱 En móvil:</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Si no aparece automáticamente, abre tu wallet app y busca el mensaje de firma pendiente.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 font-medium">💻 Por favor, firma el mensaje en tu wallet cuando aparezca.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced security info */}
          {!isAuthenticating && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 max-w-sm">
              <div className="flex items-start space-x-3">
                <div className="text-blue-500 dark:text-blue-400 text-lg">🔒</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-2">¿Por qué necesitamos esta firma?</p>
                  <p className="mb-2">Esta firma genera un <strong>token temporal de seguridad</strong> que actúa como una capa adicional de protección contra amenazas.</p>
                  <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <p>🛡️ <strong>Token Temporal:</strong> Expira en 30 minutos</p>
                    <p>🔐 <strong>Máxima Seguridad:</strong> Protege contra ataques maliciosos</p>
                    <p>✅ <strong>Estándar SIWE:</strong> Sign-In With Ethereum certificado</p>
                    <p>🚀 <strong>Transacciones Seguras:</strong> Todas las operaciones serán firmadas con este token</p>
                  </div>
                  <p className="mt-2 text-xs italic">Esta medida de seguridad avanzada garantiza la máxima protección de tus fondos.</p>
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

  // If authenticated, show enhanced status with security info
  return (
    <div className={className}>
      <div className="flex flex-col items-center space-y-4">
        {/* Enhanced authenticated status */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            {isAuthenticating ? (
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
            <span className="text-sm font-medium">
              {isAuthenticating ? 'Autenticando...' : 'Autenticado'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </div>
        </div>

        {/* INLINE SUCCESS MESSAGE - No more /authenticated interruptions! */}
        {showSuccessMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 max-w-sm animate-fade-in">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium text-green-800 dark:text-green-300">¡Autenticación Exitosa! 🎉</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Puedes continuar con tu operación</p>
              </div>
            </div>
          </div>
        )}

        {/* Security status info when authenticated */}
        {!isAuthenticating && !showSuccessMessage && showAuthStatus && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 max-w-sm">
            <div className="flex items-start space-x-2">
              <div className="text-green-500 dark:text-green-400 text-lg">🛡️</div>
              <div className="text-xs text-green-700 dark:text-green-300">
                <p className="font-medium mb-1">Token de Seguridad Activo</p>
                <p>Tu token temporal está protegiendo todas las transacciones. Expirará automáticamente en 30 minutos por seguridad.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Standard info footer */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-2 max-w-sm">
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1 text-center">
            <p>🔒 Tu wallet se conectará de forma segura usando el estándar SIWE (Sign-In With Ethereum)</p>
            <p>✅ Todos los datos se mantienen privados y seguros</p>
          </div>
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
          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline"
        >
          Re-autenticar
        </button>
      </div>

      {/* Mobile Wallet Redirect Popup */}
      <MobileWalletRedirect
        isOpen={showMobileRedirect}
        onClose={() => setShowMobileRedirect(false)}
        walletAddress={account?.address || ''}
        action="sign"
        walletName={(account as any)?.wallet?.getConfig?.()?.name || 'Wallet'}
      />
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