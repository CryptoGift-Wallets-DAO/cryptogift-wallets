/**
 * COMPETENCIAS MODULE
 * AI-First Competition System for CryptoGift
 *
 * This module provides:
 * - 6 competition types (prediction, tournament, challenge, pool, milestone, ranking)
 * - Manifold Markets integration for probability/betting
 * - Gnosis Safe integration for fund custody
 * - AI tracking for intelligent user guidance
 * - Workflow engine for step-by-step execution
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types';

// ============================================================================
// CORE LIBRARIES
// ============================================================================

// Workflow Engine
export {
  WorkflowEngine,
  createWorkflowEngine,
  registerWorkflow,
  getWorkflowById,
  getAllWorkflows,
  getWorkflowsByCategory
} from './lib/workflowEngine';

// Manifold Client
export {
  setManifoldApiKey,
  isManifoldConfigured,
  // CPMM Math
  calculateShares,
  calculateNewProbability,
  calculatePayout,
  getCPMMState,
  // Market Operations
  getMarket,
  searchMarkets,
  getMarketsByCreator,
  createBinaryMarket,
  createMultipleChoiceMarket,
  // Betting
  placeBet,
  cancelBet,
  sellShares,
  getUserBets,
  getUserPositions,
  // Resolution
  resolveMarket,
  // Liquidity
  addLiquidity,
  // Comments
  postComment,
  getComments,
  // User
  getMe,
  getUserByUsername,
  // Simulation
  simulateMarket
} from './lib/manifoldClient';

// Safe Integration
export {
  generateSafeDeploymentData,
  predictSafeAddress,
  createCompetitionSafe,
  buildPrizeDistributionTx,
  buildMultiSendTx,
  calculateSafeTxHash,
  collectSignatures,
  verifySignature,
  hasEnoughSignatures,
  buildEnableModuleTx,
  buildDelayModuleSetup,
  buildRolesModuleSetup,
  buildCompetitionGuard,
  buildSetGuardTx,
  getSafeInfo,
  getPendingTransactions,
  proposeTransaction,
  addSignature,
  setupCompetitionSafe,
  distributePrizes
} from './lib/safeIntegration';

// Kleros Integration
export {
  KlerosClient,
  createCompetitionDispute,
  handleKlerosRuling,
  getKlerosClient,
  type KlerosSubcourt,
  type KlerosDispute,
  type KlerosEvidence,
} from './lib/klerosIntegration';

// Chainlink VRF
export {
  ChainlinkVRFClient,
  generateBracketSeeding,
  generateBracketMatchups,
  drawLotteryWinners,
  calculateLotteryPrizes,
  assignVerifiers,
  resolveTiebreaker,
  verifyRandomness,
  simulateVRFRandomness,
  createMockVRFClient,
  getChainlinkConfig,
  CHAINLINK_CONFIG,
} from './lib/chainlinkVRF';

// Redis Schema & Data Store
export {
  REDIS_KEYS,
  CompetitionStore,
  getCompetitionStore,
  generateRedisId,
  parseRedisTimestamp,
  formatRedisTimestamp,
  calculateCompetitionTTL,
  type RedisCompetition,
  type RedisParticipant,
  type RedisBet,
  type RedisVote,
  type RedisEvent,
  type RedisChatMessage,
  type RedisSafeTransaction,
  type RedisMarketHistory,
  type RedisGlobalStats,
} from './lib/redisSchema';

// Real-Time Event System
export {
  getEventEmitter,
  getSSEConnectionManager,
  emitCompetitionCreated,
  emitParticipantJoined,
  emitBetPlaced,
  emitVoteCast,
  emitSafeTransaction,
  emitMarketUpdate,
  emitChatMessage,
  emitCompetitionResolved,
  emitPrizeDistributed,
  emitError,
  type CompetitionEvent,
  type CompetitionEventType,
  type EventSubscription,
  type SSEClient,
} from './lib/eventSystem';

// ============================================================================
// WORKFLOWS
// ============================================================================

export {
  predictionWorkflow,
  tournamentWorkflow,
  challengeWorkflow,
  poolWorkflow,
  milestoneWorkflow,
  rankingWorkflow,
  registerAllWorkflows,
  WORKFLOW_BY_CATEGORY,
  getWorkflowForCategory,
  getWorkflowSummaries
} from './workflows';

// ============================================================================
// HOOKS
// ============================================================================

// AI Context
export {
  AIContextProvider,
  useAIContext,
  useAITracking,
  useAISuggestions,
  useWorkflowTracking,
  createAIAgentInterface
} from './hooks/useAIContext';

// Competition Hooks
export {
  useCompetition,
  useCompetitions,
  useCreateCompetition,
  type UseCompetitionOptions,
  type UseCompetitionReturn,
  type UseCompetitionsOptions,
  type UseCompetitionsReturn,
  type CreateCompetitionParams,
} from './hooks/useCompetition';

// Manifold Market Hooks
export {
  useManifoldMarket,
  useCreateMarket,
  useMarketHistory,
  useLeaderboard,
  type UseManifoldMarketOptions,
  type UseManifoldMarketReturn,
  type BetResult,
  type SellResult,
  type CreateMarketParams as ManifoldCreateMarketParams,
  type UseCreateMarketReturn,
  type MarketHistoryPoint,
  type UseMarketHistoryReturn,
  type LeaderboardEntry,
  type UseLeaderboardReturn,
} from './hooks/useManifold';

// Gnosis Safe Hooks
export {
  useSafe,
  useCreateSafe,
  useSafeHistory,
  type UseSafeOptions,
  type UseSafeReturn,
  type SafeModule,
  type ProposedTransaction,
  type ExecutionResult,
  type UseCreateSafeOptions,
  type UseCreateSafeReturn,
  type CreateSafeParams,
  type SafeHistoryEntry,
  type UseSafeHistoryReturn,
} from './hooks/useSafe';

// Real-Time Events Hooks
export {
  useRealtimeEvents,
  useBetEvents,
  useVoteEvents,
  useSafeEvents,
  useChatEvents,
  useMarketEvents,
  type UseRealtimeEventsOptions,
  type UseRealtimeEventsReturn,
} from './hooks/useRealtimeEvents';

// ============================================================================
// COMPONENTS
// ============================================================================

export {
  WorkflowWizard,
  CompetitionCard,
  LiveTransparencyView,
  JudgePanel,
  PredictionMarketView,
  TransparencyDashboard,
} from './components';

// ============================================================================
// QUICK START
// ============================================================================

/**
 * Initialize the competencias module
 *
 * @example
 * ```tsx
 * import { initCompetencias } from '@/competencias';
 *
 * // In your app initialization
 * initCompetencias({
 *   manifoldApiKey: process.env.NEXT_PUBLIC_MANIFOLD_API_KEY,
 *   onAIEvent: (event) => console.log('AI Event:', event)
 * });
 * ```
 */
export function initCompetencias(config?: {
  manifoldApiKey?: string;
  onAIEvent?: (event: import('./types').AIEvent) => void;
}): void {
  // Register all workflows
  const { registerAllWorkflows } = require('./workflows');
  registerAllWorkflows();

  // Set Manifold API key if provided
  if (config?.manifoldApiKey) {
    const { setManifoldApiKey } = require('./lib/manifoldClient');
    setManifoldApiKey(config.manifoldApiKey);
  }

  console.log('[Competencias] Module initialized');
}

// ============================================================================
// VERSION
// ============================================================================

export const COMPETENCIAS_VERSION = '1.0.0';

export const COMPETENCIAS_INFO = {
  version: COMPETENCIAS_VERSION,
  categories: ['prediction', 'tournament', 'challenge', 'pool', 'milestone', 'ranking'],
  integrations: ['manifold', 'gnosis-safe', 'erc6551'],
  features: [
    'AI-first workflow engine',
    'Click-by-click tracking',
    'CPMM probability markets',
    'Multi-signature custody',
    'Real-time transparency',
    'Multi-judge arbitration'
  ]
};
