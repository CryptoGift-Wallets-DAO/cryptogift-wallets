"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  ModelGrid,
  ModelHero,
  ModelDetailModal,
  CategoryTabs
} from '@/components/modelos';
import { MODELOS, searchModelos, TOTAL_MODELOS } from '@/data/modelosData';
import type { Modelo, CategoryType, ModelStatus, Complexity } from '@/types/modelos';
import { CATEGORIES, STATUS_CONFIG } from '@/types/modelos';

export default function ModelosPage() {
  // State for filters
  const [activeCategory, setActiveCategory] = useState<CategoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ModelStatus | 'all'>('all');
  const [complexityFilter, setComplexityFilter] = useState<Complexity | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // State for selected model (modal)
  const [selectedModelo, setSelectedModelo] = useState<Modelo | null>(null);

  // Ref for scrolling to category tabs
  const categoryTabsRef = useRef<HTMLDivElement>(null);

  // Filter models based on all criteria
  const filteredModelos = useMemo(() => {
    let result = [...MODELOS];

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter(m => m.category === activeCategory);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter);
    }

    // Complexity filter
    if (complexityFilter !== 'all') {
      result = result.filter(m => m.complexity === complexityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const searchResults = searchModelos(searchQuery);
      const searchIds = new Set(searchResults.map(m => m.id));
      result = result.filter(m => searchIds.has(m.id));
    }

    return result;
  }, [activeCategory, statusFilter, complexityFilter, searchQuery]);

  // Handlers
  const handleCategoryChange = useCallback((category: CategoryType | 'all') => {
    setActiveCategory(category);
  }, []);

  // Handler for hero category icon click - scroll and select
  const handleHeroCategoryClick = useCallback((category: CategoryType) => {
    // Set the category filter
    setActiveCategory(category);

    // Smooth scroll to the category tabs section
    if (categoryTabsRef.current) {
      categoryTabsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, []);

  const handleSelectModelo = useCallback((modelo: Modelo) => {
    setSelectedModelo(modelo);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedModelo(null);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCategory('all');
    setStatusFilter('all');
    setComplexityFilter('all');
    setSearchQuery('');
  }, []);

  const hasActiveFilters = activeCategory !== 'all' || statusFilter !== 'all' ||
                           complexityFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
      </div>

      <div className="relative">
        {/* Hero Section */}
        <ModelHero
          totalModelos={TOTAL_MODELOS}
          categories={CATEGORIES}
          onCategoryClick={handleHeroCategoryClick}
        />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          {/* Search and Filters Bar */}
          <div
            ref={categoryTabsRef}
            className="sticky top-0 z-30 pt-4 pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6
                        bg-gradient-to-b from-gray-950 via-gray-950/95 to-transparent
                        backdrop-blur-xl scroll-mt-4">
            <div className="flex flex-col gap-4">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar modelos..."
                  className="w-full pl-12 pr-12 py-3 rounded-xl
                           bg-white/5 border border-white/10
                           text-white placeholder-gray-500
                           focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10
                           transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1
                             text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Tabs + Filter Toggle */}
              <div className="flex items-center gap-3">
                <div className="flex-1 overflow-hidden">
                  <CategoryTabs
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                    categories={CATEGORIES}
                  />
                </div>

                {/* Filter toggle button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl
                    font-medium text-sm whitespace-nowrap
                    transition-all duration-300 border
                    ${showFilters || hasActiveFilters
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              </div>

              {/* Advanced Filters Panel */}
              <motion.div
                initial={false}
                animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Estado:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as ModelStatus | 'all')}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-white/20"
                    >
                      <option value="all">Todos</option>
                      {Object.values(STATUS_CONFIG).map((config) => (
                        <option key={config.status} value={config.status}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Complexity Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Complejidad:</span>
                    <select
                      value={complexityFilter}
                      onChange={(e) => setComplexityFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as Complexity)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-white/20"
                    >
                      <option value="all">Todas</option>
                      <option value="1">1 - Muy facil</option>
                      <option value="2">2 - Facil</option>
                      <option value="3">3 - Intermedio</option>
                      <option value="4">4 - Avanzado</option>
                      <option value="5">5 - Experto</option>
                    </select>
                  </div>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-gray-400 hover:text-white
                               underline underline-offset-2 transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              Mostrando{' '}
              <span className="text-white font-medium">{filteredModelos.length}</span>{' '}
              de {TOTAL_MODELOS} modelos
            </p>
          </div>

          {/* Model Grid */}
          <ModelGrid
            modelos={filteredModelos}
            onSelectModelo={handleSelectModelo}
            selectedModeloId={selectedModelo?.id}
          />
        </div>
      </div>

      {/* Detail Modal */}
      <ModelDetailModal
        modelo={selectedModelo}
        isOpen={!!selectedModelo}
        onClose={handleCloseModal}
      />
    </main>
  );
}
