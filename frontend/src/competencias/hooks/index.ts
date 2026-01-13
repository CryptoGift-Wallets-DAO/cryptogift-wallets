/**
 * COMPETITION HOOKS INDEX
 * Centralized exports for all competition-related React hooks
 */

// =============================================================================
// COMPETITION HOOKS
// =============================================================================

export {
  useCompetition,
  useCompetitions,
  useCreateCompetition,
  type UseCompetitionOptions,
  type UseCompetitionReturn,
  type UseCompetitionsOptions,
  type UseCompetitionsReturn,
  type CreateCompetitionParams,
} from './useCompetition';

// =============================================================================
// MANIFOLD MARKET HOOKS
// =============================================================================

export {
  useManifoldMarket,
  useCreateMarket,
  useMarketHistory,
  useLeaderboard,
  type UseManifoldMarketOptions,
  type UseManifoldMarketReturn,
  type BetResult,
  type SellResult,
  type CreateMarketParams,
  type UseCreateMarketReturn,
  type MarketHistoryPoint,
  type UseMarketHistoryReturn,
  type LeaderboardEntry,
  type UseLeaderboardReturn,
} from './useManifold';

// =============================================================================
// GNOSIS SAFE HOOKS
// =============================================================================

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
} from './useSafe';

// =============================================================================
// AI CONTEXT HOOKS
// =============================================================================

export {
  AIContextProvider,
  useAIContext,
  useAITracking,
  useAISuggestions,
  useWorkflowTracking,
  createAIAgentInterface,
  type AIAgentInterface,
} from './useAIContext';

// =============================================================================
// REAL-TIME EVENTS HOOKS
// =============================================================================

export {
  useRealtimeEvents,
  useBetEvents,
  useVoteEvents,
  useSafeEvents,
  useChatEvents,
  useMarketEvents,
  type UseRealtimeEventsOptions,
  type UseRealtimeEventsReturn,
} from './useRealtimeEvents';
