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
// MobileWalletRedirect REMOVED - ConnectAndAuthButton handles all mobile popups
import { NetworkOptimizationPrompt } from '../ui/NetworkOptimizationPrompt';
import { 
  isMobileDevice, 
  isRpcError, 
  sendTransactionMobile, 
  waitForReceiptMobile 
} from '../../lib/mobileRpcHandler';

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

export const ClaimEscrowInterface: React.FC<ClaimEscrowInterfaceProps> = ({
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

    // Guard: Check if education was required but no gate data
    if (hasEducationRequirements && (!educationGateData || educationGateData === '0x')) {
      addNotification({
        type: 'error',
        title: '⚠️ Aprobación Requerida',
        message: 'Necesitas completar la validación educativa antes de reclamar',
        duration: 5000
      });
      setError('Education validation required but not completed');
      return; // Don't proceed with claim
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setClaimStep('claiming');
    setError('');

    let validationResult: any;
    let txResult: any;
    
    try {
      console.log('🎁 FRONTEND CLAIM: Starting claim process for token', tokenId);
      
      // Mobile redirect popup completely disabled for this component

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
          claimerAddress: account.address,
          gateData: educationGateData // FIX: Include education bypass signature
        })
      });

      validationResult = await validateResponse.json();

      if (!validateResponse.ok || !validationResult.success || !validationResult.valid) {
        throw new Error(validationResult.error || 'Claim validation failed');
      }

      console.log('✅ STEP 1: Claim validation successful', {
        giftId: validationResult.giftId,
        giftInfo: validationResult.giftInfo
      });

      // Step 2: Prepare claim transaction using the validated giftId
      console.log('🔧 STEP 2: Preparing claim transaction...');
      console.log('🎓 EDUCATION GATE DATA:', educationGateData === '0x' ? 'EMPTY (no education required)' : `SIGNATURE PRESENT (${educationGateData.slice(0, 20)}...)`);
      
      const claimTransaction = prepareClaimGiftByIdCall(
        validationResult.giftId,
        formData.password,
        formData.salt,
        educationGateData // Use education gate data from EIP-712 approval
      );

      console.log('✅ STEP 2: Transaction prepared for giftId', validationResult.giftId);

      // Step 3: Execute claim transaction using user's wallet
      console.log('💫 STEP 3: Executing claim transaction with user wallet...');
      
      // 📱 MOBILE: POPUP DISABLED - ConnectAndAuthButton handles all mobile redirects
      // The mobile popup is completely handled by ConnectAndAuthButton SIWE flow
      // No additional popup needed here - transaction will work normally
      if (isMobile) {
        console.log('📱 Mobile detected - transaction will proceed (popup handled by auth flow)');
      }
      
      // 🔄 MOBILE FIX: Enhanced transaction handling with timeout and retries
      const isMobile = isMobileDevice();
      
      if (isMobile) {
        console.log('📱 Mobile device detected - using enhanced transaction handling');
        
        // Add delay for MetaMask Mobile to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify wallet is connected and on correct chain
        if (window.ethereum) {
          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainId, 16);
            if (currentChainId !== 84532) {
              console.warn('⚠️ Wrong chain detected:', currentChainId);
              throw new Error('Por favor cambia a Base Sepolia en tu wallet');
            }
          } catch (chainError) {
            console.error('Chain verification failed:', chainError);
          }
        }
        
        // Use timeout wrapper for mobile
        const transactionPromise = sendTransaction({
          transaction: claimTransaction,
          account: account
        });
        
        // 30 second timeout for mobile (MetaMask Mobile can be slow)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout - MetaMask no respondió')), 30000)
        );
        
        try {
          txResult = await Promise.race([transactionPromise, timeoutPromise]);
        } catch (timeoutError) {
          console.error('📱 Mobile transaction timeout:', timeoutError);
          
          // 🚨 MOBILE FIX: Check if transaction was actually sent but timed out on response
          if (timeoutError.message?.includes('Transaction timeout')) {
            console.log('🔍 Checking if transaction was actually sent despite timeout...');
            
            // Wait a moment for transaction to propagate
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check recent transactions for this account
            try {
              const recentTxResponse = await fetch(`/api/check-recent-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  address: account.address,
                  tokenId: tokenId,
                  giftId: validationResult.giftId
                })
              });
              
              if (recentTxResponse.ok) {
                const recentTxData = await recentTxResponse.json();
                if (recentTxData.success && recentTxData.transactionHash) {
                  console.log('✅ Found successful transaction despite timeout:', recentTxData.transactionHash);
                  txResult = { transactionHash: recentTxData.transactionHash };
                  // Skip retry, use found transaction
                } else {
                  throw timeoutError; // No successful transaction found, proceed with retry
                }
              } else {
                throw timeoutError; // API call failed, proceed with retry
              }
            } catch (checkError) {
              console.log('⚠️ Could not verify transaction status, proceeding with retry...');
              
              // Try once more with longer timeout
              console.log('🔄 Retrying transaction with extended timeout...');
              const retryPromise = sendTransaction({
                transaction: claimTransaction,
                account: account
              });
              
              const extendedTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transaction timeout después de reintentar - puede estar pendiente en blockchain')), 45000)
              );
              
              txResult = await Promise.race([retryPromise, extendedTimeoutPromise]);
            }
          } else {
            throw timeoutError; // Different type of error, don't retry
          }
        }
      } else {
        // Desktop: standard flow
        txResult = await sendTransaction({
          transaction: claimTransaction,
          account: account
        });
      }

      console.log('📨 Transaction sent:', txResult.transactionHash);

      // Step 4: Wait for transaction confirmation with mobile-specific handling
      console.log('⏳ STEP 4: Waiting for transaction confirmation...');
      
      let receipt;
      if (isMobile) {
        // Extended timeout for mobile confirmation
        const receiptPromise = waitForReceipt({
          client: createThirdwebClient({
            clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
          }),
          chain: baseSepolia,
          transactionHash: txResult.transactionHash
        });
        
        const confirmationTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Confirmación timeout - la transacción puede estar pendiente')), 60000)
        );
        
        try {
          receipt = await Promise.race([receiptPromise, confirmationTimeout]);
        } catch (confirmError) {
          console.warn('⚠️ Confirmation timeout, checking transaction status...');
          
          // 🚨 MOBILE FIX: Even if confirmation times out, the transaction might be successful
          // Provide helpful message and don't fail completely
          addNotification({
            type: 'warning',
            title: '⏳ Transacción procesándose',
            message: `Tu transacción (${txResult.transactionHash.slice(0, 10)}...) está siendo procesada. Puede tomar unos minutos en móvil.`,
            duration: 15000,
            action: {
              label: 'Ver en BaseScan',
              onClick: () => {
                window.open(`https://sepolia.basescan.org/tx/${txResult.transactionHash}`, '_blank');
              }
            }
          });
          
          // Don't completely fail - set a warning state instead
          console.log('📱 Setting transaction as pending due to confirmation timeout');
          setError(`Transacción enviada (${txResult.transactionHash.slice(0, 10)}...) pero confirmación pendiente. 
                   Verifica en tu wallet o en BaseScan en unos minutos.`);
          setClaimStep('password'); // Return to password step but with pending message
          
          // Still call success callback with transaction hash for potential recovery
          if (onClaimSuccess) {
            onClaimSuccess(txResult.transactionHash, validationResult.giftInfo);
          }
          
          return; // Exit gracefully instead of throwing
        }
      } else {
        receipt = await waitForReceipt({
          client: createThirdwebClient({
            clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
          }),
          chain: baseSepolia,
          transactionHash: txResult.transactionHash
        });
      }

      if (receipt.status !== 'success') {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      console.log('✅ FRONTEND CLAIM SUCCESS:', {
        txHash: txResult.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });
      
      // 🔥 MOBILE FIX: Update metadata in Redis after successful frontend claim
      // This was missing and causing placeholders to be served
      try {
        console.log('📱 Updating metadata in Redis after frontend claim...');
        const updateResponse = await makeAuthenticatedRequest('/api/nft/update-metadata-after-claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tokenId,
            contractAddress: giftInfo?.nftContract || process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
            claimerAddress: account.address,
            transactionHash: txResult.transactionHash,
            giftMessage: validationResult.giftInfo?.giftMessage || '',
            imageUrl: nftMetadata?.image || ''
          })
        });
        
        if (updateResponse.ok) {
          console.log('✅ Metadata updated in Redis successfully');
        } else {
          console.warn('⚠️ Failed to update metadata in Redis:', await updateResponse.text());
        }
      } catch (updateError) {
        console.error('❌ Error updating metadata in Redis:', updateError);
        // Don't fail the claim, just log the error
      }
      
      // Mobile redirect popup disabled - no reset needed
      setClaimStep('success');

    } catch (err: any) {
      console.error('❌ FRONTEND CLAIM ERROR:', err);
      
      // 📱 MOBILE: Enhanced error handling for RPC issues
      let errorMessage: string;
      
      // 🚨 MOBILE FIX: Better error handling for post-signature issues
      if (err?.message?.includes('Transaction timeout después de reintentar')) {
        console.error('📱 Mobile transaction timeout after retry detected');
        
        errorMessage = `⏳ Tu transacción puede estar procesándose en segundo plano.
        
Por favor:
1. Verifica tu wallet para confirmar si la transacción aparece
2. Espera 2-3 minutos y recarga la página
3. Si el regalo sigue disponible, intenta de nuevo
4. Si ya no aparece, ¡fue exitoso!

La transacción puede tomar más tiempo en móvil.`;

        addNotification({
          type: 'info',
          title: '⏳ Transacción puede estar pendiente',
          message: 'Verifica tu wallet o espera unos minutos',
          duration: 15000,
          action: {
            label: 'Ver en BaseScan',
            onClick: () => {
              window.open(`https://sepolia.basescan.org/address/${account?.address}`, '_blank');
            }
          }
        });
      } else if (err?.code === -32603 || err?.message?.includes('Internal JSON-RPC error')) {
        console.error('📱 Internal JSON-RPC error detected:', err);
        
        // Log full error details for debugging
        console.error('Full error details:', {
          code: err.code,
          message: err.message,
          data: err.data,
          stack: err.stack
        });
        
        // Check if it's a network/chain issue
        if (isMobile) {
          // More specific error messages based on error details
          if (err.message?.includes('User rejected') || err.message?.includes('User denied')) {
            errorMessage = 'Transacción rechazada. Por favor acepta la transacción en MetaMask.';
          } else if (err.message?.includes('insufficient funds')) {
            errorMessage = 'Fondos insuficientes para pagar el gas. Necesitas ETH en Base Sepolia.';
          } else if (err.message?.includes('nonce')) {
            errorMessage = 'Error de sincronización. Por favor:\n1. Abre MetaMask\n2. Ve a Configuración > Avanzado\n3. Presiona "Restablecer cuenta"\n4. Intenta de nuevo';
          } else {
            errorMessage = 'Error de conexión. Por favor:\n1. Verifica estar en Base Sepolia\n2. Cierra y abre MetaMask completamente\n3. Espera 10 segundos\n4. Intenta de nuevo';
          
            // Try to add more context
            addNotification({
              type: 'warning',
              title: '⚠️ Error de red detectado',
              message: 'Cambia a Base Sepolia en tu wallet',
              duration: 10000,
              action: {
                label: 'Ver instrucciones',
                onClick: () => {
                  window.open('https://docs.base.org/network-information/', '_blank');
                }
              }
            });
          }
        } else {
          errorMessage = 'Error interno del wallet. Por favor recarga la página e intenta de nuevo.';
        }
      } else if (isMobile && isRpcError(err)) {
        console.error('📱 Mobile RPC error detected:', err.message);
        errorMessage = `Error móvil: ${err.message}. Verifica tu conexión.`;
      } else {
        errorMessage = parseEscrowError(err);
      }
      
      setError(errorMessage);
      // Mobile redirect popup disabled - no reset needed
      setClaimStep('password');
      
      if (onClaimError) {
        onClaimError(errorMessage);
      }
      
      throw err; // Re-throw to prevent finally block execution
    } finally {
      // 🎯 CRITICAL: Always try to add NFT to wallet, with enhanced mobile support
      if (txResult && validationResult && typeof window !== 'undefined' && window.ethereum) {
        console.log('📱 [POST-CLAIM] Enhanced wallet NFT visibility process starting...');
        
        const contractAddress = giftInfo?.nftContract || validationResult.giftInfo?.nftContract;
        
        if (contractAddress) {
          try {
            // Step 1: Pre-pin tokenURI metadata to IPFS for faster loading
            console.log('📌 [POST-CLAIM] Pre-pinning tokenURI metadata...');
            const metadataUrl = `${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || '')}/api/nft-metadata/${contractAddress}/${tokenId}`;
            
            // R2 FIX: Fetch and cache metadata with response validation
            const metadataResponse = await fetch(metadataUrl);
            
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              console.log('✅ [POST-CLAIM] Metadata pre-cached:', metadata);
            }
            
            // Step 2: Add delay for transaction to be fully processed
            // REMOVED wallet_requestPermissions - was causing duplicate connection prompt
            if (isMobile) {
              console.log('📱 [POST-CLAIM] Mobile detected - waiting for transaction to settle...');
              // Mobile wallets need more time to process the transaction
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              // Desktop also benefits from a small delay
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Step 3: Add NFT to wallet - Enhanced for mobile
            console.log('🎯 [POST-CLAIM] Adding NFT to wallet...', { contractAddress, tokenId, isMobile });
            
            const watchResult = await window.ethereum.request({
              method: 'wallet_watchAsset',
              params: [{
                type: 'ERC721',
                options: {
                  address: contractAddress,
                  tokenId: tokenId.toString(), // Ensure it's a string without leading zeros
                }
              }]
            });
            
            console.log('✅ [POST-CLAIM] wallet_watchAsset result:', watchResult);
            
            // 📱 MOBILE-SPECIFIC: Enhanced success notification with instructions
            if (isMobile) {
              addNotification({
                type: 'success',
                title: '🎉 NFT añadido exitosamente',
                message: 'Ve a tu wallet → Sección NFTs. Puede tomar 1-2 minutos aparecer.',
                duration: 8000,
                action: {
                  label: 'Abrir MetaMask',
                  onClick: () => {
                    // Try to open MetaMask mobile app
                    const deeplink = `metamask://`;
                    window.location.href = deeplink;
                  }
                }
              });
            } else {
              addNotification({
                type: 'success',
                title: '🦊 NFT añadido a MetaMask',
                message: 'Tu NFT debería aparecer en MetaMask en menos de 30 segundos',
                duration: 5000
              });
            }
            
          } catch (watchError: any) {
            console.log('⚠️ [POST-CLAIM] Wallet enhancement failed:', watchError);
            console.log('⚠️ [POST-CLAIM] Error details:', {
              code: watchError.code,
              message: watchError.message,
              isMobile,
              contractAddress,
              tokenId
            });
            
            // Handle the "r is undefined" error specifically
            if (watchError.code === -32603 || watchError.message?.includes('r is undefined')) {
              // This is a known MetaMask bug - NFT was claimed successfully
              console.log('📱 MetaMask watchAsset bug detected, NFT claimed successfully');
              addNotification({
                type: 'success',
                title: '✅ NFT reclamado exitosamente',
                message: 'El NFT está en tu wallet. Actualiza MetaMask si no aparece.',
                duration: 8000,
                action: {
                  label: 'Ver en BaseScan',
                  onClick: () => {
                    window.open(`https://sepolia.basescan.org/token/${contractAddress}?a=${account?.address}`, '_blank');
                  }
                }
              });
            } else if (watchError.code === 4001 || watchError.message?.includes('denied')) {
              // User denied - still show success since claim worked
              addNotification({
                type: 'info',
                title: '✅ NFT reclamado',
                message: `NFT #${tokenId} transferido exitosamente a tu wallet`,
                duration: 8000,
                action: {
                  label: 'Ver transacción',
                  onClick: () => {
                    if (txResult?.transactionHash) {
                      window.open(`https://sepolia.basescan.org/tx/${txResult.transactionHash}`, '_blank');
                    }
                  }
                }
              });
            } else {
              // Generic success message for mobile failures
              if (isMobile) {
                addNotification({
                  type: 'info',
                  title: '🎁 NFT reclamado exitosamente',
                  message: `Ve a tu wallet → NFTs → Buscar por ID: ${tokenId}`,
                  duration: 8000,
                  action: {
                    label: 'Copiar ID',
                    onClick: () => {
                      navigator.clipboard.writeText(tokenId);
                      addNotification({
                        type: 'info',
                        title: '📋 ID Copiado',
                        message: `Token ID: ${tokenId}`,
                        duration: 3000
                      });
                    }
                  }
                });
              } else {
                addNotification({
                  type: 'info',
                  title: '💡 NFT reclamado exitosamente',
                  message: 'Puede tomar unos minutos aparecer en MetaMask',
                  duration: 5000
                });
              }
            }
          }
        }
      }
      
      // Notify parent component of successful claim - MOVED TO FINALLY BLOCK
      if (txResult && onClaimSuccess) {
        onClaimSuccess(txResult.transactionHash, {
          tokenId,
          recipientAddress: account.address, // NFT goes to connected wallet
          giftInfo: validationResult.giftInfo,
          gasless: false, // Frontend execution is always gas-paid by user
          frontendExecution: true
        });
      }
      
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
            {/* 🌐 NETWORK OPTIMIZATION: Opcional y no intrusivo - solo post-auth en claim */}
            {typeof window !== 'undefined' && (
              <div className="mb-4">
                <button
                  onClick={async () => {
                    try {
                      if (window.ethereum) {
                        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                        const currentChainId = parseInt(chainId, 16);
                        const requiredChainId = 84532; // Base Sepolia
                        
                        if (currentChainId !== requiredChainId) {
                          setShowNetworkPrompt(true);
                        } else {
                          addNotification({
                            type: 'success',
                            title: '✅ Red Óptima',
                            message: 'Ya estás en Base Sepolia - configuración perfecta!',
                            duration: 3000
                          });
                        }
                      } else {
                        // No wallet detected - show prompt anyway for educational purposes
                        setShowNetworkPrompt(true);
                        addNotification({
                          type: 'info',
                          title: '🦊 Wallet requerida',
                          message: 'Para optimizar tu experiencia, conecta una wallet como MetaMask',
                          duration: 5000
                        });
                      }
                    } catch (error) {
                      console.log('Network check failed:', error);
                      // Show prompt anyway for educational purposes
                      setShowNetworkPrompt(true);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                      <span className="text-xl">✨</span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-blue-800 dark:text-blue-300">🌐 Optimización Opcional</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Configura tu wallet para mejor experiencia NFT (v2.0)</p>
                    </div>
                  </div>
                  <div className="text-blue-500 group-hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            )}

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

            {/* 📱 MOBILE FIX: Status check button for timeout scenarios */}
            {error && error.includes('procesándose') && account && (
              <button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    console.log('🔍 Checking transaction status manually...');
                    
                    // Check if gift was actually claimed
                    const response = await fetch(`/api/gift-info/${tokenId}`);
                    const data = await response.json();
                    
                    if (data.success && data.gift?.status === 'claimed') {
                      console.log('✅ Gift was successfully claimed!');
                      setError('');
                      setClaimStep('success');
                      
                      addNotification({
                        type: 'success',
                        title: '🎉 ¡Regalo Reclamado!',
                        message: 'Tu transacción fue exitosa. El NFT está en tu wallet.',
                        duration: 8000
                      });
                      
                      if (onClaimSuccess) {
                        onClaimSuccess('verified', data.gift);
                      }
                    } else {
                      // Still not claimed, user can try again
                      addNotification({
                        type: 'info',
                        title: 'Aún no reclamado',
                        message: 'El regalo sigue disponible. Puedes intentar de nuevo.',
                        duration: 5000
                      });
                      setError('');
                    }
                  } catch (checkError) {
                    console.error('Error checking status:', checkError);
                    addNotification({
                      type: 'error',
                      title: 'Error de verificación',
                      message: 'No se pudo verificar el estado. Intenta recargar la página.',
                      duration: 5000
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium mt-2"
              >
                {isLoading ? 'Verificando...' : '🔍 Verificar Estado del Regalo'}
              </button>
            )}

            {!account && giftInfo?.status !== 'claimed' && giftInfo?.status !== 'returned' && !giftInfo?.isExpired && (
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

      {/* Mobile Wallet Redirect Popup DISABLED - ConnectAndAuthButton handles all mobile UX */}

      {/* Network Optimization Prompt - Opcional y no intrusivo */}
      <NetworkOptimizationPrompt
        isOpen={showNetworkPrompt}
        onClose={() => setShowNetworkPrompt(false)}
        currentChainId={84532}
        requiredChainId={84532} // Base Sepolia
        context="claim"
      />
    </div>
  );
};