'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function NetworkInfoCard() {
  const [copying, setCopying] = useState<string>('');
  const [expandedNetwork, setExpandedNetwork] = useState<'base' | 'sepolia' | null>(null);

  const networks = {
    base: {
      name: 'Base Mainnet',
      chainId: '8453',
      rpcUrl: 'https://mainnet.base.org',
      symbol: 'ETH',
      explorer: 'https://basescan.org',
      icon: '🔵',
      description: 'Red principal de Base para transacciones reales'
    },
    sepolia: {
      name: 'Base Sepolia Testnet',
      chainId: '84532',
      rpcUrl: 'https://sepolia.base.org',
      symbol: 'ETH',
      explorer: 'https://sepolia.basescan.org',
      icon: '🧪',
      description: 'Red de pruebas para desarrollo y testing'
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopying(label);
      setTimeout(() => setCopying(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mb-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl shadow-xl p-6 border border-blue-200/50 dark:border-blue-700/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            📡 Configuración de Red
          </h2>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Configuración manual para tu wallet
          </span>
        </div>

        {/* Info message */}
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            💡 Si tu wallet no cambia automáticamente de red, usa estos datos para agregarla manualmente
          </p>
        </div>

        {/* Networks Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(networks).map(([key, network]) => (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Network Header */}
              <button
                onClick={() => setExpandedNetwork(expandedNetwork === key ? null : key as 'base' | 'sepolia')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{network.icon}</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {network.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {network.description}
                    </p>
                  </div>
                </div>
                <motion.svg
                  animate={{ rotate: expandedNetwork === key ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-500"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </motion.svg>
              </button>

              {/* Network Details */}
              <AnimatePresence>
                {expandedNetwork === key && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-4 space-y-3">
                      {/* Network Name */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Network Name:</span>
                        <button
                          onClick={() => handleCopy(network.name, `${key}-name`)}
                          className="flex items-center space-x-2 text-sm font-mono bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <span className="text-gray-800 dark:text-white">{network.name}</span>
                          <span className="text-blue-500">
                            {copying === `${key}-name` ? '✅' : '📋'}
                          </span>
                        </button>
                      </div>

                      {/* Chain ID */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Chain ID:</span>
                        <button
                          onClick={() => handleCopy(network.chainId, `${key}-chainId`)}
                          className="flex items-center space-x-2 text-sm font-mono bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <span className="text-gray-800 dark:text-white">{network.chainId}</span>
                          <span className="text-blue-500">
                            {copying === `${key}-chainId` ? '✅' : '📋'}
                          </span>
                        </button>
                      </div>

                      {/* RPC URL */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">RPC URL:</span>
                        <button
                          onClick={() => handleCopy(network.rpcUrl, `${key}-rpc`)}
                          className="flex items-center space-x-2 text-sm font-mono bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors max-w-[200px]"
                        >
                          <span className="text-gray-800 dark:text-white truncate">
                            {network.rpcUrl.length > 25 
                              ? `${network.rpcUrl.slice(0, 25)}...` 
                              : network.rpcUrl}
                          </span>
                          <span className="text-blue-500">
                            {copying === `${key}-rpc` ? '✅' : '📋'}
                          </span>
                        </button>
                      </div>

                      {/* Currency Symbol */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Currency Symbol:</span>
                        <button
                          onClick={() => handleCopy(network.symbol, `${key}-symbol`)}
                          className="flex items-center space-x-2 text-sm font-mono bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <span className="text-gray-800 dark:text-white">{network.symbol}</span>
                          <span className="text-blue-500">
                            {copying === `${key}-symbol` ? '✅' : '📋'}
                          </span>
                        </button>
                      </div>

                      {/* Block Explorer */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Block Explorer:</span>
                        <button
                          onClick={() => handleCopy(network.explorer, `${key}-explorer`)}
                          className="flex items-center space-x-2 text-sm font-mono bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors max-w-[200px]"
                        >
                          <span className="text-gray-800 dark:text-white truncate">
                            {network.explorer.length > 25 
                              ? `${network.explorer.slice(0, 25)}...` 
                              : network.explorer}
                          </span>
                          <span className="text-blue-500">
                            {copying === `${key}-explorer` ? '✅' : '📋'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">
            📱 Cómo agregar la red a tu wallet:
          </p>
          <ol className="text-xs text-blue-700 dark:text-blue-400 space-y-1 ml-4">
            <li>1. Abre tu wallet (MetaMask, Trust Wallet, etc.)</li>
            <li>2. Busca "Configuración" → "Redes" → "Agregar Red"</li>
            <li>3. Copia y pega los datos de arriba</li>
            <li>4. Guarda y cambia a la nueva red</li>
          </ol>
        </div>
      </div>
    </div>
  );
}