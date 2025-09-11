"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { TransactionButton } from 'thirdweb/react';
import { prepareContractCall, getContract } from 'thirdweb';
import { baseSepolia, base } from 'thirdweb/chains';
import { client } from '../app/client';
import { PERMIT2_ADDRESS, COMMON_TOKENS } from '../lib/constants';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tbaAddress: string;
  currentBalance: string;
  currentToken: string;
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  tbaAddress,
  currentBalance,
  currentToken,
}) => {
  const [targetToken, setTargetToken] = useState(COMMON_TOKENS.USDC);
  const [swapData, setSwapData] = useState<any>(null);
  const [needsPermit, setNeedsPermit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermit2Approval = useCallback(async () => {
    try {
      // Check if the token has sufficient allowance for Permit2
      const response = await fetch('/api/check-allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: currentToken,
          owner: tbaAddress,
          spender: PERMIT2_ADDRESS,
          amount: currentBalance,
        }),
      });

      const data = await response.json();
      setNeedsPermit(!data.hasAllowance);
    } catch (err) {
      console.error('Error checking allowance:', err);
    }
  }, [currentToken, tbaAddress, currentBalance]);

  // Check if user needs to approve Permit2 first
  useEffect(() => {
    if (currentToken !== COMMON_TOKENS.USDC) {
      checkPermit2Approval();
    }
  }, [currentToken, currentBalance, checkPermit2Approval]);

  const getSwapQuote = async () => {
    if (!currentBalance || currentToken === targetToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: currentToken,
          to: targetToken,
          amount: currentBalance,
          tbaAddress: tbaAddress,
          executeSwap: false, // Just get quote first
          chainId: baseSepolia.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Swap quote failed: ${response.status}`);
      }

      const data = await response.json();
      setSwapData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get swap quote');
    } finally {
      setIsLoading(false);
    }
  };

  const executeGaslessSwap = async () => {
    if (!swapData) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: currentToken,
          to: targetToken,
          amount: currentBalance,
          tbaAddress: tbaAddress,
          executeSwap: true, // Execute the swap gaslessly
          chainId: baseSepolia.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gasless swap failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.executed) {
        console.log('✅ Gasless swap successful:', data.transactionHash);
        onClose(); // Close modal on success
        // TODO: Refresh wallet balance
      } else {
        throw new Error(data.error || 'Gasless execution failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute gasless swap');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    if (!swapData) throw new Error('No swap data available');

    const contract = getContract({
      client,
      chain: process.env.NEXT_PUBLIC_CHAIN_ID === '84532' ? baseSepolia : base,
      address: tbaAddress,
    });

    return prepareContractCall({
      contract,
      method: 'function executeCall(address dest, uint256 value, bytes calldata data)',
      params: [
        swapData.dest as `0x${string}`,
        BigInt(swapData.value || '0'),
        swapData.calldata as `0x${string}`,
      ]
    });
  };

  const handleApprovePermit2 = () => {
    const contract = getContract({
      client,
      chain: process.env.NEXT_PUBLIC_CHAIN_ID === '84532' ? baseSepolia : base,
      address: currentToken,
    });

    return prepareContractCall({
      contract,
      method: 'function approve(address spender, uint256 amount)',
      params: [
        PERMIT2_ADDRESS as `0x${string}`,
        BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'), // Max approval
      ]
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Swap Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Current Token */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                {currentToken === COMMON_TOKENS.USDC ? 'USDC' : 
                 currentToken === COMMON_TOKENS.WETH ? 'WETH' : 
                 'Token'}
              </span>
              <span className="font-medium">{currentBalance}</span>
            </div>
          </div>

          {/* Target Token */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <select
              value={targetToken}
              onChange={(e) => setTargetToken(e.target.value as typeof COMMON_TOKENS.USDC)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {Object.entries(COMMON_TOKENS)
                .filter(([, address]) => address !== currentToken)
                .map(([name, address]) => (
                  <option key={address} value={address}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          {/* Swap Quote */}
          {swapData && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                Swap quote ready! Choose your execution method:
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <div>🚀 <strong>Gasless Swap:</strong> Free transaction sponsored by Biconomy</div>
                <div>⚡ <strong>Manual Swap:</strong> Pay gas fees yourself</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {needsPermit ? (
              <TransactionButton
                transaction={handleApprovePermit2}
                onTransactionConfirmed={() => {
                  setNeedsPermit(false);
                  getSwapQuote();
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg"
              >
                Approve Permit2
              </TransactionButton>
            ) : (
              <>
                <button
                  onClick={getSwapQuote}
                  disabled={isLoading || currentToken === targetToken}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg"
                >
                  {isLoading ? 'Loading...' : 'Get Quote'}
                </button>
                
                {swapData && (
                  <>
                    <button
                      onClick={executeGaslessSwap}
                      disabled={isLoading}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      {isLoading ? 'Executing...' : '🚀 Gasless Swap'}
                    </button>
                    <TransactionButton
                      transaction={handleSwap}
                      onTransactionConfirmed={() => {
                        onClose();
                        alert('Swap completed successfully!');
                      }}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      Manual Swap
                    </TransactionButton>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};