"use client";

import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { sendTransaction, waitForReceipt, createThirdwebClient } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import Image from 'next/image';
import {
  validatePassword,
  getGiftStatus,
  formatTimeRemaining,
  isGiftExpired,
  parseEscrowError,
  prepareClaimGiftByIdCall
} from '../../../lib/escrowUtils';
import { type EscrowGift } from '../../../lib/escrowABI';
import { useAuth } from '../../../hooks/useAuth';
import { makeAuthenticatedRequest } from '../../../lib/siweClient';
import { ConnectAndAuthButton } from '../../../components/ConnectAndAuthButton';
import { NFTImageModal } from '../../../components/ui/NFTImageModal';
import { useNotifications } from '../../../components/ui/NotificationSystem';
// MobileWalletRedirect REMOVED - ConnectAndAuthButton handles all mobile popups
import { NetworkOptimizationPrompt } from '../../../components/ui/NetworkOptimizationPrompt';
import {
  isMobileDevice,
  isRpcError,
  sendTransactionMobile,
  waitForReceiptMobile
} from '../../../lib/mobileRpcHandler';

interface ClaimEscrowInterfaceProps {
  tokenId: string;
  giftInfo?: {
    creator: string;
    nftContract: string;
    expirationTime: number;
    status: 'active' | 'expired' | 'claimed' | 'returned' | 'pending' | 'cancelled';
    timeRemaining?: string;
    canClaim: boolean;
    isExpired: boolean;
  };
  nftMetadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
  onClaimSuccess?: (transactionHash: string, giftInfo?: any) => void;
  onClaimError?: (error: string) => void;
  className?: string;
  // NEW: Education gate data from EIP-712 approval
  educationGateData?: string;
  hasEducationRequirements?: boolean;
}

interface ClaimFormData {
  password: string;
  salt: string;
  recipientAddress?: string;
}

