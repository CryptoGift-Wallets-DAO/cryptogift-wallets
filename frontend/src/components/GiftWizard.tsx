"use client";

import React, { useState, useEffect } from 'react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { client } from '../app/client';
import { ImageUpload } from './ImageUpload';
import { FilterSelector } from './FilterSelector';
import { AmountSelector } from './AmountSelector';
import { GiftSummary } from './GiftSummary';
import { QRShare } from './QRShare';
import { GiftEscrowConfig, type EscrowConfig } from './escrow/GiftEscrowConfig';
import { CREATION_FEE_PERCENT, generateNeutralGiftAddress } from '../lib/constants';
import { CryptoGiftError, ErrorType, parseApiError, logError } from '../lib/errorHandler';
import { ErrorModal } from './ErrorModal';
import { GasEstimationModal } from './GasEstimationModal';
import { startTrace, addStep, addDecision, addError, finishTrace } from '../lib/flowTracker';
import { storeNFTMetadataClient, getNFTMetadataClient, NFTMetadata, getDeviceWalletInfo } from '../lib/clientMetadataStore';
import { DeviceLimitModal } from './DeviceLimitModal';
import { getAuthState, isAuthValid, makeAuthenticatedRequest, clearAuth } from '../lib/siweClient';
import { useAuth } from '../hooks/useAuth';
import { ConnectAndAuthButton } from './ConnectAndAuthButton';

// Image compression utility to prevent HTTP 413 errors
async function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 2048px)
      const maxDimension = 2048;
      let { width, height } = img;
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

interface GiftWizardProps {
  isOpen: boolean;
  onClose: () => void;
  referrer: string | null;
}

enum WizardStep {
  CONNECT = 'connect',
  UPLOAD = 'upload',
  FILTER = 'filter',
  AMOUNT = 'amount',
  ESCROW = 'escrow',
  SUMMARY = 'summary',
  MINTING = 'minting',
  SUCCESS = 'success'
}

