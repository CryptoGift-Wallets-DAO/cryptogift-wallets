/**
 * NeonFrame Component - Luxury Museum Artwork Frame with Bloom Effects
 * Implements premium glass/neon aesthetic with GPU tier optimization
 */

import { memo } from 'react';
import { motion } from 'framer-motion';

type GPUTier = 'low' | 'medium' | 'high';

interface NeonFrameProps {
  src: string;
  alt: string;
  neon?: string;
  tier?: GPUTier;
  size?: 'small' | 'medium' | 'large' | 'hero';
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
}

export const NeonFrame = memo(({ 
  src, 
  alt, 
  neon = '#58c4ff', 
  tier = 'medium', 
  size = 'medium',
  onClick,
  className = ''
}: NeonFrameProps) => {
  // Feature flag check
  const isNeonEnabled = process.env.NEXT_PUBLIC_FEATURE_NEON_GALLERY === '1';
  
  // Fallback to standard frame if flag is off
  if (!isNeonEnabled) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-white/10 backdrop-blur-md ${className}`}>
        <img src={src} alt={alt} className="block w-full h-auto object-cover cursor-pointer" onClick={onClick} />
      </div>
    );
  }

  // GPU tier configuration
  const config = {
    low: {
      bloom: '0 0 6px',
      extra: '0 0 22px',
      haloBlur: '14px',
      haloOpacity: 0.6,
      reflectionOpacity: 0.25,
      grainOpacity: 0.01
    },
    medium: {
      bloom: '0 0 12px',
      extra: '0 0 32px',
      haloBlur: '18px',
      haloOpacity: 0.8,
      reflectionOpacity: 0.4,
      grainOpacity: 0.02
    },
    high: {
      bloom: '0 0 18px',
      extra: '0 0 46px',
      haloBlur: '24px',
      haloOpacity: 0.9,
      reflectionOpacity: 0.6,
      grainOpacity: 0.025
    }
  }[tier];

  // Size configurations
  const sizeConfig = {
    small: { width: 'w-40', height: 'h-32', padding: 'p-[1px]' },
    medium: { width: 'w-64', height: 'h-48', padding: 'p-[1px]' },
    large: { width: 'w-80', height: 'h-64', padding: 'p-[2px]' },
    hero: { width: 'w-96', height: 'h-80', padding: 'p-[2px]' }
  }[size];

  // Animation variants (respecting project standards: stiffness 300, damping 25)
  const frameVariants = {
    hover: {
      scale: 1.02,
      rotateX: -2,
      rotateY: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    },
    tap: {
      scale: 0.98,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25, duration: 0.1 }
    }
  };

  return (
    <motion.div 
      className={`relative ${sizeConfig.padding} ${className}`}
      style={{ ['--neon' as any]: neon }}
      variants={frameVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
    >
      {/* HALO GRANDE DETRÁS - Bloom Effect */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-2xl
          before:absolute before:inset-[-12px] before:rounded-[28px]
          before:bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklab,var(--neon),white_18%)_0%,transparent_70%)]"
        style={{ 
          '--blur': config.haloBlur,
          filter: `blur(var(--blur))`,
          opacity: config.haloOpacity
        } as any}
      />

      {/* MARCO PRINCIPAL CON GLOW */}
      <div 
        className="relative overflow-hidden rounded-[18px] bg-black/40 ring-1 ring-white/20
          backdrop-blur-sm backdrop-saturate-150"
        style={{ 
          boxShadow: `
            ${config.bloom} color-mix(in_oklab,var(--neon),white_20%), 
            ${config.extra} color-mix(in_oklab,var(--neon),black_40%),
            inset 0 1px 0 rgba(255,255,255,0.1)
          `
        }}
      >
        {/* IMAGEN PRINCIPAL */}
        <div className="relative">
          <img 
            src={src} 
            alt={alt} 
            className="block w-full h-auto object-cover cursor-pointer
              saturate-[1.08] contrast-[1.05]"
            loading="lazy"
          />
          
          {/* GRAIN ANTI-BANDING */}
          <div 
            className="absolute inset-0 mix-blend-overlay pointer-events-none"
            style={{ 
              opacity: config.grainOpacity,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='%23ffffff' opacity='0.08'/%3E%3Ccircle cx='1' cy='1' r='0.3' fill='%23ffffff' opacity='0.12'/%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px'
            }}
          />
          
          {/* GLASS SURFACE EFFECTS */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Highlight streak */}
            <div className="absolute top-2 left-4 w-16 h-px bg-white/30 rounded-full blur-[0.5px]" />
            <div className="absolute top-4 right-6 w-8 h-px bg-white/20 rounded-full blur-[0.5px]" />
            {/* Corner highlights */}
            <div className="absolute top-3 left-3 w-2 h-2 bg-white/40 rounded-full blur-[1px]" />
            <div className="absolute bottom-4 right-4 w-1 h-1 bg-white/30 rounded-full blur-[0.5px]" />
          </div>
        </div>

        {/* REFLEJO EN EL SUELO */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-35%] w-[92%] 
          overflow-hidden pointer-events-none hidden md:block"
          style={{ opacity: config.reflectionOpacity }}
        >
          <img 
            src={src}
            alt=""
            aria-hidden
            className="w-full h-auto transform scale-y-[-1] blur-[1.5px]
              [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.5)_0%,transparent_65%)]"
          />
        </div>
      </div>

      {/* INNER GLOW RING */}
      <div className="absolute inset-[1px] rounded-[17px] pointer-events-none
        ring-1 ring-inset ring-white/10" />
    </motion.div>
  );
});

NeonFrame.displayName = 'NeonFrame';