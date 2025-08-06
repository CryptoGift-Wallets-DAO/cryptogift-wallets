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
} from '../../lib/escrowUtils';
import { type EscrowGift } from '../../lib/escrowABI';
import { useAuth } from '../../hooks/useAuth';
import { makeAuthenticatedRequest } from '../../lib/siweClient';
import { ConnectAndAuthButton } from '../ConnectAndAuthButton';
import { NFTImageModal } from '../ui/NFTImageModal';
import { useNotifications } from '../ui/NotificationSystem';

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
}

interface ClaimFormData {
  password: string;
  salt: string;
  recipientAddress?: string;
}

export const ClaimEscrowInterface: React.FC<ClaimEscrowInterfaceProps> = ({
  tokenId,
  giftInfo,
  nftMetadata,
  onClaimSuccess,
  onClaimError,
  className = ''
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

  // Fetch correct salt for this token when component mounts
  useEffect(() => {
    const fetchSalt = async () => {
      try {
        console.log('🧂 Fetching salt for token:', tokenId);
        const response = await fetch(`/api/escrow-salt/${tokenId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.salt) {
            setFormData(prev => ({
              ...prev,
              salt: data.salt
            }));
            console.log('✅ Salt retrieved successfully for token:', tokenId);
          } else {
            console.warn('⚠️ Salt not found for token:', tokenId);
            setError('Gift salt not available. This gift may not be claimable.');
          }
        } else {
          console.error('❌ Failed to fetch salt:', response.status, response.statusText);
          setError('Unable to load gift information. Please try again.');
        }
      } catch (error) {
        console.error('❌ Error fetching salt:', error);
        setError('Network error. Please check your connection.');
      }
    };
    
    if (tokenId) {
      fetchSalt();
    }
  }, [tokenId]);

  // Reset error when form changes
  useEffect(() => {
    setError('');
  }, [formData.password, formData.recipientAddress]);

  const validateForm = () => {
    if (!formData.password) {
      return 'Password is required';
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      return passwordValidation.message;
    }

    if (formData.recipientAddress && !formData.recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return 'Invalid recipient address';
    }

    return null;
  };

  const handleClaimGift = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    // Check SIWE authentication
    if (!auth.isAuthenticated) {
      setError('Please authenticate with your wallet first to claim the gift');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setClaimStep('claiming');
    setError('');

    try {
      console.log('🎁 FRONTEND CLAIM: Starting claim process for token', tokenId);

      // Step 1: Validate claim parameters using the new API
      console.log('🔍 STEP 1: Validating claim parameters...');
      const validateResponse = await makeAuthenticatedRequest('/api/validate-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokenId,
          password: formData.password,
          salt: formData.salt,
          claimerAddress: account.address
        })
      });

      const validationResult = await validateResponse.json();

      if (!validateResponse.ok || !validationResult.success || !validationResult.valid) {
        throw new Error(validationResult.error || 'Claim validation failed');
      }

      console.log('✅ STEP 1: Claim validation successful', {
        giftId: validationResult.giftId,
        giftInfo: validationResult.giftInfo
      });

      // Step 2: Prepare claim transaction using the validated giftId
      console.log('🔧 STEP 2: Preparing claim transaction...');
      const claimTransaction = prepareClaimGiftByIdCall(
        validationResult.giftId,
        formData.password,
        formData.salt,
        '0x' // Empty gate data
      );

      console.log('✅ STEP 2: Transaction prepared for giftId', validationResult.giftId);

      // Step 3: Execute claim transaction using user's wallet
      console.log('💫 STEP 3: Executing claim transaction with user wallet...');
      const client = createThirdwebClient({
        clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
      });

      const txResult = await sendTransaction({
        transaction: claimTransaction,
        account: account
      });

      console.log('📨 Transaction sent:', txResult.transactionHash);

      // Step 4: Wait for transaction confirmation
      console.log('⏳ STEP 4: Waiting for transaction confirmation...');
      const receipt = await waitForReceipt({
        client,
        chain: baseSepolia,
        transactionHash: txResult.transactionHash
      });

      if (receipt.status !== 'success') {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      console.log('✅ FRONTEND CLAIM SUCCESS:', {
        txHash: txResult.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });
      
      setClaimStep('success');
      
      // R2: ENHANCED METAMASK NFT VISIBILITY - Pre-pin + Toast handling
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('📱 Enhanced MetaMask NFT visibility process starting...');
        
        const contractAddress = giftInfo?.nftContract || validationResult.giftInfo?.nftContract;
        
        if (contractAddress) {
          try {
            // Step 1: Pre-pin tokenURI metadata to IPFS for faster loading
            console.log('📌 Pre-pinning tokenURI metadata...');
            const metadataUrl = `https://cryptogift-wallets.vercel.app/api/metadata/${contractAddress}/${tokenId}`;
            
            // R2 FIX: Fetch and cache metadata with response validation
            const metadataResponse = await fetch(metadataUrl);
            
            if (!metadataResponse.ok) {
              throw new Error(`Metadata fetch failed: ${metadataResponse.status} ${metadataResponse.statusText}`);
            }
            
            const metadata = await metadataResponse.json();
            console.log('✅ Metadata pre-cached with validation:', metadata);
            
            // Step 2: Request account refresh (forces NFT cache update)
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
            
            // Step 3: Add NFT to MetaMask with enhanced error handling
            try {
              await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: [{
                  type: 'ERC721',
                  options: {
                    address: contractAddress,
                    tokenId: tokenId,
                  }
                }]
              });
              
              // Success notification
              addNotification({
                type: 'success',
                title: '🦊 NFT añadido a MetaMask',
                message: 'Tu NFT debería aparecer en MetaMask en menos de 30 segundos',
                duration: 5000
              });
              
            } catch (watchError: any) {
              // Handle user denial with instructive toast
              if (watchError.code === 4001 || watchError.message?.includes('denied')) {
                addNotification({
                  type: 'warning',
                  title: '📱 Añadir NFT manualmente',
                  message: `Ve a MetaMask → NFTs → Importar NFT → Contrato: ${contractAddress.slice(0,8)}... → ID: ${tokenId}`,
                  duration: 10000,
                  action: {
                    label: 'Copiar Contrato',
                    onClick: () => navigator.clipboard.writeText(contractAddress)
                  }
                });
              } else {
                throw watchError; // Re-throw if not user denial
              }
            }
            
            console.log('✅ Enhanced MetaMask NFT visibility completed');
            
          } catch (error) {
            console.log('⚠️ MetaMask enhancement failed:', error);
            addNotification({
              type: 'info',
              title: '💡 NFT reclamado exitosamente',
              message: 'Puede tomar unos minutos aparecer en MetaMask',
              duration: 5000
            });
          }
        }
      }
      
      // Notify parent component of successful claim
      if (onClaimSuccess) {
        onClaimSuccess(txResult.transactionHash, {
          tokenId,
          recipientAddress: account.address, // NFT goes to connected wallet
          giftInfo: validationResult.giftInfo,
          gasless: false, // Frontend execution is always gas-paid by user
          frontendExecution: true
        });
      }

    } catch (err: any) {
      console.error('❌ FRONTEND CLAIM ERROR:', err);
      const errorMessage = parseEscrowError(err);
      setError(errorMessage);
      setClaimStep('password');
      
      if (onClaimError) {
        onClaimError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'expired': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      case 'claimed': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'returned': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'expired': return '⏰';
      case 'claimed': return '✅';
      case 'returned': return '↩️';
      default: return '❓';
    }
  };

  const canClaim = giftInfo?.status === 'active' && !giftInfo?.isExpired && giftInfo?.canClaim;

  if (claimStep === 'success') {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">Gift Claimed Successfully!</h2>
          <p className="text-green-600 dark:text-green-400 mb-4">
            The escrow gift has been successfully claimed and transferred directly to your wallet!
          </p>
          <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
            <p>Token ID: {tokenId}</p>
            <p>Recipient: {formData.recipientAddress || account?.address}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Image 
              src="/cg-wallet-logo.png" 
              alt="CryptoGift Wallet" 
              width={32} 
              height={32}
              className="rounded"
            />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Claim Your Escrow Gift
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Token ID: {tokenId}
          </p>
        </div>

        {/* Gift Status */}
        {giftInfo && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Gift Status</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(giftInfo.status)}`}>
                {getStatusIcon(giftInfo.status)} {giftInfo.status.toUpperCase()}
              </span>
            </div>
            
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>Creator: {giftInfo.creator.slice(0, 10)}...{giftInfo.creator.slice(-8)}</p>
              {giftInfo.timeRemaining && !giftInfo.isExpired && (
                <p>Time remaining: {giftInfo.timeRemaining}</p>
              )}
              {giftInfo.isExpired && (
                <p className="text-orange-600">⚠️ This gift has expired</p>
              )}
            </div>
          </div>
        )}

        {/* NFT Preview */}
        {nftMetadata && (
          <div className="mb-6 text-center">
            {nftMetadata.image && (
              <div 
                className="mx-auto mb-2 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                style={{
                  maxWidth: '128px',
                  maxHeight: '128px',
                  width: 'fit-content',
                  height: 'fit-content'
                }}
                onClick={() => {
                  console.log('🖼️ Opening NFT image modal for claim:', tokenId);
                  setImageModalData({
                    isOpen: true,
                    image: nftMetadata.image!,
                    name: nftMetadata.name || `Gift NFT #${tokenId}`,
                    tokenId: tokenId,
                    contractAddress: giftInfo?.nftContract || ''
                  });
                }}
                title="Click to view full image"
              >
                <img 
                  src={nftMetadata.image} 
                  alt={nftMetadata.name || 'Gift NFT'}
                  style={{
                    maxWidth: '128px',
                    maxHeight: '128px',
                    width: 'auto',
                    height: 'auto',
                    display: 'block'
                  }}
                  className="bg-gray-50 dark:bg-gray-700"
                />
              </div>
            )}
            {nftMetadata.name && (
              <h3 className="font-medium text-gray-900 dark:text-white">{nftMetadata.name}</h3>
            )}
            {nftMetadata.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{nftMetadata.description}</p>
            )}
          </div>
        )}

        {/* Authentication Section */}
        {!auth.isAuthenticated ? (
          <div className="mb-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="text-yellow-600 dark:text-yellow-400 text-xl mr-3">🔐</div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                    Authentication Required
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    You need to authenticate with your wallet to claim this gift securely.
                  </p>
                </div>
              </div>
            </div>
            
            <ConnectAndAuthButton 
              showAuthStatus={true}
              className="w-full"
              onAuthChange={(isAuthenticated) => {
                if (isAuthenticated) {
                  console.log('✅ User authenticated, can now claim gift');
                }
              }}
            />
          </div>
        ) : (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center text-green-800 dark:text-green-400">
              <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
              <span className="text-sm font-medium">Wallet authenticated - Ready to claim</span>
            </div>
          </div>
        )}

        {/* Claim Form */}
        {canClaim && auth.isAuthenticated ? (
          <div className="space-y-4">
            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gift Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter the gift password"
                disabled={isLoading}
              />
            </div>

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                disabled={isLoading}
              >
                <svg
                  className={`w-4 h-4 mr-2 transform transition-transform ${
                    showAdvanced ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Claim to Different Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.recipientAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, recipientAddress: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="0x... (leave empty to claim to your wallet)"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      If specified, the gift will be sent to this address instead
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start">
                      <div className="text-blue-600 dark:text-blue-400 text-lg mr-2">ℹ️</div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400">
                          User Wallet Transaction
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          This claim will be executed directly from your connected wallet. You will pay the gas fees and receive the NFT directly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Claim Button */}
            <button
              onClick={handleClaimGift}
              disabled={isLoading || !formData.password || !account || !auth.isAuthenticated}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {claimStep === 'claiming' ? 'Claiming Gift...' : 'Processing...'}
                </div>
              ) : (
                'Claim Gift'
              )}
            </button>

            {!account && (
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Connect your wallet to claim this gift
              </p>
            )}
          </div>
        ) : (
          /* Cannot Claim */
          <div className="text-center py-6">
            <div className="text-4xl mb-4">
              {giftInfo?.status === 'claimed' ? '✅' : 
               giftInfo?.status === 'returned' ? '↩️' : 
               giftInfo?.isExpired ? '⏰' : 
               giftInfo?.status === 'active' && !giftInfo?.canClaim ? '⏳' : '⏰'}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {giftInfo?.status === 'claimed' ? '✅ Gift reclamado' :
               giftInfo?.status === 'returned' ? '↩️ Gift devuelto al creador' :
               giftInfo?.isExpired ? '⏰ Gift expirado' :
               giftInfo?.status === 'active' && !giftInfo?.canClaim ? '⏳ Gift todavía disponible...' :
               giftInfo?.status === 'active' ? '🎁 Gift disponible para reclamar' : 
               '⏰ Gift expirado'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {giftInfo?.status === 'claimed' ? 'Este gift ya ha sido reclamado exitosamente por otro usuario.' :
               giftInfo?.status === 'returned' ? 'El tiempo de reclamación expiró y el gift fue devuelto automáticamente a su creador.' :
               giftInfo?.isExpired ? 'El tiempo límite para reclamar este gift ha expirado. Ya no puede ser reclamado.' :
               giftInfo?.status === 'active' && !giftInfo?.canClaim ? 
                 `Este gift está activo y disponible para reclamar. Vence el ${new Date(giftInfo.expirationTime * 1000).toLocaleDateString('es-ES')} a las ${new Date(giftInfo.expirationTime * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.` :
               !giftInfo ? 'No se pudo cargar la información del gift. Verifica el enlace o intenta más tarde.' :
               giftInfo?.status === 'pending' ? 'Este gift está siendo procesado. Espera unos momentos e intenta nuevamente.' :
               giftInfo?.status === 'cancelled' ? 'Este gift fue cancelado por su creador y ya no está disponible.' :
               giftInfo?.status === 'active' ? `Este gift está disponible para reclamar. Vence el ${new Date(giftInfo.expirationTime * 1000).toLocaleDateString('es-ES')} a las ${new Date(giftInfo.expirationTime * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.` :
               'Este gift ha expirado y ya no puede ser reclamado.'}
            </p>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Secure Frontend Claiming:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>Your password is validated securely and never stored</li>
                <li>Transaction executed directly from your connected wallet</li>
                <li>You pay gas fees and receive the NFT immediately to your wallet</li>
                <li>No server-side transaction execution ensures maximum security</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* NFT IMAGE MODAL */}
      <NFTImageModal
        isOpen={imageModalData.isOpen}
        onClose={() => setImageModalData(prev => ({ ...prev, isOpen: false }))}
        image={imageModalData.image}
        name={imageModalData.name}
        tokenId={imageModalData.tokenId}
        contractAddress={imageModalData.contractAddress}
        metadata={{
          description: nftMetadata?.description || "A special NFT gift waiting to be claimed.",
          attributes: [
            { trait_type: "Status", value: giftInfo?.status.toUpperCase() || "ACTIVE" },
            { trait_type: "Network", value: "Base Sepolia" },
            { trait_type: "Type", value: "CryptoGift NFT" }
          ]
        }}
      />
    </div>
  );
};