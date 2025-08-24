"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, FileText, Scale, CheckCircle, Info, BookOpen, Gavel } from 'lucide-react';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 
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
            <div className="absolute inset-0 bg-gradient-to-r from-gray-500 to-blue-500 rounded-3xl blur-3xl opacity-20 animate-pulse" />
            <div className="relative bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
              <Scale className="w-16 h-16 text-gray-600 dark:text-gray-400 mx-auto mb-6" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-600 to-blue-600 
                           dark:from-gray-400 dark:to-blue-400 bg-clip-text text-transparent">
                Términos y Condiciones
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">
                Marco legal de uso de la plataforma
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl 
                      border border-gray-200/50 dark:border-gray-700/50 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                          bg-gradient-to-r from-gray-500/20 to-blue-500/20 mb-4">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                En preparación
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Términos completos próximamente
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Nuestro equipo legal está finalizando los términos y condiciones completos 
              para garantizar una experiencia segura y transparente.
            </p>
          </div>

          {/* Key Terms Preview */}
          <div className="space-y-4 mb-8">
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 border border-blue-200/50 
                          dark:border-blue-700/50">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    Uso Aceptable
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    La plataforma debe usarse solo para fines legales y de acuerdo con todas las leyes aplicables
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 border border-green-200/50 
                          dark:border-green-700/50">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    Propiedad Intelectual
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Respetamos y protegemos los derechos de propiedad intelectual de todos los usuarios
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 
                          dark:from-gray-700/50 dark:to-gray-600/50 border border-purple-200/50 
                          dark:border-purple-700/50">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    Responsabilidad del Usuario
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Los usuarios son responsables de mantener seguras sus claves privadas y credenciales
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 
                        dark:border-blue-700 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Al usar CryptoGift Wallets, aceptas cumplir con nuestros términos básicos. 
                Los términos completos estarán disponibles antes del lanzamiento oficial.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/privacy" className="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 
                                         backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 
                                         hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all group">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-indigo-500" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 
                             dark:group-hover:text-indigo-400 transition-colors">
                  Política de Privacidad
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Conoce cómo protegemos tus datos
                </p>
              </div>
            </div>
          </Link>

          <a href="mailto:support@mbxarts.com" className="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 
                                                         backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 
                                                         hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all group">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-green-500" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 
                             dark:group-hover:text-green-400 transition-colors">
                  Contacto Legal
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Preguntas sobre términos legales
                </p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}