/**
 * LightRig Component - Luxury Museum Lighting System
 * Provides ceiling LED strips, ambient lighting, and vignette effects
 */

import { memo } from 'react';

type GPUTier = 'low' | 'medium' | 'high';

interface LightRigProps {
  tier?: GPUTier;
  intensity?: number; // 0-1
}

export const LightRig = memo(({ tier = 'medium', intensity = 0.8 }: LightRigProps) => {
  // Feature flag check
  const isNeonEnabled = process.env.NEXT_PUBLIC_FEATURE_NEON_GALLERY === '1';
  if (!isNeonEnabled) return null;

  // GPU tier lighting configuration
  const config = {
    low: {
      ledStrips: 2,
      ambientLights: 1,
      vignetteOpacity: 0.3,
      bloomIntensity: 0.4
    },
    medium: {
      ledStrips: 3,
      ambientLights: 2,
      vignetteOpacity: 0.4,
      bloomIntensity: 0.6
    },
    high: {
      ledStrips: 4,
      ambientLights: 3,
      vignetteOpacity: 0.55,
      bloomIntensity: 0.8
    }
  }[tier];

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {/* CEILING LED STRIPS */}
      <div className="absolute top-0 left-0 right-0 h-32">
        {Array.from({ length: config.ledStrips }).map((_, i) => (
          <div
            key={`led-strip-${i}`}
            className="absolute top-4 w-full h-1"
            style={{
              left: `${(i + 1) * (100 / (config.ledStrips + 1))}%`,
              transform: 'translateX(-50%)',
              background: `repeating-linear-gradient(
                90deg,
                rgba(88, 196, 255, ${0.6 * intensity}) 0px,
                rgba(88, 196, 255, ${0.8 * intensity}) 4px,
                rgba(88, 196, 255, ${0.3 * intensity}) 8px,
                rgba(88, 196, 255, ${0.1 * intensity}) 12px,
                transparent 16px,
                transparent 24px
              )`,
              filter: `blur(${tier === 'high' ? '2px' : tier === 'medium' ? '1.5px' : '1px'})`
            }}
          />
        ))}
      </div>

      {/* AMBIENT LIGHT POOLS */}
      {Array.from({ length: config.ambientLights }).map((_, i) => (
        <div
          key={`ambient-${i}`}
          className="absolute mix-blend-screen"
          style={{
            top: `${20 + (i * 30)}%`,
            left: `${15 + (i * 35)}%`,
            width: '200px',
            height: '200px',
            background: `radial-gradient(
              circle at center,
              rgba(88, 196, 255, ${0.15 * intensity * config.bloomIntensity}) 0%,
              rgba(64, 224, 208, ${0.1 * intensity * config.bloomIntensity}) 30%,
              transparent 70%
            )`,
            filter: `blur(${tier === 'high' ? '20px' : tier === 'medium' ? '15px' : '10px'})`
          }}
        />
      ))}

      {/* CORNER ACCENT LIGHTS */}
      <div
        className="absolute top-4 left-4 w-24 h-24 mix-blend-screen"
        style={{
          background: `radial-gradient(
            circle at center,
            rgba(255, 255, 255, ${0.08 * intensity}) 0%,
            rgba(88, 196, 255, ${0.05 * intensity}) 40%,
            transparent 70%
          )`,
          filter: `blur(${tier === 'high' ? '12px' : '8px'})`
        }}
      />
      
      <div
        className="absolute top-4 right-4 w-24 h-24 mix-blend-screen"
        style={{
          background: `radial-gradient(
            circle at center,
            rgba(255, 255, 255, ${0.06 * intensity}) 0%,
            rgba(64, 224, 208, ${0.04 * intensity}) 40%,
            transparent 70%
          )`,
          filter: `blur(${tier === 'high' ? '12px' : '8px'})`
        }}
      />

      {/* VIGNETTE - Atmospheric Depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            120% 120% at 50% 20%, 
            transparent 0%, 
            transparent 40%, 
            rgba(0, 0, 0, ${config.vignetteOpacity * intensity}) 100%
          )`
        }}
      />

      {/* SUBTLE FLOOR LIGHTING */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-16"
        style={{
          background: `linear-gradient(
            to top,
            rgba(88, 196, 255, ${0.05 * intensity}) 0%,
            transparent 100%
          )`,
          filter: `blur(${tier === 'high' ? '8px' : '4px'})`
        }}
      />

      {/* DEPTH FOG - Atmospheric Perspective */}
      {tier !== 'low' && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              to bottom,
              rgba(10, 20, 30, ${0.02 * intensity}) 0%,
              rgba(15, 25, 35, ${0.05 * intensity}) 50%,
              rgba(5, 15, 25, ${0.08 * intensity}) 100%
            )`,
            mixBlendMode: 'multiply'
          }}
        />
      )}
    </div>
  );
});

LightRig.displayName = 'LightRig';