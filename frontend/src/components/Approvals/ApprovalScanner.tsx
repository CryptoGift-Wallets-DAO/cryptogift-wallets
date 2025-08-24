"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCheck, AlertTriangle, X, Search, Shield, 
  ExternalLink, RefreshCw, CheckCircle, Info, Trash2 
} from 'lucide-react';

interface Approval {
  token: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  spender: {
    address: string;
    name?: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
  };
  value: string;
  isUnlimited: boolean;
  timestamp: number;
  txHash: string;
}

interface ApprovalScannerProps {
  address: string;
  chainId: number;
}

export const ApprovalScanner: React.FC<ApprovalScannerProps> = ({ address, chainId }) => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [filter, setFilter] = useState<'all' | 'high-risk' | 'unlimited'>('all');

  useEffect(() => {
    // Load cached approvals
    loadCachedApprovals();
  }, [address, chainId]);

  const loadCachedApprovals = () => {
    const cached = localStorage.getItem(`approvals_${chainId}_${address}`);
    if (cached) {
      const data = JSON.parse(cached);
      setApprovals(data.approvals);
      setLastScan(new Date(data.timestamp));
    }
  };

  const scanApprovals = async () => {
    setIsScanning(true);
    
    // Simulated scan - in production, this would call a real API
    setTimeout(() => {
      const mockApprovals: Approval[] = [
        {
          token: {
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
          },
          spender: {
            address: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
            name: '1inch Router',
            risk: 'low',
          },
          value: '1000000',
          isUnlimited: false,
          timestamp: Date.now() - 86400000,
          txHash: '0x123...abc',
        },
        {
          token: {
            address: '0x4200000000000000000000000000000000000006',
            symbol: 'WETH',
            name: 'Wrapped Ether',
            decimals: 18,
          },
          spender: {
            address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
            name: 'Uniswap V3 Router',
            risk: 'low',
          },
          value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
          isUnlimited: true,
          timestamp: Date.now() - 172800000,
          txHash: '0x456...def',
        },
        {
          token: {
            address: '0xUnknownToken',
            symbol: 'SCAM',
            name: 'Suspicious Token',
            decimals: 18,
          },
          spender: {
            address: '0xBadActor',
            risk: 'critical',
          },
          value: '999999999999999999999999',
          isUnlimited: true,
          timestamp: Date.now() - 3600000,
          txHash: '0x789...ghi',
        },
      ];

      setApprovals(mockApprovals);
      setLastScan(new Date());
      
      // Cache the results
      localStorage.setItem(`approvals_${chainId}_${address}`, JSON.stringify({
        approvals: mockApprovals,
        timestamp: new Date().toISOString(),
      }));

      setIsScanning(false);
    }, 2000);
  };

  const revokeApproval = async (approval: Approval) => {
    console.log('Revoking approval:', approval);
    // In production, this would send a revoke transaction
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const filteredApprovals = approvals.filter(approval => {
    if (filter === 'all') return true;
    if (filter === 'high-risk') return ['high', 'critical'].includes(approval.spender.risk);
    if (filter === 'unlimited') return approval.isUnlimited;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 
                 backdrop-blur-xl backdrop-saturate-150 border border-white/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 
                         dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Token Approvals
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lastScan ? `Last scan: ${lastScan.toLocaleTimeString()}` : 'Never scanned'}
            </p>
          </div>
        </div>

        <button
          onClick={scanApprovals}
          disabled={isScanning}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 
                   text-white font-medium flex items-center gap-2 hover:shadow-lg 
                   transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'high-risk', 'unlimited'] as const).map(filterType => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              filter === filterType
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100/50 dark:bg-gray-700/50 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'
            }`}
          >
            {filterType === 'all' ? 'All' : filterType === 'high-risk' ? 'High Risk' : 'Unlimited'}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredApprovals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {approvals.length === 0 
              ? 'No approvals found. Click "Scan Now" to search.'
              : 'No approvals match the selected filter.'}
          </div>
        ) : (
          filteredApprovals.map((approval, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 
                       dark:hover:bg-gray-600/50 transition-all cursor-pointer"
              onClick={() => setSelectedApproval(approval)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    approval.spender.risk === 'critical' ? 'bg-red-500' :
                    approval.spender.risk === 'high' ? 'bg-orange-500' :
                    approval.spender.risk === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{approval.token.symbol}</span>
                      {approval.isUnlimited && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400">
                          Unlimited
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {approval.spender.name || `${approval.spender.address.slice(0, 6)}...${approval.spender.address.slice(-4)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getRiskColor(approval.spender.risk)}`}>
                    {approval.spender.risk} risk
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      revokeApproval(approval);
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedApproval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedApproval(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Approval Details</h3>
                <button
                  onClick={() => setSelectedApproval(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Token</p>
                  <p className="font-medium">{selectedApproval.token.name} ({selectedApproval.token.symbol})</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Spender</p>
                  <p className="font-mono text-sm">{selectedApproval.spender.address}</p>
                  {selectedApproval.spender.name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedApproval.spender.name}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount</p>
                  <p className="font-medium">
                    {selectedApproval.isUnlimited ? 'Unlimited' : selectedApproval.value}
                  </p>
                </div>

                <button
                  onClick={() => revokeApproval(selectedApproval)}
                  className="w-full px-4 py-3 rounded-xl bg-red-500 text-white font-medium 
                           hover:bg-red-600 transition-colors"
                >
                  Revoke Approval
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};