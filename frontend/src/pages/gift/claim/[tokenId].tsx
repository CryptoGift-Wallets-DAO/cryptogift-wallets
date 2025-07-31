"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ClaimEscrowInterface } from '../../../components/escrow/ClaimEscrowInterface';
import { EscrowGiftStatus } from '../../../components/escrow/EscrowGiftStatus';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { client } from '../../../app/client';

interface GiftInfo {
  creator: string;
  nftContract: string;
  expirationTime: number;
  status: 'active' | 'expired' | 'claimed' | 'returned';
  timeRemaining?: string;
  canClaim: boolean;
  isExpired: boolean;
}

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
}

export default function ClaimGiftPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const { tokenId } = router.query;
  
  const [giftInfo, setGiftInfo] = useState<GiftInfo | null>(null);
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [claimed, setClaimed] = useState(false);

  // Load gift information when page loads
  useEffect(() => {
    if (tokenId && typeof tokenId === 'string') {
      loadGiftInfo(tokenId);
    }
  }, [tokenId]);

  const loadGiftInfo = async (tokenId: string) => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Loading gift info for token:', tokenId);

      const response = await fetch(`/api/gift-info/${tokenId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load gift info: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load gift information');
      }

      console.log('✅ Gift info loaded:', result);
      setGiftInfo(result.gift);

      // Try to load NFT metadata (optional)
      loadNFTMetadata(result.gift.nftContract, tokenId);

    } catch (err: any) {
      console.error('❌ Failed to load gift info:', err);
      setError(err.message || 'Failed to load gift information');
    } finally {
      setLoading(false);
    }
  };

  const loadNFTMetadata = async (nftContract: string, tokenId: string) => {
    try {
      console.log('🎨 Loading NFT metadata for:', { nftContract, tokenId });
      
      // FIXED: Load real NFT metadata using the new API
      const metadataResponse = await fetch(`/api/nft/${nftContract}/${tokenId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (metadataResponse.ok) {
        const metadataResult = await metadataResponse.json();
        
        if (metadataResult.success) {
          console.log('✅ NFT metadata loaded:', metadataResult);
          
          // Use image URL directly from API (already processed)
          let imageUrl = metadataResult.image;
          
          setNftMetadata({
            name: metadataResult.name || `CryptoGift NFT #${tokenId}`,
            description: metadataResult.description || 'A secured gift NFT protected by temporal escrow',
            image: imageUrl
          });
        } else {
          console.warn('⚠️ No metadata available for this NFT');
          setNftMetadata({
            name: `CryptoGift NFT #${tokenId}`,
            description: 'A secured gift NFT protected by temporal escrow',
            image: undefined
          });
        }
      } else {
        console.warn('⚠️ Failed to fetch NFT metadata from API');
        // Fallback to default metadata
        setNftMetadata({
          name: `CryptoGift NFT #${tokenId}`,
          description: 'A secured gift NFT protected by temporal escrow',
          image: undefined
        });
      }

    } catch (error) {
      console.warn('⚠️ Could not load NFT metadata:', error);
      // Always set something to prevent null state
      setNftMetadata({
        name: `CryptoGift NFT #${tokenId}`,
        description: 'A secured gift NFT protected by temporal escrow',
        image: undefined
      });
    }
  };

  const handleClaimSuccess = (transactionHash: string, giftInfo?: any) => {
    console.log('🎉 Gift claimed successfully!', { transactionHash, giftInfo });
    setClaimed(true);
    
    // Refresh gift info to show claimed status
    if (tokenId && typeof tokenId === 'string') {
      setTimeout(() => {
        loadGiftInfo(tokenId);
      }, 2000);
    }
  };

  const handleClaimError = (error: string) => {
    console.error('❌ Claim failed:', error);
    setError(error);
  };

  const handleRefresh = () => {
    if (tokenId && typeof tokenId === 'string') {
      loadGiftInfo(tokenId);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Gift... | CryptoGift</title>
          <meta name="description" content="Loading your secured gift..." />
        </Head>
        
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Gift...</h1>
            <p className="text-gray-600">
              Fetching your secured gift information...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error && !giftInfo) {
    return (
      <>
        <Head>
          <title>Gift Not Found | CryptoGift</title>
          <meta name="description" content="This gift could not be found or loaded." />
        </Head>
        
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Gift Not Found</h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </>
    );
  }

  const pageTitle = giftInfo?.status === 'claimed' 
    ? `Gift Claimed | CryptoGift`
    : `Claim Your Gift #${tokenId} | CryptoGift`;
    
  const pageDescription = giftInfo?.status === 'claimed'
    ? 'This gift has been successfully claimed!'
    : 'Claim your secured temporal escrow gift with your password.';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        {nftMetadata?.image && (
          <meta property="og:image" content={nftMetadata.image} />
        )}
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Back to CryptoGift
                </button>
              </div>
              
              {!account && (
                <ConnectButton
                  client={client}
                  appMetadata={{
                    name: "CryptoGift Wallets",
                    url: "https://cryptogift-wallets.vercel.app",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Gift Status */}
            <div>
              <EscrowGiftStatus
                tokenId={tokenId as string}
                giftInfo={giftInfo}
                nftMetadata={nftMetadata}
                isCreator={false}
                onRefresh={handleRefresh}
                className="mb-6"
              />
              
              {/* Help Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  How to Claim Your Gift
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-blue-600 font-bold text-xs">1</span>
                    </div>
                    <p>Connect your wallet using the button above</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-blue-600 font-bold text-xs">2</span>
                    </div>
                    <p>Enter the password that was shared with you</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-blue-600 font-bold text-xs">3</span>
                    </div>
                    <p>The NFT will be transferred to your wallet</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Claim Interface */}
            <div>
              {claimed ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-green-800 mb-2">
                    Gift Claimed Successfully!
                  </h2>
                  <p className="text-green-600 mb-4">
                    The NFT has been transferred to your wallet.
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Refresh Status
                  </button>
                </div>
              ) : (
                <ClaimEscrowInterface
                  tokenId={tokenId as string}
                  giftInfo={giftInfo}
                  nftMetadata={nftMetadata}
                  onClaimSuccess={handleClaimSuccess}
                  onClaimError={handleClaimError}
                />
              )}

              {/* Security Notice */}
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">Security Notice</p>
                    <ul className="text-amber-700 space-y-1">
                      <li>• Never share your wallet&apos;s private key or seed phrase</li>
                      <li>• This gift is secured by temporal escrow technology</li>
                      <li>• If expired, the gift will be returned to the creator</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Disable static generation for this page since it uses ThirdWeb hooks
export async function getServerSideProps() {
  return {
    props: {}
  };
}