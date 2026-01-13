"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ModelGridProps } from '@/types/modelos';
import ModelCard from './ModelCard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

// Skeleton loader for cards
function ModelCardSkeleton() {
  return (
    <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
      <div className="p-5">
        {/* Icon skeleton */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/10" />
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-white/10" />
            ))}
          </div>
        </div>

        {/* Title skeleton */}
        <div className="h-6 w-3/4 bg-white/10 rounded mb-2" />

        {/* Divider */}
        <div className="w-12 h-0.5 bg-white/10 mb-3" />

        {/* Description skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-white/10 rounded" />
          <div className="h-4 w-2/3 bg-white/10 rounded" />
        </div>

        {/* Chips skeleton */}
        <div className="flex gap-1.5 mb-4">
          <div className="h-5 w-14 bg-white/10 rounded-md" />
          <div className="h-5 w-16 bg-white/10 rounded-md" />
          <div className="h-5 w-12 bg-white/10 rounded-md" />
        </div>

        {/* Footer skeleton */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="h-6 w-24 bg-white/10 rounded-full" />
          <div className="h-4 w-12 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ModelGrid({
  modelos,
  onSelectModelo,
  selectedModeloId,
  isLoading
}: ModelGridProps) {
  // Show skeletons while loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <ModelCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (modelos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No se encontraron modelos
        </h3>
        <p className="text-gray-400">
          Intenta ajustar los filtros o buscar otro termino
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
    >
      <AnimatePresence mode="popLayout">
        {modelos.map((modelo) => (
          <ModelCard
            key={modelo.id}
            modelo={modelo}
            onClick={onSelectModelo}
            isSelected={selectedModeloId === modelo.id}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export default ModelGrid;
