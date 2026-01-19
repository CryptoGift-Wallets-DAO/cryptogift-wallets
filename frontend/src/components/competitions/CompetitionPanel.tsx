"use client";

/**
 * COMPETITION PANEL - Panel Maestro Unificado
 *
 * Filosofía de diseño biopsicosocial:
 * - CONTROL: Usuario ve todas las opciones, nunca se siente perdido
 * - SIMPLICIDAD: Defaults inteligentes permiten crear con 1 click
 * - INCLUSIÓN: Opción "para compartir" por defecto fomenta colaboración
 * - TRANSPARENCIA: Todas las reglas visibles antes de confirmar
 * - FEEDBACK: Animaciones y colores comunican estado inmediatamente
 *
 * INTEGRACIÓN REAL:
 * - ThirdWeb v5 para wallet connection
 * - SIWE (Sign-In With Ethereum) para autenticación
 * - API /api/competition/create para persistencia
 * - Gnosis Safe para custodia de fondos
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Users,
  Swords,
  Target,
  Clock,
  Scale,
  Share2,
  Lock,
  Zap,
  ChevronDown,
  Check,
  Loader2,
  Sparkles,
  Calendar,
  Coins,
  Shield,
  UserPlus,
  Crown,
  Percent,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { useActiveAccount } from 'thirdweb/react';
import { CompetitionSuccess } from './CompetitionSuccess';
import {
  authenticateWithSiwe,
  makeAuthenticatedRequest,
  isAuthValid,
  getAuthState,
} from '@/lib/siweClient';
import type { CompetitionCategory, ResolutionMethod } from '@/competencias/types';

// =============================================================================
// TIPOS Y CONFIGURACIONES
// =============================================================================

type CompetitionFormat = 'adaptive' | '1v1' | 'teams' | 'freeForAll' | 'bracket' | 'league' | 'pool';
type EntryType = 'open' | 'invite' | 'fixed' | 'requirements';
type StakeType = 'equal' | 'flexible' | 'prizeOnly';
type DistributionType = 'winnerTakesAll' | 'top3' | 'proportional' | 'custom';
type ResolutionType = 'singleArbiter' | 'panel' | 'autoReport' | 'oracle' | 'voting';
type TimingType = 'fixedDate' | 'whenFull' | 'manual';
type MatchType = 'bo1' | 'bo3' | 'bo5' | 'points' | 'custom';

interface CompetitionConfig {
  // Básico
  title: string;
  description: string;

  // Formato
  format: CompetitionFormat;
  teamSize?: number;

  // Entrada
  entryType: EntryType;
  maxParticipants: number | 'unlimited';

  // Apuesta
  stakeType: StakeType;
  stakeAmount: string;
  currency: 'ETH' | 'USDC';
  distribution: DistributionType;
  customDistribution?: number[];

  // Resolución
  resolution: ResolutionType;
  arbiters: string[];
  votingThreshold?: number;

  // Timing
  timing: TimingType;
  deadline?: Date;
  duration?: number; // días

  // Partida
  matchType: MatchType;

  // Creación
  forSharing: boolean;
}

// Configuración por defecto - ADAPTATIVA (se ajusta según participantes)
const DEFAULT_CONFIG: CompetitionConfig = {
  title: '',
  description: '',
  format: 'adaptive',           // El algoritmo decide al cerrar inscripciones
  entryType: 'open',            // Cualquiera puede entrar
  maxParticipants: 'unlimited', // Sin límite - el sistema se adapta
  stakeType: 'equal',
  stakeAmount: '0.01',
  currency: 'USDC',
  distribution: 'winnerTakesAll',
  resolution: 'voting',         // Cualquiera puede ser juez, todos votan
  arbiters: [],                 // Se llenan dinámicamente
  timing: 'manual',             // Se inicia cuando participantes lo deciden
  deadline: undefined,
  matchType: 'bo1',
  forSharing: true,
};

// Configuración para "Crear Rápido" - 100% adaptativa
const QUICK_CREATE_CONFIG: CompetitionConfig = {
  ...DEFAULT_CONFIG,
  format: 'adaptive',
  maxParticipants: 'unlimited',
  resolution: 'voting',
  timing: 'manual',
  forSharing: true,
};

// Colores por formato
const FORMAT_COLORS: Record<CompetitionFormat, { bg: string; border: string; text: string; icon: string }> = {
  'adaptive': { bg: 'bg-gradient-to-r from-amber-500/10 to-purple-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '🎲' },
  '1v1': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '⚔️' },
  'teams': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: '👥' },
  'freeForAll': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: '🎯' },
  'bracket': { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '🏆' },
  'league': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '📊' },
  'pool': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: '💰' },
};

// =============================================================================
// MAPEOS PANEL → API
// =============================================================================

/**
 * Mapea el formato del panel a la categoría del API
 */
