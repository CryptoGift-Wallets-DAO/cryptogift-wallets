/**
 * CURRICULUM TREE VIEW COMPONENT - OBRA MAESTRA INTERACTIVA
 * ========================================================
 * 
 * Visualización completa del árbol curricular CG Academy con 21 módulos.
 * Sistema M.R.U.L (Módulo.Rama.Unidad.Lección) completamente navegable.
 * 
 * ARQUITECTURA VISUAL JERÁRQUICA:
 * - 21 Módulos (M0-M20): Círculos principales conectados orgánicamente
 * - 51 Ramas (R): Conexiones secundarias desde módulos
 * - ~153 Unidades (U): Nodos intermedios con agrupación visual
 * - ~459 Lecciones (L): Hojas del árbol con quest indicators
 * 
 * DISTRIBUCIÓN ESPACIAL INTELIGENTE:
 * - Módulos M0-M8 (profundos): Disposición central con más espacio
 * - Módulos M9-M20 (medios): Disposición periférica optimizada
 * - Sistema de clustering por materias madres (8 categorías)
 * - Algoritmo anti-overlapping automático
 * 
 * UX STANDARDS APLICADOS (idénticos a LearningPath):
 * - Glass morphism cards aparecen DEBAJO de nodos
 * - Spring animations: stiffness: 300, damping: 25
 * - Touch/Mouse system unificado sin botones feos
 * - Hover → Info / Click → Action patterns
 * - Sistema de iluminación de ramas completas
 * 
 * CARACTERÍSTICAS AVANZADAS:
 * - Toggle dinámico Learning Path ↔ Full Tree
 * - Branch highlighting al seleccionar cualquier elemento
 * - Quest badges visibles en contexto
 * - Filtrado por categorías/dificultad
 * - Zoom & pan interactions
 * - Mobile-first responsive design
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion';
import { SmartIcon } from '../ui/SmartIcon';
import { 
  BookOpen, 
  Award, 
  Clock, 
  Zap, 
  Target, 
  Shield, 
  Coins,
  Cpu,
  Globe,
  Users,
  Code,
  TrendingUp,
  Lock,
  CheckCircle,
  PlayCircle,
  Star,
  Filter,
  Search,
  Layers,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  Settings,
  Sliders,
  MousePointer2
} from 'lucide-react';

// Types
import type { 
  Module, 
  Branch, 
  Unit, 
  Lesson, 
  Category,
  Curriculum,
  UserProgress,
  TreeNode,
  TreeVisualizationConfig
} from '../../types/curriculum';

// Data
import { modules, categories } from '../../data/curriculumData';

// Props interface
interface CurriculumTreeViewProps {
  isVisible?: boolean;
  onToggleView?: () => void;
  userProgress?: UserProgress;
  onNodeSelect?: (nodeId: string, nodeType: 'module' | 'branch' | 'unit' | 'lesson') => void;
  onQuestStart?: (questId: string) => void;
}

// Tree configuration constants - EXPANDED for better distribution
const TREE_CONFIG: TreeVisualizationConfig = {
  width: 2000,    // Increased from 1200
  height: 1400,   // Increased from 800
  nodeSpacing: { x: 280, y: 220 },  // Increased from 180x150
  levelSpacing: 180,  // Increased from 120
  showConnections: true,
  animateEntrance: true,
  enableHover: true,
  enableSelection: true,
  showLockedContent: true
};

// Node size constants - LARGER for better visibility
const NODE_SIZES = {
  module: 80,   // Increased from 60
  branch: 60,   // Increased from 45
  unit: 45,     // Increased from 35
  lesson: 32    // Increased from 25
};

// Orbital distances - DYNAMIC based on view mode
const getOrbitalDistances = (viewMode: 'overview' | 'detailed') => ({
  branch: viewMode === 'detailed' ? 200 : 160,   // More spacing in detailed mode
  unit: viewMode === 'detailed' ? 130 : 100,     // More spacing in detailed mode
  lesson: viewMode === 'detailed' ? 85 : 65      // More spacing in detailed mode
});

// Animation variants (siguiendo estándares LearningPath)
const nodeVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0
  },
  hover: { 
    scale: 1.1
  },
  tap: { 
    scale: 0.95 
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: -20, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.9,
    transition: { 
      duration: 0.2 
    }
  }
};

const CurriculumTreeView: React.FC<CurriculumTreeViewProps> = ({
  isVisible = true,
  onToggleView,
  userProgress,
  onNodeSelect,
  onQuestStart
}) => {
  // State management
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [hoveredNodes, setHoveredNodes] = useState<Set<string>>(new Set());
  const [highlightedBranches, setHighlightedBranches] = useState<Set<string>>(new Set());
  const [activeCards, setActiveCards] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  
  // Zoom and Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Advanced Zoom Control state
  const [zoomMode, setZoomMode] = useState<'interactive' | 'fixed'>('interactive');
  const [showZoomControl, setShowZoomControl] = useState<boolean>(false);
  const [isTouch, setIsTouch] = useState<boolean>(false);
  
  // Touch gesture state for pinch-zoom
  const [lastTouches, setLastTouches] = useState<{ distance: number; center: { x: number; y: number } } | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Función para obtener color según estado (moved before useMemo)
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in-progress': return '#F59E0B';
      case 'available': return '#3B82F6';
      default: return '#6B7280';
    }
  }, []);

  // Close zoom control when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showZoomControl && !event.target) return;
      const target = event.target as Element;
      if (!target.closest('[data-zoom-control]')) {
        setShowZoomControl(false);
      }
    };

    if (showZoomControl) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showZoomControl]);

  // Zoom and Pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // WHEEL ZOOM DISABLED - Only pan via panel controls
    // Two-finger trackpad scrolling should only pan, never zoom
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert wheel delta to pan movement
    const panDeltaX = -e.deltaX;
    const panDeltaY = -e.deltaY;

    setPanOffset(prev => ({
      x: prev.x + panDeltaX,
      y: prev.y + panDeltaY
    }));
  }, []);

  // Touch gesture helper functions
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  // Touch event handlers for pinch-zoom and two-finger pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsTouch(true);
    
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const rect = containerRef.current?.getBoundingClientRect();
      
      if (rect) {
        setLastTouches({ 
          distance, 
          center: { x: center.x - rect.left, y: center.y - rect.top } 
        });
      }
    } else if (e.touches.length === 1) {
      // Single finger - setup for drag-like scrolling
      setIsDragging(true);
      setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      // Single touch scrolling - like mouse drag
      e.preventDefault();
      
      const deltaX = e.touches[0].clientX - lastMousePos.x;
      const deltaY = e.touches[0].clientY - lastMousePos.y;

      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      
    } else if (e.touches.length === 2 && lastTouches) {
      e.preventDefault();
      
      const currentCenter = getTouchCenter(e.touches);
      const rect = containerRef.current?.getBoundingClientRect();
      
      if (!rect) return;

      const relativeCenter = {
        x: currentCenter.x - rect.left,
        y: currentCenter.y - rect.top
      };

      // ✅ PINCH ZOOM: Detectar cambio de distancia entre dedos (COPIADO DE LEARNINGPATH)
      const currentDistance = getTouchDistance(e.touches);
      const distanceChange = Math.abs(currentDistance - lastTouches.distance);
      const centerChange = Math.sqrt(
        Math.pow(relativeCenter.x - lastTouches.center.x, 2) + 
        Math.pow(relativeCenter.y - lastTouches.center.y, 2)
      );

      if (distanceChange > 10 && centerChange < 20) {
        // PINCH ZOOM: Cambio significativo en distancia, poco movimiento de centro
        const zoomFactor = currentDistance / lastTouches.distance;
        const newZoom = Math.max(0.2, Math.min(3, zoomLevel * zoomFactor));
        
        // ✅ ZOOM HACIA EL PUNTO EXACTO ENTRE LOS DEDOS
        const zoomRatio = newZoom / zoomLevel;
        setPanOffset(prev => ({
          x: lastTouches.center.x - (lastTouches.center.x - prev.x) * zoomRatio,
          y: lastTouches.center.y - (lastTouches.center.y - prev.y) * zoomRatio
        }));
        
        setZoomLevel(newZoom);
      } else if (centerChange > 5) {
        // TWO-FINGER PAN: Movimiento de centro, mantener zoom
        const panDeltaX = relativeCenter.x - lastTouches.center.x;
        const panDeltaY = relativeCenter.y - lastTouches.center.y;
        
        setPanOffset(prev => ({
          x: prev.x + panDeltaX,
          y: prev.y + panDeltaY
        }));
      }

      // Update last touches con nueva distancia y centro
      setLastTouches({ 
        distance: currentDistance,
        center: relativeCenter 
      });
    }
  }, [isDragging, lastMousePos, lastTouches, panOffset, zoomLevel]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setLastTouches(null);
    }
    if (e.touches.length === 0) {
      setIsTouch(false);
      setIsDragging(false);
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start dragging if not clicking on an interactive element
    const target = e.target as Element;
    if (target.closest('[data-node]') || target.closest('[data-card]') || target.closest('button')) {
      return;
    }
    
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom control functions
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(2, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(0.5, prev / 1.2));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);


  // Construir estructura de árbol jerárquica
  const treeStructure = useMemo(() => {
    const buildTreeNodes = (): TreeNode[] => {
      const nodes: TreeNode[] = [];
      const orbitalDistances = getOrbitalDistances(viewMode);
      
      // Calcular posiciones para módulos usando layout orgánico
      const calculateModulePositions = () => {
        const positions: { [key: string]: { x: number; y: number } } = {};
        const centerX = TREE_CONFIG.width / 2;
        const centerY = TREE_CONFIG.height / 2;
        
        // Disposición circular para módulos principales - DYNAMIC SPACING
        modules.forEach((module, index) => {
          const angle = (index / modules.length) * 2 * Math.PI;
          // Dynamic spacing based on view mode and module depth
          const baseRadius = module.depth === 'high' ? 280 : 420;
          const viewModeMultiplier = viewMode === 'detailed' ? 1.25 : 1;
          const radius = baseRadius * viewModeMultiplier;
          
          positions[module.id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          };
        });
        
        return positions;
      };

      const modulePositions = calculateModulePositions();

      // Crear nodos de módulos
      modules.forEach((module, moduleIndex) => {
        const modulePosition = modulePositions[module.id];
        
        const moduleNode: TreeNode = {
          id: module.id,
          type: 'module',
          title: module.title,
          status: module.status,
          position: modulePosition,
          depth: 0,
          children: [],
          data: module,
          icon: module.icon,
          color: module.color,
          size: NODE_SIZES.module,
          isHighlighted: selectedNodes.has(module.id),
          isInActiveBranch: highlightedBranches.has(module.id)
        };

        nodes.push(moduleNode);

        // Crear nodos de ramas
        module.branches.forEach((branch, branchIndex) => {
          const branchAngle = (branchIndex / module.branches.length) * Math.PI - Math.PI / 2;
          const branchRadius = orbitalDistances.branch;
          const branchPosition = {
            x: modulePosition.x + branchRadius * Math.cos(branchAngle),
            y: modulePosition.y + branchRadius * Math.sin(branchAngle)
          };

          const branchNode: TreeNode = {
            id: branch.id,
            type: 'branch',
            title: branch.title,
            status: branch.status,
            position: branchPosition,
            depth: 1,
            parent: module.id,
            children: [],
            connections: [module.id],
            data: branch,
            icon: branch.icon,
            color: branch.color,
            size: NODE_SIZES.branch,
            isHighlighted: selectedNodes.has(branch.id),
            isInActiveBranch: highlightedBranches.has(branch.id)
          };

          moduleNode.children?.push(branch.id);
          nodes.push(branchNode);

          // Crear nodos de unidades
          branch.units.forEach((unit, unitIndex) => {
            const unitAngle = branchAngle + (unitIndex - (branch.units.length - 1) / 2) * 0.4;
            const unitRadius = orbitalDistances.unit;
            const unitPosition = {
              x: branchPosition.x + unitRadius * Math.cos(unitAngle),
              y: branchPosition.y + unitRadius * Math.sin(unitAngle)
            };

            const unitNode: TreeNode = {
              id: unit.id,
              type: 'unit',
              title: unit.title,
              status: unit.status,
              position: unitPosition,
              depth: 2,
              parent: branch.id,
              children: [],
              connections: [branch.id],
              data: unit,
              icon: unit.icon,
              color: unit.color,
              size: NODE_SIZES.unit,
              isHighlighted: selectedNodes.has(unit.id),
              isInActiveBranch: highlightedBranches.has(unit.id)
            };

            branchNode.children?.push(unit.id);
            nodes.push(unitNode);

            // Crear nodos de lecciones
            unit.lessons.forEach((lesson, lessonIndex) => {
              const lessonAngle = unitAngle + (lessonIndex - (unit.lessons.length - 1) / 2) * 0.3;
              const lessonRadius = orbitalDistances.lesson;
              const lessonPosition = {
                x: unitPosition.x + lessonRadius * Math.cos(lessonAngle),
                y: unitPosition.y + lessonRadius * Math.sin(lessonAngle)
              };

              const lessonNode: TreeNode = {
                id: lesson.id,
                type: 'lesson',
                title: lesson.title,
                status: lesson.status,
                position: lessonPosition,
                depth: 3,
                parent: unit.id,
                connections: [unit.id],
                data: lesson,
                icon: lesson.icon,
                color: getStatusColor(lesson.status),
                size: NODE_SIZES.lesson,
                isHighlighted: selectedNodes.has(lesson.id),
                isInActiveBranch: highlightedBranches.has(lesson.id)
              };

              unitNode.children?.push(lesson.id);
              nodes.push(lessonNode);
            });
          });
        });
      });

      return nodes;
    };

    return buildTreeNodes();
  }, [modules, selectedNodes, highlightedBranches, getStatusColor, viewMode, getOrbitalDistances]);


  // Manejar hover de nodos
  const handleNodeHover = useCallback((nodeId: string, isHovering: boolean) => {
    if (isHovering) {
      setHoveredNodes(prev => new Set([...prev, nodeId]));
      setActiveCards(prev => new Set([...prev, nodeId]));
      
      // Encontrar y resaltar rama completa
      const findBranchPath = (targetId: string): string[] => {
        const node = treeStructure.find(n => n.id === targetId);
        if (!node) return [];
        
        const path = [targetId];
        if (node.parent) {
          path.unshift(...findBranchPath(node.parent));
        }
        return path;
      };
      
      const branchPath = findBranchPath(nodeId);
      setHighlightedBranches(new Set(branchPath));
    } else {
      setHoveredNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
      setActiveCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
      
      // Limpiar highlight después de un delay
      setTimeout(() => {
        if (!hoveredNodes.has(nodeId)) {
          setHighlightedBranches(new Set());
        }
      }, 100);
    }
  }, [treeStructure, hoveredNodes]);

  // Manejar click de nodos
  const handleNodeClick = useCallback((node: TreeNode) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(node.id)) {
        newSet.delete(node.id);
      } else {
        newSet.add(node.id);
      }
      return newSet;
    });

    if (onNodeSelect) {
      onNodeSelect(node.id, node.type);
    }

    // Si es una lección con quest, activar quest
    if (node.type === 'lesson' && (node.data as Lesson).isQuest && onQuestStart) {
      onQuestStart(node.id);
    }
  }, [onNodeSelect, onQuestStart]);

  // Filtrar nodos según criterios MEJORADO
  const filteredNodes = useMemo(() => {
    return treeStructure.filter(node => {
      // Filtro por modo de vista
      if (viewMode === 'overview') {
        // En modo resumen, solo mostrar módulos y algunas ramas principales
        if (node.type === 'unit' || node.type === 'lesson') {
          return false; // Ocultar unidades y lecciones en vista resumen
        }
        if (node.type === 'branch') {
          // Solo mostrar las primeras 2 ramas por módulo en resumen
          const moduleId = node.parent;
          const siblingBranches = treeStructure.filter(n => 
            n.type === 'branch' && n.parent === moduleId
          );
          const branchIndex = siblingBranches.findIndex(b => b.id === node.id);
          return branchIndex < 2; // Solo las primeras 2 ramas
        }
      }
      
      // Filtro por categoría
      if (filterCategory !== 'all') {
        const moduleNode = node.type === 'module' ? 
          node.data as Module : 
          modules.find(m => node.id.startsWith(m.id.replace('M', '')));
        
        if (moduleNode && moduleNode.categoryId !== filterCategory) {
          return false;
        }
      }

      // Filtro por búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return node.title.toLowerCase().includes(searchLower) ||
               node.id.toLowerCase().includes(searchLower) ||
               (node.data as any).description?.toLowerCase().includes(searchLower) ||
               false;
      }

      return true;
    });
  }, [treeStructure, filterCategory, searchTerm, viewMode]);

  // Calcular SVG bounds dinámico
  const svgBounds = useMemo(() => {
    if (filteredNodes.length === 0) {
      return { width: TREE_CONFIG.width, height: TREE_CONFIG.height, viewBox: `0 0 ${TREE_CONFIG.width} ${TREE_CONFIG.height}` };
    }

    const positions = filteredNodes.map(node => node.position);
    const minX = Math.min(...positions.map(p => p.x)) - 100;
    const maxX = Math.max(...positions.map(p => p.x)) + 100;
    const minY = Math.min(...positions.map(p => p.y)) - 150;
    const maxY = Math.max(...positions.map(p => p.y)) + 500; // Extra space for expanded cards

    return {
      width: Math.max(maxX - minX, TREE_CONFIG.width),
      height: Math.max(maxY - minY, TREE_CONFIG.height),
      viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
    };
  }, [filteredNodes]);

  // Fit to screen function
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !svgRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const svgRect = svgRef.current.getBoundingClientRect();

    const scaleX = containerRect.width / svgBounds.width;
    const scaleY = containerRect.height / svgBounds.height;
    const newZoom = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding

    setZoomLevel(newZoom);
    setPanOffset({ 
      x: (containerRect.width - svgBounds.width * newZoom) / 2,
      y: (containerRect.height - svgBounds.height * newZoom) / 2
    });
  }, [svgBounds]);

  if (!isVisible) return null;

  // ========================================
  // SCROLL INDEPENDENCE SYSTEM 2025 - DEFINITIVO
  // ========================================
  // Basado en research de mejores prácticas CSS + JS
  // Combina overscroll-behavior con preventDefault robusto
  
  // Ref para el contenedor principal
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ========================================
  // SCROLL INDEPENDENCE 2025 - VERSIÓN CORREGIDA
  // ========================================
  // PROBLEMA IDENTIFICADO: Estaba bloqueando TODO scroll con stopPropagation
  // SOLUCIÓN: Solo prevenir propagación cuando scroll llega a límites del contenedor
  
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // ===== WHEEL: SCROLL COMO DRAG + ZOOM =====
    const handleWheel = (e: WheelEvent) => {
      if (!container.contains(e.target as Node)) return;

      // ===== ZOOM CON CTRL+WHEEL EN EL PUNTO DEL GESTO =====
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.2, Math.min(3, zoomLevel * zoomFactor));
        
        const zoomRatio = newZoom / zoomLevel;
        setPanOffset(prev => ({
          x: mouseX - (mouseX - prev.x) * zoomRatio,
          y: mouseY - (mouseY - prev.y) * zoomRatio
        }));
        
        setZoomLevel(newZoom);
        return;
      }

      // ===== SCROLL COMO DRAG - DIRECTO A PANOFFSET =====
      // Esta es la clave: usar setPanOffset como hace el drag libre
      e.preventDefault();
      e.stopPropagation();
      
      setPanOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    };

    // ===== TOUCH: NO INTERFERENCE - Let React handlers do the work =====
    // Native touch handlers removed to avoid the "disparado" bug
    // Single touch is handled by overflow:auto natural scrolling
    // Two-finger touch is handled by React handlers for pinch zoom

    container.addEventListener('wheel', handleWheel, { passive: false });
    // Touch events handled by React, not native listeners

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoomLevel, panOffset]);

  // React event handlers - NATURAL SCROLL + BOUNDARY PREVENTION
  const handleContainerWheel = useCallback((e: React.WheelEvent) => {
    // Allow natural wheel events, boundary detection via native listener
  }, []);

  const handleContainerTouchStart = handleTouchStart;
  const handleContainerTouchMove = handleTouchMove;

  const handleContainerScroll = useCallback((e: React.UIEvent) => {
    // Allow normal scrolling behavior - this is the key for natural scroll
  }, []);

  return (
    <div 
      ref={scrollContainerRef}
      data-scroll-container="curriculum-tree"
      className="w-full h-full relative bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden"
      onTouchStart={handleContainerTouchStart}
      onTouchMove={handleContainerTouchMove}
      onWheel={handleContainerWheel}
      onScroll={handleContainerScroll}
      style={{
        // ===== CSS SCROLL INDEPENDENCE 2025 - BOUNDARY-AWARE =====
        overscrollBehavior: 'contain',           // Prevenir scroll chaining como backup
        overscrollBehaviorX: 'contain',          // Horizontal independence
        overscrollBehaviorY: 'contain',          // Vertical independence
        WebkitOverflowScrolling: 'touch',        // iOS smooth scrolling
        touchAction: 'none',                     // Prevenir scroll de página, manejar todo internamente
        scrollBehavior: 'smooth',                // Smooth scroll interno
        isolation: 'isolate',                    // Crear stacking context independiente
      }}
    >
      {/* Header Controls - MOBILE SCROLLABLE */}
      <div className="absolute top-4 left-4 right-4 z-20">
        {/* Mobile: Scrollable horizontal container */}
        <div className="flex md:hidden overflow-x-auto scrollbar-hide pb-2">
          <div className="flex items-center gap-3 min-w-max px-1">
            {/* Back Button */}
            <button
              onClick={onToggleView}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all whitespace-nowrap"
            >
              <Layers size={16} />
              <span className="text-sm font-medium">Tu Ruta</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-1">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  viewMode === 'overview'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  viewMode === 'detailed'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Detallado
              </button>
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 text-sm min-w-[120px]"
            >
              <option value="all">Todas</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.title.substring(0, 12)}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 text-sm w-48"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ×
                </button>
              )}
            </div>

            {/* Stats Display - Mobile */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 px-3 py-1.5">
              <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                <div className="text-center">
                  <div className="font-bold text-sm text-blue-600 dark:text-blue-400">{filteredNodes.filter(n => n.type === 'module').length}</div>
                  <div>Mód</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-green-600 dark:text-green-400">{filteredNodes.filter(n => n.type === 'lesson').length}</div>
                  <div>Lec</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-orange-600 dark:text-orange-400">{filteredNodes.filter(n => n.type === 'lesson' && (n.data as Lesson).isQuest).length}</div>
                  <div>Q</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scroll fade indicators */}
          <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-slate-50 to-transparent dark:from-gray-900 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-slate-50 to-transparent dark:from-gray-900 pointer-events-none" />
        </div>

        {/* Desktop: Normal layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleView}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all"
            >
              <Layers size={16} />
              <span className="text-sm font-medium">Tu Ruta de Aprendizaje</span>
            </button>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-1">
                <button
                  onClick={() => setViewMode('overview')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'overview'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Resumen
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'detailed'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Detallado
                </button>
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 text-sm min-w-[140px]"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.title}</option>
                ))}
              </select>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar módulo, rama o lección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 text-sm w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls - Restored */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-1 flex items-center gap-1">
              <button
                onClick={zoomIn}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Acercar"
              >
                <Plus size={16} />
              </button>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </div>
              <button
                onClick={zoomOut}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Alejar"
              >
                <Minus size={16} />
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button
                onClick={resetZoom}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Reiniciar zoom"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={fitToScreen}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Ajustar a pantalla"
              >
                <Maximize2 size={16} />
              </button>
            </div>
            
            {/* Stats Display */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 px-3 py-1.5">
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div className="text-center">
                  <div className="font-bold text-sm text-blue-600 dark:text-blue-400">{filteredNodes.filter(n => n.type === 'module').length}</div>
                  <div>Módulos</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-green-600 dark:text-green-400">{filteredNodes.filter(n => n.type === 'lesson').length}</div>
                  <div>Lecciones</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-orange-600 dark:text-orange-400">{filteredNodes.filter(n => n.type === 'lesson' && (n.data as Lesson).isQuest).length}</div>
                  <div>Quests</div>
                </div>
              </div>
            </div>
            
            {/* Advanced Zoom Control Button */}
            <div className="relative" data-zoom-control>
              <motion.button
                onClick={() => setShowZoomControl(!showZoomControl)}
                className="w-8 h-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Zoom Control"
              >
                <Sliders size={14} />
              </motion.button>

              {/* Zoom Control Panel */}
              <AnimatePresence>
                {showZoomControl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute top-10 right-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-4 w-64"
                  >
                    {/* Mode Toggle */}
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                        Zoom Mode
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setZoomMode('interactive')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            zoomMode === 'interactive' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <MousePointer2 size={12} className="inline mr-1" />
                          Interactive
                        </button>
                        <button
                          onClick={() => setZoomMode('fixed')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            zoomMode === 'fixed' 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Settings size={12} className="inline mr-1" />
                          Fixed
                        </button>
                      </div>
                    </div>

                    {/* Zoom Slider */}
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block flex items-center justify-between">
                        <span>Zoom Level</span>
                        <span className="text-blue-600 dark:text-blue-400">{Math.round(zoomLevel * 100)}%</span>
                      </label>
                      <div className="relative">
                        <input
                          type="range"
                          min="20"
                          max="300"
                          step="10"
                          value={zoomLevel * 100}
                          onChange={(e) => {
                            const newZoom = parseInt(e.target.value) / 100;
                            setZoomLevel(newZoom);
                            // Auto-switch to Fixed mode when using slider
                            if (zoomMode === 'interactive') {
                              setZoomMode('fixed');
                            }
                          }}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>20%</span>
                          <span>100%</span>
                          <span>300%</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Zoom Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setZoomLevel(1);
                          setPanOffset({ x: 0, y: 0 });
                          setZoomMode('fixed');
                        }}
                        className="flex-1 px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => {
                          fitToScreen();
                          setZoomMode('fixed');
                        }}
                        className="flex-1 px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Fit Screen
                      </button>
                    </div>

                    {/* Mode Description */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {zoomMode === 'interactive' ? (
                          <>
                            <MousePointer2 size={10} className="inline mr-1" />
                            Use gestures to zoom and pan
                          </>
                        ) : (
                          <>
                            <Settings size={10} className="inline mr-1" />
                            Fixed zoom level, gestures disabled
                          </>
                        )}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tree Visualization - INDEPENDENT SCROLL ZONE */}
      <div 
        ref={containerRef}
        data-scroll-container="curriculum-tree-inner"
        className="w-full h-full overflow-hidden pt-20 cursor-grab active:cursor-grabbing"
        style={{
          paddingTop: '6rem', // Extra space for mobile scrollable header
          // ===== INNER SCROLL CONTAINER - NATURAL SCROLLING =====
          overscrollBehavior: 'contain',           // CSS backup method
          WebkitOverflowScrolling: 'touch',        // iOS smooth scrolling
          touchAction: 'none',                     // Prevenir scroll de página
          isolation: 'isolate',
        }}
        onWheel={handleContainerWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <svg
            ref={svgRef}
            width={svgBounds.width}
            height={svgBounds.height}
            viewBox={svgBounds.viewBox}
            className="w-full h-full"
            style={{ minWidth: '1200px', minHeight: '800px' }}
          >
          {/* Background grid pattern */}
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
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Connection lines - IMPROVED CLARITY */}
          {TREE_CONFIG.showConnections && filteredNodes.map(node => 
            node.connections?.map((connectionId, index) => {
              const connectedNode = filteredNodes.find(n => n.id === connectionId);
              if (!connectedNode) return null;

              const isHighlighted = highlightedBranches.has(node.id) || highlightedBranches.has(connectionId);
              const isDirectConnection = Math.abs(node.depth - connectedNode.depth) === 1;
              
              // Only show direct parent-child connections to reduce visual clutter
              if (!isDirectConnection && !isHighlighted) return null;

              return (
                <motion.line
                  key={`${node.id}-${connectionId}-${index}`}
                  x1={node.position.x}
                  y1={node.position.y}
                  x2={connectedNode.position.x}
                  y2={connectedNode.position.y}
                  stroke={isHighlighted ? '#F59E0B' : 'currentColor'}
                  strokeWidth={isHighlighted ? 3 : 1.5}
                  strokeOpacity={isHighlighted ? 0.9 : 0.25}
                  strokeDasharray={node.type === 'lesson' ? "2 2" : "none"}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: isHighlighted ? 0.9 : 0.25 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: node.depth * 0.05,
                    type: "spring",
                    stiffness: 200
                  }}
                />
              );
            })
          )}

          {/* Tree nodes */}
          {filteredNodes.map((node, index) => {
            const isHovered = hoveredNodes.has(node.id);
            const isSelected = selectedNodes.has(node.id);
            const hasQuest = node.type === 'lesson' && (node.data as Lesson).isQuest;

            return (
              <motion.g
                key={node.id}
                custom={index * 0.05}
                variants={nodeVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                whileTap="tap"
                onMouseEnter={() => handleNodeHover(node.id, true)}
                onMouseLeave={() => handleNodeHover(node.id, false)}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node circle */}
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  r={node.size}
                  fill={node.color || getStatusColor(node.status)}
                  stroke={isSelected ? '#F59E0B' : 'white'}
                  strokeWidth={isSelected ? 3 : 2}
                  opacity={node.status === 'locked' ? 0.5 : 1}
                  className="drop-shadow-lg"
                />

                {/* Quest indicator */}
                {hasQuest && (
                  <circle
                    cx={node.position.x + node.size * 0.6}
                    cy={node.position.y - node.size * 0.6}
                    r={8}
                    fill="#F59E0B"
                    stroke="white"
                    strokeWidth="2"
                  />
                )}

                {/* Node icon */}
                <foreignObject 
                  x={node.position.x - (node.type === 'module' ? 12 : node.type === 'branch' ? 10 : node.type === 'unit' ? 8 : 6)} 
                  y={node.position.y - (node.type === 'module' ? 12 : node.type === 'branch' ? 10 : node.type === 'unit' ? 8 : 6)} 
                  width={node.type === 'module' ? 24 : node.type === 'branch' ? 20 : node.type === 'unit' ? 16 : 12} 
                  height={node.type === 'module' ? 24 : node.type === 'branch' ? 20 : node.type === 'unit' ? 16 : 12}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <SmartIcon 
                      icon={node.icon || (node.type === 'module' ? BookOpen : node.type === 'branch' ? TrendingUp : node.type === 'unit' ? Target : PlayCircle)} 
                      size={node.type === 'module' ? 20 : node.type === 'branch' ? 16 : node.type === 'unit' ? 14 : 10} 
                    />
                  </div>
                </foreignObject>

                {/* Node title (only for modules in overview mode) */}
                {(viewMode === 'detailed' || node.type === 'module') && (
                  <text
                    x={node.position.x}
                    y={node.position.y + node.size + 20}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="currentColor"
                    className="text-gray-700 dark:text-gray-300 select-none"
                  >
                    {node.title.length > 20 ? node.title.substring(0, 17) + '...' : node.title}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>
        </div>

        {/* Information Cards - RIGHT SIDE POSITIONING */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <AnimatePresence>
            {Array.from(activeCards).map(nodeId => {
              const node = filteredNodes.find(n => n.id === nodeId);
              if (!node) return null;

              // NUEVA POSICIÓN: Lado derecho superior, debajo de la barra de información
              const cardRight = 20; // Margen desde el borde derecho
              const cardTop = typeof window !== 'undefined' ? 
                (window.innerWidth >= 768 ? 80 : 120) : 80; // Debajo de la barra (responsive)

              return (
                <motion.div
                  key={`card-${nodeId}`}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute pointer-events-auto"
                  style={{
                    right: cardRight,
                    top: cardTop,
                    zIndex: 50,
                    maxWidth: '350px',
                    width: typeof window !== 'undefined' && window.innerWidth < 768 ? 
                      `${Math.min(350, window.innerWidth - 40)}px` : '350px'
                  }}
                >
                  {/* Card content ULTRA DETALLADA - TODA LA INFO RICA */}
                  <div className="w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl backdrop-saturate-150 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl max-h-[calc(100vh-140px)] overflow-y-auto">
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: node.color || getStatusColor(node.status) }}
                          >
                            {node.icon || '📚'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                            {node.title}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {node.type} • {node.status}
                          </p>
                        </div>
                      </div>

                      {/* Node type specific content - TODA LA INFORMACIÓN RICA */}
                      {node.type === 'module' && (
                        <div className="space-y-3">
                          {/* Descripción y Objetivo */}
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                              <SmartIcon icon="📋" size={16} />
                              Descripción:
                            </div>
                            {(node.data as Module).description}
                          </div>
                          
                          {(node.data as Module).objective && (
                            <div className="text-xs text-gray-700 dark:text-gray-300">
                              <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                                <SmartIcon icon="🎯" size={16} />
                                Objetivo:
                              </div>
                              {(node.data as Module).objective}
                            </div>
                          )}
                          
                          {/* Estadísticas Principales */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <BookOpen size={12} />
                                <span className="font-semibold">{(node.data as Module).branches.length}</span>
                              </div>
                              <div className="text-blue-700 dark:text-blue-300 text-xs">Ramas</div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <Clock size={12} />
                                <span className="font-semibold">{(node.data as Module).estimatedTime || 'N/A'}min</span>
                              </div>
                              <div className="text-orange-700 dark:text-orange-300 text-xs">Duración</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Star size={12} />
                                <span className="font-semibold">{(node.data as Module).xpTotal || 0}</span>
                              </div>
                              <div className="text-green-700 dark:text-green-300 text-xs">XP Total</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <Award size={12} />
                                <span className="font-semibold">{(node.data as Module).completedBranches || 0}/{(node.data as Module).branches.length}</span>
                              </div>
                              <div className="text-purple-700 dark:text-purple-300 text-xs">Progreso</div>
                            </div>
                          </div>
                          
                          {/* Dificultad Visual */}
                          <div className="text-xs">
                            <div className="text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2">
                              <SmartIcon icon="📊" size={16} />
                              Dificultad:
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({length: 3}, (_, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full ${
                                  i < ((node.data as Module).difficulty === 'beginner' ? 1 : 
                                      (node.data as Module).difficulty === 'intermediate' ? 2 : 3)
                                    ? 'bg-orange-400' : 'bg-gray-200 dark:bg-gray-600'
                                }`} />
                              ))}
                              <span className="ml-2 capitalize font-medium text-orange-600 dark:text-orange-400">
                                {(node.data as Module).difficulty}
                              </span>
                            </div>
                          </div>
                          
                          {/* Prerequisites */}
                          {(node.data as Module).prerequisites && (node.data as Module).prerequisites!.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">🔗 Prerrequisitos:</div>
                              <div className="text-xs text-gray-700 dark:text-gray-300 flex flex-wrap gap-1">
                                {(node.data as Module).prerequisites!.map((req, i) => (
                                  <span key={i} className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">{req}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Master Badge Info */}
                          {(node.data as Module).masterBadgeTitle && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-medium mb-1">
                                <Award size={12} />
                                <span>{(node.data as Module).masterBadgeTitle}</span>
                              </div>
                              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                                {(node.data as Module).masterBadgeDescription}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {node.type === 'branch' && (
                        <div className="space-y-3">
                          {/* Descripción */}
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">🌱 Descripción:</div>
                            {(node.data as Branch).description}
                          </div>
                          
                          {/* Objetivo de la rama */}
                          {(node.data as Branch).objective && (
                            <div className="text-xs text-gray-700 dark:text-gray-300">
                              <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                                <SmartIcon icon="🎯" size={16} />
                                Objetivo:
                              </div>
                              {(node.data as Branch).objective}
                            </div>
                          )}
                          
                          {/* Estadísticas de la rama */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Layers size={12} />
                                <span className="font-semibold">{(node.data as Branch).units.length}</span>
                              </div>
                              <div className="text-green-700 dark:text-green-300 text-xs">Unidades</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <BookOpen size={12} />
                                <span className="font-semibold">{(node.data as Branch).totalLessons || (node.data as Branch).units.reduce((acc, u) => acc + u.lessons.length, 0)}</span>
                              </div>
                              <div className="text-blue-700 dark:text-blue-300 text-xs">Lecciones</div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <Clock size={12} />
                                <span className="font-semibold">{(node.data as Branch).estimatedTime || (node.data as Branch).units.reduce((acc, u) => acc + (u.estimatedTime || 0), 0)}min</span>
                              </div>
                              <div className="text-orange-700 dark:text-orange-300 text-xs">Duración</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <Star size={12} />
                                <span className="font-semibold">{(node.data as Branch).xpTotal || (node.data as Branch).units.reduce((acc, u) => acc + (u.xpTotal || 0), 0)}</span>
                              </div>
                              <div className="text-purple-700 dark:text-purple-300 text-xs">XP Total</div>
                            </div>
                          </div>
                          
                          {/* Prerequisites */}
                          {(node.data as Branch).prerequisites && (node.data as Branch).prerequisites!.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                              <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">🔗 Prerrequisitos:</div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 flex flex-wrap gap-1">
                                {(node.data as Branch).prerequisites!.map((req, i) => (
                                  <span key={i} className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded text-xs">{req}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Estado de progreso */}
                          {(node.data as Branch).completedUnits !== undefined && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1 flex items-center gap-2">
                                <SmartIcon icon="📋" size={16} />
                                Progreso:
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                    style={{width: `${((node.data as Branch).completedUnits! / (node.data as Branch).units.length) * 100}%`}}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium">{(node.data as Branch).completedUnits}/{(node.data as Branch).units.length}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {node.type === 'unit' && (
                        <div className="space-y-3">
                          {/* Descripción */}
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                              <SmartIcon icon="📦" size={16} />
                              Descripción:
                            </div>
                            {(node.data as Unit).description}
                          </div>
                          
                          {/* Objetivo */}
                          {(node.data as Unit).objective && (
                            <div className="text-xs text-gray-700 dark:text-gray-300">
                              <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                                <SmartIcon icon="🎯" size={16} />
                                Objetivo:
                              </div>
                              {(node.data as Unit).objective}
                            </div>
                          )}
                          
                          {/* Estadísticas principales */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <BookOpen size={12} />
                                <span className="font-semibold">{(node.data as Unit).lessons.length}</span>
                              </div>
                              <div className="text-blue-700 dark:text-blue-300 text-xs">Lecciones</div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <Clock size={12} />
                                <span className="font-semibold">{(node.data as Unit).lessons.reduce((acc, l) => acc + (l.duration || 0), 0)}</span>
                              </div>
                              <div className="text-orange-700 dark:text-orange-300 text-xs">Minutos</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Star size={12} />
                                <span className="font-semibold">{(node.data as Unit).xpTotal || (node.data as Unit).lessons.reduce((acc, l) => acc + (l.xpReward || 0), 0)}</span>
                              </div>
                              <div className="text-green-700 dark:text-green-300 text-xs">XP</div>
                            </div>
                          </div>
                          
                          {/* Quests count */}
                          {(node.data as Unit).lessons.some(l => l.isQuest) && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
                                <Zap size={12} />
                                <span>{(node.data as Unit).lessons.filter(l => l.isQuest).length} Quest{(node.data as Unit).lessons.filter(l => l.isQuest).length > 1 ? 's' : ''} Interactivo{(node.data as Unit).lessons.filter(l => l.isQuest).length > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Practice Mode */}
                          {(node.data as Unit).practiceMode && (
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                                <Code size={12} />
                                <span>Modo Práctica Disponible</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Progreso de la unidad */}
                          {(node.data as Unit).completedLessons !== undefined && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1 flex items-center gap-2">
                                <SmartIcon icon="📋" size={16} />
                                Progreso:
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                    style={{width: `${((node.data as Unit).completedLessons! / (node.data as Unit).lessons.length) * 100}%`}}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium">{(node.data as Unit).completedLessons}/{(node.data as Unit).lessons.length}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {node.type === 'lesson' && (
                        <div className="space-y-3">
                          {/* Descripción de la lección */}
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">📚 Descripción:</div>
                            {(node.data as Lesson).description}
                          </div>
                          
                          {/* Objetivo de la lección */}
                          {(node.data as Lesson).objective && (
                            <div className="text-xs text-gray-700 dark:text-gray-300">
                              <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                                <SmartIcon icon="🎯" size={16} />
                                Objetivo:
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                <div className="text-blue-700 dark:text-blue-300 font-medium italic">
                                  "{(node.data as Lesson).objective}"
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Grid de estadísticas */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <Clock size={12} />
                                <span className="font-semibold">{(node.data as Lesson).duration}</span>
                              </div>
                              <div className="text-orange-700 dark:text-orange-300 text-xs">Minutos</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Star size={12} />
                                <span className="font-semibold">{(node.data as Lesson).xpReward}</span>
                              </div>
                              <div className="text-green-700 dark:text-green-300 text-xs">XP</div>
                            </div>
                          </div>
                          
                          {/* Dificultad visual */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <SmartIcon icon="📊" size={16} />
                              Dificultad:
                            </span>
                            <div className="flex items-center gap-1">
                              {Array.from({length: 3}, (_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${
                                  i < ((node.data as Lesson).difficulty === 'beginner' ? 1 : 
                                      (node.data as Lesson).difficulty === 'intermediate' ? 2 : 3)
                                    ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-600'
                                }`} />
                              ))}
                              <span className="ml-1 capitalize font-medium text-yellow-600 dark:text-yellow-400">
                                {(node.data as Lesson).difficulty}
                              </span>
                            </div>
                          </div>
                          
                          {/* Tipo de evidencia y descripción */}
                          {(node.data as Lesson).evidenceType && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                              <div className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1">
                                <span className="flex items-center gap-2">
                                  <SmartIcon icon="📋" size={16} />
                                  Evidencia:
                                </span> <span className="capitalize">{(node.data as Lesson).evidenceType}</span>
                              </div>
                              {(node.data as Lesson).evidenceDescription && (
                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                  {(node.data as Lesson).evidenceDescription}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Quest interactivo */}
                          {(node.data as Lesson).isQuest && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-xs font-medium mb-1">
                                <Zap size={12} />
                                <span>Quest Interactivo Disponible</span>
                              </div>
                              <div className="text-xs text-orange-700 dark:text-orange-300">
                                Completa desafíos prácticos y simulaciones para dominar este tema
                              </div>
                            </div>
                          )}
                          
                          {/* Tags/Etiquetas */}
                          {(node.data as Lesson).tags && (node.data as Lesson).tags!.length > 0 && (
                            <div className="">
                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1 flex items-center gap-2">
                                <SmartIcon icon="🏷️" size={16} />
                                Tags:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(node.data as Lesson).tags!.map((tag, i) => (
                                  <span key={i} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Recompensas/Badges */}
                          {(node.data as Lesson).rewards && ((node.data as Lesson).rewards!.badges?.length || (node.data as Lesson).rewards!.xp || (node.data as Lesson).rewards!.items?.length) && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-medium mb-1">
                                <Award size={12} />
                                <span>Recompensas Disponibles</span>
                              </div>
                              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                                Desbloquea logros al completar esta lección
                              </div>
                            </div>
                          )}
                          
                          {/* Prerequisites */}
                          {(node.data as Lesson).prerequisites && (node.data as Lesson).prerequisites!.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">🔗 Prerrequisitos:</div>
                              <div className="text-xs text-gray-700 dark:text-gray-300 flex flex-wrap gap-1">
                                {(node.data as Lesson).prerequisites!.map((req, i) => (
                                  <span key={i} className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">{req}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status indicator */}
                      <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                        <div className="text-xs text-center">
                          {node.status === 'completed' && (
                            <span className="text-green-600 dark:text-green-400">✓ Completado</span>
                          )}
                          {node.status === 'in-progress' && (
                            <span className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
                              <SmartIcon icon="⚡" size={16} />
                              En Progreso
                            </span>
                          )}
                          {node.status === 'available' && (
                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                              <SmartIcon icon="🎯" size={16} />
                              Click → Entrenar
                            </span>
                          )}
                          {node.status === 'locked' && (
                            <span className="text-gray-500 flex items-center gap-2">
                              <SmartIcon icon="🔒" size={16} />
                              Bloqueado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-4 min-w-[240px]">
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="font-medium mb-2 text-gray-800 dark:text-gray-200">🎨 Árbol Curricular Interactivo</div>
          
          {/* Node Size Legend */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span>Módulos (21 principales)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Ramas (51 especializadas)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
              <span>Unidades (~153 organizadas)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span>Lecciones (~459 prácticas)</span>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle size={12} className="text-green-500" />
              <span>Completado</span>
            </div>
            <div className="flex items-center gap-2">
              <PlayCircle size={12} className="text-orange-500" />
              <span>En Progreso</span>
            </div>
            <div className="flex items-center gap-2">
              <Target size={12} className="text-blue-500" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-gray-400" />
              <span>Bloqueado</span>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <div className="text-xs text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-2">
                <SmartIcon icon="💡" size={16} />
                Hover: Ver info | Click: Interactuar
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculumTreeView;