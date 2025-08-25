"use client";

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Gallery3DContent is always available (CSS 3D fallback)
const Gallery3DContent = dynamic(() => import('./Gallery3DContent'), { 
  ssr: false 
});

interface Gallery3DProps {
  gpuTier: 'low' | 'medium' | 'high';
}

export default function Gallery3D({ gpuTier }: Gallery3DProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure client-side only
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent 
                        rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-400">Inicializando museo digital...</p>
        </div>
      </div>
    );
  }

  // Quality settings based on GPU tier
  const qualitySettings = {
    low: {
      shadows: false,
      antialias: false,
      dpr: [1, 1],
      performance: { min: 0.5, max: 1 }
    },
    medium: {
      shadows: true,
      antialias: true,
      dpr: [1, 1.5],
      performance: { min: 0.8, max: 1 }
    },
    high: {
      shadows: true,
      antialias: true,
      dpr: [1, 2],
      performance: { min: 1, max: 1 }
    }
  };

  const settings = qualitySettings[gpuTier];

  return (
    <div className="w-full h-screen bg-black relative">
      <Gallery3DContent gpuTier={gpuTier} />

      {/* UI Overlay */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 
                    bg-black/50 backdrop-blur-md rounded-full px-6 py-3 
                    border border-purple-500/30">
        <div className="flex items-center gap-6 text-sm">
          <button className="text-purple-400 hover:text-white transition-colors">
            Vista General
          </button>
          <span className="text-gray-500">|</span>
          <button className="text-purple-400 hover:text-white transition-colors">
            NFT Collection
          </button>
          <span className="text-gray-500">|</span>
          <button className="text-purple-400 hover:text-white transition-colors">
            Wallets
          </button>
          <span className="text-gray-500">|</span>
          <button className="text-purple-400 hover:text-white transition-colors">
            Academia
          </button>
          <span className="text-gray-500">|</span>
          <button className="text-purple-400 hover:text-white transition-colors">
            Comunidad
          </button>
        </div>
      </div>

      {/* GPU Tier Indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm 
                      rounded px-3 py-1 text-xs text-purple-400 
                      border border-purple-500/30">
          GPU: {gpuTier.toUpperCase()}
        </div>
      )}
    </div>
  );
}