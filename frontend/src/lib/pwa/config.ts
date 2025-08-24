/**
 * PWA Configuration
 * Settings for Progressive Web App features
 */

/**
 * PWA configuration interface
 */
export interface PWAConfig {
  enabled: boolean;
  autoUpdate: boolean;
  showInstallPrompt: boolean;
  offlineEnabled: boolean;
  updateInterval: number; // milliseconds
}

/**
 * Get PWA configuration from environment
 */
export function getPWAConfig(): PWAConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_FEATURE_PWA === 'on',
    autoUpdate: process.env.NEXT_PUBLIC_PWA_AUTO_UPDATE !== 'off',
    showInstallPrompt: process.env.NEXT_PUBLIC_PWA_INSTALL_PROMPT !== 'off',
    offlineEnabled: process.env.NEXT_PUBLIC_PWA_OFFLINE !== 'off',
    updateInterval: parseInt(process.env.NEXT_PUBLIC_PWA_UPDATE_INTERVAL || '3600000'), // 1 hour default
  };
}

/**
 * Check if PWA is enabled
 */
export function isPWAEnabled(): boolean {
  return getPWAConfig().enabled;
}

/**
 * Check if device supports PWA
 */
export function isPWASupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get PWA display mode
 */
export function getPWADisplayMode(): 'browser' | 'standalone' | 'fullscreen' {
  if (typeof window === 'undefined') return 'browser';
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  
  // iOS standalone check
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  if (isFullscreen) return 'fullscreen';
  if (isStandalone || isIOSStandalone) return 'standalone';
  
  return 'browser';
}

/**
 * Check if running as installed PWA
 */
export function isInstalledPWA(): boolean {
  return getPWADisplayMode() !== 'browser';
}

/**
 * PWA install prompt interface
 */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}