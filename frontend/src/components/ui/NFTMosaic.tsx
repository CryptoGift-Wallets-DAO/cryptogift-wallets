'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { NFTImage } from '../NFTImage';

// Real NFT metadata interface
interface NFTData {
  id: string;
  name: string;
  image: string;
  contractAddress: string;
  tokenId: string;
}

// Enhanced mosaic props
interface NFTMosaicProps {
  nfts?: NFTData[];
  intensity?: 'subtle' | 'medium' | 'bold';
  animation?: 'wave' | 'cascade' | 'random';
  showLabels?: boolean;
  className?: string;
}

export function NFTMosaic({ 
  nfts = [], 
  intensity = 'subtle',
  animation = 'wave',
  showLabels = false,
  className = ''
}: NFTMosaicProps) {
  const { theme } = useTheme();
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  // Dynamic grid configuration for different screen sizes
  const gridConfig = {
    desktop: { cols: 12, rows: 8, total: 96 },
    tablet: { cols: 8, rows: 6, total: 48 },
    mobile: { cols: 6, rows: 4, total: 24 }
  };
  
  // Use desktop config as default (responsive handled by CSS)
  const { cols, total } = gridConfig.desktop;
  
  // Generate mosaic items with real NFTs or elegant placeholders
  const mosaicItems = Array.from({ length: total }, (_, i) => {
    const nft = nfts[i % Math.max(nfts.length, 1)];
    return {
      id: i,
      nft,
      delay: animation === 'wave' 
        ? (i % cols) * 0.1 + Math.floor(i / cols) * 0.05
        : animation === 'cascade'
        ? i * 0.02
        : Math.random() * 1.5,
      row: Math.floor(i / cols),
      col: i % cols
    };
  });
  
  // Intensity configurations
  const intensityConfig = {
    subtle: {
      opacity: '0.15',
      blur: '12px',
      scale: 0.95,
      borderRadius: '8px'
    },
    medium: {
      opacity: '0.25', 
      blur: '8px',
      scale: 0.98,
      borderRadius: '6px'
    },
    bold: {
      opacity: '0.35',
      blur: '4px', 
      scale: 1,
      borderRadius: '4px'
    }
  };
  
  const config = intensityConfig[intensity];
  
  const handleImageLoad = (itemId: string) => {
    setLoadedImages(prev => new Set([...prev, itemId]));
  };
  
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* ENHANCED MOSAIC GRID */}
      <motion.div
        className={`absolute inset-0 
                   grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 
                   gap-[2px] md:gap-1 p-2 md:p-4`}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ 
          opacity: config.opacity,
          scale: config.scale
        }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          filter: `blur(${config.blur})`
        }}
      >
        <AnimatePresence>
          {mosaicItems.map((item) => (
            <motion.div
              key={item.id}
              className="aspect-square relative overflow-hidden group"
              style={{
                borderRadius: config.borderRadius
              }}
              initial={{ 
                scale: 0, 
                rotate: -180,
                opacity: 0
              }}
              animate={{ 
                scale: 1, 
                rotate: 0,
                opacity: 1
              }}
              transition={{ 
                delay: item.delay,
                duration: 0.8,
                ease: "easeOut",
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ 
                scale: 1.05,
                zIndex: 10,
                opacity: 0.8,
                transition: { duration: 0.2 }
              }}
            >
              {/* NFT IMAGE WITH PROPER DIMENSIONS */}
              {item.nft ? (
                <div className="relative w-full h-full">
                  <NFTImage
                    src={item.nft.image}
                    alt={item.nft.name}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                    tokenId={item.nft.tokenId}
                    onLoad={() => handleImageLoad(item.id.toString())}
                  />
                  
                  {/* ELEGANT OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/30" />
                  
                  {/* OPTIONAL LABEL */}
                  {showLabels && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 p-1 
                               bg-gradient-to-t from-black/80 to-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: item.delay + 0.5 }}
                    >
                      <span className="text-white text-[8px] font-medium truncate block">
                        #{item.nft.tokenId}
                      </span>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* ELEGANT PLACEHOLDER */
                <div className="w-full h-full relative overflow-hidden">
                  {/* BASE GRADIENT */}
                  <div className="absolute inset-0 bg-gradient-to-br 
                                from-slate-200 via-blue-100 to-purple-100
                                dark:from-slate-800 dark:via-blue-900 dark:to-purple-900" />
                  
                  {/* GEOMETRIC PATTERN */}
                  <div className="absolute inset-0 opacity-20">
                    <div 
                      className="w-full h-full"
                      style={{
                        backgroundImage: `
                          radial-gradient(circle at ${(item.col + 1) * 20}% ${(item.row + 1) * 25}%, 
                            rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                          linear-gradient(${item.id * 30}deg, 
                            rgba(139, 92, 246, 0.2) 0%, 
                            rgba(59, 130, 246, 0.2) 100%)
                        `
                      }}
                    />
                  </div>
                  
                  {/* SUBTLE LOGO */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-white/30 dark:bg-black/30 
                                  flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br 
                                    from-blue-400 to-purple-400" />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ENHANCED BLUR OVERLAY WITH DEPTH */}
      <div className="absolute inset-0">
        {/* Primary blur layer */}
        <div className="absolute inset-0 backdrop-blur-[12px] 
                       bg-white/40 dark:bg-slate-900/60" />
        
        {/* Secondary depth layer */}
        <div className="absolute inset-0 
                       bg-gradient-to-br from-white/20 via-transparent to-black/10
                       dark:from-black/20 dark:via-transparent dark:to-white/5" />
        
        {/* Luxury accent border */}
        <div className="absolute inset-0 
                       bg-gradient-to-r from-transparent via-blue-500/10 to-transparent
                       dark:via-purple-400/10" />
      </div>
      
      {/* FLOATING PARTICLES FOR LUXURY FEEL */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-blue-400/30 dark:bg-purple-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0.3, 0.7, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
}