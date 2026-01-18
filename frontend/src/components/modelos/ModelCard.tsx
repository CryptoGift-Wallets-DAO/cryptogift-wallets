"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { ModelCardProps, CategoryType } from '@/types/modelos';
import { CATEGORIES } from '@/types/modelos';
import StatusBadge from './StatusBadge';
import IntegrationChip from './IntegrationChip';
import ComplexityIndicator from './ComplexityIndicator';

// Get icon component from string name
function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  const Icon = icons[iconName];
  return Icon || LucideIcons.Box;
}

// Get category gradient colors
function getCategoryGradient(category: CategoryType): string {
  const categoryConfig = CATEGORIES.find(c => c.id === category);
  if (!categoryConfig) return 'from-gray-500/20 to-gray-600/10';

  return `from-${categoryConfig.colorFrom}/20 via-${categoryConfig.colorTo}/10 to-transparent`;
}

// Category color mapping for the icon background
const categoryIconColors: Record<CategoryType, string> = {
  onboarding: 'from-amber-500/30 to-orange-500/20 text-amber-400',
  campaigns: 'from-blue-500/30 to-cyan-500/20 text-blue-400',
  competitions: 'from-red-500/30 to-pink-500/20 text-red-400',
  governance: 'from-purple-500/30 to-violet-500/20 text-purple-400',
  finance: 'from-green-500/30 to-emerald-500/20 text-green-400',
  gaming: 'from-pink-500/30 to-rose-500/20 text-pink-400',
  social: 'from-indigo-500/30 to-blue-500/20 text-indigo-400',
  enterprise: 'from-slate-500/30 to-gray-500/20 text-slate-400'
};

export function ModelCard({ modelo, onClick, isSelected }: ModelCardProps) {
  const IconComponent = getIcon(modelo.icon);
  const iconColorClass = categoryIconColors[modelo.category];

  return (
    <motion.div
      layoutId={modelo.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={() => onClick(modelo)}
      className={`
        relative group cursor-pointer
        bg-white/5 dark:bg-gray-900/60
        backdrop-blur-2xl backdrop-saturate-150
        border rounded-2xl overflow-hidden
        shadow-xl shadow-black/20
        ring-1 ring-inset ring-white/5
        transition-all duration-300
        ${isSelected
          ? 'border-white/30 ring-2 ring-white/20 shadow-2xl'
          : 'border-white/10 hover:border-white/20 hover:shadow-2xl hover:ring-white/10'
        }
      `}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(modelo.category)} opacity-50`} />

      {/* Content */}
      <div className="relative p-5">
        {/* Header: Icon + Complexity */}
        <div className="flex items-start justify-between mb-4">
          <div className={`
            p-3 rounded-xl bg-gradient-to-br ${iconColorClass}
            backdrop-blur-sm border border-white/10
          `}>
            <IconComponent className="w-6 h-6" />
          </div>
          <ComplexityIndicator complexity={modelo.complexity} size="sm" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
          {modelo.title}
        </h3>

        {/* Divider */}
        <div className="w-12 h-0.5 bg-gradient-to-r from-white/30 to-transparent mb-3" />

        {/* Description */}
        <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[2.5rem]">
          {modelo.description}
        </p>

        {/* Integrations */}
        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[24px]">
          {modelo.integrations.slice(0, 3).map((integration) => (
            <IntegrationChip key={integration} integration={integration} size="sm" />
          ))}
          {modelo.integrations.length > 3 && (
            <span className="text-xs text-gray-500 px-1.5 py-0.5">
              +{modelo.integrations.length - 3}
            </span>
          )}
        </div>

        {/* Footer: Status + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <StatusBadge status={modelo.status} size="sm" />

          <motion.div
            className="flex items-center gap-1 text-sm text-white/70 group-hover:text-white transition-colors"
            whileHover={{ x: 4 }}
          >
            <span>Ver</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent" />
      </div>
    </motion.div>
  );
}

export default ModelCard;
