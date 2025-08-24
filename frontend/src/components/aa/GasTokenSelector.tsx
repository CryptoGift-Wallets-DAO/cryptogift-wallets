/**
 * Gas Token Selector Component
 * Select ERC-20 token for gas payment
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Fuel, Check, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useERC20Paymaster } from '@/hooks/useERC20Paymaster';
import { formatTokenAmount } from '@/lib/aa/config';

interface GasTokenSelectorProps {
  estimatedGas?: bigint;
  onTokenSelect?: (token: any) => void;
  className?: string;
}

export function GasTokenSelector({
  estimatedGas = 21000n,
  onTokenSelect,
  className = '',
}: GasTokenSelectorProps) {
  const {
    enabled,
    isSupported,
    tokens,
    selectedToken,
    isLoading,
    error,
    gasQuote,
    selectToken,
    getQuote,
    checkAllowance,
    approveToken,
    canPayWithToken,
  } = useERC20Paymaster();
  
  const [isOpen, setIsOpen] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  
  // Get quote when gas estimate changes
  useEffect(() => {
    if (selectedToken && estimatedGas > 0n) {
      getQuote(estimatedGas);
    }
  }, [selectedToken, estimatedGas]);
  
  // Check if approval is needed
  useEffect(() => {
    if (gasQuote && selectedToken) {
      const allowance = selectedToken.allowance || 0n;
      setNeedsApproval(allowance < gasQuote.tokenAmount);
    }
  }, [gasQuote, selectedToken]);
  
  const handleTokenSelect = async (token: typeof tokens[0]) => {
    selectToken(token);
    setIsOpen(false);
    onTokenSelect?.(token);
    
    // Check allowance for new token
    await checkAllowance();
  };
  
  const handleApprove = async () => {
    if (!gasQuote || !selectedToken) return;
    
    setIsApproving(true);
    
    // Approve with some buffer (2x the required amount)
    const approvalAmount = gasQuote.tokenAmount * 2n;
    const success = await approveToken(approvalAmount);
    
    if (success) {
      setNeedsApproval(false);
    }
    
    setIsApproving(false);
  };
  
  // Don't render if not enabled
  if (!enabled || !isSupported) {
    return null;
  }
  
  return (
    <div className={`relative ${className}`}>
      {/* Main selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Pay Gas With
            </span>
          </div>
          
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>
        
        {/* Token selector button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            {selectedToken ? (
              <>
                <span className="text-lg">{selectedToken.icon}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedToken.symbol}
                </span>
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                Select token
              </span>
            )}
          </div>
          
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>
        
        {/* Token dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-10"
            >
              {tokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{token.icon}</span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {token.symbol}
                      </p>
                      {token.balance && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Balance: {formatTokenAmount(token.balance, token.decimals)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {selectedToken?.address === token.address && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Gas quote */}
        {gasQuote && selectedToken && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Estimated Cost
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {gasQuote.formattedAmount} {gasQuote.tokenSymbol}
              </span>
            </div>
            
            {selectedToken.balance && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Your Balance
                </span>
                <span className={`text-sm font-medium ${
                  selectedToken.balance >= gasQuote.tokenAmount
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatTokenAmount(selectedToken.balance, selectedToken.decimals)} {selectedToken.symbol}
                </span>
              </div>
            )}
            
            {/* Approval needed */}
            {needsApproval && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Approval required for {selectedToken.symbol}
                    </p>
                    <button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isApproving ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Approving...
                        </span>
                      ) : (
                        'Approve'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}
      </div>
      
      {/* Info box */}
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Fuel className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              Pay Gas with Stablecoins
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              No ETH needed! Pay transaction fees using USDC or other supported tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}