"use client";

import React from 'react';

interface DeviceLimitModalProps {
  isOpen: boolean;
  registeredWallets: string[];
  onClose: () => void;
  onSelectWallet: (wallet: string) => void;
}

export const DeviceLimitModal: React.FC<DeviceLimitModalProps> = ({
  isOpen,
  registeredWallets,
  onClose,
  onSelectWallet
}) => {
  if (!isOpen) return null;

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Límite de Dispositivo Alcanzado
          </h2>
          <p className="text-gray-600 text-sm">
            Este dispositivo ya tiene el máximo permitido de 2 usuarios registrados.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Opciones disponibles:</h3>
          
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <h4 className="font-medium text-gray-700 mb-2">
                📱 Usar un nuevo dispositivo
              </h4>
              <p className="text-sm text-gray-600">
                Para crear una nueva cuenta, utiliza otro dispositivo (teléfono, tablet, computadora).
              </p>
            </div>

            <div className="border rounded-lg p-3">
              <h4 className="font-medium text-gray-700 mb-2">
                🔑 Conectar cuenta existente
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Selecciona una de las cuentas ya registradas en este dispositivo:
              </p>
              <div className="space-y-2">
                {registeredWallets.map((wallet, index) => (
                  <button
                    key={wallet}
                    onClick={() => onSelectWallet(wallet)}
                    className="w-full text-left p-2 border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">
                        {formatWalletAddress(wallet)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Usuario {index + 1}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-800 mb-1">
            🛡️ ¿Por qué este límite?
          </h4>
          <p className="text-sm text-blue-700">
            Limitamos a 2 usuarios por dispositivo como medida de seguridad para prevenir fraudes 
            y asegurar que cada cuenta mantenga su identidad única.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};