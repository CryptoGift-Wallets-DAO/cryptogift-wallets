"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Check, Target, Trophy, Swords,
  CircleDollarSign, Flag, BarChart3, Sparkles, Shield,
  Calendar, Users, Coins, Gavel, AlertCircle, Loader2
} from 'lucide-react';
import { getAuthHeader, isAuthValid } from '@/lib/siweClient';
import type { CompetitionCategory, Workflow } from '@/competencias/types';
import { WORKFLOW_BY_CATEGORY } from '@/competencias/workflows';

// Category configuration with descriptions
const CATEGORY_OPTIONS: Array<{
  id: CompetitionCategory;
  emoji: string;
  label: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'prediction',
    emoji: '🎯',
    label: 'Prediccion',
    description: 'Mercado de prediccion SI/NO con probabilidades dinamicas',
    gradient: 'from-blue-500 to-cyan-500',
    icon: <Target className="w-6 h-6" />
  },
  {
    id: 'tournament',
    emoji: '🏆',
    label: 'Torneo',
    description: 'Brackets eliminatorios con multiples participantes',
    gradient: 'from-amber-500 to-orange-500',
    icon: <Trophy className="w-6 h-6" />
  },
  {
    id: 'challenge',
    emoji: '⚔️',
    label: 'Desafio',
    description: 'Reto 1v1 o entre equipos con apuesta mutua',
    gradient: 'from-red-500 to-pink-500',
    icon: <Swords className="w-6 h-6" />
  },
  {
    id: 'pool',
    emoji: '🎱',
    label: 'Pool',
    description: 'Recaudacion colectiva con condiciones de liberacion',
    gradient: 'from-purple-500 to-violet-500',
    icon: <CircleDollarSign className="w-6 h-6" />
  },
  {
    id: 'milestone',
    emoji: '🎯',
    label: 'Milestone',
    description: 'Compromiso personal con apuesta de cumplimiento',
    gradient: 'from-green-500 to-emerald-500',
    icon: <Flag className="w-6 h-6" />
  },
  {
    id: 'ranking',
    emoji: '📊',
    label: 'Ranking',
    description: 'Tabla de clasificacion continua con premios periodicos',
    gradient: 'from-indigo-500 to-blue-500',
    icon: <BarChart3 className="w-6 h-6" />
  },
];

// Wizard step types
type WizardStep = 'category' | 'details' | 'timing' | 'rules' | 'judges' | 'confirm';

interface FormData {
  category: CompetitionCategory | null;
  title: string;
  description: string;
  question?: string;
  entryFee: string;
  initialProbability: number;
  startsAt: string;
  endsAt: string;
  resolutionDeadline: string;
  resolutionMethod: string;
  judges: string[];
  rules: string[];
}

