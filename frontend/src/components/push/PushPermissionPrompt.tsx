/**
 * Push Permission Prompt Component
 * Handles notification permission requests with iOS-specific messaging
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Smartphone, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebPush } from '@/hooks/useWebPush';
import { isIOS, isIOSPWAInstalled } from '@/lib/push/config';

interface PushPermissionPromptProps {
  onClose?: () => void;
  autoShow?: boolean;
  className?: string;
}

export function PushPermissionPrompt({
  onClose,
  autoShow = false,
  className = '',
}: PushPermissionPromptProps) {
  const {
    isEnabled,
    isSupported,
    permission,
    isSubscribed,
    isIOSRestricted,
    subscribe,
    requestPermission,
  } = useWebPush();
  
  const [showPrompt, setShowPrompt] = useState(autoShow);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
  useEffect(() => {
    // Auto-show if not subscribed and permission not denied
    if (autoShow && isSupported && !isSubscribed && permission === 'default') {
      setShowPrompt(true);
    }
  }, [autoShow, isSupported, isSubscribed, permission]);
  
  const handleEnable = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check for iOS restrictions
      if (isIOSRestricted) {
        setShowIOSInstructions(true);
        setIsLoading(false);
        return;
      }
      
      // Subscribe to push notifications
      const success = await subscribe();
      
      if (success) {
        // Show success state briefly then close
        setTimeout(() => {
          setShowPrompt(false);
          onClose?.();
        }, 2000);
      } else {
        setError('Failed to enable notifications. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    setShowPrompt(false);
    onClose?.();
  };
  
  // Don't render if not supported or already subscribed
  if (!isEnabled || !isSupported || isSubscribed) {
    return null;
  }
  
  // Don't show if permission is denied
  if (permission === 'denied') {
    return null;
  }
  
  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Enable Notifications
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Stay updated with your wallet activity
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* iOS Instructions */}
            {showIOSInstructions ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      iOS Setup Required
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      To enable notifications on iOS:
                    </p>
                    <ol className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-300">
                      <li>1. Tap the share button <span className="inline-block w-4 h-4 align-middle">⬆️</span></li>
                      <li>2. Select "Add to Home Screen"</li>
                      <li>3. Open the app from your home screen</li>
                      <li>4. Enable notifications when prompted</li>
                    </ol>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Got it
                </button>
              </div>
            ) : (
              <>
                {/* Benefits */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Transaction confirmations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Security alerts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Gift claim reminders</span>
                  </div>
                </div>
                
                {/* Error message */}
                {error && (
                  <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                    {error}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleEnable}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enabling...
                      </span>
                    ) : (
                      'Enable Notifications'
                    )}
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}