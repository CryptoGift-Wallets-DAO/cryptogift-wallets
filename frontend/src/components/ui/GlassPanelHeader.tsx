'use client';
import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, Easing } from 'framer-motion';
import { useTheme } from 'next-themes';

interface GlassPanelHeaderProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'fixed' | 'sticky' | 'inline';
  blurIntensity?: 'subtle' | 'medium' | 'strong' | 'ultra';
  showBorder?: boolean;
  showGlow?: boolean;
  gradientOverlay?: boolean;
  scrollEffect?: boolean;
}

/**
 * GlassPanelHeader - Advanced glassmorphism header component
 * 
 * Features:
 * - 🎨 Multiple blur intensity levels with advanced CSS filters
 * - 📱 Responsive design with mobile-optimized glassmorphism
 * - 🌈 Dynamic gradient overlays with theme-aware colors
 * - 📜 Scroll-based blur and opacity effects
 * - ✨ Luxury glow effects with animated borders
 * - 🎭 Smooth transitions and micro-interactions
 * - 🌙 Perfect dark/light mode integration
 * - 🔧 Highly customizable with multiple variants
 */
export function GlassPanelHeader({
  children,
  title,
  subtitle,
  icon,
  className = '',
  variant = 'sticky',
  blurIntensity = 'medium',
  showBorder = true,
  showGlow = false,
  gradientOverlay = true,
  scrollEffect = true
}: GlassPanelHeaderProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();
  
  // Advanced blur configurations
  const blurConfig = {
    subtle: {
      backdropFilter: 'blur(8px) saturate(120%)',
      webkitBackdropFilter: 'blur(8px) saturate(120%)',
      background: theme === 'dark' 
        ? 'rgba(15, 23, 42, 0.7)' 
        : 'rgba(255, 255, 255, 0.7)',
      border: theme === 'dark'
        ? '1px solid rgba(148, 163, 184, 0.1)'
        : '1px solid rgba(226, 232, 240, 0.3)'
    },
    medium: {
      backdropFilter: 'blur(16px) saturate(150%) contrast(110%)',
      webkitBackdropFilter: 'blur(16px) saturate(150%) contrast(110%)',
      background: theme === 'dark'
        ? 'rgba(15, 23, 42, 0.8)'
        : 'rgba(255, 255, 255, 0.8)',
      border: theme === 'dark'
        ? '1px solid rgba(148, 163, 184, 0.15)'
        : '1px solid rgba(226, 232, 240, 0.4)'
    },
    strong: {
      backdropFilter: 'blur(24px) saturate(180%) contrast(120%) brightness(110%)',
      webkitBackdropFilter: 'blur(24px) saturate(180%) contrast(120%) brightness(110%)',
      background: theme === 'dark'
        ? 'rgba(15, 23, 42, 0.85)'
        : 'rgba(255, 255, 255, 0.85)',
      border: theme === 'dark'
        ? '1px solid rgba(148, 163, 184, 0.2)'
        : '1px solid rgba(226, 232, 240, 0.5)'
    },
    ultra: {
      backdropFilter: 'blur(32px) saturate(200%) contrast(130%) brightness(115%)',
      webkitBackdropFilter: 'blur(32px) saturate(200%) contrast(130%) brightness(115%)',
      background: theme === 'dark'
        ? 'rgba(15, 23, 42, 0.9)'
        : 'rgba(255, 255, 255, 0.9)',
      border: theme === 'dark'
        ? '1px solid rgba(148, 163, 184, 0.25)'
        : '1px solid rgba(226, 232, 240, 0.6)'
    }
  };
  
  const currentBlur = blurConfig[blurIntensity];
  
  // Scroll-based transforms for enhanced interaction
  const scrollOpacity = useTransform(scrollY, [0, 100], [0.9, 1]);
  const scrollBlur = useTransform(scrollY, [0, 100], [8, 24]);
  const scrollBorderOpacity = useTransform(scrollY, [0, 100], [0.1, 0.3]);
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  const positionClasses = {
    fixed: 'fixed top-0 left-0 right-0 z-50',
    sticky: 'sticky top-0 z-40',
    inline: 'relative'
  };
  
  return (
    <motion.header
      className={`${positionClasses[variant]} ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        ease: "easeOut" as Easing,
        type: "spring",
        stiffness: 100
      }}
      style={{
        opacity: scrollEffect ? scrollOpacity : 1
      }}
    >
      {/* Main Glass Container */}
      <div
        className="relative w-full"
        style={{
          ...currentBlur,
          filter: scrollEffect 
            ? `blur(${scrollBlur}px) saturate(150%) contrast(110%)`
            : undefined,
          borderColor: showBorder ? currentBlur.border.split(' ')[2] : 'transparent'
        }}
      >
        {/* Dynamic Gradient Overlay */}
        {gradientOverlay && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-cyan-500/10 dark:from-blue-400/15 dark:via-purple-400/10 dark:to-cyan-400/15" />
        )}
        
        {/* Animated Glow Effect */}
        {showGlow && (
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{
              background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))',
              filter: 'blur(1px)'
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut" as Easing
            }}
          />
        )}
        
        {/* Content Container */}
        <div className="relative px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section - Title & Icon */}
            <div className="flex items-center space-x-3">
              {icon && (
                <motion.div
                  className="flex-shrink-0"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {icon}
                </motion.div>
              )}
              
              {(title || subtitle) && (
                <div className="min-w-0 flex-1">
                  {title && (
                    <motion.h1
                      className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.5 }}
                    >
                      {title}
                    </motion.h1>
                  )}
                  
                  {subtitle && (
                    <motion.p
                      className="text-sm text-gray-600 dark:text-gray-300 truncate"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      {subtitle}
                    </motion.p>
                  )}
                </div>
              )}
            </div>
            
            {/* Right Section - Custom Content */}
            <div className="flex-shrink-0">
              {children}
            </div>
          </div>
        </div>
        
        {/* Enhanced Border Effect */}
        {showBorder && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              border: '1px solid transparent',
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.1) 0%, 
                rgba(255, 255, 255, 0.05) 50%, 
                rgba(255, 255, 255, 0.1) 100%) border-box`,
              WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              opacity: scrollEffect ? scrollBorderOpacity : 0.3
            }}
          />
        )}
      </div>
      
      {/* Subtle bottom shadow for depth */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />
    </motion.header>
  );
}

/**
 * Pre-configured Glass Panel Header variants for common use cases
 */

// Navigation Header
export const NavigationGlassHeader = ({ children, ...props }: Partial<GlassPanelHeaderProps>) => (
  <GlassPanelHeader
    variant="sticky"
    blurIntensity="medium"
    showBorder={true}
    showGlow={false}
    gradientOverlay={true}
    scrollEffect={true}
    {...props}
  >
    {children}
  </GlassPanelHeader>
);

// Dashboard Header
export const DashboardGlassHeader = ({ children, ...props }: Partial<GlassPanelHeaderProps>) => (
  <GlassPanelHeader
    variant="inline"
    blurIntensity="strong"
    showBorder={true}
    showGlow={true}
    gradientOverlay={true}
    scrollEffect={false}
    {...props}
  >
    {children}
  </GlassPanelHeader>
);

// Modal Header
export const ModalGlassHeader = ({ children, ...props }: Partial<GlassPanelHeaderProps>) => (
  <GlassPanelHeader
    variant="inline"
    blurIntensity="ultra"
    showBorder={false}
    showGlow={false}
    gradientOverlay={false}
    scrollEffect={false}
    {...props}
  >
    {children}
  </GlassPanelHeader>
);