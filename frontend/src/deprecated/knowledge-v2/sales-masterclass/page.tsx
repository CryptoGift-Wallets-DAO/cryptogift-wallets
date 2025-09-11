"use client";

/**
 * SALES MASTERCLASS PAGE (App Router V2)
 * Página del módulo de ventas de 15 minutos
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Import dinámico para evitar SSR issues con animaciones y confetti
const SalesMasterclass = dynamic(
  () => import('../../../components/learn/SalesMasterclass'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Cargando Sales Masterclass...</p>
          <p className="text-gray-400 text-sm mt-2">La experiencia más revolucionaria está llegando...</p>
        </div>
      </div>
    )
  }
);

export default function SalesMasterclassV2Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Inicializando experiencia...</p>
          <p className="text-gray-400 text-sm mt-2">Preparando los 15 minutos más importantes...</p>
        </div>
      </div>
    }>
      <SalesMasterclass />
    </Suspense>
  );
}