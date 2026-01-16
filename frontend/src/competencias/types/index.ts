/**
 * COMPETENCIAS TYPE SYSTEM
 * AI-First Architecture - Every type designed for AI understanding and execution
 *
 * This system integrates:
 * - Manifold Markets (probability/betting logic)
 * - Gnosis Safe (custody/governance)
 * - Multi-judge arbitration
 * - Real-time transparency
 */

// ============================================================================
// CORE COMPETITION TYPES
// ============================================================================

export type CompetitionCategory =
  | 'prediction'      // Binary yes/no predictions
  | 'tournament'      // Multi-participant brackets
  | 'challenge'       // 1v1 or team challenges
  | 'pool'           // Contribution pools with conditions
  | 'milestone'      // Goal-based achievements
  | 'ranking';       // Ongoing rankings/leaderboards

export type CompetitionStatus =
  | 'draft'          // Being configured
  | 'pending'        // Awaiting start conditions
  | 'active'         // Live and accepting bets
  | 'paused'         // Temporarily paused
  | 'resolution'     // Outcome being determined
  | 'resolving'      // Alias for resolution (for compatibility)
  | 'resolved'       // Resolution complete, awaiting distribution
  | 'disputed'       // Under arbitration
  | 'completed'      // Finished, prizes distributed
  | 'cancelled';     // Cancelled, refunds processed

export type ResolutionMethod =
  | 'single_arbiter'      // One trusted judge
  | 'multisig_panel'      // N-of-M judges required
  | 'oracle'              // Chainlink/external oracle
  | 'community_vote'      // Token-weighted voting
  | 'kleros'              // Decentralized arbitration
  | 'ai_judge'            // Future: AI-powered resolution
  | 'automatic';          // Self-resolving (time/data based)

export interface Competition {
  id: string;
  category: CompetitionCategory;
  status: CompetitionStatus;

  // Basic info
  title: string;
  description: string;
  rules: string[];
  imageUrl?: string;

  // Timing - both flat and nested for backward compatibility
  createdAt: number;
  startsAt: number;
  endsAt: number;
  resolutionDeadline: number;
  timeline?: {
    createdAt: number;
    startsAt: number;
    endsAt: number;
    resolutionDeadline: number;
  };

  // Financial - both flat and nested for backward compatibility
  entryFee: string;          // Wei amount
  prizePool: string | PrizePoolConfig;  // Wei amount or structured
  currency: string;          // Token address (or 'ETH')
  safeAddress: string;       // Gnosis Safe holding funds

  // Safe custody details (optional, for tracking deployment)
  custody?: {
    safeAddress: string;
    owners: string[];
    threshold: number;
    deployed: boolean;
    predictedAt?: string;
    deployedAt?: string;
    deploymentTxHash?: string | null;
    saltNonce?: string;
    confirmedBy?: string;
  };

  // Resolution
  resolution: ResolutionConfig;

  // Manifold integration - both flat and nested
  manifoldMarketId?: string;
  currentProbability?: number;
  market?: MarketState;

  // Arbitration - for dispute handling
  arbitration?: ArbitrationState;

  // Transparency - live events
  transparency?: TransparencyState;

  // Participants - both flat and nested for backward compatibility
  creator: string | { address: string; name?: string };
  participants: ParticipantList | Participant[];
  maxParticipants?: number;
  minParticipants?: number;

  // Metadata for AI
  workflowId: string;
  aiContext: AICompetitionContext;
}

// =============================================================================
// NESTED STATE TYPES (for components)
// =============================================================================

export interface PrizePoolConfig {
  total: number;
  currency: string;
  platformFee?: number;  // Platform fee percentage (default: 2.5%)
  distribution?: {
    position: number;
    percentage: number;
    amount?: number;
  }[];
}

export interface MarketState {
  manifoldId?: string;
  probability: number;
  pool?: {
    yesPool: number;
    noPool: number;
  };
  totalVolume?: number;
  bets?: MarketBet[];
  resolved?: boolean;
  resolution?: string;
}

