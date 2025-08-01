"use client";

import React, { useState } from 'react';
import Image from 'next/image';

interface NFTImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  tokenId?: string;
  onError?: () => void;
  onLoad?: () => void;
}

/**
 * NFTImage Component - Handles IPFS URLs and fallbacks properly
 * Converts ipfs:// URLs to gateway URLs for browser display
 * while preserving original ipfs:// format for MetaMask compatibility
 */
export const NFTImage: React.FC<NFTImageProps> = ({
  src,
  alt,
  width,
  height,
  className = "",
  tokenId,
  onError,
  onLoad
}) => {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => {
    // Convert ipfs:// URLs to gateway URLs for browser display
    if (src.startsWith('ipfs://')) {
      const cid = src.replace('ipfs://', '');
      return `https://nftstorage.link/ipfs/${cid}`;
    }
    return src;
  });

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      console.log(`🖼️ Image load failed for ${tokenId || 'NFT'}, trying fallback`);
      
      // Try alternative IPFS gateway
      if (src.startsWith('ipfs://') && currentSrc.includes('nftstorage.link')) {
        const cid = src.replace('ipfs://', '');
        const fallbackSrc = `https://ipfs.io/ipfs/${cid}`;
        setCurrentSrc(fallbackSrc);
        console.log(`🔄 Trying alternative gateway: ${fallbackSrc}`);
        setHasError(false); // Reset error state for retry
        return;
      }
      
      // Final fallback to placeholder
      const placeholder = '/images/cg-wallet-placeholder.png';
      if (currentSrc !== placeholder) {
        setCurrentSrc(placeholder);
        console.log(`🖼️ Using placeholder for ${tokenId || 'NFT'}`);
      }
    }
    
    onError?.();
  };

  const handleLoad = () => {
    console.log(`✅ Image loaded successfully for ${tokenId || 'NFT'}: ${currentSrc}`);
    onLoad?.();
  };

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
      unoptimized // Disable optimization for IPFS URLs
    />
  );
};