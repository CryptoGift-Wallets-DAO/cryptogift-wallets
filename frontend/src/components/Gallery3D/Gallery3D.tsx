"use client";

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Use Modern Museum Gallery for immersive experience
const ModernMuseumGallery = dynamic(() => import('./ModernMuseumGallery'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent 
                      rounded-full animate-spin mx-auto mb-4" />
        <p className="text-cyan-400">Inicializando museo digital...</p>
      </div>
    </div>
  )
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

  return <ModernMuseumGallery gpuTier={gpuTier} />;
}