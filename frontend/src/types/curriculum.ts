/**
 * CURRICULUM TREE TYPES - CryptoGift Academy
 * ==========================================
 * 
 * Tipos TypeScript para el sistema completo de árbol curricular.
 * Arquitectura: M.R.U.L (Módulo.Rama.Unidad.Lección)
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

// ========== TIPOS BASE ==========

export type ModuleStatus = 'locked' | 'available' | 'in-progress' | 'completed';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type EvidenceType = 'quiz' | 'quest-onchain' | 'quest-simulation' | 'screenshot' | 'demo';

// ========== LECCIÓN (HOJA DEL ÁRBOL) ==========
export interface Lesson {
  id: string;                    // Ej: "0.1.1.1" (M.R.U.L)
  title: string;                 // "Instalar MetaMask (mobile/desktop)"
  objective: string;             // "Ahora sé instalar y configurar MetaMask"
  description: string;           // Descripción detallada
  duration: number;              // Minutos estimados (2-5 min micro-learning)
  difficulty: Difficulty;
  evidenceType: EvidenceType;    // Tipo de evidencia requerida
  evidenceDescription: string;   // "Screenshot de wallet configurada"
  xpReward: number;              // XP otorgado al completar
  prerequisites?: string[];      // IDs de lecciones prerequisito
  status: ModuleStatus;
  
  // Quest específicos
  isQuest?: boolean;             // Si es Quest ✪
  questType?: 'onchain' | 'simulation' | 'demo';
  questInstructions?: string;    // Instrucciones específicas del quest
  verificationSteps?: string[];  // Pasos para verificar completion
  
  // Metadata para visualización
  icon?: string;                 // Emoji o ícono
  tags?: string[];               // ["gas", "mobile", "setup"]
  estimatedCompletionTime?: number;
}

// ========== UNIDAD ==========
export interface Unit {
  id: string;                    // Ej: "0.1.1" (M.R.U)
  title: string;                 // "Instalación & setup"
  description: string;
  lessons: Lesson[];             // 3 lecciones típicamente
  xpTotal: number;               // XP total de todas las lecciones
  estimatedTime: number;         // Tiempo total estimado
  status: ModuleStatus;
  completedLessons: number;
  
  // Metadata visual
  icon?: string;
  color?: string;                // Color para la visualización
}

// ========== RAMA ==========
export interface Branch {
  id: string;                    // Ej: "0.1" (M.R)
  title: string;                 // "Wallets (creación, backup, uso inicial)"
  description: string;
  units: Unit[];                 // 3 unidades típicamente
  xpTotal: number;
  estimatedTime: number;
  status: ModuleStatus;
  completedUnits: number;
  
  // Badge al completar rama
  badgeId?: string;
  badgeTitle?: string;
  badgeDescription?: string;
  
  // Metadata visual
  icon?: string;
  color?: string;
  position?: { x: number; y: number }; // Para visualización de árbol
}

// ========== MÓDULO ==========
export interface Module {
  id: string;                    // Ej: "0" o "M0"
  title: string;                 // "Onboarding & Seguridad"
  description: string;
  objective: string;             // Objetivo general del módulo
  branches: Branch[];            // 2-3 ramas dependiendo del módulo
  xpTotal: number;
  estimatedTime: number;         // En minutos
  status: ModuleStatus;
  completedBranches: number;
  
  // Materia madre
  categoryId: string;            // "fundamentos-onboarding"
  categoryTitle: string;         // "Fundamentos & Onboarding"
  
  // Badge al completar módulo completo
  masterBadgeId?: string;
  masterBadgeTitle?: string;
  masterBadgeDescription?: string;
  
  // Configuración de profundidad
  depth: 'high' | 'medium';     // M0-M8: high, M9-M20: medium
  
  // Prerequisites a nivel módulo
  prerequisites?: string[];      // IDs de módulos prerequisito
  
  // Metadata visual
  icon?: string;
  color?: string;
  position?: { x: number; y: number };
  
  // Gamificación
  hasQuests: boolean;
  questsCount: number;
  badgesAvailable: number;
}

// ========== MATERIA MADRE ==========
export interface Category {
  id: string;                    // "fundamentos-onboarding"
  title: string;                 // "Fundamentos & Onboarding"
  description: string;
  modules: string[];             // IDs de módulos en esta categoría
  color: string;                 // Color principal de la categoría
  icon: string;
  order: number;                 // Orden de presentación
}

// ========== CURRICULUM COMPLETO ==========
export interface Curriculum {
  version: string;               // "v0.1"
  title: string;                 // "CG Academy — Árbol Curricular Maestro"
  description: string;
  lastUpdated: string;           // ISO date
  
  categories: Category[];        // 8 materias madres
  modules: Module[];             // 21 módulos
  
  // Métricas globales
  totalXP: number;
  totalLessons: number;
  totalQuests: number;
  totalBadges: number;
  estimatedTotalTime: number;    // En horas
  
  // Configuración de gamificación
  xpPerLevel: number;            // XP necesario por nivel
  streakBonusMultiplier: number;
  leaderboardEnabled: boolean;
}

// ========== PROGRESO DEL USUARIO ==========
export interface UserProgress {
  userId: string;
  currentLevel: number;
  totalXP: number;
  currentXP: number;             // XP en el nivel actual
  streak: number;                // Días consecutivos
  
  // Progreso por módulo
  moduleProgress: Record<string, {
    status: ModuleStatus;
    completedBranches: number;
    totalBranches: number;
    completedLessons: number;
    totalLessons: number;
    xpEarned: number;
    lastActivity: string;        // ISO date
    badges: string[];            // IDs de badges obtenidos
  }>;
  
  // Badges y achievements
  badges: string[];              // Todos los badges obtenidos
  achievements: string[];        // Achievements especiales
  
  // Métricas de learning analytics
  totalTimeSpent: number;        // En minutos
  averageSessionTime: number;
  completionRate: number;        // % de lecciones completadas exitosamente
  questsCompleted: number;
  
  // Personalización
  preferredDifficulty?: Difficulty;
  learningPath?: string[];       // Ruta personalizada de lecciones
  bookmarks?: string[];          // Lecciones marcadas
}

// ========== TIPOS PARA VISUALIZACIÓN ==========
export interface TreeNode {
  id: string;
  type: 'module' | 'branch' | 'unit' | 'lesson';
  title: string;
  status: ModuleStatus;
  position: { x: number; y: number };
  connections?: string[];        // IDs de nodos conectados
  depth: number;                 // Nivel en el árbol (0 = módulo, 3 = lección)
  parent?: string;               // ID del nodo padre
  children?: string[];           // IDs de nodos hijos
  
  // Metadata para la visualización
  icon?: string;
  color?: string;
  size?: number;                 // Tamaño del nodo
  isHighlighted?: boolean;       // Si está seleccionado/iluminado
  isInActiveBranch?: boolean;    // Si está en la rama activa
  
  // Datos del curriculum
  data: Module | Branch | Unit | Lesson;
}

export interface TreeVisualizationConfig {
  width: number;
  height: number;
  nodeSpacing: { x: number; y: number };
  levelSpacing: number;
  
  // Configuración visual
  showConnections: boolean;
  animateEntrance: boolean;
  enableHover: boolean;
  enableSelection: boolean;
  
  // Configuración de filtros
  showLockedContent: boolean;
  filterByCategory?: string;
  filterByDifficulty?: Difficulty[];
  filterByStatus?: ModuleStatus[];
}

// ========== EVENTOS Y ACCIONES ==========
export interface CurriculumAction {
  type: 'SELECT_NODE' | 'HOVER_NODE' | 'COMPLETE_LESSON' | 'START_QUEST' | 'EARN_BADGE';
  payload: {
    nodeId: string;
    userId?: string;
    metadata?: Record<string, any>;
  };
}

export interface LessonCompletionData {
  lessonId: string;
  userId: string;
  completedAt: string;           // ISO date
  evidence?: {
    type: EvidenceType;
    data: string;                // Screenshot URL, tx hash, etc.
    verified: boolean;
  };
  xpEarned: number;
  timeSpent: number;             // En segundos
  attempts: number;              // Intentos si fue quiz
  score?: number;                // Score en quiz (0-100)
}

export default {
  Module,
  Branch,
  Unit,
  Lesson,
  Category,
  Curriculum,
  UserProgress,
  TreeNode,
  TreeVisualizationConfig,
  CurriculumAction,
  LessonCompletionData
};