/**
 * EDUCATIONAL MODULE MAPPING - SISTEMA CENTRALIZADO DE MAPEO
 * 
 * ⚠️ LEY ABSOLUTA: CADA EDUCATIONAL REQUIREMENT DEBE CARGAR SU MÓDULO ESPECÍFICO
 * 
 * Este archivo es la ÚNICA fuente de verdad para el mapeo de módulos educativos.
 * NUNCA modifiques este mapeo sin actualizar EDUCATIONAL_MAPPING_LAW.md
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

export interface ModuleMapping {
  lessonId: string;
  component: string;
  name: string;
  estimatedTime: number;
  description: string;
}

/**
 * MAPEO OFICIAL DE MÓDULOS EDUCATIVOS
 * 
 * ID 1: Crear Wallet Segura → ClaimFirstGift
 * ID 2: Seguridad Básica → SecurityBasics (pendiente implementación)
 * ID 3: Entender NFTs → NFTBasics (pendiente implementación)
 * ID 4: DeFi Básico → DeFiIntro (pendiente implementación)
 * ID 5: Proyecto CryptoGift → SalesMasterclass ⚠️ CRÍTICO
 */
export const EDUCATIONAL_MODULE_MAPPING: Record<number, ModuleMapping> = {
  1: {
    lessonId: 'claim-first-gift',
    component: 'ClaimFirstGift',
    name: 'Crear Wallet Segura',
    estimatedTime: 10,
    description: 'Aprende a crear y proteger tu billetera de criptomonedas'
  },
  2: {
    lessonId: 'security-basics',
    component: 'SecurityBasics',
    name: 'Seguridad Básica',
    estimatedTime: 8,
    description: 'Mejores prácticas para mantener tus activos seguros'
  },
  3: {
    lessonId: 'nft-basics',
    component: 'NFTBasics',
    name: 'Entender NFTs',
    estimatedTime: 12,
    description: 'Qué son los NFTs y cómo funcionan'
  },
  4: {
    lessonId: 'defi-intro',
    component: 'DeFiIntro',
    name: 'DeFi Básico',
    estimatedTime: 15,
    description: 'Introducción a las finanzas descentralizadas'
  },
  5: {
    lessonId: 'sales-masterclass',
    component: 'SalesMasterclass',
    name: 'Proyecto CryptoGift',
    estimatedTime: 20,
    description: 'Conoce nuestra visión y únete como colaborador'
  }
};

/**
 * Obtiene el mapeo de un módulo por su ID
 * @param moduleId - ID del módulo educativo
 * @returns ModuleMapping o undefined si no existe
 */
export function getModuleMapping(moduleId: number): ModuleMapping | undefined {
  const mapping = EDUCATIONAL_MODULE_MAPPING[moduleId];
  
  if (!mapping) {
    console.error(`❌ CRITICAL ERROR: Module ${moduleId} not found in EDUCATIONAL_MODULE_MAPPING!`);
    console.error('📋 Available modules:', Object.keys(EDUCATIONAL_MODULE_MAPPING));
    console.error('📖 Check EDUCATIONAL_MAPPING_LAW.md for proper mapping');
  }
  
  return mapping;
}

/**
 * Valida que un módulo existe en el mapeo
 * @param moduleId - ID del módulo a validar
 * @returns boolean
 */
export function isValidModule(moduleId: number): boolean {
  return moduleId in EDUCATIONAL_MODULE_MAPPING;
}

/**
 * Obtiene el lessonId correcto para un módulo
 * @param moduleId - ID del módulo educativo
 * @returns lessonId string o null si no existe
 */
export function getLessonIdForModule(moduleId: number): string | null {
  const mapping = getModuleMapping(moduleId);
  return mapping ? mapping.lessonId : null;
}

/**
 * Debug helper - imprime el mapeo completo
 */
export function debugPrintMapping(): void {
  console.log('📚 EDUCATIONAL MODULE MAPPING:');
  Object.entries(EDUCATIONAL_MODULE_MAPPING).forEach(([id, mapping]) => {
    console.log(`  ${id}: ${mapping.name} → ${mapping.component} (${mapping.lessonId})`);
  });
}

// Exportar constantes importantes
export const PROYECTO_CRYPTOGIFT_MODULE_ID = 5;
export const SALES_MASTERCLASS_LESSON_ID = 'sales-masterclass';