// IPFS Validation Retry Logic
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    shouldRetry?: (error: any) => boolean;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 2000, // 2 seconds
    shouldRetry = (error) => error.message?.includes('IPFS_VALIDATION_FAILED'),
    onRetry = () => {}
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries + 1 || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(1.5, attempt - 1); // Progressive backoff: 2s, 3s, 4.5s
      
      onRetry(attempt, error);
      
      console.log(`🔄 IPFS validation failed, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

export const GiftWizard: React.FC<GiftWizardProps> = ({ isOpen, onClose, referrer }) => {
  const [mounted, setMounted] = useState(false);
  const account = useActiveAccount();
  const auth = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.CONNECT);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && auth.isConnected) {
      // CRITICAL: Check device wallet limits when user connects
      const deviceInfo = getDeviceWalletInfo();
      console.log('DEVICE_CHECK: Device wallet check:', deviceInfo);
      
      if (!deviceInfo.allowed && !deviceInfo.registeredWallets.includes(account.address.toLowerCase())) {
        console.warn('WARNING: Device wallet limit exceeded for new wallet:', account.address.slice(0, 10) + '...');
        setShowDeviceLimitModal(true);
        return;
      }
      
      // Only move to UPLOAD if authenticated
      if (auth.isAuthenticated) {
        setCurrentStep(WizardStep.UPLOAD);
      } else {
        setCurrentStep(WizardStep.CONNECT);
      }
    } else if (mounted) {
      setCurrentStep(WizardStep.CONNECT);
    }
  }, [mounted, auth.isConnected, auth.isAuthenticated, account?.address]);
  
  const [wizardData, setWizardData] = useState({
    imageFile: null as File | null,
    imageUrl: '',
    filteredImageUrl: '',
    selectedFilter: '',
    amount: 50,
    recipientEmail: '',
    message: '',
    nftTokenId: null as string | null, // Enhanced numeric string
    shareUrl: '',
    qrCode: '',
    wasGasless: false,
    escrowConfig: null as EscrowConfig | null,
    imageCid: '' // NEW: Store image CID for wallet_watchAsset
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CryptoGiftError | Error | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showGasModal, setShowGasModal] = useState(false);
  const [showDeviceLimitModal, setShowDeviceLimitModal] = useState(false);
  const [gasEstimation, setGasEstimation] = useState({
    estimatedGas: '21000',
    gasPrice: '0.1',
    totalCost: '0.0021',
    networkName: 'Base Sepolia'
  });

  // Calculate fees
  const creationFee = (wizardData.amount * CREATION_FEE_PERCENT) / 100;
  const referralFee = creationFee / 2;
  const platformFee = creationFee / 2;
  const netAmount = wizardData.amount - creationFee;

  const handleNext = () => {
    const steps = Object.values(WizardStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps = Object.values(WizardStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };


  const handleImageUpload = (file: File, url: string) => {
    setWizardData(prev => ({ ...prev, imageFile: file, imageUrl: url }));
    handleNext();
  };

  const handleFilterSelect = (filteredUrl: string, filterName: string) => {
    setWizardData(prev => ({ 
      ...prev, 
      filteredImageUrl: filteredUrl, 
      selectedFilter: filterName 
    }));
    handleNext();
  };

  const handleAmountSelect = (amount: number) => {
    setWizardData(prev => ({ ...prev, amount }));
    handleNext();
  };

  const handleEscrowConfig = (config: EscrowConfig) => {
    setWizardData(prev => ({ ...prev, escrowConfig: config }));
    handleNext();
  };

  const handleSkipEscrow = () => {
    setWizardData(prev => ({ ...prev, escrowConfig: null }));
    handleNext();
  };

  const handleMintGift = async () => {
    if (!account) {
      addError('GIFT_WIZARD', 'HANDLE_MINT_GIFT', 'No account connected');
      return;
    }

    // Check authentication before proceeding
    if (!auth.isAuthenticated) {
      console.log('WARNING: Authentication required before minting');
      setError(new CryptoGiftError(
        ErrorType.API_KEY,
        'Please connect and authenticate your wallet first',
        {
          code: 'AUTHENTICATION_REQUIRED',
          userMessage: 'Authentication Required'
        }
      ));
      setCurrentStep(WizardStep.CONNECT);
      return;
    }
    
    // Start flow trace
    const traceId = startTrace(account.address, {
      amount: wizardData.amount,
      filter: wizardData.selectedFilter,
      referrer
    });
    
    addStep('GIFT_WIZARD', 'MINT_GIFT_STARTED', {
      traceId,
      walletAddress: account.address,
      amount: wizardData.amount,
      netAmount,
      referrer
    }, 'pending');
    
    setCurrentStep(WizardStep.MINTING);
    setIsLoading(true);
    setError(null);
    
    addStep('GIFT_WIZARD', 'WIZARD_STATE_SET', {
      currentStep: 'MINTING',
      isLoading: true
    }, 'success');
    
    // CRITICAL FIX: Check if gasless is actually enabled before attempting
    console.log('CHECK: Is gasless actually enabled on backend?');
    
    try {
      // First check if gasless is available from backend
      const gaslessStatusResponse = await fetch('/api/gasless-status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const gaslessStatus = await gaslessStatusResponse.json();
      console.log('STATUS: Backend gasless status:', gaslessStatus);
      
      if (!gaslessStatus.enabled || gaslessStatus.temporarilyDisabled) {
        console.log('WARNING: GASLESS DISABLED: Skipping gasless attempt, going directly to gas modal');
        
        addStep('GIFT_WIZARD', 'GASLESS_DISABLED_SKIP', {
          reason: gaslessStatus.reason || 'Gasless temporarily disabled',
          status: gaslessStatus.status
        }, 'pending');
        
        // Skip gasless entirely and go to gas modal
        throw new Error(`Gasless transactions are ${gaslessStatus.temporarilyDisabled ? 'temporarily disabled' : 'not available'}: ${gaslessStatus.reason || 'Backend configuration'}`);
      }
      
      // STEP 1: Try GASLESS only if enabled
      addStep('GIFT_WIZARD', 'GASLESS_ATTEMPT_DECISION', {
        strategy: 'GASLESS_FIRST',
        reason: 'Gasless confirmed enabled on backend'
      }, 'pending');
      
      console.log('🔄 Attempting GASLESS (confirmed enabled)...');
      await attemptGaslessMint();
    } catch (gaslessError) {
      console.log('ERROR: Gasless attempt reported failure:', gaslessError);
      
      // CRITICAL: Check if gasless actually succeeded despite error report
      console.log('VERIFY: Checking if gasless actually succeeded on-chain...');
      
      try {
        const deployerAccount = account?.address; // This should be the deployer address
        const gaslessVerification = await import('../lib/gaslessValidation').then(
          mod => mod.checkGaslessTransactionActuallySucceeded(deployerAccount!)
        );
        
        if (gaslessVerification.found && gaslessVerification.transactionHash && gaslessVerification.tokenId) {
          console.log('SUCCESS: GASLESS ACTUALLY SUCCEEDED! Found transaction:', gaslessVerification);
          
          // Treat as successful gasless transaction
          setWizardData(prev => ({ 
            ...prev, 
            nftTokenId: gaslessVerification.tokenId!,
            shareUrl: `${window.location.origin}/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}/${gaslessVerification.tokenId}`,
            qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
              `${window.location.origin}/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}/${gaslessVerification.tokenId}`
            )}`,
            wasGasless: true
          }));
          
          setCurrentStep(WizardStep.SUCCESS);
          setIsLoading(false);
          
          // R2: FORCE METAMASK NFT REFRESH - Make newly minted NFT visible immediately
          if (typeof window !== 'undefined' && window.ethereum && gaslessVerification.tokenId) {
            console.log('📱 Forcing MetaMask NFT refresh for newly minted NFT...');
            
            try {
              // 🔥 NEW: Enhanced wallet_watchAsset with HTTPS image + symbol/decimals
              const contractAddress = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS;
              if (contractAddress) {
                // Get the HTTPS image URL from wizard data
                let imageHttpsUrl = '';
                if (wizardData.imageCid) {
                  // Convert IPFS CID to HTTPS URL for wallet compatibility
                  imageHttpsUrl = `https://cloudflare-ipfs.com/ipfs/${wizardData.imageCid}`;
                } else if (wizardData.imageUrl && wizardData.imageUrl.startsWith('http')) {
                  imageHttpsUrl = wizardData.imageUrl;
                }
                
                console.log('🖼️ Adding NFT to wallet with enhanced metadata:', {
                  contractAddress,
                  tokenId: gaslessVerification.tokenId,
                  imageUrl: imageHttpsUrl?.substring(0, 50) + '...'
                });
                
                await window.ethereum.request({
                  method: 'wallet_watchAsset',
                  params: [{
                    type: 'ERC721',
                    options: {
                      address: contractAddress,
                      tokenId: gaslessVerification.tokenId,
                      image: imageHttpsUrl, // 🔥 HTTPS image for wallet display
                      symbol: 'CGIFT',      // 🔥 Symbol for the NFT collection
                      decimals: 0,          // 🔥 NFTs have 0 decimals
                    }
                  }]
                });
                
                console.log('✅ Enhanced wallet_watchAsset completed with image and metadata');
              }
              
              // Method 2: Request account refresh (forces NFT cache update)
              await window.ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }]
              });
              
              console.log('✅ MetaMask NFT refresh completed for minted NFT');
            } catch (refreshError) {
              console.log('⚠️ MetaMask refresh failed (not critical):', refreshError);
              // 🔥 NEW: Enhanced error logging for wallet_watchAsset debugging
              if (refreshError instanceof Error) {
                console.log('🚨 wallet_watchAsset error details:', {
                  message: refreshError.message,
                  name: refreshError.name
                });
              }
            }
          }
          
          addStep('GIFT_WIZARD', 'GASLESS_RECOVERY_SUCCESS', {
            tokenId: gaslessVerification.tokenId,
            transactionHash: gaslessVerification.transactionHash,
            recoveryMethod: 'blockchain_verification'
          }, 'success');
          
          return; // Exit early - gasless actually worked!
        }
      } catch (verificationError) {
        console.warn('⚠️ Gasless verification check failed:', verificationError);
      }
      
      addError('GIFT_WIZARD', 'GASLESS_ATTEMPT_FAILED', gaslessError, {
        errorType: 'GASLESS_FAILURE',
        willShowGasModal: true
      });
      
      console.log('❌ Gasless truly failed, showing gas estimation modal');
      
      addDecision('GIFT_WIZARD', 'gaslessFailed', true, {
        nextAction: 'SHOW_GAS_MODAL',
        errorMessage: gaslessError instanceof Error ? gaslessError.message : gaslessError
      });
      
      // If gasless truly fails, THEN show gas modal
      setIsLoading(false);
      setCurrentStep(WizardStep.SUMMARY);
      
      // Estimate gas for fallback
      const estimatedGas = "150000";
      const gasPrice = "0.1";
      const totalCost = (parseInt(estimatedGas) * parseFloat(gasPrice) * 1e-9).toFixed(6);
      
      setGasEstimation({
        estimatedGas,
        gasPrice,
        totalCost,
        networkName: 'Base Sepolia'
      });
      
      addStep('GIFT_WIZARD', 'GAS_MODAL_SHOWN', {
        estimatedGas,
        gasPrice,
        totalCost,
        networkName: 'Base Sepolia'
      }, 'success');
      
      setShowGasModal(true);
    }
  };
  
  const attemptGaslessMint = async () => {
    addStep('GIFT_WIZARD', 'GASLESS_MINT_STARTED', {
      walletAddress: account?.address,
      imageFile: !!wizardData.imageFile,
      message: wizardData.message || 'default',
      amount: netAmount
    }, 'pending');

    // Step 1: Compress image if needed to prevent 413 errors
    let imageFileToUpload = wizardData.imageFile!;
    const originalSize = imageFileToUpload.size;
    
    if (originalSize > 2 * 1024 * 1024) { // 2MB threshold
      addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_STARTED', {
        originalSize,
        threshold: '2MB'
      }, 'pending');
      
      try {
        imageFileToUpload = await compressImage(imageFileToUpload, 0.8); // 80% quality
        addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_SUCCESS', {
          originalSize,
          compressedSize: imageFileToUpload.size,
          compressionRatio: Math.round((1 - imageFileToUpload.size / originalSize) * 100)
        }, 'success');
      } catch (compressionError) {
        addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_FAILED', {
          error: compressionError.message,
          usingOriginal: true
        }, 'pending'); // Continue with original
      }
    }

    // Step 2: Upload image to IPFS
    addStep('GIFT_WIZARD', 'IPFS_UPLOAD_STARTED', {
      hasImageFile: !!imageFileToUpload,
      hasFilteredUrl: !!wizardData.filteredImageUrl,
      finalImageSize: imageFileToUpload.size
    }, 'pending');

    const formData = new FormData();
    formData.append('file', imageFileToUpload);
    formData.append('filteredUrl', wizardData.filteredImageUrl);
    
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      addError('GIFT_WIZARD', 'IPFS_UPLOAD_FAILED', `Upload failed with status ${uploadResponse.status}`);
      throw new Error('Upload failed');
    }

    const { ipfsCid, imageIpfsCid } = await uploadResponse.json();
    addStep('GIFT_WIZARD', 'IPFS_UPLOAD_SUCCESS', { 
      metadataCid: ipfsCid, 
      imageCid: imageIpfsCid,
      // Use imageIpfsCid if available (filtered images), fallback to ipfsCid (original images)
      actualImageCid: imageIpfsCid || ipfsCid
    }, 'success');

    // Determine correct image CID to use (prioritize actual image over metadata)
    const actualImageCid = imageIpfsCid || ipfsCid;
    
    // 🔥 NEW: Store image CID in wizard data for wallet_watchAsset
    setWizardData(prev => ({ ...prev, imageCid: actualImageCid }));
    
    // Step 3: Always use mint-escrow API (handles both escrow and direct mint)
    const isEscrowEnabled = wizardData.escrowConfig?.enabled;
    const apiEndpoint = '/api/mint-escrow';
    
    addStep('GIFT_WIZARD', 'API_CALL_STARTED', {
      endpoint: apiEndpoint,
      escrowEnabled: isEscrowEnabled,
      to: account?.address,
      imageFile: actualImageCid,
      initialBalance: netAmount,
      filter: wizardData.selectedFilter || 'Original'
    }, 'pending');

    // CRITICAL FIX: Use metadata CID (ipfsCid) not image CID for metadataUri
    // metadataUri should point to JSON metadata file, not the image directly
    // 🚨 DOUBLE PREFIX FIX: Handle cases where ipfsCid already has ipfs:// prefix
    const cleanMetadataUri = ipfsCid.startsWith('ipfs://') ? ipfsCid : `ipfs://${ipfsCid}`;
    
    const requestBody = isEscrowEnabled ? {
      metadataUri: cleanMetadataUri,
      recipientAddress: wizardData.escrowConfig?.recipientAddress || undefined,
      password: wizardData.escrowConfig?.password!,
      timeframeDays: wizardData.escrowConfig?.timeframe!,
      giftMessage: wizardData.escrowConfig?.giftMessage!,
      creatorAddress: account?.address,
      gasless: false, // DISABLED: Focus on gas-paid robustness per specialist analysis
      educationModules: wizardData.escrowConfig?.educationRequired ? wizardData.escrowConfig.educationModules : undefined
    } : {
      // Direct mint (skip escrow) - use metadata CID not image CID
      metadataUri: cleanMetadataUri,
      // No password = direct mint
      giftMessage: wizardData.message || 'Un regalo cripto único creado con amor',
      creatorAddress: account?.address,
      gasless: false // DISABLED: Focus on gas-paid robustness per specialist analysis
    };

    // ✨ ENHANCED: Wrap API call with IPFS validation retry logic
    const mintResponse = await retryWithBackoff(
      async () => {
        const response = await makeAuthenticatedRequest(apiEndpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
        });
        
        // Check for IPFS validation errors in API response
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error?.includes('IPFS_VALIDATION_FAILED') && errorData.retryable) {
            throw new Error(errorData.error);
          }
          // For non-IPFS errors, throw immediately without retry
          throw new Error(errorData.message || errorData.error || 'API call failed');
        }
        
        return response;
      },
      {
        maxRetries: 2, // 2 retries = 3 total attempts  
        baseDelay: 4000, // 4 seconds initial delay (matches server retry timing)
        shouldRetry: (error) => error.message?.includes('IPFS_VALIDATION_FAILED'),
        onRetry: (attempt, error) => {
          addStep('GIFT_WIZARD', 'IPFS_RETRY_ATTEMPT', {
            attempt,
            totalRetries: 2,
            errorMessage: error.message?.substring(0, 100) + '...',
            nextRetryIn: `${4000 * Math.pow(1.5, attempt - 1)}ms`,
            reason: 'IPFS propagation delay detected'
          }, 'pending');
        }
      }
    );

    addStep('GIFT_WIZARD', 'GASLESS_API_RESPONSE_RECEIVED', {
      status: mintResponse.status,
      statusText: mintResponse.statusText,
      ok: mintResponse.ok
    }, 'success'); // Already validated as ok by retry wrapper

    const mintResult = await mintResponse.json();
    
    // Handle different response formats for escrow vs regular minting
    const tokenId = mintResult.tokenId;
    const shareUrl = mintResult.shareUrl || mintResult.giftLink;
    const qrCode = mintResult.qrCode;
    const gasless = mintResult.gasless;
    const message = mintResult.message;
    const escrowTransactionHash = mintResult.escrowTransactionHash;
    const nonce = mintResult.nonce;
    const isDirectMint = mintResult.directMint;
    
    addStep('GIFT_WIZARD', 'API_RESPONSE_PARSED', {
      tokenId,
      hasShareUrl: !!shareUrl,
      hasQrCode: !!qrCode,
      gasless,
      message,
      isEscrow: isEscrowEnabled,
      isDirectMint: isDirectMint,
      escrowTransactionHash,
      nonce: nonce?.slice(0, 10) + '...',
      fullResponse: mintResult
    }, 'success');
    
    // Store NFT metadata on client for future retrieval
    try {
      console.log('💾 Storing NFT metadata on client...');
      console.log('🔍 Contract address:', process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
      console.log('🔍 Token ID:', tokenId);
      console.log('🔍 IPFS CID:', ipfsCid);
      
      const nftMetadata: NFTMetadata = {
        contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '',
        tokenId: tokenId,
        name: `CryptoGift NFT-Wallet #${tokenId}`,
        description: wizardData.message || 'Un regalo cripto único creado con amor',
        image: `ipfs://${actualImageCid}`,
        imageIpfsCid: actualImageCid,
        attributes: [
          {
            trait_type: "Initial Balance",
            value: `${netAmount} USDC`
          },
          {
            trait_type: "Filter",
            value: wizardData.selectedFilter || "Original"
          },
          {
            trait_type: "Creation Date",
            value: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        mintTransactionHash: mintResult.transactionHash,
        owner: account?.address
      };
      
      console.log('📦 Metadata to store:', nftMetadata);
      
      // CRITICAL: Store with wallet address for proper scoping
      if (account?.address) {
        storeNFTMetadataClient(nftMetadata, account.address);
        console.log('✅ NFT metadata stored on client with wallet scope:', account.address.slice(0, 10) + '...');
        
        // Verify it was stored with wallet scope
        const storedCheck = getNFTMetadataClient(nftMetadata.contractAddress, nftMetadata.tokenId, account.address);
        console.log('🔍 Verification check:', storedCheck);
      } else {
        console.warn('⚠️ No wallet address available for scoped storage');
      }
    } catch (metadataError) {
      console.error('⚠️ Failed to store NFT metadata on client:', metadataError);
    }
    
    // CRITICAL DECISION POINT: Was it actually gasless?
    addDecision('GIFT_WIZARD', 'isTransactionGasless', gasless, {
      tokenId,
      message,
      apiSaysGasless: gasless
    });
    
    // Only proceed if it was actually gasless
    if (!gasless) {
      addError('GIFT_WIZARD', 'TRANSACTION_NOT_GASLESS', 'API returned gasless=false', {
        tokenId,
        message,
        gaslessValue: gasless
      });
      throw new Error('Transaction was not gasless');
    }
    
    addStep('GIFT_WIZARD', 'GASLESS_SUCCESS_CONFIRMED', {
      tokenId,
      shareUrl,
      qrCode
    }, 'success');
    
    setWizardData(prev => ({ 
      ...prev, 
      nftTokenId: tokenId,
      shareUrl,
      qrCode,
      wasGasless: true,
      message: isDirectMint ? message : prev.message // Store direct mint message
    }));
    
    addStep('GIFT_WIZARD', 'WIZARD_DATA_UPDATED', {
      tokenId,
      wasGasless: true
    }, 'success');
    
    // 🔥 NEW: Enhanced wallet_watchAsset for gasless mints
    if (typeof window !== 'undefined' && window.ethereum && tokenId) {
      console.log('📱 Adding gasless NFT to wallet with enhanced metadata...');
      
      try {
        const contractAddress = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS;
        if (contractAddress) {
          // Get the HTTPS image URL from wizard data
          let imageHttpsUrl = '';
          if (wizardData.imageCid) {
            imageHttpsUrl = `https://cloudflare-ipfs.com/ipfs/${wizardData.imageCid}`;
          } else if (wizardData.imageUrl && wizardData.imageUrl.startsWith('http')) {
            imageHttpsUrl = wizardData.imageUrl;
          }
          
          console.log('🖼️ Adding gasless NFT to wallet:', {
            contractAddress,
            tokenId,
            imageUrl: imageHttpsUrl?.substring(0, 50) + '...'
          });
          
          await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: [{
              type: 'ERC721',
              options: {
                address: contractAddress,
                tokenId: tokenId,
                image: imageHttpsUrl, // 🔥 HTTPS image for wallet display
                symbol: 'CGIFT',      // 🔥 Symbol for the NFT collection
                decimals: 0,          // 🔥 NFTs have 0 decimals
              }
            }]
          });
          
          console.log('✅ Enhanced wallet_watchAsset completed for gasless NFT');
        }
      } catch (walletError) {
        console.log('⚠️ wallet_watchAsset failed for gasless NFT (not critical):', walletError);
      }
    }
    
    setCurrentStep(WizardStep.SUCCESS);
    setIsLoading(false);
    
    finishTrace('success', {
      tokenId,
      wasGasless: true,
      finalStep: 'SUCCESS'
    });
    
    addStep('GIFT_WIZARD', 'GASLESS_FLOW_COMPLETED', {
      tokenId,
      currentStep: 'SUCCESS'
    }, 'success');
  };

  const handleGasConfirm = async () => {
    setShowGasModal(false);
    setCurrentStep(WizardStep.MINTING);
    setIsLoading(true);
    setError(null);

    // Log start of mint process to debug system
    try {
      await fetch('/api/debug/mint-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          step: 'GIFT_WIZARD_START',
          data: { walletAddress: account.address, timestamp: new Date().toISOString() }
        })
      });
    } catch (debugError) {
      console.warn('Debug logging failed:', debugError);
    }

    try {
      // Step 1: Compress image if needed to prevent 413 errors
      let imageFileToUpload = wizardData.imageFile!;
      const originalSize = imageFileToUpload.size;
      
      if (originalSize > 2 * 1024 * 1024) { // 2MB threshold
        addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_STARTED', {
          originalSize,
          threshold: '2MB'
        }, 'pending');
        
        try {
          imageFileToUpload = await compressImage(imageFileToUpload, 0.8); // 80% quality
          addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_SUCCESS', {
            originalSize,
            compressedSize: imageFileToUpload.size,
            compressionRatio: Math.round((1 - imageFileToUpload.size / originalSize) * 100)
          }, 'success');
        } catch (compressionError) {
          addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_FAILED', {
            error: compressionError.message,
            usingOriginal: true
          }, 'pending'); // Continue with original
        }
      }

      // Step 2: Upload image to IPFS
      const formData = new FormData();
      formData.append('file', imageFileToUpload);
      formData.append('filteredUrl', wizardData.filteredImageUrl);
      
      console.log('🔄 GAS PAID: Starting upload request...', {
        fileName: imageFileToUpload.name,
        fileSize: imageFileToUpload.size,
        fileType: imageFileToUpload.type,
        hasFilteredUrl: !!wizardData.filteredImageUrl
      });
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('📤 GAS PAID: Upload response received:', {
        status: uploadResponse.status,
        ok: uploadResponse.ok,
        statusText: uploadResponse.statusText,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with status ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      const { ipfsCid, imageIpfsCid } = uploadData;
      
      console.log('✅ GAS PAID: Upload successful, CIDs received:', {
        ipfsCid: ipfsCid?.substring(0, 20) + '...',
        imageIpfsCid: imageIpfsCid?.substring(0, 20) + '...',
        fullResponse: uploadData
      });
      
      // Determine correct image CID to use (prioritize actual image over metadata)
      const actualImageCid = imageIpfsCid || ipfsCid;

      // Step 2: Mint NFT with GAS PAYMENT (user confirmed to pay gas)
      // CRITICAL FIX: Use same logic as attemptGaslessMint but with gasless: false
      const isEscrowEnabled = wizardData.escrowConfig?.enabled;
      const apiEndpoint = '/api/mint-escrow'; // CORRECTED: Always use escrow API
      
      addStep('GIFT_WIZARD', 'GAS_PAID_MINT_STARTED', {
        endpoint: apiEndpoint,
        escrowEnabled: isEscrowEnabled,
        to: account?.address,
        imageFile: actualImageCid, // Use actual image CID instead of metadata CID
        initialBalance: netAmount,
        filter: wizardData.selectedFilter || 'Original'
      }, 'pending');

      // Prepare request body based on escrow configuration (same logic as gasless)
      // 🚨 CRITICAL FIX: Handle cases where ipfsCid already has ipfs:// prefix
      const cleanMetadataUri = ipfsCid.startsWith('ipfs://') ? ipfsCid : `ipfs://${ipfsCid}`;
      
      const requestBody = isEscrowEnabled ? {
        metadataUri: cleanMetadataUri,
        recipientAddress: wizardData.escrowConfig?.recipientAddress || undefined,
        password: wizardData.escrowConfig?.password!,
        timeframeDays: wizardData.escrowConfig?.timeframe!,
        giftMessage: wizardData.escrowConfig?.giftMessage!,
        creatorAddress: account?.address,
        gasless: false, // CRITICAL: Gas-paid fallback
        educationModules: wizardData.escrowConfig?.educationRequired ? wizardData.escrowConfig.educationModules : undefined
      } : {
        // Direct mint (skip escrow) - use mint-escrow API but without password
        metadataUri: cleanMetadataUri,
        // No password = direct mint
        giftMessage: wizardData.message || 'Un regalo cripto único creado con amor',
        creatorAddress: account?.address,
        gasless: false // CRITICAL: Gas-paid fallback
      };

      console.log('🚀 GAS PAID: Sending mint request with:', {
        apiEndpoint,
        metadataUri: requestBody.metadataUri,
        isEscrowEnabled,
        ipfsCidRaw: ipfsCid?.substring(0, 30) + '...',
        ipfsCidCleaned: cleanMetadataUri?.substring(0, 30) + '...',
        hadDoublePrefix: ipfsCid?.startsWith('ipfs://'),
        requestBodyKeys: Object.keys(requestBody)
      });

      // ✨ ENHANCED: Wrap gas-paid API call with IPFS validation retry logic
      const mintResponse = await retryWithBackoff(
        async () => {
          const response = await makeAuthenticatedRequest(apiEndpoint, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
          });
          
          // Check for IPFS validation errors in API response
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.error?.includes('IPFS_VALIDATION_FAILED') && errorData.retryable) {
              throw new Error(errorData.error);
            }
            // For non-IPFS errors, throw immediately without retry
            throw new Error(errorData.message || errorData.error || 'Gas-paid API call failed');
          }
          
          return response;
        },
        {
          maxRetries: 2, // 2 retries = 3 total attempts
          baseDelay: 4000, // 4 seconds initial delay (matches server retry timing)
          shouldRetry: (error) => error.message?.includes('IPFS_VALIDATION_FAILED'),
          onRetry: (attempt, error) => {
            addStep('GIFT_WIZARD', 'GAS_PAID_IPFS_RETRY_ATTEMPT', {
              attempt,
              totalRetries: 2,
              errorMessage: error.message?.substring(0, 100) + '...',
              nextRetryIn: `${4000 * Math.pow(1.5, attempt - 1)}ms`,
              reason: 'IPFS propagation delay detected (gas-paid flow)'
            }, 'pending');
          }
        }
      );

      addStep('GIFT_WIZARD', 'GAS_PAID_API_RESPONSE_RECEIVED', {
        status: mintResponse.status,
        statusText: mintResponse.statusText,
        ok: mintResponse.ok
      }, 'success'); // Already validated as ok by retry wrapper

      const mintResult = await mintResponse.json();
      
      // Handle different response formats for escrow vs regular minting (consistent with gasless)
      const tokenId = mintResult.tokenId;
      const shareUrl = mintResult.shareUrl || mintResult.giftLink;
      const qrCode = mintResult.qrCode;
      const gasless = mintResult.gasless;
      const message = mintResult.message;
      const escrowTransactionHash = mintResult.escrowTransactionHash;
      const nonce = mintResult.nonce;
      const isDirectMint = mintResult.directMint;
      
      addStep('GIFT_WIZARD', 'GAS_PAID_API_RESPONSE_PARSED', {
        tokenId,
        hasShareUrl: !!shareUrl,
        hasQrCode: !!qrCode,
        gasless, // Should be false for gas-paid transactions
        message,
        isEscrow: isEscrowEnabled,
        isDirectMint: isDirectMint,
        escrowTransactionHash,
        nonce: nonce?.slice(0, 10) + '...',
        fullResponse: mintResult
      }, 'success');
      
      // Store NFT metadata on client for future retrieval
      try {
        console.log('💾 Storing NFT metadata on client (gas-paid)...');
        console.log('🔍 Contract address (gas-paid):', process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
        console.log('🔍 Token ID (gas-paid):', tokenId);
        console.log('🔍 IPFS CID (gas-paid):', ipfsCid);
        
        const nftMetadata: NFTMetadata = {
          contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '',
          tokenId: tokenId,
          name: `CryptoGift NFT-Wallet #${tokenId}`,
          description: wizardData.message || 'Un regalo cripto único creado con amor',
          image: `ipfs://${actualImageCid}`,
          imageIpfsCid: actualImageCid,
          attributes: [
            {
              trait_type: "Initial Balance",
              value: `${netAmount} USDC`
            },
            {
              trait_type: "Filter",
              value: wizardData.selectedFilter || "Original"
            },
            {
              trait_type: "Creation Date",
              value: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString(),
          mintTransactionHash: mintResult.transactionHash,
          owner: account?.address
        };
        
        console.log('📦 Metadata to store (gas-paid):', nftMetadata);
        
        // CRITICAL: Store with wallet address for proper scoping
        if (account?.address) {
          storeNFTMetadataClient(nftMetadata, account.address);
          console.log('✅ NFT metadata stored on client (gas-paid) with wallet scope:', account.address.slice(0, 10) + '...');
        } else {
          console.warn('⚠️ No wallet address available for scoped storage (gas-paid)');
        }
        
        // Verify it was stored with wallet scope
        if (account?.address) {
          const storedCheck = getNFTMetadataClient(nftMetadata.contractAddress, nftMetadata.tokenId, account.address);
          console.log('🔍 Verification check (gas-paid):', storedCheck);
        }
      } catch (metadataError) {
        console.error('⚠️ Failed to store NFT metadata on client (gas-paid):', metadataError);
      }
      
      // CRITICAL DECISION POINT: Confirm this was a gas-paid transaction
      addDecision('GIFT_WIZARD', 'isTransactionGasPaid', !gasless, {
        tokenId,
        message,
        apiSaysGasless: gasless,
        expectedGasPaid: true
      });
      
      addStep('GIFT_WIZARD', 'GAS_PAID_SUCCESS_CONFIRMED', {
        tokenId,
        shareUrl,
        qrCode,
        userPaidGas: !gasless
      }, 'success');
      
      setWizardData(prev => ({ 
        ...prev, 
        nftTokenId: tokenId,
        shareUrl,
        qrCode,
        wasGasless: gasless || false,
        message: isDirectMint ? message : prev.message // Store direct mint message
      }));
      
      // 🔥 NEW: Enhanced wallet_watchAsset for gas-paid mints
      if (typeof window !== 'undefined' && window.ethereum && tokenId) {
        console.log('📱 Adding gas-paid NFT to wallet with enhanced metadata...');
        
        try {
          const contractAddress = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS;
          if (contractAddress) {
            // Get the HTTPS image URL from wizard data
            let imageHttpsUrl = '';
            if (wizardData.imageCid) {
              imageHttpsUrl = `https://cloudflare-ipfs.com/ipfs/${wizardData.imageCid}`;
            } else if (wizardData.imageUrl && wizardData.imageUrl.startsWith('http')) {
              imageHttpsUrl = wizardData.imageUrl;
            }
            
            console.log('🖼️ Adding gas-paid NFT to wallet:', {
              contractAddress,
              tokenId,
              imageUrl: imageHttpsUrl?.substring(0, 50) + '...'
            });
            
            await window.ethereum.request({
              method: 'wallet_watchAsset',
              params: [{
                type: 'ERC721',
                options: {
                  address: contractAddress,
                  tokenId: tokenId,
                  image: imageHttpsUrl, // 🔥 HTTPS image for wallet display
                  symbol: 'CGIFT',      // 🔥 Symbol for the NFT collection
                  decimals: 0,          // 🔥 NFTs have 0 decimals
                }
              }]
            });
            
            console.log('✅ Enhanced wallet_watchAsset completed for gas-paid NFT');
          }
        } catch (walletError) {
          console.log('⚠️ wallet_watchAsset failed for gas-paid NFT (not critical):', walletError);
        }
      }
      
      setCurrentStep(WizardStep.SUCCESS);
    } catch (err) {
      const parsedError = parseApiError(err);
      logError(parsedError, 'GiftWizard.handleMintGift');
      
      // Log error to debug system
      try {
        await fetch('/api/debug/mint-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'ERROR',
            step: 'GIFT_WIZARD_ERROR',
            data: { 
              error: parsedError.message,
              stack: parsedError.stack,
              userMessage: parsedError instanceof Error ? parsedError.message : 'Unknown error',
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (debugError) {
        console.warn('Debug error logging failed:', debugError);
      }
      
      setError(parsedError);
      setShowErrorModal(true);
      setCurrentStep(WizardStep.SUMMARY);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case WizardStep.CONNECT:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-6">Conecta y Autentica tu Wallet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Necesitamos conectar tu wallet y autenticarte de forma segura para crear el NFT-wallet regalo
            </p>
            
            {mounted && (
              <div className="max-w-md mx-auto">
                <ConnectAndAuthButton
                  showAuthStatus={true}
                  onAuthChange={(isAuthenticated, address) => {
                    console.log('🔄 Auth state changed in GiftWizard:', { isAuthenticated, address });
                    // SIMPLIFIED: No addStep() call to prevent static blocking
                    if (isAuthenticated) {
                      console.log('✅ GiftWizard authentication successful - ready for next step');
                    }
                  }}
                  className="w-full"
                />
                
                {/* Additional info */}
                <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  <p>🔒 Tu wallet se conectará de forma segura usando el estándar SIWE (Sign-In With Ethereum)</p>
                  <p className="mt-2">✅ Todos los datos se mantienen privados y seguros</p>
                </div>
              </div>
            )}
          </div>
        );

      case WizardStep.UPLOAD:
        return (
          <ImageUpload 
            onImageUpload={handleImageUpload}
            onBack={handleBack}
          />
        );

      case WizardStep.FILTER:
        return (
          <FilterSelector
            imageUrl={wizardData.imageUrl}
            onFilterSelect={handleFilterSelect}
            onBack={handleBack}
          />
        );

      case WizardStep.AMOUNT:
        return (
          <AmountSelector
            currentAmount={wizardData.amount}
            onAmountSelect={handleAmountSelect}
            onBack={handleBack}
            referralFee={referralFee}
            platformFee={platformFee}
            netAmount={netAmount}
          />
        );

      case WizardStep.ESCROW:
        return (
          <GiftEscrowConfig
            onConfigureEscrow={handleEscrowConfig}
            onSkipEscrow={handleSkipEscrow}
            initialConfig={wizardData.escrowConfig}
            isLoading={isLoading}
          />
        );

      case WizardStep.SUMMARY:
        return (
          <GiftSummary
            data={wizardData}
            fees={{
              creation: creationFee,
              referral: referralFee,
              platform: platformFee,
              net: netAmount
            }}
            onConfirm={handleMintGift}
            onBack={handleBack}
            isLoading={isLoading}
            error={error ? (error instanceof CryptoGiftError ? error.userMessage || error.message : error.message || error.toString()) : null}
          />
        );

      case WizardStep.MINTING:
        return (
          <div className="text-center py-12">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-4">Creando tu Regalo...</h2>
            <p className="text-gray-600 mb-4">
              Esto puede tomar unos segundos. ¡No cierres esta ventana!
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                🔄 <strong>Intentando transacción gasless</strong> (gratis)<br/>
                ⚡ Biconomy paymaster procesando...<br/>
                💰 Si falla → te pediremos pagar gas (~$0.01)
              </p>
            </div>
          </div>
        );

      case WizardStep.SUCCESS:
        return (
          <QRShare
            tokenId={wizardData.nftTokenId!}
            shareUrl={wizardData.shareUrl}
            qrCode={wizardData.qrCode}
            onClose={onClose}
            wasGasless={wizardData.wasGasless}
            isDirectMint={!wizardData.escrowConfig?.enabled}
            message={wizardData.message}
          />
        );

      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const stepNumbers = {
      [WizardStep.CONNECT]: 0,
      [WizardStep.UPLOAD]: 1,
      [WizardStep.FILTER]: 2,
      [WizardStep.AMOUNT]: 3,
      [WizardStep.ESCROW]: 4,
      [WizardStep.SUMMARY]: 5,
      [WizardStep.MINTING]: 6,
      [WizardStep.SUCCESS]: 7
    };
    return stepNumbers[currentStep];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" style={{ transform: 'scale(0.92)', transformOrigin: 'center' }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Crear Regalo Cripto</h1>
            {currentStep !== WizardStep.SUCCESS && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Paso {getStepNumber()} de 7
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl transition-colors flex-shrink-0 w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        {currentStep !== WizardStep.SUCCESS && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(getStepNumber() / 7) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Conectar</span>
              <span>Filtros</span>
              <span>Listo</span>
            </div>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        error={error}
        onClose={() => {
          setShowErrorModal(false);
          setError(null);
        }}
        onRetry={() => {
          setShowErrorModal(false);
          setError(null);
          handleMintGift();
        }}
      />

      {/* Gas Estimation Modal */}
      <GasEstimationModal
        isOpen={showGasModal}
        onClose={() => setShowGasModal(false)}
        onConfirm={handleGasConfirm}
        estimatedGas={gasEstimation.estimatedGas}
        gasPrice={gasEstimation.gasPrice}
        totalCost={gasEstimation.totalCost}
        networkName={gasEstimation.networkName}
      />

      {/* Device Limit Modal */}
      <DeviceLimitModal
        isOpen={showDeviceLimitModal}
        registeredWallets={getDeviceWalletInfo().registeredWallets}
        onClose={() => {
          setShowDeviceLimitModal(false);
          onClose(); // Close the entire wizard
        }}
        onSelectWallet={(walletAddress) => {
          setShowDeviceLimitModal(false);
          // TODO: Implement wallet switching logic
          console.log('User selected existing wallet:', walletAddress);
        }}
      />
    </div>
  );
};