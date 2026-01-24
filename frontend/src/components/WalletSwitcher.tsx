"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useDisconnect, useActiveWallet as useThirdwebWallet } from 'thirdweb/react';
import { useActiveWallet } from '../hooks/useActiveWallet';
import { RightSlideWallet } from './TBAWallet/RightSlideWallet';
import { ImageDebugger } from './ImageDebugger';
import { clearAuth } from '../lib/siweClient';
import { LogOut } from 'lucide-react';

interface WalletSwitcherProps {
  className?: string;
  showBalance?: boolean;
}

export const WalletSwitcher: React.FC<WalletSwitcherProps> = ({
  className = "",
  showBalance = false
}) => {
  const {
    account,
    tbaWallet,
    getWalletDisplayName,
    getWalletType,
    currentWalletAddress,
    hasActiveTBAWallet
  } = useActiveWallet();

  // ThirdWeb wallet and disconnect hooks
  const thirdwebWallet = useThirdwebWallet();
  const { disconnect } = useDisconnect();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showTBAWallet, setShowTBAWallet] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Complete logout: disconnect wallet + clear SIWE auth
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Clear SIWE authentication state
      clearAuth();
      console.log('🔐 SIWE auth cleared');

      // 2. Disconnect ThirdWeb wallet
      if (thirdwebWallet) {
        disconnect(thirdwebWallet);
        console.log('👛 Wallet disconnected');
      }

      // 3. Clear any localStorage/sessionStorage auth data
      if (typeof window !== 'undefined') {
        // Clear ThirdWeb connection data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('thirdweb') ||
            key.includes('walletconnect') ||
            key.includes('siwe') ||
            key.includes('auth')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Also clear sessionStorage
        sessionStorage.clear();
        console.log('🗑️ Local storage cleaned');
      }

      // 4. Close dropdown
      setShowDropdown(false);

      // 5. Reload page to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!account) {
    return null;
  }

  const walletType = getWalletType();
  const displayName = getWalletDisplayName();

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Main Wallet Display */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3 bg-bg-card rounded-lg border border-border-primary px-4 py-3 
                   hover:border-accent-gold dark:hover:border-accent-silver transition-all duration-300 w-full"
        >
          {/* Wallet Icon */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/70 transition-colors duration-300">
            {walletType === 'TBA' && tbaWallet ? (
              <ImageDebugger 
                nftContract={tbaWallet.nftContract}
                tokenId={tbaWallet.tokenId}
                className="w-7 h-7 rounded-full overflow-hidden"
              />
            ) : (
              <Image
                src="/cg-wallet-logo.png"
                alt="CG Wallet"
                width={28}
                height={28}
                className="object-contain w-7 h-7"
              />
            )}
          </div>

          {/* Wallet Info */}
          <div className="flex-1 text-left">
            <div className="font-medium text-text-primary text-sm transition-colors duration-300">
              {displayName}
            </div>
            <div className="text-xs text-text-secondary transition-colors duration-300">
              {walletType === 'TBA' ? 'CryptoGift Wallet' : 'Regular Wallet'}
              {showBalance && (
                <span className="ml-2">• $0.00</span>
              )}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <svg 
            className={`w-4 h-4 text-text-muted transition-all duration-300 ${showDropdown ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown Content */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card rounded-lg shadow-lg border border-border-primary z-20 transition-colors duration-300">
              <div className="p-2">
                {/* Current EOA Wallet */}
                <button
                  onClick={() => {
                    // Switch to EOA wallet (disconnect TBA)
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-bg-secondary transition-colors duration-300 ${
                    walletType === 'EOA' ? 'bg-blue-50 dark:bg-accent-gold/20 border border-blue-200 dark:border-accent-gold/30' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/70 flex items-center justify-center transition-colors duration-300">
                    <Image
                      src="/cg-wallet-logo.png"
                      alt="CG Wallet"
                      width={28}
                      height={28}
                      className="object-contain w-7 h-7"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-text-primary text-sm transition-colors duration-300">
                      {account.address.slice(0, 6)}...{account.address.slice(-4)}
                    </div>
                    <div className="text-xs text-text-secondary transition-colors duration-300">Regular Wallet</div>
                  </div>
                  {walletType === 'EOA' && (
                    <div className="w-2 h-2 bg-blue-500 dark:bg-accent-gold rounded-full transition-colors duration-300"></div>
                  )}
                </button>

                {/* TBA Wallet (if available) */}
                {hasActiveTBAWallet() && tbaWallet && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-bg-secondary transition-colors duration-300 ${
                      walletType === 'TBA' ? 'bg-orange-50 dark:bg-accent-silver/20 border border-orange-200 dark:border-accent-silver/30' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-border-primary transition-colors duration-300">
                      <ImageDebugger 
                        nftContract={tbaWallet.nftContract}
                        tokenId={tbaWallet.tokenId}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-text-primary text-sm transition-colors duration-300">
                        {tbaWallet.name}
                      </div>
                      <div className="text-xs text-text-secondary transition-colors duration-300">CryptoGift Wallet</div>
                    </div>
                    {walletType === 'TBA' && (
                      <div className="w-2 h-2 bg-orange-500 dark:bg-accent-silver rounded-full transition-colors duration-300"></div>
                    )}
                  </button>
                )}

                {/* Divider */}
                <div className="border-t border-border-primary my-2 transition-colors duration-300"></div>

                {/* Actions */}
                {hasActiveTBAWallet() && tbaWallet && (
                  <button
                    onClick={() => {
                      setShowTBAWallet(true);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-bg-secondary transition-colors duration-300 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/70 flex items-center justify-center transition-colors duration-300">
                      <Image
                        src="/cg-wallet-logo.png"
                        alt="CG Wallet"
                        width={28}
                        height={28}
                        className="object-contain w-7 h-7"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-text-primary text-sm transition-colors duration-300">
                        Abrir CG Wallet
                      </div>
                      <div className="text-xs text-text-secondary transition-colors duration-300">Interfaz completa</div>
                    </div>
                  </button>
                )}

                <a
                  href="/my-wallets"
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-bg-secondary transition-colors duration-300 text-left"
                  onClick={() => setShowDropdown(false)}
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-accent-silver/20 flex items-center justify-center transition-colors duration-300">
                    <span className="text-green-600 dark:text-accent-silver text-sm transition-colors duration-300">⚙️</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-text-primary text-sm transition-colors duration-300">
                      Gestionar Wallets
                    </div>
                    <div className="text-xs text-text-secondary transition-colors duration-300">Ver todas mis wallets</div>
                  </div>
                </a>

                {/* Divider before logout */}
                <div className="border-t border-border-primary my-2 transition-colors duration-300"></div>

                {/* LOGOUT BUTTON */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20
                           transition-colors duration-300 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center
                               transition-colors duration-300 group-hover:bg-red-200 dark:group-hover:bg-red-900/50">
                    <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-red-600 dark:text-red-400 text-sm transition-colors duration-300">
                      {isLoggingOut ? 'Desconectando...' : 'Desconectar Wallet'}
                    </div>
                    <div className="text-xs text-red-500/70 dark:text-red-400/60 transition-colors duration-300">
                      Cerrar sesión completamente
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* TBA Wallet Slide Panel */}
      {showTBAWallet && tbaWallet && (
        <RightSlideWallet
          isOpen={showTBAWallet}
          onClose={() => setShowTBAWallet(false)}
          nftContract={tbaWallet.nftContract}
          tokenId={tbaWallet.tokenId}
        />
      )}
    </>
  );
};