export const ClaimEscrowInterfaceEN: React.FC<ClaimEscrowInterfaceProps> = ({
  tokenId,
  giftInfo,
  nftMetadata,
  onClaimSuccess,
  onClaimError,
  className,
  educationGateData = '0x', // Default to empty gate data if no education required
  hasEducationRequirements = false
}) => {
  const account = useActiveAccount();
  const auth = useAuth();
  const { addNotification } = useNotifications();
  const [formData, setFormData] = useState<ClaimFormData>({
    password: '',
    salt: '',
    recipientAddress: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [claimStep, setClaimStep] = useState<'password' | 'claiming' | 'success'>('password');
  const [imageModalData, setImageModalData] = useState<{
    isOpen: boolean;
    image: string;
    name: string;
    tokenId: string;
    contractAddress: string;
  }>({ isOpen: false, image: '', name: '', tokenId: '', contractAddress: '' });
  // showMobileRedirect REMOVED - no longer needed
  const [showNetworkPrompt, setShowNetworkPrompt] = useState(false);

  // Mobile detection (using imported utility)
  const isMobile = isMobileDevice();

  // Fetch correct salt for this token when component mounts
  useEffect(() => {
    const fetchSalt = async () => {
      try {
        console.log(`🔍 Fetching salt for token ${tokenId}...`);
        const response = await fetch(`/api/salt/${tokenId}`);
        const data = await response.json();

        if (data.salt) {
          console.log(`✅ Salt found for token ${tokenId}`);
          setFormData(prev => ({ ...prev, salt: data.salt }));
        } else {
          console.log(`⚠️ No salt found for token ${tokenId}`);
        }
      } catch (error) {
        console.error(`❌ Error fetching salt for token ${tokenId}:`, error);
      }
    };

    if (tokenId) {
      fetchSalt();
    }
  }, [tokenId]);

  // Auto-populate recipient address when account is connected
  useEffect(() => {
    if (account?.address) {
      setFormData(prev => ({ ...prev, recipientAddress: account.address }));
    }
  }, [account]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, password: value }));

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleClaimNFT = async () => {
    console.log('🎯 Starting claim process for token:', tokenId);

    // Use connected wallet address if not specified
    const recipientAddress = formData.recipientAddress || account?.address;

    if (!recipientAddress || !auth?.isAuthenticated) {
      setError('Please connect your wallet and authenticate first');
      return;
    }

    if (!tokenId) {
      setError('Invalid gift ID');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Please enter a valid password (minimum 6 characters)');
      return;
    }

    setIsLoading(true);
    setError('');
    setClaimStep('claiming');

    try {
      console.log('🔐 Validating claim with backend for token:', tokenId);

      // Step 1: Validate claim with backend using correct endpoint
      const validateEndpoint = `/api/pre-claim/validate`;
      console.log('📡 Calling validate endpoint:', validateEndpoint);

      const validateResponse = await makeAuthenticatedRequest(validateEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          tokenId,
          password: formData.password,
          salt: formData.salt,
          recipientAddress,
          educationGateData: educationGateData // Use the provided gate data from education flow
        })
      });

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        console.error('❌ Validation error:', errorData);
        throw new Error(errorData.error || 'Failed to validate claim');
      }

      const validation = await validateResponse.json();
      console.log('✅ Validation successful:', validation);

      if (!validation.canClaim) {
        throw new Error(validation.reason || 'Cannot claim this gift at this time');
      }

      // Step 2: Execute on-chain claim via backend (still requires auth)
      console.log('🚀 Executing on-chain claim for token:', tokenId);
      const claimEndpoint = `/api/claim-nft`;

      const claimResponse = await makeAuthenticatedRequest(claimEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          tokenId,
          recipientAddress,
          password: formData.password,
          salt: formData.salt,
          gateData: educationGateData // Include gate data for on-chain claim
        })
      });

      if (!claimResponse.ok) {
        const errorData = await claimResponse.json();
        console.error('❌ Claim backend error:', errorData);
        throw new Error(errorData.error || 'Failed to claim gift');
      }

      const result = await claimResponse.json();
      console.log('✅ Claim successful:', result);

      // Add success notification
      addNotification({
        type: 'success',
        title: 'Gift claimed!',
        message: `Successfully claimed NFT #${tokenId}`,
        duration: 5000,
        action: result.transactionHash ? {
          label: 'View on BaseScan',
          onClick: () => window.open(`https://sepolia.basescan.org/tx/${result.transactionHash}`, '_blank')
        } : undefined
      });

      setClaimStep('success');
      onClaimSuccess?.(result.transactionHash, giftInfo);

      // Actualizar metadata via API si el claim fue exitoso
      if (result.transactionHash) {
        try {
          console.log('📸 Updating NFT metadata after successful claim...');
          const metadataResponse = await fetch('/api/nft/update-metadata-after-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenId,
              transactionHash: result.transactionHash,
              claimerAddress: recipientAddress
            })
          });

          if (metadataResponse.ok) {
            console.log('✅ Metadata updated successfully');
          } else {
            console.warn('⚠️ Metadata update failed but claim succeeded');
          }
        } catch (metadataError) {
          console.warn('⚠️ Error updating metadata (non-critical):', metadataError);
        }
      }
    } catch (error: any) {
      console.error('❌ Claim error:', error);

      // Add error notification
      addNotification({
        type: 'error',
        title: 'Claim failed',
        message: error.message || 'An unexpected error occurred',
        duration: 7000
      });

      const errorMessage = parseEscrowError(error);
      setError(errorMessage);
      onClaimError?.(errorMessage);
      setClaimStep('password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, salt: e.target.value }));
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, recipientAddress: e.target.value }));
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  const openImageModal = () => {
    if (nftMetadata?.image) {
      setImageModalData({
        isOpen: true,
        image: nftMetadata.image,
        name: nftMetadata.name || `Gift #${tokenId}`,
        tokenId: tokenId,
        contractAddress: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || ''
      });
    }
  };

  // Simplified gift status display
  const renderGiftStatus = () => {
    if (!giftInfo) return null;

    const statusColors = {
      active: 'text-green-600',
      expired: 'text-red-600',
      claimed: 'text-blue-600',
      returned: 'text-gray-600',
      pending: 'text-yellow-600',
      cancelled: 'text-red-600'
    };

    const statusText = {
      active: 'Ready to claim',
      expired: 'Expired',
      claimed: 'Already claimed',
      returned: 'Returned to creator',
      pending: 'Processing',
      cancelled: 'Cancelled'
    };

    return (
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
          <span className={`font-semibold ${statusColors[giftInfo.status] || 'text-gray-600'}`}>
            {statusText[giftInfo.status] || giftInfo.status}
          </span>
        </div>
        {giftInfo.status === 'active' && giftInfo.timeRemaining && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time remaining</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {giftInfo.timeRemaining}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Show network optimization prompt if needed
  const checkNetworkOptimization = () => {
    if (account?.address) {
      setShowNetworkPrompt(true);
    }
  };

  // If claim was successful, show success state
  if (claimStep === 'success') {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 ${className || ''}`}>
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            🎉 Success!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You have successfully claimed your gift NFT #{tokenId}
          </p>

          {nftMetadata?.image && (
            <div className="mb-6">
              <div className="relative w-48 h-48 mx-auto rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={nftMetadata.image}
                  alt={nftMetadata.name || 'Claimed NFT'}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/my-wallets'}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View in My Wallets
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Claim Another Gift
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 ${className || ''}`}>
      <div className="space-y-6">
        {/* NFT Preview */}
        {nftMetadata && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Claim Your Gift
            </h2>

            {nftMetadata.image && (
              <div
                className="relative w-48 h-48 mx-auto mb-4 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                onClick={openImageModal}
              >
                <Image
                  src={nftMetadata.image}
                  alt={nftMetadata.name || 'NFT Gift'}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                  <span className="text-white opacity-0 hover:opacity-100">Click to enlarge</span>
                </div>
              </div>
            )}

            {nftMetadata.name && (
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                {nftMetadata.name}
              </h3>
            )}

            {nftMetadata.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                {nftMetadata.description}
              </p>
            )}
          </div>
        )}

        {/* Gift Status */}
        {renderGiftStatus()}

        {/* Education Requirements Notice */}
        {hasEducationRequirements && educationGateData === '0x' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                This gift has educational requirements that must be completed first
              </span>
            </div>
          </div>
        )}

        {/* Connect Wallet Section */}
        {!account && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect your wallet to claim this gift
            </p>
            <ConnectAndAuthButton />
          </div>
        )}

        {/* Claim Form */}
        {account && auth?.isAuthenticated && claimStep === 'password' && (
          <>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gift Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  placeholder="Enter the password provided by the sender"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The password was shared with you by the gift sender
                </p>
              </div>

              {/* Advanced Options */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={toggleAdvanced}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  {showAdvanced ? 'Hide' : 'Show'} advanced options
                  <svg
                    className={`w-4 h-4 ml-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="salt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Salt (auto-filled)
                      </label>
                      <input
                        id="salt"
                        type="text"
                        value={formData.salt}
                        onChange={handleSaltChange}
                        placeholder="Salt value"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white font-mono text-sm"
                        disabled={isLoading}
                      />
                    </div>

                    <div>
                      <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recipient Address (optional)
                      </label>
                      <input
                        id="recipient"
                        type="text"
                        value={formData.recipientAddress}
                        onChange={handleRecipientChange}
                        placeholder="0x..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white font-mono text-sm"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Leave empty to claim to the connected wallet
                      </p>
                    </div>

                    {/* Network Optimization */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 12a1 1 0 112 0v1a1 1 0 11-2 0v-1zm1-4a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-blue-800 dark:text-blue-200">
                          Optimize RPC for faster transactions
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={checkNetworkOptimization}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                  </div>
                </div>
              )}

              {/* Claim Button */}
              <button
                onClick={handleClaimNFT}
                disabled={isLoading || !formData.password || (hasEducationRequirements && educationGateData === '0x')}
                className={`
                  w-full px-6 py-3 rounded-lg font-medium transition-all duration-200
                  ${isLoading || !formData.password || (hasEducationRequirements && educationGateData === '0x')
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }
                `}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Claim Gift NFT #${tokenId}`
                )}
              </button>
            </div>
          </>
        )}

        {/* Claiming State */}
        {claimStep === 'claiming' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Claiming your gift...
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please wait while we process your transaction
            </p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <NFTImageModal
        isOpen={imageModalData.isOpen}
        onClose={() => setImageModalData(prev => ({ ...prev, isOpen: false }))}
        image={imageModalData.image}
        name={imageModalData.name}
        tokenId={imageModalData.tokenId}
        contractAddress={imageModalData.contractAddress}
      />

      {/* Network Optimization Prompt */}
      {showNetworkPrompt && (
        <NetworkOptimizationPrompt
          isOpen={showNetworkPrompt}
          onClose={() => setShowNetworkPrompt(false)}
          currentChainId={84532} // Base Sepolia
          requiredChainId={84532} // Base Sepolia
          context="claim"
        />
      )}
    </div>
  );
};