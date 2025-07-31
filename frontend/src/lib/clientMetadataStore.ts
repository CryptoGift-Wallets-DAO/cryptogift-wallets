// Client-side metadata storage with WALLET-SCOPED caching
// CRITICAL: Each wallet gets isolated cache to prevent cross-contamination
// Device limit: Maximum 2 wallets per device for security

export interface NFTMetadata {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  imageIpfsCid?: string;
  metadataIpfsCid?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  createdAt: string;
  mintTransactionHash?: string;
  owner?: string;
  // NEW: Unique identifiers to prevent cache conflicts
  uniqueCreationId?: string;
  creatorWallet?: string;
  // NEW: Cross-wallet access properties
  crossWalletAccess?: boolean;
  sourceWallet?: string;
}

const STORAGE_PREFIX = 'cryptogift_wallet_';
const DEVICE_STORAGE_KEY = 'cryptogift_device_info';

// NEW: Wallet-scoped storage functions
function getWalletStorageKey(walletAddress: string): string {
  if (!walletAddress) {
    throw new Error('Wallet address required for scoped storage');
  }
  return `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
}

function checkDeviceWalletLimit(): { allowed: boolean; walletCount: number; registeredWallets: string[] } {
  try {
    const allKeys = Object.keys(localStorage);
    const walletKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    const registeredWallets = walletKeys.map(key => key.replace(STORAGE_PREFIX, ''));
    
    return {
      allowed: walletKeys.length < 2,
      walletCount: walletKeys.length,
      registeredWallets
    };
  } catch (error) {
    console.error('Error checking device wallet limit:', error);
    return { allowed: true, walletCount: 0, registeredWallets: [] };
  }
}

export function storeNFTMetadataClient(metadata: NFTMetadata, walletAddress: string): void {
  try {
    if (!walletAddress) {
      console.error('❌ Cannot store metadata without wallet address');
      return;
    }

    // Check device limits before storing
    const deviceCheck = checkDeviceWalletLimit();
    const walletKey = getWalletStorageKey(walletAddress);
    const isExistingWallet = localStorage.getItem(walletKey) !== null;
    
    if (!deviceCheck.allowed && !isExistingWallet) {
      console.warn(`⚠️ Device wallet limit reached (${deviceCheck.walletCount}/2). Cannot store metadata for new wallet.`);
      return;
    }

    const existing = getAllNFTMetadataForWallet(walletAddress);
    const key = `${metadata.contractAddress.toLowerCase()}_${metadata.tokenId}`;
    
    // Add unique creation identifier to prevent cache conflicts
    const enhancedMetadata = {
      ...metadata,
      uniqueCreationId: `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creatorWallet: walletAddress,
      storedAt: new Date().toISOString()
    };
    
    existing[key] = enhancedMetadata;
    localStorage.setItem(walletKey, JSON.stringify(existing));
    
    console.log(`💾 Client: Stored wallet-scoped metadata for ${walletAddress.slice(0, 10)}...`);
    console.log(`🔑 Unique ID: ${enhancedMetadata.uniqueCreationId}`);
  } catch (error) {
    console.error('❌ Client: Error storing wallet-scoped metadata:', error);
  }
}

export function getNFTMetadataClient(contractAddress: string, tokenId: string, walletAddress?: string): NFTMetadata | null {
  try {
    // If wallet is provided, try wallet-scoped first
    if (walletAddress) {
      const walletScoped = getAllNFTMetadataForWallet(walletAddress);
      const key = `${contractAddress.toLowerCase()}_${tokenId}`;
      
      const metadata = walletScoped[key];
      if (metadata) {
        console.log(`✅ Client: Found wallet-scoped metadata for ${contractAddress}:${tokenId}`);
        console.log(`🔑 Unique ID: ${metadata.uniqueCreationId || 'legacy'}`);
        return metadata;
      }
    }
    
    // Fallback to legacy global search (will be phased out)
    console.log(`⚠️ Client: No wallet-scoped metadata found for ${contractAddress}:${tokenId}`);
    return null;
  } catch (error) {
    console.error('❌ Client: Error getting metadata:', error);
    return null;
  }
}