export interface MarketBet {
  id: string;
  userId: string;
  outcome: string;
  amount: number;
  shares: number;
  timestamp: number;
  payout?: number;
}

export interface ArbitrationState {
  method?: ResolutionMethod;
  judges?: Judge[];
  votingStatus?: 'pending' | 'active' | 'completed';
  votingThreshold?: number;  // Percentage of votes needed (e.g., 67)
  dispute?: DisputeInfo;
  votes?: Vote[];
}

export interface DisputeInfo {
  id: string;
  klerosDisputeId?: string;
  status: 'pending' | 'evidence' | 'voting' | 'resolved';
  reason?: string;
  raisedBy?: string;
  raisedAt?: number;
  deadline?: number;
  ruling?: string;
}

export interface TransparencyState {
  events: TransparencyEvent[];
  lastUpdated: number;
  verifiedCount: number;
}

export interface ParticipantList {
  current: number;
  maxParticipants?: number;
  list?: Participant[];
  entries?: Participant[];    // Alias for list (backward compatibility)
}

export interface ResolutionConfig {
  method: ResolutionMethod;
  judges: Judge[];
  requiredSignatures: number;  // For multisig
  disputePeriod: number;       // Seconds
  appealAllowed: boolean;
  oracleConfig?: OracleConfig;
}

export type JudgeRole = 'primary' | 'backup' | 'appeal' | 'arbiter' | 'reviewer' | 'verifier' | 'observer';

export interface Judge {
  address: string;
  name?: string;
  reputation?: number;
  role: JudgeRole;
  hasVoted?: boolean;
  vote?: string;
  votedAt?: number;
}

export interface Vote {
  id?: string;
  competitionId: string;
  judge: string;
  vote: string;
  comment?: string;
  weight?: number;
  timestamp?: number;
}

export interface Dispute {
  id: string;
  competitionId?: string;
  status: 'open' | 'pending' | 'evidence' | 'voting' | 'resolved' | 'closed';
  platform?: 'internal' | 'kleros';
  reason: string;
  raisedBy?: string;
  createdAt: number;
  resolvedAt?: number;
  resolution?: string;
  evidence?: DisputeEvidence[];
}

export interface DisputeEvidence {
  id: string;
  submitter: string;
  content: string;
  type: 'text' | 'link' | 'file';
  submittedAt: number;
}

export interface OracleConfig {
  type: 'chainlink' | 'uma' | 'api3' | 'custom';
  feedAddress?: string;
  apiEndpoint?: string;
  dataPath?: string;
}

export interface Participant {
  address: string;
  position: string;           // 'YES', 'NO', team name, etc.
  amount: string;             // Wei staked
  joinedAt: number;
  shares?: number;            // Manifold shares
}

// Alias for backward compatibility
export type ParticipantEntry = Participant;

// ============================================================================
// MANIFOLD INTEGRATION TYPES
// ============================================================================

export interface ManifoldMarket {
  id: string;
  manifoldId?: string;        // Alias for id for some contexts
  question: string;
  description: string;
  closeTime: number;
  mechanism: 'cpmm-1' | 'dpm-2';
  outcomeType: 'BINARY' | 'MULTIPLE_CHOICE' | 'NUMERIC' | 'FREE_RESPONSE';
  pool: ManifoldPool;
  probability: number;
  totalLiquidity: number;
  volume: number;
  totalVolume?: number;       // Alias for volume
  isResolved: boolean;
  resolution?: string;
}

export interface ManifoldPool {
  YES: number;
  NO: number;
  // Lowercase aliases for compatibility
  yesPool?: number;
  noPool?: number;
}

export interface ManifoldBet {
  id: string;
  marketId: string;
  userId: string;
  amount: number;
  outcome: string;
  shares: number;
  probBefore: number;
  probAfter: number;
  createdTime: number;
}

export interface ManifoldPosition {
  // Single outcome position
  outcome?: string;
  shares?: number;
  // Split YES/NO position (aggregated)
  yesShares?: number;
  noShares?: number;
  // Common fields
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPercent?: number;
  oddsType?: 'YES' | 'NO';     // Position type
}

