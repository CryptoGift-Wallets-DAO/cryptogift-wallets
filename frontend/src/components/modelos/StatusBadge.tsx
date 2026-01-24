"use client";

import React from 'react';
import { CheckCircle, Circle, Hammer, Clock } from 'lucide-react';
import type { ModelStatus, StatusBadgeProps } from '@/types/modelos';
import { STATUS_CONFIG } from '@/types/modelos';

const iconMap = {
  CheckCircle,
  Circle,
  Hammer,
  Clock
};

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30'
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30'
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30'
  },
  gray: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/30'
  }
};

const sizeClasses = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3'
  },
  md: {
    container: 'px-2.5 py-1 text-sm gap-1.5',
    icon: 'w-3.5 h-3.5'
  },
  lg: {
    container: 'px-3 py-1.5 text-base gap-2',
    icon: 'w-4 h-4'
  }
};

export function StatusBadge({ status, size = 'md', locale = 'es' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const colors = colorClasses[config.color];
  const sizes = sizeClasses[size];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  // Get localized label
  const label = locale === 'en' ? config.labelEn : config.label;

  return (
    <div
      className={`
        inline-flex items-center rounded-full font-medium
        border backdrop-blur-sm
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizes.container}
      `}
    >
      {IconComponent && <IconComponent className={sizes.icon} />}
      <span>{label}</span>
    </div>
  );
}

export default StatusBadge;
