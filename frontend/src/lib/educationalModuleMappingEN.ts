/**
 * EDUCATIONAL MODULE MAPPING - CENTRALIZED MAPPING SYSTEM (ENGLISH VERSION)
 *
 * ⚠️ ABSOLUTE LAW: EACH EDUCATIONAL REQUIREMENT MUST LOAD ITS SPECIFIC MODULE
 *
 * This file is the ONLY source of truth for educational module mapping.
 * NEVER modify this mapping without updating EDUCATIONAL_MAPPING_LAW.md
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
 * OFFICIAL EDUCATIONAL MODULE MAPPING (ENGLISH)
 *
 * ID 1: Create Secure Wallet → ClaimFirstGift
 * ID 2: Basic Security → SecurityBasics (pending implementation)
 * ID 3: Understanding NFTs → NFTBasics (pending implementation)
 * ID 4: DeFi Basics → DeFiIntro (pending implementation)
 * ID 5: CryptoGift Project → SalesMasterclass ⚠️ CRITICAL
 */
export const EDUCATIONAL_MODULE_MAPPING: Record<number, ModuleMapping> = {
  1: {
    lessonId: 'claim-first-gift',
    component: 'ClaimFirstGift',
    name: 'Create Secure Wallet',
    estimatedTime: 10,
    description: 'Learn how to create and protect your cryptocurrency wallet'
  },
  2: {
    lessonId: 'security-basics',
    component: 'SecurityBasics',
    name: 'Basic Security',
    estimatedTime: 8,
    description: 'Best practices to keep your assets safe'
  },
  3: {
    lessonId: 'nft-basics',
    component: 'NFTBasics',
    name: 'Understanding NFTs',
    estimatedTime: 12,
    description: 'What NFTs are and how they work'
  },
  4: {
    lessonId: 'defi-intro',
    component: 'DeFiIntro',
    name: 'DeFi Basics',
    estimatedTime: 15,
    description: 'Introduction to decentralized finance'
  },
  5: {
    lessonId: 'sales-masterclass',
    component: 'SalesMasterclass',
    name: 'CryptoGift Project',
    estimatedTime: 10,
    description: 'Learn about our vision. Starts with a brief video with audio, get comfortable to enjoy it'
  }
};

/**
 * Gets the mapping for a module by its ID
 * @param moduleId - Educational module ID
 * @returns ModuleMapping or undefined if it doesn't exist
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
 * Validates that a module exists in the mapping
 * @param moduleId - Module ID to validate
 * @returns boolean
 */
export function isValidModule(moduleId: number): boolean {
  return moduleId in EDUCATIONAL_MODULE_MAPPING;
}

/**
 * Gets the correct lessonId for a module
 * @param moduleId - Educational module ID
 * @returns lessonId string or null if it doesn't exist
 */
export function getLessonIdForModule(moduleId: number): string | null {
  const mapping = getModuleMapping(moduleId);
  return mapping ? mapping.lessonId : null;
}

/**
 * Debug helper - prints the complete mapping
 */
export function debugPrintMapping(): void {
  console.log('📚 EDUCATIONAL MODULE MAPPING (EN):');
  Object.entries(EDUCATIONAL_MODULE_MAPPING).forEach(([id, mapping]) => {
    console.log(`  ${id}: ${mapping.name} → ${mapping.component} (${mapping.lessonId})`);
  });
}

// Export important constants
export const PROYECTO_CRYPTOGIFT_MODULE_ID = 5;
export const SALES_MASTERCLASS_LESSON_ID = 'sales-masterclass';