// CPMM Formula: k = y^p * n^(1-p)
export interface CPMMState {
  yesPool: number;
  noPool: number;
  probability: number;
  k: number;  // Constant product
}

// ============================================================================
// GNOSIS SAFE TYPES
// ============================================================================

export interface SafeConfig {
  address: string;
  chainId: number;
  owners: string[];
  threshold: number;
  modules: SafeModule[];
  guards: SafeGuard[];
  guard?: string;           // Current active guard address
  nonce: number;
  balance?: string;         // Current ETH balance
}

// Alias for backward compatibility
export type GnosisSafe = SafeConfig;

export interface SafeModule {
  type: 'delay' | 'roles' | 'reality' | 'custom';
  address: string;
  config: Record<string, unknown>;
}

export interface SafeGuard {
  type: 'competition' | 'whitelist' | 'ratelimit' | 'custom';
  address: string;
  config: Record<string, unknown>;
}

export interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  operation: 0 | 1;  // 0 = call, 1 = delegatecall
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
  signatures?: string;
  safeTxHash?: string;
  confirmations?: SafeSignature[];
}

export interface SafeSignature {
  signer: string;
  signature: string;
  timestamp: number;
}

// ============================================================================
// WORKFLOW TYPES (AI-First Architecture)
// ============================================================================

export type WorkflowStepType =
  | 'input'           // User provides data
  | 'selection'       // User chooses from options
  | 'confirmation'    // User confirms action
  | 'transaction'     // Blockchain transaction
  | 'wait'           // Wait for condition
  | 'computation'    // Calculate something
  | 'api_call'       // External API call
  | 'notification';  // Notify user/system

/**
 * Props that can be passed to workflow step components
 */
export interface WorkflowStepProps {
  // Common props
  label?: string;
  description?: string;
  placeholder?: string;

  // Text input props
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  type?: string;              // input type: text, email, number, etc.

  // Number input props
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;

  // Select props
  options?: { value: string; label: string; icon?: string; description?: string }[];
  cardStyle?: boolean;

  // Date props
  includeTime?: boolean;
  minDate?: string;
  maxDate?: string;

  // Confirmation props
  icon?: string;
  title?: string;
  summary?: string;
  requireConfirmation?: boolean;
  confirmationText?: string;

  // Action props
  actionLabel?: string;

  // Computation step props
  compute?: (input: unknown, data: Record<string, unknown>) => Promise<unknown>;

  // API call step props
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;

  // Notification step props
  message?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';

  // Workflow-specific extended props
  hint?: string;
  defaultOffset?: number;
  defaultValue?: unknown;
  minJudges?: number;
  maxJudges?: number;
  perMatchJudges?: number;
  showEstimatedGas?: boolean;
  presets?: unknown[];
  templates?: unknown[];
  showBracketPreview?: boolean;
  steps?: unknown[];
  allowOpen?: boolean;
  showOpponentNotification?: boolean;
  allowENS?: boolean;
  currency?: string;
  suggestions?: unknown[];
  allowCustom?: boolean;
}

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  description: string;

  // For AI understanding
  aiDescription: string;      // Natural language for AI
  aiCanExecute: boolean;      // Can AI do this without user?
  aiPrefillable: boolean;     // Can AI suggest values?

  // Validation
  required: boolean;
  validation?: ValidationRule[];

  // UI
  component: string;          // React component name
  props: WorkflowStepProps;

  // Dependencies
  dependsOn?: string[];       // Previous step IDs
  condition?: WorkflowCondition;

  // Timing
  estimatedSeconds?: number;
  timeoutSeconds?: number;
}

export interface WorkflowCondition {
  type: 'value' | 'time' | 'transaction' | 'external';
  field?: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'exists';
  value: unknown;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: CompetitionCategory;

  // Steps
  steps: WorkflowStep[];
  currentStep: number;
  completedSteps: string[];

  // Data collected
  data: Record<string, unknown>;

