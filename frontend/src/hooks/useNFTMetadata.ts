"use client";

import { useState, useEffect } from 'react';
import { NFTMetadata, storeNFTMetadataClient, getNFTMetadataClient, resolveIPFSUrlClient } from '../lib/clientMetadataStore';

export function useNFTMetadata(contractAddress: string, tokenId: string, walletAddress?: string) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetadata();
  }, [contractAddress, tokenId, walletAddress]);

  const loadMetadata = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // REACTIVATED: Normal client cache behavior
      console.log('✅ CLIENT CACHE REACTIVATED: Using normal flow');
      
      // First try wallet-scoped client storage if wallet address is available
      if (walletAddress) {
        const clientMetadata = getNFTMetadataClient(contractAddress, tokenId, walletAddress);
        
        if (clientMetadata) {
          console.log('✅ Found wallet-scoped client metadata:', clientMetadata);
          setMetadata(clientMetadata);
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback to API
      console.log('🔍 No client metadata, trying API...');
      const response = await fetch(`/api/nft/${contractAddress}/${tokenId}`);
      
      if (response.ok) {
        const apiData = await response.json();
        console.log('✅ API response:', apiData);
        
        // If API has real image data, store it in client
        if (apiData.image && !apiData.image.includes('placeholder')) {
          const newMetadata: NFTMetadata = {
            contractAddress,
            tokenId,
            name: apiData.name || `CryptoGift NFT #${tokenId}`,
            description: apiData.description || '',
            image: apiData.image,
            attributes: apiData.attributes || [],
            createdAt: new Date().toISOString()
          };
          
          // Store with wallet address if available, otherwise use dummy address for testing
          const addressToUse = walletAddress || '0x0000000000000000000000000000000000000000';
          storeNFTMetadataClient(newMetadata, addressToUse);
          setMetadata(newMetadata);
        } else {
          // Use placeholder metadata
          setMetadata({
            contractAddress,
            tokenId,
            name: apiData.name || `CryptoGift NFT #${tokenId}`,
            description: apiData.description || '',
            image: apiData.image || '/images/cg-wallet-placeholder.png',
            attributes: apiData.attributes || [],
            createdAt: new Date().toISOString()
          });
        }
      } else {
        throw new Error(`API failed: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Error loading metadata:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback to basic metadata
      setMetadata({
        contractAddress,
        tokenId,
        name: `CryptoGift NFT #${tokenId}`,
        description: 'Un regalo cripto único',
        image: '/images/cg-wallet-placeholder.png',
        attributes: [],
        createdAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateMetadata = (newMetadata: Partial<NFTMetadata>) => {
    if (metadata) {
      const updated = { ...metadata, ...newMetadata };
      setMetadata(updated);
      // Store with wallet address if available, otherwise use dummy address
      const addressToUse = walletAddress || '0x0000000000000000000000000000000000000000';
      storeNFTMetadataClient(updated, addressToUse);
    }
  };

  const getImageUrl = () => {
    if (!metadata?.image) return '/images/cg-wallet-placeholder.png';
    
    if (metadata.image.startsWith('ipfs://')) {
      return resolveIPFSUrlClient(metadata.image);
    }
    
    return metadata.image;
  };

  return {
    metadata,
    isLoading,
    error,
    updateMetadata,
    getImageUrl,
    reload: loadMetadata
  };
}