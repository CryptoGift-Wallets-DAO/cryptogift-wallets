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
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

/**
 * Enhanced NFTImage Component - Perfect dimensions & MetaMask compatibility
 * 
 * Features:
 * - Proper aspect ratio handling (no more cropping!)
 * - Multiple IPFS gateway fallbacks for reliability
 * - Elegant loading and error states
 * - Configurable fit modes (contain, cover, etc.)
 * - Performance optimized with priority loading
 * - Beautiful placeholders with luxury aesthetics
 * 
 * Fixes the image cropping issue by using object-fit: contain by default
 * and providing proper fallback handling for IPFS content.
 */
export const NFTImage: React.FC<NFTImageProps> = ({
  src,
  alt,
  width,
  height,
  className = "",
  tokenId,
  onError,
  onLoad,
  fit = 'contain',
  priority = false,
  placeholder = 'empty',
  blurDataURL
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  
  // Multiple IPFS gateways for redundancy (ordered by performance)
  const IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://dweb.link/ipfs/',
    'https://ipfs.infura.io/ipfs/',
    'https://nftstorage.link/ipfs/',
    'https://ipfs.fleek.co/ipfs/'
  ];
  
  const [currentSrc, setCurrentSrc] = useState(() => {
    // Convert ipfs:// URLs to gateway URLs for browser display
    if (src.startsWith('ipfs://')) {
      const cid = src.replace('ipfs://', '');
      return `${IPFS_GATEWAYS[0]}${cid}`;
    }
    return src;
  });

  const handleError = () => {
    console.log(`🖼️ Image load failed for ${tokenId || 'NFT'}: ${currentSrc}`);
    
    // Try next IPFS gateway if available
    if (src.startsWith('ipfs://') && gatewayIndex < IPFS_GATEWAYS.length - 1) {
      const nextGatewayIndex = gatewayIndex + 1;
      const cid = src.replace('ipfs://', '');
      const nextGatewaySrc = `${IPFS_GATEWAYS[nextGatewayIndex]}${cid}`;
      
      console.log(`🔄 Trying gateway ${nextGatewayIndex + 1}/${IPFS_GATEWAYS.length}: ${nextGatewaySrc}`);
      
      setGatewayIndex(nextGatewayIndex);
      setCurrentSrc(nextGatewaySrc);
      setHasError(false);
      setIsLoading(true);
      return;
    }
    
    // All gateways failed, use placeholder
    if (!hasError) {
      setHasError(true);
      setIsLoading(false);
      const placeholder = '/images/cg-wallet-placeholder.png';
      setCurrentSrc(placeholder);
      console.log(`❌ All gateways failed for ${tokenId || 'NFT'}, using placeholder`);
    }
    
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log(`✅ Image loaded successfully for ${tokenId || 'NFT'}: ${currentSrc}`);
    onLoad?.();
  };

  // Generate object-fit class based on fit prop
  const fitClass = {
    cover: 'object-cover',
    contain: 'object-contain', 
    fill: 'object-fill',
    'scale-down': 'object-scale-down'
  }[fit];
  
  // Generate placeholder blur data URL for smooth loading
  const generateBlurDataURL = () => {
    if (blurDataURL) return blurDataURL;
    
    // Simple base64 encoded 10x10 gradient placeholder
    return `data:image/svg+xml;base64,${btoa(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:0.3" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
      </svg>`
    )}`;
  };
  
  return (
    <div className="relative w-full h-full">
      {/* Loading state */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center 
                       bg-gradient-to-br from-slate-100 to-slate-200 
                       dark:from-slate-800 dark:to-slate-900 animate-pulse">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 
                         animate-spin border-2 border-transparent 
                         border-t-white dark:border-t-black" />
        </div>
      )}
      
      {/* NFT Image */}
      <Image
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${fitClass} transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? generateBlurDataURL() : undefined}
        unoptimized={src.startsWith('ipfs://') || src.includes('ipfs')} // Disable optimization for IPFS URLs
        style={{
          // Ensure the image maintains aspect ratio without cropping
          objectFit: fit,
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
      
      {/* Error state placeholder */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center 
                       bg-gradient-to-br from-slate-50 to-slate-100 
                       dark:from-slate-800 dark:to-slate-900">
          <div className="w-8 h-8 mb-2 rounded-full bg-gradient-to-br 
                         from-blue-400 to-purple-400 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white dark:bg-black opacity-80" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            NFT #{tokenId || '?'}
          </span>
        </div>
      )}
    </div>
  );
};