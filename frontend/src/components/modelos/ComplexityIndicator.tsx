"use client";

import React from 'react';
import type { ComplexityIndicatorProps } from '@/types/modelos';

/**
 * ComplexityIndicator - Visual representation of complexity level
 * Uses horizontal bars (like signal strength) instead of stars
 * Bars are more intuitive for "difficulty/complexity" vs stars for "rating/recognition"
 */

const sizeConfig = {
  sm: { barWidth: 'w-1.5', barHeights: ['h-2', 'h-3', 'h-4', 'h-5', 'h-6'], gap: 'gap-0.5' },
  md: { barWidth: 'w-2', barHeights: ['h-2.5', 'h-4', 'h-5.5', 'h-7', 'h-8'], gap: 'gap-0.5' },
  lg: { barWidth: 'w-2.5', barHeights: ['h-3', 'h-5', 'h-7', 'h-9', 'h-11'], gap: 'gap-1' }
};

const complexityLabels: Record<number, string> = {
  1: 'Muy facil',
  2: 'Facil',
  3: 'Intermedio',
  4: 'Avanzado',
  5: 'Experto'
};

const complexityColors: Record<number, { active: string; inactive: string }> = {
  1: { active: 'bg-green-400', inactive: 'bg-green-400/20' },
  2: { active: 'bg-lime-400', inactive: 'bg-lime-400/20' },
  3: { active: 'bg-amber-400', inactive: 'bg-amber-400/20' },
  4: { active: 'bg-orange-400', inactive: 'bg-orange-400/20' },
  5: { active: 'bg-red-400', inactive: 'bg-red-400/20' }
};

export function ComplexityIndicator({ complexity, size = 'md' }: ComplexityIndicatorProps) {
  const maxBars = 5;
  const config = sizeConfig[size];
  const colors = complexityColors[complexity];
  const label = complexityLabels[complexity];

  return (
    <div
      className={`flex items-end ${config.gap}`}
      title={`Complejidad: ${label} (${complexity}/5)`}
      aria-label={`Complejidad nivel ${complexity} de 5: ${label}`}
    >
      {Array.from({ length: maxBars }, (_, i) => {
        const isActive = i < complexity;
        const barHeight = config.barHeights[i];

        return (
          <div
            key={i}
            className={`
              ${config.barWidth} ${barHeight}
              rounded-sm
              transition-colors duration-200
              ${isActive ? colors.active : colors.inactive}
            `}
          />
        );
      })}
    </div>
  );
}

export default ComplexityIndicator;
