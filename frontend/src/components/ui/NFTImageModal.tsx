'use client';
import React, { useEffect } from 'react';
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
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Modal Content */}
            <div 
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-6xl max-h-[90vh] overflow-hidden"
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
              
              {/* Content Layout - Responsive */}
              <div className="flex flex-col lg:flex-row min-h-[300px] max-h-[90vh]">
                {/* Image Section */}
                <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                  <div className="relative max-w-full max-h-full">
                    <NFTImage
                      src={image}
                      alt={name}
                      width={600}
                      height={600}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                      tokenId={tokenId}
                      fit="contain"
                      priority={true}
                    />
                    
                    {/* Image Border Effect */}
                    <div className="absolute inset-0 rounded-lg border-2 border-gradient-to-r from-blue-400 via-purple-400 to-blue-400 opacity-30" />
                  </div>
                </div>
                
                {/* Metadata Section */}
                <div className="lg:w-80 flex-shrink-0 p-6 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700">
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
                    
                    {/* Technical Info */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                        Technical Details
                      </h3>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <div>Standard: ERC-721</div>
                        <div>Network: Base Sepolia</div>
                        <div>Token Bound Account: ✅</div>
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
    </AnimatePresence>
  );
}