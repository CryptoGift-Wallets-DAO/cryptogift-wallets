"use client";

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Clock, Zap, ExternalLink, Rocket } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ModelDetailModalProps, CategoryType } from '@/types/modelos';
import { CATEGORIES } from '@/types/modelos';
import StatusBadge from './StatusBadge';
import IntegrationChip from './IntegrationChip';
import ComplexityIndicator from './ComplexityIndicator';
import { CompetitionLauncher, canLaunchCompetition } from './CompetitionLauncher';

// Get icon component from string name
function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  const Icon = icons[iconName];
  return Icon || LucideIcons.Box;
}

// Category color mapping
const categoryGradients: Record<CategoryType, string> = {
  onboarding: 'from-amber-500/30 via-orange-500/20 to-transparent',
  campaigns: 'from-blue-500/30 via-cyan-500/20 to-transparent',
  competitions: 'from-red-500/30 via-pink-500/20 to-transparent',
  governance: 'from-purple-500/30 via-violet-500/20 to-transparent',
  finance: 'from-green-500/30 via-emerald-500/20 to-transparent',
  gaming: 'from-pink-500/30 via-rose-500/20 to-transparent',
  social: 'from-indigo-500/30 via-blue-500/20 to-transparent',
  enterprise: 'from-slate-500/30 via-gray-500/20 to-transparent'
};

const categoryIconColors: Record<CategoryType, string> = {
  onboarding: 'text-amber-400',
  campaigns: 'text-blue-400',
  competitions: 'text-red-400',
  governance: 'text-purple-400',
  finance: 'text-green-400',
  gaming: 'text-pink-400',
  social: 'text-indigo-400',
  enterprise: 'text-slate-400'
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 }
  }
} as const;

export function ModelDetailModal({ modelo, isOpen, onClose, locale = 'es' }: ModelDetailModalProps) {
  const t = useTranslations('modelos');
  // State for competition launcher
  const [showCompetitionLauncher, setShowCompetitionLauncher] = useState(false);

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !showCompetitionLauncher) onClose();
  }, [onClose, showCompetitionLauncher]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  // Handle launching competition workflow
  const handleLaunchCompetition = useCallback(() => {
    setShowCompetitionLauncher(true);
  }, []);

  // Handle competition launcher close
  const handleCompetitionClose = useCallback(() => {
    setShowCompetitionLauncher(false);
  }, []);

  // Handle competition completion
  const handleCompetitionComplete = useCallback((competitionId: string) => {
    console.log('Competition created:', competitionId);
    // Could show a success toast or redirect
  }, []);

  if (!modelo) return null;

  // Check if this model can launch competition workflow
  const isCompetitionModel = canLaunchCompetition(modelo.id);

  const IconComponent = getIcon(modelo.icon);
  const category = CATEGORIES.find(c => c.id === modelo.category);
  const gradientClass = categoryGradients[modelo.category];
  const iconColorClass = categoryIconColors[modelo.category];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden
                       bg-gray-900/95 backdrop-blur-xl rounded-3xl
                       border border-white/10 shadow-2xl"
          >
            {/* Gradient header background */}
            <div className={`absolute top-0 left-0 right-0 h-48 bg-gradient-to-b ${gradientClass}`} />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-xl
                         bg-white/10 backdrop-blur-sm border border-white/10
                         text-white/70 hover:text-white hover:bg-white/20
                         transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable content */}
            <div className="relative overflow-y-auto max-h-[90vh]">
              <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 ${iconColorClass}`}>
                    <IconComponent className="w-10 h-10" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm text-gray-400">
                        {locale === 'en' ? category?.labelEn : category?.label}
                      </span>
                      <StatusBadge status={modelo.status} size="sm" locale={locale} />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                      {locale === 'en' ? modelo.titleEn : modelo.title}
                    </h2>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                  {locale === 'en'
                    ? (modelo.longDescriptionEn || modelo.descriptionEn)
                    : (modelo.longDescription || modelo.description)
                  }
                </p>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-6 mb-8 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{t('modal.complexity')}</span>
                    <ComplexityIndicator complexity={modelo.complexity} size="md" />
                  </div>
                  {modelo.estimatedTime && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{modelo.estimatedTime}</span>
                    </div>
                  )}
                </div>

                {/* Flow Timeline */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    {t('modal.processFlow')}
                  </h3>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/30 via-white/10 to-transparent" />

                    {/* Steps */}
                    <div className="space-y-4">
                      {modelo.flow.map((step, index) => (
                        <motion.div
                          key={step.step}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative flex items-start gap-4 pl-10"
                        >
                          {/* Step number */}
                          <div className="absolute left-0 w-8 h-8 rounded-full
                                        bg-gradient-to-br from-white/20 to-white/5
                                        border border-white/20 flex items-center justify-center
                                        text-sm font-bold text-white">
                            {step.step}
                          </div>

                          {/* Step content */}
                          <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5">
                            <h4 className="font-semibold text-white mb-1">
                              {locale === 'en' ? (step.titleEn || step.title) : step.title}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {locale === 'en' ? (step.descriptionEn || step.description) : step.description}
                            </p>
                          </div>

                          {/* Arrow to next */}
                          {index < modelo.flow.length - 1 && (
                            <ArrowRight className="absolute -bottom-3 left-3 w-4 h-4 text-white/20" />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Integrations */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {t('modal.requiredIntegrations')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {modelo.integrations.map((integration) => (
                      <IntegrationChip key={integration} integration={integration} size="md" />
                    ))}
                  </div>
                </div>

                {/* Use Cases */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {t('modal.useCases')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(locale === 'en' ? (modelo.useCasesEn || modelo.useCases) : modelo.useCases).map((useCase, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10
                                 text-sm text-gray-300"
                      >
                        {useCase}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-6 border-t border-white/10">
                  {/* Competition models get special launcher button */}
                  {isCompetitionModel && (modelo.status === 'deployed' || modelo.status === 'ready' || modelo.status === 'building') ? (
                    <button
                      onClick={handleLaunchCompetition}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl
                               bg-gradient-to-r from-red-500 to-pink-500
                               text-white font-semibold
                               hover:shadow-lg hover:shadow-red-500/25
                               transition-all"
                    >
                      <Rocket className="w-4 h-4" />
                      <span>{t('modal.launchCompetition')}</span>
                    </button>
                  ) : modelo.status === 'deployed' ? (
                    <button
                      className="flex items-center gap-2 px-6 py-3 rounded-xl
                               bg-gradient-to-r from-amber-500 to-orange-500
                               text-white font-semibold
                               hover:shadow-lg hover:shadow-amber-500/25
                               transition-all"
                    >
                      <span>{t('modal.goToMode')}</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex items-center gap-2 px-6 py-3 rounded-xl
                               bg-white/10 text-gray-400 font-semibold
                               cursor-not-allowed"
                    >
                      <span>
                        {modelo.status === 'ready' ? t('modal.comingSoon') :
                         modelo.status === 'building' ? t('modal.inConstruction') : t('status.planned')}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl
                             bg-white/5 border border-white/10
                             text-white font-medium
                             hover:bg-white/10 transition-all"
                  >
                    {t('modal.close')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Competition Launcher Modal */}
      {isCompetitionModel && (
        <CompetitionLauncher
          modelo={modelo}
          isOpen={showCompetitionLauncher}
          onClose={handleCompetitionClose}
          onComplete={handleCompetitionComplete}
        />
      )}
    </AnimatePresence>
  );
}

export default ModelDetailModal;