  // AI metadata
  aiSummary: string;
  aiKeywords: string[];
  aiExamples: string[];

  // Timing
  startedAt?: number;
  completedAt?: number;
  estimatedTotalSeconds: number;
}

export interface WorkflowExecution {
  workflowId: string;
  executionId: string;
  userId: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStepId: string;
  stepHistory: StepExecution[];
  startedAt: number;
  completedAt?: number;
}

export interface StepExecution {
  stepId: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt: number;
  completedAt?: number;
  aiAssisted: boolean;
}

// ============================================================================
// AI TRACKING TYPES
// ============================================================================

export type AIEventType =
  // User interactions
  | 'page_view'
  | 'click'
  | 'input_change'
  | 'form_submit'
  | 'scroll'
  | 'hover'

  // Workflow events
  | 'workflow_start'
  | 'workflow_step'
  | 'workflow_complete'
  | 'workflow_error'

  // Competition events
  | 'competition_view'
  | 'competition_join'
  | 'competition_bet'
  | 'competition_resolve'

  // Transaction events
  | 'tx_initiated'
  | 'tx_signed'
  | 'tx_confirmed'
  | 'tx_failed'

  // AI events
  | 'ai_suggestion'
  | 'ai_accepted'
  | 'ai_rejected'
  | 'ai_question';

export interface AIEvent {
  id: string;
  type: AIEventType;
  timestamp: number;
  sessionId: string;
  userId?: string;

  // Context
  page: string;
  component: string;
  elementId?: string;

  // Data
  data: Record<string, unknown>;

  // For AI learning
  intent?: string;          // What user was trying to do
  outcome?: string;         // What happened
  nextAction?: string;      // What AI should do next
}

export interface AICompetitionContext {
  // Natural language description
  summary: string;

  // Key entities
  entities: {
    type: string;
    value: string;
    role: string;
  }[];

  // User intent signals
  userIntent?: string;
  confidence?: number;

  // Suggested actions
  suggestedActions: AIAction[];

  // Related competitions
  relatedIds?: string[];
}

export interface AIAction {
  id: string;
  name: string;
  description: string;

  // Execution
  type: 'navigate' | 'fill' | 'click' | 'transaction' | 'api';
  target: string;
  params?: Record<string, unknown>;

  // Requirements
  requiresConfirmation: boolean;
  requiresWallet: boolean;
  estimatedGas?: string;
}

export interface AISuggestion {
  id: string;
  type: 'prefill' | 'action' | 'explanation' | 'warning';
  field?: string;
  value?: unknown;
  message: string;
  confidence: number;
  source: 'history' | 'pattern' | 'context' | 'rule';
}

export interface AISession {
  id: string;
  userId?: string;
  startedAt: number;
  lastActiveAt: number;
  events: AIEvent[];
  context: {
    currentPage: string;
    currentWorkflow?: string;
    currentCompetition?: string;
    userPreferences: Record<string, unknown>;
  };
}

// ============================================================================
// TRANSPARENCY & EVENT TYPES
// ============================================================================

export type TransparencyEventType =
  | 'COMPETITION_CREATED'
  | 'PARTICIPANT_JOINED'
  | 'BET_PLACED'
  | 'BET_CANCELLED'
  | 'FUNDS_DEPOSITED'
  | 'FUNDS_WITHDRAWN'
  | 'RESOLUTION_STARTED'
  | 'JUDGE_VOTED'
  | 'DISPUTE_RAISED'
  | 'DISPUTE_RESOLVED'
  | 'PRIZE_DISTRIBUTED'
  | 'COMPETITION_CANCELLED'
  | 'SAFE_CREATED'
  | 'SAFE_OWNER_ADDED'
  | 'SAFE_OWNER_REMOVED'
  | 'SAFE_THRESHOLD_CHANGED'
  | 'ORACLE_UPDATED'
  | 'PROBABILITY_CHANGED'
  | 'MARKET_RESOLVED'
  | 'APPEAL_SUBMITTED'
  | 'APPEAL_RESOLVED'
  | 'REFUND_PROCESSED';

