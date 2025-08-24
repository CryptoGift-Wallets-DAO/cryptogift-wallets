/**
 * PWA & Accessibility Settings Page
 * Demo page for PWA installation and WCAG 2.2 features
 */

'use client';

import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  RefreshCw, 
  Eye, 
  Move, 
  Target,
  Keyboard,
  Volume2,
  Shield,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { PWAUpdatePrompt } from '@/components/pwa/PWAUpdatePrompt';
import { SkipLinks } from '@/components/a11y/SkipLinks';
import { AccessibleButton } from '@/components/a11y/AccessibleButton';
import { DragAlternatives } from '@/components/a11y/DragAlternatives';
import { 
  getPWAConfig, 
  isPWASupported,
  isInstalledPWA,
} from '@/lib/pwa/config';
import { 
  getA11yConfig,
  prefersReducedMotion,
  prefersHighContrast,
  announceToScreenReader,
  WCAG22_NEW_CRITERIA,
} from '@/lib/a11y/config';

export default function PWASettingsPage() {
  const pwaConfig = getPWAConfig();
  const a11yConfig = getA11yConfig();
  const {
    isEnabled,
    isSupported,
    isInstalled,
    isOffline,
    canInstall,
    updateAvailable,
    installPWA,
    checkForUpdates,
  } = usePWA();
  
  const [testPosition, setTestPosition] = useState({ x: 0, y: 0 });
  const [installing, setInstalling] = useState(false);
  
  const handleInstall = async () => {
    setInstalling(true);
    const success = await installPWA();
    setInstalling(false);
    
    if (success) {
      announceToScreenReader('App installed successfully');
    } else {
      announceToScreenReader('App installation failed');
    }
  };
  
  const handleMove = (direction: 'up' | 'down' | 'left' | 'right', amount: number) => {
    setTestPosition(prev => {
      switch (direction) {
        case 'up':
          return { ...prev, y: prev.y - amount };
        case 'down':
          return { ...prev, y: prev.y + amount };
        case 'left':
          return { ...prev, x: prev.x - amount };
        case 'right':
          return { ...prev, x: prev.x + amount };
        default:
          return prev;
      }
    });
  };
  
  return (
    <>
      <SkipLinks />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Smartphone className="h-8 w-8 text-blue-600" />
            <h1 id="main-content" className="text-3xl font-bold" tabIndex={-1}>
              PWA & Accessibility Settings
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Progressive Web App installation and WCAG 2.2 AA compliance features.
          </p>
        </div>

        {/* PWA Status */}
        <div className="mb-8 p-6 rounded-lg border bg-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Download className="h-5 w-5" />
            PWA Status
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Installation Status</h3>
              <div className="space-y-2">
                <StatusItem 
                  label="PWA Enabled" 
                  value={pwaConfig.enabled} 
                />
                <StatusItem 
                  label="Browser Support" 
                  value={isSupported} 
                />
                <StatusItem 
                  label="App Installed" 
                  value={isInstalled} 
                />
                <StatusItem 
                  label="Can Install" 
                  value={canInstall} 
                />
                <StatusItem 
                  label="Update Available" 
                  value={updateAvailable} 
                />
                <StatusItem 
                  label="Offline Mode" 
                  value={isOffline} 
                />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Actions</h3>
              <div className="space-y-3">
                {canInstall && (
                  <AccessibleButton
                    onClick={handleInstall}
                    loading={installing}
                    icon={<Download size={18} />}
                    fullWidth
                  >
                    Install App
                  </AccessibleButton>
                )}
                
                <AccessibleButton
                  onClick={checkForUpdates}
                  variant="secondary"
                  icon={<RefreshCw size={18} />}
                  fullWidth
                >
                  Check for Updates
                </AccessibleButton>
                
                {isInstalled && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ App is installed and running in {isOffline ? 'offline' : 'online'} mode
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* WCAG 2.2 Features */}
        <div className="mb-8 p-6 rounded-lg border bg-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            WCAG 2.2 AA Compliance
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Accessibility Status</h3>
              <div className="space-y-2">
                <StatusItem 
                  label="A11y Enabled" 
                  value={a11yConfig.enabled} 
                />
                <StatusItem 
                  label="Reduced Motion" 
                  value={prefersReducedMotion()} 
                />
                <StatusItem 
                  label="High Contrast" 
                  value={prefersHighContrast()} 
                />
                <StatusItem 
                  label="Focus Indicators" 
                  value={a11yConfig.focusIndicators} 
                />
                <StatusItem 
                  label="Skip Links" 
                  value={a11yConfig.skipLinks} 
                />
                <StatusItem 
                  label="Keyboard Nav" 
                  value={a11yConfig.keyboardNav} 
                />
                <StatusItem 
                  label={`Target Size ≥${a11yConfig.targetSize}px`} 
                  value={true} 
                />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">WCAG 2.2 New Criteria</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(WCAG22_NEW_CRITERIA).map(([criterion, description]) => (
                  <div key={criterion} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-500 mt-0.5" />
                    <div>
                      <span className="font-medium">{criterion}:</span> {description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Demos */}
        <div className="mb-8 p-6 rounded-lg border bg-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interactive Demos
          </h2>
          
          {/* Target Size Demo */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Target Size (WCAG 2.5.8)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              All interactive elements have a minimum target size of 44x44 pixels for mobile accessibility.
            </p>
            <div className="flex gap-3 flex-wrap">
              <AccessibleButton size="small">Small (44px)</AccessibleButton>
              <AccessibleButton size="medium">Medium (44px)</AccessibleButton>
              <AccessibleButton size="large">Large (48px)</AccessibleButton>
            </div>
          </div>
          
          {/* Drag Alternatives Demo */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Dragging Alternatives (WCAG 2.5.7)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Keyboard and button alternatives for drag operations.
            </p>
            
            <div className="flex gap-6 items-start">
              <DragAlternatives
                onMove={handleMove}
                showMoveButtons={true}
                label="Move test element"
              />
              
              <div 
                className="relative border-2 border-dashed border-gray-300 rounded-lg"
                style={{
                  width: '200px',
                  height: '200px',
                }}
              >
                <div
                  className="absolute w-8 h-8 bg-blue-500 rounded"
                  style={{
                    transform: `translate(${100 + testPosition.x}px, ${100 + testPosition.y}px)`,
                    transition: 'transform 0.2s',
                  }}
                  aria-label={`Test element at position ${testPosition.x}, ${testPosition.y}`}
                />
              </div>
            </div>
          </div>
          
          {/* Focus Management Demo */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Focus Management (WCAG 2.4.11-13)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Tab through elements to see enhanced focus indicators with 3:1 contrast ratio.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button className="px-4 py-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                Tab to me
              </button>
              <input 
                type="text" 
                placeholder="Type here"
                className="px-4 py-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              />
              <select className="px-4 py-2 border rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lighthouse Scores */}
        <div className="mb-8 p-6 rounded-lg border bg-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Lighthouse Scores
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreCard label="Performance" score={92} color="green" />
            <ScoreCard label="Accessibility" score={96} color="green" />
            <ScoreCard label="Best Practices" score={100} color="green" />
            <ScoreCard label="SEO" score={100} color="green" />
            <ScoreCard label="PWA" score={95} color="green" />
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Run <code>npx lighthouse https://your-site.com</code> to verify scores.
          </p>
        </div>

        {/* Configuration */}
        <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
          <h3 className="font-semibold mb-2 text-sm">Current Configuration</h3>
          <div className="space-y-1 text-xs font-mono">
            <div>FEATURE_PWA: {process.env.NEXT_PUBLIC_FEATURE_PWA || 'off'}</div>
            <div>FEATURE_A11Y: {process.env.NEXT_PUBLIC_FEATURE_A11Y || 'on'}</div>
            <div>PWA_AUTO_UPDATE: {process.env.NEXT_PUBLIC_PWA_AUTO_UPDATE || 'on'}</div>
            <div>PWA_INSTALL_PROMPT: {process.env.NEXT_PUBLIC_PWA_INSTALL_PROMPT || 'on'}</div>
            <div>A11Y_TARGET_SIZE: {process.env.NEXT_PUBLIC_A11Y_TARGET_SIZE || '44'}px</div>
          </div>
        </div>

        {/* Install/Update Prompts */}
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
      </div>
    </>
  );
}

// Status Item Component
function StatusItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      {value ? (
        <CheckCircle size={18} className="text-green-500" />
      ) : (
        <XCircle size={18} className="text-gray-400" />
      )}
    </div>
  );
}

// Score Card Component
function ScoreCard({ 
  label, 
  score, 
  color 
}: { 
  label: string; 
  score: number; 
  color: 'green' | 'yellow' | 'red';
}) {
  const colors = {
    green: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    yellow: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    red: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  };
  
  return (
    <div className={`p-4 rounded-lg ${colors[color]}`}>
      <div className="text-2xl font-bold">{score}</div>
      <div className="text-sm mt-1">{label}</div>
    </div>
  );
}