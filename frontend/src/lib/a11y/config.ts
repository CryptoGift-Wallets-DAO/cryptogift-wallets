/**
 * Accessibility (WCAG 2.2 AA) Configuration
 * Settings for accessibility features
 */

/**
 * Accessibility configuration interface
 */
export interface A11yConfig {
  enabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
  announcements: boolean;
  keyboardNav: boolean;
  targetSize: number; // minimum target size in pixels
}

/**
 * Get accessibility configuration from environment
 */
export function getA11yConfig(): A11yConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_FEATURE_A11Y !== 'off',
    reducedMotion: process.env.NEXT_PUBLIC_A11Y_REDUCED_MOTION !== 'off',
    highContrast: process.env.NEXT_PUBLIC_A11Y_HIGH_CONTRAST === 'on',
    focusIndicators: process.env.NEXT_PUBLIC_A11Y_FOCUS !== 'off',
    skipLinks: process.env.NEXT_PUBLIC_A11Y_SKIP_LINKS !== 'off',
    announcements: process.env.NEXT_PUBLIC_A11Y_ANNOUNCEMENTS !== 'off',
    keyboardNav: process.env.NEXT_PUBLIC_A11Y_KEYBOARD !== 'off',
    targetSize: parseInt(process.env.NEXT_PUBLIC_A11Y_TARGET_SIZE || '44'), // 44px WCAG 2.2 AA
  };
}

/**
 * Check if accessibility features are enabled
 */
export function isA11yEnabled(): boolean {
  return getA11yConfig().enabled;
}

/**
 * WCAG 2.2 Success Criteria levels
 */
export enum WCAGLevel {
  A = 'A',
  AA = 'AA',
  AAA = 'AAA',
}

/**
 * WCAG 2.2 new criteria
 */
export const WCAG22_NEW_CRITERIA = {
  // Level A
  '2.4.11': 'Focus Not Obscured (Minimum)',
  '2.5.7': 'Dragging Movements',
  '2.5.8': 'Target Size (Minimum)',
  '3.2.6': 'Consistent Help',
  '3.3.7': 'Redundant Entry',
  
  // Level AA
  '2.4.12': 'Focus Not Obscured (Enhanced)',
  '2.4.13': 'Focus Appearance',
  '3.3.8': 'Accessible Authentication (Minimum)',
  '3.3.9': 'Accessible Authentication (Enhanced)',
} as const;

/**
 * Check user preference for reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check user preference for high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Check user preference for color scheme
 */
export function prefersColorScheme(): 'light' | 'dark' | 'no-preference' {
  if (typeof window === 'undefined') return 'no-preference';
  
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  
  return 'no-preference';
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof document === 'undefined') return;
  
  // Create or get announcement element
  let announcer = document.getElementById('a11y-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'a11y-announcer';
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);
  }
  
  // Clear and set message
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}