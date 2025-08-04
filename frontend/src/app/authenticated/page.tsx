"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';

/**
 * R1: Mobile Authentication Success Page
 * Handles deeplink redirects after successful wallet authentication
 */
export default function AuthenticatedPage() {
  useEffect(() => {
    // Show success message briefly then auto-redirect
    const timer = setTimeout(() => {
      // Try to go back to previous page or home
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          ¡Autenticación Exitosa! 🎉
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Tu wallet ha sido autenticado correctamente. Serás redirigido automáticamente...
        </p>
        
        <div className="space-y-3">
          <Link 
            href="/"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🏠 Ir al Inicio
          </Link>
          
          <Link 
            href="/my-wallets"
            className="block w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            👛 Mis Wallets
          </Link>
        </div>
        
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>🔐 Conexión segura establecida</p>
          <p>📱 Deeplink activado para mobile</p>
        </div>
      </div>
    </div>
  );
}