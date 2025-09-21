"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { client } from '../../../../client';
import { WalletInterface } from '../../../../../components/WalletInterface';
import { ClaimEscrowInterfaceEN } from '../../../../../components-en/escrow/ClaimEscrowInterfaceEN';
import { RightSlideWallet } from '../../../../../components/TBAWallet/RightSlideWallet';
import { ImageDebugger } from '../../../../../components/ImageDebugger';

export default function TokenPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  // Now using useActiveAccount with proper ThirdwebProvider setup
  const account = useActiveAccount();
  const [nftData, setNftData] = useState<any>(null);
  const [tbaAddress, setTbaAddress] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTBAWallet, setShowTBAWallet] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const contractAddress = params?.address as string;
  const tokenId = params?.id as string;

  const loadNFTData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/nft/${contractAddress}/${tokenId}`);
      
      if (!response.ok) {
        throw new Error('NFT not found');
      }

      const data = await response.json();
      setNftData(data);
      setTbaAddress(data.tbaAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NFT');
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, tokenId]);

  const checkOwnership = useCallback(async () => {
    if (!mounted || !account || !nftData) return;

    try {
      const response = await fetch('/api/check-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          tokenId,
          userAddress: account?.address,
        }),
      });

      const data = await response.json();
      setIsOwner(data.isOwner);
    } catch (err) {
      console.error('Error checking ownership:', err);
    }
  }, [mounted, account, nftData, contractAddress, tokenId]);

  useEffect(() => {
    loadNFTData();
  }, [loadNFTData]);

  useEffect(() => {
    if (account && nftData) {
      checkOwnership();
    }
  }, [account, nftData, checkOwnership]);

  // Auto-open wallet if URL parameter is present
  useEffect(() => {
    const walletParam = searchParams?.get('wallet');
    if (walletParam === 'open' && isOwner && account) {
      setShowTBAWallet(true);
    }
  }, [searchParams, isOwner, account]);

  const handleClaim = async () => {
    if (!mounted || !account) return;
    
    // Use actual connected account address
    const claimerAddress = account.address;

    setIsLoading(true);
    try {
      // This function should not be called directly anymore
      // Authentication and claiming should be handled by ClaimInterface component
      console.log('🔍 DEBUG: Claim initiated from token page');
      
      // This is now a placeholder - the actual claim logic is in ClaimInterface
      // which handles SIWE authentication properly
      setError('Please use the claim interface below for secure authentication');
      return;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim NFT');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateMetadata = async () => {
    if (!contractAddress || !tokenId) return;
    
    setIsRegenerating(true);
    try {
      console.log('🔄 ENHANCED: Regenerating metadata for ANY contract:', { contractAddress, tokenId });
      
      // First check contract compatibility
      const checkResponse = await fetch(`/api/debug/token-contract-check?contractAddress=${contractAddress}&tokenId=${tokenId}`);
      if (checkResponse.ok) {
        const checkResult = await checkResponse.json();
        console.log('🔍 Contract check result:', checkResult);
      }
      
      // Use the enhanced regeneration endpoint that works with any contract
      const response = await fetch('/api/nft/regenerate-metadata-any-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress, // Use the ACTUAL contract from URL, not environment
          tokenId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ ENHANCED: Metadata regenerated successfully:', result);
        
        if (!result.contractMatch) {
          console.log('⚠️ WARNING: Contract mismatch detected');
          console.log('🔧 Used contract:', result.contractUsed);
          console.log('🏗️ Environment contract:', result.environmentContract);
        }
        
        // Reload NFT data to show the regenerated metadata
        await loadNFTData();
        
        alert(`¡Metadata regenerada exitosamente desde el contrato correcto!\n\nContrato usado: ${result.contractUsed}\nImagen: ${result.imageUrl || 'Procesando...'}`);
      } else {
        const error = await response.json();
        console.error('❌ Failed to regenerate metadata:', error);
        alert(`Error regenerating metadata: ${error.error}\n\nContract: ${error.contractUsed || contractAddress}`);
      }
    } catch (error) {
      console.error('❌ Error regenerating metadata:', error);
      alert(`Error regenerating metadata: ${error.message}\n\nCheck the console for more details.`);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your crypto gift...</p>
        </div>
      </div>
    );
  }

  if (error && !nftData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Gift Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Crear un Nuevo Regalo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image 
              src="/cg-wallet-logo.png" 
              alt="CryptoGift Wallet" 
              width={40} 
              height={40}
              className="rounded"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              {isOwner ? 'Tu NFT-Wallet' : 'Regalo Cripto Para Ti'}
            </h1>
          </div>
          <p className="text-gray-600">
            {isOwner 
              ? 'Gestiona tu NFT y los fondos de la wallet integrada' 
              : 'Alguien especial te ha enviado un regalo único en blockchain'
            }
          </p>
        </div>

        {/* NFT Display */}
        <div className="max-w-4xl mx-auto">
          {nftData && (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              {/* NFT Image and Info */}
              <div className="md:flex">
                <div className="md:w-1/2 p-8">
                  {/* Use ImageDebugger for robust image loading */}
                  <div className="w-full rounded-2xl shadow-lg overflow-hidden">
                    <ImageDebugger
                      nftContract={contractAddress}
                      tokenId={tokenId}
                      walletAddress={account?.address}
                      className="w-full h-auto"
                    />
                  </div>
                  
                  {/* Regenerate Metadata Button - now auto-triggered by ImageDebugger */}
                  {nftData?.image && (nftData.image.includes('placeholder') || nftData.image.includes('cg-wallet-placeholder')) && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800 mb-2">
                        🔄 Loading image from IPFS... If the problem persists, use the regeneration button.
                      </p>
                      <button
                        onClick={regenerateMetadata}
                        disabled={isRegenerating}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isRegenerating
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {isRegenerating ? (
                          <>
                            <span className="inline-block animate-spin mr-2">🔄</span>
                            Regenerando...
                          </>
                        ) : (
                          '🔄 Recuperar Imagen Real'
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="md:w-1/2 p-8">
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">💎</span>
                        <h2 className="text-2xl font-bold">{nftData.name}</h2>
                      </div>
                      <p className="text-gray-600">{nftData.description}</p>
                    </div>

                    {/* NFT Attributes */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-800">Características</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {nftData.attributes?.map((attr: any, index: number) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">{attr.trait_type}</div>
                            <div className="font-medium">{attr.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Connection Status */}
                    <div className="border-t pt-6">
                      {/* TEMPORARY: Force show claim button to test API token */}
                      {false ? (
                        <div className="text-center">
                          <p className="text-gray-600 mb-4">
                            Connect your wallet to {isOwner ? 'manage' : 'claim'} this gift
                          </p>
                          {mounted && (
                            <ConnectButton
                              client={client}
                              appMetadata={{
                                name: "CryptoGift Wallets",
                                url: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || (() => { throw new Error('NEXT_PUBLIC_SITE_URL is required for wallet connections'); })(),
                              }}
                            />
                          )}
                        </div>
                      ) : isOwner ? (
                        <div className="space-y-4">
                          <WalletInterface
                            nftData={nftData}
                            tbaAddress={tbaAddress}
                            contractAddress={contractAddress}
                            tokenId={tokenId}
                          />
                          
                          {/* TBA Wallet Interface Button */}
                          <div className="border-t pt-4">
                            <button
                              onClick={() => setShowTBAWallet(true)}
                              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
                            >
                              <span className="text-lg">💎</span>
                              <span>Open CG Wallet</span>
                              <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">NEW</span>
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                              Professional wallet interface with advanced features
                            </p>
                          </div>
                        </div>
                      ) : (
                        <ClaimEscrowInterfaceEN
                          tokenId={tokenId}
                          giftInfo={undefined} // Will be loaded by the component
                          nftMetadata={{
                            name: nftData?.name,
                            description: nftData?.description,
                            image: nftData?.image
                          }}
                          onClaimSuccess={(transactionHash, giftInfo) => {
                            console.log('🎉 Escrow gift claimed successfully!', { transactionHash, giftInfo });
                            setShowTBAWallet(true);
                          }}
                          onClaimError={(error) => {
                            console.error('❌ Escrow claim failed:', error);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8 grid md:grid-cols-3 gap-6">
          {/* How it Works */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="font-bold text-gray-800 mb-3">🔗 NFT = Wallet</h3>
            <p className="text-sm text-gray-600">
              Este NFT tiene una wallet integrada (ERC-6551) que puede guardar criptomonedas reales.
            </p>
          </div>

          {/* Security */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="font-bold text-gray-800 mb-3">🔒 Seguro</h3>
            <p className="text-sm text-gray-600">
              Tus fondos están protegidos por contratos auditados y recuperación social.
            </p>
          </div>

          {/* No Fees */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="font-bold text-gray-800 mb-3">⚡ Gas Gratis</h3>
            <p className="text-sm text-gray-600">
              Todas las transacciones tienen el gas patrocinado. ¡No pagas fees!
            </p>
          </div>
        </div>
      </div>

      {/* TBA Wallet Slide Panel */}
      {showTBAWallet && (
        <RightSlideWallet
          isOpen={showTBAWallet}
          onClose={() => setShowTBAWallet(false)}
          nftContract={contractAddress}
          tokenId={tokenId}
        />
      )}
    </div>
  );
}