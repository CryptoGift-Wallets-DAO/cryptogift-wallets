/**
 * CURRICULUM TREE - DISEÑO VISUAL EXCEPCIONAL V2
 * ===============================================
 * 
 * Árbol curricular con diseño futurista y disposición circular perfecta.
 * Layout: 6 módulos por fila, submódulos en círculo, lecciones simétricas.
 * 
 * MEJORAS IMPLEMENTADAS:
 * - Layout consecutivo: M0-M5 (fila 1), M6-M11 (fila 2), etc.
 * - Disposición circular: submódulos alrededor del módulo padre
 * - Lecciones en círculo simétrico: inferior primero, luego expandir
 * - Tipografía futurista legible con glass morphism
 * - Íconos silueta consistentes: ⏱️ 📅 ⭐
 * - Cards descriptivos como LearningPath que se despliegan/repliegan
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Module, Branch, Unit, Lesson } from '../../types/curriculum';
import curriculumData from '../../data/curriculumData';

interface CurriculumTreeProps {
  modules?: Module[];
  onNodeSelect?: (nodeId: string, nodeType: string) => void;
  onLessonStart?: (lessonId: string) => void;
  className?: string;
  compact?: boolean;
}

export const CurriculumTree: React.FC<CurriculumTreeProps> = ({
  modules = [],
  onNodeSelect,
  onLessonStart,
  className = '',
  compact = false
}) => {
  // ========== CONFIGURACIÓN DE LAYOUT ==========
  const MODULES_PER_ROW = 6;
  const MODULE_SIZE = compact ? 80 : 120;
  const MODULE_SPACING = { x: 180, y: 200 };
  const BRANCH_RADIUS = 140;
  const LESSON_RADIUS = 90;
  
  // ========== STATE MANAGEMENT ==========
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // ========== DATA ==========
  const curriculumModules: Module[] = useMemo(() => {
    if (modules && modules.length > 0) {
      return modules;
    }
    return curriculumData?.modules || [];
  }, [modules]);

  // ========== LAYOUT CALCULATION ==========
  const calculateModulePosition = (index: number) => {
    const row = Math.floor(index / MODULES_PER_ROW);
    const col = index % MODULES_PER_ROW;
    return {
      x: col * MODULE_SPACING.x + MODULE_SIZE,
      y: row * MODULE_SPACING.y + MODULE_SIZE
    };
  };

  const calculateBranchPositions = (modulePosition: { x: number; y: number }, branchCount: number) => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < branchCount; i++) {
      const angle = (i * 2 * Math.PI) / branchCount - Math.PI / 2; // Empezar arriba
      positions.push({
        x: modulePosition.x + Math.cos(angle) * BRANCH_RADIUS,
        y: modulePosition.y + Math.sin(angle) * BRANCH_RADIUS
      });
    }
    return positions;
  };

  const calculateLessonPositions = (branchPosition: { x: number; y: number }, lessonCount: number) => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < lessonCount; i++) {
      // Simetría: llenar inferior primero, luego expandir hacia arriba
      const angle = i < Math.ceil(lessonCount / 2) 
        ? Math.PI / 6 + (i * Math.PI) / Math.max(1, Math.ceil(lessonCount / 2) - 1) // Inferior
        : -Math.PI / 6 - ((i - Math.ceil(lessonCount / 2)) * Math.PI) / Math.max(1, Math.floor(lessonCount / 2) - 1); // Superior
      
      positions.push({
        x: branchPosition.x + Math.cos(angle) * LESSON_RADIUS,
        y: branchPosition.y + Math.sin(angle) * LESSON_RADIUS
      });
    }
    return positions;
  };

  // ========== HANDLERS ==========
  const handleNodeHover = (nodeId: string) => {
    setHoveredNodeId(nodeId);
    const newVisible = new Set(visibleCards);
    newVisible.add(nodeId);
    setVisibleCards(newVisible);
  };

  const handleNodeUnhover = (nodeId: string) => {
    setHoveredNodeId(null);
    const newVisible = new Set(visibleCards);
    newVisible.delete(nodeId);
    setVisibleCards(newVisible);
  };

  const handleModuleClick = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
    onNodeSelect?.(moduleId, 'module');
  };

  // ========== CLICK OUTSIDE TO CLOSE ==========
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      if (target.closest('[data-node]') || target.closest('[data-card]')) {
        return;
      }
      if (visibleCards.size > 0) {
        setVisibleCards(new Set());
      }
    };

    if (visibleCards.size > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [visibleCards]);

  // ========== CALCULATE SVG DIMENSIONS ==========
  const svgDimensions = useMemo(() => {
    const rowCount = Math.ceil(curriculumModules.length / MODULES_PER_ROW);
    const width = MODULES_PER_ROW * MODULE_SPACING.x + MODULE_SIZE * 2 + BRANCH_RADIUS * 2 + LESSON_RADIUS * 2;
    const height = rowCount * MODULE_SPACING.y + MODULE_SIZE * 2 + BRANCH_RADIUS * 2 + LESSON_RADIUS * 2;
    return { width, height };
  }, [curriculumModules.length]);

  // ========== RENDER MODULE NODE ==========
  const renderModuleNode = (module: Module, index: number) => {
    const position = calculateModulePosition(index);
    const isExpanded = expandedModules.has(module.id);
    const isHovered = hoveredNodeId === module.id;
    const hasCard = visibleCards.has(module.id);

    return (
      <g key={module.id}>
        {/* Conexiones a submódulos si está expandido */}
        {isExpanded && module.branches.map((branch, branchIndex) => {
          const branchPositions = calculateBranchPositions(position, module.branches.length);
          const branchPos = branchPositions[branchIndex];
          
          return (
            <motion.line
              key={`connection-${module.id}-${branch.id}`}
              x1={position.x}
              y1={position.y}
              x2={branchPos.x}
              y2={branchPos.y}
              stroke="url(#connectionGradient)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 300, damping: 25 }}
            />
          );
        })}
        
        {/* Nodo del módulo */}
        <motion.g
          data-node={module.id}
          style={{ cursor: 'pointer' }}
          onClick={() => handleModuleClick(module.id)}
          onMouseEnter={() => handleNodeHover(module.id)}
          onMouseLeave={() => handleNodeUnhover(module.id)}
          onTouchStart={() => handleNodeHover(module.id)}
          onTouchEnd={() => handleNodeUnhover(module.id)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          {/* Círculo exterior con glass morphism */}
          <motion.circle
            cx={position.x}
            cy={position.y}
            r={MODULE_SIZE / 2}
            fill="url(#moduleGradient)"
            stroke={module.color || '#8B5CF6'}
            strokeWidth="3"
            className="filter drop-shadow-lg"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 300, damping: 25 }}
          />
          
          {/* Ícono del módulo */}
          <text
            x={position.x}
            y={position.y + 8}
            textAnchor="middle"
            fontSize="24"
            className="pointer-events-none select-none"
          >
            {module.icon || '📚'}
          </text>
          
          {/* Título del módulo con tipografía futurista */}
          <text
            x={position.x}
            y={position.y + MODULE_SIZE / 2 + 20}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="currentColor"
            className="font-mono tracking-wider text-gray-900 dark:text-gray-100 pointer-events-none select-none"
          >
            {module.title}
          </text>
          
          {/* Indicador de estado */}
          <circle
            cx={position.x + MODULE_SIZE / 2 - 8}
            cy={position.y - MODULE_SIZE / 2 + 8}
            r="6"
            fill={module.status === 'completed' ? '#10B981' : module.status === 'available' ? '#F59E0B' : '#6B7280'}
            className="drop-shadow-sm"
          />
        </motion.g>

        {/* Card descriptivo con glass morphism */}
        <AnimatePresence>
          {hasCard && (
            <motion.g
              data-card={module.id}
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Fondo de la card con glass morphism */}
              <rect
                x={position.x - 120}
                y={position.y + MODULE_SIZE / 2 + 30}
                width="240"
                height="120"
                rx="16"
                fill="url(#cardGradient)"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
                className="filter backdrop-blur-xl"
                style={{ backdropFilter: 'blur(16px) saturate(150%)' }}
              />
              
              {/* Contenido de la card */}
              <text
                x={position.x}
                y={position.y + MODULE_SIZE / 2 + 55}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className="font-mono text-gray-900 dark:text-gray-100"
              >
                {module.title}
              </text>
              
              {/* Métricas con íconos silueta */}
              <g transform={`translate(${position.x - 100}, ${position.y + MODULE_SIZE / 2 + 75})`}>
                <text fontSize="14" fill="currentColor">⏱️</text>
                <text x="20" fontSize="11" fill="currentColor" className="font-mono">
                  {Math.round(module.estimatedTime / 60)}h {module.estimatedTime % 60}min
                </text>
              </g>
              
              <g transform={`translate(${position.x - 10}, ${position.y + MODULE_SIZE / 2 + 75})`}>
                <text fontSize="14" fill="currentColor">⭐</text>
                <text x="20" fontSize="11" fill="currentColor" className="font-mono">
                  {module.xpTotal} XP
                </text>
              </g>
              
              <g transform={`translate(${position.x + 70}, ${position.y + MODULE_SIZE / 2 + 75})`}>
                <text fontSize="14" fill="currentColor">📅</text>
                <text x="20" fontSize="11" fill="currentColor" className="font-mono">
                  {module.branches.length} ramas
                </text>
              </g>
              
              {/* Quest indicator */}
              {module.hasQuests && (
                <g transform={`translate(${position.x - 100}, ${position.y + MODULE_SIZE / 2 + 100})`}>
                  <text fontSize="14" fill="#F59E0B">✪</text>
                  <text x="20" fontSize="11" fill="#F59E0B" className="font-mono font-semibold">
                    {module.questsCount} quests disponibles
                  </text>
                </g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Render submódulos si está expandido */}
        {isExpanded && module.branches.map((branch, branchIndex) => {
          const branchPositions = calculateBranchPositions(position, module.branches.length);
          const branchPos = branchPositions[branchIndex];
          
          return renderBranchNode(branch, branchPos, `${module.id}-${branch.id}`);
        })}
      </g>
    );
  };

  // ========== RENDER BRANCH NODE ==========
  const renderBranchNode = (branch: Branch, position: { x: number; y: number }, key: string) => {
    const isHovered = hoveredNodeId === key;
    const hasCard = visibleCards.has(key);

    return (
      <g key={key}>
        {/* Nodo de la rama */}
        <motion.g
          data-node={key}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => handleNodeHover(key)}
          onMouseLeave={() => handleNodeUnhover(key)}
          onTouchStart={() => handleNodeHover(key)}
          onTouchEnd={() => handleNodeUnhover(key)}
          whileHover={{ scale: 1.15 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <circle
            cx={position.x}
            cy={position.y}
            r="30"
            fill="url(#branchGradient)"
            stroke={branch.color || '#06B6D4'}
            strokeWidth="2"
            className="filter drop-shadow-md"
          />
          
          <text
            x={position.x}
            y={position.y + 5}
            textAnchor="middle"
            fontSize="18"
            className="pointer-events-none select-none"
          >
            {branch.icon || '🔗'}
          </text>
        </motion.g>

        {/* Card de la rama */}
        <AnimatePresence>
          {hasCard && (
            <motion.g
              data-card={key}
              initial={{ opacity: 0, y: -15, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <rect
                x={position.x - 80}
                y={position.y + 45}
                width="160"
                height="80"
                rx="12"
                fill="url(#cardGradient)"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
                className="filter backdrop-blur-xl"
              />
              
              <text
                x={position.x}
                y={position.y + 65}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="currentColor"
                className="font-mono text-gray-900 dark:text-gray-100"
              >
                {branch.title}
              </text>
              
              <text
                x={position.x}
                y={position.y + 85}
                textAnchor="middle"
                fontSize="9"
                fill="currentColor"
                className="font-mono"
              >
                ⏱️ {branch.estimatedTime}min • ⭐ {branch.xpTotal} XP
              </text>
              
              <text
                x={position.x}
                y={position.y + 105}
                textAnchor="middle"
                fontSize="9"
                fill="currentColor"
                className="font-mono"
              >
                📅 {branch.units.length} unidades
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </g>
    );
  };

  // ========== SVG GRADIENTS ==========
  const renderGradients = () => (
    <defs>
      <linearGradient id="moduleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
        <stop offset="100%" stopColor="rgba(255, 255, 255, 0.85)" />
      </linearGradient>
      
      <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(6, 182, 212, 0.9)" />
        <stop offset="100%" stopColor="rgba(6, 182, 212, 0.7)" />
      </linearGradient>
      
      <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
        <stop offset="100%" stopColor="rgba(255, 255, 255, 0.90)" />
      </linearGradient>
      
      <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
  );

  return (
    <div className={`curriculum-tree-container ${className}`}>
      <motion.svg
        width={svgDimensions.width}
        height={svgDimensions.height}
        className="curriculum-tree-svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, type: "spring", stiffness: 300, damping: 25 }}
      >
        {renderGradients()}
        
        {curriculumModules.map((module, index) => renderModuleNode(module, index))}
      </motion.svg>
    </div>
  );
};

export default CurriculumTree;