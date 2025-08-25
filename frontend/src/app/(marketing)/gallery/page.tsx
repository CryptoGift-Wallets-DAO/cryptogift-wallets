"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Sparkles, Shield, Zap, Globe, Loader2 } from 'lucide-react';

// Gallery 3D component will be lazily loaded
const Gallery3D = React.lazy(() => import('@/components/Gallery3D/Gallery3D').catch(() => {
  // Fallback if 3D dependencies are not installed
  return { default: () => <Gallery2DFallback /> };
}));

function Gallery2DFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
      
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 
                       bg-clip-text text-transparent mb-4">
            CryptoGift Gallery
          </h1>
          <p className="text-gray-300 text-xl">
            Experiencia inmersiva de arte digital y tecnología blockchain
          </p>
        </div>

        {/* 2D Grid Layout as Fallback */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Wall 1 - NFT Collection */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-800/50 to-purple-900/50 
                        backdrop-blur-xl border border-purple-500/30 p-8 hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 
                          group-hover:opacity-100 transition-opacity duration-500" />
            <Sparkles className="w-12 h-12 text-purple-400 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-3">Colección NFT Exclusiva</h2>
            <p className="text-purple-200 mb-6">
              Descubre arte digital único creado con IA y verificado en blockchain
            </p>
            <Image 
              src="/Arte-IA-Personalizado.png" 
              alt="AI Art" 
              width={200} 
              height={200}
              className="rounded-xl mx-auto opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Wall 2 - Wallet Features */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-800/50 to-blue-900/50 
                        backdrop-blur-xl border border-blue-500/30 p-8 hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 
                          group-hover:opacity-100 transition-opacity duration-500" />
            <Shield className="w-12 h-12 text-blue-400 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-3">Wallets Inteligentes</h2>
            <p className="text-blue-200 mb-6">
              Seguridad avanzada con abstracción de cuentas y gasless transactions
            </p>
            <Image 
              src="/cg-wallet-logo.png" 
              alt="CG Wallet" 
              width={200} 
              height={200}
              className="rounded-xl mx-auto opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Wall 3 - Knowledge System */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-800/50 to-green-900/50 
                        backdrop-blur-xl border border-green-500/30 p-8 hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-0 
                          group-hover:opacity-100 transition-opacity duration-500" />
            <Zap className="w-12 h-12 text-green-400 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-3">Academia Blockchain</h2>
            <p className="text-green-200 mb-6">
              Aprende con nuestro sistema educativo gamificado y obtén certificados NFT
            </p>
            <Image 
              src="/knowledge-logo.png" 
              alt="Knowledge" 
              width={200} 
              height={200}
              className="rounded-xl mx-auto opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Wall 4 - Community */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-800/50 to-orange-900/50 
                        backdrop-blur-xl border border-orange-500/30 p-8 hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 
                          group-hover:opacity-100 transition-opacity duration-500" />
            <Globe className="w-12 h-12 text-orange-400 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-3">Comunidad Global</h2>
            <p className="text-orange-200 mb-6">
              Únete a creadores y coleccionistas de todo el mundo
            </p>
            <Image 
              src="/Apex.PNG" 
              alt="apeX" 
              width={200} 
              height={200}
              className="rounded-xl mx-auto opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Link href="/create" className="inline-flex items-center gap-3 px-8 py-4 
                                        bg-gradient-to-r from-purple-600 to-blue-600 
                                        hover:from-purple-700 hover:to-blue-700 
                                        text-white font-semibold rounded-full 
                                        transform hover:scale-105 transition-all duration-300 
                                        shadow-2xl shadow-purple-500/30">
            <Sparkles className="w-5 h-5" />
            Crear Mi Primera NFT Wallet
            <Sparkles className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 
                     bg-clip-text text-transparent">
          Cargando Experiencia Inmersiva
        </h2>
        <p className="text-gray-400 mt-2">Preparando el museo digital...</p>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [show3D, setShow3D] = useState(false);
  const [gpuTier, setGpuTier] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    // Check if 3D should be enabled based on device capabilities
    const checkCapabilities = async () => {
      try {
        // Check WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!gl) {
          console.log('WebGL not supported, using 2D fallback');
          return;
        }

        // Simple GPU tier detection based on renderer
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          console.log('GPU Renderer:', renderer);
          
          // Basic tier detection
          if (renderer.includes('Intel') || renderer.includes('Mali')) {
            setGpuTier('low');
          } else if (renderer.includes('GTX') || renderer.includes('Radeon')) {
            setGpuTier('medium');
          } else if (renderer.includes('RTX') || renderer.includes('M1') || renderer.includes('M2')) {
            setGpuTier('high');
          }
        }

        // Enable 3D if WebGL is supported
        setShow3D(true);
      } catch (error) {
        console.error('Error checking 3D capabilities:', error);
      }
    };

    checkCapabilities();
  }, []);

  return (
    <>
      {/* Back Button */}
      <Link href="/" className="fixed top-6 left-6 z-40 p-3 rounded-xl 
                               bg-black/50 backdrop-blur-sm border border-purple-500/30 
                               hover:bg-black/70 transition-all group">
        <ArrowLeft className="w-5 h-5 text-purple-400 group-hover:text-white" />
      </Link>

      {/* Main Content */}
      {show3D ? (
        <Suspense fallback={<LoadingScreen />}>
          <Gallery3D gpuTier={gpuTier} />
        </Suspense>
      ) : (
        <Gallery2DFallback />
      )}
    </>
  );
}