"use client";

import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import type { ModelHeroProps, CategoryType } from '@/types/modelos';

// Get icon component from string name
function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  const Icon = icons[iconName];
  return Icon || LucideIcons.Box;
}

// Category color classes
const categoryColors: Record<CategoryType, string> = {
  onboarding: 'from-amber-500/40 to-orange-500/20 text-amber-400 border-amber-500/30',
  campaigns: 'from-blue-500/40 to-cyan-500/20 text-blue-400 border-blue-500/30',
  competitions: 'from-red-500/40 to-pink-500/20 text-red-400 border-red-500/30',
  governance: 'from-purple-500/40 to-violet-500/20 text-purple-400 border-purple-500/30',
  finance: 'from-green-500/40 to-emerald-500/20 text-green-400 border-green-500/30',
  gaming: 'from-pink-500/40 to-rose-500/20 text-pink-400 border-pink-500/30',
  social: 'from-indigo-500/40 to-blue-500/20 text-indigo-400 border-indigo-500/30',
  enterprise: 'from-slate-500/40 to-gray-500/20 text-slate-400 border-slate-500/30'
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
} as const;

const floatAnimation = {
  y: [0, -8, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
} as const;

export function ModelHero({ totalModelos, categories }: ModelHeroProps) {
  return (
    <div className="relative py-16 md:py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 text-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
              Modelos de Uso
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Explora las infinitas posibilidades de CryptoGift.{' '}
            <span className="text-white font-medium">{totalModelos} modelos</span>{' '}
            para transformar la manera en que regalas, compartes y construyes valor.
          </p>
        </motion.div>

        {/* Category icons grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-3xl mx-auto"
        >
          {categories.map((category, index) => {
            const IconComponent = getIcon(category.icon);
            const colorClass = categoryColors[category.id];

            return (
              <motion.div
                key={category.id}
                variants={itemVariants}
                animate={floatAnimation}
                style={{ animationDelay: `${index * 0.2}s` }}
                className={`
                  relative group
                  p-4 rounded-2xl
                  bg-gradient-to-br ${colorClass}
                  backdrop-blur-sm border
                  transition-all duration-300
                  hover:scale-110 hover:shadow-lg hover:shadow-current/20
                `}
              >
                <IconComponent className="w-7 h-7 md:w-8 md:h-8" />

                {/* Tooltip */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2
                              opacity-0 group-hover:opacity-100 transition-opacity
                              pointer-events-none z-10">
                  <div className="bg-gray-900/95 backdrop-blur-sm text-white text-xs
                                px-3 py-1.5 rounded-lg whitespace-nowrap
                                border border-white/10 shadow-xl">
                    {category.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-8 mt-12"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{totalModelos}</div>
            <div className="text-sm text-gray-500">Modelos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{categories.length}</div>
            <div className="text-sm text-gray-500">Categorias</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">14</div>
            <div className="text-sm text-gray-500">Desplegados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">8</div>
            <div className="text-sm text-gray-500">Listos</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ModelHero;
