/**
 * MEV Protection Settings Page
 * Demonstrates the MEV Protection Toggle implementation
 */

'use client';

import React from 'react';
import { MEVProtectionToggle } from '@/components/wallet/MEVProtectionToggle';
import { Shield } from 'lucide-react';

export default function MEVSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold">MEV Protection Settings</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Configure Maximum Extractable Value (MEV) protection for your transactions.
          Shield your trades from front-running and sandwich attacks.
        </p>
      </div>

      {/* MEV Protection Toggle */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Protection Status</h2>
        <MEVProtectionToggle showDetails={true} />
      </div>

      {/* Information Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">What is MEV?</h3>
          <p className="text-sm text-muted-foreground">
            MEV (Maximum Extractable Value) refers to the profit that can be extracted 
            from reordering, inserting, or censoring transactions within a block. 
            This includes front-running, back-running, and sandwich attacks that can 
            cost users significant amounts in slippage and failed transactions.
          </p>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">How Protection Works</h3>
          <p className="text-sm text-muted-foreground">
            Flashbots Protect routes your transactions through a private mempool, 
            hiding them from MEV bots. Transactions are only included if they succeed, 
            saving you from paying for failed transactions. You may also receive 
            MEV refunds when your transactions create arbitrage opportunities.
          </p>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Benefits of MEV Protection</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
            </div>
            <div>
              <p className="font-medium">Front-running Protection</p>
              <p className="text-sm text-muted-foreground">
                Your transactions are hidden from MEV bots that would otherwise front-run your trades
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
            </div>
            <div>
              <p className="font-medium">No Failed Transaction Fees</p>
              <p className="text-sm text-muted-foreground">
                Transactions are only included if they succeed, saving gas on failures
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
            </div>
            <div>
              <p className="font-medium">MEV Refunds</p>
              <p className="text-sm text-muted-foreground">
                Receive refunds when your transactions create MEV opportunities
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
            </div>
            <div>
              <p className="font-medium">Gas Fee Refunds</p>
              <p className="text-sm text-muted-foreground">
                Get refunds on high priority fees when using Flashbots Protect
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Network Support */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Network Support</h2>
        <div className="space-y-3">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Ethereum Mainnet</span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded-full">
                Supported
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Full MEV protection with Flashbots Protect RPC
            </p>
          </div>

          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Sepolia Testnet</span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded-full">
                Supported
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Test MEV protection features on Sepolia
            </p>
          </div>

          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Base</span>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitoring for Base-compatible private RPC solutions
            </p>
          </div>

          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Base Sepolia</span>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Will be supported when Base protection is available
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <details className="p-4 rounded-lg border">
            <summary className="font-medium cursor-pointer">
              Is MEV Protection free to use?
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">
              Yes, Flashbots Protect is free to use. In fact, you may save money through 
              avoided sandwich attacks and receive refunds on gas fees and MEV.
            </p>
          </details>

          <details className="p-4 rounded-lg border">
            <summary className="font-medium cursor-pointer">
              Will MEV Protection slow down my transactions?
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">
              In most cases, transactions through Flashbots Protect are included as quickly 
              as regular transactions. You can use "fast mode" for even quicker inclusion 
              when speed is critical.
            </p>
          </details>

          <details className="p-4 rounded-lg border">
            <summary className="font-medium cursor-pointer">
              Why isn't MEV Protection available on Base?
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">
              Flashbots Protect currently only supports Ethereum mainnet and Sepolia testnet. 
              We're actively monitoring for Base-compatible solutions and will enable 
              protection as soon as a reliable option becomes available.
            </p>
          </details>

          <details className="p-4 rounded-lg border">
            <summary className="font-medium cursor-pointer">
              Can I disable MEV Protection for specific transactions?
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">
              Yes, you can toggle MEV Protection on or off at any time. Your preference 
              is saved per network and will be remembered for future sessions.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}