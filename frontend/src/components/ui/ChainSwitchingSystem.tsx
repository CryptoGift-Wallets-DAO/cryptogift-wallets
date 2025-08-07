'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveAccount, useSwitchActiveWalletChain } from 'thirdweb/react';
import { sepolia, baseSepolia } from 'thirdweb/chains';
import { isMobileDevice } from '../../lib/mobileRpcHandler';
import { ThemeCard, ThemeButton } from './ThemeSystem';

interface ChainSwitchingSystemProps {
  requiredChainId?: number;
  onChainSwitched?: (chainId: number) => void;
  showPersistentIndicator?: boolean;
  autoPrompt?: boolean;
  className?: string;
}

/**
 * INTELLIGENT CHAIN SWITCHING SYSTEM
 * 
 * Features:
 * - 🔗 Automatic chain detection and switching prompts
 * - 🎯 Context-aware chain requirements 
 * - 📱 Mobile-friendly switching interface
 * - ⚡ Instant feedback and error handling
 * - 🔔 Persistent indicators for chain status
 * - 🎨 Beautiful animations and transitions
 * - 🛡️ Comprehensive error handling
 */

const SUPPORTED_CHAINS = {
  11155111: {
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    icon: '⚪',
    color: 'blue',
    chain: sepolia
  },
  84532: {
    name: 'Base Sepolia',
    shortName: 'Base',
    icon: '🔵', 
    color: 'blue',
    chain: baseSepolia
  }
} as const;

