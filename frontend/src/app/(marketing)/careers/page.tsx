"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Rocket, Code, Palette, Globe, Coffee } from 'lucide-react';

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 
                     dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary">
      {/* Back Button */}
      <Link href="/" className="fixed top-6 left-6 z-10 p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 
                                backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 
                                hover:bg-white dark:hover:bg-gray-700 transition-all group">
        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
      </Link>

      <div className="mx-auto max-w-4xl px-6 py-20">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 rounded-3xl blur-3xl opacity-20 animate-pulse" />
            <div className="relative bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-center gap-6 mb-6">
                <Image 
                  src="/RLGra95.PNG" 
                  alt="RLG Assistant" 
                  width={70} 
                  height={70} 
                  className="rounded-xl"
                />
                <Briefcase className="w-12 h-12 text-green-500" />
                <Image 
                  src="/knowledge-logo.png" 
                  alt="Knowledge" 
                  width={70} 
                  height={70} 
                  className="rounded-xl"
                />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 
                           dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
                Únete a Nuestro Equipo
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">
                Construye el futuro de los regalos digitales
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl 
                      border border-gray-200/50 dark:border-gray-700/50 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                          bg-gradient-to-r from-green-500/20 to-blue-500/20 mb-4">
              <Rocket className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                Estamos creciendo
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Oportunidades próximamente
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Estamos preparando nuevas posiciones para expandir nuestro equipo. 
              Mientras tanto, conoce lo que buscamos en nuestros futuros colaboradores.
            </p>
          </div>

          {/* Positions Preview */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 border border-purple-200/50 
                          dark:border-purple-700/50">
              <Code className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Desarrolladores Blockchain
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Solidity, Web3, Smart Contracts
              </p>
              <div className="mt-3 flex gap-2">
                <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 
                               text-xs text-purple-600 dark:text-purple-400">
                  Remote
                </span>
                <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 
                               text-xs text-purple-600 dark:text-purple-400">
                  Full-time
                </span>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 border border-blue-200/50 
                          dark:border-blue-700/50">
              <Palette className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Diseñadores UI/UX
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Figma, Design Systems, Web3 UX
              </p>
              <div className="mt-3 flex gap-2">
                <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 
                               text-xs text-blue-600 dark:text-blue-400">
                  Remote
                </span>
                <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 
                               text-xs text-blue-600 dark:text-blue-400">
                  Contract
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Culture Card */}
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl p-6 
                      border border-orange-200/50 dark:border-orange-700/50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <Coffee className="w-8 h-8 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Nuestra Cultura
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                100% remoto • Horario flexible • Innovación constante • Equipo global
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}