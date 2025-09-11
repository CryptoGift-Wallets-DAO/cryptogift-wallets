"use client";

import React, { useState, useEffect } from 'react';

interface ReferralWelcomeBannerProps {
  referrerAddress: string;
  onClose: () => void;
}

export const ReferralWelcomeBanner: React.FC<ReferralWelcomeBannerProps> = ({
  referrerAddress,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full mx-auto shadow-2xl border-4 border-purple-200 overflow-hidden">
        {/* Header con logo */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎁</span>
          </div>
          <h2 className="text-xl font-bold">¡Bienvenido a CryptoGift!</h2>
          <p className="text-purple-100 text-sm mt-2">Has llegado a través de un enlace especial</p>
        </div>

        {/* Contenido principal */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="bg-purple-50 rounded-xl p-4 mb-4">
              <p className="text-gray-700 text-sm">
                <span className="font-semibold text-purple-700">Un amigo te invitó</span> a crear regalos de criptomonedas únicas
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Referido por: <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {referrerAddress.slice(0, 6)}...{referrerAddress.slice(-4)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-green-500">✨</span>
                <span className="text-gray-700">Crea NFTs que funcionan como billeteras</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-blue-500">🔐</span>
                <span className="text-gray-700">Envía cripto de forma súper fácil</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-purple-500">🎯</span>
                <span className="text-gray-700">Gana recompensas invitando amigos</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
            >
              ¡Empezar a Crear! 🚀
            </button>
            
            <button
              onClick={handleClose}
              className="w-full bg-gray-100 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-200 transition-colors"
            >
              Explorar primero
            </button>
          </div>

          {/* Nota sobre el referido */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Tu amigo ganará recompensas cuando crees tu primer regalo 💝
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};