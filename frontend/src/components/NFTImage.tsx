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
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  
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
      // URL encode the path to handle special characters like ó, ñ, spaces, etc.
      const encodedCid = encodeURIComponent(cid).replace(/%2F/g, '/'); // Keep slashes unencoded
      return `${IPFS_GATEWAYS[0]}${encodedCid}`;
    }
    // For regular IPFS URLs that might have special characters
    if (src.includes('ipfs/') && src.includes('%')) {
      // Already URL encoded, use as is
      return src;
    }
    if (src.includes('ipfs/')) {
      // Extract and encode the path part after ipfs/
      const parts = src.split('ipfs/');
      if (parts.length > 1) {
        const baseUrl = parts[0] + 'ipfs/';
        const path = parts[1];
        const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');
        return baseUrl + encodedPath;
      }
    }
    return src;
  });

  // R4: ResizeObserver for dynamic height adjustment - eliminates margins
  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions({ width, height });
        console.log(`🔧 Container resized: ${width}x${height} for ${tokenId || 'NFT'}`);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [tokenId]);

  const handleError = () => {
    console.log(`🖼️ Image load failed for ${tokenId || 'NFT'}: ${currentSrc}`);
    
    // CRITICAL FIX: Prevent infinite loop - if already showing placeholder, stop retrying
    if (currentSrc.includes('cg-wallet-placeholder.png')) {
      console.log(`⚠️ Placeholder itself failed for ${tokenId || 'NFT'} - showing error state`);
      setHasError(true);
      setIsLoading(false);
      onError?.();
      return;
    }
    
    // Try next IPFS gateway if available and not already on placeholder
    if (src.startsWith('ipfs://') && gatewayIndex < IPFS_GATEWAYS.length - 1 && !hasError) {
      const nextGatewayIndex = gatewayIndex + 1;
      const cid = src.replace('ipfs://', '');
      const encodedCid = encodeURIComponent(cid).replace(/%2F/g, '/');
      const nextGatewaySrc = `${IPFS_GATEWAYS[nextGatewayIndex]}${encodedCid}`;
      
      console.log(`🔄 Trying gateway ${nextGatewayIndex + 1}/${IPFS_GATEWAYS.length}: ${nextGatewaySrc}`);
      
      setGatewayIndex(nextGatewayIndex);
      setCurrentSrc(nextGatewaySrc);
      setIsLoading(true);
      return;
    }
    
    // All gateways failed or regular URL failed - switch to placeholder
    console.log(`❌ All options failed for ${tokenId || 'NFT'}, switching to placeholder`);
    setHasError(true);
    setIsLoading(false);
    setCurrentSrc('/images/cg-wallet-placeholder.png');
    
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
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={{ 
        maxHeight: '100%',
        // R4: Dynamic height based on container to eliminate vertical margins
        height: containerDimensions.height > 0 ? `${containerDimensions.height}px` : '100%'
      }}
    >
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
      
      {/* R4: Flex wrapper eliminates margins for vertical images */}
      {!hasError ? (
        <div className="flex items-center justify-center w-full h-full">
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
              // R4: Enhanced styling for vertical images - no margins
              objectFit: fit,
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto'
            }}
          />
        </div>
      ) : (
        // FALLBACK: Native img for placeholder when Next.js Image fails
        <div className="flex items-center justify-center w-full h-full">
          <img
            src="/images/cg-wallet-placeholder.png"
            alt={alt}
            style={{
              objectFit: fit,
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto'
            }}
            onError={(e) => {
              console.log(`🚨 Even native img placeholder failed for ${tokenId || 'NFT'}`);
              // Hide the img element if it fails
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      {/* Enhanced error state placeholder */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center 
                       bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 
                       dark:from-slate-800 dark:via-slate-700 dark:to-slate-900">
          {/* Animated placeholder icon */}
          <div className="w-8 h-8 mb-2 rounded-full bg-gradient-to-br 
                         from-blue-400 to-purple-400 flex items-center justify-center
                         animate-pulse">
            <div className="w-4 h-4 rounded-full bg-white dark:bg-black opacity-80" />
          </div>
          
          {/* NFT identifier */}
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
            NFT #{tokenId || '?'}
          </span>
          
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10"
               style={{
                 backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                                   radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)`
               }} />
        </div>
      )}
    </div>
  );
};

// Add custom CSS for shimmer animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `;
  if (!document.head.querySelector('style[data-nft-image-styles]')) {
    style.setAttribute('data-nft-image-styles', 'true');
    document.head.appendChild(style);
  }
}