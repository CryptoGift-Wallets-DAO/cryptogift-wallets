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
        console.log('🔍 Searching for additional NFTs across device...');\n        \n        // Try to find NFTs from other wallets on this device\n        // This gives us a richer mosaic background\n        const additionalNFTs = await searchAdditionalNFTs(allNFTs.length);\n        allNFTs.push(...additionalNFTs);\n        \n        console.log(`✅ Total NFTs found: ${allNFTs.length}`);\n      }\n      \n      // 3. Shuffle and limit for mosaic display\n      const shuffledNFTs = shuffleArray([...allNFTs]).slice(0, 50);\n      \n      setNfts(shuffledNFTs);\n      \n    } catch (err) {\n      console.error('❌ Error fetching NFT mosaic data:', err);\n      setError(err instanceof Error ? err.message : 'Failed to fetch NFT data');\n    } finally {\n      setIsLoading(false);\n    }\n  };\n  \n  // Search for additional NFTs to enrich the mosaic\n  const searchAdditionalNFTs = async (currentCount: number): Promise<NFTMosaicData[]> => {\n    const additionalNFTs: NFTMosaicData[] = [];\n    const maxAdditional = 30 - currentCount;\n    \n    // Known contract addresses from the platform\n    const knownContracts = [\n      '0x54314166B36E3Cc66cFb36265D99697f4F733231', // Main TBA contract\n    ];\n    \n    for (const contractAddress of knownContracts) {\n      // Search for tokens 0-50 in each contract\n      for (let tokenId = 0; tokenId < 50 && additionalNFTs.length < maxAdditional; tokenId++) {\n        try {\n          const metadata = getNFTMetadataClientCrossWallet(contractAddress, tokenId.toString());\n          \n          if (metadata && metadata.image) {\n            const nftData: NFTMosaicData = {\n              id: `${contractAddress}-${tokenId}`,\n              name: metadata.name || `CryptoGift #${tokenId}`,\n              image: metadata.image,\n              contractAddress,\n              tokenId: tokenId.toString(),\n              owner: metadata.owner\n            };\n            \n            // Avoid duplicates\n            const isDuplicate = additionalNFTs.some(nft => nft.id === nftData.id);\n            if (!isDuplicate) {\n              additionalNFTs.push(nftData);\n            }\n          }\n        } catch (err) {\n          // Silent fail for individual tokens\n          continue;\n        }\n      }\n    }\n    \n    return additionalNFTs;\n  };\n  \n  // Utility function to shuffle array\n  const shuffleArray = <T>(array: T[]): T[] => {\n    const shuffled = [...array];\n    for (let i = shuffled.length - 1; i > 0; i--) {\n      const j = Math.floor(Math.random() * (i + 1));\n      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];\n    }\n    return shuffled;\n  };\n  \n  // Refetch function\n  const refetch = () => {\n    fetchNFTData();\n  };\n  \n  // Initial fetch and wallet change listener\n  useEffect(() => {\n    fetchNFTData();\n  }, [walletAddress]);\n  \n  return {\n    nfts,\n    isLoading,\n    error,\n    refetch\n  };\n}\n\n/**\n * Lightweight version that only gets a few NFTs for subtle backgrounds\n */\nexport function useNFTMosaicDataLite(limit: number = 12): UseNFTMosaicDataReturn {\n  const fullData = useNFTMosaicData();\n  \n  return {\n    ...fullData,\n    nfts: fullData.nfts.slice(0, limit)\n  };\n}