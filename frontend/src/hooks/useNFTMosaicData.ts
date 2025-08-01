"use client";

import { useState, useEffect } from 'react';
import { getAllNFTMetadataForWallet, getNFTMetadataClientCrossWallet } from '../lib/clientMetadataStore';
import { useActiveAccount } from 'thirdweb/react';

interface NFTMosaicData {
  id: string;
  name: string;
  image: string;
  contractAddress: string;
  tokenId: string;
  owner?: string;
}

interface UseNFTMosaicDataReturn {
  nfts: NFTMosaicData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch NFT data for the mosaic background
 * Combines wallet-specific NFTs with cross-wallet discovery
 * Provides elegant fallbacks and loading states
 */
export function useNFTMosaicData(): UseNFTMosaicDataReturn {
  const [nfts, setNfts] = useState<NFTMosaicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const account = useActiveAccount();
  const walletAddress = account?.address;
  
  const fetchNFTData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allNFTs: NFTMosaicData[] = [];
      
      // 1. Get NFTs from current wallet if connected
      if (walletAddress) {
        console.log(`🔍 Fetching NFTs for wallet: ${walletAddress.slice(0, 10)}...`);
        
        const walletNFTs = getAllNFTMetadataForWallet(walletAddress);
        
        Object.entries(walletNFTs).forEach(([key, metadata]) => {
          if (metadata.image && metadata.contractAddress && metadata.tokenId) {
            allNFTs.push({
              id: `${metadata.contractAddress}-${metadata.tokenId}`,
              name: metadata.name || `NFT #${metadata.tokenId}`,
              image: metadata.image,
              contractAddress: metadata.contractAddress,
              tokenId: metadata.tokenId,
              owner: metadata.owner
            });
          }
        });
        
        console.log(`✅ Found ${allNFTs.length} NFTs in connected wallet`);
      }
      
      // 2. If we need more NFTs for a rich mosaic, do cross-wallet search
      if (allNFTs.length < 20) {
        console.log('🔍 Searching for additional NFTs across device...');
        
        // Try to find NFTs from other wallets on this device
        // This gives us a richer mosaic background
        const additionalNFTs = await searchAdditionalNFTs(allNFTs.length);
        allNFTs.push(...additionalNFTs);
        
        console.log(`✅ Total NFTs found: ${allNFTs.length}`);
      }
      
      // 3. Shuffle and limit for mosaic display
      const shuffledNFTs = shuffleArray([...allNFTs]).slice(0, 50);
      
      setNfts(shuffledNFTs);
      
    } catch (err) {
      console.error('❌ Error fetching NFT mosaic data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch NFT data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Search for additional NFTs to enrich the mosaic
  const searchAdditionalNFTs = async (currentCount: number): Promise<NFTMosaicData[]> => {
    const additionalNFTs: NFTMosaicData[] = [];
    const maxAdditional = 30 - currentCount;
    
    // Known contract addresses from the platform
    const knownContracts = [
      '0x54314166B36E3Cc66cFb36265D99697f4F733231', // Main TBA contract
    ];
    
    for (const contractAddress of knownContracts) {
      // Search for tokens 0-50 in each contract
      for (let tokenId = 0; tokenId < 50 && additionalNFTs.length < maxAdditional; tokenId++) {
        try {
          const metadata = getNFTMetadataClientCrossWallet(contractAddress, tokenId.toString());
          
          if (metadata && metadata.image) {
            const nftData: NFTMosaicData = {
              id: `${contractAddress}-${tokenId}`,
              name: metadata.name || `CryptoGift #${tokenId}`,
              image: metadata.image,
              contractAddress,
              tokenId: tokenId.toString(),
              owner: metadata.owner
            };
            
            // Avoid duplicates
            const isDuplicate = additionalNFTs.some(nft => nft.id === nftData.id);
            if (!isDuplicate) {
              additionalNFTs.push(nftData);
            }
          }
        } catch (err) {
          // Silent fail for individual tokens
          continue;
        }
      }
    }
    
    return additionalNFTs;
  };
  
  // Utility function to shuffle array
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Refetch function
  const refetch = () => {
    fetchNFTData();
  };
  
  // Initial fetch and wallet change listener
  useEffect(() => {
    fetchNFTData();
  }, [walletAddress]);
  
  return {
    nfts,
    isLoading,
    error,
    refetch
  };
}

/**
 * Lightweight version that only gets a few NFTs for subtle backgrounds
 */
export function useNFTMosaicDataLite(limit: number = 12): UseNFTMosaicDataReturn {
  const fullData = useNFTMosaicData();
  
  return {
    ...fullData,
    nfts: fullData.nfts.slice(0, limit)
  };
}