const formatToCategory: Record<CompetitionFormat, CompetitionCategory> = {
  'adaptive': 'challenge',
  '1v1': 'challenge',
  'teams': 'tournament',
  'freeForAll': 'tournament',
  'bracket': 'tournament',
  'league': 'ranking',
  'pool': 'pool',
};

/**
 * Mapea el tipo de resolución del panel al método del API
 */
const resolutionToMethod: Record<ResolutionType, ResolutionMethod> = {
  'singleArbiter': 'single_arbiter',
  'panel': 'multisig_panel',
  'autoReport': 'automatic',
  'oracle': 'oracle',
  'voting': 'community_vote',
};

// =============================================================================
// COMPONENTES DE SELECCIÓN
// =============================================================================

interface OptionChipProps {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  emoji?: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  color?: string;
}

function OptionChip({ selected, onClick, icon, emoji, label, sublabel, disabled, color }: OptionChipProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center gap-2 px-4 py-3 rounded-xl
        transition-all duration-200 text-left
        ${selected
          ? `bg-gradient-to-r ${color || 'from-amber-500/20 to-orange-500/20'}
             border-2 border-amber-500/50 shadow-lg shadow-amber-500/10`
          : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-black" />
        </motion.div>
      )}

      {emoji && <span className="text-xl">{emoji}</span>}
      {icon && <span className={selected ? 'text-amber-400' : 'text-gray-400'}>{icon}</span>}

      <div className="flex-1">
        <div className={`font-medium ${selected ? 'text-white' : 'text-gray-300'}`}>
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-gray-500">{sublabel}</div>
        )}
      </div>
    </motion.button>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  badge?: string;
}

