"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Search, Filter, TrendingUp, Star, Clock, Grid3x3 } from 'lucide-react';

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 
                     dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary">
      {/* Back Button */}
      <Link href="/" className="fixed top-6 left-6 z-10 p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 
                                backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 
                                hover:bg-white dark:hover:bg-gray-700 transition-all group">
        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
      </Link>

      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl blur-3xl opacity-20 animate-pulse" />
            <div className="relative bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Image 
                  src="/Arte-IA-Personalizado.png" 
                  alt="AI Art" 
                  width={80} 
                  height={80} 
                  className="rounded-xl"
                />
                <Search className="w-12 h-12 text-purple-500" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 
                           dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                Explorar NFT-Wallets
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">
                Descubre creaciones únicas
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl 
                      border border-gray-200/50 dark:border-gray-700/50 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                          bg-gradient-to-r from-purple-500/20 to-blue-500/20 mb-4">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                Lanzamiento próximo
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Marketplace de NFT-Wallets
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Pronto podrás explorar, filtrar y descubrir miles de NFT-Wallets únicos creados por nuestra comunidad.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 text-center">
              <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Trending</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Los más populares
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 text-center">
              <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Featured</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Selección curada
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 text-center">
              <Filter className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Filtros</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Por categoría
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 text-center">
              <Grid3x3 className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Colecciones</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Series temáticas
              </p>
            </div>
          </div>
        </div>

        {/* Preview Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm 
                                  border border-gray-200/50 dark:border-gray-700/50">
              <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 
                            dark:from-gray-700 dark:to-gray-600 mb-3 animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}