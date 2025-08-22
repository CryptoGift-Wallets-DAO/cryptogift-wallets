/**
 * LEARNING CONTAINER - SISTEMA DE TOGGLE MAESTRO
 * =============================================
 * 
 * Componente contenedor que maneja la transición suave entre:
 * - Learning Path: Ruta personalizada del usuario (vista actual)
 * - Curriculum Tree: Árbol completo de 21 módulos (nueva vista)
 * 
 * FUNCIONALIDAD TOGGLE:
 * - Estado inicial: Learning Path visible
 * - Click "Ver todos los módulos" → CurriculumTreeView
 * - Click "Tu Ruta de Aprendizaje" → LearningPath
 * - Transiciones animadas suaves
 * - Estado persistente en sesión
 * 
 * ARQUITECTURA DE COMPONENTES:
 * - LearningPath: Vista original con nodos personalizados
 * - CurriculumTreeView: Nueva vista con árbol completo M.R.U.L
 * - Transiciones: Framer Motion con spring physics
 * - Props unificadas: onNodeClick, userProgress, etc.
 * 
 * UX SPECIFICATIONS:
 * - Mismo espacio visual para ambas vistas
 * - Toggle button siempre visible en header
 * - Loading states durante transiciones
 * - Responsive behavior idéntico
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, BookOpen, TreePine, ArrowLeft, ArrowRight } from 'lucide-react';

// Components
import LearningPath from './LearningPath';
import CurriculumTreeView from './CurriculumTreeView';

// Types
import type { UserProgress, Module, PathNode } from '../../types/curriculum';

// Data
import { modules } from '../../data/curriculumData';

// Props interface
interface LearningContainerProps {
  userProgress?: UserProgress;
  onNodeClick?: (nodeId: string, nodeType?: string) => void;
  onQuestStart?: (questId: string) => void;
  className?: string;
}

// Animation variants
const containerVariants = {
  learningPath: {
    x: 0,
    opacity: 1
  },
  treeView: {
    x: 0,
    opacity: 1
  }
};

const viewTransition = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -20 }
};

const LearningContainer: React.FC<LearningContainerProps> = ({
  userProgress,
  onNodeClick,
  onQuestStart,
  className = ""
}) => {
  // State management
  const [currentView, setCurrentView] = useState<'learning-path' | 'curriculum-tree'>('learning-path');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Manejar toggle entre vistas
  const handleToggleView = useCallback(async () => {
    setIsTransitioning(true);
    
    // Delay para animación suave
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setCurrentView(prev => 
      prev === 'learning-path' ? 'curriculum-tree' : 'learning-path'
    );
    
    // Reset transition state
    setTimeout(() => setIsTransitioning(false), 700);
  }, []);

  // Manejar selección de nodos (unificado para ambas vistas)
  const handleNodeSelect = useCallback((nodeId: string, nodeType?: string) => {
    if (onNodeClick) {
      onNodeClick(nodeId, nodeType);
    }
    
    // Si seleccionamos un nodo específico desde tree view, podemos cambiar a learning path
    // para mostrar el contexto personalizado del usuario
    console.log(`Node selected: ${nodeId} (${nodeType})`);
  }, [onNodeClick]);

  // NODOS ESPECÍFICOS del commit 7dfa065 con información rica actual (BEST OF BOTH)
  const learningPathNodes: PathNode[] = useMemo(() => {
    return [
      {
        id: 'start',
        title: 'Inicio',
        subtitle: 'Bienvenida Cripto',
        description: 'Tu viaje cripto empieza aquí. Descubre el poder de la tecnología blockchain',
        objective: 'Comprender los fundamentos del ecosistema blockchain y estar listo para explorar',
        icon: '🚀',
        status: 'completed' as const,
        position: { x: 150, y: 80 },
        connections: ['wallet-basics'],
        estimatedTime: '2 min',
        difficulty: 'beginner' as const,
        xpTotal: 100,
        masterBadgeTitle: 'Pionero Crypto',
        masterBadgeDescription: 'Has comenzado tu aventura en el mundo cripto'
      },
      {
        id: 'wallet-basics',
        title: 'Wallet Básico',
        subtitle: 'Gestión Segura',
        description: 'Aprende a crear y gestionar tu billetera digital de forma segura',
        objective: 'Dominar la creación, backup y uso básico de wallets digitales',
        icon: '👛',
        status: 'completed' as const,
        position: { x: 350, y: 100 },
        connections: ['nft-intro', 'crypto-basics'],
        estimatedTime: '8 min',
        difficulty: 'beginner' as const,
        xpTotal: 350,
        masterBadgeTitle: 'Guardian Digital',
        masterBadgeDescription: 'Maestro en seguridad de wallets'
      },
      {
        id: 'nft-intro',
        title: 'Intro NFTs',
        subtitle: 'Arte Digital',
        description: 'Descubre qué son los NFTs y cómo revolucionan la propiedad digital',
        objective: 'Entender los NFTs, su utilidad y cómo interactuar con ellos',
        icon: '🖼️',
        status: 'in-progress' as const,
        progress: 65,
        position: { x: 550, y: 60 },
        connections: ['cryptogift-basics'],
        estimatedTime: '12 min',
        difficulty: 'beginner' as const,
        xpTotal: 480,
        masterBadgeTitle: 'Coleccionista NFT',
        masterBadgeDescription: 'Experto en tokens no fungibles'
      },
      {
        id: 'crypto-basics',
        title: 'Crypto Básico',
        subtitle: 'Fundamentos',
        description: 'Fundamentos de criptomonedas y tecnología blockchain',
        objective: 'Comprender cómo funcionan las criptomonedas y la tecnología subyacente',
        icon: '🪙',
        status: 'available' as const,
        position: { x: 550, y: 140 },
        connections: ['defi-basics'],
        estimatedTime: '15 min',
        difficulty: 'beginner' as const,
        xpTotal: 500,
        masterBadgeTitle: 'Crypto Scholar',
        masterBadgeDescription: 'Conocedor de fundamentos blockchain'
      },
      {
        id: 'cryptogift-basics',
        title: 'CryptoGift',
        subtitle: 'Regalos Cripto',
        description: 'Domina CryptoGift: envía y recibe regalos cripto de forma fácil',
        objective: 'Convertirse en experto usando la plataforma CryptoGift',
        icon: '🎁',
        status: 'available' as const,
        position: { x: 750, y: 80 },
        connections: ['sales-masterclass'],
        estimatedTime: '10 min',
        difficulty: 'intermediate' as const,
        prerequisites: ['nft-intro'],
        xpTotal: 650,
        masterBadgeTitle: 'CryptoGift Pro',
        masterBadgeDescription: 'Maestro de regalos digitales'
      },
      {
        id: 'defi-basics',
        title: 'DeFi',
        subtitle: 'Finanzas Descentralizadas',
        description: 'Finanzas descentralizadas: préstamos, yield farming y más',
        objective: 'Dominar los protocolos DeFi y estrategias de yield',
        icon: '🏦',
        status: 'locked' as const,
        position: { x: 750, y: 160 },
        connections: ['advanced'],
        estimatedTime: '25 min',
        difficulty: 'advanced' as const,
        prerequisites: ['crypto-basics'],
        xpTotal: 900,
        masterBadgeTitle: 'DeFi Master',
        masterBadgeDescription: 'Experto en finanzas descentralizadas'
      },
      {
        id: 'sales-masterclass',
        title: 'Sales Masterclass',
        subtitle: 'Monetización Pro',
        description: 'Conviértete en colaborador experto y monetiza con CryptoGift',
        objective: 'Desarrollar habilidades de venta y colaboración profesional',
        icon: '💎',
        status: 'available' as const,
        position: { x: 950, y: 100 },
        connections: ['advanced'],
        estimatedTime: '20 min',
        difficulty: 'intermediate' as const,
        prerequisites: ['cryptogift-basics'],
        xpTotal: 1200,
        masterBadgeTitle: 'Sales Champion',
        masterBadgeDescription: 'Maestro en ventas y colaboraciones'
      },
      {
        id: 'advanced',
        title: 'Experto Crypto',
        subtitle: 'Nivel Profesional',
        description: 'Contenido experto: trading avanzado, DeFi y estrategias pro',
        objective: 'Alcanzar el nivel máximo de conocimiento cripto profesional',
        icon: '🏆',
        status: 'locked' as const,
        position: { x: 1150, y: 120 },
        connections: [],
        estimatedTime: '45 min',
        difficulty: 'advanced' as const,
        prerequisites: ['sales-masterclass', 'defi-basics'],
        xpTotal: 2000,
        masterBadgeTitle: 'Crypto Master',
        masterBadgeDescription: 'Maestro absoluto del ecosistema cripto'
      }
    ];
  }, []);

  // Persistir estado en sessionStorage
  useEffect(() => {
    const savedView = sessionStorage.getItem('cg-academy-current-view');
    if (savedView && (savedView === 'learning-path' || savedView === 'curriculum-tree')) {
      setCurrentView(savedView);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('cg-academy-current-view', currentView);
  }, [currentView]);

  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden ${className}`}>
      {/* Combined View Indicator and Toggle - LEFT SIDE */}
      <div className="absolute top-4 left-4 z-50">
        <div className="flex flex-col gap-2">
          {/* Current View Indicator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className={`w-2 h-2 rounded-full ${
              currentView === 'learning-path' ? 'bg-blue-500' : 'bg-emerald-500'
            }`} />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {currentView === 'learning-path' ? 'Ruta Personalizada' : 'Árbol Curricular Interactivo'}
            </span>
          </motion.div>

          {/* Toggle Button */}
          <motion.button
            onClick={handleToggleView}
            disabled={isTransitioning}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2">
              {currentView === 'learning-path' ? (
                <>
                  <TreePine size={16} className="text-emerald-600" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    Ver todos los módulos
                  </span>
                </>
              ) : (
                <>
                  <BookOpen size={16} className="text-blue-600" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    Tu Ruta de Aprendizaje
                  </span>
              </>
              )}
            </div>
            
            {isTransitioning ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <ArrowRight 
                size={14} 
                className={`transform transition-transform duration-300 ${
                  currentView === 'curriculum-tree' ? 'rotate-180' : ''
                }`} 
              />
            )}
          </motion.button>
        </div>
      </div>

      {/* Main Content Container */}
      <motion.div 
        className="w-full h-full"
        variants={containerVariants}
        initial="learningPath"
        animate={currentView === 'learning-path' ? 'learningPath' : 'treeView'}
      >
        <AnimatePresence mode="wait">
          {currentView === 'learning-path' ? (
            <motion.div
              key="learning-path"
              variants={viewTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
              <LearningPath
                nodes={learningPathNodes}
                currentNodeId="wallet-setup"
                onNodeClick={handleNodeSelect}
                pathColor="#A855F7"
                animated={true}
                showConnections={true}
                compact={false}
              />
            </motion.div>
          ) : (
            <motion.div
              key="curriculum-tree"
              variants={viewTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
              <CurriculumTreeView
                isVisible={true}
                onToggleView={handleToggleView}
                userProgress={userProgress}
                onNodeSelect={handleNodeSelect}
                onQuestStart={onQuestStart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading overlay during transitions */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm z-30 flex items-center justify-center"
          >
            <div className="flex items-center gap-3 px-6 py-3 bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-lg">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cargando vista...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats overlay - MOVED TO BOTTOM LEFT */}
      <div className="absolute bottom-4 left-4 z-30">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-3"
        >
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600 dark:text-blue-400">21</div>
              <div>Módulos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">459</div>
              <div>Lecciones</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-orange-600 dark:text-orange-400">~147</div>
              <div>Horas</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LearningContainer;