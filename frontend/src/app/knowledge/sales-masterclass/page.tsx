"use client";

/**
 * SALES MASTERCLASS PAGE (App Router)
 * Página del módulo de ventas de 15 minutos
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { Suspense } from 'react';
import Head from 'next/head';
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
        </div>
      </div>
    )
  }
);

export default function SalesMasterclassPage() {
  return (
    <>
      <Head>
        <title>Sales Masterclass - De $0 a $100M en 15 minutos | CryptoGift</title>
        <meta 
          name="description" 
          content="La presentación definitiva de CryptoGift. Descubre cómo revolucionamos Web3 con regalos sin gas, zero custodia y adopción masiva." 
        />
        <meta property="og:title" content="CryptoGift Sales Masterclass - La Revolución Web3" />
        <meta property="og:description" content="15 minutos que cambiarán tu visión del futuro. De regalo a adopción masiva." />
        <meta property="og:image" content="/images/masterclass-og.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-xl">Inicializando experiencia...</p>
          </div>
        </div>
      }>
        <SalesMasterclass />
      </Suspense>
    </>
  );
}