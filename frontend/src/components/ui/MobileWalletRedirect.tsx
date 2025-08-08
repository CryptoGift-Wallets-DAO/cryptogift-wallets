"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileWalletRedirectProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  action: 'sign' | 'claim';
  walletName?: string;
}

import { isMobileDevice } from '../../lib/mobileRpcHandler';

// Generate wallet-specific deeplinks with proper URL formatting
const generateWalletDeeplink = (walletName: string, action: string): string => {
  const lowerName = walletName.toLowerCase();
  
  // Construct clean URL without double encoding
  const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  
  console.log('🔗 Generating deeplink for:', lowerName, 'URL:', currentUrl);
  
  // MetaMask deeplinks - fixed format to prevent "Invalid deeplink" warning
  if (lowerName.includes('metamask')) {
    // Use proper MetaMask deeplink format without double encoding
    const encodedUrl = encodeURIComponent(currentUrl);
    const deeplink = `https://metamask.app.link/dapp/${encodedUrl}`;
    console.log('🦊 MetaMask deeplink generated:', deeplink);
    return deeplink;
  }
  
  // Trust Wallet deeplinks  
  if (lowerName.includes('trust')) {
    const deeplink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
    console.log('🛡️ Trust Wallet deeplink generated:', deeplink);
    return deeplink;
  }
  
  // Coinbase Wallet deeplinks
  if (lowerName.includes('coinbase')) {
    const deeplink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`;
    console.log('🪙 Coinbase Wallet deeplink generated:', deeplink);
    return deeplink;
  }
  
  // Rainbow Wallet deeplinks
  if (lowerName.includes('rainbow')) {
    const deeplink = `rainbow://dapp?url=${encodeURIComponent(currentUrl)}`;
    console.log('🌈 Rainbow Wallet deeplink generated:', deeplink);
    return deeplink;
  }
  
  // Generic fallback - use MetaMask format
  const encodedUrl = encodeURIComponent(currentUrl);
  const fallbackDeeplink = `https://metamask.app.link/dapp/${encodedUrl}`;
  console.log('🔄 Fallback deeplink generated:', fallbackDeeplink);
  return fallbackDeeplink;
};

export const MobileWalletRedirect: React.FC<MobileWalletRedirectProps> = ({
  isOpen,
  onClose,
  walletAddress,
  action,
  walletName = 'Wallet'
}) => {
  const [countdown, setCountdown] = useState(15);
  const [walletDeeplink, setWalletDeeplink] = useState('');

  useEffect(() => {
    if (isOpen && isMobileDevice()) {
      // Generate deeplink when modal opens
      const deeplink = generateWalletDeeplink(walletName, action);
      setWalletDeeplink(deeplink);
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose(); // Auto-close after 15 seconds
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, action, walletName, onClose]);

  const handleOpenWallet = () => {
    try {
      console.log('📱 Opening wallet via deeplink:', walletDeeplink);
      
      // Try to open via deeplink
      window.location.href = walletDeeplink;
      
      // Fallback: try to trigger wallet selection dialog
      setTimeout(() => {
        if (window.ethereum) {
          window.ethereum.request({ method: 'eth_requestAccounts' });
        }
      }, 1000);
      
      // Auto-close after opening wallet
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.warn('📱 Deeplink failed, trying fallback:', error);
      
      // Fallback: trigger ethereum wallet selection
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      
      onClose();
    }
  };

  const getActionText = () => {
    switch (action) {
      case 'sign':
        return 'firmar el mensaje de autenticación';
      case 'claim':
        return 'completar la transacción';
      default:
        return 'continuar';
    }
  };

  // 🔥 TEMPORARY DISABLE: Debug popup legacy issue
  console.log('🚨 MobileWalletRedirect called:', { isOpen, action, walletAddress: walletAddress.slice(0, 10) + '...' });
  
  if (!isOpen || !isMobileDevice()) {
    return null;
  }
  
  // ⚠️ DEBUGGING: Log when popup tries to show
  console.log('🚨 MobileWalletRedirect SHOWING popup:', { action, walletName, isOpen });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          data-mobile-redirect={action}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ✕
            </button>

            {/* Icon */}
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📱</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Abrir {walletName}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Necesitas {getActionText()} en tu wallet móvil
              </p>
            </div>

            {/* Wallet info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wallet conectada:</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>

            {/* Action button */}
            <motion.button
              onClick={handleOpenWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors mb-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🚀 Abrir {walletName}
            </motion.button>

            {/* Instructions */}
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
              <p>1. Toca "Abrir {walletName}" arriba</p>
              <p>2. {action === 'sign' ? 'Firma el mensaje' : 'Confirma la transacción'}</p>
              <p>3. Regresa a esta página</p>
              
              {/* Countdown */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-gray-400">
                  Cerrando automáticamente en {countdown}s
                </p>
              </div>
            </div>

            {/* Fallback help */}
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                <strong>¿No funciona?</strong> Ve manualmente a tu {walletName} y busca las transacciones pendientes.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};