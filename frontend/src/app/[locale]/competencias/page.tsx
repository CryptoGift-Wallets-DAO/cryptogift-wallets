"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Plus, Search, Zap, Flame, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { CompetitionHero } from '@/competencias/components/CompetitionHero';
import { CompetitionCard } from '@/competencias/components/CompetitionCard';
import { CompetitionFilters } from '@/competencias/components/CompetitionFilters';
import { useCompetitions } from '@/competencias/hooks/useCompetitions';
import type { Competition, CompetitionCategory, CompetitionStatus } from '@/competencias/types';

// Category configuration for filters
const CATEGORY_CONFIG: Record<CompetitionCategory, { emoji: string; label: string; color: string }> = {
  prediction: { emoji: '🎯', label: 'Predicciones', color: 'blue' },
  tournament: { emoji: '🏆', label: 'Torneos', color: 'amber' },
  challenge: { emoji: '⚔️', label: 'Desafíos', color: 'red' },
  pool: { emoji: '🎱', label: 'Pools', color: 'purple' },
  milestone: { emoji: '🎯', label: 'Milestones', color: 'green' },
  ranking: { emoji: '📊', label: 'Rankings', color: 'cyan' },
};

export default function CompetenciasPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CompetitionCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<CompetitionStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'prize' | 'participants' | 'ending'>('newest');

  const { competitions, isLoading, stats } = useCompetitions();

  // Filter and sort competitions
  const filteredCompetitions = useMemo(() => {
    let result = [...(competitions || [])];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(c => c.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter(c => c.status === selectedStatus);
    }

    // Sort
    switch (sortBy) {
      case 'prize':
        result.sort((a, b) => {
          const prizeA = typeof a.prizePool === 'string' ? parseFloat(a.prizePool) : a.prizePool.total;
          const prizeB = typeof b.prizePool === 'string' ? parseFloat(b.prizePool) : b.prizePool.total;
          return prizeB - prizeA;
        });
        break;
      case 'participants':
        result.sort((a, b) => {
          const countA = Array.isArray(a.participants) ? a.participants.length : a.participants.current;
          const countB = Array.isArray(b.participants) ? b.participants.length : b.participants.current;
          return countB - countA;
        });
        break;
      case 'ending':
        result.sort((a, b) => a.endsAt - b.endsAt);
        break;
      default:
        result.sort((a, b) => b.createdAt - a.createdAt);
    }

    return result;
  }, [competitions, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Separate active and featured competitions
  const activeCompetitions = filteredCompetitions.filter(c => c.status === 'active');
  const featuredCompetitions = activeCompetitions.slice(0, 3);
  const otherCompetitions = filteredCompetitions.filter(c => !featuredCompetitions.includes(c));

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

        {/* Floating orbs */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <CompetitionHero stats={stats} />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 -mt-10">
          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="sticky top-4 z-30 mb-8"
          >
            <div className="glass-crystal rounded-2xl p-4 border border-white/10">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar competencias..."
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50
                             focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                {/* Filters */}
                <CompetitionFilters
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  categories={CATEGORY_CONFIG}
                />
              </div>
            </div>
          </motion.div>

          {/* Create Competition CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Link href="/competencias/crear">
              <div className="glass-crystal rounded-2xl p-6 border border-white/10
                            hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10
                            transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl
                                  group-hover:scale-110 transition-transform duration-300">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                        Crear Nueva Competencia
                      </h3>
                      <p className="text-sm text-gray-400">
                        Predicciones, torneos, desafíos y más con custodia segura
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400
                                        group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Featured Competitions */}
          {featuredCompetitions.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white">En Vivo Ahora</h2>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full
                               animate-pulse">
                  {activeCompetitions.length} activas
                </span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredCompetitions.map((competition, index) => (
                  <motion.div
                    key={competition.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <CompetitionCard
                      competition={competition}
                      onClick={() => window.location.href = `/competencias/${competition.id}`}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* All Competitions */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Todas las Competencias</h2>
              </div>
              <span className="text-sm text-gray-400">
                {filteredCompetitions.length} resultados
              </span>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="glass-crystal rounded-2xl p-6 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-4" />
                    <div className="h-3 bg-white/10 rounded w-1/2 mb-6" />
                    <div className="h-20 bg-white/10 rounded mb-4" />
                    <div className="h-8 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredCompetitions.length === 0 ? (
              <div className="glass-crystal rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No hay competencias</h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery ? 'No se encontraron resultados para tu búsqueda' : 'Sé el primero en crear una competencia'}
                </p>
                <Link href="/competencias/crear">
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600
                                   text-white font-semibold rounded-xl hover:shadow-lg
                                   hover:shadow-blue-500/25 transition-all">
                    Crear Competencia
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {otherCompetitions.map((competition, index) => (
                    <motion.div
                      key={competition.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <CompetitionCard
                        competition={competition}
                        onClick={() => window.location.href = `/competencias/${competition.id}`}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </main>
  );
}
