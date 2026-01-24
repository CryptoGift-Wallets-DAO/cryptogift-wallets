"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Filter, ChevronDown } from 'lucide-react';
import type { CompetitionCategory, CompetitionStatus } from '../types';

interface CategoryConfig {
  emoji: string;
  label: string;
  color: string;
}

interface CompetitionFiltersProps {
  selectedCategory: CompetitionCategory | 'all';
  onCategoryChange: (category: CompetitionCategory | 'all') => void;
  selectedStatus: CompetitionStatus | 'all';
  onStatusChange: (status: CompetitionStatus | 'all') => void;
  sortBy: 'newest' | 'prize' | 'participants' | 'ending';
  onSortChange: (sort: 'newest' | 'prize' | 'participants' | 'ending') => void;
  categories: Record<CompetitionCategory, CategoryConfig>;
}

export function CompetitionFilters({
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  categories,
}: CompetitionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category Filter */}
      <div className="relative">
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as CompetitionCategory | 'all')}
          className="appearance-none pl-4 pr-10 py-2.5 bg-white/5 border border-white/10
                   rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50
                   cursor-pointer hover:bg-white/10 transition-colors"
        >
          <option value="all">Todas las categorías</option>
          {Object.entries(categories).map(([key, config]) => (
            <option key={key} value={key}>
              {config.emoji} {config.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400
                              pointer-events-none" />
      </div>

      {/* Status Filter */}
      <div className="relative">
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as CompetitionStatus | 'all')}
          className="appearance-none pl-4 pr-10 py-2.5 bg-white/5 border border-white/10
                   rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50
                   cursor-pointer hover:bg-white/10 transition-colors"
        >
          <option value="all">Todos los estados</option>
          <option value="active">🟢 En Vivo</option>
          <option value="pending">🟡 Pendiente</option>
          <option value="resolving">🔵 Resolviendo</option>
          <option value="completed">✅ Completada</option>
          <option value="disputed">🔴 Disputada</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400
                              pointer-events-none" />
      </div>

      {/* Sort By */}
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
          className="appearance-none pl-4 pr-10 py-2.5 bg-white/5 border border-white/10
                   rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50
                   cursor-pointer hover:bg-white/10 transition-colors"
        >
          <option value="newest">Más recientes</option>
          <option value="prize">Mayor premio</option>
          <option value="participants">Más participantes</option>
          <option value="ending">Terminan pronto</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400
                              pointer-events-none" />
      </div>
    </div>
  );
}
