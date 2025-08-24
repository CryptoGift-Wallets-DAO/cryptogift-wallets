/**
 * Push Settings Component
 * Manage notification preferences and categories
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Shield, 
  ArrowUpDown, 
  Gift,
  Smartphone,
  Check,
  X,
  AlertCircle,
  TestTube,
  Settings,
  Megaphone,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useWebPush } from '@/hooks/useWebPush';
import { PushCategory } from '@/lib/push/config';

const CATEGORY_INFO: Record<PushCategory, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = {
  [PushCategory.TRANSACTION]: {
    label: 'Transactions',
    description: 'Receive, send, and swap notifications',
    icon: ArrowUpDown,
    color: 'text-blue-600 dark:text-blue-400',
  },
  [PushCategory.SECURITY]: {
    label: 'Security Alerts',
    description: 'Important security updates and warnings',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
  },
  [PushCategory.CLAIM]: {
    label: 'Gift Claims',
    description: 'New gifts and claim reminders',
    icon: Gift,
    color: 'text-purple-600 dark:text-purple-400',
  },
  [PushCategory.SYSTEM]: {
    label: 'System Updates',
    description: 'App updates and maintenance notices',
    icon: Settings,
    color: 'text-gray-600 dark:text-gray-400',
  },
  [PushCategory.MARKETING]: {
    label: 'Marketing',
    description: 'Promotional updates and offers',
    icon: Megaphone,
    color: 'text-green-600 dark:text-green-400',
  },
};

export function PushSettings() {
  const {
    isEnabled,
    isSupported,
    permission,
    isSubscribed,
    isIOSRestricted,
    categories: activeCategories,
    subscribe,
    unsubscribe,
    updateCategories,
    sendTestNotification,
    requestPermission,
  } = useWebPush();
  
  const [localCategories, setLocalCategories] = useState<PushCategory[]>(activeCategories);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  useEffect(() => {
    setLocalCategories(activeCategories);
  }, [activeCategories]);
  
  const handleToggleNotifications = async () => {
    setIsUpdating(true);
    setMessage(null);
    
    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          setMessage({ type: 'success', text: 'Notifications disabled' });
        } else {
          setMessage({ type: 'error', text: 'Failed to disable notifications' });
        }
      } else {
        if (isIOSRestricted) {
          setMessage({ 
            type: 'error', 
            text: 'Please install the app to your home screen first' 
          });
          return;
        }
        
        const success = await subscribe(localCategories);
        if (success) {
          setMessage({ type: 'success', text: 'Notifications enabled' });
        } else {
          setMessage({ type: 'error', text: 'Failed to enable notifications' });
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleCategoryToggle = async (category: PushCategory) => {
    const newCategories = localCategories.includes(category)
      ? localCategories.filter(c => c !== category)
      : [...localCategories, category];
    
    setLocalCategories(newCategories);
    
    if (isSubscribed) {
      setIsUpdating(true);
      const success = await updateCategories(newCategories);
      if (!success) {
        // Revert on failure
        setLocalCategories(activeCategories);
        setMessage({ type: 'error', text: 'Failed to update preferences' });
      }
      setIsUpdating(false);
    }
  };
  
  const handleTestNotification = async () => {
    setIsTesting(true);
    setMessage(null);
    
    try {
      const success = await sendTestNotification();
      if (success) {
        setMessage({ type: 'success', text: 'Test notification sent!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test notification' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsTesting(false);
    }
  };
  
  // Show not supported message
  if (!isEnabled || !isSupported) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
              Notifications Not Available
            </h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              Push notifications are not supported in your browser or have been disabled.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show permission denied message
  if (permission === 'denied') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BellOff className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Notifications Blocked
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              You have blocked notifications for this site. Please enable them in your browser settings.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${
              isSubscribed 
                ? 'bg-blue-100 dark:bg-blue-900' 
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {isSubscribed ? (
                <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <BellOff className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isSubscribed ? 'Notifications are enabled' : 'Enable to receive updates'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleToggleNotifications}
            disabled={isUpdating}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              isSubscribed
                ? 'bg-blue-600'
                : 'bg-gray-300 dark:bg-gray-600'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                isSubscribed ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {/* iOS PWA Instructions */}
        {isIOSRestricted && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Smartphone className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  iOS Setup Required
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Add this app to your home screen to enable notifications
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Category Preferences */}
      {isSubscribed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Notification Preferences
          </h3>
          
          <div className="space-y-3">
            {(Object.entries(CATEGORY_INFO) as [PushCategory, typeof CATEGORY_INFO[PushCategory]][]).map(
              ([category, info]) => {
                const Icon = info.icon;
                const isActive = localCategories.includes(category);
                
                return (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${info.color}`} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {info.label}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {info.description}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCategoryToggle(category)}
                      disabled={isUpdating || category === 'security'} // Security always on
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isActive
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      } ${isUpdating || category === 'security' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              }
            )}
          </div>
          
          {/* Test Notification */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleTestNotification}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <TestTube className="w-4 h-4" />
              {isTesting ? 'Sending...' : 'Send Test Notification'}
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Status Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          <span className="text-sm">{message.text}</span>
        </motion.div>
      )}
    </div>
  );
}