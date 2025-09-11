"use client";

import React, { useEffect, useState } from 'react';
import { TBAWalletContainer } from './index';

interface RightSlideWalletProps {
  isOpen: boolean;
  onClose: () => void;
  nftContract: string;
  tokenId: string;
}

export const RightSlideWallet: React.FC<RightSlideWalletProps> = ({
  isOpen,
  onClose,
  nftContract,
  tokenId
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Prevent body scroll when wallet is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll when wallet is closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur effect */}
      <div 
        className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
          isAnimating 
            ? 'bg-black bg-opacity-30 backdrop-blur-sm' 
            : 'bg-transparent'
        }`}
        onClick={handleBackdropClick}
      />
      
      {/* Right slide panel */}
      <div 
        className={`fixed top-0 right-0 h-full z-50 transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '480px', maxWidth: '90vw' }}
      >
        {/* Panel background with shadow */}
        <div className="h-full bg-white shadow-2xl border-l border-gray-200 relative">
          {/* Close button overlay */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-lg border border-gray-200 transition-all hover:scale-105"
            title="Cerrar Wallet"
          >
            <svg 
              className="w-5 h-5 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Wallet content with full height */}
          <div className="h-full overflow-hidden">
            <TBAWalletContainer
              nftContract={nftContract}
              tokenId={tokenId}
              onClose={handleClose}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Mobile responsive adjustments */}
      <style jsx>{`
        @media (max-width: 768px) {
          .fixed[style*="width: 480px"] {
            width: 100vw !important;
          }
        }
      `}</style>
    </>
  );
};