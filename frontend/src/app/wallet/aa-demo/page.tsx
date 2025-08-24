/**
 * Account Abstraction Demo Page
 * Test ERC-20 Paymaster and AA features
 */

'use client';

import { useState } from 'react';
import { 
  Fuel, 
  Shield, 
  Key,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  DollarSign,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useActiveAccount } from 'thirdweb/react';
import { GasTokenSelector } from '@/components/aa/GasTokenSelector';
import { SessionManager } from '@/components/aa/SessionManager';
import { RecoveryManager } from '@/components/aa/RecoveryManager';
import { useERC20Paymaster } from '@/hooks/useERC20Paymaster';
import { getAccountStats } from '@/lib/aa/rate-limiter';
import { getAAConfig, CHAIN_IDS } from '@/lib/aa/config';
import { SESSION_CONFIG } from '@/lib/aa/session-keys/config';

export default function AADemoPage() {
  const account = useActiveAccount();
  const address = account?.address;
  const chainId = (account as any)?.chain?.id || CHAIN_IDS.BASE_SEPOLIA;
  
  const paymaster = useERC20Paymaster(chainId);
  const config = getAAConfig(chainId);
  
  const [activeSection, setActiveSection] = useState<'paymaster' | 'session' | 'recovery'>('paymaster');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  
  // Get account stats
  const stats = address ? getAccountStats(address) : null;
  
  const handleSimulateTransaction = async () => {
    if (!address) return;
    
    setIsSimulating(true);
    setSimulationResult(null);
    
    try {
      // Simulate a simple transfer
      const estimatedGas = 50000n; // Example gas
      
      // Get quote in selected token
      if (paymaster.selectedToken) {
        const quote = await paymaster.getQuote(estimatedGas);
        
        setSimulationResult({
          success: true,
          gasToken: paymaster.selectedToken.symbol,
          gasCost: quote?.formattedAmount,
          canPay: paymaster.canPayWithToken(estimatedGas),
        });
      }
    } catch (error: any) {
      setSimulationResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsSimulating(false);
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
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Account Abstraction
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Advanced wallet features demo
                  </p>
                </div>
              </div>
            </div>
            
            {/* Chain badge */}
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              {chainId === CHAIN_IDS.BASE ? 'Base' : 'Base Sepolia'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Feature tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveSection('paymaster')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeSection === 'paymaster'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Fuel className="w-4 h-4" />
                <span>ERC-20 Paymaster</span>
                {config.erc20Paymaster && (
                  <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                    Active
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveSection('session')}
              disabled={!config.sessionKeys}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeSection === 'session'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Key className="w-4 h-4" />
                <span>Session Keys</span>
                {!config.sessionKeys && (
                  <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                    Soon
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveSection('recovery')}
              disabled={!config.recovery}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeSection === 'recovery'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Recovery</span>
                {!config.recovery && (
                  <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                    Soon
                  </span>
                )}
              </div>
            </button>
          </div>
          
          <div className="p-6">
            {/* ERC-20 Paymaster Section */}
            {activeSection === 'paymaster' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Usage stats */}
                {stats && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Today's Usage
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Transactions
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {stats.requestsToday} / {config.paymaster.rateLimit.maxRequestsPerDay}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Spent
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${stats.spentTodayUSD.toFixed(2)} / ${config.paymaster.dailyLimitUSD}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(stats.spentTodayUSD / config.paymaster.dailyLimitUSD) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Gas token selector */}
                <GasTokenSelector 
                  estimatedGas={50000n}
                  onTokenSelect={(token) => console.log('Selected:', token)}
                />
                
                {/* Simulate transaction */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    Test Transaction
                  </h3>
                  
                  <button
                    onClick={handleSimulateTransaction}
                    disabled={isSimulating || !paymaster.selectedToken}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSimulating ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Simulating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" />
                        Simulate Transfer
                      </span>
                    )}
                  </button>
                  
                  {/* Simulation result */}
                  {simulationResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-3 rounded-lg ${
                        simulationResult.success
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {simulationResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        )}
                        <div className="text-sm">
                          {simulationResult.success ? (
                            <>
                              <p className="font-medium text-green-800 dark:text-green-200">
                                Transaction can be sponsored!
                              </p>
                              <p className="text-green-700 dark:text-green-300 mt-1">
                                Gas cost: {simulationResult.gasCost} {simulationResult.gasToken}
                              </p>
                              {!simulationResult.canPay && (
                                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                  ⚠️ Insufficient balance or allowance
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-red-800 dark:text-red-200">
                                Simulation failed
                              </p>
                              <p className="text-red-700 dark:text-red-300 mt-1">
                                {simulationResult.error}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {/* Information */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        About ERC-20 Paymaster
                      </p>
                      <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                        <li>• Pay gas fees with USDC instead of ETH</li>
                        <li>• Daily limit: ${config.paymaster.dailyLimitUSD} per account</li>
                        <li>• Per transaction limit: ${config.paymaster.transactionLimitUSD}</li>
                        <li>• Rate limit: {config.paymaster.rateLimit.maxRequestsPerHour} tx/hour</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Session Keys Section */}
            {activeSection === 'session' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {config.sessionKeys ? (
                  <>
                    <SessionManager />
                    
                    {/* Information */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Key className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                            About Session Keys
                          </p>
                          <ul className="space-y-1 text-purple-700 dark:text-purple-300">
                            <li>• Execute operations without re-signing</li>
                            <li>• Time-limited permissions (max {SESSION_CONFIG.maxTTLHours}h)</li>
                            <li>• Function and value restrictions</li>
                            <li>• Instant revocation with Kill Switch</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Session Keys Coming Soon
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Grant temporary permissions for specific actions without exposing your main key.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Recovery Section */}
            {activeSection === 'recovery' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {config.recovery ? (
                  <>
                    <RecoveryManager />
                    
                    {/* Information */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                            About Social Recovery
                          </p>
                          <ul className="space-y-1 text-purple-700 dark:text-purple-300">
                            <li>• Recover account with guardian approvals</li>
                            <li>• Passkeys for passwordless authentication</li>
                            <li>• Configurable delays and thresholds</li>
                            <li>• P256 verification on Base chains</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Social Recovery Coming Soon
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Set up guardians and passkeys for secure account recovery.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}