'use client';
import React from 'react';
import { motion, HTMLMotionProps, Easing } from 'framer-motion';
import { useTheme } from 'next-themes';

interface AdaptivePanelProps extends Omit<HTMLMotionProps<"div">, 'style'> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'gradient' | 'luxury' | 'minimal' | 'elevated';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  blur?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'luxury';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  glow?: boolean;
  animation?: 'none' | 'fade' | 'slide' | 'scale' | 'luxury';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * AdaptivePanel - Unified theming system for consistent UI
 * 
 * Features:
 * - Multiple visual variants (glass, solid, gradient, luxury)
 * - Responsive sizing system
 * - Advanced blur and shadow effects
 * - Theme-aware styling (dark/light mode)
 * - Built-in animations with Framer Motion
 * - Luxury glow effects for premium feel
 * - Customizable borders and corner radius
 */
export function AdaptivePanel({
  children,
  variant = 'glass',
  size = 'md',
  blur = 'md',
  border = true,
  shadow = 'md',
  rounded = 'lg',
  glow = false,
  animation = 'fade',
  className = '',
  style = {},
  ...motionProps
}: AdaptivePanelProps) {
  const { theme } = useTheme();
  
  // Size configurations
  const sizeClasses = {
    sm: 'p-3 gap-2',
    md: 'p-4 gap-3',
    lg: 'p-6 gap-4',
    xl: 'p-8 gap-6',
    full: 'p-4 w-full h-full'
  };
  
  // Blur configurations
  const blurClasses = {
    none: '',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };
  
  // Shadow configurations
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    luxury: 'shadow-2xl shadow-blue-500/10 dark:shadow-purple-500/10'
  };
  
  // Rounded corner configurations
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full'
  };
  
  // Variant-specific styling
  const getVariantClasses = () => {
    switch (variant) {
      case 'glass':
        return `
          ${blurClasses[blur]}
          bg-white/60 dark:bg-slate-900/60
          ${border ? 'border border-white/20 dark:border-slate-700/30' : ''}
        `;
      
      case 'solid':
        return `
          bg-white dark:bg-slate-900
          ${border ? 'border border-slate-200 dark:border-slate-700' : ''}
        `;
      
      case 'gradient':
        return `
          bg-gradient-to-br from-white via-blue-50 to-purple-50
          dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
          ${border ? 'border border-slate-200/50 dark:border-slate-700/50' : ''}
        `;
      
      case 'luxury':
        return `
          ${blurClasses[blur]} 
          bg-gradient-to-br from-white/80 via-blue-50/60 to-purple-50/60
          dark:from-slate-900/80 dark:via-blue-950/60 dark:to-purple-950/60
          ${border ? 'border border-gradient-to-r from-blue-200/50 via-purple-200/50 to-blue-200/50 dark:from-blue-800/50 dark:via-purple-800/50 dark:to-blue-800/50' : ''}
          relative overflow-hidden
        `;
      
      case 'elevated':
        return `
          bg-white dark:bg-slate-800
          ${border ? 'border border-slate-100 dark:border-slate-700' : ''}
          transform-gpu
        `;
      
      case 'minimal':
      default:
        return `
          bg-transparent
          ${border ? 'border border-slate-200/30 dark:border-slate-700/30' : ''}
        `;
    }
  };
  
  // Animation configurations
  const getAnimationProps = () => {
    switch (animation) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3 }
        };
      
      case 'slide':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, ease: "easeOut" as Easing }
        };
      
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.3, ease: "easeOut" as Easing }
        };
      
      case 'luxury':
        return {
          initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
          animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
          transition: { duration: 0.6, ease: "easeOut" as Easing },
          whileHover: { scale: 1.02, transition: { duration: 0.2 } }
        };
      
      case 'none':
      default:
        return {};
    }
  };
  
  // Combined classes
  const combinedClasses = `
    ${sizeClasses[size]}
    ${getVariantClasses()}
    ${shadowClasses[shadow]}
    ${roundedClasses[rounded]}
    ${glow ? 'relative' : ''}
    transition-all duration-300
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  const animationProps = getAnimationProps();
  
  return (
    <motion.div
      className={combinedClasses}
      style={style}
      {...animationProps}
      {...motionProps}
    >
      {/* Luxury glow effect */}
      {glow && (
        <>
          <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-30 blur-sm -z-10" />
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 opacity-20 blur-md -z-20" />
        </>
      )}
      
      {/* Luxury variant special effects */}
      {variant === 'luxury' && (
        <>
          {/* Shimmer effect */}
          <div className="absolute inset-0 -z-10">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5"
              animate={{
                x: ['-100%', '100%'],
                transition: {
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: "linear" as Easing
                }
              }}
            />
          </div>
          
          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-blue-400/20 dark:bg-purple-400/20 rounded-full"
                style={{
                  left: `${20 + (i * 15)}%`,
                  top: `${30 + (i * 10)}%`,
                }}
                animate={{
                  y: [-5, 5, -5],
                  opacity: [0.2, 0.6, 0.2],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 2 + (i * 0.3),
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut" as Easing
                }}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * Pre-configured panel variants for common use cases
 */
export const GlassPanel = ({ children, ...props }: Partial<AdaptivePanelProps> & { children: React.ReactNode }) => (
  <AdaptivePanel variant="glass" blur="md" shadow="lg" {...props}>
    {children}
  </AdaptivePanel>
);

export const LuxuryPanel = ({ children, ...props }: Partial<AdaptivePanelProps> & { children: React.ReactNode }) => (
  <AdaptivePanel variant="luxury" glow shadow="luxury" animation="luxury" {...props}>
    {children}
  </AdaptivePanel>
);

export const MinimalPanel = ({ children, ...props }: Partial<AdaptivePanelProps> & { children: React.ReactNode }) => (
  <AdaptivePanel variant="minimal" shadow="sm" animation="fade" {...props}>
    {children}
  </AdaptivePanel>
);

export const SolidPanel = ({ children, ...props }: Partial<AdaptivePanelProps> & { children: React.ReactNode }) => (
  <AdaptivePanel variant="solid" shadow="md" {...props}>
    {children}
  </AdaptivePanel>
);