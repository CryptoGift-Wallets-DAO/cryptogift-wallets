/**
 * Payments Page
 * Bridges and On-Ramp features
 */

'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  CreditCard,
  ArrowDownUp,
  Info,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useActiveAccount } from 'thirdweb/react';
import { BridgeWidget } from '@/components/bridges/BridgeWidget';
import { OnRampWidget } from '@/components/onramp/OnRampWidget';
import { BRIDGE_CONFIG } from '@/lib/bridges/config';
import { ONRAMP_CONFIG } from '@/lib/onramp/config';

export default function PaymentsPage() {
  const account = useActiveAccount();
  const address = account?.address;
  
  const [activeTab, setActiveTab] = useState<'bridge' | 'onramp'>('onramp');
  
  const bridgeEnabled = BRIDGE_CONFIG.enabled;
  const onrampEnabled = ONRAMP_CONFIG.enabled;
  
  // If neither feature is enabled, show message
  if (!bridgeEnabled && !onrampEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Payments Not Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Bridge and on-ramp features are currently disabled.
          </p>
          <Link
            href="/wallet/settings"
            className="inline-flex items-center gap-2 mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/wallet/settings"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Payments
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Buy crypto and bridge between chains
                </p>
              </div>
            </div>
            
            {/* Connection Status */}
            {address && (
              <div className="hidden sm:block px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!address ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Wallet Not Connected
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Please connect your wallet to use payment features.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            {bridgeEnabled && onrampEnabled && (
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('onramp')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'onramp'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Buy Crypto</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('bridge')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'bridge'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <ArrowDownUp className="w-4 h-4" />
                    <span>Bridge</span>
                  </div>
                </button>
              </div>
            )}
            
            {/* Active Widget */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'onramp' && onrampEnabled && (
                <OnRampWidget
                  defaultAmount={100}
                  defaultCrypto="USDC"
                  onSuccess={(data) => console.log('Purchase success:', data)}
                  onError={(error) => console.error('Purchase error:', error)}
                />
              )}
              
              {activeTab === 'bridge' && bridgeEnabled && (
                <BridgeWidget />
              )}
            </motion.div>
            
            {/* Warning */}
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Important Information
                  </p>
                  <ul className="space-y-1 text-yellow-700 dark:text-yellow-300">
                    <li>• Fees vary by provider and payment method</li>
                    <li>• Bridge transactions may take several minutes</li>
                    <li>• Always verify addresses before sending</li>
                    <li>• Some regions have restrictions on crypto purchases</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Feature Flags Info (Dev) */}
            {(BRIDGE_CONFIG.shadowMode || process.env.NODE_ENV === 'development') && (
              <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-medium mb-1">Development Info</p>
                    <p>Bridge: {BRIDGE_CONFIG.enabled ? 'Enabled' : 'Disabled'} ({BRIDGE_CONFIG.provider})</p>
                    <p>Shadow Mode: {BRIDGE_CONFIG.shadowMode ? 'On' : 'Off'}</p>
                    <p>On-Ramp: {ONRAMP_CONFIG.enabled ? 'Enabled' : 'Disabled'} ({ONRAMP_CONFIG.provider})</p>
                    <p>Environment: {ONRAMP_CONFIG.transak.environment}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}