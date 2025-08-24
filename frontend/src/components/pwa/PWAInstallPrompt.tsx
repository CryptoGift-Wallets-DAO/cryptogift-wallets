/**
 * PWA Install Prompt Component
 * Mobile-first install experience
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { getPWAConfig } from '@/lib/pwa/config';

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, installPWA } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const config = getPWAConfig();
  
  // Check if should show prompt
  const shouldShow = config.enabled && 
                    config.showInstallPrompt && 
                    canInstall && 
                    !isInstalled && 
                    !dismissed;
  
  if (!shouldShow) return null;
  
  const handleInstall = async () => {
    setInstalling(true);
    const success = await installPWA();
    setInstalling(false);
    
    if (success) {
      setDismissed(true);
    }
  };
  
  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal in localStorage
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };
  
  // Check if previously dismissed (within 7 days)
  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setDismissed(true);
      }
    }
  }, []);
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        maxWidth: '400px',
        margin: '0 auto',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e5e7eb',
        zIndex: 9999,
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      {/* Close button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '4px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#6b7280',
        }}
      >
        <X size={20} />
      </button>
      
      {/* Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isMobile ? (
            <Smartphone size={24} color="#0052ff" />
          ) : (
            <Monitor size={24} color="#0052ff" />
          )}
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, paddingRight: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '4px',
            color: '#111827',
          }}>
            Install CryptoGift Wallets
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '12px',
            lineHeight: '1.5',
          }}>
            Add to your {isMobile ? 'home screen' : 'desktop'} for quick access and offline support.
          </p>
          
          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '8px',
          }}>
            <button
              onClick={handleInstall}
              disabled={installing}
              aria-label="Install app"
              style={{
                padding: '8px 16px',
                backgroundColor: '#0052ff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: installing ? 'not-allowed' : 'pointer',
                opacity: installing ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '36px', // WCAG 2.2 target size
              }}
            >
              <Download size={16} />
              {installing ? 'Installing...' : 'Install'}
            </button>
            
            <button
              onClick={handleDismiss}
              aria-label="Not now"
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
      
      {/* PWA benefits (optional) */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #f3f4f6',
        display: 'flex',
        gap: '16px',
        fontSize: '12px',
        color: '#9ca3af',
      }}>
        <span>✓ Offline access</span>
        <span>✓ Fast loading</span>
        <span>✓ Push notifications</span>
      </div>
      
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}