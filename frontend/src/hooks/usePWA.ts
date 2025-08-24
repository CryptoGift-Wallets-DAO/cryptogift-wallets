/**
 * React Hook for PWA features
 * Provides easy integration with components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getPWAConfig, 
  isPWASupported,
  isInstalledPWA,
  type InstallPromptEvent,
} from '@/lib/pwa/config';
import { getServiceWorkerManager } from '@/lib/pwa/serviceWorker';

interface PWAState {
  isEnabled: boolean;
  isSupported: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  canInstall: boolean;
  updateAvailable: boolean;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isEnabled: false,
    isSupported: false,
    isInstalled: false,
    isOffline: false,
    canInstall: false,
    updateAvailable: false,
  });
  
  const installPromptRef = useRef<InstallPromptEvent | null>(null);
  const swManager = useRef(getServiceWorkerManager());
  
  // Initialize PWA
  useEffect(() => {
    const config = getPWAConfig();
    
    setState(prev => ({
      ...prev,
      isEnabled: config.enabled,
      isSupported: isPWASupported(),
      isInstalled: isInstalledPWA(),
      isOffline: !navigator.onLine,
    }));
    
    if (!config.enabled || !isPWASupported()) {
      return;
    }
    
    // Register service worker
    swManager.current.register();
    
    // Listen for install prompt
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as InstallPromptEvent;
      setState(prev => ({ ...prev, canInstall: true }));
      
      // Track install prompt shown
      trackPWAEvent('install_prompt_shown');
    };
    
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    
    // Listen for app installed
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
      }));
      installPromptRef.current = null;
      
      // Track install success
      trackPWAEvent('app_installed');
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Subscribe to service worker updates
    const unsubscribeUpdate = swManager.current.onUpdateAvailable(() => {
      setState(prev => ({ ...prev, updateAvailable: true }));
      trackPWAEvent('sw_update_available');
    });
    
    // Subscribe to offline status
    const unsubscribeOffline = swManager.current.onOfflineChange((offline) => {
      setState(prev => ({ ...prev, isOffline: offline }));
    });
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      unsubscribeUpdate();
      unsubscribeOffline();
    };
  }, []);
  
  /**
   * Install PWA
   */
  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!installPromptRef.current) {
      console.warn('[PWA] No install prompt available');
      return false;
    }
    
    try {
      // Show install prompt
      await installPromptRef.current.prompt();
      
      // Wait for user choice
      const { outcome } = await installPromptRef.current.userChoice;
      
      if (outcome === 'accepted') {
        trackPWAEvent('install_accepted');
        return true;
      } else {
        trackPWAEvent('install_dismissed');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      trackPWAEvent('install_error');
      return false;
    }
  }, []);
  
  /**
   * Update service worker
   */
  const updateServiceWorker = useCallback(async () => {
    await swManager.current.applyUpdate();
    trackPWAEvent('sw_update_applied');
  }, []);
  
  /**
   * Check for updates
   */
  const checkForUpdates = useCallback(async () => {
    await swManager.current.checkForUpdates();
    trackPWAEvent('sw_update_check');
  }, []);
  
  return {
    ...state,
    installPWA,
    updateServiceWorker,
    checkForUpdates,
  };
}

/**
 * Track PWA events (telemetry)
 */
function trackPWAEvent(event: string, data?: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PWA Event] ${event}`, data);
  }
  
  // Send to analytics (placeholder)
  // This would integrate with your analytics system
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      event_category: 'PWA',
      ...data,
    });
  }
}