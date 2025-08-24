/**
 * Bridge Widget Component
 * Mobile-first UI for cross-chain transfers
 */

'use client';

import { useState, useEffect } from 'react';
import {
  ArrowDownUp,
  AlertTriangle,
  Info,
  Clock,
  DollarSign,
  ChevronDown,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Zap,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBridge } from '@/hooks/useBridge';
import { BRIDGE_CONFIG, getChainConfig } from '@/lib/bridges/config';
import { formatDistance } from '@/lib/utils';

const CHAIN_OPTIONS = [
  { id: 1, name: 'Ethereum', icon: '🔷' },
  { id: 8453, name: 'Base', icon: '🔵' },
  { id: 11155111, name: 'Sepolia', icon: '🔷' },
  { id: 84532, name: 'Base Sepolia', icon: '🔵' },
];

const TOKEN_OPTIONS = ['ETH', 'USDC'];

export function BridgeWidget() {
  const {
    enabled,
    shadowMode,
    isLoading,
    isExecuting,
    error,
    quote,
    txHash,
    status,
    getQuote,
    selectRoute,
    executeBridge,
  } = useBridge();
  
  const [fromChain, setFromChain] = useState(8453); // Base
  const [toChain, setToChain] = useState(1); // Ethereum
  const [token, setToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [showRoutes, setShowRoutes] = useState(false);
  const [showRisks, setShowRisks] = useState(false);
  
  if (!enabled) {
    return null;
  }
  
  const handleSwapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    // Quote will be cleared automatically when chains change
  };
  
  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }
    
    await getQuote({
      fromChain,
      toChain,
      fromToken: token,
      toToken: token,
      amount,
    });
    
    setShowRoutes(true);
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'preparing':
      case 'getting_transaction':
      case 'checking_approval':
      case 'sending_transaction':
      case 'confirming':
      case 'pending':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />;
      case 'done':
      case 'shadow_complete':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'preparing': return 'Preparing bridge...';
      case 'getting_transaction': return 'Getting transaction data...';
      case 'checking_approval': return 'Checking token approval...';
      case 'sending_transaction': return 'Sending transaction...';
      case 'confirming': return 'Confirming on source chain...';
      case 'pending': return 'Bridging in progress...';
      case 'done': return 'Bridge complete!';
      case 'shadow_complete': return 'Bridge simulated (shadow mode)';
      case 'failed': return 'Bridge failed';
      case 'timeout': return 'Bridge timeout';
      default: return '';
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Bridge Assets</h3>
              <p className="text-sm text-white/80">Transfer between chains</p>
            </div>
          </div>
          
          {shadowMode && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-200 rounded text-xs font-medium">
              Shadow Mode
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Chain Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                From
              </label>
              <button
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => {/* Open chain selector */}}
              >
                <span className="flex items-center gap-2">
                  <span>{CHAIN_OPTIONS.find(c => c.id === fromChain)?.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {CHAIN_OPTIONS.find(c => c.id === fromChain)?.name}
                  </span>
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <button
              onClick={handleSwapChains}
              className="mt-5 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                To
              </label>
              <button
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => {/* Open chain selector */}}
              >
                <span className="flex items-center gap-2">
                  <span>{CHAIN_OPTIONS.find(c => c.id === toChain)?.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {CHAIN_OPTIONS.find(c => c.id === toChain)?.name}
                  </span>
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Token & Amount */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400">
            Amount
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TOKEN_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          
          {/* Limits */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Min: ${BRIDGE_CONFIG.limits.min}</span>
            <span>Max: ${BRIDGE_CONFIG.limits.max}</span>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {/* Quote Button */}
        {!quote && (
          <button
            onClick={handleGetQuote}
            disabled={!amount || isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Getting Quote...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Get Quote
              </span>
            )}
          </button>
        )}
        
        {/* Routes */}
        <AnimatePresence>
          {quote && showRoutes && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Available Routes
                </h4>
                <button
                  onClick={() => setShowRisks(!showRisks)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showRisks ? 'Hide' : 'Show'} Risks
                </button>
              </div>
              
              {/* Risk Warning */}
              {showRisks && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Bridge Risks
                      </p>
                      <ul className="space-y-1 text-yellow-700 dark:text-yellow-300">
                        <li>• Smart contract risk on both chains</li>
                        <li>• Possible delays during high congestion</li>
                        <li>• Slippage may affect received amount</li>
                        <li>• Bridge protocols can be targets for exploits</li>
                      </ul>
                      <a
                        href="https://docs.chain.link/resources/bridge-risks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-yellow-600 dark:text-yellow-400 hover:underline"
                      >
                        Learn more
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Route Options */}
              {quote.routes.map((route, index) => (
                <button
                  key={route.id}
                  onClick={() => selectRoute(route.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    quote.selectedRoute?.id === route.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {route.steps[0]?.tool || 'Bridge'}
                        </span>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs">
                            Best
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{Math.ceil((route.executionDuration || 300) / 60)} min
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${route.gasCostUSD || '0'}
                        </span>
                        <span>
                          {route.steps.length} {route.steps.length === 1 ? 'step' : 'steps'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        ~{(parseFloat(route.toAmount) / (token === 'USDC' ? 1e6 : 1e18)).toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {token}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              
              {/* Execute Button */}
              {quote.selectedRoute && (
                <button
                  onClick={executeBridge}
                  disabled={isExecuting}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isExecuting ? (
                    <span className="flex items-center justify-center gap-2">
                      {getStatusIcon()}
                      {getStatusText()}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      {shadowMode ? 'Simulate Bridge' : 'Execute Bridge'}
                    </span>
                  )}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Transaction Status */}
        {txHash && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {getStatusText()}
                </p>
                <a
                  href={`${getChainConfig(fromChain)?.explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
                >
                  View transaction
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* Info */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p>Bridges use {BRIDGE_CONFIG.provider.toUpperCase()} aggregator for best routes.</p>
              <p className="mt-1">Max slippage: {BRIDGE_CONFIG.slippage.max / 100}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}