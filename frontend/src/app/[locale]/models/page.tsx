"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, Trophy, Sparkles, Zap, ChevronUp } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ModelGrid,
  ModelHero,
  ModelDetailModal,
  CategoryTabs
} from '@/components/modelos';
import { CompetitionPanel } from '@/components/competitions';
import { MODELOS, searchModelos, TOTAL_MODELOS } from '@/data/modelosData';
import type { Modelo, CategoryType, ModelStatus, Complexity } from '@/types/modelos';
import { CATEGORIES } from '@/types/modelos';

export default function ModelosPage() {
  const t = useTranslations('modelos');
  const locale = useLocale();
  // State for filters
  const [activeCategory, setActiveCategory] = useState<CategoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ModelStatus | 'all'>('all');
  const [complexityFilter, setComplexityFilter] = useState<Complexity | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // State for selected model (modal)
  const [selectedModelo, setSelectedModelo] = useState<Modelo | null>(null);

  // State for competition panel
  const [isCompetitionPanelExpanded, setIsCompetitionPanelExpanded] = useState(true);

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

  // Check if we're viewing competitions category
  const isCompetitionsCategory = activeCategory === 'competitions';

  // Handle competition panel completion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCompetitionComplete = async (config: any) => {
    console.log('Competition created from modelos page:', config);
    // TODO: Call API to create competition
  };

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
          locale={locale}
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
                  placeholder={t('search.placeholder')}
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
                    locale={locale}
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
                  <span className="hidden sm:inline">{t('filters.button')}</span>
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
                    <span className="text-sm text-gray-500">{t('filters.status')}</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as ModelStatus | 'all')}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-white/20"
                    >
                      <option value="all">{t('filters.all')}</option>
                      <option value="deployed">{t('status.deployed')}</option>
                      <option value="ready">{t('status.ready')}</option>
                      <option value="building">{t('status.building')}</option>
                      <option value="planned">{t('status.planned')}</option>
                    </select>
                  </div>

                  {/* Complexity Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{t('filters.complexity')}</span>
                    <select
                      value={complexityFilter}
                      onChange={(e) => setComplexityFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as Complexity)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-white/20"
                    >
                      <option value="all">{t('filters.all')}</option>
                      <option value="1">{t('complexity.1')}</option>
                      <option value="2">{t('complexity.2')}</option>
                      <option value="3">{t('complexity.3')}</option>
                      <option value="4">{t('complexity.4')}</option>
                      <option value="5">{t('complexity.5')}</option>
                    </select>
                  </div>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-gray-400 hover:text-white
                               underline underline-offset-2 transition-colors"
                    >
                      {t('filters.clear')}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {t('search.showing')}{' '}
              <span className="text-white font-medium">{filteredModelos.length}</span>{' '}
              {t('search.of')} {TOTAL_MODELOS} {t('search.models')}
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              COMPETITION PANEL - Futuristic NFT Luxury Panel
              Only shown when "Competencias" category is selected
           ═══════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {isCompetitionsCategory && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="mb-8"
              >
                {/* Luxury Header with Toggle */}
                <div
                  onClick={() => setIsCompetitionPanelExpanded(!isCompetitionPanelExpanded)}
                  className="relative mb-4 p-4 rounded-2xl cursor-pointer group
                             bg-gradient-to-r from-red-950/40 via-pink-950/30 to-purple-950/40
                             border border-red-500/20 hover:border-red-500/40
                             backdrop-blur-xl backdrop-saturate-150
                             shadow-2xl shadow-red-900/20 hover:shadow-red-500/30
                             transition-all duration-500"
                >
                  {/* Animated glow effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-pink-500/5 to-purple-500/10 rounded-2xl blur-xl" />
                  </div>

                  {/* Sparkle decorations */}
                  <div className="absolute top-3 right-16 text-amber-400/60 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="absolute bottom-3 left-8 text-pink-400/40 animate-pulse delay-300">
                    <Sparkles className="w-3 h-3" />
                  </div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Trophy icon with glow */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-orange-500/30 rounded-xl blur-lg" />
                        <div className="relative p-3 rounded-xl
                                      bg-gradient-to-br from-amber-500/20 to-orange-600/20
                                      border border-amber-500/30">
                          <Trophy className="w-6 h-6 text-amber-400" />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-white via-red-100 to-pink-100
                                     bg-clip-text text-transparent flex items-center gap-2">
                          {t('competitionPanel.header')}
                          <Zap className="w-4 h-4 text-amber-400" />
                        </h3>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {t('competitionPanel.headerDescription')}
                        </p>
                      </div>
                    </div>

                    {/* Expand/Collapse toggle */}
                    <motion.div
                      animate={{ rotate: isCompetitionPanelExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-2 rounded-xl bg-white/5 border border-white/10
                               group-hover:bg-white/10 transition-colors"
                    >
                      <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    </motion.div>
                  </div>
                </div>

                {/* Expandable Panel Content */}
                <AnimatePresence>
                  {isCompetitionPanelExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="overflow-hidden"
                    >
                      {/* Luxury Container for CompetitionPanel */}
                      <div className="relative">
                        {/* Background effects */}
                        <div className="absolute inset-0 -z-10">
                          <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-gray-950/80 to-gray-950 rounded-3xl" />
                          <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-red-500/10 blur-3xl" />
                          <div className="absolute bottom-0 right-1/4 w-1/3 h-24 bg-pink-500/10 blur-3xl" />
                        </div>

                        {/* Panel wrapper with luxury border */}
                        <div className="relative p-6 rounded-3xl
                                      bg-gray-900/60 backdrop-blur-2xl backdrop-saturate-150
                                      border border-white/10
                                      shadow-2xl shadow-black/40
                                      ring-1 ring-inset ring-white/5">
                          {/* Corner decorations */}
                          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/30 rounded-tl-3xl" />
                          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-pink-500/30 rounded-tr-3xl" />
                          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-purple-500/30 rounded-bl-3xl" />
                          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-amber-500/30 rounded-br-3xl" />

                          {/* The actual CompetitionPanel */}
                          <CompetitionPanel
                            onComplete={handleCompetitionComplete}
                            onCancel={() => setIsCompetitionPanelExpanded(false)}
                            className="max-w-4xl mx-auto"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Divider with label */}
                <div className="relative mt-8 mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-gray-950 text-gray-500 text-sm flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-amber-400/60" />
                      {t('competitionPanel.dividerLabel')}
                      <Sparkles className="w-3 h-3 text-amber-400/60" />
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model Grid */}
          <ModelGrid
            modelos={filteredModelos}
            onSelectModelo={handleSelectModelo}
            selectedModeloId={selectedModelo?.id}
            locale={locale}
          />
        </div>
      </div>

      {/* Detail Modal */}
      <ModelDetailModal
        modelo={selectedModelo}
        isOpen={!!selectedModelo}
        onClose={handleCloseModal}
        locale={locale}
      />
    </main>
  );
}
