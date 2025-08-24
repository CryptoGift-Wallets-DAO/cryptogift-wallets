"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Shield, History, CreditCard, Bell, Settings, 
  ChevronRight, Zap, Lock, Globe, Layers, AlertCircle,
  TrendingUp, Eye, EyeOff, RefreshCw, Plus, X,
  Fingerprint, Users, Key, ArrowRightLeft, DollarSign
} from 'lucide-react';
import { useActiveAccount } from 'thirdweb/react';

// Import REAL existing modules from the project
import { MEVProtectionToggle } from '../wallet/MEVProtectionToggle';
import { ApprovalsManager } from '../wallet/ApprovalsManager';
import { TransactionHistory } from '../history/TransactionHistory';
import { NetworkAssetManager } from '../wallet/NetworkAssetManager';

interface WalletDashboardProps {
  wallet: any;
  onClose: () => void;
  initialTab?: string;
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({ wallet, onClose, initialTab }) => {
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Tab configuration with all new features
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Wallet, color: 'from-blue-500 to-cyan-500' },
    { id: 'security', label: 'Security', icon: Shield, color: 'from-purple-500 to-pink-500' },
    { id: 'history', label: 'History', icon: History, color: 'from-green-500 to-emerald-500' },
    { id: 'bridge', label: 'Bridge & Buy', icon: ArrowRightLeft, color: 'from-orange-500 to-red-500' },
    { id: 'aa', label: 'Smart Account', icon: Zap, color: 'from-indigo-500 to-purple-500' },
    { id: 'notifications', label: 'Alerts', icon: Bell, color: 'from-yellow-500 to-orange-500' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'from-gray-500 to-gray-600' },
  ];

  const renderTabContent = () => {
    switch(activeTab) {
      case 'overview':
        return <OverviewTab wallet={wallet} />;
      case 'security':
        return <SecurityTab wallet={wallet} />;
      case 'history':
        return <TransactionHistory className="w-full" compactMode={false} />;
      case 'bridge':
        return <BridgeAndBuyTab wallet={wallet} />;
      case 'aa':
        return <AccountAbstractionTab wallet={wallet} />;
      case 'notifications':
        return <NotificationsTab wallet={wallet} />;
      case 'settings':
        return <SettingsTab wallet={wallet} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div 
        className="relative w-full max-w-6xl h-[90vh] bg-white/95 dark:bg-gray-800/95 
                   backdrop-blur-xl backdrop-saturate-150 rounded-3xl shadow-2xl 
                   border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
      >
        {/* Header with glass effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        
        <div className="relative p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/50">
                <img src={wallet.image} alt={wallet.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                               dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {wallet.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {wallet.tbaAddress.slice(0, 6)}...{wallet.tbaAddress.slice(-4)}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100/50 dark:bg-gray-700/50 
                       hover:bg-gray-200/50 dark:hover:bg-gray-600/50 
                       backdrop-blur-sm transition-all duration-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap
                         transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r ' + tab.color + ' text-white shadow-lg scale-105'
                    : 'bg-gray-100/50 dark:bg-gray-700/50 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="relative h-[calc(100%-12rem)] overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ wallet: any }> = ({ wallet }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Balance Card */}
      <motion.div 
        className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 
                   backdrop-blur-sm border border-white/20"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Total Balance</h3>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                     bg-clip-text text-transparent">
          ${wallet.balance.total}
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">ETH</span>
            <span className="font-mono">{wallet.balance.eth}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">USDC</span>
            <span className="font-mono">{wallet.balance.usdc}</span>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 
                   backdrop-blur-sm border border-white/20"
        whileHover={{ scale: 1.02 }}
      >
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-gray-700/50 
                           hover:bg-white/70 dark:hover:bg-gray-600/50 
                           flex items-center justify-between group transition-all">
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Send</span>
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-gray-700/50 
                           hover:bg-white/70 dark:hover:bg-gray-600/50 
                           flex items-center justify-between group transition-all">
            <span className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span>Bridge</span>
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-gray-700/50 
                           hover:bg-white/70 dark:hover:bg-gray-600/50 
                           flex items-center justify-between group transition-all">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>Swap</span>
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>

      {/* Security Status */}
      <motion.div 
        className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 
                   backdrop-blur-sm border border-white/20"
        whileHover={{ scale: 1.02 }}
      >
        <h3 className="text-lg font-semibold mb-4">Security Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm">MEV Protection</span>
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-500" />
              <span className="text-sm">2FA</span>
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
              Enabled
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-sm">Guardians</span>
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
              2 Active
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Security Tab Component
const SecurityTab: React.FC<{ wallet: any }> = ({ wallet }) => {
  return (
    <div className="space-y-6">
      <MEVProtectionToggle showDetails={true} />
      <ApprovalsManager 
        className="w-full"
        compactMode={false}
      />
    </div>
  );
};

// Bridge & Buy Tab Component - Uses NetworkAssetManager
const BridgeAndBuyTab: React.FC<{ wallet: any }> = ({ wallet }) => {
  return (
    <div className="space-y-6">
      <NetworkAssetManager 
        className="w-full"
        compactMode={false}
        requiredChainId={84532}
      />
      <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 
                    backdrop-blur-sm border border-white/20">
        <h3 className="text-lg font-semibold mb-3">Bridge & On-Ramp</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Bridge assets between chains or buy crypto with fiat. 
          Full integration coming soon with LI.FI and Transak.
        </p>
      </div>
    </div>
  );
};

// Account Abstraction Tab Component - Placeholder for now
const AccountAbstractionTab: React.FC<{ wallet: any }> = ({ wallet }) => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 
                    backdrop-blur-sm border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-indigo-500" />
          <h3 className="text-lg font-semibold">Smart Account Features</h3>
        </div>
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
            <h4 className="font-medium mb-2">🎯 Gasless Transactions</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ERC-4337 Account Abstraction with Biconomy Paymaster integration
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
            <h4 className="font-medium mb-2">🔑 Session Keys</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Delegate limited permissions for dApp interactions
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
            <h4 className="font-medium mb-2">🛡️ Social Recovery</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Multi-sig recovery with trusted guardians
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Notifications Tab Component - Placeholder
const NotificationsTab: React.FC<{ wallet: any }> = ({ wallet }) => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 
                    backdrop-blur-sm border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold">Push Notifications</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
            <div>
              <p className="font-medium">Transaction Alerts</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notified for incoming/outgoing transactions
              </p>
            </div>
            <button className="w-12 h-6 rounded-full bg-green-500 relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
            <div>
              <p className="font-medium">Price Alerts</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor token price movements
              </p>
            </div>
            <button className="w-12 h-6 rounded-full bg-gray-300 dark:bg-gray-600 relative">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
            <div>
              <p className="font-medium">Security Alerts</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Suspicious activity and approval warnings
              </p>
            </div>
            <button className="w-12 h-6 rounded-full bg-green-500 relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab: React.FC<{ wallet: any }> = ({ wallet }) => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-100/50 dark:bg-gray-600/50">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium">Network</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Base Sepolia</p>
              </div>
            </div>
            <button className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm">
              Change
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-100/50 dark:bg-gray-600/50">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-medium">Gas Settings</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Standard</p>
              </div>
            </div>
            <button className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm">
              Customize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export default for dynamic import
export default WalletDashboard;