export default function CreateCompetitionPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>('category');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    category: null,
    title: '',
    description: '',
    question: '',
    entryFee: '0.01',
    initialProbability: 50,
    startsAt: '',
    endsAt: '',
    resolutionDeadline: '',
    resolutionMethod: 'single_arbiter',
    judges: [''],
    rules: [''],
  });

  const steps: WizardStep[] = ['category', 'details', 'timing', 'rules', 'judges', 'confirm'];
  const currentStepIndex = steps.indexOf(currentStep);

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'category':
        return formData.category !== null;
      case 'details':
        return formData.title.length >= 5 && formData.description.length >= 10;
      case 'timing':
        return formData.endsAt !== '' && formData.resolutionDeadline !== '';
      case 'rules':
        return formData.rules.some(r => r.length > 0);
      case 'judges':
        return formData.judges.some(j => j.length > 0);
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  }, [currentStepIndex, steps]);

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  }, [currentStepIndex, steps]);

  const handleSubmit = async () => {
    if (!isAuthValid()) {
      setError('Debes conectar tu wallet primero');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const authHeader = getAuthHeader();

      // Prepare competition data
      const competitionData = {
        category: formData.category,
        title: formData.title,
        description: formData.description,
        entryFee: formData.entryFee,
        startsAt: new Date(formData.startsAt || Date.now()).getTime(),
        endsAt: new Date(formData.endsAt).getTime(),
        resolutionDeadline: new Date(formData.resolutionDeadline).getTime(),
        resolution: {
          method: formData.resolutionMethod,
          judges: formData.judges.filter(j => j.length > 0).map(address => ({
            address,
            role: 'primary' as const,
          })),
          requiredSignatures: 1,
          disputePeriod: 86400, // 24 hours
          appealAllowed: true,
        },
        rules: formData.rules.filter(r => r.length > 0),
        initialProbability: formData.initialProbability,
      };

      const response = await fetch('/api/competition/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(competitionData),
      });

      const result = await response.json();

      if (result.success && result.data?.id) {
        router.push(`/competencias/${result.data.id}`);
      } else {
        setError(result.error || 'Error al crear la competencia');
      }
    } catch (err) {
      console.error('Error creating competition:', err);
      setError('Error de conexion. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWorkflow = formData.category ? WORKFLOW_BY_CATEGORY[formData.category] : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-950 to-gray-950" />
        <motion.div
          className="absolute top-40 left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/competencias" className="inline-flex items-center gap-2 text-gray-400
                                                hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Competencias</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Crear Nueva Competencia
              </h1>
              <p className="text-gray-400">
                Configura tu competencia con custodia segura en Gnosis Safe
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="glass-crystal rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`flex items-center gap-2 ${
                    index <= currentStepIndex ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                 ${index < currentStepIndex
                                   ? 'bg-green-500 text-white'
                                   : index === currentStepIndex
                                     ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                     : 'bg-white/10 text-gray-500'
                                 }`}>
                    {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className="hidden sm:inline text-sm capitalize">{step}</span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="glass-crystal rounded-3xl p-6 lg:p-8 border border-white/10 mb-6"
          >
            {/* Category Selection */}
            {currentStep === 'category' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Selecciona el tipo de competencia
                </h2>
                <p className="text-gray-400 mb-6">
                  Cada tipo tiene sus propias reglas y mecanicas
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <motion.button
                      key={cat.id}
                      onClick={() => updateFormData({ category: cat.id })}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-5 rounded-2xl text-left transition-all
                                ${formData.category === cat.id
                                  ? 'bg-gradient-to-br ' + cat.gradient + ' text-white'
                                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          formData.category === cat.id
                            ? 'bg-white/20'
                            : 'bg-white/5'
                        }`}>
                          <span className="text-2xl">{cat.emoji}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{cat.label}</h3>
                          <p className={`text-sm ${
                            formData.category === cat.id
                              ? 'text-white/80'
                              : 'text-gray-500'
                          }`}>
                            {cat.description}
                          </p>
                        </div>
                        {formData.category === cat.id && (
                          <Check className="w-5 h-5" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {selectedWorkflow && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">
                        {selectedWorkflow.steps.length} pasos | ~{Math.round(selectedWorkflow.estimatedTotalSeconds / 60)} min
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{selectedWorkflow.aiSummary}</p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Details Step */}
            {currentStep === 'details' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Detalles de la competencia
                </h2>
                <p className="text-gray-400 mb-6">
                  Define el titulo y descripcion
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Titulo *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => updateFormData({ title: e.target.value })}
                      placeholder="Ej: Bitcoin llegara a $100k en 2026?"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                               text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50
                               focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimo 5 caracteres</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descripcion *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData({ description: e.target.value })}
                      placeholder="Describe las condiciones y como se determinara el resultado..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                               text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50
                               focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Coins className="w-4 h-4 inline mr-1" />
                      Apuesta minima (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={formData.entryFee}
                      onChange={(e) => updateFormData({ entryFee: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                               text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50
                               focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  {formData.category === 'prediction' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Probabilidad inicial: {formData.initialProbability}%
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={formData.initialProbability}
                        onChange={(e) => updateFormData({ initialProbability: parseInt(e.target.value) })}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                                 accent-blue-500"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Improbable</span>
                        <span>50/50</span>
                        <span>Muy probable</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timing Step */}
            {currentStep === 'timing' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  <Calendar className="w-5 h-5 inline mr-2" />
                  Fechas y plazos
                </h2>
                <p className="text-gray-400 mb-6">
                  Define cuando comienza, termina y se resuelve
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fecha de inicio (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startsAt}
                      onChange={(e) => updateFormData({ startsAt: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                               text-white focus:outline-none focus:border-blue-500/50
                               focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Deja vacio para iniciar inmediatamente
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cierre de apuestas *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endsAt}
                      onChange={(e) => updateFormData({ endsAt: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                               text-white focus:outline-none focus:border-blue-500/50
                               focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fecha de resolucion *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.resolutionDeadline}
                      onChange={(e) => updateFormData({ resolutionDeadline: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                               text-white focus:outline-none focus:border-blue-500/50
                               focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Cuando se conocera el resultado final
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rules Step */}
            {currentStep === 'rules' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Reglas de la competencia
                </h2>
                <p className="text-gray-400 mb-6">
                  Define las reglas claras para todos los participantes
                </p>

                <div className="space-y-3">
                  {formData.rules.map((rule, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="flex-shrink-0 w-8 h-10 flex items-center justify-center
                                     bg-white/5 rounded-lg text-gray-500 text-sm">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => {
                          const newRules = [...formData.rules];
                          newRules[index] = e.target.value;
                          updateFormData({ rules: newRules });
                        }}
                        placeholder="Escribe una regla..."
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                                 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50
                                 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                      {formData.rules.length > 1 && (
                        <button
                          onClick={() => {
                            const newRules = formData.rules.filter((_, i) => i !== index);
                            updateFormData({ rules: newRules });
                          }}
                          className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl
                                   hover:bg-red-500/20 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => updateFormData({ rules: [...formData.rules, ''] })}
                    className="w-full py-2.5 border border-dashed border-white/20 rounded-xl
                             text-gray-400 hover:border-white/40 hover:text-white transition-all"
                  >
                    + Añadir regla
                  </button>
                </div>
              </div>
            )}

            {/* Judges Step */}
            {currentStep === 'judges' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  <Gavel className="w-5 h-5 inline mr-2" />
                  Configurar Jueces
                </h2>
                <p className="text-gray-400 mb-6">
                  Los jueces determinaran el resultado de la competencia
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Metodo de resolucion
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'single_arbiter', label: 'Un arbitro', desc: 'Una persona decide' },
                      { id: 'multisig_panel', label: 'Panel de jueces', desc: 'Mayoria decide' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => updateFormData({ resolutionMethod: method.id })}
                        className={`p-4 rounded-xl text-left transition-all
                                  ${formData.resolutionMethod === method.id
                                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                  } border`}
                      >
                        <p className="font-medium">{method.label}</p>
                        <p className="text-sm opacity-70">{method.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Direcciones de jueces *
                  </label>
                  {formData.judges.map((judge, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={judge}
                        onChange={(e) => {
                          const newJudges = [...formData.judges];
                          newJudges[index] = e.target.value;
                          updateFormData({ judges: newJudges });
                        }}
                        placeholder="0x..."
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                                 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50
                                 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                      />
                      {formData.judges.length > 1 && (
                        <button
                          onClick={() => {
                            const newJudges = formData.judges.filter((_, i) => i !== index);
                            updateFormData({ judges: newJudges });
                          }}
                          className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl
                                   hover:bg-red-500/20 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.resolutionMethod === 'multisig_panel' && (
                    <button
                      onClick={() => updateFormData({ judges: [...formData.judges, ''] })}
                      className="w-full py-2.5 border border-dashed border-white/20 rounded-xl
                               text-gray-400 hover:border-white/40 hover:text-white transition-all"
                    >
                      + Añadir juez
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Confirmation Step */}
            {currentStep === 'confirm' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Confirmar creacion
                </h2>
                <p className="text-gray-400 mb-6">
                  Revisa los detalles antes de crear
                </p>

                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tipo</span>
                      <span className="text-white font-medium">
                        {CATEGORY_OPTIONS.find(c => c.id === formData.category)?.emoji}{' '}
                        {CATEGORY_OPTIONS.find(c => c.id === formData.category)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Titulo</span>
                      <span className="text-white font-medium">{formData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Apuesta minima</span>
                      <span className="text-white font-medium">{formData.entryFee} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cierre</span>
                      <span className="text-white font-medium">
                        {formData.endsAt ? new Date(formData.endsAt).toLocaleDateString('es-ES') : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Jueces</span>
                      <span className="text-white font-medium">
                        {formData.judges.filter(j => j.length > 0).length}
                      </span>
                    </div>
                  </div>

                  {/* Safe Info */}
                  <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Custodia Segura</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Se creara un Gnosis Safe para custodiar los fondos de manera segura y transparente.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
                      ${currentStepIndex === 0
                        ? 'opacity-50 cursor-not-allowed text-gray-500'
                        : 'glass-crystal text-white hover:bg-white/10'
                      }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          {currentStep === 'confirm' ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all
                        ${isSubmitting || !canProceed()
                          ? 'opacity-50 cursor-not-allowed bg-gray-600'
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25'
                        }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Crear Competencia
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
                        ${!canProceed()
                          ? 'opacity-50 cursor-not-allowed bg-gray-600 text-gray-400'
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25'
                        }`}
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </div>
    </main>
  );
}
