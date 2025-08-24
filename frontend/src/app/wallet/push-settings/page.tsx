/**
 * Push Notifications Settings Page
 * Demo and management interface for Web Push
 */

'use client';

import { useState } from 'react';
import { Bell, Smartphone, Shield, TestTube, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PushSettings } from '@/components/push/PushSettings';
import { PushPermissionPrompt } from '@/components/push/PushPermissionPrompt';
import { useWebPush } from '@/hooks/useWebPush';
import {
  notifyTransactionReceived,
  notifySecurityAlert,
  notifyGiftReceived,
} from '@/lib/push/triggers';
import { useActiveAccount } from 'thirdweb/react';

export default function PushSettingsPage() {
  const account = useActiveAccount();
  const address = account?.address;
  const { isSubscribed } = useWebPush();
  const [isTestingSample, setIsTestingSample] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  
  // Sample notification triggers for demo
  const handleTestTransaction = async () => {
    if (!address) {
      setTestMessage('Please connect your wallet first');
      return;
    }
    
    setIsTestingSample(true);
    setTestMessage(null);
    
    try {
      const success = await notifyTransactionReceived(
        address,
        '0.5',
        'ETH',
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );
      
      setTestMessage(success 
        ? 'Transaction notification sent!' 
        : 'Failed to send notification. Make sure you are subscribed.'
      );
    } catch (error) {
      setTestMessage('Error sending notification');
    } finally {
      setIsTestingSample(false);
    }
  };
  
  const handleTestSecurity = async () => {
    if (!address) {
      setTestMessage('Please connect your wallet first');
      return;
    }
    
    setIsTestingSample(true);
    setTestMessage(null);
    
    try {
      const success = await notifySecurityAlert(
        address,
        'approval',
        'A new contract approval was detected for USDT'
      );
      
      setTestMessage(success 
        ? 'Security alert sent!' 
        : 'Failed to send notification. Make sure you are subscribed.'
      );
    } catch (error) {
      setTestMessage('Error sending notification');
    } finally {
      setIsTestingSample(false);
    }
  };
  
  const handleTestGift = async () => {
    if (!address) {
      setTestMessage('Please connect your wallet first');
      return;
    }
    
    setIsTestingSample(true);
    setTestMessage(null);
    
    try {
      const success = await notifyGiftReceived(
        address,
        '123',
        'You have received a special gift from a friend!'
      );
      
      setTestMessage(success 
        ? 'Gift notification sent!' 
        : 'Failed to send notification. Make sure you are subscribed.'
      );
    } catch (error) {
      setTestMessage('Error sending notification');
    } finally {
      setIsTestingSample(false);
    }
  };
  
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Push Notifications
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage your notification preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Settings */}
          <PushSettings />
          
          {/* Demo Section */}
          {isSubscribed && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <TestTube className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Test Notifications
                </h2>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Test different notification types to see how they appear on your device
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleTestTransaction}
                  disabled={isTestingSample}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                  <span>Transaction</span>
                </button>
                
                <button
                  onClick={handleTestSecurity}
                  disabled={isTestingSample}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Security</span>
                </button>
                
                <button
                  onClick={handleTestGift}
                  disabled={isTestingSample}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span>Gift</span>
                </button>
              </div>
              
              {testMessage && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {testMessage}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200">
                  Mobile App Experience
                </h3>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  For the best experience on mobile devices, add this app to your home screen. 
                  This enables offline access, background notifications, and a native app feel.
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li>• iOS: Tap share → Add to Home Screen</li>
                  <li>• Android: Tap menu → Install app</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Permission Prompt (if needed) */}
      <PushPermissionPrompt />
    </div>
  );
}