"use client";

import React from 'react';
import { Star } from 'lucide-react';
import type { ComplexityIndicatorProps, Complexity } from '@/types/modelos';

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

const gapClasses = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1'
};

export function ComplexityIndicator({ complexity, size = 'md' }: ComplexityIndicatorProps) {
  const maxStars = 5;
  const iconSize = sizeClasses[size];
  const gap = gapClasses[size];

  return (
    <div className={`flex items-center ${gap}`} title={`Complejidad: ${complexity}/5`}>
      {Array.from({ length: maxStars }, (_, i) => (
        <Star
          key={i}
          className={`
            ${iconSize}
            ${i < complexity
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-600'
            }
          `}
        />
      ))}
    </div>
  );
}

export default ComplexityIndicator;
