"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NetworkOptimizationPromptProps {
  isOpen: boolean;
  onClose: () => void;
  currentChainId: number;
  requiredChainId: number;
  onUserInitiatedSwitch?: () => void;
  context?: 'claim' | 'mint' | 'general';
}

// Safe network switching utility - user-initiated only
const getSafeNetworkSwitchInstructions = (requiredChainId: number) => {
  const networks: Record<number, { name: string; chainId: string; rpcUrl: string; symbol: string; explorer: string }> = {
    84532: {
      name: 'Base Sepolia',
      chainId: '0x14a34',
      rpcUrl: 'https://sepolia.base.org',
      symbol: 'ETH',
      explorer: 'https://sepolia.basescan.org'
    },
    8453: {
      name: 'Base Mainnet',
      chainId: '0x2105',
      rpcUrl: 'https://mainnet.base.org',
      symbol: 'ETH',
      explorer: 'https://basescan.org'
    }
  };

  return networks[requiredChainId] || networks[84532];
};

export const NetworkOptimizationPrompt: React.FC<NetworkOptimizationPromptProps> = ({
  isOpen,
  onClose,
  currentChainId,
  requiredChainId,
  onUserInitiatedSwitch,
  context = 'general'
}) => {
  const [step, setStep] = useState<'info' | 'instructions' | 'success'>('info');
  const [copying, setCopying] = useState<string | null>(null);
  
  const networkInfo = getSafeNetworkSwitchInstructions(requiredChainId);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(type);
      setTimeout(() => setCopying(null), 2000);
    } catch (error) {
      console.warn('Copy failed:', error);
    }
  };

  const getContextMessage = () => {
    switch (context) {
      case 'claim':
        return {
          title: '🎁 ¡Regalo Reclamado Exitosamente!',
          subtitle: 'Optimiza tu experiencia para futuros regalos',
          benefit: 'Los NFTs aparecerán automáticamente en tu wallet sin esperas'
        };
      case 'mint':
        return {
          title: '🚀 ¡Mint Completado!',
          subtitle: 'Configura la red óptima para Web3',
          benefit: 'Todos tus NFTs aparecerán instantáneamente'
        };
      default:
        return {
          title: '🌐 Optimización de Red Disponible',
          subtitle: 'Mejora tu experiencia Web3',
          benefit: 'Mejor visualización y menor latencia'
        };
    }
  };

  const contextMsg = getContextMessage();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{contextMsg.title}</h2>
                  <p className="text-blue-100 text-sm">{contextMsg.subtitle}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {step === 'info' && (
              <div className="p-6">
                {/* Benefit Highlight */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                      <span className="text-xl">✨</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-green-800 dark:text-green-300">Beneficio Opcional</h3>
                      <p className="text-sm text-green-600 dark:text-green-400">{contextMsg.benefit}</p>
                    </div>
                  </div>
                </div>

                {/* Current vs Recommended */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Red actual</p>
                      <p className="font-medium text-orange-800 dark:text-orange-300">Chain ID: {currentChainId}</p>
                    </div>
                    <span className="text-orange-500">📍</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Red recomendada</p>
                      <p className="font-medium text-blue-800 dark:text-blue-300">{networkInfo.name}</p>
                    </div>
                    <span className="text-blue-500">🎯</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => setStep('instructions')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium"
                  >
                    📋 Ver Instrucciones Manuales
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-2 transition-colors"
                  >
                    Continuar sin cambiar (todo funciona igual)
                  </button>
                </div>

                {/* Non-intrusive Notice */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    💡 <strong>Completamente opcional:</strong> Tu experiencia funcionará perfectamente sin cambiar de red. 
                    Esta configuración solo optimiza la velocidad de aparición de NFTs.
                  </p>
                </div>
              </div>
            )}

            {step === 'instructions' && (
              <div className="p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                    📋 Instrucciones Manuales
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sigue estos pasos en tu wallet cuando tengas tiempo
                  </p>
                </div>

                {/* Step-by-step Instructions */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">Abre tu wallet</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">MetaMask, Trust Wallet, etc.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">Busca "Agregar Red" o "Add Network"</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Usualmente en configuraciones</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">Usa estos datos:</p>
                    </div>
                  </div>
                </div>

                {/* Network Details - Copyable */}
                <div className="space-y-3 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Datos de {networkInfo.name}:</h4>
                  
                  {[
                    { label: 'Nombre de Red', value: networkInfo.name },
                    { label: 'Chain ID', value: requiredChainId.toString() },
                    { label: 'RPC URL', value: networkInfo.rpcUrl },
                    { label: 'Símbolo', value: networkInfo.symbol },
                    { label: 'Explorer', value: networkInfo.explorer }
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-blue-700 dark:text-blue-400">{label}:</span>
                      <button
                        onClick={() => handleCopy(value, label)}
                        className="flex items-center space-x-2 text-sm font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded border hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        <span className="text-gray-800 dark:text-white">{value.slice(0, 20)}{value.length > 20 ? '...' : ''}</span>
                        <span className="text-blue-500">{copying === label ? '✅' : '📋'}</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep('info')}
                    className="flex-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-2 transition-colors"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
                  >
                    Entendido ✅
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};