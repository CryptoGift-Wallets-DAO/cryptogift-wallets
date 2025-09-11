'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  availableBalance: {
    eth: string;
    usdc: string;
  };
  onSwap: (fromToken: string, toToken: string, amount: string) => Promise<void>;
}

interface SwapQuote {
  fromAmount: string;
  toAmount: string;
  fromToken: string;
  toToken: string;
  priceImpact: string;
  gasEstimate: string;
  route: string[];
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  availableBalance,
  onSwap
}) => {
  const [fromToken, setFromToken] = useState<'ETH' | 'USDC'>('ETH');
  const [toToken, setToToken] = useState<'ETH' | 'USDC'>('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [error, setError] = useState('');
  const [slippage, setSlippage] = useState('1.0');

  // Mock exchange rates (in production, fetch from 0x API)
  const mockRates = useMemo(() => ({
    'ETH-USDC': 3000,
    'USDC-ETH': 1 / 3000
  }), []);

  // Security: Input validation
  const validateAmount = (amount: string, balance: string): boolean => {
    try {
      const amountNum = parseFloat(amount);
      const balanceNum = parseFloat(balance);
      return amountNum > 0 && amountNum <= balanceNum && !isNaN(amountNum);
    } catch {
      return false;
    }
  };

  // Calculate swap quote
  const calculateQuote = useCallback(async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setToAmount('');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Security: Validate input amount
      const balance = fromToken === 'ETH' ? availableBalance.eth : availableBalance.usdc;
      if (!validateAmount(amount, balance)) {
        throw new Error(`Insufficient balance. Available: ${balance} ${fromToken}`);
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const rateKey = `${fromToken}-${toToken}` as keyof typeof mockRates;
      const rate = mockRates[rateKey];
      
      if (!rate) {
        throw new Error('Swap pair not supported');
      }

      const fromAmountNum = parseFloat(amount);
      const toAmountNum = fromAmountNum * rate;
      
      // Calculate price impact (mock)
      const priceImpact = fromAmountNum > 1 ? '0.1' : '0.05';
      
      const newQuote: SwapQuote = {
        fromAmount: amount,
        toAmount: toAmountNum.toFixed(fromToken === 'ETH' ? 2 : 6),
        fromToken,
        toToken,
        priceImpact,
        gasEstimate: fromToken === 'ETH' ? '0.002' : '0.001',
        route: [fromToken, toToken]
      };

      setQuote(newQuote);
      setToAmount(newQuote.toAmount);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get quote');
      setQuote(null);
      setToAmount('');
    } finally {
      setIsLoading(false);
    }
  }, [fromToken, toToken, availableBalance.eth, availableBalance.usdc, mockRates]);

  // Handle amount input
  useEffect(() => {
    if (fromAmount) {
      calculateQuote(fromAmount);
    } else {
      setQuote(null);
      setToAmount('');
    }
  }, [fromAmount, fromToken, toToken, calculateQuote]);

  // Swap tokens
  const handleSwapTokens = () => {
    const newFromToken = toToken;
    const newToToken = fromToken;
    setFromToken(newFromToken);
    setToToken(newToToken);
    setFromAmount('');
    setToAmount('');
    setQuote(null);
  };

  // Execute swap
  const handleSwap = async () => {
    if (!quote) return;

    try {
      setIsLoading(true);
      setError('');

      await onSwap(fromToken, toToken, fromAmount);
      
      // Reset form on success
      setFromAmount('');
      setToAmount('');
      setQuote(null);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Swap failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxAmount = (): string => {
    const balance = fromToken === 'ETH' ? availableBalance.eth : availableBalance.usdc;
    const maxAmount = parseFloat(balance);
    
    // Reserve gas for ETH swaps
    if (fromToken === 'ETH' && maxAmount > 0.01) {
      return (maxAmount - 0.01).toFixed(6);
    }
    
    return maxAmount.toFixed(fromToken === 'ETH' ? 6 : 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-96 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Swap Tokens</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Slippage Settings */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Slippage Tolerance</span>
            <div className="flex items-center space-x-2">
              {['0.5', '1.0', '2.0'].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`px-2 py-1 rounded text-xs ${
                    slippage === value
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>

          {/* From Token */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">From</span>
              <span className="text-xs text-gray-500">
                Balance: {fromToken === 'ETH' ? availableBalance.eth : availableBalance.usdc} {fromToken}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.00"
                  step={fromToken === 'ETH' ? '0.000001' : '0.01'}
                  className="w-full text-lg font-medium bg-transparent border-none outline-none"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFromAmount(getMaxAmount())}
                  className="text-purple-500 text-xs font-medium hover:text-purple-600"
                  disabled={isLoading}
                >
                  MAX
                </button>
                
                <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    fromToken === 'ETH' ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {fromToken === 'ETH' ? 'E' : 'U'}
                  </div>
                  <span className="font-medium">{fromToken}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">To</span>
              <span className="text-xs text-gray-500">
                Balance: {toToken === 'ETH' ? availableBalance.eth : availableBalance.usdc} {toToken}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={toAmount}
                  placeholder="0.00"
                  className="w-full text-lg font-medium bg-transparent border-none outline-none"
                  disabled
                />
              </div>
              
              <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  toToken === 'ETH' ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {toToken === 'ETH' ? 'E' : 'U'}
                </div>
                <span className="font-medium">{toToken}</span>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && fromAmount && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="ml-2 text-gray-600">Getting best price...</span>
            </div>
          )}

          {/* Quote Details */}
          {quote && !isLoading && (
            <div className="bg-purple-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-purple-800 mb-2">Swap Details</h4>
              <div className="space-y-1 text-xs text-purple-700">
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span>1 {fromToken} = {(parseFloat(quote.toAmount) / parseFloat(quote.fromAmount)).toFixed(fromToken === 'ETH' ? 0 : 6)} {toToken}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price Impact:</span>
                  <span className={parseFloat(quote.priceImpact) > 1 ? 'text-red-600' : 'text-green-600'}>
                    {quote.priceImpact}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gas Fee:</span>
                  <span>~{quote.gasEstimate} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Slippage:</span>
                  <span>{slippage}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Warning for high price impact */}
          {quote && parseFloat(quote.priceImpact) > 1 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700 text-sm">
                ⚠️ High price impact detected. Consider reducing the amount or trying again later.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSwap}
              disabled={
                isLoading ||
                !quote ||
                !fromAmount ||
                !validateAmount(fromAmount, fromToken === 'ETH' ? availableBalance.eth : availableBalance.usdc)
              }
              className="flex-1 py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Swapping...
                </div>
              ) : (
                `Swap ${fromToken} for ${toToken}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapModal;