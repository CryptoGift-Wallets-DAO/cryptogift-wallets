"use client";

import React from 'react';

interface AccountManagementProps {
  walletAddress: string;
  className?: string;
}

export const AccountManagement: React.FC<AccountManagementProps> = ({
  walletAddress,
  className = ""
}) => {
  return (
    <div className={`bg-white rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">⚙️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Gestión de Cuenta</h3>
        </div>
        <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
          Building...
        </div>
      </div>

      {/* Building Status */}
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔧</span>
        </div>
        <h4 className="text-lg font-medium text-gray-800 mb-2">En Desarrollo</h4>
        <p className="text-gray-600 text-sm mb-4">
          Accede a servicios internos y configuración avanzada
        </p>
      </div>

      {/* Mock Preview */}
      <div className="space-y-4 opacity-60">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Nivel: Basic</span>
          <div className="w-16 h-2 bg-gray-200 rounded-full">
            <div className="w-1/3 h-2 bg-purple-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="w-6 h-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
            <p className="text-xs text-gray-500">KYC: No verificado</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="w-6 h-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
            <p className="text-xs text-gray-500">Servicios conectados: 0</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h5 className="font-medium text-gray-800 mb-2 text-sm">Próximamente:</h5>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Verificación KYC integrada</li>
          <li>• API keys para desarrolladores</li>
          <li>• Configuración de notificaciones</li>
          <li>• Integración con servicios externos</li>
        </ul>
      </div>
    </div>
  );
};