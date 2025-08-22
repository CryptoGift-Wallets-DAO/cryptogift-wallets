/**
 * CURRICULUM TREE COMPONENT - OBRA MAESTRA VISUAL INTERACTIVA
 * ===========================================================
 * 
 * Visualización completa del árbol curricular CG Academy con 21 módulos.
 * Sistema de navegación que reemplaza "Ver todos los módulos" con experiencia inmersiva.
 * 
 * ARQUITECTURA VISUAL:
 * - Tree Layout: Módulos → Ramas → Unidades → Lecciones
 * - Branch Illumination: Ramas completas se iluminan al seleccionar
 * - Hover Cards: Information cards con glass morphism
 * - Quest Integration: Badges y XP visible por módulo
 * - Mobile Responsive: Touch events y responsive layout
 * 
 * SEGUIMIENTO DE ESTÁNDARES UX:
 * - Spring physics animations (stiffness: 300, damping: 25)
 * - Hover/Touch system identical behavior
 * - Click outside to close cards
 * - Glass morphism effects
 * - No ugly close buttons
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion';
import { SmartIcon } from '../ui/SmartIcon';

// Types
import type { 
  Module, 
  Branch, 
  Unit, 
  Lesson, 
  TreeNode, 
  TreeVisualizationConfig,
  ModuleStatus,
  UserProgress 
} from '../../types/curriculum';

// Import actual curriculum data
import { allModules } from '../../data/curriculumData';

interface CurriculumTreeProps {
  modules?: Module[];
  userProgress?: UserProgress;
  onNodeSelect?: (nodeId: string, nodeType: string) => void;
  onLessonStart?: (lessonId: string) => void;
  onQuestStart?: (questId: string) => void;
  className?: string;
  compact?: boolean;
}

export const CurriculumTree: React.FC<CurriculumTreeProps> = ({
  modules = [],
  userProgress,
  onNodeSelect,
  onLessonStart,
  onQuestStart,
  className = '',
  compact = false
}) => {
  // ========== STATE MANAGEMENT ==========
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [highlightedBranch, setHighlightedBranch] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const controls = useAnimation();
  const isInView = useInView(svgRef);

  // ========== LAYOUT CONFIGURATION ==========
  const MODULES_PER_ROW = 6;
  const MODULE_SIZE = compact ? 80 : 100;
  const MODULE_SPACING = { x: 160, y: 180 };
  const BRANCH_RADIUS = 110; // 96 + 15% = 110px (ideal final spacing)
  const UNIT_RADIUS = 69;   // 60 + 15% = 69px (ideal final spacing)
  const LESSON_RADIUS = 48; // 42 + 15% = 48px (ideal final spacing)

  // ========== CIRCULAR POSITIONING FUNCTIONS ==========
  const calculateCircularPosition = (
    centerX: number, 
    centerY: number, 
    radius: number, 
    index: number, 
    totalCount: number
  ) => {
    // Only use bottom semicircle (π/4 to 3π/4) - everything below
    const startAngle = Math.PI / 4; // Bottom-left
    const endAngle = (3 * Math.PI) / 4; // Bottom-right
    const angleRange = endAngle - startAngle;
    const angleSpacing = totalCount > 1 ? angleRange / (totalCount - 1) : 0;
    const angle = startAngle + (index * angleSpacing);
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  const calculateBranchPosition = (module: Module, branchIndex: number) => {
    const modulePos = module.position || { x: 0, y: 0 };
    const totalBranches = module.branches.length;
    
    return calculateCircularPosition(
      modulePos.x, 
      modulePos.y, 
      BRANCH_RADIUS, 
      branchIndex, 
      totalBranches
    );
  };

  const calculateUnitPosition = (branch: any, unitIndex: number, modulePos: { x: number, y: number }) => {
    const branchPos = calculateBranchPosition({ position: modulePos, branches: [branch] } as Module, 0);
    const totalUnits = branch.units?.length || 1;
    
    return calculateCircularPosition(
      branchPos.x, 
      branchPos.y, 
      UNIT_RADIUS, 
      unitIndex, 
      totalUnits
    );
  };
  
  // ========== CURRICULUM DATA ==========
  // Use real curriculum data from curriculumData.ts or props
  const curriculumModules: Module[] = useMemo(() => {
    if (modules && modules.length > 0) {
      return modules;
    }
    if (allModules && allModules.length > 0) {
      return allModules;
    }
    // Fallback - should not happen with real data
    return [];
  }, [modules, allModules]);

  // ========== HANDLERS ==========
  const handleNodeHover = (nodeId: string, nodeType: string) => {
    if (nodeType === 'lesson' || nodeType === 'unit') {
      setHoveredNodeId(nodeId);
      setVisibleCards(prev => new Set([...prev, nodeId]));
      
      // Illuminate branch if hovering lesson/unit
      const moduleId = nodeId.split('.')[0];
      const branchId = nodeId.split('.').slice(0, 2).join('.');
      setHighlightedBranch(branchId);
    }
  };

  const handleNodeUnhover = (nodeId: string) => {
    setHoveredNodeId(null);
    setVisibleCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });
    setHighlightedBranch(null);
  };

  const handleNodeClick = (nodeId: string, nodeType: string) => {
    if (nodeType === 'module') {
      // Toggle module expansion
      setExpandedModules(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
    } else if (nodeType === 'lesson') {
      // Start lesson
      onLessonStart?.(nodeId);
    }
    
    setSelectedNodeId(nodeId);
    onNodeSelect?.(nodeId, nodeType);
  };

  // ========== CLICK OUTSIDE TO CLOSE ==========
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      
      if (target.closest('[data-card]') || target.closest('[data-node]')) {
        return;
      }
      
      if (visibleCards.size > 0) {
        setVisibleCards(new Set());
        setHighlightedBranch(null);
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

  // ========== ANIMATION SETUP ==========
  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  // ========== TREE CALCULATION ==========
  const treeConfig: TreeVisualizationConfig = {
    width: 1600,
    height: 1200,
    nodeSpacing: { x: 200, y: 150 },
    levelSpacing: 180,
    showConnections: true,
    animateEntrance: true,
    enableHover: true,
    enableSelection: true,
    showLockedContent: true
  };

  // ========== RENDER ==========
  return (
    <div ref={containerRef} className={`relative w-full overflow-x-auto ${className}`}>
      <svg
        ref={svgRef}
        width={treeConfig.width}
        height={treeConfig.height}
        className="min-w-full"
        viewBox={`0 0 ${treeConfig.width} ${treeConfig.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background Grid (optional) */}
        <defs>
          <pattern
            id="grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="rgba(156, 163, 175, 0.1)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Connections/Branches */}
        {treeConfig.showConnections && curriculumModules.map(module =>
          expandedModules.has(module.id) && module.branches.map((branch, branchIndex) => {
            const branchPos = calculateBranchPosition(module, branchIndex);
            return (
              <motion.line
                key={`connection-${module.id}-${branch.id}`}
                x1={module.position?.x || 0}
                y1={module.position?.y || 0}
                x2={branchPos.x}
                y2={branchPos.y}
                stroke={highlightedBranch === branch.id ? '#A855F7' : '#E5E7EB'}
                strokeWidth={highlightedBranch === branch.id ? 3 : 2}
                strokeDasharray={branch.status === 'locked' ? '5 5' : '0'}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: 1, 
                  opacity: 1,
                  stroke: highlightedBranch === branch.id ? '#A855F7' : '#E5E7EB'
                }}
                transition={{
                  pathLength: { duration: 1, ease: "easeInOut" },
                  opacity: { duration: 0.5 },
                  stroke: { duration: 0.3 }
                }}
              />
            );
          })
        )}

        {/* Module Nodes */}
        {curriculumModules.map((module, index) => (
          <motion.g
            key={module.id}
            data-node={module.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: index * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            style={{ cursor: 'pointer' }}
            onClick={() => handleNodeClick(module.id, 'module')}
            onMouseEnter={() => handleNodeHover(module.id, 'module')}
            onMouseLeave={() => handleNodeUnhover(module.id)}
            onTouchStart={() => handleNodeHover(module.id, 'module')}
            onTouchEnd={() => handleNodeUnhover(module.id)}
            whileHover={{
              scale: 1.05,
              transition: { type: "spring", stiffness: 400, damping: 10 }
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Module Background Circle */}
            <circle
              cx={module.position?.x || 0}
              cy={module.position?.y || 0}
              r={compact ? 30 : 40}
              fill="white"
              stroke={module.color}
              strokeWidth="4"
              className="drop-shadow-lg"
            />

            {/* Module Icon */}
            <foreignObject 
              x={(module.position?.x || 0) - (compact ? 20 : 24)} 
              y={(module.position?.y || 0) - (compact ? 20 : 24)} 
              width={compact ? 40 : 48} 
              height={compact ? 40 : 48}
            >
              <div className="flex items-center justify-center w-full h-full">
                <SmartIcon icon={module.icon} size={compact ? 32 : 40} />
              </div>
            </foreignObject>

            {/* Module Title */}
            <text
              x={module.position?.x || 0}
              y={(module.position?.y || 0) + 65}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="currentColor"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="2"
              paintOrder="stroke"
              className="text-gray-900 dark:text-gray-100 select-none font-bold tracking-wide"
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2)',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
              }}
            >
              {module.title}
            </text>

            {/* Progress and Status Indicators */}
            {module.status === 'in-progress' && (
              <>
                <circle
                  cx={(module.position?.x || 0) + 28}
                  cy={(module.position?.y || 0) - 28}
                  r="12"
                  fill="#F59E0B"
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={(module.position?.x || 0) + 28}
                  y={(module.position?.y || 0) - 22}
                  textAnchor="middle"
                  fontSize="10"
                  fill="white"
                  className="font-bold"
                >
                  {Math.round((module.completedBranches / (module.branches?.length || 1)) * 100)}%
                </text>
              </>
            )}
            {module.status === 'completed' && (
              <circle
                cx={(module.position?.x || 0) + 28}
                cy={(module.position?.y || 0) - 28}
                r="12"
                fill="#10B981"
                stroke="white"
                strokeWidth="2"
              />
            )}
            {module.status === 'completed' && (
              <text
                x={(module.position?.x || 0) + 28}
                y={(module.position?.y || 0) - 22}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                className="font-bold"
              >
                ✓
              </text>
            )}

            {/* Expansion Indicator */}
            {module.branches && module.branches.length > 0 && (
              <motion.g
                initial={{ rotate: 0 }}
                animate={{ rotate: expandedModules.has(module.id) ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <text
                  x={module.position?.x || 0}
                  y={(module.position?.y || 0) - 50}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6B7280"
                  className="select-none pointer-events-none"
                >
                  {expandedModules.has(module.id) ? '▼' : '▶'}
                </text>
              </motion.g>
            )}
            {expandedModules.has(module.id) && (
              <circle
                cx={(module.position?.x || 0) - 28}
                cy={(module.position?.y || 0) - 28}
                r="8"
                fill="#A855F7"
                stroke="white"
                strokeWidth="2"
              />
            )}
          </motion.g>
        ))}

        {/* Unit Nodes (when branch is expanded) */}
        {curriculumModules.map(module =>
          expandedModules.has(module.id) && module.branches.flatMap((branch, branchIndex) =>
            branch.units?.map((unit, unitIndex) => {
              // Calculate positions using circular layout
              const branchPos = calculateBranchPosition(module, branchIndex);
              const unitPos = calculateCircularPosition(
                branchPos.x,
                branchPos.y,
                UNIT_RADIUS,
                unitIndex,
                branch.units?.length || 1
              );
              
              return (
                <motion.g
                  key={unit.id}
                  data-node={unit.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: unitIndex * 0.1,
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNodeClick(unit.id, 'unit')}
                  onMouseEnter={() => handleNodeHover(unit.id, 'unit')}
                  onMouseLeave={() => handleNodeUnhover(unit.id)}
                  onTouchStart={() => handleNodeHover(unit.id, 'unit')}
                  whileHover={{
                    scale: 1.1,
                    transition: { type: "spring", stiffness: 400, damping: 10 }
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Unit Circle */}
                  <circle
                    cx={unitPos.x}
                    cy={unitPos.y}
                    r="20"
                    fill="white"
                    stroke={unit.color || '#6B7280'}
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  
                  {/* Unit Icon */}
                  <foreignObject 
                    x={unitPos.x - 12} 
                    y={unitPos.y - 12} 
                    width="24" 
                    height="24"
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      <SmartIcon icon={unit.icon || '📚'} size={20} />
                    </div>
                  </foreignObject>
                </motion.g>
              );
            })
          )
        )}

        {/* Branch Nodes (when module is expanded) */}
        {curriculumModules.map(module =>
          expandedModules.has(module.id) && module.branches.map((branch, branchIndex) => {
            // Calculate circular position for branch
            const branchPos = calculateBranchPosition(module, branchIndex);
            
            return (
              <motion.g
                key={branch.id}
                data-node={branch.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: branchIndex * 0.15,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(branch.id, 'branch')}
                onMouseEnter={() => handleNodeHover(branch.id, 'branch')}
                onMouseLeave={() => handleNodeUnhover(branch.id)}
                onTouchStart={() => handleNodeHover(branch.id, 'branch')}
                whileHover={{
                  scale: 1.1,
                  transition: { type: "spring", stiffness: 400, damping: 10 }
                }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Branch Circle */}
                <circle
                  cx={branchPos.x}
                  cy={branchPos.y}
                  r="30"
                  fill="white"
                  stroke={highlightedBranch === branch.id ? '#A855F7' : branch.color}
                  strokeWidth={highlightedBranch === branch.id ? 4 : 3}
                  className="drop-shadow-md"
                  style={{
                    filter: highlightedBranch === branch.id 
                      ? 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))' 
                      : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
                  }}
                />

                {/* Branch Icon */}
                <foreignObject 
                  x={branchPos.x - 16} 
                  y={branchPos.y - 16} 
                  width="32" 
                  height="32"
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <SmartIcon icon={branch.icon} size={28} />
                  </div>
                </foreignObject>

                {/* Branch Title */}
                <text
                  x={branchPos.x}
                  y={branchPos.y + 50}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="currentColor"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="1.5"
                  paintOrder="stroke"
                  className="text-gray-900 dark:text-gray-100 select-none font-semibold tracking-wide"
                  style={{
                    textShadow: '0 2px 3px rgba(0,0,0,0.3), 0 1px 1px rgba(0,0,0,0.2)',
                    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))'
                  }}
                >
                  {branch.title.length > 18 
                    ? branch.title.substring(0, 18) + '...' 
                    : branch.title}
                </text>
              </motion.g>
            );
          })
        )}
      </svg>

      {/* Information Cards */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <AnimatePresence>
          {Array.from(visibleCards).map(nodeId => {
            // Find the node data
            const module = curriculumModules.find(m => m.id === nodeId);
            const branch = curriculumModules
              .flatMap(m => m.branches)
              .find(b => b.id === nodeId);
            const unit = curriculumModules
              .flatMap(m => m.branches.flatMap(b => b.units || []))
              .find(u => u.id === nodeId);
            const lesson = curriculumModules
              .flatMap(m => m.branches.flatMap(b => (b.units || []).flatMap(u => u.lessons || [])))
              .find(l => l.id === nodeId);
            
            const nodeData = module || branch || unit || lesson;
            if (!nodeData) return null;
            
            // Determine node type for styling
            const nodeType = module ? 'module' : branch ? 'branch' : unit ? 'unit' : 'lesson';

            // Calculate actual position based on node type and circular positioning
            let position: { x: number; y: number };
            if (module) {
              position = module.position || { x: 0, y: 0 };
            } else if (branch) {
              // Find parent module to calculate branch position
              const parentModule = curriculumModules.find(m => m.branches.some(b => b.id === branch.id));
              const branchIndex = parentModule?.branches.findIndex(b => b.id === branch.id) || 0;
              position = parentModule ? calculateBranchPosition(parentModule, branchIndex) : { x: 0, y: 0 };
            } else if (unit) {
              // Find parent module and branch to calculate unit position
              const parentModule = curriculumModules.find(m => m.branches.some(b => b.units?.some(u => u.id === unit.id)));
              const parentBranch = parentModule?.branches.find(b => b.units?.some(u => u.id === unit.id));
              const branchIndex = parentModule?.branches.findIndex(b => b.id === parentBranch?.id) || 0;
              const unitIndex = parentBranch?.units?.findIndex(u => u.id === unit.id) || 0;
              
              if (parentModule && parentBranch) {
                const branchPos = calculateBranchPosition(parentModule, branchIndex);
                position = calculateCircularPosition(
                  branchPos.x,
                  branchPos.y,
                  UNIT_RADIUS,
                  unitIndex,
                  parentBranch.units?.length || 1
                );
              } else {
                position = { x: 0, y: 0 };
              }
            } else {
              position = { x: 0, y: 0 };
            }
            
            const cardTop = position.y + 50; // Closer to element
            const cardLeft = position.x - 90;  // Smaller width = less offset

            return (
              <motion.div
                key={`card-${nodeId}`}
                data-card={nodeId}
                className="absolute pointer-events-auto"
                style={{
                  left: `${cardLeft}px`,
                  top: `${cardTop}px`,
                  zIndex: 20
                }}
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  duration: 0.4
                }}
                onMouseEnter={() => handleNodeHover(nodeId, 'card')}
                onMouseLeave={() => handleNodeUnhover(nodeId)}
                onTouchStart={() => handleNodeHover(nodeId, 'card')}
              >
                {/* Glass Morphism Card - 40% smaller */}
                <div className="relative w-[180px] bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-900/90 backdrop-blur-xl backdrop-saturate-150 rounded-xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
                  
                  {/* Gradient Border Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 pointer-events-none" />
                  
                  {/* Connection Line from Node to Card */}
                  <div 
                    className="absolute w-[2px] bg-gradient-to-b from-purple-500/50 to-transparent"
                    style={{
                      height: '20px',
                      left: '50%',
                      top: '-20px',
                      transform: 'translateX(-50%)'
                    }}
                  />
                  
                  {/* Card Content - Compact */}
                  <div className="relative p-3">
                    {/* Header - Compact */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight mb-1">
                          {nodeData.title}
                        </h3>
                        {module && module.id && (
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                            {module.id}
                          </span>
                        )}
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
                          {nodeData.description.length > 80 
                            ? nodeData.description.substring(0, 80) + '...' 
                            : nodeData.description}
                        </p>
                        {'objective' in nodeData && nodeData.objective && (
                          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              <span className="font-semibold">Meta:</span> {nodeData.objective.length > 60
                                ? nodeData.objective.substring(0, 60) + '...'
                                : nodeData.objective}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-2 flex items-center justify-center">
                        <SmartIcon 
                          icon={nodeData.icon || (nodeType === 'unit' ? '◉' : nodeType === 'lesson' ? '◎' : '▪')} 
                          size={32} 
                        />
                      </div>
                    </div>
                    
                    {/* Stats - Compact */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                        <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1 text-sm">
                          <span className="text-base drop-shadow-sm">⭐</span>
                          {('xpTotal' in nodeData ? nodeData.xpTotal : null) || (lesson && lesson.xpReward) || 0} XP
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {lesson ? 'Recompensa' : 'Puntos'}
                        </div>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                        <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 text-sm">
                          <span className="text-base drop-shadow-sm">⏱️</span>
                          {('estimatedTime' in nodeData ? nodeData.estimatedTime : null) || (lesson && lesson.duration) || 0}min
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          Tiempo
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Stats Row for Modules - Compact */}
                    {'hasQuests' in nodeData && nodeData.hasQuests && (
                      <div className="mb-2">
                        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg p-1.5 text-center">
                          <div className="font-bold text-orange-600 dark:text-orange-400 flex items-center justify-center gap-1 text-xs">
                            <SmartIcon icon="📅" size={14} />
                            Disponible
                          </div>
                          <div className="text-xs text-orange-600/80 dark:text-orange-400/80 font-medium">
                            Acceso Inmediato
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Lesson specific info - Compact */}
                    {lesson && (
                      <div className="mb-2 space-y-1">
                        {lesson.difficulty && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Nivel:</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              lesson.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              lesson.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {lesson.difficulty === 'beginner' ? 'Básico' :
                               lesson.difficulty === 'intermediate' ? 'Inter.' : 'Avanc.'}
                            </span>
                          </div>
                        )}
                        {lesson.evidenceType && (
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Tipo:</span> 
                            <span>{lesson.evidenceType}</span>
                          </div>
                        )}
                        {lesson.isQuest && (
                          <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 justify-center">
                            <SmartIcon icon="⭐" size={12} />
                            <span className="text-xs font-semibold">Quest</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Badges - Compact */}
                    {'hasQuests' in nodeData && nodeData.hasQuests && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-semibold">
                          <SmartIcon icon="⭐" size={10} />
                          {nodeData.questsCount}Q
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-semibold">
                          <SmartIcon icon="🏆" size={10} />
                          {nodeData.badgesAvailable}B
                        </span>
                      </div>
                    )}
                    
                    {/* Action Button - Compact */}
                    <div className="flex justify-center pt-1">
                      {nodeData.status === 'available' ? (
                        <motion.button
                          className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-xl"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleNodeClick(nodeId, nodeType)}
                        >
                          {nodeType === 'module' ? 'Explorar' : 
                           nodeType === 'branch' ? 'Ver' :
                           nodeType === 'unit' ? 'Lecciones' : 
                           'Comenzar'} →
                        </motion.button>
                      ) : nodeData.status === 'locked' ? (
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                          <SmartIcon icon="🔒" size={12} />
                          Bloqueado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold">
                          <SmartIcon icon="✅" size={12} />
                          Completado
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Decorative Elements */}
                  {nodeData.status === 'available' && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-3 h-3 bg-purple-500 rounded-full animate-ping" />
                      <div className="w-3 h-3 bg-purple-500 rounded-full absolute top-0" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CurriculumTree;