/**
 * LEARNING PATH COMPONENT - SISTEMA DE DISEÑO UX DEFINITIVO
 * ========================================================
 * 
 * Visualización interactiva estilo Brilliant con estándares de diseño obligatorios.
 * Este componente establece el patrón UX estándar para toda la plataforma.
 * 
 * PRINCIPIOS DE DISEÑO FUNDAMENTALES:
 * 
 * 🎨 VISUAL DESIGN STANDARDS:
 * - Glass Morphism: backdrop-blur-xl + backdrop-saturate-150
 * - Cards aparecen SIEMPRE DEBAJO de nodos (nunca superpuestas)
 * - Hover/Touch system: Sin botones feos, UX limpia y natural
 * - Spring animations: stiffness: 300, damping: 25 (obligatorio)
 * 
 * 🖱️ INTERACTION PATTERNS:
 * - Desktop: onMouseEnter → show card, onMouseLeave → hide card
 * - Mobile: onTouchStart → show card, onTouchEnd → hide card  
 * - Click outside anywhere → close all cards (no interruptions)
 * - NO botones X de cierre (feo y innecesario)
 * 
 * 📱 RESPONSIVE BEHAVIOR:
 * - Touch events = Mouse events (identical behavior)
 * - Cards width: 200px fixed (optimal for mobile/desktop)
 * - Overflow-x-auto container para navegación horizontal
 * 
 * 🎯 CONDITIONAL INDICATORS:
 * - Solo nodos con COLOR muestran "Hover → Info" / "Click → Entrenar"
 * - Nodos GRISES (locked) = sin indicadores (no hay contenido)
 * - Estado dinámico: hover activo cambia texto indicador
 * 
 * 📏 POSITIONING MATHEMATICS:
 * - SVG height = max(node.y) + 350px (espacio para cards)
 * - Card top = node.y + nodeSize/2 + 15px (debajo del nodo)
 * - Card left = node.x - 100px (centrada bajo nodo)
 * 
 * 🚀 ANIMATION SPECIFICATIONS:
 * - Card Entry: { opacity: 0→1, y: -20→0, scale: 0.8→1 }
 * - Card Exit: { opacity: 1→0, y: 0→-10, scale: 1→0.9 }
 * - Node Hover: { scale: 1→1.1, spring: stiffness:400, damping:10 }
 * - Timing: 0.4s duration con spring physics
 * 
 * 🔧 TECHNICAL ARCHITECTURE:
 * - State: Set<string> para múltiples cards visibles simultáneas
 * - Event delegation: data-node y data-card atributos
 * - Memory efficiency: listeners solo activos cuando necesarios
 * - Clean unmount: removeEventListener en cleanup
 * 
 * ESTE ES EL ESTÁNDAR DE DISEÑO DEFINITIVO PARA TODA LA PLATAFORMA.
 * Cualquier modificación debe documentarse aquí y seguir estos principios.
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import { SmartIcon } from '../ui/SmartIcon';
import Link from 'next/link';

export interface PathNode {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  objective?: string; // NUEVA PROPIEDAD RICA
  icon: string;
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  progress?: number;
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
  xpTotal?: number; // NUEVA PROPIEDAD RICA
  branches?: any[]; // NUEVA PROPIEDAD RICA
  masterBadgeTitle?: string; // NUEVA PROPIEDAD RICA
  masterBadgeDescription?: string; // NUEVA PROPIEDAD RICA
  completedBranches?: number; // NUEVA PROPIEDAD RICA
  position: { x: number; y: number };
  connections?: string[]; // IDs of connected nodes
}

interface LearningPathProps {
  nodes: PathNode[];
  currentNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  pathColor?: string;
  animated?: boolean;
  showConnections?: boolean;
  compact?: boolean;
}

export const LearningPath: React.FC<LearningPathProps> = ({
  nodes,
  currentNodeId,
  onNodeClick,
  pathColor = '#A855F7',
  animated = true,
  showConnections = true,
  compact = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const controls = useAnimation();
  const isInView = useInView(svgRef);
  
  // State para controlar qué cards están visibles
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  
  // Ref para el contenedor principal
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handler para hover en nodos (mostrar card)
  const handleNodeHover = (nodeId: string, nodeStatus: PathNode['status']) => {
    if (nodeStatus === 'locked') return; // No mostrar info si está bloqueado
    console.log('👁️ Showing info card on hover for:', nodeId);
    setVisibleCards(prev => new Set([...prev, nodeId]));
  };
  
  // Handler para unhover en nodos (ocultar card)
  const handleNodeUnhover = (nodeId: string) => {
    console.log('👁️ Hiding info card on unhover for:', nodeId);
    setVisibleCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });
  };
  
  // Handler para click en nodos (abrir entrenamiento directamente)
  const handleNodeClick = (nodeId: string, nodeStatus: PathNode['status']) => {
    if (nodeStatus === 'locked') return; // No hacer nada si está bloqueado
    console.log('🚀 Opening training module for:', nodeId);
    onNodeClick?.(nodeId);
  };
  
  // Handler para botón "Comenzar" en card
  const handleStartTraining = (nodeId: string) => {
    console.log('▶️ Starting training from button for:', nodeId);
    onNodeClick?.(nodeId);
  };

  useEffect(() => {
    if (isInView && animated) {
      controls.start('visible');
    }
  }, [isInView, controls, animated]);

  // Effect para manejar click/touch fuera de las cards
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      
      // Si el click fue en una card o en un nodo, no cerrar
      if (target.closest('[data-card]') || target.closest('[data-node]')) {
        return;
      }
      
      // Cerrar todas las cards visibles
      if (visibleCards.size > 0) {
        console.log('👁️ Closing all cards on outside click/touch');
        setVisibleCards(new Set());
      }
    };

    // Solo agregar los listeners si hay cards visibles
    if (visibleCards.size > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [visibleCards]);

  const getNodeColor = (status: PathNode['status']) => {
    switch (status) {
      case 'completed':
        return '#10B981'; // green
      case 'in-progress':
        return '#3B82F6'; // blue
      case 'available':
        return '#A855F7'; // purple
      case 'locked':
      default:
        return '#6B7280'; // gray
    }
  };

  const getDifficultyBadge = (difficulty?: PathNode['difficulty']) => {
    if (!difficulty) return null;
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return colors[difficulty];
  };

  // Calculate SVG dimensions based on node positions + card space
  const svgWidth = Math.max(...nodes.map(n => n.position.x)) + 300; // More horizontal space
  const svgHeight = Math.max(...nodes.map(n => n.position.y)) + 350; // Extra space for cards below

  // Generate path connections
  const generatePath = (from: PathNode, to: PathNode) => {
    const dx = to.position.x - from.position.x;
    const dy = to.position.y - from.position.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    
    // Create a curved path
    const mx = from.position.x + dx / 2;
    const my = from.position.y + dy / 2;
    const curvature = 0.2;
    
    return `M ${from.position.x} ${from.position.y} 
            Q ${mx + dy * curvature} ${my - dx * curvature} 
            ${to.position.x} ${to.position.y}`;
  };

  const nodeSize = compact ? 60 : 80;

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        className="min-w-full"
        style={{ minHeight: '500px' }} // More height for cards
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Render connections first (behind nodes) */}
        {showConnections && nodes.map(node => 
          node.connections?.map(targetId => {
            const targetNode = nodes.find(n => n.id === targetId);
            if (!targetNode) return null;
            
            const isActive = node.status === 'completed' || 
                           (node.status === 'in-progress' && targetNode.status !== 'locked');
            
            return (
              <motion.path
                key={`${node.id}-${targetId}`}
                d={generatePath(node, targetNode)}
                fill="none"
                stroke={isActive ? pathColor : '#E5E7EB'}
                strokeWidth="3"
                strokeDasharray={isActive ? "0" : "5 5"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={controls}
                variants={{
                  visible: {
                    pathLength: 1,
                    opacity: 1,
                    transition: {
                      pathLength: { duration: 1.5, ease: "easeInOut" },
                      opacity: { duration: 0.5 }
                    }
                  }
                }}
              />
            );
          })
        )}

        {/* Render nodes */}
        {nodes.map((node, index) => {
          const isActive = node.id === currentNodeId;
          const nodeColor = getNodeColor(node.status);
          
          return (
            <motion.g
              key={node.id}
              data-node={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                delay: animated ? index * 0.1 : 0,
                type: "spring",
                stiffness: 200
              }}
              style={{ cursor: node.status !== 'locked' ? 'pointer' : 'not-allowed' }}
              onClick={() => handleNodeClick(node.id, node.status)}
              onMouseEnter={() => handleNodeHover(node.id, node.status)}
              onMouseLeave={() => handleNodeUnhover(node.id)}
              onTouchStart={() => handleNodeHover(node.id, node.status)}
              onTouchEnd={() => handleNodeUnhover(node.id)}
              whileHover={node.status !== 'locked' ? { 
                scale: 1.1,
                transition: { type: "spring", stiffness: 400, damping: 10 }
              } : undefined}
              whileTap={node.status !== 'locked' ? { scale: 0.95 } : undefined}
            >
              {/* Node background with glow effect */}
              {(isActive || node.status === 'in-progress') && (
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  r={nodeSize / 2 + 10}
                  fill={nodeColor}
                  opacity="0.2"
                  className="animate-pulse"
                />
              )}

              {/* Main node circle */}
              <circle
                cx={node.position.x}
                cy={node.position.y}
                r={nodeSize / 2}
                fill="white"
                stroke={nodeColor}
                strokeWidth="3"
                className="drop-shadow-lg"
              />

              {/* Progress ring for in-progress nodes */}
              {node.status === 'in-progress' && node.progress !== undefined && (
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  r={nodeSize / 2 - 3}
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth="3"
                  strokeDasharray={`${(node.progress / 100) * Math.PI * nodeSize} ${Math.PI * nodeSize}`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${node.position.x} ${node.position.y})`}
                  opacity="0.3"
                />
              )}

              {/* Node icon */}
              <foreignObject
                x={node.position.x - 16}
                y={node.position.y - 16}
                width="32"
                height="32"
              >
                <div className="flex items-center justify-center w-full h-full">
                  <SmartIcon icon={node.icon} size={compact ? 24 : 32} />
                </div>
              </foreignObject>

              {/* Status indicator */}
              {node.status === 'completed' && (
                <circle
                  cx={node.position.x + nodeSize / 3}
                  cy={node.position.y - nodeSize / 3}
                  r="8"
                  fill="#10B981"
                  stroke="white"
                  strokeWidth="2"
                />
              )}
              {node.status === 'completed' && (
                <text
                  x={node.position.x + nodeSize / 3}
                  y={node.position.y - nodeSize / 3 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="white"
                  className="font-bold"
                >
                  ✓
                </text>
              )}

              {/* Lock indicator */}
              {node.status === 'locked' && (
                <text
                  x={node.position.x + nodeSize / 3}
                  y={node.position.y - nodeSize / 3 + 4}
                  textAnchor="middle"
                  fontSize="16"
                >
                  🔒
                </text>
              )}
              
              {/* Hover indicator only for colored nodes (no grises/locked) */}
              {node.status !== 'locked' && (
                <text
                  x={node.position.x}
                  y={node.position.y + nodeSize / 2 + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6B7280"
                  className="pointer-events-none select-none"
                >
                  {visibleCards.has(node.id) ? 'Click → Entrenar' : 'Hover → Info'}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* Node details cards - BELOW NODES WITHOUT OVERLAP - NOW WITH TOGGLE */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <AnimatePresence>
          {nodes.map((node, index) => {
            if (compact) return null;
            
            // Solo mostrar card si está en el Set de visibleCards
            const isCardVisible = visibleCards.has(node.id);
            if (!isCardVisible) return null;
            
            // POSICIÓN FIJA OPTIMIZADA - Izquierda, arriba del centro (IGUAL QUE CURRICULUM)
            const cardLeft = 20; // Siempre en el margen izquierdo
            const cardTop = Math.max(80, (window.innerHeight / 2) - 200); // Arriba del centro, min 80px del top
            
            return (
              <motion.div
              key={`detail-${node.id}`}
              data-card={node.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${cardLeft}px`,
                top: `${cardTop}px`,
                zIndex: 10 + index // Ensure proper stacking
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
              onMouseEnter={() => handleNodeHover(node.id, node.status)}
              onMouseLeave={() => handleNodeUnhover(node.id)}
              onTouchStart={() => handleNodeHover(node.id, node.status)}
            >
              {/* Card Container with Glass Morphism Effect - EXPANDIDO */}
              <div className={`
                relative w-[280px] max-h-[400px] overflow-y-auto
                bg-gradient-to-br from-white/95 to-white/90 
                dark:from-gray-800/95 dark:to-gray-900/90
                backdrop-blur-xl backdrop-saturate-150
                rounded-2xl shadow-2xl
                border border-white/20 dark:border-gray-700/30
                ${node.status === 'locked' ? 'opacity-60 grayscale' : 'hover:shadow-3xl hover:scale-105'}
                transition-all duration-500 ease-out
                overflow-hidden
              `}>
                {/* Gradient Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 pointer-events-none" />
                
{/* Close button removed - cleaner UX */}
                
                {/* Connection Line from Node to Card */}
                <div 
                  className="absolute w-[2px] bg-gradient-to-b from-purple-500/50 to-transparent"
                  style={{
                    height: '15px',
                    left: '50%',
                    top: '-15px',
                    transform: 'translateX(-50%)'
                  }}
                />
                
                {/* Card Content */}
                <div className="relative p-4">
                  {/* Header with Status Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                        {node.title}
                      </h3>
                      {node.difficulty && (
                        <span className={`
                          inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold
                          ${getDifficultyBadge(node.difficulty)}
                        `}>
                          {node.difficulty === 'beginner' ? '🌱 Básico' :
                           node.difficulty === 'intermediate' ? '🌿 Intermedio' :
                           '🌳 Avanzado'}
                        </span>
                      )}
                    </div>
                    
                    {/* Status Icon */}
                    <div className="ml-2">
                      {node.status === 'completed' && (
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      )}
                      {node.status === 'in-progress' && (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{node.progress}%</span>
                        </div>
                      )}
                      {node.status === 'locked' && (
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                          <span className="text-lg">🔒</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Description */}
                  {node.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                      {node.description}
                    </p>
                  )}
                  
                  {/* Objetivo - NUEVA INFORMACIÓN RICA */}
                  {node.objective && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">🎯 Objetivo:</div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium italic">
                          "{node.objective}"
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Estadísticas ricas */}
                  {(node.xpTotal || node.branches) && (
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      {node.xpTotal && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <span>⭐</span>
                            <span className="font-semibold">{node.xpTotal}</span>
                          </div>
                          <div className="text-green-700 dark:text-green-300 text-xs">XP Total</div>
                        </div>
                      )}
                      {node.branches && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                            <span>🌱</span>
                            <span className="font-semibold">{node.branches.length}</span>
                          </div>
                          <div className="text-purple-700 dark:text-purple-300 text-xs">Ramas</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Progress Bar for In-Progress */}
                  {node.status === 'in-progress' && node.progress !== undefined && (
                    <div className="mb-3">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${node.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Master Badge - NUEVA INFORMACIÓN RICA */}
                  {node.masterBadgeTitle && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 mb-3">
                      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-medium mb-1">
                        <span>🏆</span>
                        <span>{node.masterBadgeTitle}</span>
                      </div>
                      {node.masterBadgeDescription && (
                        <div className="text-xs text-yellow-700 dark:text-yellow-300">
                          {node.masterBadgeDescription}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Info & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    {node.estimatedTime && (
                      <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <span className="text-base">⏱️</span>
                        {node.estimatedTime}
                      </span>
                    )}
                    
                    {node.status === 'available' && (
                      <motion.button
                        className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-xl"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStartTraining(node.id)}
                      >
                        Comenzar →
                      </motion.button>
                    )}
                    
                    {node.status === 'completed' && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                        <span>🏆</span> Completado
                      </span>
                    )}
                    
                    {node.status === 'locked' && (
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        Requisitos pendientes
                      </span>
                    )}
                  </div>
                  
                  {/* Prerequisites if locked - INFORMACIÓN ORIGINAL MÁS ORGANIZADA */}
                  {node.status === 'locked' && node.prerequisites && node.prerequisites.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        📚 Completa primero:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {node.prerequisites.map(prereq => (
                          <span key={prereq} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {nodes.find(n => n.id === prereq)?.title || prereq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Decorative Elements */}
                {node.status === 'available' && (
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

// Preset learning paths
export const PRESET_PATHS = {
  beginner: [
    {
      id: 'start',
      title: 'Bienvenida',
      icon: '👋',
      status: 'completed' as const,
      position: { x: 100, y: 200 },
      connections: ['wallet-basics']
    },
    {
      id: 'wallet-basics',
      title: 'Wallet Básico',
      icon: '👛',
      status: 'in-progress' as const,
      progress: 60,
      position: { x: 250, y: 200 },
      connections: ['first-nft']
    },
    {
      id: 'first-nft',
      title: 'Tu Primer NFT',
      icon: '🖼️',
      status: 'available' as const,
      position: { x: 400, y: 150 },
      connections: ['claim-gift']
    },
    {
      id: 'claim-gift',
      title: 'Reclamar Regalo',
      icon: '🎁',
      status: 'locked' as const,
      position: { x: 550, y: 200 },
      connections: []
    }
  ]
};

export default LearningPath;