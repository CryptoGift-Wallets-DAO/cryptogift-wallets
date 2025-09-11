"use client";

import React, { useState } from 'react';
import { clearAllUserCache, clearWalletConnections, getDetailedCacheInfo } from '../../lib/clientMetadataStore';

interface CacheManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CacheManager: React.FC<CacheManagerProps> = ({ isOpen, onClose }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [clearResults, setClearResults] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const loadCacheInfo = () => {
    const info = getDetailedCacheInfo();
    setCacheInfo(info);
  };

  const handleClearClientCache = () => {
    setIsClearing(true);
    try {
      const results = clearAllUserCache();
      setClearResults(results);
      loadCacheInfo(); // Refresh info after clearing
    } catch (error) {
      setClearResults({ 
        cleared: false, 
        details: { error: error instanceof Error ? error.message : 'Unknown error' } 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleAggressiveWalletDisconnect = () => {
    setIsClearing(true);
    try {
      console.log('🔌 Starting aggressive wallet disconnect...');
      const results = clearWalletConnections();
      setClearResults({
        aggressive: true,
        ...results
      });
      loadCacheInfo(); // Refresh info after clearing
    } catch (error) {
      setClearResults({ 
        cleared: false, 
        details: { error: error instanceof Error ? error.message : 'Unknown error' } 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearServerCache = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'clear_server', 
          confirm: 'CLEAR_ALL_CACHE_CONFIRMED' 
        })
      });

      const results = await response.json();
      setClearResults(results);
    } catch (error) {
      setClearResults({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAllCache = async () => {
    setIsClearing(true);
    try {
      // Clear client cache first
      const clientResults = clearAllUserCache();
      
      // Then clear server cache
      const serverResponse = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'clear_all', 
          confirm: 'CLEAR_ALL_CACHE_CONFIRMED' 
        })
      });

      const serverResults = await serverResponse.json();
      
      setClearResults({
        combined: true,
        client: clientResults,
        server: serverResults
      });
      
      loadCacheInfo(); // Refresh info after clearing
    } catch (error) {
      setClearResults({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsClearing(false);
      setShowConfirmation(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadCacheInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h1 className="text-2xl font-bold text-red-600">🧹 Cache Manager</h1>
            <p className="text-sm text-gray-500 mt-1">
              Administración de cache para testing desde cero
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Cache Information */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-blue-800">📊 Cache Information</h3>
              <button
                onClick={loadCacheInfo}
                className="text-sm text-blue-600 hover:underline"
              >
                🔄 Refresh
              </button>
            </div>
            
            {cacheInfo ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p><strong>Total Keys:</strong> {cacheInfo.totalKeys || 0}</p>
                    <p><strong>Wallet Caches:</strong> {cacheInfo.walletCaches?.length || 0}</p>
                    <p><strong>IPFS Gateways:</strong> {cacheInfo.ipfsGatewayCaches?.length || 0}</p>
                    <p><strong>Total Size:</strong> {(cacheInfo.totalSize / 1024).toFixed(2)} KB</p>
                  </div>
                  <div>
                    <p><strong>Wallet State Keys:</strong> {cacheInfo.walletStateKeys?.length || 0}</p>
                    <p><strong>Account Keys:</strong> {cacheInfo.accountKeys?.length || 0}</p>
                    <p><strong>Referral Keys:</strong> {cacheInfo.referralKeys?.length || 0}</p>
                    <p><strong>Other Keys:</strong> {cacheInfo.otherKeys?.length || 0}</p>
                  </div>
                  <div>
                    <p><strong>SessionStorage:</strong> {cacheInfo.sessionStorageKeys?.length || 0}</p>
                    <p><strong>IndexedDB:</strong> {cacheInfo.indexedDBDatabases?.length || 0}</p>
                    <p><strong>Device Wallets:</strong> {cacheInfo.deviceInfo?.registeredWallets?.length || 0}</p>
                    <p><strong>Last Scan:</strong> {new Date(cacheInfo.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>

                {/* Detailed breakdown */}
                {(cacheInfo.walletCaches?.length > 0 || 
                  cacheInfo.walletStateKeys?.length > 0 || 
                  cacheInfo.accountKeys?.length > 0 ||
                  cacheInfo.otherKeys?.length > 0) && (
                  <div className="space-y-2 mt-4">
                    
                    {cacheInfo.walletCaches?.length > 0 && (
                      <details className="border rounded p-2">
                        <summary className="cursor-pointer font-medium text-blue-700">
                          🗂️ Wallet Caches ({cacheInfo.walletCaches.length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {cacheInfo.walletCaches.map((wallet: any, index: number) => (
                            <div key={index} className="text-xs bg-white p-2 rounded border">
                              <span className="font-mono">{wallet.key}</span><br/>
                              <span className="text-gray-600">
                                {wallet.walletAddress} - {wallet.nftCount} NFTs ({(wallet.sizeBytes / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {cacheInfo.walletStateKeys?.length > 0 && (
                      <details className="border rounded p-2">
                        <summary className="cursor-pointer font-medium text-orange-700">
                          ⚠️ Wallet State Keys ({cacheInfo.walletStateKeys.length}) - CRÍTICOS
                        </summary>
                        <div className="mt-2 space-y-1">
                          {cacheInfo.walletStateKeys.map((state: any, index: number) => (
                            <div key={index} className="text-xs bg-orange-50 p-2 rounded border">
                              <span className="font-mono font-bold">{state.key}</span><br/>
                              <span className="text-gray-600">
                                {(state.sizeBytes / 1024).toFixed(1)} KB - {state.preview}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {cacheInfo.accountKeys?.length > 0 && (
                      <details className="border rounded p-2">
                        <summary className="cursor-pointer font-medium text-purple-700">
                          👤 Account & Security Keys ({cacheInfo.accountKeys.length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {cacheInfo.accountKeys.map((account: any, index: number) => (
                            <div key={index} className="text-xs bg-purple-50 p-2 rounded border">
                              <span className="font-mono">{account.key}</span><br/>
                              <span className="text-gray-600">
                                Type: {account.type} - {(account.sizeBytes / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {cacheInfo.otherKeys?.length > 0 && (
                      <details className="border rounded p-2">
                        <summary className="cursor-pointer font-medium text-gray-700">
                          🔍 Other Relevant Keys ({cacheInfo.otherKeys.length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {cacheInfo.otherKeys.map((other: any, index: number) => (
                            <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                              <span className="font-mono">{other.key}</span><br/>
                              <span className="text-gray-600">
                                {(other.sizeBytes / 1024).toFixed(1)} KB - {other.preview || 'No preview'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {cacheInfo.indexedDBDatabases?.length > 0 && (
                      <details className="border rounded p-2">
                        <summary className="cursor-pointer font-medium text-red-700">
                          🗃️ IndexedDB Databases ({cacheInfo.indexedDBDatabases.length}) - PERSISTENTE
                        </summary>
                        <div className="mt-2 space-y-1">
                          {cacheInfo.indexedDBDatabases.map((db: any, index: number) => (
                            <div key={index} className="text-xs bg-red-50 p-2 rounded border">
                              <span className="font-mono font-bold">{db.name}</span><br/>
                              <span className="text-gray-600">
                                Version: {db.version} - 🚨 ThirdWeb/Wallet Storage
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {cacheInfo.deviceInfo?.windowWalletProps?.length > 0 && (
                      <details className="border rounded p-2">
                        <summary className="cursor-pointer font-medium text-yellow-700">
                          🌐 Window Wallet Objects ({cacheInfo.deviceInfo.windowWalletProps.length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {cacheInfo.deviceInfo.windowWalletProps.map((prop: string, index: number) => (
                            <div key={index} className="text-xs bg-yellow-50 p-2 rounded border">
                              <span className="font-mono">window.{prop}</span><br/>
                              <span className="text-gray-600">
                                Wallet provider object - keeps connection active
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Click Refresh to load cache information</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <h3 className="font-semibold">🚀 Cache Clearing Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Client Cache */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">💻 Client Cache</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Limpia localStorage, sessionStorage, IndexedDB, wallet connections
                </p>
                <button
                  onClick={handleClearClientCache}
                  disabled={isClearing}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isClearing ? '⏳' : '🧹'} Clear Client
                </button>
              </div>

              {/* Server Cache */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">🗄️ Server Cache</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Limpia Redis: NFT metadata, referrals, guardians
                </p>
                <button
                  onClick={handleClearServerCache}
                  disabled={isClearing}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  {isClearing ? '⏳' : '🗄️'} Clear Server
                </button>
              </div>

              {/* Aggressive Wallet Disconnect */}
              <div className="border rounded-lg p-4 border-orange-200 bg-orange-50">
                <h4 className="font-medium mb-2 text-orange-700">🔌 Disconnect Wallets</h4>
                <p className="text-sm text-orange-600 mb-3">
                  FUERZA desconexión: IndexedDB, ServiceWorkers, window objects
                </p>
                <button
                  onClick={handleAggressiveWalletDisconnect}
                  disabled={isClearing}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  {isClearing ? '⏳' : '🔌'} Force Disconnect
                </button>
              </div>

              {/* All Cache */}
              <div className="border rounded-lg p-4 border-red-200 bg-red-50">
                <h4 className="font-medium mb-2 text-red-700">⚠️ ALL Cache</h4>
                <p className="text-sm text-red-600 mb-3">
                  ELIMINA TODO: Client + Server + IndexedDB + Wallet connections
                </p>
                {showConfirmation ? (
                  <div className="space-y-2">
                    <p className="text-xs text-red-700 font-medium">¿Estás seguro?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearAllCache}
                        disabled={isClearing}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {isClearing ? '⏳' : '💀'} SÍ, BORRAR TODO
                      </button>
                      <button
                        onClick={() => setShowConfirmation(false)}
                        className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmation(true)}
                    disabled={isClearing}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {isClearing ? '⏳' : '💀'} Clear ALL
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Display */}
          {clearResults && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold mb-3">📋 Clear Results</h3>
              <div className="space-y-2 text-sm">
                {clearResults.combined ? (
                  <div>
                    <p className="font-medium text-green-600">✅ Combined Operation Complete</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Client Results</summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                        {JSON.stringify(clearResults.client, null, 2)}
                      </pre>
                    </details>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Server Results</summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                        {JSON.stringify(clearResults.server, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : clearResults.aggressive ? (
                  <div>
                    <p className="font-medium text-orange-600">🔌 Aggressive Wallet Disconnect Complete</p>
                    <div className="mt-2 text-xs">
                      <p><strong>Disconnections:</strong> {clearResults.details?.walletDisconnections || 0}</p>
                      <p><strong>IndexedDB Cleared:</strong> {clearResults.details?.indexedDBCleared || 0}</p>
                      <p><strong>ServiceWorkers:</strong> {clearResults.details?.serviceWorkersCleared || 0}</p>
                      <p><strong>Window Objects:</strong> {clearResults.details?.windowObjectsCleared || 0}</p>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Full Results</summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                        {JSON.stringify(clearResults, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <pre className="text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(clearResults, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚡ Testing Instructions</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>1. <strong>Try &quot;Force Disconnect&quot;</strong> si wallet sigue conectada</p>
              <p>2. <strong>Clear ALL Cache</strong> para limpieza completa</p>
              <p>3. <strong>Refresh browser</strong> (F5) para confirmar limpieza</p>
              <p>4. <strong>Si persiste:</strong> DevTools &gt; Application &gt; Clear Storage</p>
              <p>5. <strong>Check /api/debug/storage-analysis</strong> para debugging</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};