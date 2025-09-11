"use client";

import React from 'react';

interface ExtensionInstallerProps {
  walletData: {
    nftContract: string;
    tokenId: string;
    tbaAddress: string;
    name: string;
    image: string;
  };
  className?: string;
}

export const ExtensionInstaller: React.FC<ExtensionInstallerProps> = ({
  walletData,
  className = ""
}) => {
  return (
    <div className={`bg-white rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🟠</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Extensión del Navegador</h3>
        </div>
        <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
          Building...
        </div>
      </div>

      {/* Building Status */}
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔧</span>
        </div>
        <h4 className="text-lg font-medium text-gray-800 mb-2">En Desarrollo</h4>
        <p className="text-gray-600 text-sm mb-4">
          Estamos trabajando en una extensión del navegador para un acceso más rápido a tus CryptoGift Wallets.
        </p>
        
        {/* Features Coming Soon */}
        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <h5 className="font-medium text-gray-800 mb-2">Características Próximamente:</h5>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Acceso rápido desde cualquier página web</li>
            <li>• Notificaciones de transacciones</li>
            <li>• Integración con DApps populares</li>
            <li>• Gestión simplificada de wallets</li>
          </ul>
        </div>
      </div>

      {/* Notification Signup */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Notificarme cuando esté lista</span>
          <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors">
            Próximamente
          </button>
        </div>
      </div>
    </div>
  );
};