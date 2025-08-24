"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Heart, Users, Target, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 
                     dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary">
      {/* Back Button */}
      <Link href="/" className="fixed top-6 left-6 z-10 p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 
                                backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 
                                hover:bg-white dark:hover:bg-gray-700 transition-all group">
        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
      </Link>

      <div className="mx-auto max-w-4xl px-6 py-20">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-3xl opacity-20 animate-pulse" />
            <div className="relative bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
              <Image 
                src="/cg-wallet-logo.png" 
                alt="CryptoGift Wallet" 
                width={120} 
                height={120} 
                className="mx-auto mb-6"
              />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                           dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Acerca de CryptoGift
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">
                Nuestra Historia y Misión
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl 
                      border border-gray-200/50 dark:border-gray-700/50 mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
            <span className="text-2xl font-semibold text-gray-900 dark:text-white">
              Próximamente
            </span>
            <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
          </div>
          
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Estamos preparando una historia increíble para compartir contigo.
          </p>

          {/* Feature Preview */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 
                          dark:from-gray-700/50 dark:to-gray-600/50">
              <Heart className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Nuestra Pasión</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Democratizar el acceso a las criptomonedas
              </p>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 
                          dark:from-gray-700/50 dark:to-gray-600/50">
              <Users className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Nuestro Equipo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Expertos en blockchain y diseño
              </p>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 
                          dark:from-gray-700/50 dark:to-gray-600/50">
              <Target className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Nuestra Visión</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                El futuro de los regalos digitales
              </p>
            </div>
          </div>
        </div>

        {/* Assistant Preview */}
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 
                      border border-indigo-200/50 dark:border-indigo-700/50">
          <div className="flex items-center gap-4">
            <Image 
              src="/Apex.PNG" 
              alt="apeX Assistant" 
              width={60} 
              height={60} 
              className="rounded-xl"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Conoce a apeX
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nuestro asistente IA te guiará cuando lancemos esta sección
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}