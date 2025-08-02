"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { client } from '../client';
import { RightSlideWallet } from '../../components/TBAWallet/RightSlideWallet';
import { ExtensionInstaller } from '../../components/BrowserExtension/ExtensionInstaller';
import { AdvancedSecurity } from '../../components/Security/AdvancedSecurity';
import { AccountManagement } from '../../components/Account/AccountManagement';
import { ExpiredGiftManager } from '../../components/escrow/ExpiredGiftManager';
import { ConnectAndAuthButton } from '../../components/ConnectAndAuthButton';
import { getAuthState, isAuthValid } from '../../lib/siweClient';
import { NFTImage } from '../../components/NFTImage';
import { NFTImageModal } from '../../components/ui/NFTImageModal';
import { DashboardGlassHeader } from '../../components/ui/GlassPanelHeader';
import { ChainSwitcher } from '../../components/ChainSwitcher';

interface UserWallet {
  id: string;
  name: string;
  address: string;
  tbaAddress: string;
  nftContract: string;
  tokenId: string;
  image: string;
  description?: string;
  balance: {
    eth: string;
    usdc: string;
    total: string;
  };
  isActive: boolean;
}

export default function MyWalletsPage() {
  const account = useActiveAccount();
  const [mounted, setMounted] = useState(false);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [showWalletInterface, setShowWalletInterface] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [imageModalData, setImageModalData] = useState<{
    isOpen: boolean;
    image: string;
    name: string;
    tokenId: string;
    contractAddress: string;
  }>({ isOpen: false, image: '', name: '', tokenId: '', contractAddress: '' });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication status when account changes
  useEffect(() => {
    const checkAuth = () => {
      const authState = getAuthState();
      const isValid = isAuthValid();
      const authenticated = authState.isAuthenticated && isValid && 
                          authState.address?.toLowerCase() === account?.address?.toLowerCase();
      setIsAuthenticated(authenticated);
    };

    if (account?.address) {
      checkAuth();
    } else {
      setIsAuthenticated(false);
    }
  }, [account?.address]);

  const loadUserWallets = useCallback(async () => {
    if (!account?.address) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Loading NFT-Wallets for user:', account.address);
      
      // FIXED: Use real API to get user's NFT wallets
      const response = await fetch(`/api/user/nft-wallets?userAddress=${account.address}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ NFT-Wallets loaded:', data);
      
      if (data.success && data.wallets) {
        setWallets(data.wallets);
        
        // Set first wallet as active if none is set
        const activeWalletExists = data.wallets.some((w: UserWallet) => w.isActive);
        if (!activeWalletExists && data.wallets.length > 0) {
          setActiveWallet(data.wallets[0].id);
        } else {
          const activeWallet = data.wallets.find((w: UserWallet) => w.isActive);
          setActiveWallet(activeWallet?.id || null);
        }
      } else {
        console.log('⚠️ No NFT-Wallets found for user');
        setWallets([]);
        setActiveWallet(null);
      }
    } catch (error) {
      console.error('Error loading user wallets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  // Load user's wallets only when authenticated
  useEffect(() => {
    if (account?.address && isAuthenticated) {
      loadUserWallets();
    }
  }, [account, isAuthenticated, loadUserWallets]);

  const handleWalletSelect = (wallet: UserWallet) => {
    setSelectedWallet(wallet);
    setShowWalletInterface(true);
  };

  // Helper function to get active wallet (prevents complex inline logic)
  const getActiveWallet = (): UserWallet | null => {
    return wallets.find(w => w.id === activeWallet) || null;
  };

  const handleSetAsActive = async (walletId: string) => {
    setActiveWallet(walletId);
    setWallets(prev => prev.map(w => ({ 
      ...w, 
      isActive: w.id === walletId 
    })));
    
    // Save to localStorage
    localStorage.setItem('activeWalletId', walletId);
    
    // TODO: Sync with backend when API is ready
    // try {
    //   await fetch('/api/user/set-active-wallet', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ walletId })
    //   });
    // } catch (error) {
    //   console.error('Failed to sync active wallet:', error);
    // }
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  // CRITICAL FIX: Handle authentication flow properly
  if (!account || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 
                     dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary transition-all duration-500">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
            <Image
              src="/cg-wallet-logo.png"
              alt="CG Wallet"
              width={56}
              height={56}
              className="object-contain w-full h-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2 transition-colors duration-300">Mis CryptoGift Wallets</h1>
          <p className="text-text-secondary mb-6 transition-colors duration-300">
            {!account 
              ? "Conecta tu wallet para ver y gestionar tus NFT-Wallets de CryptoGift"
              : "Autentica tu wallet para acceder a tus NFT-Wallets de forma segura"
            }
          </p>
          
          {/* AUTHENTICATION FIX: Use proper auth component */}
          <ConnectAndAuthButton 
            onAuthChange={(authenticated, address) => {
              console.log('🔐 Auth change in my-wallets:', { authenticated, address });
              setIsAuthenticated(authenticated);
            }}
            showAuthStatus={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 
                   dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary transition-all duration-500">
      {/* Glass Panel Header with advanced blur effects */}
      <DashboardGlassHeader
        title="Mis CryptoGift Wallets"
        subtitle="Gestiona todas tus NFT-Wallets desde un solo lugar"
        icon={
          <div className="w-12 h-12 flex items-center justify-center 
                        bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                        rounded-xl shadow-lg border border-blue-200/30 dark:border-blue-700/30 
                        backdrop-blur-sm transition-all duration-300">
            <Image
              src="/cg-wallet-logo.png"
              alt="CG Wallet"
              width={48}
              height={48}
              className="object-contain drop-shadow-lg w-10 h-10"
            />
          </div>
        }
        className="mb-8"
      >
        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <ConnectAndAuthButton />
        </div>
      </DashboardGlassHeader>

      <div className="container mx-auto px-4 py-8">

        {/* Chain Switcher - Critical for mobile wallets */}
        <div className="max-w-4xl mx-auto mb-6">
          <ChainSwitcher onChainChanged={(chainId) => {
            console.log('🔗 Chain changed in my-wallets:', chainId);
          }} />
        </div>

        {/* Wallet Selector */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-bg-card rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary transition-colors duration-300">Wallet Activa</h2>
              <div className="flex items-center space-x-2 text-sm text-text-secondary transition-colors duration-300">
                <span className="w-2 h-2 bg-green-500 dark:bg-accent-gold rounded-full transition-colors duration-300"></span>
                <span>Conectada</span>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 dark:border-accent-gold mx-auto mb-4 transition-colors duration-300"></div>
                <p className="text-text-secondary transition-colors duration-300">Cargando tus wallets...</p>
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-text-muted text-4xl mb-4 transition-colors duration-300">📭</div>
                <h3 className="text-lg font-medium text-text-primary mb-2 transition-colors duration-300">No tienes wallets aún</h3>
                <p className="text-text-secondary mb-6 transition-colors duration-300">
                  Crea o recibe tu primer CryptoGift para empezar
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-orange-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-orange-600 dark:hover:bg-accent-gold/80 transition-all duration-300"
                >
                  Crear Mi Primer Regalo
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      wallet.isActive
                        ? 'border-orange-500 dark:border-accent-gold bg-orange-50 dark:bg-accent-gold/20'
                        : 'border-border-primary hover:border-border-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* NFT Image - With Double-Click Modal */}
                        <div 
                          className="w-12 h-12 rounded-lg overflow-hidden border-2 border-orange-200 dark:border-accent-gold/30 transition-colors duration-300 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => {
                            console.log('🖼️ Opening NFT image modal for wallet:', wallet.name);
                            setImageModalData({
                              isOpen: true,
                              image: wallet.image,
                              name: wallet.name,
                              tokenId: wallet.tokenId,
                              contractAddress: wallet.nftContract
                            });
                          }}
                          title="Click to view full image"
                        >
                          <NFTImage
                            src={wallet.image}
                            alt={wallet.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-contain bg-white/50" // FIXED: object-contain instead of object-cover
                            tokenId={wallet.id}
                            fit="contain"
                          />
                        </div>
                        
                        {/* Wallet Info */}
                        <div>
                          <h3 className="font-semibold text-text-primary transition-colors duration-300">{wallet.name}</h3>
                          <p className="text-sm text-text-secondary transition-colors duration-300">
                            {wallet.tbaAddress} • {wallet.balance.total}
                          </p>
                        </div>

                        {/* Active Badge */}
                        {wallet.isActive && (
                          <div className="bg-orange-500 dark:bg-accent-gold text-white dark:text-bg-primary text-xs px-2 py-1 rounded-full transition-colors duration-300">
                            Activa
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleWalletSelect(wallet)}
                          className="px-4 py-2 bg-blue-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-blue-600 dark:hover:bg-accent-gold/80 transition-all duration-300 text-sm"
                        >
                          Abrir
                        </button>
                        {!wallet.isActive && (
                          <button
                            onClick={() => handleSetAsActive(wallet.id)}
                            className="px-4 py-2 border border-border-primary rounded-lg hover:bg-bg-secondary transition-all duration-300 text-sm text-text-secondary hover:text-text-primary"
                          >
                            Usar Como Principal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {/* Browser Extension */}
          {getActiveWallet() && (
            <ExtensionInstaller
              walletData={{
                nftContract: getActiveWallet()!.nftContract,
                tokenId: getActiveWallet()!.tokenId,
                tbaAddress: getActiveWallet()!.tbaAddress,
                name: getActiveWallet()!.name,
                image: getActiveWallet()!.image
              }}
              className="shadow-lg"
            />
          )}

          {/* Advanced Security */}
          {getActiveWallet() && (
            <AdvancedSecurity
              walletAddress={getActiveWallet()!.tbaAddress}
              className="rounded-2xl shadow-lg"
            />
          )}

          {/* Account Management */}
          {account && (
            <AccountManagement
              walletAddress={account.address}
              className="rounded-2xl shadow-lg"
            />
          )}
        </div>

        {/* Expired Gifts Manager */}
        {account && (
          <div className="max-w-4xl mx-auto mt-8">
            <ExpiredGiftManager
              onGiftReturned={(tokenId) => {
                console.log('✅ Gift returned:', tokenId);
                // Refresh wallets list after gift return
                loadUserWallets();
              }}
              onRefresh={() => {
                // Refresh wallets list
                loadUserWallets();
              }}
              className="rounded-2xl shadow-lg"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <div className="bg-bg-card rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <h3 className="text-xl font-bold text-text-primary mb-4 transition-colors duration-300">Acciones Rápidas</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="px-6 py-3 bg-orange-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-orange-600 dark:hover:bg-accent-gold/80 transition-all duration-300"
              >
                🎁 Crear Nuevo Regalo
              </Link>
              <a
                href="/knowledge"
                className="px-6 py-3 bg-blue-500 dark:bg-accent-silver text-white dark:text-bg-primary rounded-lg hover:bg-blue-600 dark:hover:bg-accent-silver/80 transition-all duration-300"
              >
                📚 Academia CryptoGift
              </a>
              <a
                href="/nexuswallet"
                className="px-6 py-3 bg-purple-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-purple-600 dark:hover:bg-accent-gold/80 transition-all duration-300"
              >
                🚀 NexusWallet Exchange
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TBA Wallet Slide Panel */}
      {showWalletInterface && selectedWallet && (
        <RightSlideWallet
          isOpen={showWalletInterface}
          onClose={() => setShowWalletInterface(false)}
          nftContract={selectedWallet.nftContract}
          tokenId={selectedWallet.tokenId}
        />
      )}
      
      {/* NFT IMAGE MODAL */}
      <NFTImageModal
        isOpen={imageModalData.isOpen}
        onClose={() => setImageModalData(prev => ({ ...prev, isOpen: false }))}
        image={imageModalData.image}
        name={imageModalData.name}
        tokenId={imageModalData.tokenId}
        contractAddress={imageModalData.contractAddress}
        metadata={{
          description: "A unique NFT-Wallet from the CryptoGift platform that functions as both an NFT and a wallet using ERC-6551 Token Bound Accounts.",
          attributes: [
            { trait_type: "Wallet Type", value: "ERC-6551 Token Bound Account" },
            { trait_type: "Network", value: "Base Sepolia" },
            { trait_type: "Status", value: "Active" }
          ]
        }}
      />
    </div>
  );
}