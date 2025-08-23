/**
 * MEV Protection Toggle Component
 * Chain-aware UI with tooltips and status indicators
 */

'use client';

import React, { useState } from 'react';
import { Shield, ShieldOff, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useMEVProtection } from '@/hooks/useMEVProtection';
import { getChainName } from '@/lib/mev/config';
import { useActiveWalletChain } from 'thirdweb/react';

interface MEVProtectionToggleProps {
  className?: string;
  showDetails?: boolean;
}

export function MEVProtectionToggle({ 
  className = '',
  showDetails = false 
}: MEVProtectionToggleProps) {
  const chain = useActiveWalletChain();
  const chainId = chain?.id || 84532;
  const chainName = getChainName(chainId);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const {
    isAvailable,
    isEnabled,
    isProtected,
    mode,
    message,
    color,
    isChecking,
    toggleProtection,
    forceHealthCheck,
  } = useMEVProtection();

  // Color mapping for status
  const statusColors = {
    green: '#10b981',
    yellow: '#f59e0b',
    red: '#ef4444',
  };

  const statusBgColors = {
    green: 'rgba(16, 185, 129, 0.1)',
    yellow: 'rgba(245, 158, 11, 0.1)',
    red: 'rgba(239, 68, 68, 0.1)',
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid rgba(0,0,0,0.1)',
        backgroundColor: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isProtected ? (
            <Shield size={20} color="#10b981" />
          ) : (
            <ShieldOff size={20} color="#9ca3af" />
          )}
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 500 }}>MEV Protection</span>
              
              <div style={{ position: 'relative' }}>
                <Info 
                  size={16} 
                  color="#6b7280" 
                  style={{ cursor: 'help' }}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                />
                {showTooltip && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '14px',
                    width: '250px',
                    zIndex: 1000,
                  }}>
                    <p>
                      MEV (Maximum Extractable Value) protection shields your transactions 
                      from front-running and sandwich attacks via Flashbots Protect.
                    </p>
                    <p style={{ marginTop: '8px', color: '#fbbf24' }}>
                      Note: Only available on Ethereum mainnet and Sepolia testnet.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '14px', color: statusColors[color] }}>
                {message}
              </span>
              {isChecking && (
                <Loader2 size={12} className="animate-spin" color="#6b7280" />
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAvailable ? (
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => toggleProtection()}
                disabled={isChecking}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: isChecking ? 'not-allowed' : 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isEnabled ? '#10b981' : '#ccc',
                transition: '0.4s',
                borderRadius: '24px',
                opacity: isChecking ? 0.5 : 1,
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '18px',
                  width: '18px',
                  left: isEnabled ? '26px' : '3px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  transition: '0.4s',
                  borderRadius: '50%',
                }}></span>
              </span>
            </label>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
            }}>
              <AlertCircle size={16} color="#6b7280" />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Not available</span>
            </div>
          )}
        </div>
      </div>

      {/* Details Section */}
      {showDetails && isAvailable && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.1)',
          backgroundColor: statusBgColors[color],
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Network:</span>
              <span style={{ fontWeight: 500 }}>{chainName}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Protection Mode:</span>
              <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{mode}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Status:</span>
              <span style={{ fontWeight: 500, color: statusColors[color] }}>
                {isProtected ? 'Protected' : 'Unprotected'}
              </span>
            </div>
            
            {isProtected && (
              <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  Your transactions are being routed through Flashbots Protect RPC.
                  This provides front-running protection and potential MEV refunds.
                </p>
              </div>
            )}
          </div>

          {/* Health Check Button */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <button
              onClick={forceHealthCheck}
              disabled={isChecking}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isChecking ? '#e5e7eb' : '#f3f4f6',
                color: isChecking ? '#9ca3af' : '#374151',
                cursor: isChecking ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {isChecking ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Test Connection
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Base Network Notice */}
      {!isAvailable && (chainId === 8453 || chainId === 84532) && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '14px', color: '#1e40af' }}>
              <p style={{ fontWeight: 500 }}>Base Network Notice</p>
              <p style={{ marginTop: '4px' }}>
                MEV Protection via Flashbots Protect is not yet available on Base. 
                We're monitoring for Base-compatible private RPC solutions and will 
                enable protection as soon as it becomes available.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}