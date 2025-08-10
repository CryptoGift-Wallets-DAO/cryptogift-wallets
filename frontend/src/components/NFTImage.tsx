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
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // SIMPLIFIED: Use image URL exactly as provided by API (already processed)
  const [currentSrc, setCurrentSrc] = useState(() => {
    // Handle null/empty src - use placeholder immediately
    if (!src || src.trim() === '') {
      return '/images/cg-wallet-placeholder.png';
    }
    // Use image URL exactly as provided by server (no client-side processing)
    return src;
  });

  // R4: ResizeObserver TEMPORARILY DISABLED to fix zoom interference issue
  // TODO: Re-implement ResizeObserver without affecting browser zoom behavior
  // React.useEffect(() => {
  //   if (!containerRef.current) return;
  //   const resizeObserver = new ResizeObserver((entries) => {
  //     // Observer logic here
  //   });
  //   resizeObserver.observe(containerRef.current);
  //   return () => resizeObserver.disconnect();
  // }, [tokenId]);

  const handleError = () => {
    console.log(`🖼️ Image load failed for ${tokenId || 'NFT'}: ${currentSrc}`);
    
    // Prevent infinite loop if placeholder fails
    if (currentSrc.includes('cg-wallet-placeholder.png')) {
      console.log(`⚠️ Placeholder failed for ${tokenId || 'NFT'} - stopping retries`);
      setIsLoading(false);
      return;
    }
    
    // SIMPLIFIED: Just switch to placeholder (no client-side gateway rotation)
    console.log(`❌ Image failed for ${tokenId || 'NFT'}, using placeholder`);
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
        maxHeight: '100%'
        // ZOOM FIX: Removed containerDimensions.height - was interfering with browser zoom
        // height: containerDimensions.height > 0 ? `${containerDimensions.height}px` : '100%'
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
            key={currentSrc}  // Force re-render when src changes (from f20178a)
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
        // FALLBACK: Native img for placeholder when Next.js Image fails (from f20178a)
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
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      {/* Enhanced error state placeholder - ONLY when not showing placeholder */}
      {hasError && !currentSrc.includes('cg-wallet-placeholder.png') && (
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