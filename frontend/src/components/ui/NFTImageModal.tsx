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
  
  // Extract creator address from metadata attributes
  const getCreatorAddress = () => {
    if (!metadata?.attributes) return null;
    const creatorAttr = metadata.attributes.find(attr => 
      attr.trait_type.toLowerCase() === 'creator' || 
      attr.trait_type.toLowerCase() === 'created by' ||
      attr.trait_type.toLowerCase() === 'creator address'
    );
    return creatorAttr?.value as string;
  };
  
  // Extract correct status from metadata attributes  
  const getCorrectStatus = () => {
    if (!metadata?.attributes) return 'ACTIVE';
    const statusAttr = metadata.attributes.find(attr => 
      attr.trait_type.toLowerCase() === 'status'
    );
    return statusAttr?.value as string || 'ACTIVE';
  };
  
  const creatorAddress = getCreatorAddress();
  const correctStatus = getCorrectStatus();
  
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
  
  // Mobile swipe down to close functionality
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced mobile swipe down to close - Less sensitive, more intentional
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [minDragDistance, setMinDragDistance] = useState(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartTime(Date.now());
    setMinDragDistance(0);
    setDragY(0);
    
    // Only start dragging if touch begins in the top 25% of the screen
    const screenHeight = window.innerHeight;
    const touchInTopArea = touch.clientY < screenHeight * 0.25;
    
    if (touchInTopArea) {
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStartY;
    const timeDiff = Date.now() - touchStartTime;
    
    // Only register downward movement with minimum threshold
    if (deltaY > 20) { // Minimum 20px drag to start registering
      const adjustedDelta = deltaY - 20; // Subtract the threshold
      
      // Calculate velocity (pixels per millisecond)
      const velocity = timeDiff > 0 ? adjustedDelta / timeDiff : 0;
      
      // Only register intentional drag (not accidental taps)
      if (velocity > 0.1 || adjustedDelta > 30) {
        setMinDragDistance(Math.max(minDragDistance, adjustedDelta));
        
        // Add progressive resistance
        const resistedY = adjustedDelta > 80 
          ? 80 + (adjustedDelta - 80) * 0.4 
          : adjustedDelta;
        
        setDragY(resistedY);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    
    setIsDragging(false);
    const timeDiff = Date.now() - touchStartTime;
    const velocity = timeDiff > 0 ? minDragDistance / timeDiff : 0;
    
    // Close only with intentional swipe: good distance AND velocity
    const shouldClose = (
      minDragDistance > 100 && // Minimum distance
      velocity > 0.3 // Minimum velocity (intentional swipe)
    ) || minDragDistance > 150; // OR very long drag (even if slow)
    
    if (shouldClose) {
      onClose();
    }
    
    // Reset all states
    setDragY(0);
    setTouchStartY(0);
    setTouchStartTime(0);
    setMinDragDistance(0);
  };

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
              animate={{ y: dragY }}
              exit={{ y: '100%' }}
              transition={{ duration: isDragging ? 0 : 0.3, ease: 'easeOut' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: `translateY(${dragY}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              {/* Mobile Header with Close Button */}
              <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                    <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">
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
                  <div 
                    className={`w-8 h-1 rounded-full mx-auto transition-all duration-200 ${
                      isDragging && minDragDistance > 60 
                        ? 'bg-green-500 w-12 h-2' 
                        : isDragging && minDragDistance > 20
                        ? 'bg-yellow-500 w-10 h-1.5'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  ></div>
                  <p className={`text-[10px] mt-1 transition-colors duration-200 ${
                    isDragging && minDragDistance > 60
                      ? 'text-green-600 dark:text-green-400 font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {isDragging && minDragDistance > 100 
                      ? '¡Suelta para cerrar!' 
                      : isDragging && minDragDistance > 30
                      ? 'Sigue deslizando...'
                      : 'Desliza DESDE ARRIBA hacia abajo para cerrar'
                    }
                  </p>
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
                    className="w-full max-w-full h-auto object-contain rounded-lg"
                    tokenId={tokenId}
                    fit="contain"
                    priority={true}
                  />
                </div>

                {/* Content Section */}
                <div className="space-y-0.5">
                  {/* Title */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">
                      {name}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Token ID: {tokenId}
                    </p>
                    {contractAddress && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 font-mono mt-1">
                        {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {metadata?.description && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed break-words" style={{ maxWidth: '525px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        {metadata.description}
                      </p>
                    </div>
                  )}


                  {/* Action Button */}
                  <div className="pt-0.5">
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
                {/* Modal Content - Standard layout */}
                <div 
                  className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden max-w-6xl"
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
              
              {/* Content Layout - ADAPTIVE: horizontal for vertical images, vertical for wide images */}
              <div className={`flex min-h-[300px] max-h-[90vh] ${
                imageAspectRatio !== null && imageAspectRatio > 1.0
                  ? 'flex-col' // Vista VERTICAL: imagen arriba, info abajo (para horizontales)
                  : 'flex-col lg:flex-row' // Vista LATERAL: imagen izq, info der (para verticales/cuadradas)
              }`}>
                {/* Image Section - ADAPTIVE based on image orientation */}
                <div className="flex items-center justify-center px-0.5 py-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900"
                     style={{
                       // LÓGICA DUAL: 
                       // - Imágenes verticales/cuadradas (≤1.0): Vista lateral con ancho adaptativo
                       // - Imágenes horizontales (>1.0): Vista vertical con ancho completo
                       ...(imageAspectRatio !== null && imageAspectRatio > 1.0
                         ? {
                             // Vista VERTICAL para horizontales: ancho completo
                             width: '100%',
                             height: '60vh' // Altura limitada para dejar espacio a info abajo
                           }
                         : {
                             // Vista LATERAL para verticales: ancho adaptativo perfecto
                             width: imageAspectRatio !== null ? `${imageAspectRatio * 90}vh` : 'auto',
                             maxWidth: '65vw',
                             flexShrink: 0
                           }
                       )
                     }}>
                  <div className="relative max-w-full max-h-full flex items-center justify-center">
                    <div style={{
                      // LÓGICA DUAL para tamaño de imagen:
                      ...(imageAspectRatio !== null && imageAspectRatio > 1.0
                        ? {
                            // Vista VERTICAL para horizontales: altura controlada
                            height: '58vh',
                            width: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }
                        : {
                            // Vista LATERAL para verticales: altura completa (PERFECTA)
                            height: '90vh',
                            width: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }
                      )
                    }}>
                      <NFTImage
                        src={image}
                        alt={name}
                        width={600}
                        height={600}
                        className="object-contain rounded-lg shadow-lg max-w-full max-h-full"
                        tokenId={tokenId}
                        fit="contain"
                        priority={true}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Metadata Section - ADAPTIVE positioning with depth effect */}
                <div className={`p-6 border-slate-200 dark:border-slate-700 ${
                  imageAspectRatio !== null && imageAspectRatio > 1.0
                    ? 'w-full border-t shadow-lg bg-blue-50 dark:bg-blue-900/20' // Vista VERTICAL: info abajo con fondo azul para debug
                    : 'lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l shadow-xl bg-white dark:bg-slate-900' // Vista LATERAL: sidebar normal
                }`}
                style={{
                  // Efecto de profundidad que separa la info de la imagen
                  ...(imageAspectRatio !== null && imageAspectRatio <= 1.0 && {
                    // Solo en vista lateral: efecto de plano anterior
                    boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1), -4px 0 10px -2px rgba(0, 0, 0, 0.05)',
                    zIndex: 10,
                    position: 'relative'
                  })
                }}>
                  {/* 📊 DISTRIBUCIÓN MATEMÁTICAMENTE EXACTA DE INFORMACIÓN */}
                  {imageAspectRatio !== null && imageAspectRatio > 1.0 ? (
                    /* 🔸 VISTA HORIZONTAL: 2 BLOQUES 50%-50% */
                    <div className="grid grid-cols-2 gap-0.5 h-full">
                      {/* BLOQUE IZQUIERDO - 50% */}
                      <div className="space-y-0.5 flex flex-col justify-between">
                        {/* Title & IDs */}
                        <div>
                          <h2 className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5 truncate">
                            {name}
                          </h2>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-0.5">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                ID: {tokenId}
                              </span>
                              <button 
                                onClick={() => {
                                  if (navigator.clipboard && window.isSecureContext) {
                                    navigator.clipboard.writeText(tokenId);
                                  } else {
                                    const textArea = document.createElement('textarea');
                                    textArea.value = tokenId;
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-999999px';
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try { document.execCommand('copy'); } finally { document.body.removeChild(textArea); }
                                  }
                                }}
                                className="text-[10px] bg-slate-100 dark:bg-slate-700 px-0.5 py-0 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              >
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            {contractAddress && (
                              <div>
                                <span className="text-[9px] text-slate-500 dark:text-slate-500">Contract:</span>
                                <div className="flex items-center gap-0.5">
                                  <span className="font-mono text-[9px] text-slate-700 dark:text-slate-300 truncate">
                                    {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                                  </span>
                                  <button 
                                    onClick={() => {
                                      if (navigator.clipboard && window.isSecureContext) {
                                        navigator.clipboard.writeText(contractAddress);
                                      } else {
                                        const textArea = document.createElement('textarea');
                                        textArea.value = contractAddress;
                                        textArea.style.position = 'fixed';
                                        textArea.style.left = '-999999px';
                                        document.body.appendChild(textArea);
                                        textArea.select();
                                        try { document.execCommand('copy'); } finally { document.body.removeChild(textArea); }
                                      }
                                    }}
                                    className="text-[9px] bg-slate-100 dark:bg-slate-700 px-0.5 py-0 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                  >
                                    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* NFT Core Info */}
                        <div>
                          <h3 className="text-[10px] font-medium text-slate-900 dark:text-white mb-0.5">NFT Info</h3>
                          <div className="space-y-0.5">
                            <div className="flex justify-between items-center px-0.5 py-0 bg-slate-50 dark:bg-slate-800 rounded text-[9px]">
                              <span className="text-slate-600 dark:text-slate-400">Type</span>
                              <span className="font-medium text-slate-900 dark:text-white">ERC-6551</span>
                            </div>
                            <div className="flex justify-between items-center px-0.5 py-0 bg-slate-50 dark:bg-slate-800 rounded text-[9px]">
                              <span className="text-slate-600 dark:text-slate-400">Network</span>
                              <span className="font-medium text-slate-900 dark:text-white">Base</span>
                            </div>
                            <div className="flex justify-between items-center px-0.5 py-0 bg-slate-50 dark:bg-slate-800 rounded text-[9px]">
                              <span className="text-slate-600 dark:text-slate-400">Status</span>
                              <span className={`font-medium ${
                                correctStatus === 'CLAIMED' ? 'text-blue-600 dark:text-blue-400' : 
                                correctStatus === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : 
                                'text-red-600 dark:text-red-400'
                              }`}>{correctStatus}</span>
                            </div>
                            {creatorAddress && (
                              <div className="flex justify-between items-center px-0.5 py-0 bg-slate-50 dark:bg-slate-800 rounded text-[10px]">
                                <span className="text-slate-600 dark:text-slate-400">Creator</span>
                                <div className="flex items-center gap-0.5">
                                  <span className="font-medium text-slate-900 dark:text-white font-mono">
                                    {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
                                  </span>
                                  <button 
                                    onClick={() => {
                                      if (navigator.clipboard && window.isSecureContext) {
                                        navigator.clipboard.writeText(creatorAddress);
                                      } else {
                                        const textArea = document.createElement('textarea');
                                        textArea.value = creatorAddress;
                                        textArea.style.position = 'fixed';
                                        textArea.style.left = '-999999px';
                                        document.body.appendChild(textArea);
                                        textArea.select();
                                        try { document.execCommand('copy'); } finally { document.body.removeChild(textArea); }
                                      }
                                    }}
                                    className="text-[10px] bg-slate-200 dark:bg-slate-700 px-0.5 py-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                  >
                                    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* BLOQUE DERECHO - 50% */}
                      <div className="space-y-0.5 flex flex-col justify-between">
                        {/* Description (moved from left block) */}
                        {metadata?.description && (
                          <div>
                            <h3 className="text-[10px] font-medium text-slate-900 dark:text-white mb-0.5">Description</h3>
                            <p className="text-[9px] text-slate-600 dark:text-slate-400 leading-relaxed max-h-20 overflow-y-auto break-words" style={{ maxWidth: '245px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                              {metadata.description}
                            </p>
                          </div>
                        )}

                        {/* Technical Details */}
                        <div>
                          <h3 className="text-[10px] font-medium text-slate-900 dark:text-white mb-0.5">Technical</h3>
                          <div className="space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                            <div className="flex justify-between">
                              <span>Standard:</span>
                              <span className="font-medium">ERC-721</span>
                            </div>
                            <div className="flex justify-between">
                              <span>TBA:</span>
                              <span className="font-medium text-green-600">✅</span>
                            </div>
                            {imageAspectRatio && (
                              <div className="flex justify-between">
                                <span>Ratio:</span>
                                <span className="font-medium">{imageAspectRatio.toFixed(2)}:1</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div>
                          <button
                            onClick={() => {
                              if (contractAddress) {
                                const url = `https://sepolia.basescan.org/nft/${contractAddress}/${tokenId}`;
                                window.open(url, '_blank');
                              }
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-2 rounded text-[10px] transition-colors"
                          >
                            View on BaseScan
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 🔸 VISTA VERTICAL: 1 BLOQUE COMPACTO */
                    <div className="space-y-0.5">
                      {/* Title & IDs - Compacto */}
                      <div>
                        <h2 className="text-[14px] font-bold text-slate-900 dark:text-white mb-0.5">
                          {name}
                        </h2>
                        <div className="flex items-center gap-0.5 mb-0.5">
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">
                            Token ID: {tokenId}
                          </span>
                          <button 
                            onClick={() => {
                              if (navigator.clipboard && window.isSecureContext) {
                                navigator.clipboard.writeText(tokenId);
                              } else {
                                const textArea = document.createElement('textarea');
                                textArea.value = tokenId;
                                textArea.style.position = 'fixed';
                                textArea.style.left = '-999999px';
                                document.body.appendChild(textArea);
                                textArea.select();
                                try { document.execCommand('copy'); } finally { document.body.removeChild(textArea); }
                              }
                            }}
                            className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        {contractAddress && (
                          <div className="flex items-center gap-0.5">
                            <span className="text-[10px] text-slate-500 dark:text-slate-500">Contract:</span>
                            <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                              {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                            </span>
                            <button 
                              onClick={() => {
                                if (navigator.clipboard && window.isSecureContext) {
                                  navigator.clipboard.writeText(contractAddress);
                                } else {
                                  const textArea = document.createElement('textarea');
                                  textArea.value = contractAddress;
                                  textArea.style.position = 'fixed';
                                  textArea.style.left = '-999999px';
                                  document.body.appendChild(textArea);
                                  textArea.select();
                                  try { document.execCommand('copy'); } finally { document.body.removeChild(textArea); }
                                }
                              }}
                              className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            </button>
                          </div>
                        )}
                      </div>


                      {/* NFT Info - Compacto */}
                      <div>
                        <h3 className="text-[11px] font-medium text-slate-900 dark:text-white mb-0.5">NFT Information</h3>
                        <div className="space-y-0.5">
                          <div className="flex justify-between items-center px-0.5 py-0 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Wallet Type</span>
                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white">ERC-6551 TBA</span>
                          </div>
                          <div className="flex justify-between items-center px-0.5 py-0 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Network</span>
                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white">Base Sepolia</span>
                          </div>
                          <div className="flex justify-between items-center px-0.5 py-0 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Status</span>
                            <span className={`text-[11px] font-semibold ${
                              correctStatus === 'CLAIMED' ? 'text-blue-600 dark:text-blue-400' : 
                              correctStatus === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : 
                              'text-red-600 dark:text-red-400'
                            }`}>{correctStatus}</span>
                          </div>
                          {creatorAddress && (
                            <div className="flex justify-between items-center px-0.5 py-0 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Creator</span>
                              <div className="flex items-center gap-0.5">
                                <span className="text-[11px] font-semibold text-slate-900 dark:text-white font-mono">
                                  {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
                                </span>
                                <button 
                                  onClick={() => {
                                    if (navigator.clipboard && window.isSecureContext) {
                                      navigator.clipboard.writeText(creatorAddress);
                                    } else {
                                      const textArea = document.createElement('textarea');
                                      textArea.value = creatorAddress;
                                      textArea.style.position = 'fixed';
                                      textArea.style.left = '-999999px';
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      try { document.execCommand('copy'); } finally { document.body.removeChild(textArea); }
                                    }
                                  }}
                                  className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description - Now has more space */}
                      {metadata?.description && (
                        <div>
                          <h3 className="text-[11px] font-medium text-slate-900 dark:text-white mb-0.5">Description</h3>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-0.5 py-0 max-h-32 overflow-y-auto">
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed break-words" style={{ maxWidth: '435px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                              {metadata.description}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Technical Details - Compacto */}
                      <div className="pt-0.5 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="text-[11px] font-medium text-slate-900 dark:text-white mb-0.5">Technical Details</h3>
                        <div className="space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                          <div>Standard: ERC-721</div>
                          <div>Network: Base Sepolia</div>
                          <div>Token Bound Account: ✅</div>
                          {imageAspectRatio && (
                            <div className="flex items-center gap-0.5">
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

                      {/* Action Button - Compacto */}
                      <div className="pt-0.5">
                        <button
                          onClick={() => {
                            if (contractAddress) {
                              const url = `https://sepolia.basescan.org/nft/${contractAddress}/${tokenId}`;
                              window.open(url, '_blank');
                            }
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-0.5 px-4 rounded-lg transition-colors text-[11px]"
                        >
                          View on BaseScan
                        </button>
                      </div>
                    </div>
                  )}
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