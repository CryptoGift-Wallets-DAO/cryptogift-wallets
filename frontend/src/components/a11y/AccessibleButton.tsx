/**
 * Accessible Button Component
 * WCAG 2.2 AA compliant with target size and focus management
 */

'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { getA11yConfig } from '@/lib/a11y/config';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'medium',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const config = getA11yConfig();
    
    // WCAG 2.2 - Target Size (2.5.8)
    // Minimum 44x44px for AA, 24x24px absolute minimum with spacing
    const minSize = config.targetSize || 44;
    
    const sizeStyles = {
      small: {
        minHeight: `${Math.max(32, minSize)}px`,
        minWidth: `${Math.max(32, minSize)}px`,
        padding: '6px 12px',
        fontSize: '14px',
      },
      medium: {
        minHeight: `${minSize}px`,
        minWidth: `${minSize}px`,
        padding: '10px 20px',
        fontSize: '16px',
      },
      large: {
        minHeight: `${Math.max(48, minSize)}px`,
        minWidth: `${Math.max(48, minSize)}px`,
        padding: '14px 28px',
        fontSize: '18px',
      },
    };
    
    const variantStyles = {
      primary: {
        backgroundColor: '#0052ff',
        color: 'white',
        border: '2px solid transparent',
      },
      secondary: {
        backgroundColor: 'white',
        color: '#0052ff',
        border: '2px solid #0052ff',
      },
      danger: {
        backgroundColor: '#dc2626',
        color: 'white',
        border: '2px solid transparent',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#0052ff',
        border: '2px solid transparent',
      },
    };
    
    const buttonStyle = {
      ...sizeStyles[size],
      ...variantStyles[variant],
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: '8px',
      fontWeight: 500,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      transition: 'all 0.2s ease',
      position: 'relative' as const,
      width: fullWidth ? '100%' : 'auto',
      // WCAG 2.2 - Focus Appearance (2.4.13)
      outline: 'none',
      ...style,
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Space and Enter should activate button
      if (e.key === ' ' || e.key === 'Enter') {
        e.currentTarget.click();
      }
      props.onKeyDown?.(e);
    };
    
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        className={`accessible-button ${className}`}
        style={buttonStyle}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {loading && (
          <span 
            className="loading-spinner"
            role="status"
            aria-label="Loading"
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <span className="button-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        
        <span className="button-text">{children}</span>
        
        {!loading && icon && iconPosition === 'right' && (
          <span className="button-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        
        <style jsx>{`
          .accessible-button:focus-visible {
            /* WCAG 2.2 - Focus Appearance (2.4.13) */
            outline: 3px solid #0052ff;
            outline-offset: 2px;
            box-shadow: 0 0 0 4px rgba(0, 82, 255, 0.1);
          }
          
          .accessible-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          
          .accessible-button:active:not(:disabled) {
            transform: translateY(0);
          }
          
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
          
          @media (prefers-reduced-motion: reduce) {
            .accessible-button {
              transition: none !important;
            }
            
            .loading-spinner {
              animation: none !important;
              border: 2px solid currentColor !important;
              opacity: 0.5;
            }
          }
          
          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .accessible-button {
              border-width: 2px !important;
            }
          }
        `}</style>
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';