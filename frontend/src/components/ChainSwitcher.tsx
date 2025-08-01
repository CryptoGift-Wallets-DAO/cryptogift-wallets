"use client";

import React, { useState, useEffect } from 'react';
import { useActiveAccount, useSwitchActiveWalletChain } from 'thirdweb/react';
import { baseSepolia } from 'thirdweb/chains';

interface ChainSwitcherProps {
  className?: string;
  onChainChanged?: (chainId: number) => void;
}

/**
 * ChainSwitcher Component - Handles network switching for mobile wallets
 * Detects wrong networks and prompts users to switch to Base Sepolia
 * Simplified version without event listeners to avoid TypeScript conflicts
 */
export const ChainSwitcher: React.FC<ChainSwitcherProps> = ({
  className = "",
  onChainChanged
}) => {
  const account = useActiveAccount();
  const switchChain = useSwitchActiveWalletChain();
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const targetChainId = baseSepolia.id; // 84532

  useEffect(() => {
    const detectChain = async () => {
      if (!account) return;

      try {
        let detectedChainId: number | null = null;

        // Simple chain detection using window.ethereum (compatible with existing types)
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          try {
            const ethereum = (window as any).ethereum;
            const hexChainId = await ethereum.request({ method: 'eth_chainId' });
            
            // Parse different chain ID formats
            if (typeof hexChainId === 'string') {
              if (hexChainId.startsWith('eip155:')) {
                detectedChainId = parseInt(hexChainId.replace('eip155:', ''), 10);
              } else if (hexChainId.startsWith('0x')) {
                detectedChainId = parseInt(hexChainId, 16);
              } else {
                detectedChainId = parseInt(hexChainId, 10);
              }
            } else if (typeof hexChainId === 'number') {
              detectedChainId = hexChainId;
            }
            
            console.log('🔗 Chain detected:', detectedChainId);
          } catch (error) {
            console.warn('⚠️ Chain detection failed:', error);
          }
        }

        if (detectedChainId && detectedChainId > 0) {
          setCurrentChainId(detectedChainId);
          onChainChanged?.(detectedChainId);
        }
      } catch (error) {
        console.error('❌ Chain detection failed:', error);
      }
    };

    detectChain();
  }, [account, onChainChanged]);

  const handleSwitchChain = async () => {
    if (!account) return;

    setIsSwitching(true);
    setSwitchError(null);

    try {
      console.log('🔄 Switching to Base Sepolia (84532)...');
      
      await switchChain(baseSepolia);
      
      console.log('✅ Chain switched successfully');
      setCurrentChainId(targetChainId);
      onChainChanged?.(targetChainId);
      
    } catch (error: any) {
      console.error('❌ Chain switch failed:', error);
      setSwitchError(error.message || 'Failed to switch network');
    } finally {
      setIsSwitching(false);
    }
  };

  // Don't show if no account or already on correct chain
  if (!account || currentChainId === targetChainId) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="text-yellow-600 text-xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-yellow-800 font-medium mb-1">
            Wrong Network Detected
          </h3>
          <p className="text-yellow-700 text-sm mb-3">
            You&apos;re currently on chain {currentChainId}. This app requires Base Sepolia (84532) to function properly.
          </p>
          
          {switchError && (
            <div className="text-red-600 text-sm mb-3 p-2 bg-red-50 rounded">
              {switchError}
            </div>
          )}
          
          <button
            onClick={handleSwitchChain}
            disabled={isSwitching}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isSwitching ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Switching...</span>
              </div>
            ) : (
              `Switch to Base Sepolia`
            )}
          </button>
          
          <p className="text-yellow-600 text-xs mt-2">
            If switching fails, please manually change to Base Sepolia in your wallet settings.
          </p>
        </div>
      </div>
    </div>
  );
};