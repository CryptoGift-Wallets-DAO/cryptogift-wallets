/**
 * Service Worker Manager
 * Handles registration, updates, and messaging
 */

import { getPWAConfig } from './config';

export interface ServiceWorkerState {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  isOffline: boolean;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  private updateCallbacks: Set<() => void> = new Set();
  private offlineCallbacks: Set<(offline: boolean) => void> = new Set();
  
  /**
   * Register service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    const config = getPWAConfig();
    
    if (!config.enabled) {
      console.log('[PWA] Service worker disabled by config');
      return null;
    }
    
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service worker not supported');
      return null;
    }
    
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      this.registration = registration;
      console.log('[PWA] Service worker registered:', registration.scope);
      
      // Setup update detection
      this.setupUpdateDetection(registration);
      
      // Setup offline detection
      this.setupOfflineDetection();
      
      // Check for updates periodically
      if (config.autoUpdate) {
        this.startUpdateTimer(config.updateInterval);
      }
      
      return registration;
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
      return null;
    }
  }
  
  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;
    
    try {
      const success = await this.registration.unregister();
      if (success) {
        this.registration = null;
        console.log('[PWA] Service worker unregistered');
      }
      return success;
    } catch (error) {
      console.error('[PWA] Service worker unregistration failed:', error);
      return false;
    }
  }
  
  /**
   * Setup update detection
   */
  private setupUpdateDetection(registration: ServiceWorkerRegistration) {
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          this.updateAvailable = true;
          this.notifyUpdateAvailable();
        }
      });
    });
    
    // Listen for controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Service worker updated, reload for changes
      window.location.reload();
    });
  }
  
  /**
   * Setup offline detection
   */
  private setupOfflineDetection() {
    // Initial state
    this.notifyOfflineStatus(!navigator.onLine);
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.notifyOfflineStatus(false);
    });
    
    window.addEventListener('offline', () => {
      this.notifyOfflineStatus(true);
    });
  }
  
  /**
   * Start update timer
   */
  private startUpdateTimer(interval: number) {
    setInterval(() => {
      this.checkForUpdates();
    }, interval);
    
    // Check immediately
    this.checkForUpdates();
  }
  
  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) return;
    
    try {
      await this.registration.update();
    } catch (error) {
      console.error('[PWA] Update check failed:', error);
    }
  }
  
  /**
   * Apply update
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration?.waiting) return;
    
    // Send skip waiting message to service worker
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  
  /**
   * Subscribe to update notifications
   */
  onUpdateAvailable(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    
    // Notify immediately if update is available
    if (this.updateAvailable) {
      callback();
    }
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }
  
  /**
   * Subscribe to offline status changes
   */
  onOfflineChange(callback: (offline: boolean) => void): () => void {
    this.offlineCallbacks.add(callback);
    
    // Notify immediately with current status
    callback(!navigator.onLine);
    
    // Return unsubscribe function
    return () => {
      this.offlineCallbacks.delete(callback);
    };
  }
  
  /**
   * Notify update available
   */
  private notifyUpdateAvailable() {
    this.updateCallbacks.forEach(callback => callback());
  }
  
  /**
   * Notify offline status
   */
  private notifyOfflineStatus(offline: boolean) {
    this.offlineCallbacks.forEach(callback => callback(offline));
  }
  
  /**
   * Get current state
   */
  getState(): ServiceWorkerState {
    return {
      registration: this.registration,
      updateAvailable: this.updateAvailable,
      isOffline: !navigator.onLine,
    };
  }
  
  /**
   * Send message to service worker
   */
  async sendMessage(message: any): Promise<void> {
    if (!this.registration?.active) return;
    
    this.registration.active.postMessage(message);
  }
}

// Singleton instance
let manager: ServiceWorkerManager | null = null;

/**
 * Get service worker manager instance
 */
export function getServiceWorkerManager(): ServiceWorkerManager {
  if (!manager) {
    manager = new ServiceWorkerManager();
  }
  return manager;
}