/**
 * MODELOS TYPES - CryptoGift Use Cases Showcase
 * ==============================================
 *
 * TypeScript types for the Models showcase page.
 * Displays all possible use cases of the CryptoGift system.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

// ========== TIPOS BASE ==========

export type CategoryType =
  | 'onboarding'      // Crypto Onboarding
  | 'campaigns'       // Marketing Campaigns
  | 'competitions'    // Competitions & Betting
  | 'governance'      // DAO Governance
  | 'finance'         // Financial Services
  | 'gaming'          // Gaming & NFTs
  | 'social'          // Social & Relations
  | 'enterprise';     // Enterprise & B2B

export type ModelStatus =
  | 'deployed'        // Live and working
  | 'ready'           // Ready to connect
  | 'building'        // In development
  | 'planned';        // On roadmap

export type IntegrationType =
  | 'escrow'          // CryptoGift Escrow
  | 'erc6551'         // Token Bound Accounts
  | 'gnosis'          // Gnosis Safe Multisig
  | 'manifold'        // Manifold Prediction Markets
  | 'education'       // Education Gate System
  | 'aa'              // Account Abstraction
  | 'eip712'          // EIP-712 Signatures
  | 'ipfs'            // IPFS Storage
  | 'nft'             // NFT Minting
  | 'swap'            // Token Swaps (0x)
  | 'paymaster'       // Gasless Transactions
  | 'telegram'        // Telegram Integration
  | 'email'           // Email Notifications
  | 'streaming';      // Payment Streaming

export type Complexity = 1 | 2 | 3 | 4 | 5;

// ========== FLOW STEP ==========

export interface FlowStep {
  step: number;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  icon?: string;
}

// ========== MODELO PRINCIPAL ==========

export interface Modelo {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  longDescription?: string;
  longDescriptionEn?: string;
  category: CategoryType;
  icon: string;                     // Lucide icon name
  complexity: Complexity;
  status: ModelStatus;
  integrations: IntegrationType[];
  flow: FlowStep[];
  useCases: string[];
  useCasesEn?: string[];
  estimatedTime?: string;
  requiredRoles?: string[];
  mockupUrl?: string;               // Future wireframe/mockup
  demoUrl?: string;                 // Link to demo if available
  tags?: string[];
}

// ========== CATEGORIA ==========

export interface CategoryConfig {
  id: CategoryType;
  label: string;
  labelEn: string;
  icon: string;                     // Lucide icon name
  colorFrom: string;                // Tailwind gradient from
  colorTo: string;                  // Tailwind gradient to
  description: string;
  descriptionEn: string;
}

// ========== STATUS CONFIG ==========

export interface StatusConfig {
  status: ModelStatus;
  label: string;
  labelEn: string;
  color: string;                    // Tailwind color name
  icon: string;                     // Lucide icon name
}

// ========== INTEGRATION CONFIG ==========

export interface IntegrationConfig {
  id: IntegrationType;
  label: string;
  color: string;                    // Tailwind color name
  description?: string;
}

// ========== FILTER STATE ==========

export interface ModelFilters {
  category: CategoryType | 'all';
  status: ModelStatus | 'all';
  complexity: Complexity | 'all';
  search: string;
  integrations: IntegrationType[];
}

// ========== SORT OPTIONS ==========

export type SortOption =
  | 'alphabetical'
  | 'complexity-asc'
  | 'complexity-desc'
  | 'status'
  | 'category';

// ========== VIEW OPTIONS ==========

export type ViewMode = 'grid' | 'list';

// ========== COMPONENT PROPS ==========

export interface ModelCardProps {
  modelo: Modelo;
  onClick: (modelo: Modelo) => void;
  isSelected?: boolean;
}

export interface ModelDetailModalProps {
  modelo: Modelo | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface CategoryTabsProps {
  activeCategory: CategoryType | 'all';
  onCategoryChange: (category: CategoryType | 'all') => void;
  categories: CategoryConfig[];
}

export interface StatusBadgeProps {
  status: ModelStatus;
  size?: 'sm' | 'md' | 'lg';
}

export interface IntegrationChipProps {
  integration: IntegrationType;
  size?: 'sm' | 'md';
}

export interface ComplexityIndicatorProps {
  complexity: Complexity;
  size?: 'sm' | 'md' | 'lg';
}

export interface ModelGridProps {
  modelos: Modelo[];
  onSelectModelo: (modelo: Modelo) => void;
  selectedModeloId?: string;
  isLoading?: boolean;
}

export interface ModelHeroProps {
  totalModelos: number;
  categories: CategoryConfig[];
  onCategoryClick?: (category: CategoryType) => void;
}

// ========== CONFIGURATION ==========

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'onboarding',
    label: 'Crypto Onboarding',
    labelEn: 'Crypto Onboarding',
    icon: 'Rocket',
    colorFrom: 'amber-500',
    colorTo: 'orange-500',
    description: 'Introduce nuevos usuarios al mundo crypto',
    descriptionEn: 'Introduce new users to the crypto world'
  },
  {
    id: 'campaigns',
    label: 'Campanas Marketing',
    labelEn: 'Marketing Campaigns',
    icon: 'Megaphone',
    colorFrom: 'blue-500',
    colorTo: 'cyan-500',
    description: 'Campanas con incentivos cripto',
    descriptionEn: 'Campaigns with crypto incentives'
  },
  {
    id: 'competitions',
    label: 'Competencias',
    labelEn: 'Competitions',
    icon: 'Trophy',
    colorFrom: 'red-500',
    colorTo: 'pink-500',
    description: 'Apuestas, torneos y predicciones',
    descriptionEn: 'Betting, tournaments and predictions'
  },
  {
    id: 'governance',
    label: 'Gobernanza DAO',
    labelEn: 'DAO Governance',
    icon: 'Vote',
    colorFrom: 'purple-500',
    colorTo: 'violet-500',
    description: 'Votacion y decision comunitaria',
    descriptionEn: 'Voting and community decisions'
  },
  {
    id: 'finance',
    label: 'Finanzas',
    labelEn: 'Finance',
    icon: 'Wallet',
    colorFrom: 'green-500',
    colorTo: 'emerald-500',
    description: 'Servicios financieros descentralizados',
    descriptionEn: 'Decentralized financial services'
  },
  {
    id: 'gaming',
    label: 'Gaming',
    labelEn: 'Gaming',
    icon: 'Gamepad2',
    colorFrom: 'pink-500',
    colorTo: 'rose-500',
    description: 'Juegos y NFTs interactivos',
    descriptionEn: 'Interactive games and NFTs'
  },
  {
    id: 'social',
    label: 'Social',
    labelEn: 'Social',
    icon: 'Users',
    colorFrom: 'indigo-500',
    colorTo: 'blue-500',
    description: 'Relaciones y comunidad',
    descriptionEn: 'Relationships and community'
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    labelEn: 'Enterprise',
    icon: 'Building',
    colorFrom: 'slate-500',
    colorTo: 'gray-500',
    description: 'Soluciones empresariales B2B',
    descriptionEn: 'B2B enterprise solutions'
  }
];

export const STATUS_CONFIG: Record<ModelStatus, StatusConfig> = {
  deployed: {
    status: 'deployed',
    label: 'Desplegado',
    labelEn: 'Deployed',
    color: 'green',
    icon: 'CheckCircle'
  },
  ready: {
    status: 'ready',
    label: 'Listo',
    labelEn: 'Ready',
    color: 'blue',
    icon: 'Circle'
  },
  building: {
    status: 'building',
    label: 'En Construccion',
    labelEn: 'Building',
    color: 'yellow',
    icon: 'Hammer'
  },
  planned: {
    status: 'planned',
    label: 'Planificado',
    labelEn: 'Planned',
    color: 'gray',
    icon: 'Clock'
  }
};

export const INTEGRATION_CONFIG: Record<IntegrationType, IntegrationConfig> = {
  escrow: { id: 'escrow', label: 'Escrow', color: 'amber' },
  erc6551: { id: 'erc6551', label: 'ERC-6551', color: 'purple' },
  gnosis: { id: 'gnosis', label: 'Gnosis Safe', color: 'green' },
  manifold: { id: 'manifold', label: 'Manifold', color: 'blue' },
  education: { id: 'education', label: 'Education', color: 'cyan' },
  aa: { id: 'aa', label: 'Account Abstraction', color: 'pink' },
  eip712: { id: 'eip712', label: 'EIP-712', color: 'indigo' },
  ipfs: { id: 'ipfs', label: 'IPFS', color: 'teal' },
  nft: { id: 'nft', label: 'NFT', color: 'orange' },
  swap: { id: 'swap', label: '0x Swap', color: 'violet' },
  paymaster: { id: 'paymaster', label: 'Paymaster', color: 'rose' },
  telegram: { id: 'telegram', label: 'Telegram', color: 'sky' },
  email: { id: 'email', label: 'Email', color: 'slate' },
  streaming: { id: 'streaming', label: 'Streaming', color: 'lime' }
};
