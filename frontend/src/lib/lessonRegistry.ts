/**
 * LESSON REGISTRY - SISTEMA AUTOMÁTICO DE DETECCIÓN DE LECCIONES
 * Registry centralizado que mantiene todas las lecciones disponibles
 * de Knowledge Academy para uso automático en Educational Requirements
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

export interface LessonDefinition {
  id: string;
  title: string;
  description: string;
  estimatedTime: number; // en minutos
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  
  // Knowledge Academy metadata
  knowledgePath: string; // ruta en /knowledge/
  thumbnailUrl?: string;
  
  // Educational Requirements metadata
  educationalValue: string; // que aprende el usuario
  prerequisites?: string[];
  tags: string[];
}

/**
 * REGISTRO CENTRAL DE LECCIONES
 * 
 * IMPORTANTE: Cada lección que se agregue aquí automáticamente estará 
 * disponible tanto en Knowledge Academy como en Educational Requirements
 */
export const LESSON_REGISTRY: Record<string, LessonDefinition> = {
  'sales-masterclass': {
    id: 'sales-masterclass',
    title: 'Sales Masterclass - De $0 a $100M en 15 minutos',
    description: 'La presentación definitiva de CryptoGift. Descubre cómo revolucionamos Web3 con regalos sin gas, zero custodia y adopción masiva.',
    estimatedTime: 15,
    difficulty: 'beginner',
    category: 'Proyecto CryptoGift',
    
    knowledgePath: '/knowledge/sales-masterclass',
    thumbnailUrl: '/images/masterclass-og.png',
    
    educationalValue: 'Comprende el proyecto CryptoGift, su propuesta de valor única, la tecnología ERC-6551, y por qué representa una revolución en Web3',
    prerequisites: [],
    tags: ['cryptogift', 'nft-wallets', 'erc-6551', 'blockchain', 'web3', 'revolución']
  }
};

/**
 * UTILIDADES DEL REGISTRY
 */

// Obtener todas las lecciones disponibles
export function getAllLessons(): LessonDefinition[] {
  return Object.values(LESSON_REGISTRY);
}

// Obtener lección por ID
export function getLessonById(id: string): LessonDefinition | null {
  return LESSON_REGISTRY[id] || null;
}

// Obtener lecciones por categoría
export function getLessonsByCategory(category: string): LessonDefinition[] {
  return getAllLessons().filter(lesson => lesson.category === category);
}

// Obtener lecciones por dificultad
export function getLessonsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): LessonDefinition[] {
  return getAllLessons().filter(lesson => lesson.difficulty === difficulty);
}

// Obtener lecciones para Educational Requirements (formato específico)
export function getLessonsForEducationalRequirements(): Array<{
  id: number; // ID numérico para compatibilidad con sistema actual
  name: string;
  estimatedTime: number;
  description?: string;
}> {
  return getAllLessons().map((lesson, index) => ({
    id: index + 1, // ID numérico empezando en 1
    name: lesson.title,
    estimatedTime: lesson.estimatedTime,
    description: lesson.educationalValue
  }));
}

// Verificar si una lección existe
export function lessonExists(id: string): boolean {
  return id in LESSON_REGISTRY;
}

// Obtener metadatos de Knowledge Academy
export function getKnowledgeMetadata(id: string) {
  const lesson = getLessonById(id);
  if (!lesson) return null;
  
  return {
    title: lesson.title,
    description: lesson.description,
    path: lesson.knowledgePath,
    thumbnail: lesson.thumbnailUrl,
    estimatedTime: lesson.estimatedTime,
    difficulty: lesson.difficulty,
    category: lesson.category
  };
}

/**
 * SISTEMA AUTOMÁTICO
 * 
 * Al agregar una nueva lección a LESSON_REGISTRY:
 * 1. Automáticamente aparecerá en Knowledge Academy
 * 2. Automáticamente estará disponible en Educational Requirements selector
 * 3. LessonModalWrapper manejará el renderizado en ambos contextos
 * 4. Mantiene consistencia total entre Knowledge y Educational modes
 */

export default LESSON_REGISTRY;