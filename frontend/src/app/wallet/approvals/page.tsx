/**
 * Token Approvals Management Page
 * Demonstrates the Approvals/Allowances system implementation
 */

'use client';

import React from 'react';
import { ApprovalsManager } from '@/components/wallet/ApprovalsManager';
import { Shield, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { isApprovalsEnabled } from '@/lib/approvals/config';

export default function ApprovalsPage() {
  const isEnabled = isApprovalsEnabled();
  
  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-16">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Token Approvals Management</h1>
          <p className="text-gray-600 mb-8">
            This feature is currently disabled. Enable it via environment variables.
          </p>
          <div className="inline-block text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <code className="text-sm">
              NEXT_PUBLIC_FEATURE_APPROVALS=on
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
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Token Approvals Management</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Review and revoke token spending permissions to protect your assets from malicious contracts.
        </p>
      </div>

      {/* Risk Alert */}
      <div className="mb-6 p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
              Why This Matters
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Token approvals allow contracts to spend your tokens. Malicious or compromised contracts 
              with unlimited approvals can drain your wallet. Regularly reviewing and revoking unnecessary 
              approvals is a critical security practice.
            </p>
          </div>
        </div>
      </div>

      {/* Approvals Manager */}
      <div className="mb-8">
        <ApprovalsManager />
      </div>

      {/* Information Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Understanding Risk Levels
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mt-1.5"></span>
              <div>
                <span className="font-medium text-foreground">Critical:</span> Unlimited approval to unknown contract
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mt-1.5"></span>
              <div>
                <span className="font-medium text-foreground">High:</span> Large or unlimited approval
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mt-1.5"></span>
              <div>
                <span className="font-medium text-foreground">Medium:</span> Moderate approval amount
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mt-1.5"></span>
              <div>
                <span className="font-medium text-foreground">Low:</span> Small approval to trusted contract
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Best Practices
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Regularly review your approvals (weekly recommended)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Revoke approvals after using DeFi protocols</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Never approve unlimited amounts unless necessary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Verify contract addresses before approving</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Use hardware wallets for high-value approvals</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Technical Details */}
      <details className="mb-8 p-6 rounded-lg border bg-card">
        <summary className="font-semibold cursor-pointer">
          Technical Implementation Details
        </summary>
        <div className="mt-4 space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">Scanning Process</h4>
            <p>
              The scanner uses paginated <code>eth_getLogs</code> queries to find all Approval and 
              ApprovalForAll events for your address. It then verifies the current state on-chain 
              to eliminate false positives from revoked approvals.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Supported Token Standards</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ERC-20: Standard fungible tokens (USDC, DAI, etc.)</li>
              <li>ERC-721: Non-fungible tokens (NFTs)</li>
              <li>ERC-1155: Multi-token standard (gaming items, etc.)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Race Condition Protection</h4>
            <p>
              For ERC-20 tokens, we always set allowance to 0 before setting a new value. This 
              prevents the double-spend attack that can occur when directly changing from one 
              non-zero value to another.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Performance Optimizations</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Block range pagination (2K-10K blocks per request)</li>
              <li>Result caching with configurable TTL</li>
              <li>Parallel verification of approval states</li>
              <li>Progressive scanning with real-time updates</li>
            </ul>
          </div>
        </div>
      </details>

      {/* Configuration Info */}
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <h3 className="font-semibold mb-2 text-sm">Configuration</h3>
        <div className="space-y-1 text-xs font-mono">
          <div>NEXT_PUBLIC_FEATURE_APPROVALS: {process.env.NEXT_PUBLIC_FEATURE_APPROVALS || 'off'}</div>
          <div>NEXT_PUBLIC_APPROVALS_MAX_BLOCK_RANGE: {process.env.NEXT_PUBLIC_APPROVALS_MAX_BLOCK_RANGE || '5000'}</div>
          <div>NEXT_PUBLIC_APPROVALS_CACHE_TTL: {process.env.NEXT_PUBLIC_APPROVALS_CACHE_TTL || '300'}s</div>
        </div>
      </div>
    </div>
  );
}