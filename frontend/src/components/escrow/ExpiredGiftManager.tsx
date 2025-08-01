"use client";

import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { 
  formatTimeRemaining,
  isGiftExpired,
  parseEscrowError,
  prepareReturnExpiredGiftByIdCall,
  getGiftIdFromTokenId
} from '../../lib/escrowUtils';
import { getAuthHeader, getAuthState } from '../../lib/siweClient';
import { sendTransaction } from 'thirdweb';
import { NFTImage } from '../NFTImage';

interface ExpiredGift {
  tokenId: string;
  creator: string;
  nftContract: string;
  expirationTime: number;
  status: 'active' | 'expired' | 'claimed' | 'returned';
  nftMetadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
}

interface ExpiredGiftManagerProps {
  onGiftReturned?: (tokenId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export const ExpiredGiftManager: React.FC<ExpiredGiftManagerProps> = ({
  onGiftReturned,
  onRefresh,
  className = ''
}) => {
  const account = useActiveAccount();
  const [expiredGifts, setExpiredGifts] = useState<ExpiredGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');
  const [bulkReturning, setBulkReturning] = useState(false);

  // Load expired gifts when component mounts or account changes
  useEffect(() => {
    if (account) {
      loadExpiredGifts();
    }
  }, [account]);

  const loadExpiredGifts = async () => {
    if (!account) return;

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Loading expired gifts for creator:', account.address);
      
      // REAL API CALL: Load expired gifts for authenticated user
      const authHeader = getAuthHeader();
      if (!authHeader) {
        console.error('❌ EXPIRED GIFTS: No auth header available');
        const authState = getAuthState();
        console.log('🔍 Auth state:', { 
          hasToken: !!authState.token, 
          isAuthenticated: authState.isAuthenticated,
          expiresAt: authState.expiresAt 
        });
        throw new Error('Please sign in with your wallet to view expired gifts');
      }
      
      console.log('✅ EXPIRED GIFTS: Auth header available, making API call...');

      const response = await fetch('/api/user/expired-gifts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load expired gifts');
      }

      const { expiredGifts: apiExpiredGifts } = await response.json();
      
      // Transform API response to component format
      const transformedGifts: ExpiredGift[] = (apiExpiredGifts || []).map(gift => ({
        tokenId: gift.tokenId,
        creator: gift.creator,
        nftContract: gift.nftContract,
        expirationTime: gift.expirationTime,
        status: 'expired', // API already filtered for expired gifts
        nftMetadata: gift.nftMetadata
      }));
      
      console.log(`✅ Loaded ${transformedGifts.length} expired gifts from API`);
      setExpiredGifts(transformedGifts);
      
    } catch (err: any) {
      console.error('❌ Failed to load expired gifts:', err);
      setError('Failed to load expired gifts');
    } finally {
      setLoading(false);
    }
  };

  const returnSingleGift = async (tokenId: string) => {
    if (!account) return;

    setReturning(prev => new Set(prev).add(tokenId));
    setError('');

    try {
      console.log('🔄 Returning expired gift with USER WALLET:', tokenId);

      // ZERO CUSTODY: User executes return with their own wallet
      // Need to find giftId from tokenId first
      const giftId = await getGiftIdFromTokenId(tokenId);
      if (giftId === null) {
        throw new Error('Could not find gift ID for this token');
      }

      // Execute return transaction directly with user's wallet
      const returnTx = prepareReturnExpiredGiftByIdCall(giftId);
      
      const result = await sendTransaction({
        transaction: returnTx,
        account: account // USER'S WALLET, not deployer
      });

      console.log('✅ Gift returned successfully with user wallet:', result.transactionHash);

      // Remove from expired gifts list
      setExpiredGifts(prev => prev.filter(gift => gift.tokenId !== tokenId));
      
      if (onGiftReturned) {
        onGiftReturned(tokenId);
      }

    } catch (err: any) {
      console.error('❌ Failed to return gift:', err);
      setError(parseEscrowError(err));
    } finally {
      setReturning(prev => {
        const next = new Set(prev);
        next.delete(tokenId);
        return next;
      });
    }
  };

  const returnAllGifts = async () => {
    if (!account || expiredGifts.length === 0) return;

    setBulkReturning(true);
    setError('');

    try {
      console.log('🔄 Returning all expired gifts:', expiredGifts.length);

      const returnPromises = expiredGifts.map(gift => 
        returnSingleGift(gift.tokenId)
      );

      await Promise.all(returnPromises);

      console.log('✅ All gifts returned successfully');

    } catch (err: any) {
      console.error('❌ Failed to return all gifts:', err);
      setError('Some gifts failed to return. Please try individual returns.');
    } finally {
      setBulkReturning(false);
    }
  };

  if (!account) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to manage your expired gifts
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  if (expiredGifts.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-4xl mb-4">✨</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Expired Gifts
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don&apos;t have any expired gifts that need to be returned
        </p>
        <button
          onClick={loadExpiredGifts}
          disabled={loading}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Buscando...
            </>
          ) : (
            <>🔍 Buscar Regalos Expirados</>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Expired Gift Manager
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {expiredGifts.length} expired gift{expiredGifts.length !== 1 ? 's' : ''} ready to return
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadExpiredGifts}
            disabled={loading}
            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors border border-blue-200 dark:border-blue-800"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Buscando...
              </>
            ) : (
              <>🔍 Buscar Regalos Expirados</>
            )}
          </button>
          
          {expiredGifts.length > 1 && (
            <button
              onClick={returnAllGifts}
              disabled={bulkReturning || returning.size > 0}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkReturning ? 'Returning All...' : `↩️ Return All (${expiredGifts.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expired Gifts List */}
      <div className="grid gap-4">
        {expiredGifts.map(gift => (
          <div
            key={gift.tokenId}
            className="bg-white dark:bg-gray-800 rounded-lg shadow border border-orange-200 dark:border-orange-800 overflow-hidden"
          >
            <div className="flex">
              {/* NFT Image */}
              <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                {gift.nftMetadata?.image ? (
                  <NFTImage
                    src={gift.nftMetadata.image}
                    alt={gift.nftMetadata.name || `Gift NFT #${gift.tokenId}`}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    tokenId={gift.tokenId}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <div className="text-2xl">⏰</div>
                  </div>
                )}
              </div>

              {/* Gift Details */}
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {gift.nftMetadata?.name || `Gift NFT #${gift.tokenId}`}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Token ID: {gift.tokenId}
                    </p>
                  </div>
                  
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                    ⏰ Expired
                  </span>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>
                    Expired: {formatTimeRemaining(Math.floor(Date.now() / 1000) - gift.expirationTime)} ago
                  </p>
                  <p>
                    Contract: {gift.nftContract.slice(0, 8)}...{gift.nftContract.slice(-6)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 flex items-center">
                <button
                  onClick={() => returnSingleGift(gift.tokenId)}
                  disabled={returning.has(gift.tokenId) || bulkReturning}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {returning.has(gift.tokenId) ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Returning...
                    </div>
                  ) : (
                    '↩️ Return'
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-blue-700 dark:text-blue-300">
            <h4 className="font-medium mb-1">About Expired Gift Returns</h4>
            <ul className="text-sm space-y-1 text-blue-600 dark:text-blue-400">
              <li>• Expired gifts are automatically eligible for return to your wallet</li>
              <li>• Returns are processed gaslessly when possible</li>
              <li>• You can return gifts individually or all at once</li>
              <li>• Once returned, the NFT will be back in your wallet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};