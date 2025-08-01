'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { NFTMosaic } from '../ui/NFTMosaic';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useNFTMosaicDataLite } from '../../hooks/useNFTMosaicData';

interface GlassHeaderProps {
  children: React.ReactNode;
  showMosaic?: boolean;
  mosaicIntensity?: 'subtle' | 'medium' | 'bold';
  className?: string;
}

export function GlassHeader({ 
  children, 
  showMosaic = true,
  mosaicIntensity = 'subtle',
  className = ''
}: GlassHeaderProps) {
  // Get real NFT data for the mosaic
  const { nfts, isLoading, error } = useNFTMosaicDataLite(16);
  
  return (
    <motion.header
      className={`relative glass-panel border-0 border-b border-white/20 dark:border-slate-700/30 ${className}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ENHANCED NFT MOSAIC BACKGROUND */}
      {showMosaic && (
        <NFTMosaic 
          nfts={nfts}
          intensity={mosaicIntensity}
          animation="wave"
          showLabels={false}
        />
      )}
      
      {/* HEADER CONTENT WITH ENHANCED STYLING */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center space-x-4 md:space-x-6">
          {/* ENHANCED LOGO */}
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* LOGO ICON */}
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 
                           flex items-center justify-center shadow-lg shadow-blue-500/25">
                <div className="w-6 h-6 rounded-lg bg-white dark:bg-black/20 
                             flex items-center justify-center">
                  <div className="w-3 h-3 rounded-md bg-gradient-to-br from-blue-400 to-purple-400" />
                </div>
              </div>
              
              {/* SUBTLE GLOW EFFECT */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 
                           opacity-20 blur-sm -z-10" />
            </div>
            
            {/* TITLE */}
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                         bg-clip-text text-transparent">
              CryptoGift Wallets
            </h1>
          </motion.div>
          
          {/* THEME TOGGLE */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <ThemeToggle />
          </motion.div>
        </div>
        
        {/* NAVIGATION AND OTHER ELEMENTS */}
        <motion.div 
          className="flex items-center space-x-3 md:space-x-4"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {children}
        </motion.div>
      </div>
      
      {/* LUXURY ACCENT LINE */}
      <div className="absolute bottom-0 left-0 right-0 h-px">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent blur-sm" />
      </div>
      
      {/* STATUS INDICATORS */}
      {showMosaic && (
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          {/* NFT Load Status */}
          {isLoading && (
            <motion.div 
              className="w-2 h-2 rounded-full bg-blue-400/60"
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          
          {/* Success Indicator */}
          {!isLoading && !error && nfts.length > 0 && (
            <div className="w-2 h-2 rounded-full bg-green-400/60" />
          )}
          
          {/* Error Indicator */}
          {error && (
            <div className="w-2 h-2 rounded-full bg-red-400/60" />
          )}
        </div>
      )}
    </motion.header>
  );
}