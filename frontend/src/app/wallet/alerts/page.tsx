/**
 * Unified Alerts Page
 * Web Push + Push Protocol management
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  Globe, 
  Shield, 
  TestTube,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveAccount } from 'thirdweb/react';

// Web Push components
import { PushSettings } from '@/components/push/PushSettings';
import { useWebPush } from '@/hooks/useWebPush';

// Push Protocol config
import { isPushProtocolEnabled, getPushProtocolConfig } from '@/lib/push-protocol/config';

type TabType = 'web-push' | 'push-protocol';

interface Feed {
  id: string;
  title: string;
  body: string;
  app: string;
  icon: string;
  url: string;
  timestamp: number;
  category: string;
}

export default function AlertsPage() {
  const account = useActiveAccount();
  const address = account?.address;
  const webPush = useWebPush();
  
  const [activeTab, setActiveTab] = useState<TabType>('web-push');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const pushProtocolEnabled = isPushProtocolEnabled();
  const pushConfig = getPushProtocolConfig();
  
  // Check Push Protocol subscription status
  useEffect(() => {
    if (address && pushProtocolEnabled && activeTab === 'push-protocol') {
      checkSubscriptionStatus();
      fetchFeeds();
    }
  }, [address, activeTab]);
  
  const checkSubscriptionStatus = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/push-protocol/subscribe?address=${address}`);
      const data = await response.json();
      setIsSubscribed(data.subscribed);
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  };
  
  const fetchFeeds = async () => {
    if (!address) return;
    
    setFeedsLoading(true);
    try {
      const response = await fetch(`/api/push-protocol/feeds?address=${address}`);
      const data = await response.json();
      setFeeds(data.feeds || []);
    } catch (error) {
      console.error('Failed to fetch feeds:', error);
    } finally {
      setFeedsLoading(false);
    }
  };
  
  const handlePushProtocolSubscribe = async () => {
    if (!address) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const action = isSubscribed ? 'unsubscribe' : 'subscribe';
      const response = await fetch('/api/push-protocol/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, action }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsSubscribed(data.subscribed);
        setMessage({
          type: 'success',
          text: data.subscribed ? 'Successfully subscribed!' : 'Successfully unsubscribed',
        });
        
        if (data.subscribed) {
          // Refresh feeds after subscribing
          fetchFeeds();
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Operation failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update subscription' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const sendTestNotification = async (type: string) => {
    if (!address) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }
    
    setMessage(null);
    
    try {
      const response = await fetch('/api/push-protocol/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, type }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({
          type: 'info',
          text: 'Test notification sent! Check Push App or Extension',
        });
        
        // Refresh feeds after a delay
        setTimeout(fetchFeeds, 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to send test notification' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending notification' });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                    Notification Center
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage your alert preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('web-push')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'web-push'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Bell className="w-4 h-4" />
                <span>Web Push</span>
              </div>
            </button>
            
            {pushProtocolEnabled && (
              <button
                onClick={() => setActiveTab('push-protocol')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'push-protocol'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Push Protocol</span>
                  {pushConfig.env === 'staging' && (
                    <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
                      Staging
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>
          
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'web-push' ? (
                <motion.div
                  key="web-push"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <PushSettings />
                </motion.div>
              ) : (
                <motion.div
                  key="push-protocol"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Push Protocol Settings */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Push Protocol Channel
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Decentralized notifications via Push Protocol
                        </p>
                      </div>
                      
                      <button
                        onClick={handlePushProtocolSubscribe}
                        disabled={isLoading || !address}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          isSubscribed
                            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSubscribed ? (
                          'Unsubscribe'
                        ) : (
                          'Subscribe'
                        )}
                      </button>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2 mb-4">
                      {isSubscribed ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isSubscribed ? 'Subscribed to channel' : 'Not subscribed'}
                      </span>
                    </div>
                    
                    {/* Info Box */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                            {pushConfig.env === 'staging' ? 'Staging Channel' : 'Production Channel'}
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            {pushConfig.env === 'staging' 
                              ? 'Testing channel for development. Install Push App to receive notifications.'
                              : 'Official CryptoGift channel with 50 PUSH staked.'}
                          </p>
                          <a
                            href={pushConfig.dappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View on Push dApp
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Test Notifications */}
                  {isSubscribed && pushConfig.env === 'staging' && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Send Test Notification
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => sendTestNotification('test')}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                          <TestTube className="w-4 h-4 mx-auto mb-1" />
                          Test
                        </button>
                        <button
                          onClick={() => sendTestNotification('transaction')}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                          💰 Transaction
                        </button>
                        <button
                          onClick={() => sendTestNotification('security')}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                          <Shield className="w-4 h-4 mx-auto mb-1" />
                          Security
                        </button>
                        <button
                          onClick={() => sendTestNotification('gift')}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                          🎁 Gift
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Feeds */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        Notification Feed
                      </h4>
                      <button
                        onClick={fetchFeeds}
                        disabled={feedsLoading}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${
                          feedsLoading ? 'animate-spin' : ''
                        }`} />
                      </button>
                    </div>
                    
                    {feedsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Loading feeds...
                        </p>
                      </div>
                    ) : feeds.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {feeds.map((feed) => (
                          <div
                            key={feed.id}
                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={feed.icon}
                                alt=""
                                className="w-8 h-8 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">
                                  {feed.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                  {feed.body}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {new Date(feed.timestamp).toLocaleString()}
                                </p>
                              </div>
                              {feed.url && (
                                <a
                                  href={feed.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                        {!isSubscribed && (
                          <p className="text-xs mt-1">Subscribe to receive notifications</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Message */}
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${
                        message.type === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : message.type === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}