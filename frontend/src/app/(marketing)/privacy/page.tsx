"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Database, Key, AlertCircle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 
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
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-3xl opacity-20 animate-pulse" />
            <div className="relative bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
              <Shield className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 
                           dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Política de Privacidad
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">
                Tu privacidad es nuestra prioridad
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl 
                      border border-gray-200/50 dark:border-gray-700/50 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                          bg-gradient-to-r from-indigo-500/20 to-purple-500/20 mb-4">
              <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                Documentación en proceso
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Política completa próximamente
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Estamos redactando una política de privacidad completa y transparente que detalle 
              exactamente cómo protegemos tu información.
            </p>
          </div>

          {/* Privacy Principles */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 
                          dark:from-gray-700/50 dark:to-gray-600/50">
              <Eye className="w-8 h-8 text-indigo-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Transparencia Total
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Siempre serás informado sobre qué datos recolectamos y por qué
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 
                          dark:from-gray-700/50 dark:to-gray-600/50">
              <Database className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Mínima Recolección
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Solo recolectamos los datos esenciales para el funcionamiento
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 
                          dark:from-gray-700/50 dark:to-gray-600/50">
              <Key className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Encriptación Fuerte
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Todos los datos sensibles están encriptados end-to-end
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 
                          dark:from-gray-700/50 dark:to-gray-600/50">
              <Shield className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Tu Control Total
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tienes control completo sobre tus datos y puedes eliminarlos
              </p>
            </div>
          </div>

          {/* Important Note */}
          <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 
                        dark:border-yellow-700 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Nota importante:</strong> Mientras preparamos nuestra política completa, 
                ten la seguridad de que no compartimos ni vendemos tu información personal a terceros.
              </p>
            </div>
          </div>
        </div>

        {/* Logo Footer */}
        <div className="text-center">
          <Image 
            src="/logo.png" 
            alt="CryptoGift" 
            width={150} 
            height={50} 
            className="mx-auto opacity-50"
          />
        </div>
      </div>
    </main>
  );
}