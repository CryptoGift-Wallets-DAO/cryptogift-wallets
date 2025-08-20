/**
 * LEARNING PATH COMPONENT - Visualización estilo Brilliant
 * Rutas de aprendizaje conectadas con animaciones fluidas
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
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

  // Calculate SVG dimensions based on node positions
  const svgWidth = Math.max(...nodes.map(n => n.position.x)) + 200;
  const svgHeight = Math.max(...nodes.map(n => n.position.y)) + 200;

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
        style={{ minHeight: '400px' }}
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
              onClick={() => node.status !== 'locked' && onNodeClick?.(node.id)}
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
            </motion.g>
          );
        })}
      </svg>

      {/* Node details cards */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {nodes.map((node, index) => {
          if (compact) return null;
          
          return (
            <motion.div
              key={`detail-${node.id}`}
              className="absolute pointer-events-auto"
              style={{
                left: node.position.x + nodeSize / 2 + 10,
                top: node.position.y - 30
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: animated ? index * 0.1 + 0.5 : 0 }}
            >
              <div className={`
                bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 
                ${node.status === 'locked' ? 'opacity-60' : 'hover:shadow-xl'}
                transition-all duration-300 max-w-xs
              `}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    {node.title}
                  </h3>
                  {node.difficulty && (
                    <span className={`
                      px-2 py-0.5 rounded-full text-xs font-medium
                      ${getDifficultyBadge(node.difficulty)}
                    `}>
                      {node.difficulty}
                    </span>
                  )}
                </div>
                
                {node.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {node.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs">
                  {node.estimatedTime && (
                    <span className="text-gray-500 dark:text-gray-500">
                      ⏱️ {node.estimatedTime}
                    </span>
                  )}
                  
                  {node.status === 'in-progress' && node.progress !== undefined && (
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {node.progress}% completado
                    </span>
                  )}
                  
                  {node.status === 'completed' && (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✅ Completado
                    </span>
                  )}
                  
                  {node.status === 'available' && (
                    <motion.button
                      className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-medium hover:bg-purple-700"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onNodeClick?.(node.id)}
                    >
                      Comenzar →
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
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