export interface TransparencyEvent {
  id?: string;
  type: TransparencyEventType | string;  // Flexible for real-time events
  timestamp: number;

  // Related entities
  competitionId?: string;
  userId?: string;
  txHash?: string;

  // Actor and action (for live events)
  actor?: string;
  action?: string;

  // Event data - flexible format
  data?: Record<string, unknown>;
  details?: string[] | Record<string, unknown>;

  // Human-readable explanation (optional for live events)
  title?: string;
  description?: string;

  // Verification
  verified?: boolean;
  blockNumber?: number;
  signature?: string;
}

export interface LiveFeed {
  competitionId: string;
  events: TransparencyEvent[];
  lastUpdated: number;
  isStreaming: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string | {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: number;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface CompetitionCardProps {
  competition: Competition;
  onSelect: (id: string) => void;
  onJoin?: (id: string) => void;
  showActions?: boolean;
  variant?: 'compact' | 'full' | 'minimal';
}

export interface WorkflowWizardProps {
  workflow: Workflow;
  onStepComplete: (stepId: string, data: unknown) => void;
  onComplete: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  aiEnabled?: boolean;
}

export interface JudgePanelProps {
  competition: Competition;
  onVote: (outcome: string, comment?: string) => void;
  onDispute: (reason: string) => void;
  isJudge: boolean;
}

export interface LiveViewProps {
  competitionId: string;
  showChat?: boolean;
  autoScroll?: boolean;
}

export interface ProbabilityDisplayProps {
  probability: number;
  change24h?: number;
  showChart?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// TYPE GUARDS & UTILITIES
// ============================================================================

/**
 * Type guard to check if prizePool is a PrizePoolConfig object
 */
export function isPrizePoolConfig(
  prizePool: string | PrizePoolConfig
): prizePool is PrizePoolConfig {
  return typeof prizePool === 'object' && prizePool !== null && 'total' in prizePool;
}

/**
 * Type guard to check if participants is a ParticipantList object
 */
export function isParticipantList(
  participants: ParticipantList | Participant[]
): participants is ParticipantList {
  return (
    typeof participants === 'object' &&
    !Array.isArray(participants) &&
    'current' in participants
  );
}

/**
 * Type guard to check if creator is an object with address
 */
export function isCreatorObject(
  creator: string | { address: string; name?: string }
): creator is { address: string; name?: string } {
  return typeof creator === 'object' && creator !== null && 'address' in creator;
}

/**
 * Get prize pool total (handles both string and PrizePoolConfig)
 */
export function getPrizePoolTotal(prizePool: string | PrizePoolConfig): number {
  if (isPrizePoolConfig(prizePool)) {
    return prizePool.total;
  }
  return parseFloat(prizePool) || 0;
}

/**
 * Get prize pool currency (handles both string and PrizePoolConfig)
 */
export function getPrizePoolCurrency(prizePool: string | PrizePoolConfig, defaultCurrency = 'ETH'): string {
  if (isPrizePoolConfig(prizePool)) {
    return prizePool.currency;
  }
  return defaultCurrency;
}

/**
 * Get participant count (handles both ParticipantList and Participant[])
 */
export function getParticipantCount(participants: ParticipantList | Participant[]): number {
  if (isParticipantList(participants)) {
    return participants.current;
  }
  return participants.length;
}

/**
 * Get participant list (handles both ParticipantList and Participant[])
 */
export function getParticipantsList(participants: ParticipantList | Participant[]): Participant[] {
  if (isParticipantList(participants)) {
    return participants.list || [];
  }
  return participants;
}

/**
 * Get max participants (handles both ParticipantList and Participant[])
 */
export function getMaxParticipants(participants: ParticipantList | Participant[]): number | undefined {
  if (isParticipantList(participants)) {
    return participants.maxParticipants;
  }
  return undefined;
}

/**
 * Get creator address (handles both string and object)
 */
export function getCreatorAddress(creator: string | { address: string; name?: string }): string {
  if (isCreatorObject(creator)) {
    return creator.address;
  }
  return creator;
}
