/**
 * COMPETITION LAUNCHER
 * Integrates the Competencias WorkflowWizard with the Modelos page
 *
 * Allows users to launch competition workflows directly from model cards
 */

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, Trophy, TrendingUp, Users, Target, BarChart3 } from 'lucide-react';
import type { Modelo } from '@/types/modelos';
import { WorkflowWizard } from '@/competencias/components';
import type { CompetitionCategory } from '@/competencias/types';

// =============================================================================
// TYPES
// =============================================================================

interface CompetitionLauncherProps {
  modelo: Modelo;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (competitionId: string) => void;
}

// Map modelo IDs to competition categories
const MODELO_TO_CATEGORY: Record<string, CompetitionCategory> = {
  'apuesta-p2p': 'challenge',
  'prediction-market': 'prediction',
  'torneo-brackets': 'tournament',
  'pool-apuestas': 'pool',
};

// Category configuration
const CATEGORY_CONFIG: Record<CompetitionCategory, {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  title: string;
  description: string;
}> = {
  prediction: {
    icon: TrendingUp,
    gradient: 'from-blue-500 to-cyan-500',
    title: 'Mercado de Predicciones',
    description: 'Crea un mercado donde los participantes apuestan sobre resultados futuros',
  },
  tournament: {
    icon: Trophy,
    gradient: 'from-amber-500 to-orange-500',
    title: 'Torneo con Brackets',
    description: 'Organiza competiciones eliminatorias con premios automaticos',
  },
  challenge: {
    icon: Target,
    gradient: 'from-red-500 to-pink-500',
    title: 'Desafio P2P',
    description: 'Crea apuestas directas entre dos participantes con arbitro',
  },
  pool: {
    icon: Users,
    gradient: 'from-purple-500 to-violet-500',
    title: 'Pool de Apuestas',
    description: 'Crea un pool donde multiples participantes comparten el premio',
  },
  milestone: {
    icon: BarChart3,
    gradient: 'from-green-500 to-emerald-500',
    title: 'Hitos y Metas',
    description: 'Sistema de metas con recompensas al alcanzar objetivos',
  },
  ranking: {
    icon: BarChart3,
    gradient: 'from-indigo-500 to-blue-500',
    title: 'Ranking Competitivo',
    description: 'Tabla de posiciones con premios por clasificacion',
  },
};

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 50,
    transition: { duration: 0.2 },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function CompetitionLauncher({
  modelo,
  isOpen,
  onClose,
  onComplete,
}: CompetitionLauncherProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [completedId, setCompletedId] = useState<string | null>(null);

  // Get competition category from modelo
  const category = MODELO_TO_CATEGORY[modelo.id] || 'challenge';
  const config = CATEGORY_CONFIG[category];
  const IconComponent = config.icon;

  // Handle workflow completion
  const handleWorkflowComplete = useCallback((data: { competitionId?: string }) => {
    if (data.competitionId) {
      setCompletedId(data.competitionId);
      onComplete?.(data.competitionId);
    }
    setShowWizard(false);
  }, [onComplete]);

  // Handle close
  const handleClose = useCallback(() => {
    setShowWizard(false);
    setCompletedId(null);
    onClose();
  }, [onClose]);

  // Handle start wizard
  const handleStartWizard = useCallback(() => {
    setShowWizard(true);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={handleClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4
                   bg-black/80 backdrop-blur-md"
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl max-h-[95vh] overflow-hidden
                     bg-gray-900/95 backdrop-blur-xl rounded-3xl
                     border border-white/10 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl
                       bg-white/10 backdrop-blur-sm border border-white/10
                       text-white/70 hover:text-white hover:bg-white/20
                       transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="relative overflow-y-auto max-h-[95vh]">
            {!showWizard ? (
              // Intro screen
              <div className="p-8">
                {/* Header with gradient */}
                <div className={`absolute top-0 left-0 right-0 h-48
                                bg-gradient-to-b ${config.gradient} opacity-20`} />

                <div className="relative">
                  {/* Icon and title */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${config.gradient}`}>
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Lanzar Competencia</p>
                      <h2 className="text-3xl font-bold text-white">{config.title}</h2>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-lg text-gray-300 mb-8 max-w-2xl">
                    {config.description}
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <FeatureCard
                      icon={<Rocket className="w-5 h-5" />}
                      title="AI-Asistido"
                      description="La IA te guia paso a paso y sugiere configuraciones optimas"
                    />
                    <FeatureCard
                      icon={<Users className="w-5 h-5" />}
                      title="Multi-firma"
                      description="Fondos custodiados en Gnosis Safe con multiples firmantes"
                    />
                    <FeatureCard
                      icon={<TrendingUp className="w-5 h-5" />}
                      title="Transparencia Total"
                      description="Cada transaccion visible y verificable en blockchain"
                    />
                    <FeatureCard
                      icon={<Trophy className="w-5 h-5" />}
                      title="Premios Automaticos"
                      description="Distribucion automatica de premios al resolver"
                    />
                  </div>

                  {/* Model info */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-8">
                    <p className="text-sm text-gray-400 mb-2">Basado en el modelo:</p>
                    <p className="text-white font-medium">{modelo.title}</p>
                    <p className="text-sm text-gray-400 mt-1">{modelo.description}</p>
                  </div>

                  {/* Completion message */}
                  {completedId && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 mb-6"
                    >
                      <p className="text-green-400 font-medium">
                        Competencia creada exitosamente!
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        ID: {completedId}
                      </p>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={handleStartWizard}
                      className={`flex items-center gap-2 px-8 py-4 rounded-xl
                                 bg-gradient-to-r ${config.gradient}
                                 text-white font-semibold text-lg
                                 hover:shadow-lg hover:shadow-white/10
                                 transition-all`}
                    >
                      <Rocket className="w-5 h-5" />
                      <span>Crear Competencia</span>
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-8 py-4 rounded-xl
                                bg-white/5 border border-white/10
                                text-white font-medium
                                hover:bg-white/10 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Workflow Wizard
              <div className="p-4">
                <WorkflowWizard
                  category={category}
                  onComplete={handleWorkflowComplete}
                  onCancel={() => setShowWizard(false)}
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// FEATURE CARD SUBCOMPONENT
// =============================================================================

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="p-2 rounded-lg bg-white/10 text-white">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-white">{title}</h4>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a modelo can launch the competition wizard
 */
export function canLaunchCompetition(modeloId: string): boolean {
  return modeloId in MODELO_TO_CATEGORY;
}

/**
 * Get the competition category for a modelo
 */
export function getCompetitionCategory(modeloId: string): CompetitionCategory | null {
  return MODELO_TO_CATEGORY[modeloId] || null;
}

export default CompetitionLauncher;
