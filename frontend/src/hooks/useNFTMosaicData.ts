"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
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
  cacheAge: number; // Age of cache in minutes
  totalNFTs: number; // Total NFTs found
}

// Cache for NFT data to avoid repeated fetches
const NFT_CACHE = new Map<string, { data: NFTMosaicData[], timestamp: number, totalNFTs: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * OPTIMIZED Custom hook to fetch NFT data for the mosaic background
 * Features:
 * - 5-minute intelligent caching to reduce API calls
 * - Debounced fetching to prevent excessive requests
 * - Optimized cross-wallet discovery with early termination
 * - Memory-efficient data structures
 * - Performance metrics tracking
 */
export function useNFTMosaicData(): UseNFTMosaicDataReturn {
  const [nfts, setNfts] = useState<NFTMosaicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheAge, setCacheAge] = useState(0);
  const [totalNFTs, setTotalNFTs] = useState(0);
  
  const account = useActiveAccount();
  const walletAddress = account?.address;
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  
  // Create cache key based on wallet address
  const cacheKey = useMemo(() => {
    return walletAddress ? `mosaic_${walletAddress}` : 'mosaic_no_wallet';
  }, [walletAddress]);
  
  const fetchNFTData = async (force = false) => {
    try {
      // Check cache first
      const cached = NFT_CACHE.get(cacheKey);
      const now = Date.now();
      
      if (cached && !force && (now - cached.timestamp) < CACHE_DURATION) {
        const ageMinutes = Math.floor((now - cached.timestamp) / 1000 / 60);
        console.log(`🚀 Using cached NFT data (${ageMinutes}m old, ${cached.totalNFTs} NFTs)`);
        setNfts(cached.data);
        setTotalNFTs(cached.totalNFTs);
        setCacheAge(ageMinutes);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      const allNFTs: NFTMosaicData[] = [];
      const startTime = Date.now();
      
      // 1. Get NFTs from current wallet if connected
      if (walletAddress) {
        console.log(`🔍 [PERF] Fetching NFTs for wallet: ${walletAddress.slice(0, 10)}...`);
        
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
        
        console.log(`✅ [PERF] Found ${allNFTs.length} NFTs in connected wallet (${Date.now() - startTime}ms)`);
      }
      
      // 2. If we need more NFTs for a rich mosaic, do OPTIMIZED cross-wallet search
      if (allNFTs.length < 20) {
        console.log(`🔍 [PERF] Searching for additional NFTs across device (need ${20 - allNFTs.length} more)...`);
        
        // OPTIMIZED: Try to find NFTs from other wallets on this device
        const additionalStartTime = Date.now();
        const additionalNFTs = await searchAdditionalNFTsOptimized(allNFTs.length);
        allNFTs.push(...additionalNFTs);
        
        console.log(`✅ [PERF] Total NFTs found: ${allNFTs.length} (additional search: ${Date.now() - additionalStartTime}ms)`);
      }
      
      // 3. Shuffle and limit for mosaic display - OPTIMIZED
      const shuffledNFTs = shuffleArrayOptimized([...allNFTs]).slice(0, 50);
      
      // Cache the results
      NFT_CACHE.set(cacheKey, {
        data: shuffledNFTs,
        timestamp: now,
        totalNFTs: allNFTs.length
      });
      
      // Cleanup old cache entries (keep only last 10)
      if (NFT_CACHE.size > 10) {
        const entries = Array.from(NFT_CACHE.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        NFT_CACHE.clear();
        entries.slice(0, 10).forEach(([key, value]) => NFT_CACHE.set(key, value));
      }
      
      setNfts(shuffledNFTs);
      setTotalNFTs(allNFTs.length);
      setCacheAge(0);
      
      const totalTime = Date.now() - startTime;
      console.log(`🚀 [PERF] NFT mosaic data fetch completed: ${shuffledNFTs.length} NFTs in ${totalTime}ms`);
      
    } catch (err) {
      console.error('❌ Error fetching NFT mosaic data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch NFT data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // OPTIMIZED search for additional NFTs to enrich the mosaic
  const searchAdditionalNFTsOptimized = async (currentCount: number): Promise<NFTMosaicData[]> => {
    const additionalNFTs: NFTMosaicData[] = [];
    const maxAdditional = Math.min(30 - currentCount, 20); // Limit search scope
    const foundIds = new Set<string>(); // Efficient duplicate tracking
    
    // Known contract addresses from the platform
    const knownContracts = [
      '0x54314166B36E3Cc66cFb36265D99697f4F733231', // Main TBA contract
    ];
    
    // OPTIMIZATION: Use Promise.all for parallel fetching, but limit concurrency
    const BATCH_SIZE = 10;
    
    for (const contractAddress of knownContracts) {
      // Search for tokens in batches to avoid overwhelming the system
      for (let startId = 0; startId < 50 && additionalNFTs.length < maxAdditional; startId += BATCH_SIZE) {
        const endId = Math.min(startId + BATCH_SIZE, 50);
        const tokenIds = Array.from({ length: endId - startId }, (_, i) => startId + i);
        
        // Process batch in parallel
        const batchPromises = tokenIds.map(async (tokenId) => {
          try {
            const metadata = getNFTMetadataClientCrossWallet(contractAddress, tokenId.toString());
            
            if (metadata && metadata.image) {
              const nftId = `${contractAddress}-${tokenId}`;
              
              // Quick duplicate check
              if (!foundIds.has(nftId)) {
                foundIds.add(nftId);
                return {
                  id: nftId,
                  name: metadata.name || `CryptoGift #${tokenId}`,
                  image: metadata.image,
                  contractAddress,
                  tokenId: tokenId.toString(),
                  owner: metadata.owner
                };
              }
            }
          } catch (err) {
            // Silent fail for individual tokens
            return null;
          }
          return null;
        });
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Filter out nulls and add to results
        batchResults.forEach(result => {
          if (result && additionalNFTs.length < maxAdditional) {
            additionalNFTs.push(result);
          }
        });
        
        // Early termination if we have enough
        if (additionalNFTs.length >= maxAdditional) {
          break;
        }
      }
    }
    
    return additionalNFTs;
  };
  
  // OPTIMIZED utility function to shuffle array (Fisher-Yates with early termination)
  const shuffleArrayOptimized = <T>(array: T[]): T[] => {
    if (array.length <= 1) return array;
    
    const shuffled = [...array];
    // Only shuffle what we need (first 50 items)
    const shuffleCount = Math.min(50, shuffled.length);
    
    for (let i = shuffleCount - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Debounced refetch function
  const refetch = () => {
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Debounce to prevent excessive calls
    fetchTimeoutRef.current = setTimeout(() => {
      fetchNFTData(true); // Force fresh fetch
    }, 300);
  };
  
  // Initial fetch and wallet change listener with debouncing
  useEffect(() => {
    const now = Date.now();
    
    // Debounce rapid wallet changes
    if (now - lastFetchRef.current < 1000) {
      console.log('🚀 [PERF] Debouncing rapid wallet change...');
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchNFTData();
        lastFetchRef.current = Date.now();
      }, 500);
    } else {
      fetchNFTData();
      lastFetchRef.current = now;
    }
    
    // Cleanup on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [cacheKey]); // Use cacheKey instead of walletAddress for better control
  
  return {
    nfts,
    isLoading,
    error,
    refetch,
    cacheAge,
    totalNFTs
  };
}

/**
 * OPTIMIZED lightweight version that only gets a few NFTs for subtle backgrounds
 * Uses cached data and limits processing for better performance
 */
export function useNFTMosaicDataLite(limit: number = 12): UseNFTMosaicDataReturn {
  const fullData = useNFTMosaicData();
  
  // Memoize the sliced data to prevent unnecessary re-renders
  const limitedNFTs = useMemo(() => {
    return fullData.nfts.slice(0, limit);
  }, [fullData.nfts, limit]);
  
  return {
    ...fullData,
    nfts: limitedNFTs
  };
}