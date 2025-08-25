"use client";

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Use Luxury Glass Museum Gallery for ultimate experience
const LuxuryGlassMuseumGallery = dynamic(() => import('./LuxuryGlassMuseumGallery'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent 
                      rounded-full animate-spin mx-auto mb-6 shadow-lg shadow-cyan-400/30" />
        <p className="text-cyan-300 text-lg font-medium">Inicializando Galería de Lujo...</p>
        <p className="text-slate-400 text-sm mt-2">Cargando obras de arte crypto-glass</p>
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
      <div className="w-full h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent 
                        rounded-full animate-spin mx-auto mb-6 shadow-lg shadow-cyan-400/30" />
          <p className="text-cyan-300 text-lg font-medium">Preparando experiencia de lujo...</p>
          <p className="text-slate-400 text-sm mt-2">Calibrando glassmorphism extremo</p>
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

  return <LuxuryGlassMuseumGallery gpuTier={gpuTier} />;
}