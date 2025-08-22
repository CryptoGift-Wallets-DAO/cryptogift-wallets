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
  Settings,
  FileText,
  RefreshCw,
  Key,
  HardDrive,
  PenTool,
  Rocket,
  Wallet,
  Blocks,
  Link
} from 'lucide-react';

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
import curriculumData from '../../data/curriculumData';

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
    if (curriculumData && curriculumData.modules && curriculumData.modules.length > 0) {
      return curriculumData.modules;
    }
    // Fallback - should not happen with real data
    return [
    // ===== MÓDULOS PRINCIPALES (M0-M8) - PROFUNDIDAD ALTA =====
    {
      id: 'M0',
      title: 'Onboarding & Seguridad',
      description: 'Usuario nuevo: instalar, crear, respaldar y usar wallet con hábitos seguros',
      objective: 'Dominar el setup seguro de wallets y entender gas/redes',
      branches: [
        {
          id: 'M0.R1',
          title: 'Wallets (creación, backup, uso inicial)',
          description: 'Instalación, configuración y primeras transacciones',
          units: [
            {
              id: 'M0.R1.U1',
              title: 'Instalación & setup',
              description: 'MetaMask setup y configuración de redes',
              lessons: [
                {
                  id: 'M0.R1.U1.L1',
                  title: 'Instalar MetaMask (mobile/desktop)',
                  objective: 'Ahora sé instalar y configurar MetaMask',
                  description: 'Instalación paso a paso de MetaMask en mobile y desktop',
                  duration: 3,
                  difficulty: 'beginner',
                  evidenceType: 'screenshot',
                  evidenceDescription: 'Screenshot de wallet configurada',
                  xpReward: 50,
                  status: 'available',
                  icon: Code,
                  tags: ['wallet', 'setup', 'metamask']
                },
                {
                  id: 'M0.R1.U1.L2',
                  title: 'Configurar Base/Mainnet & Base Sepolia',
                  objective: 'Ahora sé configurar redes en mi wallet',
                  description: 'Agregar RPCs y explorers de redes Base',
                  duration: 4,
                  difficulty: 'beginner',
                  evidenceType: 'screenshot',
                  evidenceDescription: 'Screenshot mostrando redes configuradas',
                  xpReward: 60,
                  status: 'locked',
                  prerequisites: ['M0.R1.U1.L1'],
                  icon: Globe,
                  tags: ['networks', 'rpc', 'base']
                },
                {
                  id: 'M0.R1.U1.L3',
                  title: 'Habilitar biometría/PIN',
                  objective: 'Ahora sé asegurar mi wallet con biometría',
                  description: 'Configurar seguridad biométrica y PIN de acceso',
                  duration: 2,
                  difficulty: 'beginner',
                  evidenceType: 'demo',
                  evidenceDescription: 'Demostración de acceso seguro',
                  xpReward: 40,
                  status: 'locked',
                  prerequisites: ['M0.R1.U1.L2'],
                  icon: Lock,
                  tags: ['security', 'biometrics', 'pin']
                }
              ],
              xpTotal: 150,
              estimatedTime: 9,
              status: 'available',
              completedLessons: 0,
              icon: Settings,
              color: '#3B82F6'
            },
            {
              id: 'M0.R1.U2',
              title: 'Backup responsable',
              description: 'Seed phrases y recuperación segura',
              lessons: [
                {
                  id: 'M0.R1.U2.L1',
                  title: 'Anotar seed phrase seguramente',
                  objective: 'Ahora sé respaldar mi seed phrase de forma segura',
                  description: 'Métodos seguros para anotar y guardar seed phrases',
                  duration: 5,
                  difficulty: 'beginner',
                  evidenceType: 'quiz',
                  evidenceDescription: 'Quiz sobre mejores prácticas de backup',
                  xpReward: 80,
                  status: 'locked',
                  prerequisites: ['M0.R1.U1.L3'],
                  icon: FileText,
                  tags: ['backup', 'seed', 'security']
                },
                {
                  id: 'M0.R1.U2.L2',
                  title: 'Probar recuperación simulada',
                  objective: 'Ahora sé recuperar mi wallet',
                  description: 'Simulación de proceso de recuperación',
                  duration: 4,
                  difficulty: 'intermediate',
                  evidenceType: 'quest-simulation',
                  evidenceDescription: 'Completar simulación de recuperación',
                  xpReward: 70,
                  status: 'locked',
                  prerequisites: ['M0.R1.U2.L1'],
                  icon: RefreshCw,
                  tags: ['recovery', 'simulation', 'backup']
                },
                {
                  id: 'M0.R1.U2.L3',
                  title: 'Diferenciar seed vs. private key vs. password',
                  objective: 'Ahora entiendo los diferentes tipos de claves',
                  description: 'Conceptos clave: seed, private key, password',
                  duration: 3,
                  difficulty: 'beginner',
                  evidenceType: 'quiz',
                  evidenceDescription: 'Quiz conceptual sobre tipos de claves',
                  xpReward: 60,
                  status: 'locked',
                  prerequisites: ['M0.R1.U2.L2'],
                  icon: Key,
                  tags: ['concepts', 'keys', 'security']
                }
              ],
              xpTotal: 210,
              estimatedTime: 12,
              status: 'locked',
              completedLessons: 0,
              icon: HardDrive,
              color: '#10B981'
            },
            {
              id: 'M0.R1.U3',
              title: 'Primeras firmas ✪',
              description: 'Firmas EIP-191 y primeras transacciones',
              lessons: [
                {
                  id: 'M0.R1.U3.L1',
                  title: 'Firmar mensaje EIP-191',
                  objective: 'Ahora sé firmar mensajes de forma segura',
                  description: 'Firmas criptográficas y verificación local',
                  duration: 4,
                  difficulty: 'intermediate',
                  evidenceType: 'demo',
                  evidenceDescription: 'Demostración de firma y verificación',
                  xpReward: 90,
                  status: 'locked',
                  prerequisites: ['M0.R1.U2.L3'],
                  icon: PenTool,
                  tags: ['signatures', 'eip191', 'crypto']
                },
                {
                  id: 'M0.R1.U3.L2',
                  title: '✪ Enviar 0.001 tETH en Base Sepolia',
                  objective: 'Ahora sé realizar transacciones on-chain',
                  description: 'Primera transacción real en testnet',
                  duration: 5,
                  difficulty: 'intermediate',
                  evidenceType: 'quest-onchain',
                  evidenceDescription: 'Tx hash de transacción exitosa',
                  xpReward: 150,
                  status: 'locked',
                  prerequisites: ['M0.R1.U3.L1'],
                  isQuest: true,
                  questType: 'onchain',
                  questInstructions: 'Enviar 0.001 tETH a la dirección proporcionada',
                  verificationSteps: [
                    'Copiar tx hash',
                    'Verificar en BaseScan',
                    'Confirmar recepción'
                  ],
                  icon: Rocket,
                  tags: ['transaction', 'testnet', 'quest']
                },
                {
                  id: 'M0.R1.U3.L3',
                  title: 'Agregar token por contrato',
                  objective: 'Ahora sé agregar tokens custom a mi wallet',
                  description: 'watchAsset y gestión de tokens ERC-20',
                  duration: 3,
                  difficulty: 'beginner',
                  evidenceType: 'screenshot',
                  evidenceDescription: 'Screenshot del token agregado en wallet',
                  xpReward: 70,
                  status: 'locked',
                  prerequisites: ['M0.R1.U3.L2'],
                  icon: Coins,
                  tags: ['tokens', 'erc20', 'wallet']
                }
              ],
              xpTotal: 310,
              estimatedTime: 12,
              status: 'locked',
              completedLessons: 0,
              icon: '✪',
              color: '#F59E0B'
            }
          ],
          xpTotal: 670,
          estimatedTime: 33,
          status: 'available',
          completedUnits: 0,
          badgeId: 'wallet-master',
          badgeTitle: 'Wallet Master',
          badgeDescription: 'Maestro en configuración y uso de wallets',
          icon: Wallet,
          color: '#3B82F6',
          position: { x: 200, y: 100 }
        },
        {
          id: 'M0.R2',
          title: 'Seguridad del usuario',
          description: 'Higiene digital, phishing y recuperación',
          units: [
            // U1: Higiene digital, U2: Phishing 101, U3: Recuperación y guardianes
          ],
          xpTotal: 580,
          estimatedTime: 28,
          status: 'locked',
          completedUnits: 0,
          badgeId: 'security-guardian',
          badgeTitle: 'Security Guardian',
          badgeDescription: 'Protector de activos digitales',
          icon: Shield,
          color: '#EF4444',
          position: { x: 400, y: 150 }
        },
        {
          id: 'M0.R3',
          title: 'Redes & gas',
          description: 'Conceptos de gas, cuentas y quest de consolidación',
          units: [
            // U1: Conceptos de gas, U2: Cuentas y nonces, U3: Quest de consolidación
          ],
          xpTotal: 490,
          estimatedTime: 25,
          status: 'locked',
          completedUnits: 0,
          badgeId: 'gas-optimizer',
          badgeTitle: 'Gas Optimizer',
          badgeDescription: 'Experto en optimización de transacciones',
          icon: Zap,
          color: '#8B5CF6',
          position: { x: 600, y: 100 }
        }
      ],
      xpTotal: 1740,
      estimatedTime: 86, // ~1.4 horas
      status: 'available',
      completedBranches: 0,
      categoryId: 'fundamentos-onboarding',
      categoryTitle: 'Fundamentos & Onboarding',
      depth: 'high',
      masterBadgeId: 'onboarding-champion',
      masterBadgeTitle: 'Onboarding Champion',
      masterBadgeDescription: 'Completó el proceso completo de onboarding seguro',
      icon: Target,
      color: '#3B82F6',
      position: { x: 150 + (0 % 6) * 200, y: 80 + Math.floor(0 / 6) * 200 }, // M0: primera fila, primera posición
      hasQuests: true,
      questsCount: 3,
      badgesAvailable: 4
    },
    
    // M1: Fundamentos Blockchain
    {
      id: 'M1',
      title: 'Fundamentos Blockchain',
      description: 'Datos, bloques, consenso y finalidad para leer explorers',
      objective: 'Entender blockchain para razonar sobre seguridad',
      branches: [
        {
          id: 'M1.R1',
          title: 'Datos y bloques',
          description: 'Criptografía, estructura de bloques y finalidad',
          units: [],
          xpTotal: 520,
          estimatedTime: 26,
          status: 'locked',
          completedUnits: 0,
          prerequisites: ['M0'],
          icon: Blocks,
          color: '#059669',
          position: { x: 350, y: 120 }
        },
        {
          id: 'M1.R2',
          title: 'Consenso',
          description: 'PoW, PoS y redes modulares',
          units: [],
          xpTotal: 480,
          estimatedTime: 24,
          status: 'locked',
          completedUnits: 0,
          icon: '🤝',
          color: '#DC2626',
          position: { x: 550, y: 180 }
        },
        {
          id: 'M1.R3',
          title: 'Herramientas',
          description: 'Explorers, RPC y nodos',
          units: [],
          xpTotal: 410,
          estimatedTime: 21,
          status: 'locked',
          completedUnits: 0,
          icon: '🔧',
          color: '#7C3AED',
          position: { x: 750, y: 120 }
        }
      ],
      xpTotal: 1410,
      estimatedTime: 71,
      status: 'locked',
      completedBranches: 0,
      categoryId: 'fundamentos-onboarding',
      categoryTitle: 'Fundamentos & Onboarding',
      depth: 'high',
      prerequisites: ['M0'],
      icon: Link,
      color: '#059669',
      position: { x: 150 + (1 % 6) * 200, y: 80 + Math.floor(1 / 6) * 200 }, // M1: primera fila, segunda posición
      hasQuests: true,
      questsCount: 2,
      badgesAvailable: 4
    },

    // M2: Bitcoin
    {
      id: 'M2',
      title: 'Bitcoin',
      description: 'UTXO, Lightning, historia y ecosistema Bitcoin',
      objective: 'Dominar el modelo UTXO y Lightning Network',
      branches: [
        {
          id: 'M2.R1',
          title: 'Modelo UTXO',
          description: 'Transacciones, seguridad y Lightning intro',
          units: [],
          xpTotal: 450,
          estimatedTime: 22,
          status: 'locked',
          completedUnits: 0,
          icon: '⚡',
          color: '#F97316',
          position: { x: 550, y: 100 }
        },
        {
          id: 'M2.R2',
          title: 'Historia & economía',
          description: 'Origen, halving y escalado',
          units: [],
          xpTotal: 380,
          estimatedTime: 19,
          status: 'locked',
          completedUnits: 0,
          icon: '📈',
          color: '#EAB308',
          position: { x: 750, y: 160 }
        },
        {
          id: 'M2.R3',
          title: 'Ecosistema',
          description: 'Herramientas, riesgos y práctica',
          units: [],
          xpTotal: 420,
          estimatedTime: 21,
          status: 'locked',
          completedUnits: 0,
          icon: Globe,
          color: '#6366F1',
          position: { x: 950, y: 100 }
        }
      ],
      xpTotal: 1250,
      estimatedTime: 62,
      status: 'locked',
      completedBranches: 0,
      categoryId: 'protocolos-base-computo',
      categoryTitle: 'Protocolos Base & Cómputo',
      depth: 'high',
      prerequisites: ['M1'],
      icon: Coins,
      color: '#F97316',
      position: { x: 150 + (2 % 6) * 200, y: 80 + Math.floor(2 / 6) * 200 }, // M2: primera fila, tercera posición
      hasQuests: true,
      questsCount: 4,
      badgesAvailable: 4
    },

    // ... Continuar con M3-M8 con profundidad alta
    // ... Luego M9-M20 con profundidad media

    // Placeholder para los demás módulos (se implementarán progresivamente)
    ...Array.from({ length: 18 }, (_, i) => ({
      id: `M${i + 3}`,
      title: `Módulo ${i + 3}`,
      description: `Descripción del módulo ${i + 3}`,
      objective: `Objetivo del módulo ${i + 3}`,
      branches: [],
      xpTotal: 800 + i * 50,
      estimatedTime: 40 + i * 2,
      status: 'locked' as ModuleStatus,
      completedBranches: 0,
      categoryId: 'category-placeholder',
      categoryTitle: 'Categoría Placeholder',
      depth: i < 6 ? 'high' as const : 'medium' as const,
      prerequisites: [`M${i + 2}`],
      icon: BookOpen,
      color: '#6B7280',
      position: { x: 150 + (i % 6) * 200, y: 80 + Math.floor(i / 6) * 200 },
      hasQuests: true,
      questsCount: i < 6 ? 3 : 2,
      badgesAvailable: i < 6 ? 4 : 3
    }))
    ];
  }, [modules]);

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
                            <Star className="w-3 h-3" />
                            <span className="text-xs font-semibold">Quest</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Badges - Compact */}
                    {'hasQuests' in nodeData && nodeData.hasQuests && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-semibold">
                          <Star className="w-2.5 h-2.5 mr-0.5" />
                          {nodeData.questsCount}Q
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-semibold">
                          <Award className="w-2.5 h-2.5 mr-0.5" />
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
                          <Lock className="w-3 h-3" />
                          Bloqueado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" />
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