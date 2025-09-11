'use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  availableBalance: {
    eth: string;
    usdc: string;
  };
  onSend: (to: string, amount: string, token: 'ETH' | 'USDC') => Promise<void>;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  availableBalance,
  onSend
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDC'>('USDC');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Security: Input validation
  const validateRecipient = (address: string): boolean => {
    try {
      ethers.getAddress(address);
      return true;
    } catch {
      return false;
    }
  };

  const validateAmount = (amount: string, balance: string): boolean => {
    try {
      const amountNum = parseFloat(amount);
      const balanceNum = parseFloat(balance);
      return amountNum > 0 && amountNum <= balanceNum && !isNaN(amountNum);
    } catch {
      return false;
    }
  };

  const handleSend = async () => {
    try {
      setError('');
      setIsLoading(true);

      // Security: Comprehensive validation
      if (!validateRecipient(recipient)) {
        throw new Error('Invalid recipient address');
      }

      const balance = selectedToken === 'ETH' ? availableBalance.eth : availableBalance.usdc;
      if (!validateAmount(amount, balance)) {
        throw new Error(`Invalid amount. Available: ${balance} ${selectedToken}`);
      }

      // Security: Prevent self-send
      if (ethers.getAddress(recipient) === ethers.getAddress(walletAddress)) {
        throw new Error('Cannot send to the same wallet');
      }

      await onSend(recipient, amount, selectedToken);
      
      // Reset form on success
      setRecipient('');
      setAmount('');
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxAmount = (): string => {
    const balance = selectedToken === 'ETH' ? availableBalance.eth : availableBalance.usdc;
    const maxAmount = parseFloat(balance);
    
    // Security: Reserve small amount for gas when sending ETH
    if (selectedToken === 'ETH' && maxAmount > 0.01) {
      return (maxAmount - 0.01).toFixed(6);
    }
    
    return maxAmount.toFixed(selectedToken === 'ETH' ? 6 : 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-96 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Send Tokens</h3>
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
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token
            </label>
            <div className="flex space-x-2">
              {['ETH', 'USDC'].map((token) => (
                <button
                  key={token}
                  onClick={() => setSelectedToken(token as 'ETH' | 'USDC')}
                  className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium ${
                    selectedToken === token
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>{token}</span>
                    <span className="text-xs text-gray-500">
                      {token === 'ETH' ? availableBalance.eth : availableBalance.usdc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                recipient && !validateRecipient(recipient) ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {recipient && !validateRecipient(recipient) && (
              <p className="text-red-500 text-xs mt-1">Invalid address format</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step={selectedToken === 'ETH' ? '0.000001' : '0.01'}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-16"
                disabled={isLoading}
              />
              <button
                onClick={() => setAmount(getMaxAmount())}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 text-xs font-medium hover:text-blue-600"
                disabled={isLoading}
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>
                Available: {selectedToken === 'ETH' ? availableBalance.eth : availableBalance.usdc} {selectedToken}
              </span>
              {selectedToken === 'ETH' && (
                <span>Gas reserved: ~0.01 ETH</span>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Transaction Preview */}
          {recipient && amount && validateRecipient(recipient) && validateAmount(amount, selectedToken === 'ETH' ? availableBalance.eth : availableBalance.usdc) && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Transaction Preview</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>To:</span>
                  <span className="font-mono">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>{amount} {selectedToken}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span>Base Sepolia</span>
                </div>
                <div className="flex justify-between">
                  <span>Gas:</span>
                  <span>{selectedToken === 'ETH' ? '~0.001 ETH' : 'Sponsored'}</span>
                </div>
              </div>
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
              onClick={handleSend}
              disabled={
                isLoading ||
                !recipient ||
                !amount ||
                !validateRecipient(recipient) ||
                !validateAmount(amount, selectedToken === 'ETH' ? availableBalance.eth : availableBalance.usdc)
              }
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendModal;