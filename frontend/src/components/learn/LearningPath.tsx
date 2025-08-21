/**
 * LEARNING PATH COMPONENT - Visualización estilo Brilliant
 * Rutas de aprendizaje conectadas con animaciones fluidas
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export interface PathNode {
  id: string;
  title: string;
  description?: string;
  icon: string;
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  progress?: number;
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
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
  
  // Handler para click en nodos
  const handleNodeClick = (nodeId: string, nodeStatus: PathNode['status']) => {
    if (nodeStatus === 'locked') return; // No hacer nada si está bloqueado
    
    const isCardVisible = visibleCards.has(nodeId);
    
    if (!isCardVisible) {
      // FIRST CLICK: Mostrar card de información
      console.log('🔍 Showing info card for:', nodeId);
      setVisibleCards(prev => new Set([...prev, nodeId]));
    } else {
      // SECOND CLICK: Abrir módulo para entrenar
      console.log('🚀 Opening training module for:', nodeId);
      onNodeClick?.(nodeId);
    }
  };
  
  // Handler para botón "Comenzar" en card
  const handleStartTraining = (nodeId: string) => {
    console.log('▶️ Starting training from button for:', nodeId);
    onNodeClick?.(nodeId);
  };
  
  // Cerrar card cuando se hace click fuera
  const handleCloseCard = (nodeId: string) => {
    setVisibleCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });
  };

  useEffect(() => {
    if (isInView && animated) {
      controls.start('visible');
    }
  }, [isInView, controls, animated]);

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
    <div className="relative w-full overflow-x-auto">
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
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                delay: animated ? index * 0.1 : 0,
                type: "spring",
                stiffness: 200
              }}
              style={{ cursor: node.status !== 'locked' ? 'pointer' : 'not-allowed' }}
              onClick={() => handleNodeClick(node.id, node.status)}
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
              <text
                x={node.position.x}
                y={node.position.y + 8}
                textAnchor="middle"
                fontSize={compact ? "24" : "32"}
                className="select-none"
              >
                {node.icon}
              </text>

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
              
              {/* Click instructions for interactive nodes */}
              {node.status !== 'locked' && (
                <text
                  x={node.position.x}
                  y={node.position.y + nodeSize / 2 + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6B7280"
                  className="pointer-events-none select-none"
                >
                  {visibleCards.has(node.id) ? 'Click → Entrenar' : 'Click → Info'}
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
            
            // Calculate position to appear below node with proper spacing
            const cardTop = node.position.y + nodeSize / 2 + 15; // Below the node
            const cardLeft = node.position.x - 100; // Centered under node
            
            return (
              <motion.div
              key={`detail-${node.id}`}
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
            >
              {/* Card Container with Glass Morphism Effect */}
              <div className={`
                relative w-[200px]
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
                
                {/* Close Button */}
                <button
                  onClick={() => handleCloseCard(node.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-gray-400 hover:bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-20 transition-colors"
                  title="Cerrar información"
                >
                  ×
                </button>
                
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
                  
                  {/* Prerequisites if locked */}
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