// NEW: Wallet-scoped metadata retrieval
export function getAllNFTMetadataForWallet(walletAddress: string): Record<string, NFTMetadata> {
  try {
    if (!walletAddress) {
      console.warn('⚠️ No wallet address provided for scoped metadata retrieval');
      return {};
    }
    
    const walletKey = getWalletStorageKey(walletAddress);
    const stored = localStorage.getItem(walletKey);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Client: Error getting wallet-scoped metadata:', error);
    return {};
  }
}

// NEW: Cross-wallet metadata search for display purposes (read-only)
export function getNFTMetadataClientCrossWallet(contractAddress: string, tokenId: string): NFTMetadata | null {
  try {
    console.log(`🔍 Cross-wallet search for ${contractAddress}:${tokenId}`);
    
    // Check if we have device info to search across registered wallets
    const deviceInfo = getDeviceWalletInfo();
    
    for (const registeredWallet of deviceInfo.registeredWallets) {
      console.log(`🔍 Searching wallet: ${registeredWallet.slice(0, 10)}...`);
      
      const metadata = getNFTMetadataClient(contractAddress, tokenId, registeredWallet);
      if (metadata) {
        console.log(`✅ Found metadata in wallet ${registeredWallet.slice(0, 10)}... for display`);
        return {
          ...metadata,
          // Mark as cross-wallet to prevent modification
          crossWalletAccess: true,
          sourceWallet: registeredWallet
        } as NFTMetadata;
      }
    }
    
    console.log(`ℹ️ No metadata found across ${deviceInfo.registeredWallets.length} registered wallets`);
    return null;
  } catch (error) {
    console.error('❌ Error in cross-wallet metadata search:', error);
    return null;
  }
}

// DEPRECATED: Legacy function for backwards compatibility
export function getAllNFTMetadataClient(): Record<string, NFTMetadata> {
  console.warn('⚠️ getAllNFTMetadataClient is deprecated. Use getAllNFTMetadataForWallet instead.');
  return {};
}

