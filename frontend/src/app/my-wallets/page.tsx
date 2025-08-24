"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { NetworkInfoCard } from '../../components/ui/NetworkInfoCard';
import { X } from 'lucide-react';

// Lazy load the WalletDashboard
const WalletDashboard = dynamic(
  () => import('../../components/WalletDashboard/WalletDashboard'),
  { 
    ssr: false, 
    loading: () => (
      <div className="fixed inset-0 grid place-items-center bg-black/40">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80" />
      </div>
    )
  }
);

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

// Glass Overlay Component
function GlassOverlay({
  open,
  onClose,
  children,
  ariaLabel = 'Wallet Dashboard'
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; ariaLabel?: string }>) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { 
      document.removeEventListener('keydown', onKey); 
      document.body.style.overflow = original; 
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      aria-hidden={!open}
      aria-label={ariaLabel}
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="relative mx-auto my-4 h-[92vh] w-[min(1200px,95vw)] overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-0 shadow-2xl backdrop-blur-xl"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function MyWalletsPage() {
  const account = useActiveAccount();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [showWalletInterface, setShowWalletInterface] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardWallet, setDashboardWallet] = useState<UserWallet | null>(null);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  const [imageModalData, setImageModalData] = useState<{
    isOpen: boolean;
    image: string;
    name: string;
    tokenId: string;
    contractAddress: string;
  }>({ isOpen: false, image: '', name: '', tokenId: '', contractAddress: '' });
  
  // Feature flag check
  const isDashboardEnabled = process.env.NEXT_PUBLIC_FEATURE_WALLET_DASHBOARD === 'on';

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
    // If dashboard is enabled, open it instead of the old interface
    if (isDashboardEnabled) {
      openDashboard(wallet);
    } else {
      setSelectedWallet(wallet);
      setShowWalletInterface(true);
    }
  };
  
  const openDashboard = useCallback((wallet: UserWallet, tab?: string) => {
    setDashboardWallet(wallet);
    setInitialTab(tab);
    setShowDashboard(true);
    
    // Telemetry
    try { 
      window.dispatchEvent(new CustomEvent('telemetry', { 
        detail: { ev: 'dashboard.open', chainId: 84532 } 
      })); 
    } catch {}
    
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('open', wallet.tbaAddress);
    if (tab) params.set('tab', tab);
    router.replace(`?${params.toString()}`);
  }, [router]);
  
  const closeDashboard = useCallback(() => {
    setShowDashboard(false);
    setDashboardWallet(null);
    
    // Telemetry
    try { 
      window.dispatchEvent(new CustomEvent('telemetry', { 
        detail: { ev: 'dashboard.close' } 
      })); 
    } catch {}
    
    // Clear URL params
    const params = new URLSearchParams(window.location.search);
    params.delete('open');
    params.delete('tab');
    router.replace(`?${params.toString()}`);
  }, [router]);
  
  // Deep link support
  useEffect(() => {
    const qOpen = searchParams.get('open');
    const qTab = searchParams.get('tab') || undefined;
    if (isDashboardEnabled && qOpen && wallets.length > 0) {
      const wallet = wallets.find(w => 
        w.tbaAddress.toLowerCase() === qOpen.toLowerCase()
      );
      if (wallet) {
        setDashboardWallet(wallet);
        setInitialTab(qTab);
        setShowDashboard(true);
      }
    }
  }, [isDashboardEnabled, searchParams, wallets]);

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
        title={
          <div className="flex items-center gap-3">
            <span>Mis CryptoGift Wallets</span>
            {/* Wallet address badge right next to title */}
            <div className="px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                {account?.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 'Conectado'}
              </span>
            </div>
          </div>
        }
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
      />

      <div className="container mx-auto px-4 py-8">

        {/* Network Information Card */}
        <NetworkInfoCard />

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
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {/* NFT Image - Smart Adaptive Thumbnail */}
                        <div 
                          className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-orange-200 dark:border-accent-gold/30 transition-colors duration-300 cursor-pointer hover:scale-105 transition-transform bg-gray-100 dark:bg-gray-800 flex-shrink-0"
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
                            className="bg-white/50 dark:bg-gray-700/50"
                            tokenId={wallet.id}
                            fit="cover"
                          />
                        </div>
                        
                        {/* Wallet Info - Compact display */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text-primary transition-colors duration-300">{wallet.name}</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-text-secondary transition-colors duration-300">
                              {wallet.tbaAddress.slice(0, 6)}...{wallet.tbaAddress.slice(-4)}
                            </p>
                            {/* Modern Copy Button */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await navigator.clipboard.writeText(wallet.tbaAddress);
                                  // Visual feedback
                                  const btn = e.currentTarget;
                                  const originalHTML = btn.innerHTML;
                                  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                  setTimeout(() => {
                                    btn.innerHTML = originalHTML;
                                  }, 1500);
                                } catch (err) {
                                  console.error('Failed to copy:', err);
                                }
                              }}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                              title="Copiar dirección"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                            <span className="text-sm text-text-secondary">• {wallet.balance.total}</span>
                          </div>
                        </div>

                        {/* Active Badge */}
                        {wallet.isActive && (
                          <div className="bg-orange-500 dark:bg-accent-gold text-white dark:text-bg-primary text-xs px-2 py-1 rounded-full transition-colors duration-300">
                            Activa
                          </div>
                        )}
                      </div>

                      {/* Actions - Compact on mobile */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleWalletSelect(wallet)}
                          className="px-3 py-1.5 bg-blue-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-blue-600 dark:hover:bg-accent-gold/80 transition-all duration-300 text-sm"
                        >
                          {isDashboardEnabled ? 'Dashboard' : 'Abrir'}
                        </button>
                        {isDashboardEnabled && (
                          <>
                            <button
                              onClick={() => openDashboard(wallet, 'history')}
                              className="hidden sm:block px-2 py-1.5 border border-border-primary rounded-lg hover:bg-bg-secondary transition-all duration-300 text-xs text-text-secondary hover:text-text-primary"
                              title="Ver historial"
                            >
                              History
                            </button>
                            <button
                              onClick={() => openDashboard(wallet, 'security')}
                              className="hidden sm:block px-2 py-1.5 border border-border-primary rounded-lg hover:bg-bg-secondary transition-all duration-300 text-xs text-text-secondary hover:text-text-primary"
                              title="Ver seguridad"
                            >
                              Security
                            </button>
                          </>
                        )}
                        {!wallet.isActive && (
                          <button
                            onClick={() => handleSetAsActive(wallet.id)}
                            className="hidden sm:block px-3 py-1.5 border border-border-primary rounded-lg hover:bg-bg-secondary transition-all duration-300 text-sm text-text-secondary hover:text-text-primary"
                          >
                            Activar
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
          description: "NFT-Wallet único con funciones de billetera integradas usando ERC-6551 Token Bound Accounts.",
          attributes: [
            { trait_type: "Wallet Type", value: "ERC-6551 Token Bound Account" },
            { trait_type: "Network", value: "Base Sepolia" },
            { trait_type: "Status", value: "Active" }
          ]
        }}
      />
      
      {/* Wallet Dashboard Overlay - Glass Morphism */}
      {isDashboardEnabled && showDashboard && dashboardWallet && (
        <GlassOverlay open={showDashboard} onClose={closeDashboard} ariaLabel="Wallet Dashboard">
          <WalletDashboard 
            wallet={dashboardWallet} 
            onClose={closeDashboard}
            initialTab={initialTab}
          />
        </GlassOverlay>
      )}
    </div>
  );
}