/**
 * Network & Assets Management Page
 * Demo page for wallet_addEthereumChain and wallet_watchAsset
 */

'use client';

import React from 'react';
import { NetworkAssetManager } from '@/components/wallet/NetworkAssetManager';
import { Globe, Coins, Info, AlertTriangle, Smartphone } from 'lucide-react';
import { isWalletManagementEnabled } from '@/lib/wallet/networkConfig';

export default function NetworkAssetsPage() {
  const isEnabled = isWalletManagementEnabled();
  
  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-16">
          <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Network & Asset Management</h1>
          <p className="text-gray-600 mb-8">
            This feature is currently disabled. Enable it via environment variables.
          </p>
          <div className="inline-block text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <code className="text-sm">
              NEXT_PUBLIC_FEATURE_WALLET_MANAGEMENT=on
            </code>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Network & Asset Management</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          One-click network setup and token addition for Base ecosystem.
        </p>
      </div>

      {/* Important Notice */}
      <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
              Quick Setup Guide
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Use the buttons below to quickly add Base networks and tokens to your wallet. 
              Your wallet will prompt you to confirm each addition. This is a standard Web3 
              feature supported by MetaMask and other wallets.
            </p>
          </div>
        </div>
      </div>

      {/* Network Asset Manager */}
      <div className="mb-8">
        <NetworkAssetManager requiredChainId={84532} />
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Supported Networks
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span><strong>Base Mainnet:</strong> Production network (Chain ID: 8453)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span><strong>Base Sepolia:</strong> Test network (Chain ID: 84532)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span><strong>Ethereum:</strong> Reference only (Chain ID: 1)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
              <span><strong>Sepolia:</strong> Ethereum testnet (Chain ID: 11155111)</span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Coins className="h-5 w-5 text-green-500" />
            Available Tokens
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span><strong>USDC:</strong> Stablecoin on Base Sepolia</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span><strong>PLAYER:</strong> Game token for rewards</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span><strong>CGIFT NFT:</strong> CryptoGift NFT collection</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              <span><strong>PET NFT:</strong> Pet Edition collection</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Mobile Limitations */}
      <div className="mb-8 p-6 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          Mobile Wallet Limitations
        </h3>
        <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
          <p>
            <strong>ERC-20 Tokens:</strong> ✅ Fully supported on mobile wallets
          </p>
          <p>
            <strong>NFTs (ERC-721/1155):</strong> ⚠️ Not supported on mobile MetaMask. 
            Use desktop browser extension for NFT addition.
          </p>
          <p>
            <strong>Network Addition:</strong> ✅ Works on both mobile and desktop
          </p>
          <p className="pt-2 text-xs">
            Note: NFT support via wallet_watchAsset is experimental even on desktop and may vary by wallet.
          </p>
        </div>
      </div>

      {/* Technical Details */}
      <details className="mb-8 p-6 rounded-lg border bg-card">
        <summary className="font-semibold cursor-pointer">
          Technical Implementation
        </summary>
        <div className="mt-4 space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">wallet_addEthereumChain</h4>
            <p>
              Standard EIP-3085 method for adding new networks. The wallet first attempts to switch 
              to the network, and if it doesn't exist, prompts the user to add it with the provided 
              configuration.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">wallet_watchAsset</h4>
            <p>
              EIP-747 method for suggesting tokens to track. Currently supports ERC-20 tokens reliably. 
              NFT support (ERC-721/1155) is experimental and limited to desktop browsers.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Error Handling</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>4001: User rejected the request</li>
              <li>4902: Unrecognized chain (triggers add flow)</li>
              <li>-32002: Request already pending</li>
              <li>4200: Method not supported by wallet</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Mobile Deep Links</h4>
            <p>
              When enabled, the system can generate MetaMask deep links for mobile users:
              <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                metamask://dapp/[your-site-url]
              </code>
            </p>
          </div>
        </div>
      </details>

      {/* Configuration Info */}
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <h3 className="font-semibold mb-2 text-sm">Current Configuration</h3>
        <div className="space-y-1 text-xs font-mono">
          <div>FEATURE_WALLET_MANAGEMENT: {process.env.NEXT_PUBLIC_FEATURE_WALLET_MANAGEMENT || 'off'}</div>
          <div>AUTO_SWITCH_NETWORK: {process.env.NEXT_PUBLIC_AUTO_SWITCH_NETWORK || 'true'}</div>
          <div>SHOW_NETWORK_WARNINGS: {process.env.NEXT_PUBLIC_SHOW_NETWORK_WARNINGS || 'true'}</div>
          <div>ENABLE_MOBILE_DEEPLINKS: {process.env.NEXT_PUBLIC_ENABLE_MOBILE_DEEPLINKS || 'true'}</div>
          <div>Current RPC: {process.env.NEXT_PUBLIC_RPC_URL?.slice(0, 50)}...</div>
        </div>
      </div>
    </div>
  );
}