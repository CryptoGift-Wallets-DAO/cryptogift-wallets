'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NFTImage } from '../NFTImage';

interface NFTImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
  name: string;
  tokenId: string;
  contractAddress?: string;
  metadata?: {
    description?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

/**
 * NFTImageModal - Elegant full-screen NFT image viewer
 * 
 * Features:
 * - Responsive layout: side-by-side for wide images, stacked for tall images
 * - Perfect aspect ratio preservation
 * - Smooth animations and blur backgrounds
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 * - Beautiful metadata display
 */
export function NFTImageModal({
  isOpen,
  onClose,
  image,
  name,
  tokenId,
  contractAddress,
  metadata
}: NFTImageModalProps) {
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isWideImage, setIsWideImage] = useState(false);
  
  // Detect image aspect ratio for adaptive layout
  useEffect(() => {
    if (!isOpen || !image) return;
    
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      setImageAspectRatio(aspectRatio);
      
      // Consider images with aspect ratio >= 1.6 (16:10) as "wide"
      // Ultra-wide images (>= 1.9) will definitely use vertical layout
      setIsWideImage(aspectRatio >= 1.6);
      
      console.log(`🖼️ Image loaded for modal: ${img.naturalWidth}x${img.naturalHeight}, aspect ratio: ${aspectRatio.toFixed(2)}, wide: ${aspectRatio >= 1.6}`);
    };
    img.src = image;
  }, [isOpen, image]);
  
  // Mobile detection for enhanced mobile experience
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* MOBILE VERSION - Full screen with scroll */}
          {isMobile ? (
            <motion.div
              className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Mobile Header with Close Button */}
              <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Vista Previa
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Pull down hint */}
                <div className="text-center mt-2">
                  <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto"></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Desliza hacia abajo para cerrar</p>
                </div>
              </div>

              {/* Mobile Content */}
              <div className="p-4 space-y-6">
                {/* Image Section - Optimized for mobile */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-4">
                  <NFTImage
                    src={image}
                    alt={name}
                    width={400}
                    height={400}
                    className="w-full max-h-[50vh] object-contain rounded-lg"
                    tokenId={tokenId}
                    fit="contain"
                    priority={true}
                  />
                </div>

                {/* Content Section */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      {name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Token ID: {tokenId}
                    </p>
                    {contractAddress && (
                      <p className="text-xs text-slate-500 dark:text-slate-500 font-mono mt-1">
                        {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {metadata?.description && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {metadata.description}
                      </p>
                    </div>
                  )}

                  {/* Attributes */}
                  {metadata?.attributes && metadata.attributes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
                        Propiedades
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {metadata.attributes.map((attr, index) => (
                          <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              {attr.trait_type}
                            </p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                              {attr.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        if (contractAddress) {
                          const url = `https://sepolia.basescan.org/nft/${contractAddress}/${tokenId}`;
                          window.open(url, '_blank');
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Ver en BaseScan
                    </button>
                  </div>

                  {/* Close Button - Bottom */}
                  <div className="pt-6 pb-8">
                    <button
                      onClick={onClose}
                      className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-3 px-4 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Cerrar Vista Previa
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* DESKTOP VERSION - Original modal */
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
              />
              
              {/* Modal Container - Click outside to close */}
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={(e) => {
                  // Close modal if clicking on the container (outside modal content)
                  if (e.target === e.currentTarget) {
                    onClose();
                  }
                }}
              >
                {/* Modal Content - Adaptive max width */}
                <div 
                  className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden ${
                    isWideImage 
                      ? 'max-w-5xl w-full' // Wider container for wide images in vertical layout
                      : 'max-w-6xl' // Standard width for horizontal layout
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Content Layout - ADAPTIVE based on image aspect ratio */}
              <div className={`flex min-h-[300px] max-h-[90vh] ${
                isWideImage 
                  ? 'flex-col' // Vertical layout for wide images (image top, info bottom)
                  : 'flex-col lg:flex-row' // Horizontal layout for square/portrait images
              }`}>
                {/* Image Section - Adaptive sizing */}
                <div className={`flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 ${
                  isWideImage 
                    ? 'w-full' // Full width for wide images in vertical layout
                    : 'flex-1' // Flexible for square/portrait in horizontal layout
                }`}>
                  <div className="relative max-w-full max-h-full">
                    <NFTImage
                      src={image}
                      alt={name}
                      width={isWideImage ? 800 : 600} // Larger width for wide images
                      height={isWideImage ? 450 : 600} // Proportional height for wide images
                      className={`object-contain rounded-lg shadow-lg ${
                        isWideImage 
                          ? 'max-w-full max-h-[50vh]' // Limit height for wide images
                          : 'max-w-full max-h-[70vh]' // Standard sizing for others
                      }`}
                      tokenId={tokenId}
                      fit="contain"
                      priority={true}
                    />
                    
                    {/* Image Border Effect */}
                    <div className="absolute inset-0 rounded-lg border-2 border-gradient-to-r from-blue-400 via-purple-400 to-blue-400 opacity-30" />
                  </div>
                </div>
                
                {/* Metadata Section - Adaptive positioning */}
                <div className={`p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 ${
                  isWideImage 
                    ? 'w-full border-t' // Full width below image for wide images
                    : 'lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l' // Sidebar for square/portrait
                }`}>
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {name}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Token ID: {tokenId}
                      </p>
                      {contractAddress && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 font-mono mt-1">
                          {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
                        </p>
                      )}
                    </div>
                    
                    {/* Description */}
                    {metadata?.description && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                          Description
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {metadata.description}
                        </p>
                      </div>
                    )}
                    
                    {/* Attributes */}
                    {metadata?.attributes && metadata.attributes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
                          Attributes
                        </h3>
                        <div className="space-y-2">
                          {metadata.attributes.map((attr, index) => (
                            <div 
                              key={index}
                              className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
                            >
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                {attr.trait_type}
                              </span>
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {attr.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Technical Info with Aspect Ratio Display */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                        Technical Details
                      </h3>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <div>Standard: ERC-721</div>
                        <div>Network: Base Sepolia</div>
                        <div>Token Bound Account: ✅</div>
                        {imageAspectRatio && (
                          <div className="flex items-center gap-2">
                            <span>Aspect Ratio: {imageAspectRatio.toFixed(2)}:1</span>
                            {isWideImage && (
                              <span className="text-blue-500 font-medium">
                                📐 {imageAspectRatio >= 1.9 ? 'Ultra-wide' : 'Wide format'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="pt-4">
                      <button
                        onClick={() => {
                          if (contractAddress) {
                            const url = `https://sepolia.basescan.org/nft/${contractAddress}/${tokenId}`;
                            window.open(url, '_blank');
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        View on BaseScan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
}