// NEW: Cache Management Functions for Fresh Testing
// ENHANCED: Clear wallet connections specifically
export function clearWalletConnections(): { cleared: boolean; details: any } {
  try {
    const results = {
      cleared: true,
      details: {
        walletDisconnections: 0,
        indexedDBCleared: 0,
        serviceWorkersCleared: 0,
        windowObjectsCleared: 0,
        extensionStorageAttempts: 0,
        clearedItems: []
      }
    };

    console.log('🔌 AGGRESSIVE WALLET DISCONNECTION STARTING...');

    // 1. Try to disconnect any active wallet connections
    try {
      if (typeof window !== 'undefined') {
        // MetaMask disconnection
        if ((window as any).ethereum) {
          console.log('🔌 Found window.ethereum, attempting disconnect...');
          try {
            const provider = (window as any).ethereum;
            // Try various disconnect methods
            if (provider.disconnect) {
              provider.disconnect();
              console.log('✅ Called provider.disconnect()');
            }
            if (provider.close) {
              provider.close();
              console.log('✅ Called provider.close()');
            }
            // Clear selected address
            if (provider.selectedAddress) {
              provider.selectedAddress = null;
              console.log('✅ Cleared selectedAddress');
            }
            results.details.walletDisconnections++;
          } catch (e) {
            console.log('⚠️ Ethereum disconnect failed:', e.message);
          }
        }

        // WalletConnect disconnection
        const wcKeys = Object.keys(window).filter(key => 
          key.toLowerCase().includes('walletconnect')
        );
        wcKeys.forEach(key => {
          try {
            const obj = (window as any)[key];
            if (obj && typeof obj.disconnect === 'function') {
              obj.disconnect();
              console.log(`✅ Disconnected ${key}`);
              results.details.walletDisconnections++;
            }
          } catch (e) {
            console.log(`⚠️ Failed to disconnect ${key}:`, e.message);
          }
        });

        // ThirdWeb disconnection
        const thirdwebKeys = Object.keys(window).filter(key => 
          key.toLowerCase().includes('thirdweb')
        );
        thirdwebKeys.forEach(key => {
          try {
            const obj = (window as any)[key];
            if (obj && typeof obj.disconnect === 'function') {
              obj.disconnect();
              console.log(`✅ Disconnected ${key}`);
              results.details.walletDisconnections++;
            }
          } catch (e) {
            console.log(`⚠️ Failed to disconnect ${key}:`, e.message);
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Wallet disconnection failed:', error);
    }

    // 2. Force clear IndexedDB databases
    if ('indexedDB' in window) {
      try {
        const dbsToDelete = [
          'thirdweb-storage',
          'thirdweb-cache', 
          'walletconnect',
          'web3-storage',
          'keyval-store',
          'wallet-db',
          'metamask-db'
        ];
        
        dbsToDelete.forEach(dbName => {
          console.log(`🗑️ Attempting to delete IndexedDB: ${dbName}`);
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            console.log(`✅ Deleted IndexedDB: ${dbName}`);
            results.details.indexedDBCleared++;
            results.details.clearedItems.push(`IndexedDB: ${dbName}`);
          };
          deleteRequest.onerror = () => {
            console.log(`ℹ️ IndexedDB ${dbName} not found or already deleted`);
          };
        });
      } catch (error) {
        console.warn('⚠️ IndexedDB clearing failed:', error);
      }
    }

    // 3. Unregister service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          console.log(`🗑️ Unregistering service worker: ${registration.scope}`);
          registration.unregister().then(success => {
            if (success) {
              console.log(`✅ Unregistered service worker: ${registration.scope}`);
              results.details.serviceWorkersCleared++;
              results.details.clearedItems.push(`ServiceWorker: ${registration.scope}`);
            }
          });
        });
      }).catch(error => {
        console.warn('⚠️ Service worker unregistration failed:', error);
      });
    }

    // 4. Clear window objects
    const windowPropsToDelete = [
      'ethereum', 'web3', 'walletLink', 'coinbaseWalletExtension',
      'tronWeb', 'solana', 'phantom', 'walletConnect'
    ];
    
    windowPropsToDelete.forEach(prop => {
      if (typeof window !== 'undefined' && prop in window) {
        try {
          delete (window as any)[prop];
          console.log(`✅ Cleared window.${prop}`);
          results.details.windowObjectsCleared++;
          results.details.clearedItems.push(`window.${prop}`);
        } catch (e) {
          console.log(`⚠️ Could not clear window.${prop}:`, e.message);
        }
      }
    });

    console.log('🔌 AGGRESSIVE WALLET DISCONNECTION COMPLETED:', results);
    return results;
    
  } catch (error) {
    console.error('❌ Aggressive wallet disconnection failed:', error);
    return {
      cleared: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

export function clearAllUserCache(): { cleared: boolean; details: any } {
  try {
    const results = {
      cleared: true,
      details: {
        walletCaches: 0,
        ipfsGatewayCaches: 0,
        walletStateKeys: 0,
        accountKeys: 0,
        referralKeys: 0,
        legacyKeys: 0,
        serviceWorkerCaches: 0,
        totalLocalStorageKeys: 0,
        totalSessionStorageKeys: 0,
        clearedKeys: [],
        walletDisconnection: {} as any
      }
    };

    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    results.details.totalLocalStorageKeys = allKeys.length;

    console.log('🔍 Found localStorage keys:', allKeys);
    console.log('🔍 Total keys found:', allKeys.length);
    console.log('🔍 Keys detail:', allKeys.map(key => ({
      key, 
      size: localStorage.getItem(key)?.length || 0,
      preview: localStorage.getItem(key)?.substring(0, 50) + '...'
    })));

    // Clear wallet-scoped metadata caches
    const walletKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    walletKeys.forEach(key => {
      localStorage.removeItem(key);
      results.details.clearedKeys.push(key);
    });
    results.details.walletCaches = walletKeys.length;

    // Clear IPFS gateway caches
    const ipfsKeys = allKeys.filter(key => key.startsWith('ipfs_gateway_'));
    ipfsKeys.forEach(key => {
      localStorage.removeItem(key);
      results.details.clearedKeys.push(key);
    });
    results.details.ipfsGatewayCaches = ipfsKeys.length;

    // Clear wallet state keys (CRITICAL - estos pueden estar manteniendo estado)
    const walletStateKeys = [
      'activeTBAWalletId',
      'activeTBAWalletData', 
      'activeWalletId',
      'installedCGWallets',
      'cryptogift_nft_metadata', // Legacy key
      DEVICE_STORAGE_KEY
    ];
    
    console.log('🔍 Searching for wallet state keys:', walletStateKeys);
    
    walletStateKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`🔍 Checking key '${key}':`, value ? 'FOUND' : 'NOT FOUND');
      if (value) {
        console.log(`🗑️ Removing key '${key}' with value:`, value.substring(0, 100) + '...');
        localStorage.removeItem(key);
        results.details.clearedKeys.push(key);
        results.details.walletStateKeys++;
      }
    });

    // Clear account and security data
    const accountKeys = allKeys.filter(key => 
      key.startsWith('account_') || key.startsWith('security_')
    );
    accountKeys.forEach(key => {
      localStorage.removeItem(key);
      results.details.clearedKeys.push(key);
    });
    results.details.accountKeys = accountKeys.length;

    // Clear referral tracking
    const referralKeys = allKeys.filter(key => 
      key === 'referrer' || key.startsWith('referral-banner-')
    );
    referralKeys.forEach(key => {
      localStorage.removeItem(key);
      results.details.clearedKeys.push(key);
    });
    results.details.referralKeys = referralKeys.length;

    // Clear any other relevant keys (expanded patterns)
    const otherKeys = allKeys.filter(key => 
      key.toLowerCase().includes('cryptogift') || 
      key.toLowerCase().includes('tba') ||
      key.toLowerCase().includes('nft') ||
      key.includes('pwa-install') ||
      key.toLowerCase().includes('thirdweb') ||
      key.toLowerCase().includes('wallet') ||
      key.toLowerCase().includes('connect') ||
      key.toLowerCase().includes('metamask') ||
      key.toLowerCase().includes('web3') ||
      key.toLowerCase().includes('ethereum')
    );
    
    console.log('🔍 Other relevant keys found:', otherKeys);
    otherKeys.forEach(key => {
      if (!results.details.clearedKeys.includes(key)) {
        localStorage.removeItem(key);
        results.details.clearedKeys.push(key);
        results.details.legacyKeys++;
      }
    });

    // Clear sessionStorage completely
    const sessionKeys = Object.keys(sessionStorage);
    results.details.totalSessionStorageKeys = sessionKeys.length;
    sessionStorage.clear();
    if (sessionKeys.length > 0) {
      results.details.clearedKeys.push('sessionStorage (all keys)');
    }

    // Clear Service Worker caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        console.log('🗄️ Found service worker caches:', cacheNames);
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          results.details.serviceWorkerCaches++;
        });
      }).catch(error => {
        console.warn('⚠️ Could not clear service worker caches:', error);
      });
    }

    // CRITICAL: Clear IndexedDB databases (ThirdWeb v5 storage)
    if ('indexedDB' in window) {
      try {
        // Get all IndexedDB databases
        if ('databases' in indexedDB) {
          indexedDB.databases().then(databases => {
            console.log('🗃️ Found IndexedDB databases:', databases);
            databases.forEach(db => {
              if (db.name) {
                console.log(`🗑️ Deleting IndexedDB: ${db.name}`);
                const deleteRequest = indexedDB.deleteDatabase(db.name);
                deleteRequest.onsuccess = () => {
                  console.log(`✅ Deleted IndexedDB: ${db.name}`);
                  results.details.clearedKeys.push(`IndexedDB: ${db.name}`);
                };
                deleteRequest.onerror = (error) => {
                  console.warn(`❌ Failed to delete IndexedDB ${db.name}:`, error);
                };
              }
            });
          }).catch(error => {
            console.warn('⚠️ Could not list IndexedDB databases:', error);
          });
        } else {
          // Fallback: Delete known ThirdWeb databases
          const knownDBs = ['thirdweb-storage', 'thirdweb-cache', 'keyval-store', 'walletconnect', 'web3-storage'];
          knownDBs.forEach(dbName => {
            console.log(`🗑️ Attempting to delete known DB: ${dbName}`);
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            deleteRequest.onsuccess = () => {
              console.log(`✅ Deleted known IndexedDB: ${dbName}`);
              results.details.clearedKeys.push(`IndexedDB: ${dbName}`);
            };
            deleteRequest.onerror = () => {
              console.log(`ℹ️ IndexedDB ${dbName} not found or already deleted`);
            };
          });
        }
      } catch (error) {
        console.warn('⚠️ Error clearing IndexedDB:', error);
      }
    }

    // Clear WebSQL (legacy, but some apps might use it)
    try {
      if ('openDatabase' in window) {
        console.log('🗄️ Attempting to clear WebSQL databases');
        // Note: WebSQL is deprecated but some legacy code might use it
      }
    } catch (error) {
      console.log('ℹ️ WebSQL not available or already cleared');
    }

    // Clear Local Storage quota and persistent storage
    if ('navigator' in window && 'storage' in navigator) {
      try {
        navigator.storage.estimate().then(estimate => {
          console.log('💾 Storage quota before clearing:', estimate);
        });
        
        // Clear persistent storage if granted
        if ('persist' in navigator.storage) {
          navigator.storage.persist().then(persistent => {
            if (persistent) {
              console.log('⚠️ App has persistent storage permission');
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Could not check storage quota:', error);
      }
    }

    // FINAL STEP: Run aggressive wallet disconnection
    console.log('🔌 Running aggressive wallet disconnection...');
    const walletDisconnectResults = clearWalletConnections();
    results.details.walletDisconnection = walletDisconnectResults;
    
    console.log('🧹 COMPREHENSIVE cache clearing results:', results);
    
    // CRITICAL: Clear any remaining browser storage
    try {
      // Clear any remaining window properties that might hold state
      const windowKeysToDelete = ['ethereum', 'web3', 'walletLink', 'coinbaseWalletExtension'];
      windowKeysToDelete.forEach(key => {
        if (key in window) {
          try {
            delete (window as any)[key];
            console.log(`🧹 Cleared window.${key}`);
          } catch (e) {
            console.log(`⚠️ Could not clear window.${key}`);
          }
        }
      });
      
      // Try to force disconnect any ThirdWeb connections
      try {
        // Look for ThirdWeb disconnect functions in window
        const thirdwebKeys = Object.keys(window).filter(key => 
          key.toLowerCase().includes('thirdweb') || 
          key.toLowerCase().includes('wallet') ||
          key.toLowerCase().includes('connect')
        );
        console.log('🔍 Found potential ThirdWeb keys:', thirdwebKeys);
        
        thirdwebKeys.forEach(key => {
          try {
            const obj = (window as any)[key];
            if (obj && typeof obj === 'object') {
              // Try to call disconnect if it exists
              if (typeof obj.disconnect === 'function') {
                console.log(`🔌 Attempting to disconnect ${key}`);
                obj.disconnect();
              }
              // Try to clear if it has a clear method
              if (typeof obj.clear === 'function') {
                console.log(`🧹 Attempting to clear ${key}`);
                obj.clear();
              }
            }
          } catch (e) {
            console.log(`⚠️ Could not disconnect ${key}:`, e.message);
          }
        });
      } catch (error) {
        console.warn('⚠️ Error attempting ThirdWeb disconnect:', error);
      }
      
    } catch (error) {
      console.warn('⚠️ Error clearing window properties:', error);
    }
    
    // Force reload recommendation
    console.log('🔄 CRITICAL: Refresh page AND clear browser data after clearing to reset ALL states');
    console.log('🔄 OR: Close browser tab and reopen to fully disconnect wallets');
    console.log('⚠️ NOTE: If wallet still connected after refresh, clear all browser data for this site');
    console.log('🔧 Advanced: Open DevTools > Application > Clear Storage > Clear site data');
    
    return results;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return {
      cleared: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

export function getDetailedCacheInfo(): any {
  try {
    const info = {
      timestamp: new Date().toISOString(),
      walletCaches: [] as any[],
      ipfsGatewayCaches: [] as any[],
      walletStateKeys: [] as any[],
      accountKeys: [] as any[],
      referralKeys: [] as any[],
      otherKeys: [] as any[],
      sessionStorageKeys: [] as any[],
      indexedDBDatabases: [] as any[],
      browserStorage: {} as any,
      deviceInfo: null as any,
      totalSize: 0,
      totalKeys: 0
    };

    // Analyze localStorage
    const allKeys = Object.keys(localStorage);
    info.totalKeys = allKeys.length;

    console.log('🔍 DETAILED ANALYSIS - All localStorage keys:', allKeys);

    // Analyze wallet caches
    const walletKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    walletKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        const parsed = data ? JSON.parse(data) : {};
        const nftCount = Object.keys(parsed).length;
        const walletAddress = key.replace(STORAGE_PREFIX, '');
        
        info.walletCaches.push({
          key,
          walletAddress: walletAddress.slice(0, 10) + '...',
          nftCount,
          sizeBytes: data ? data.length : 0,
          lastActivity: parsed.lastActivity || 'unknown'
        });
        
        info.totalSize += data ? data.length : 0;
      } catch (e) {
        console.warn('Error parsing wallet cache:', key);
      }
    });

    // Analyze IPFS gateway caches
    const ipfsKeys = allKeys.filter(key => key.startsWith('ipfs_gateway_'));
    ipfsKeys.forEach(key => {
      const cid = key.replace('ipfs_gateway_', '');
      const gateway = localStorage.getItem(key);
      info.ipfsGatewayCaches.push({
        key,
        cid: cid.slice(0, 12) + '...',
        gateway: gateway ? gateway.split('/')[2] : 'unknown'
      });
    });

    // Analyze wallet state keys
    const walletStateKeys = [
      'activeTBAWalletId',
      'activeTBAWalletData', 
      'activeWalletId',
      'installedCGWallets',
      'cryptogift_nft_metadata',
      DEVICE_STORAGE_KEY
    ];
    
    walletStateKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        info.walletStateKeys.push({
          key,
          sizeBytes: data.length,
          preview: data.substring(0, 100) + (data.length > 100 ? '...' : '')
        });
        info.totalSize += data.length;
      }
    });

    // Analyze account and security data
    const accountKeys = allKeys.filter(key => 
      key.startsWith('account_') || key.startsWith('security_')
    );
    accountKeys.forEach(key => {
      const data = localStorage.getItem(key);
      info.accountKeys.push({
        key,
        sizeBytes: data ? data.length : 0,
        type: key.startsWith('account_') ? 'account' : 'security'
      });
      if (data) info.totalSize += data.length;
    });

    // Analyze referral tracking
    const referralKeys = allKeys.filter(key => 
      key === 'referrer' || key.startsWith('referral-banner-')
    );
    referralKeys.forEach(key => {
      const data = localStorage.getItem(key);
      info.referralKeys.push({
        key,
        sizeBytes: data ? data.length : 0,
        value: data
      });
      if (data) info.totalSize += data.length;
    });

    // Analyze other relevant keys
    const otherKeys = allKeys.filter(key => 
      !walletKeys.includes(key) &&
      !ipfsKeys.includes(key) &&
      !walletStateKeys.includes(key) &&
      !accountKeys.includes(key) &&
      !referralKeys.includes(key) &&
      (key.toLowerCase().includes('cryptogift') || 
       key.toLowerCase().includes('tba') ||
       key.toLowerCase().includes('nft') ||
       key.includes('pwa-install') ||
       key.includes('thirdweb') ||
       key.includes('wallet'))
    );
    
    otherKeys.forEach(key => {
      const data = localStorage.getItem(key);
      info.otherKeys.push({
        key,
        sizeBytes: data ? data.length : 0,
        preview: data ? data.substring(0, 50) + (data.length > 50 ? '...' : '') : null
      });
      if (data) info.totalSize += data.length;
    });

    // Analyze sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      const data = sessionStorage.getItem(key);
      info.sessionStorageKeys.push({
        key,
        sizeBytes: data ? data.length : 0,
        value: data
      });
    });

    // Analyze IndexedDB databases
    if ('indexedDB' in window) {
      try {
        if ('databases' in indexedDB) {
          indexedDB.databases().then(databases => {
            databases.forEach(db => {
              info.indexedDBDatabases.push({
                name: db.name,
                version: db.version
              });
            });
            console.log('📈 Found IndexedDB databases:', info.indexedDBDatabases);
          }).catch(error => {
            console.warn('⚠️ Could not analyze IndexedDB:', error);
          });
        }
      } catch (error) {
        console.warn('⚠️ IndexedDB analysis failed:', error);
      }
    }

    // Analyze browser storage quotas
    if ('navigator' in window && 'storage' in navigator) {
      try {
        navigator.storage.estimate().then(estimate => {
          info.browserStorage = {
            quota: estimate.quota,
            usage: estimate.usage
          };
          console.log('💾 Storage quota analysis:', info.browserStorage);
        }).catch(error => {
          console.warn('⚠️ Could not analyze storage quota:', error);
        });
      } catch (error) {
        console.warn('⚠️ Storage API not available:', error);
      }
    }

    // Get device info
    try {
      const deviceData = localStorage.getItem(DEVICE_STORAGE_KEY);
      info.deviceInfo = deviceData ? JSON.parse(deviceData) : null;
    } catch (e) {
      info.deviceInfo = { error: 'Failed to parse device info' };
    }

    // Check for wallet-related window objects that might be keeping state
    const walletWindowProps = ['ethereum', 'web3', 'walletLink', 'coinbaseWalletExtension'];
    const foundWalletProps = walletWindowProps.filter(prop => prop in window);
    if (foundWalletProps.length > 0) {
      info.deviceInfo = {
        ...info.deviceInfo,
        windowWalletProps: foundWalletProps
      };
      console.log('🔍 Found wallet window properties:', foundWalletProps);
    }

    console.log('📊 COMPREHENSIVE cache analysis:', info);
    return info;
  } catch (error) {
    console.error('❌ Error getting cache info:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// NEW: Device management functions
export function getDeviceWalletInfo(): { allowed: boolean; walletCount: number; registeredWallets: string[] } {
  return checkDeviceWalletLimit();
}

export function clearWalletCache(walletAddress: string): boolean {
  try {
    const walletKey = getWalletStorageKey(walletAddress);
    localStorage.removeItem(walletKey);
    console.log(`🗑️ Cleared cache for wallet ${walletAddress.slice(0, 10)}...`);
    return true;
  } catch (error) {
    console.error('❌ Error clearing wallet cache:', error);
    return false;
  }
}

// Enhanced IPFS URL resolution with multiple gateways and caching
export function resolveIPFSUrlClient(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    // FIX: Handle malformed double prefix ipfs://ipfs://
    let cleanUrl = ipfsUrl;
    if (cleanUrl.includes('ipfs://ipfs://')) {
      cleanUrl = cleanUrl.replace('ipfs://ipfs://', 'ipfs://');
      console.log('🔧 Fixed malformed double IPFS prefix:', ipfsUrl, '→', cleanUrl);
    }
    
    const cid = cleanUrl.replace('ipfs://', '');
    
    // Additional validation: ensure CID doesn't still contain protocol
    const finalCid = cid.startsWith('ipfs://') ? cid.replace('ipfs://', '') : cid;
    
    // Check for cached working gateway
    const gatewayKey = `ipfs_gateway_${finalCid}`;
    const cachedGateway = localStorage.getItem(gatewayKey);
    
    if (cachedGateway) {
      console.log(`🚀 Using cached gateway for ${finalCid.slice(0, 8)}...`);
      return cachedGateway;
    }
    
    // Default to primary reliable gateway
    const primaryGateway = `https://nftstorage.link/ipfs/${finalCid}`;
    return primaryGateway;
  }
  return ipfsUrl;
}

// NEW: Async IPFS URL resolution with gateway verification
export async function resolveIPFSUrlClientVerified(ipfsUrl: string): Promise<string> {
  if (!ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  
  const cid = ipfsUrl.replace('ipfs://', '');
  const gateways = [
    `https://nftstorage.link/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`
  ];
  
  // Check cached working gateway first
  const gatewayKey = `ipfs_gateway_${cid}`;
  const cachedGateway = localStorage.getItem(gatewayKey);
  
  if (cachedGateway) {
    console.log(`🚀 Using cached verified gateway for ${cid.slice(0, 8)}...`);
    return cachedGateway;
  }
  
  console.log(`🔍 Testing ${gateways.length} IPFS gateways for ${cid.slice(0, 8)}...`);
  
  // Test gateways sequentially to avoid overwhelming
  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(gateway, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ Gateway verified: ${gateway}`);
        // Cache working gateway for 1 hour
        localStorage.setItem(gatewayKey, gateway);
        return gateway;
      }
    } catch (error) {
      console.log(`❌ Gateway failed: ${gateway}`);
      continue;
    }
  }
  
  // If all fail, return primary as fallback
  console.log(`⚠️ All gateways failed for ${cid.slice(0, 8)}..., using primary`);
  return gateways[0];
}