/**
 * PWA Update Prompt Component
 * Handles service worker updates
 */

'use client';

import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function PWAUpdatePrompt() {
  const { updateAvailable, updateServiceWorker } = usePWA();
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  if (!updateAvailable || dismissed) return null;
  
  const handleUpdate = async () => {
    setUpdating(true);
    await updateServiceWorker();
    // Page will reload automatically
  };
  
  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label="App update available"
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '400px',
        width: 'calc(100% - 40px)',
        padding: '12px 16px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <RefreshCw size={20} color="#92400e" />
      
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: '14px',
          color: '#92400e',
          margin: 0,
        }}>
          A new version is available!
        </p>
      </div>
      
      <button
        onClick={handleUpdate}
        disabled={updating}
        aria-label="Update app"
        style={{
          padding: '6px 12px',
          backgroundColor: '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: updating ? 'not-allowed' : 'pointer',
          opacity: updating ? 0.5 : 1,
          minWidth: '80px',
          minHeight: '32px', // WCAG 2.2 target size
        }}
      >
        {updating ? 'Updating...' : 'Update'}
      </button>
      
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update"
        style={{
          padding: '4px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#92400e',
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}