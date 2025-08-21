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
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30,
      duration: 0.6
    }
  },
  treeView: {
    x: 0,
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30,
      duration: 0.6
    }
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

  // Datos REALES del curriculum para LearningPath (INFORMACIÓN RICA)
  const learningPathNodes: PathNode[] = useMemo(() => {
    // Seleccionar los primeros módulos para el learning path personalizado
    const selectedModules = modules.slice(0, 8); // Primeros 8 módulos para la ruta
    
    return selectedModules.map((module: Module, index: number) => ({
      id: module.id,
      title: module.title,
      subtitle: module.categoryTitle || 'Módulo Core',
      description: module.description,
      objective: module.objective, // INFORMACIÓN RICA AÑADIDA
      icon: module.icon,
      status: module.status,
      difficulty: module.difficulty,
      estimatedTime: module.estimatedTime ? `${module.estimatedTime}min` : undefined,
      xpTotal: module.xpTotal, // INFORMACIÓN RICA AÑADIDA
      branches: module.branches, // INFORMACIÓN RICA AÑADIDA
      prerequisites: module.prerequisites, // INFORMACIÓN RICA AÑADIDA
      masterBadgeTitle: module.masterBadgeTitle, // INFORMACIÓN RICA AÑADIDA
      masterBadgeDescription: module.masterBadgeDescription, // INFORMACIÓN RICA AÑADIDA
      completedBranches: module.completedBranches || 0,
      progress: module.status === 'in-progress' ? Math.floor(((module.completedBranches || 0) / module.branches.length) * 100) : undefined,
      position: {
        x: 150 + (index % 4) * 200, // Distribución en grid
        y: 100 + Math.floor(index / 4) * 180
      },
      connections: index < selectedModules.length - 1 ? [selectedModules[index + 1].id] : []
    }));
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
      {/* Header Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <motion.button
          onClick={handleToggleView}
          disabled={isTransitioning}
          className="flex items-center gap-3 px-6 py-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2">
            {currentView === 'learning-path' ? (
              <>
                <TreePine size={20} className="text-emerald-600" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Ver todos los módulos
                </span>
              </>
            ) : (
              <>
                <BookOpen size={20} className="text-blue-600" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Tu Ruta de Aprendizaje
                </span>
              </>
            )}
          </div>
          
          {isTransitioning ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <ArrowRight 
              size={16} 
              className={`transform transition-transform duration-300 ${
                currentView === 'curriculum-tree' ? 'rotate-180' : ''
              }`} 
            />
          )}
        </motion.button>
      </div>

      {/* View indicator - ELEVADO POR ENCIMA DE CONTROLES */}
      <div className="absolute top-4 left-4 z-60">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className={`w-2 h-2 rounded-full ${
            currentView === 'learning-path' ? 'bg-blue-500' : 'bg-emerald-500'
          }`} />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {currentView === 'learning-path' ? 'Ruta Personalizada' : 'Curriculum Completo'}
          </span>
        </motion.div>
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

      {/* Stats overlay (común para ambas vistas) */}
      <div className="absolute bottom-4 right-4 z-30">
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