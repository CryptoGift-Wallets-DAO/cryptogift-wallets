'use client';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeCard } from './ThemeSystem';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message?: string;
  duration?: number; // 0 = persistent until dismissed
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: {
    txHash?: string;
    chainId?: number;
    amount?: string;
    token?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // Wallet-specific helpers
  notifyTransaction: (txHash: string, type: 'pending' | 'success' | 'failed', details?: Partial<Notification>) => string;
  notifyWalletAction: (action: string, status: 'pending' | 'success' | 'failed', details?: Partial<Notification>) => string;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

/**
 * COMPREHENSIVE NOTIFICATION SYSTEM
 * 
 * Features:
 * - 🔔 Real-time transaction notifications
 * - 💰 Wallet action feedback (transfers, approvals, etc.)
 * - 🎯 Context-aware notifications with metadata
 * - ⏱️ Auto-dismiss with configurable timing
 * - 🎨 Beautiful animations and transitions
 * - 📱 Mobile-optimized positioning
 * - 🔗 Transaction hash links to block explorer
 * - 🎭 Multiple notification types with distinct styling
 */

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove after duration (if not persistent)
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    console.log(`🔔 Notification added: ${newNotification.type} - ${newNotification.title}`);
    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    console.log(`🗑️ Notification removed: ${id}`);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    console.log('🧹 All notifications cleared');
  }, []);

  // Transaction-specific notification helper
  const notifyTransaction = useCallback((
    txHash: string, 
    type: 'pending' | 'success' | 'failed', 
    details: Partial<Notification> = {}
  ) => {
    const notificationMap = {
      pending: {
        type: 'loading' as const,
        title: 'Transaction Pending',
        message: 'Your transaction is being processed...',
        duration: 0, // Persistent until updated
      },
      success: {
        type: 'success' as const,
        title: 'Transaction Confirmed',
        message: 'Your transaction was successful!',
        duration: 8000,
        action: {
          label: 'View on Explorer',
          onClick: () => {
            const baseUrl = details.metadata?.chainId === 84532 
              ? 'https://sepolia.basescan.org/tx/' 
              : 'https://sepolia.etherscan.io/tx/';
            window.open(`${baseUrl}${txHash}`, '_blank');
          }
        }
      },
      failed: {
        type: 'error' as const,
        title: 'Transaction Failed',
        message: 'Your transaction could not be completed.',
        duration: 10000,
      }
    };

    const baseNotification = notificationMap[type];
    
    return addNotification({
      ...baseNotification,
      ...details,
      metadata: {
        txHash,
        ...details.metadata
      }
    });
  }, [addNotification]);

  // Wallet action notification helper
  const notifyWalletAction = useCallback((
    action: string,
    status: 'pending' | 'success' | 'failed',
    details: Partial<Notification> = {}
  ) => {
    const statusMap = {
      pending: {
        type: 'loading' as const,
        title: `${action} in Progress`,
        message: 'Please confirm in your wallet...',
        duration: 0,
      },
      success: {
        type: 'success' as const,
        title: `${action} Successful`,
        message: 'Action completed successfully!',
        duration: 6000,
      },
      failed: {
        type: 'error' as const,
        title: `${action} Failed`,
        message: 'Action could not be completed.',
        duration: 8000,
      }
    };

    const baseNotification = statusMap[status];
    
    return addNotification({
      ...baseNotification,
      ...details
    });
  }, [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    notifyTransaction,
    notifyWalletAction
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

// Notification Container Component
function NotificationContainer() {
  const context = useContext(NotificationContext);
  if (!context) return null;

  const { notifications, removeNotification, clearAll } = context;

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-sm w-full">
      {/* Clear All Button (when multiple notifications) */}
      {notifications.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                       bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded-md transition-colors"
          >
            Clear all ({notifications.length})
          </button>
        </motion.div>
      )}

      {/* Notifications */}
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Individual Notification Item
interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide animation before dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 200); // Wait for exit animation
  };

  // Notification styling based on type
  const getNotificationStyle = (type: Notification['type']) => {
    const styles = {
      success: {
        icon: '✅',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-700',
        iconColor: 'text-green-600 dark:text-green-400',
        titleColor: 'text-green-900 dark:text-green-100'
      },
      error: {
        icon: '❌',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-700',
        iconColor: 'text-red-600 dark:text-red-400',
        titleColor: 'text-red-900 dark:text-red-100'
      },
      warning: {
        icon: '⚠️',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-700',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        titleColor: 'text-yellow-900 dark:text-yellow-100'
      },
      info: {
        icon: 'ℹ️',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-700',
        iconColor: 'text-blue-600 dark:text-blue-400',
        titleColor: 'text-blue-900 dark:text-blue-100'
      },
      loading: {
        icon: '⏳',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        borderColor: 'border-gray-200 dark:border-gray-700',
        iconColor: 'text-gray-600 dark:text-gray-400',
        titleColor: 'text-gray-900 dark:text-gray-100'
      }
    };

    return styles[type];
  };

  const style = getNotificationStyle(notification.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        x: isVisible ? 0 : 300, 
        scale: isVisible ? 1 : 0.9 
      }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }}
      className="relative"
    >
      <ThemeCard 
        variant="default" 
        className={`${style.bgColor} ${style.borderColor} border-l-4 shadow-lg backdrop-blur-sm`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`${style.iconColor} text-lg flex-shrink-0 mt-0.5`}>
            {notification.type === 'loading' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                {style.icon}
              </motion.div>
            ) : (
              style.icon
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className={`${style.titleColor} font-medium text-sm`}>
                {notification.title}
              </h4>
              
              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2 flex-shrink-0 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Message */}
            {notification.message && (
              <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 leading-relaxed">
                {notification.message}
              </p>
            )}

            {/* Metadata */}
            {notification.metadata?.txHash && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                Tx: {notification.metadata.txHash.slice(0, 10)}...{notification.metadata.txHash.slice(-8)}
              </div>
            )}

            {/* Action Button */}
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className={`${style.iconColor} hover:underline text-xs font-medium mt-2 block transition-colors`}
              >
                {notification.action.label}
              </button>
            )}
          </div>
        </div>
      </ThemeCard>
    </motion.div>
  );
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Convenience hooks for common use cases
export function useTransactionNotifications() {
  const { notifyTransaction } = useNotifications();
  return notifyTransaction;
}

export function useWalletNotifications() {
  const { notifyWalletAction } = useNotifications();
  return notifyWalletAction;
}

export default NotificationProvider;