"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldOff, AlertCircle, CheckCircle, Info, Zap, Lock } from 'lucide-react';
import { isMEVProtectionAvailable, getMEVProtectedRPC } from '@/lib/mev/config';

interface MEVProtectionToggleProps {
  chainId: number;
}

export const MEVProtectionToggle: React.FC<MEVProtectionToggleProps> = ({ chainId }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkMEVAvailability();
    loadMEVPreference();
  }, [chainId]);

  const checkMEVAvailability = () => {
    const available = isMEVProtectionAvailable(chainId);
    setIsAvailable(available);
    setIsLoading(false);
  };

  const loadMEVPreference = () => {
    const stored = localStorage.getItem(`mev_protection_${chainId}`);
    setIsEnabled(stored === 'true');
  };

  const toggleMEVProtection = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem(`mev_protection_${chainId}`, newState.toString());
  };

  const benefits = [
    { icon: Shield, text: "Protection from sandwich attacks", color: "text-green-500" },
    { icon: Lock, text: "Private transaction mempool", color: "text-blue-500" },
    { icon: Zap, text: "Fast inclusion via Flashbots", color: "text-purple-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 
                 backdrop-blur-xl backdrop-saturate-150 border border-white/20"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 
                         dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              MEV Protection
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Protect your transactions from MEV bots
            </p>
          </div>
        </div>

        {isAvailable ? (
          <button
            onClick={toggleMEVProtection}
            disabled={isLoading}
            className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
              isEnabled 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <motion.div
              animate={{ x: isEnabled ? 24 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
            />
          </button>
        ) : (
          <div className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-sm">
            Not Available
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${
        isEnabled 
          ? 'bg-green-500/10 border border-green-500/20' 
          : 'bg-gray-100/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50'
      }`}>
        {isEnabled ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-600 dark:text-green-400 font-medium">
              Protection Active - Using Flashbots RPC
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Protection Disabled - Using Public RPC
            </span>
          </>
        )}
      </div>

      {/* Benefits Section */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 
                   hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        <Info className="w-4 h-4" />
        <span>{showDetails ? 'Hide' : 'Show'} Details</span>
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 space-y-3 overflow-hidden"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-700/50"
              >
                <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                <span className="text-sm">{benefit.text}</span>
              </motion.div>
            ))}

            {!isAvailable && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  MEV Protection is not available on this network. 
                  Consider using Ethereum Mainnet or Sepolia for MEV protection.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};