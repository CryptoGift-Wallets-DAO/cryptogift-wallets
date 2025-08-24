/**
 * Transaction History Page
 * Demo page for consolidated transaction history
 */

'use client';

import React from 'react';
import { TransactionHistory } from '@/components/history/TransactionHistory';
import { Clock, TrendingUp, Shield, Smartphone, Database, Filter } from 'lucide-react';
import { isTransactionHistoryEnabled } from '@/lib/history/config';

export default function TransactionHistoryPage() {
  const isEnabled = isTransactionHistoryEnabled();
  
  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-16">
          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Transaction History</h1>
          <p className="text-gray-600 mb-8">
            This feature is currently disabled. Enable it via environment variables.
          </p>
          <div className="inline-block text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <code className="text-sm">
              NEXT_PUBLIC_FEATURE_TX_HISTORY=on
            </code>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Transaction History</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Consolidated on-chain transaction history across all networks.
        </p>
      </div>

      {/* Features Notice */}
      <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex gap-3">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
              DIY On-Chain Scanner
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This implementation directly queries the blockchain for transaction data. 
              No external APIs or dependencies required. Supports native transfers, 
              ERC-20 tokens, and NFT transfers.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History Component */}
      <div className="mb-8">
        <TransactionHistory />
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            Data Sources
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span><strong>Native Transactions:</strong> Direct ETH/token transfers</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span><strong>ERC-20 Transfers:</strong> Token movements via Transfer events</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span><strong>NFT Transfers:</strong> ERC-721/1155 token transfers</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span><strong>Contract Calls:</strong> Smart contract interactions</span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Filter className="h-5 w-5 text-green-500" />
            Filtering & Export
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span><strong>Direction:</strong> Filter by sent/received</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span><strong>Type:</strong> Native, Token, NFT transactions</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span><strong>Status:</strong> Success, Failed, Pending</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span><strong>Export:</strong> CSV and JSON formats</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Performance Notice */}
      <div className="mb-8 p-6 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          Performance & Limitations
        </h3>
        <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
          <p>
            <strong>Block Range:</strong> Scans up to 10,000 blocks per request (configurable)
          </p>
          <p>
            <strong>Pagination:</strong> Loads 20 transactions at a time with infinite scroll
          </p>
          <p>
            <strong>Caching:</strong> 5-minute cache to reduce RPC calls (configurable)
          </p>
          <p>
            <strong>Rate Limits:</strong> Be aware of your RPC provider's rate limits
          </p>
          <p className="pt-2 text-xs">
            For production use, consider using indexed services like The Graph or Alchemy's 
            enhanced APIs for better performance.
          </p>
        </div>
      </div>

      {/* Mobile Support */}
      <div className="mb-8 p-6 rounded-lg border bg-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-purple-500" />
          Mobile Experience
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">Optimizations</h4>
            <ul className="space-y-1">
              <li>• Responsive layout with compact mode</li>
              <li>• Touch-friendly expandable details</li>
              <li>• Swipe gestures for navigation</li>
              <li>• Optimized data loading</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Features</h4>
            <ul className="space-y-1">
              <li>• Pull-to-refresh support</li>
              <li>• Infinite scroll pagination</li>
              <li>• Quick copy actions</li>
              <li>• Direct explorer links</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <details className="mb-8 p-6 rounded-lg border bg-card">
        <summary className="font-semibold cursor-pointer">
          Technical Implementation
        </summary>
        <div className="mt-4 space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">Architecture</h4>
            <p>
              DIY implementation using viem for direct blockchain queries. No external 
              dependencies or indexing services required. Scans blocks in batches and 
              aggregates transaction data from multiple sources.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Data Aggregation</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Native transactions via block scanning</li>
              <li>ERC-20 transfers via Transfer event logs</li>
              <li>NFT transfers via Transfer/TransferSingle/TransferBatch events</li>
              <li>Automatic deduplication and sorting</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Performance</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Batch processing with configurable block ranges</li>
              <li>In-memory caching with TTL</li>
              <li>Lazy loading with pagination</li>
              <li>Parallel RPC calls for efficiency</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Configuration</h4>
            <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              {`NEXT_PUBLIC_FEATURE_TX_HISTORY=on
NEXT_PUBLIC_TX_HISTORY_MAX_BLOCKS=10000
NEXT_PUBLIC_TX_HISTORY_PAGE_SIZE=20
NEXT_PUBLIC_TX_HISTORY_CACHE_TTL=300
NEXT_PUBLIC_TX_HISTORY_TOKENS=on
NEXT_PUBLIC_TX_HISTORY_NFTS=on`}
            </code>
          </div>
        </div>
      </details>

      {/* Configuration Info */}
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <h3 className="font-semibold mb-2 text-sm">Current Configuration</h3>
        <div className="space-y-1 text-xs font-mono">
          <div>FEATURE_TX_HISTORY: {process.env.NEXT_PUBLIC_FEATURE_TX_HISTORY || 'off'}</div>
          <div>MAX_BLOCKS: {process.env.NEXT_PUBLIC_TX_HISTORY_MAX_BLOCKS || '10000'}</div>
          <div>PAGE_SIZE: {process.env.NEXT_PUBLIC_TX_HISTORY_PAGE_SIZE || '20'}</div>
          <div>CACHE_TTL: {process.env.NEXT_PUBLIC_TX_HISTORY_CACHE_TTL || '300'}s</div>
          <div>INCLUDE_TOKENS: {process.env.NEXT_PUBLIC_TX_HISTORY_TOKENS || 'on'}</div>
          <div>INCLUDE_NFTS: {process.env.NEXT_PUBLIC_TX_HISTORY_NFTS || 'on'}</div>
        </div>
      </div>
    </div>
  );
}