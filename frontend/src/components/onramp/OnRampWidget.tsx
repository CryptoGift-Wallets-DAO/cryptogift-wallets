/**
 * On-Ramp Widget Component
 * Buy crypto with fiat currency
 */

'use client';

import { useState, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  Info,
  ChevronRight,
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveAccount } from 'thirdweb/react';
import { 
  ONRAMP_CONFIG, 
  getOnRampUrl, 
  getKYCLevel, 
  formatKYCRequirements,
  isCountrySupported,
} from '@/lib/onramp/config';

interface OnRampWidgetProps {
  defaultAmount?: number;
  defaultCrypto?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function OnRampWidget({
  defaultAmount = 100,
  defaultCrypto = 'USDC',
  onSuccess,
  onError,
}: OnRampWidgetProps) {
  const account = useActiveAccount();
  const address = account?.address;
  
  const [enabled] = useState(() => ONRAMP_CONFIG.enabled);
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [crypto, setCrypto] = useState(defaultCrypto);
  const [showWidget, setShowWidget] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKYC, setShowKYC] = useState(false);
  
  if (!enabled) {
    return null;
  }
  
  const handleOpenWidget = useCallback(() => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }
    
    const amountNum = parseFloat(amount);
    
    // Check limits
    if (amountNum < ONRAMP_CONFIG.limits.min) {
      setError(`Minimum amount is $${ONRAMP_CONFIG.limits.min}`);
      return;
    }
    if (amountNum > ONRAMP_CONFIG.limits.max) {
      setError(`Maximum amount is $${ONRAMP_CONFIG.limits.max}`);
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    // Track event
    track('WIDGET_OPEN', {
      amount: amountNum,
      crypto,
      provider: ONRAMP_CONFIG.provider,
    });
    
    // Get widget URL
    const url = getOnRampUrl({
      address,
      amount: amountNum,
      crypto,
      network: 'base',
    });
    
    if (url) {
      // Open in modal/iframe or new window
      if (window.innerWidth < 768) {
        // Mobile: Open in new tab
        window.open(url, '_blank');
      } else {
        // Desktop: Show in modal
        setShowWidget(true);
        
        // Create iframe
        setTimeout(() => {
          const container = document.getElementById('onramp-iframe-container');
          if (container) {
            container.innerHTML = `
              <iframe
                src="${url}"
                width="100%"
                height="100%"
                frameborder="0"
                allow="camera; microphone; payment"
                style="border-radius: 12px;"
              ></iframe>
            `;
          }
        }, 100);
      }
    } else if (ONRAMP_CONFIG.provider === 'coinbase') {
      // Coinbase Pay requires SDK
      setError('Coinbase Pay integration pending');
    }
    
    setIsLoading(false);
  }, [address, amount, crypto]);
  
  const handleCloseWidget = useCallback(() => {
    setShowWidget(false);
    
    // Clear iframe
    const container = document.getElementById('onramp-iframe-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Track event
    track('WIDGET_CLOSE', {});
  }, []);
  
  const track = useCallback((event: string, data?: any) => {
    const eventName = ONRAMP_CONFIG.telemetry.events[event as keyof typeof ONRAMP_CONFIG.telemetry.events] || event;
    
    console.log(`[Telemetry] ${eventName}`, data);
    
    // In production, send to analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(eventName, data);
    }
  }, []);
  
  const kycLevel = getKYCLevel(parseFloat(amount) || 0);
  const kycRequirements = formatKYCRequirements(kycLevel);
  
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Buy Crypto</h3>
                <p className="text-sm text-white/80">Purchase with card or bank</p>
              </div>
            </div>
            
            <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
              {ONRAMP_CONFIG.provider.charAt(0).toUpperCase() + ONRAMP_CONFIG.provider.slice(1)}
            </span>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={ONRAMP_CONFIG.limits.min}
                max={ONRAMP_CONFIG.limits.max}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Quick amounts */}
            <div className="flex gap-2">
              {[50, 100, 250, 500].map(amt => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
          
          {/* Crypto Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              You'll receive
            </label>
            <select
              value={crypto}
              onChange={(e) => setCrypto(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USDC">USDC on Base</option>
              <option value="ETH">ETH on Base</option>
            </select>
          </div>
          
          {/* KYC Requirements */}
          <div className="space-y-2">
            <button
              onClick={() => setShowKYC(!showKYC)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Verification Required
                </span>
              </span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                showKYC ? 'rotate-90' : ''
              }`} />
            </button>
            
            <AnimatePresence>
              {showKYC && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      For ${amount || '0'} purchase:
                    </p>
                    <ul className="space-y-1">
                      {kycRequirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {/* Buy Button */}
          <button
            onClick={handleOpenWidget}
            disabled={!address || isLoading}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Opening...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" />
                Buy {crypto}
              </span>
            )}
          </button>
          
          {/* Payment Methods */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>💳 Card</span>
            <span>🏦 Bank</span>
            <span>🍎 Apple Pay</span>
            <span>📱 Google Pay</span>
          </div>
          
          {/* Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <p>Fees vary by payment method and region.</p>
                <p className="mt-1">Crypto will be sent directly to your wallet.</p>
                <a
                  href="https://transak.com/blog/transak-and-base-simplifying-crypto-onboarding-for-the-next-generation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Learn about Base support
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Widget Modal (Desktop) */}
      {showWidget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md h-[600px] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Complete Your Purchase
              </h3>
              <button
                onClick={handleCloseWidget}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Iframe Container */}
            <div id="onramp-iframe-container" className="w-full h-full">
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}