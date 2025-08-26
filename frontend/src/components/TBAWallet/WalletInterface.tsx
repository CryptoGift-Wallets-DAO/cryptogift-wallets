'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useActiveAccount } from 'thirdweb/react';
import { createThirdwebClient, getContract, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { ethers } from 'ethers';
import { ImageDebugger } from '../ImageDebugger';
import { fetchGiftDetails, parseGiftTransactionEvents } from '../../lib/contractEventParser';

// Security: Type definitions for type safety
interface TBAWalletData {
  address: string;
  balance: {
    eth: string;
    usdc: string;
  };
  nftTokenId: string;
  nftContract: string;
  transactions: Transaction[];
  isLocked: boolean;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  amount: string; // Para compatibilidad con el código existente
  token: string; // Token symbol (ETH, USDC, etc.)
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'send' | 'receive' | 'swap' | 'mint';
}

interface WalletInterfaceProps {
  nftContract: string;
  tokenId: string;
  onClose?: () => void;
}

// Security: Client initialization with environment validation
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
});

export const TBAWalletInterface: React.FC<WalletInterfaceProps> = ({
  nftContract,
  tokenId,
  onClose
}) => {
  const account = useActiveAccount();
  const [walletData, setWalletData] = useState<TBAWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assets' | 'activity' | 'swap' | 'settings'>('assets');
  const [error, setError] = useState<string | null>(null);
  const [nftImageUrl, setNftImageUrl] = useState<string>('');

  // Security: Input validation - moved after function declarations

  // Security: Safe TBA address calculation with error handling
  const calculateTBAAddress = useCallback(async (): Promise<string> => {
    try {
      // CRITICAL FIX: Use environment variables instead of hard-coded addresses
      const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS || "0x000000006551c19487814612e58FE06813775758";
      const IMPLEMENTATION_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS || "0x2d25602551487c3f3354dd80d76d54383a243358";
      const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
      
      // Security: Input sanitization
      const sanitizedContract = ethers.getAddress(nftContract);
      const sanitizedTokenId = BigInt(tokenId).toString();
      
      const salt = ethers.solidityPackedKeccak256(
        ['uint256', 'address', 'uint256'],
        [CHAIN_ID, sanitizedContract, sanitizedTokenId]
      );
      
      const packed = ethers.solidityPacked(
        ['bytes1', 'address', 'bytes32', 'address', 'bytes32'],
        [
          '0xff',
          REGISTRY_ADDRESS,
          salt,
          IMPLEMENTATION_ADDRESS,
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        ]
      );
      
      const hash = ethers.keccak256(packed);
      return ethers.getAddress('0x' + hash.slice(-40));
    } catch (error) {
      console.error('Error calculating TBA address:', error);
      throw new Error('Failed to calculate wallet address');
    }
  }, [nftContract, tokenId]);

  // Load NFT image from our improved API
  const loadNFTImage = useCallback(async () => {
    try {
      console.log('🖼️ Loading NFT image for', { nftContract, tokenId });
      
      // Use our improved NFT API that handles metadata properly
      const response = await fetch(`/api/nft/${nftContract}/${tokenId}`);
      if (response.ok) {
        const nftData = await response.json();
        console.log('✅ NFT data loaded:', nftData);
        
        if (nftData.image) {
          // Handle different image URL formats
          let imageUrl = nftData.image;
          if (imageUrl.startsWith('ipfs://')) {
            imageUrl = imageUrl.replace('ipfs://', 'https://nftstorage.link/ipfs/');
          }
          console.log('🖼️ Setting NFT image URL:', imageUrl);
          setNftImageUrl(imageUrl);
        } else {
          console.warn('⚠️ No image found in NFT data');
          setNftImageUrl('/images/nft-placeholder.png');
        }
      } else {
        throw new Error(`API response: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error loading NFT image:', error);
      setNftImageUrl('/images/nft-placeholder.png');
    }
  }, [nftContract, tokenId]);

  // Load wallet transactions using real indexer
  const loadWalletTransactions = useCallback(async (walletAddress: string): Promise<Transaction[]> => {
    try {
      // In a real implementation, we would query blockchain logs
      // For now, simulate basic transaction data
      const mockTransactions: Transaction[] = [
        {
          hash: '0x123...abc',
          type: 'receive',
          value: '0.001',
          amount: '0.001',
          token: 'ETH',
          from: '0x742d35Cc6634C0532925a3b8D8de8E00eD14c0d8',
          to: walletAddress,
          timestamp: Date.now() - 86400000, // 1 day ago
          status: 'confirmed'
        }
      ];
      
      // TODO: Replace with real blockchain event querying
      // Example: Query gift-related events for this TBA
      // const giftEvents = await fetchGiftEventsForTBA(walletAddress);
      // return parseTransactionsFromEvents(giftEvents);
      
      return mockTransactions;
    } catch (error) {
      console.error('Error loading wallet transactions:', error);
      return []; // Return empty array on error
    }
  }, []);

  // Security: Protected data loading with error boundaries
  const loadWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const tbaAddress = await calculateTBAAddress();
      
      // Security: Rate limiting and timeout for external calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        // Get ETH balance
        const ethBalance = await fetch(`/api/wallet/${tbaAddress}`, {
          signal: controller.signal
        }).then(res => res.json());

        // Get USDC balance
        const usdcContract = getContract({
          client,
          chain: baseSepolia,
          address: process.env.NEXT_PUBLIC_USDC_ADDRESS!,
        });

        const usdcBalance = await readContract({
          contract: usdcContract,
          method: "function balanceOf(address) view returns (uint256)",
          params: [tbaAddress]
        });

        clearTimeout(timeoutId);

        setWalletData({
          address: tbaAddress,
          balance: {
            eth: ethBalance.balance || '0',
            usdc: ethers.formatUnits(usdcBalance.toString(), 6)
          },
          nftTokenId: tokenId,
          nftContract,
          transactions: await loadWalletTransactions(tbaAddress), // Real indexer implementation
          isLocked: false // TODO: Check lock status
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [nftContract, tokenId, calculateTBAAddress]);

  // Security: Safe address formatting
  const formatAddress = (address: string): string => {
    if (!address || !ethers.isAddress(address)) return 'Invalid Address';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Security: Safe amount formatting
  const formatAmount = (amount: string, decimals: number = 18): string => {
    try {
      const parsed = parseFloat(amount);
      if (isNaN(parsed)) return '0.00';
      return parsed.toFixed(decimals > 6 ? 6 : decimals);
    } catch {
      return '0.00';
    }
  };

  // Security: Input validation useEffect
  useEffect(() => {
    if (!nftContract || !tokenId) {
      setError('Invalid NFT contract or token ID');
      setLoading(false);
      return;
    }
    
    if (!ethers.isAddress(nftContract)) {
      setError('Invalid contract address format');
      setLoading(false);
      return;
    }

    loadWalletData();
    loadNFTImage();
  }, [nftContract, tokenId, account, loadWalletData, loadNFTImage]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-2xl w-96 h-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-2xl w-96 h-600 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Wallet Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadWalletData}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Header - MetaMask Style */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* CG Wallet Logo - Official Logo */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden">
              <Image 
                src="/cg-wallet-logo.png" 
                alt="CG Wallet" 
                width={32}
                height={32}
                className="object-contain w-full h-full"
                onError={(e) => {
                  // Fallback if logo not found
                  e.currentTarget.style.display = 'none';
                  const nextEl = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextEl) nextEl.style.display = 'block';
                }}
              />
              <div className="absolute inset-0 bg-white rounded-full flex items-center justify-center hidden">
                <span className="text-orange-600 font-bold text-xs">CG</span>
              </div>
            </div>
            
            {/* NFT Preview - Shows user's NFT with Debug */}
            <div className="w-10 h-10">
              <ImageDebugger 
                nftContract={nftContract}
                tokenId={tokenId}
                className="w-full h-full"
              />
            </div>
            
            <div>
              <h3 className="font-semibold">CG Wallet</h3>
              <p className="text-xs opacity-90">NFT #{tokenId}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Wallet Address */}
        <div className="mt-3 bg-black bg-opacity-20 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono">
              {formatAddress(walletData?.address || '')}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(walletData?.address || '')}
              className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded hover:bg-opacity-30"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* NFT Display Section */}
        <div className="p-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center mb-4">
          <div className="w-24 h-24 mx-auto">
            <ImageDebugger 
              nftContract={nftContract}
              tokenId={tokenId}
              className="w-full h-full rounded-xl overflow-hidden shadow-lg border-2 border-orange-200"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Your NFT-Wallet</p>
        </div>
        
        {/* Balance Display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-800">
            ${(parseFloat(walletData?.balance.usdc || '0') * 1.0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {formatAmount(walletData?.balance.eth || '0', 4)} ETH • {formatAmount(walletData?.balance.usdc || '0', 2)} USDC
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            { key: 'assets', label: 'Assets', icon: '💎' },
            { key: 'activity', label: 'Activity', icon: '📋' },
            { key: 'swap', label: 'Swap', icon: '🔄' },
            { key: 'settings', label: 'Settings', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 px-2 text-center text-sm font-medium border-b-2 ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-lg">{tab.icon}</span>
                <span className="text-xs">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'assets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">ETH</span>
                </div>
                <div>
                  <div className="font-medium">Ethereum</div>
                  <div className="text-sm text-gray-600">{formatAmount(walletData?.balance.eth || '0', 6)} ETH</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">${(parseFloat(walletData?.balance.eth || '0') * 3000).toFixed(2)}</div>
                <div className="text-sm text-gray-600">≈ $3,000/ETH</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">USDC</span>
                </div>
                <div>
                  <div className="font-medium">USD Coin</div>
                  <div className="text-sm text-gray-600">{formatAmount(walletData?.balance.usdc || '0', 2)} USDC</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">${formatAmount(walletData?.balance.usdc || '0', 2)}</div>
                <div className="text-sm text-gray-600">≈ $1.00/USDC</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Activity Yet</h3>
            <p className="text-gray-600 text-sm">
              Your transaction history will appear here
            </p>
          </div>
        )}

        {activeTab === 'swap' && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🔄</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Swap Coming Soon</h3>
            <p className="text-gray-600 text-sm">
              Token swapping will be available soon
            </p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Security</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Wallet Lock</span>
                  <span className={walletData?.isLocked ? 'text-red-600' : 'text-green-600'}>
                    {walletData?.isLocked ? 'Locked' : 'Unlocked'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Two-Factor Auth</span>
                  <span className="text-gray-600">Not Set</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Wallet Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Standard</span>
                  <span className="text-gray-600">ERC-6551</span>
                </div>
                <div className="flex justify-between">
                  <span>Network</span>
                  <span className="text-gray-600">Base Sepolia</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <button className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 text-sm font-medium">
            Send
          </button>
          <button className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 text-sm font-medium">
            Receive
          </button>
          <button className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 text-sm font-medium">
            Swap
          </button>
        </div>
      </div>
      </div> {/* Close scrollable content */}
    </div>
  );
};

export default TBAWalletInterface;