export function ChainSwitchingSystem({
  requiredChainId = 84532, // Default to Base Sepolia
  onChainSwitched,
  showPersistentIndicator = true,
  autoPrompt = true,
  className = ''
}: ChainSwitchingSystemProps) {
  const account = useActiveAccount();
  const switchChain = useSwitchActiveWalletChain();
  
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isWrongChain, setIsWrongChain] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [hasPromptedBefore, setHasPromptedBefore] = useState(false);

  // Detect current chain
  useEffect(() => {
    if (account?.address) {
      // Get chain ID from the account/wallet - need to check if chainId exists
      const chainId = (account as any).chainId || null;
      setCurrentChainId(chainId);
      
      const wrongChain = chainId !== null && chainId !== requiredChainId;
      setIsWrongChain(wrongChain);
      
      // Auto-prompt if enabled and user hasn't been prompted before
      if (wrongChain && autoPrompt && !hasPromptedBefore) {
        setTimeout(() => {
          setShowPrompt(true);
          setHasPromptedBefore(true);
        }, 1500); // Delay to avoid immediate popup
      }
      
      console.log(`🔗 Chain detected: ${chainId}, required: ${requiredChainId}, wrong: ${wrongChain}`);
    }
  }, [account, requiredChainId, autoPrompt, hasPromptedBefore]);

  // Handle chain switching
  const handleSwitchChain = async () => {
    if (!account) {
      setSwitchError('Please connect your wallet first');
      return;
    }

    const targetChain = SUPPORTED_CHAINS[requiredChainId as keyof typeof SUPPORTED_CHAINS];
    if (!targetChain) {
      setSwitchError('Unsupported chain requested');
      return;
    }

    setIsSwitching(true);
    setSwitchError(null);

    try {
      console.log(`🔄 Switching to ${targetChain.name} (${requiredChainId})...`);
      
      // 🚨 MOBILE FIX: Don't use switchChain on mobile to avoid wallet_switchEthereumChain issues
      if (isMobileDevice()) {
        console.log('📱 Mobile detected - skipping automatic chain switch to prevent deeplink issues');
        throw new Error('Mobile users should switch networks manually in their wallet to avoid deeplink conflicts');
      }
      
      await switchChain(targetChain.chain);
      
      // Update state
      setCurrentChainId(requiredChainId);
      setIsWrongChain(false);
      setShowPrompt(false);
      
      // Notify parent component
      onChainSwitched?.(requiredChainId);
      
      console.log(`✅ Successfully switched to ${targetChain.name}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch chain';
      setSwitchError(errorMessage);
      console.error('❌ Chain switching failed:', error);
      
      // Keep prompt open on error
      setShowPrompt(true);
    } finally {
      setIsSwitching(false);
    }
  };

  // Get chain info
  const getCurrentChainInfo = () => {
    if (!currentChainId) return null;
    return SUPPORTED_CHAINS[currentChainId as keyof typeof SUPPORTED_CHAINS] || {
      name: `Unknown Chain (${currentChainId})`,
      shortName: 'Unknown',
      icon: '❓',
      color: 'gray'
    };
  };

  const getRequiredChainInfo = () => {
    return SUPPORTED_CHAINS[requiredChainId as keyof typeof SUPPORTED_CHAINS];
  };

  const currentChain = getCurrentChainInfo();
  const requiredChain = getRequiredChainInfo();

  if (!account) {
    return null; // Don't show if wallet not connected
  }

  return (
    <div className={className}>
      {/* Persistent Chain Indicator */}
      {showPersistentIndicator && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current chain:</span>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              isWrongChain 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              <span>{currentChain?.icon || '❓'}</span>
              <span>{currentChain?.shortName || 'Unknown'}</span>
              {isWrongChain && (
                <motion.button
                  onClick={() => setShowPrompt(true)}
                  className="ml-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded p-0.5 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ⚠️
                </motion.button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chain Switch Prompt Modal */}
      <AnimatePresence>
        {showPrompt && isWrongChain && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrompt(false)}
            />
            
            {/* Modal */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <ThemeCard 
                variant="highlighted" 
                className="max-w-md w-full"
                onClick={() => {}}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔗</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Switch Network
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowPrompt(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    This application requires <strong>{requiredChain?.name}</strong> to function properly.
                  </p>

                  {/* Chain Comparison */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Current:</span>
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <span>{currentChain?.icon}</span>
                        <span>{currentChain?.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Required:</span>
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <span>{requiredChain?.icon}</span>
                        <span>{requiredChain?.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {switchError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">⚠️</span>
                        <div>
                          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                            Switch Failed
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                            {switchError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <ThemeButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowPrompt(false)}
                      className="flex-1"
                    >
                      Later
                    </ThemeButton>
                    
                    <ThemeButton
                      variant="primary"
                      size="sm"
                      onClick={handleSwitchChain}
                      disabled={isSwitching}
                      loading={isSwitching}
                      className="flex-1"
                    >
                      {isSwitching ? 'Switching...' : `Switch to ${requiredChain?.shortName}`}
                    </ThemeButton>
                  </div>

                  {/* Help Text */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                    Your wallet will prompt you to approve the network switch
                  </p>
                </div>
              </ThemeCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Quick Chain Switch Button - Compact version for headers/toolbars
 */
interface QuickChainSwitchProps {
  requiredChainId?: number;
  onChainSwitched?: (chainId: number) => void;
  className?: string;
}

export function QuickChainSwitch({
  requiredChainId = 84532,
  onChainSwitched,
  className = ''
}: QuickChainSwitchProps) {
  const account = useActiveAccount();
  const currentChainId = (account as any)?.chainId;
  const isWrongChain = currentChainId !== null && currentChainId !== requiredChainId;
  
  if (!account || !isWrongChain) {
    return null;
  }

  const requiredChain = SUPPORTED_CHAINS[requiredChainId as keyof typeof SUPPORTED_CHAINS];

  return (
    <div className={className}>
      <ThemeButton
        variant="secondary"
        size="sm"
        onClick={() => {
          // This will be handled by the full ChainSwitchingSystem component
          console.log('🔗 Quick switch requested');
        }}
        className="flex items-center gap-1.5"
      >
        <span>⚠️</span>
        <span>Switch to {requiredChain?.shortName}</span>
      </ThemeButton>
    </div>
  );
}

export default ChainSwitchingSystem;