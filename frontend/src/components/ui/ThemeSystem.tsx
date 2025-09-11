'use client';
import React from 'react';
import { AdaptivePanel, GlassPanel, LuxuryPanel, MinimalPanel, SolidPanel } from './AdaptivePanel';
import { GlassPanelHeader, DashboardGlassHeader, ModalGlassHeader } from './GlassPanelHeader';

/**
 * UNIFIED THEME SYSTEM - CryptoGift Wallets Design Language
 * 
 * Provides consistent theming across the entire application with
 * pre-configured components for different use cases.
 * 
 * Design Principles:
 * - 🎨 Consistent visual hierarchy
 * - 🌙 Perfect dark/light mode integration  
 * - ✨ Luxury aesthetics with professional feel
 * - 📱 Mobile-first responsive design
 * - 🔧 High customizability while maintaining consistency
 */

// ============================================================================
// CARD SYSTEM - For content containers
// ============================================================================

interface ThemeCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'highlighted' | 'interactive' | 'warning' | 'success';
  className?: string;
  onClick?: () => void;
}

/**
 * Standard content card with consistent theming
 */
export const ThemeCard: React.FC<ThemeCardProps> = ({ 
  children, 
  variant = 'default', 
  className = '',
  onClick 
}) => {
  const variantConfig = {
    default: {
      variant: 'glass' as const,
      blur: 'md' as const,
      shadow: 'lg' as const,
      border: true,
      className: 'hover:shadow-xl transition-all duration-300'
    },
    highlighted: {
      variant: 'luxury' as const,
      blur: 'lg' as const,
      shadow: 'xl' as const,
      border: true,
      glow: true,
      className: 'hover:shadow-2xl transition-all duration-300'
    },
    interactive: {
      variant: 'glass' as const,
      blur: 'md' as const,
      shadow: 'md' as const,
      border: true,
      className: 'hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer'
    },
    warning: {
      variant: 'solid' as const,
      shadow: 'lg' as const,
      border: true,
      className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50'
    },
    success: {
      variant: 'solid' as const,
      shadow: 'lg' as const,
      border: true,
      className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50'
    }
  };

  const config = variantConfig[variant];

  return (
    <AdaptivePanel
      {...config}
      className={`${config.className} ${className}`}
      onClick={onClick}
    >
      {children}
    </AdaptivePanel>
  );
};

// ============================================================================
// SECTION SYSTEM - For page layout sections
// ============================================================================

interface ThemeSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'hero' | 'feature' | 'sidebar';
  className?: string;
}

/**
 * Page section with consistent spacing and theming
 */
export const ThemeSection: React.FC<ThemeSectionProps> = ({
  children,
  title,
  subtitle,
  variant = 'default',
  className = ''
}) => {
  const variantConfig = {
    default: {
      containerClass: 'mb-8',
      headerClass: 'mb-6',
      titleClass: 'text-2xl font-bold text-gray-900 dark:text-white',
      subtitleClass: 'text-gray-600 dark:text-gray-300 mt-2'
    },
    hero: {
      containerClass: 'mb-12',
      headerClass: 'mb-8 text-center',
      titleClass: 'text-4xl md:text-5xl font-bold text-gray-900 dark:text-white',
      subtitleClass: 'text-xl text-gray-600 dark:text-gray-300 mt-4'
    },
    feature: {
      containerClass: 'mb-10',
      headerClass: 'mb-6',
      titleClass: 'text-3xl font-bold text-gray-900 dark:text-white',
      subtitleClass: 'text-lg text-gray-600 dark:text-gray-300 mt-3'
    },
    sidebar: {
      containerClass: 'mb-6',
      headerClass: 'mb-4',
      titleClass: 'text-lg font-semibold text-gray-900 dark:text-white',
      subtitleClass: 'text-sm text-gray-600 dark:text-gray-300 mt-1'
    }
  };

  const config = variantConfig[variant];

  return (
    <section className={`${config.containerClass} ${className}`}>
      {(title || subtitle) && (
        <header className={config.headerClass}>
          {title && (
            <h2 className={config.titleClass}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className={config.subtitleClass}>
              {subtitle}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  );
};

// ============================================================================
// BUTTON SYSTEM - Consistent button theming
// ============================================================================

interface ThemeButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Themed button with consistent styling
 */
export const ThemeButton: React.FC<ThemeButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button'
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white focus:ring-gray-500',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg hover:shadow-xl',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-lg hover:shadow-xl'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : 'hover:scale-[1.02] active:scale-[0.98]';

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && (
        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// ============================================================================
// INPUT SYSTEM - Consistent form inputs
// ============================================================================

interface ThemeInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'url';
  disabled?: boolean;
  error?: string;
  helper?: string;
  required?: boolean;
  className?: string;
}

/**
 * Themed input with consistent styling
 */
export const ThemeInput: React.FC<ThemeInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  error,
  helper,
  required = false,
  className = ''
}) => {
  const inputClasses = `
    w-full px-4 py-3 rounded-lg border-2 transition-all duration-200
    bg-white dark:bg-gray-800 
    text-gray-900 dark:text-white
    placeholder-gray-500 dark:placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${error 
      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `.trim();

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        className={inputClasses}
      />
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helper}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// LAYOUT SYSTEM - Page and content layouts
// ============================================================================

interface ThemeLayoutProps {
  children: React.ReactNode;
  variant?: 'default' | 'centered' | 'sidebar' | 'dashboard';
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * Consistent page layout with theming
 */
export const ThemeLayout: React.FC<ThemeLayoutProps> = ({
  children,
  variant = 'default',
  className = '',
  maxWidth = '2xl'
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const variantClasses = {
    default: 'container mx-auto px-4 py-8',
    centered: 'container mx-auto px-4 py-8 flex items-center justify-center min-h-screen',
    sidebar: 'flex min-h-screen',
    dashboard: 'min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900'
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      <div className={`${maxWidthClasses[maxWidth]} w-full`}>
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT UNIFIED THEME SYSTEM
// ============================================================================

export const CryptoGiftTheme = {
  // Components
  Card: ThemeCard,
  Section: ThemeSection,
  Button: ThemeButton,
  Input: ThemeInput,
  Layout: ThemeLayout,
  
  // Panels
  Panel: AdaptivePanel,
  GlassPanel,
  LuxuryPanel,
  MinimalPanel,
  SolidPanel,
  
  // Headers
  Header: GlassPanelHeader,
  DashboardHeader: DashboardGlassHeader,
  ModalHeader: ModalGlassHeader
};

export default CryptoGiftTheme;