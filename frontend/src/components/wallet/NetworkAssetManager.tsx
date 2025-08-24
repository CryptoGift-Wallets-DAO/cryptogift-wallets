/**
 * Network & Asset Manager Component
 * Mobile-first UI for adding networks and tokens
 */

'use client';

import React, { useState } from 'react';
import {
  Globe,
  Coins,
  Plus,
  Check,
  X,
  AlertCircle,
  Loader2,
  Smartphone,
  Monitor,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useWalletManager } from '@/hooks/useWalletManager';
import { useActiveWalletChain } from 'thirdweb/react';

interface NetworkAssetManagerProps {
  className?: string;
  compactMode?: boolean;
  requiredChainId?: number;
}

export function NetworkAssetManager({
  className = '',
  compactMode = false,
  requiredChainId = 84532, // Base Sepolia default
}: NetworkAssetManagerProps) {
  const chain = useActiveWalletChain();
  const currentChainId = chain?.id;
  
  const {
    isEnabled,
    isCorrectNetwork,
    isMobile,
    isMetaMaskMobile,
    pendingNetwork,
    pendingAsset,
    error,
    addBaseMainnet,
    addBaseSepolia,
    addUSDC,
    addPlayerToken,
    switchToRequiredNetwork,
    getNetworkInfo,
    getAssets,
  } = useWalletManager(requiredChainId);
  
  const [showDetails, setShowDetails] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  if (!isEnabled) return null;
  
  const networkInfo = getNetworkInfo(requiredChainId);
  const assets = getAssets();
  
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      // Fallback for mobile
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Network Status */}
      {!isCorrectNetwork && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={20} color="#f59e0b" />
              <div>
                <p style={{
                  fontWeight: 500,
                  color: '#92400e',
                }}>
                  Wrong Network Detected
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#78350f',
                  marginTop: '2px',
                }}>
                  Please switch to {networkInfo?.chainName || `Chain ${requiredChainId}`}
                </p>
              </div>
            </div>
            
            <button
              onClick={switchToRequiredNetwork}
              disabled={pendingNetwork === requiredChainId}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                cursor: pendingNetwork === requiredChainId ? 'not-allowed' : 'pointer',
                opacity: pendingNetwork === requiredChainId ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {pendingNetwork === requiredChainId ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Globe size={16} />
              )}
              Switch Network
            </button>
          </div>
        </div>
      )}
      
      {/* Main Container */}
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        backgroundColor: 'white',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Globe size={20} />
          Quick Network & Asset Setup
        </h3>
        
        {/* Networks Section */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#6b7280',
            marginBottom: '12px',
          }}>
            Add Networks
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: compactMode ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {/* Base Mainnet */}
            <button
              onClick={addBaseMainnet}
              disabled={pendingNetwork === 8453}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: pendingNetwork === 8453 ? '#f3f4f6' : 'white',
                cursor: pendingNetwork === 8453 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#0052ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>B</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>Base</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Mainnet</p>
                </div>
              </div>
              {pendingNetwork === 8453 ? (
                <Loader2 size={16} className="animate-spin" />
              ) : currentChainId === 8453 ? (
                <Check size={16} color="#10b981" />
              ) : (
                <Plus size={16} color="#6b7280" />
              )}
            </button>
            
            {/* Base Sepolia */}
            <button
              onClick={addBaseSepolia}
              disabled={pendingNetwork === 84532}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: pendingNetwork === 84532 ? '#f3f4f6' : 'white',
                cursor: pendingNetwork === 84532 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#0052ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>B</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>Base Sepolia</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Testnet</p>
                </div>
              </div>
              {pendingNetwork === 84532 ? (
                <Loader2 size={16} className="animate-spin" />
              ) : currentChainId === 84532 ? (
                <Check size={16} color="#10b981" />
              ) : (
                <Plus size={16} color="#6b7280" />
              )}
            </button>
          </div>
        </div>
        
        {/* Assets Section */}
        <div>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#6b7280',
            marginBottom: '12px',
          }}>
            Add Tokens
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: compactMode ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {/* USDC */}
            <button
              onClick={addUSDC}
              disabled={pendingAsset === 'USDC_BASE_SEPOLIA'}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: pendingAsset === 'USDC_BASE_SEPOLIA' ? '#f3f4f6' : 'white',
                cursor: pendingAsset === 'USDC_BASE_SEPOLIA' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#2775ca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>$</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>USDC</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Stablecoin</p>
                </div>
              </div>
              {pendingAsset === 'USDC_BASE_SEPOLIA' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} color="#6b7280" />
              )}
            </button>
            
            {/* Player Token */}
            <button
              onClick={addPlayerToken}
              disabled={pendingAsset === 'PLAYER_TOKEN'}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: pendingAsset === 'PLAYER_TOKEN' ? '#f3f4f6' : 'white',
                cursor: pendingAsset === 'PLAYER_TOKEN' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Coins size={18} color="white" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>PLAYER</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Game Token</p>
                </div>
              </div>
              {pendingAsset === 'PLAYER_TOKEN' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} color="#6b7280" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Notice */}
        {isMobile && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bfdbfe',
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              <Smartphone size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '14px', color: '#1e40af' }}>
                <p style={{ fontWeight: 500 }}>Mobile Wallet Detected</p>
                <p style={{ marginTop: '4px' }}>
                  {isMetaMaskMobile 
                    ? 'MetaMask Mobile: Token addition works. NFTs are not supported on mobile.'
                    : 'Make sure you have a Web3 wallet app installed for best experience.'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              <X size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '14px', color: '#dc2626' }}>
                {error}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Manual Configuration Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500 }}>
          Manual Configuration
        </span>
        {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      
      {showDetails && networkInfo && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: 500,
            marginBottom: '12px',
          }}>
            {networkInfo.chainName} Network Details
          </h4>
          
          <div style={{ fontSize: '14px', space: 'y-2' }}>
            {[
              { label: 'Network Name', value: networkInfo.chainName },
              { label: 'Chain ID', value: parseInt(networkInfo.chainId, 16).toString() },
              { label: 'RPC URL', value: networkInfo.rpcUrls[0] },
              { label: 'Currency Symbol', value: networkInfo.nativeCurrency.symbol },
              { label: 'Block Explorer', value: networkInfo.blockExplorerUrls[0] },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span style={{ color: '#6b7280' }}>{label}:</span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {value}
                  </span>
                  <button
                    onClick={() => copyToClipboard(value, label)}
                    style={{
                      padding: '4px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedText === label ? (
                      <Check size={14} color="#10b981" />
                    ) : (
                      <Copy size={14} color="#6b7280" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <p style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#6b7280',
          }}>
            Copy these values to manually add the network in your wallet settings.
          </p>
        </div>
      )}
    </div>
  );
}