function Section({ title, icon, children, expanded = true, onToggle, badge }: SectionProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-amber-400">{icon}</span>
          <span className="font-semibold text-white">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-0 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

interface CompetitionPanelProps {
  onComplete?: (config: CompetitionConfig) => void;
  onCancel?: () => void;
  initialConfig?: Partial<CompetitionConfig>;
  className?: string;
}

export function CompetitionPanel({
  onComplete,
  onCancel,
  initialConfig,
  className = ''
}: CompetitionPanelProps) {
  // ThirdWeb wallet connection
  const account = useActiveAccount();
  const walletAddress = account?.address;

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Competition config
  const [config, setConfig] = useState<CompetitionConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdCompetition, setCreatedCompetition] = useState<{
    id: string;
    title: string;
    safeAddress?: string;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    format: true,
    entry: true,
    stake: true,
    resolution: true,
    timing: true,
    match: true,
    sharing: true,
  });

  // Check auth state on mount and when wallet changes
  useEffect(() => {
    if (walletAddress) {
      const authState = getAuthState();
      if (authState.isAuthenticated && authState.address?.toLowerCase() === walletAddress.toLowerCase() && isAuthValid()) {
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, [walletAddress]);

  // Handle SIWE authentication
  const handleAuthenticate = async () => {
    if (!account || !walletAddress) {
      setAuthError('Conecta tu wallet primero');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      await authenticateWithSiwe(walletAddress, account);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Error de autenticación');
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Actualizar configuración
  const updateConfig = useCallback(<K extends keyof CompetitionConfig>(
    key: K,
    value: CompetitionConfig[K]
  ) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };

      // Ajustes automáticos basados en el formato
      if (key === 'format') {
        switch (value) {
          case 'adaptive':
            // Modo adaptativo: todo abierto, sistema decide al cerrar
            newConfig.maxParticipants = 'unlimited';
            newConfig.entryType = 'open';
            newConfig.resolution = 'voting';
            newConfig.timing = 'manual';
            break;
          case '1v1':
            newConfig.maxParticipants = 2;
            break;
          case 'teams':
            newConfig.maxParticipants = 4; // 2v2 por defecto
            break;
          case 'bracket':
            newConfig.maxParticipants = 8;
            break;
          case 'pool':
            newConfig.maxParticipants = 'unlimited';
            newConfig.distribution = 'proportional';
            break;
        }
      }

      return newConfig;
    });
  }, []);

  // Toggle sección
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Resumen de configuración
  const configSummary = useMemo(() => {
    const formatLabels: Record<CompetitionFormat, string> = {
      'adaptive': 'Adaptativo',
      '1v1': '1 vs 1',
      'teams': 'Equipos',
      'freeForAll': 'Todos vs Todos',
      'bracket': 'Bracket',
      'league': 'Liga',
      'pool': 'Pool',
    };

    const parts = [
      formatLabels[config.format],
      config.maxParticipants === 'unlimited' ? '∞ participantes' : `${config.maxParticipants} participantes`,
      `${config.stakeAmount} ${config.currency}`,
    ];

    return parts.join(' • ');
  }, [config]);

  // Handler para "Crear Rápido" - crea con config adaptativa inmediatamente
  const handleQuickCreate = async () => {
    setConfig(QUICK_CREATE_CONFIG);
    // Pequeño delay para que se actualice el estado, luego crear
    setTimeout(() => {
      handleCreate();
    }, 100);
  };

  // Validación: necesita wallet conectada y autenticada
  const canCreate = walletAddress && isAuthenticated;

  // Crear competencia via API real
  const handleCreate = async () => {
    if (!canCreate) {
      if (!walletAddress) {
        setCreateError('Conecta tu wallet primero');
      } else if (!isAuthenticated) {
        setCreateError('Firma con tu wallet para verificar tu identidad');
      }
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      // Mapear configuración del panel al formato del API
      const apiPayload = {
        title: config.title || `Competencia ${new Date().toLocaleDateString('es-ES')}`,
        description: config.description || undefined,
        category: formatToCategory[config.format],
        currency: config.currency,
        initialPrize: config.stakeType === 'prizeOnly' ? parseFloat(config.stakeAmount) : 0,
        entryFee: config.stakeType !== 'prizeOnly' ? parseFloat(config.stakeAmount) : 0,
        maxParticipants: config.maxParticipants === 'unlimited' ? undefined : config.maxParticipants,
        minParticipants: 2,
        resolutionMethod: resolutionToMethod[config.resolution],
        judges: config.arbiters.length > 0 ? config.arbiters : undefined,
        votingThreshold: config.votingThreshold || 66,
        startsAt: config.deadline?.toISOString(),
        endsAt: config.deadline ? new Date(config.deadline.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      };

      console.log('🚀 Creating competition with payload:', apiPayload);

      // Llamar al API real con autenticación
      const response = await makeAuthenticatedRequest('/api/competition/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear competencia');
      }

      console.log('✅ Competition created:', data);

      // Guardar datos de la competencia creada
      setCreatedCompetition({
        id: data.data.id,
        title: data.data.competition?.title || config.title,
        safeAddress: data.data.safeAddress,
      });
      setShowSuccess(true);
    } catch (error) {
      console.error('Error creating competition:', error);
      setCreateError(error instanceof Error ? error.message : 'Error al crear competencia');
    } finally {
      setIsCreating(false);
    }
  };

  // Después de ver los links, cerrar todo
  const handleSuccessClose = () => {
    setShowSuccess(false);
    setCreatedCompetition(null);
    onComplete?.(config);
  };

  // Ver la competencia creada
  const handleViewCompetition = () => {
    if (createdCompetition) {
      // Navegar a la página de la competencia
      window.open(`/competencia/${createdCompetition.id}`, '_blank');
    }
  };

  // Si mostramos éxito, mostrar solo esa pantalla
  if (showSuccess && createdCompetition) {
    return (
      <div className={className}>
        <CompetitionSuccess
          competitionId={createdCompetition.id}
          title={createdCompetition.title}
          hasArbiters={['singleArbiter', 'panel', 'voting'].includes(config.resolution)}
          config={{
            format: config.format,
            maxParticipants: config.maxParticipants,
            stakeAmount: config.stakeAmount,
            currency: config.currency,
          }}
          code={createdCompetition.id.slice(0, 8).toUpperCase()}
          onClose={handleSuccessClose}
          onViewCompetition={handleViewCompetition}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-amber-400" />
          <h2 className="text-2xl font-bold text-white">Crear Competencia</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Configura tu competencia - todos los campos tienen valores por defecto
        </p>
      </div>

      {/* Resumen visual + Botón Crear Rápido */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10
                      border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{FORMAT_COLORS[config.format].icon}</span>
          <div className="flex-1">
            <div className="font-semibold text-white">
              {config.title || 'Nueva Competencia'}
            </div>
            <div className="text-sm text-amber-400/80">{configSummary}</div>
          </div>

          {/* Botón Crear Rápido - Modo Adaptativo */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleQuickCreate}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                     bg-gradient-to-r from-green-500 to-emerald-500
                     text-white font-semibold text-sm
                     hover:shadow-lg hover:shadow-green-500/25
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Crear Rápido</span>
            <span className="sm:hidden">⚡</span>
          </motion.button>
        </div>

        {/* Explicación del modo adaptativo */}
        {config.format === 'adaptive' && (
          <div className="mt-3 pt-3 border-t border-amber-500/20">
            <p className="text-xs text-amber-200/70 flex items-start gap-2">
              <span className="text-amber-400">🎲</span>
              <span>
                <strong className="text-amber-300">Modo Adaptativo:</strong> Cualquiera puede entrar como participante o juez.
                Al dar "Empezar" el sistema determina el formato (1v1, bracket, etc.) según los participantes.
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Título y descripción */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Título de la competencia
            <span className="text-gray-500 font-normal ml-2">(opcional)</span>
          </label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => updateConfig('title', e.target.value)}
            placeholder="Se auto-genera si lo dejas vacío"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                     text-white placeholder-gray-500
                     focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20
                     transition-all outline-none"
          />
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400/60" />
            Si no pones título, se generará automáticamente con el código y fecha
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Descripción
            <span className="text-gray-500 font-normal ml-2">(opcional)</span>
          </label>
          <textarea
            value={config.description}
            onChange={(e) => updateConfig('description', e.target.value)}
            placeholder="Añade detalles, reglas específicas, etc."
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                     text-white placeholder-gray-500
                     focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20
                     transition-all outline-none resize-none"
          />
        </div>
      </div>

      {/* Sección: Formato */}
      <Section
        title="Formato"
        icon={<Swords className="w-5 h-5" />}
        expanded={expandedSections.format}
        onToggle={() => toggleSection('format')}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {/* Adaptativo - RECOMENDADO */}
          <OptionChip
            selected={config.format === 'adaptive'}
            onClick={() => updateConfig('format', 'adaptive')}
            emoji="🎲"
            label="Adaptativo"
            sublabel="Sistema decide"
            color="from-amber-500/20 to-purple-500/20"
          />
          <OptionChip
            selected={config.format === '1v1'}
            onClick={() => updateConfig('format', '1v1')}
            emoji="⚔️"
            label="1 vs 1"
            sublabel="Duelo directo"
          />
          <OptionChip
            selected={config.format === 'teams'}
            onClick={() => updateConfig('format', 'teams')}
            emoji="👥"
            label="Equipos"
            sublabel="2v2, 3v3..."
          />
          <OptionChip
            selected={config.format === 'freeForAll'}
            onClick={() => updateConfig('format', 'freeForAll')}
            emoji="🎯"
            label="Todos vs Todos"
            sublabel="Battle Royale"
          />
          <OptionChip
            selected={config.format === 'bracket'}
            onClick={() => updateConfig('format', 'bracket')}
            emoji="🏆"
            label="Bracket"
            sublabel="Eliminatorias"
          />
          <OptionChip
            selected={config.format === 'league'}
            onClick={() => updateConfig('format', 'league')}
            emoji="📊"
            label="Liga"
            sublabel="Round Robin"
          />
          <OptionChip
            selected={config.format === 'pool'}
            onClick={() => updateConfig('format', 'pool')}
            emoji="💰"
            label="Pool"
            sublabel="Quiniela"
          />
        </div>

        {config.format === 'teams' && (
          <div className="pt-3 border-t border-white/10">
            <label className="block text-sm text-gray-400 mb-2">Tamaño de equipo</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map(size => (
                <button
                  key={size}
                  onClick={() => updateConfig('teamSize', size)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all
                    ${config.teamSize === size
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                >
                  {size}v{size}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Sección: Entrada */}
      <Section
        title="Entrada"
        icon={<UserPlus className="w-5 h-5" />}
        expanded={expandedSections.entry}
        onToggle={() => toggleSection('entry')}
      >
        <div className="grid grid-cols-2 gap-2">
          <OptionChip
            selected={config.entryType === 'open'}
            onClick={() => updateConfig('entryType', 'open')}
            icon={<Users className="w-4 h-4" />}
            label="Abierta"
            sublabel="Cualquiera entra"
          />
          <OptionChip
            selected={config.entryType === 'invite'}
            onClick={() => updateConfig('entryType', 'invite')}
            icon={<Share2 className="w-4 h-4" />}
            label="Por invitación"
            sublabel="Solo con link"
          />
          <OptionChip
            selected={config.entryType === 'fixed'}
            onClick={() => updateConfig('entryType', 'fixed')}
            icon={<Lock className="w-4 h-4" />}
            label="Cupo fijo"
            sublabel="Se cierra al llenar"
          />
          <OptionChip
            selected={config.entryType === 'requirements'}
            onClick={() => updateConfig('entryType', 'requirements')}
            icon={<Shield className="w-4 h-4" />}
            label="Con requisitos"
            sublabel="Tokens, whitelist..."
          />
        </div>

        <div className="pt-3 border-t border-white/10">
          <label className="block text-sm text-gray-400 mb-2">Participantes máximos</label>
          <div className="flex flex-wrap gap-2">
            {[2, 4, 8, 16, 32, 64, 'unlimited'].map(num => (
              <button
                key={num}
                onClick={() => updateConfig('maxParticipants', num as number | 'unlimited')}
                className={`px-4 py-2 rounded-lg font-medium transition-all
                  ${config.maxParticipants === num
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              >
                {num === 'unlimited' ? '∞' : num}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Sección: Apuesta */}
      <Section
        title="Apuesta y Premio"
        icon={<Coins className="w-5 h-5" />}
        expanded={expandedSections.stake}
        onToggle={() => toggleSection('stake')}
      >
        <div className="grid grid-cols-3 gap-2">
          <OptionChip
            selected={config.stakeType === 'equal'}
            onClick={() => updateConfig('stakeType', 'equal')}
            emoji="⚖️"
            label="Igual"
            sublabel="Todos ponen lo mismo"
          />
          <OptionChip
            selected={config.stakeType === 'flexible'}
            onClick={() => updateConfig('stakeType', 'flexible')}
            emoji="📈"
            label="Flexible"
            sublabel="Cada quien decide"
          />
          <OptionChip
            selected={config.stakeType === 'prizeOnly'}
            onClick={() => updateConfig('stakeType', 'prizeOnly')}
            emoji="🎁"
            label="Solo premio"
            sublabel="Organizador pone"
          />
        </div>

        <div className="pt-3 border-t border-white/10">
          <label className="block text-sm text-gray-400 mb-2">
            {config.stakeType === 'prizeOnly' ? 'Premio total' : 'Monto por persona'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.stakeAmount}
              onChange={(e) => updateConfig('stakeAmount', e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10
                       text-white focus:border-amber-500/50 outline-none"
              placeholder="0.01"
            />
            <select
              value={config.currency}
              onChange={(e) => updateConfig('currency', e.target.value as 'ETH' | 'USDC')}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10
                       text-white focus:border-amber-500/50 outline-none"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <label className="block text-sm text-gray-400 mb-2">Distribución del premio</label>
          <div className="grid grid-cols-2 gap-2">
            <OptionChip
              selected={config.distribution === 'winnerTakesAll'}
              onClick={() => updateConfig('distribution', 'winnerTakesAll')}
              icon={<Crown className="w-4 h-4" />}
              label="Winner takes all"
              sublabel="Todo al ganador"
            />
            <OptionChip
              selected={config.distribution === 'top3'}
              onClick={() => updateConfig('distribution', 'top3')}
              icon={<Trophy className="w-4 h-4" />}
              label="Top 3"
              sublabel="60% / 30% / 10%"
            />
            <OptionChip
              selected={config.distribution === 'proportional'}
              onClick={() => updateConfig('distribution', 'proportional')}
              icon={<Percent className="w-4 h-4" />}
              label="Proporcional"
              sublabel="Según aciertos"
            />
            <OptionChip
              selected={config.distribution === 'custom'}
              onClick={() => updateConfig('distribution', 'custom')}
              icon={<Sparkles className="w-4 h-4" />}
              label="Personalizado"
              sublabel="Define tus %"
            />
          </div>
        </div>
      </Section>

      {/* Sección: Resolución */}
      <Section
        title="Resolución"
        icon={<Scale className="w-5 h-5" />}
        expanded={expandedSections.resolution}
        onToggle={() => toggleSection('resolution')}
      >
        <div className="grid grid-cols-2 gap-2">
          <OptionChip
            selected={config.resolution === 'singleArbiter'}
            onClick={() => updateConfig('resolution', 'singleArbiter')}
            emoji="👤"
            label="Árbitro único"
            sublabel="Una persona decide"
          />
          <OptionChip
            selected={config.resolution === 'panel'}
            onClick={() => updateConfig('resolution', 'panel')}
            emoji="👥"
            label="Panel"
            sublabel="Varios árbitros votan"
          />
          <OptionChip
            selected={config.resolution === 'autoReport'}
            onClick={() => updateConfig('resolution', 'autoReport')}
            emoji="✋"
            label="Auto-reporte"
            sublabel="Participantes reportan"
          />
          <OptionChip
            selected={config.resolution === 'oracle'}
            onClick={() => updateConfig('resolution', 'oracle')}
            emoji="🤖"
            label="Oráculo"
            sublabel="Dato automático"
          />
          <OptionChip
            selected={config.resolution === 'voting'}
            onClick={() => updateConfig('resolution', 'voting')}
            emoji="🗳️"
            label="Votación"
            sublabel="Todos votan"
          />
        </div>

        {(config.resolution === 'singleArbiter' || config.resolution === 'panel') && (
          <div className="pt-3 border-t border-white/10">
            <label className="block text-sm text-gray-400 mb-2">
              {config.resolution === 'singleArbiter' ? 'Árbitro' : 'Árbitros (uno por línea)'}
            </label>
            <textarea
              value={config.arbiters.join('\n')}
              onChange={(e) => updateConfig('arbiters', e.target.value.split('\n').filter(a => a.trim()))}
              placeholder="Dirección de wallet o ENS..."
              rows={config.resolution === 'panel' ? 3 : 1}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10
                       text-white placeholder-gray-500 outline-none resize-none
                       focus:border-amber-500/50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Deja vacío para asignar después o para que lo decidan los participantes
            </p>
          </div>
        )}
      </Section>

      {/* Sección: Timing */}
      <Section
        title="Timing"
        icon={<Clock className="w-5 h-5" />}
        expanded={expandedSections.timing}
        onToggle={() => toggleSection('timing')}
      >
        <div className="grid grid-cols-3 gap-2">
          <OptionChip
            selected={config.timing === 'fixedDate'}
            onClick={() => updateConfig('timing', 'fixedDate')}
            icon={<Calendar className="w-4 h-4" />}
            label="Fecha fija"
            sublabel="Cierre programado"
          />
          <OptionChip
            selected={config.timing === 'whenFull'}
            onClick={() => updateConfig('timing', 'whenFull')}
            icon={<Users className="w-4 h-4" />}
            label="Al llenar"
            sublabel="Cuando se complete"
          />
          <OptionChip
            selected={config.timing === 'manual'}
            onClick={() => updateConfig('timing', 'manual')}
            icon={<Lock className="w-4 h-4" />}
            label="Manual"
            sublabel="Organizador cierra"
          />
        </div>

        {config.timing === 'fixedDate' && (
          <div className="pt-3 border-t border-white/10">
            <label className="block text-sm text-gray-400 mb-2">Fecha de cierre</label>
            <input
              type="datetime-local"
              value={config.deadline ? new Date(config.deadline).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateConfig('deadline', new Date(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10
                       text-white outline-none focus:border-amber-500/50"
            />
          </div>
        )}
      </Section>

      {/* Sección: Tipo de partida */}
      <Section
        title="Tipo de partida"
        icon={<Target className="w-5 h-5" />}
        expanded={expandedSections.match}
        onToggle={() => toggleSection('match')}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'bo1', label: 'Best of 1', sublabel: 'Una partida' },
            { value: 'bo3', label: 'Best of 3', sublabel: 'Primero en 2' },
            { value: 'bo5', label: 'Best of 5', sublabel: 'Primero en 3' },
            { value: 'points', label: 'Puntos', sublabel: 'Acumula más' },
            { value: 'custom', label: 'Personalizado', sublabel: 'Define reglas' },
          ].map(option => (
            <OptionChip
              key={option.value}
              selected={config.matchType === option.value}
              onClick={() => updateConfig('matchType', option.value as MatchType)}
              label={option.label}
              sublabel={option.sublabel}
            />
          ))}
        </div>
      </Section>

      {/* Sección: Compartir */}
      <Section
        title="Creación"
        icon={<Share2 className="w-5 h-5" />}
        expanded={expandedSections.sharing}
        onToggle={() => toggleSection('sharing')}
        badge={config.forSharing ? 'Compartible' : 'Solo tú'}
      >
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 cursor-pointer
                          hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={config.forSharing}
              onChange={(e) => updateConfig('forSharing', e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5
                       text-amber-500 focus:ring-amber-500/50"
            />
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-green-400" />
                Para compartir
              </div>
              <div className="text-sm text-gray-400">
                Cualquiera con el link puede activar esta competencia.
                Si la activas tú, solo necesitarás hacer click en el link compartido.
              </div>
            </div>
          </label>

          {!config.forSharing && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                Solo tú podrás activar esta competencia desde tu wallet conectada.
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Estado de Wallet y Autenticación */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-gray-900 to-transparent space-y-3">
        {/* Mostrar errores */}
        {(createError || authError) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-300">{createError || authError}</span>
          </motion.div>
        )}

        {/* Paso 1: Conectar wallet */}
        {!walletAddress && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
            <Wallet className="w-8 h-8 mx-auto text-amber-400" />
            <p className="text-gray-300">Conecta tu wallet para crear competencias</p>
            <p className="text-xs text-gray-500">
              Usa el botón de wallet en la esquina superior para conectar
            </p>
          </div>
        )}

        {/* Paso 2: Autenticar con SIWE */}
        {walletAddress && !isAuthenticated && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg
              flex items-center justify-center gap-3
              transition-all duration-300
              bg-gradient-to-r from-blue-500 to-purple-500 text-white
              hover:shadow-lg hover:shadow-blue-500/25
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Firmando...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Verificar identidad</span>
              </>
            )}
          </motion.button>
        )}

        {/* Paso 3: Crear competencia */}
        {walletAddress && isAuthenticated && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={isCreating}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg
              flex items-center justify-center gap-3
              transition-all duration-300
              bg-gradient-to-r from-amber-500 to-orange-500 text-black
              hover:shadow-lg hover:shadow-amber-500/25
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creando competencia...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Crear Competencia</span>
              </>
            )}
          </motion.button>
        )}

        {/* Indicador de estado */}
        {walletAddress && (
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${walletAddress ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span>Wallet</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span>Verificado</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompetitionPanel;
