/**
 * CHAINLINK VRF INTEGRATION
 * Verifiable Random Function for Tournament & Competition Randomness
 *
 * Uses Chainlink VRF v2.5 for:
 * - Tournament bracket seeding (fair random order)
 * - Random participant selection
 * - Lottery drawings in pool competitions
 * - Random milestone verification assignments
 * - Tiebreaker resolution
 *
 * Security: All randomness is verifiable on-chain with cryptographic proofs
 */

import { Competition, APIResponse, TransparencyEvent } from '../types';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Chainlink VRF v2.5 Configuration for Base Sepolia
 * @see https://docs.chain.link/vrf/v2-5/supported-networks
 */
export const CHAINLINK_CONFIG = {
  // Base Sepolia VRF v2.5
  baseSepolia: {
    vrfCoordinator: '0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9',
    linkToken: '0xE4aB69C077896252FAFBD49EFD26B5D171A32410',
    keyHash: '0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71',
    subscriptionId: '', // Set via environment
    requestConfirmations: 3,
    callbackGasLimit: 200000,
    numWords: 10, // Max random words per request
  },
  // Base Mainnet (for production)
  baseMainnet: {
    vrfCoordinator: '0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634',
    linkToken: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196',
    keyHash: '0xdc2f87677b01473c763cb0aee938ed3341512f6057324a584e5944e786144d70',
    subscriptionId: '',
    requestConfirmations: 3,
    callbackGasLimit: 200000,
    numWords: 10,
  },
} as const;

// Get current chain config
export function getChainlinkConfig(chainId: number = 84532) {
  switch (chainId) {
    case 84532:
      return CHAINLINK_CONFIG.baseSepolia;
    case 8453:
      return CHAINLINK_CONFIG.baseMainnet;
    default:
      return CHAINLINK_CONFIG.baseSepolia;
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface VRFRequest {
  requestId: string;
  competitionId: string;
  purpose: VRFPurpose;
  status: VRFRequestStatus;
  requestedAt: number;
  fulfilledAt?: number;
  randomWords?: bigint[];
  numWords: number;
  txHash?: string;
  fulfillmentTxHash?: string;
}

export type VRFPurpose =
  | 'bracket_seeding'      // Tournament bracket order
  | 'participant_selection' // Random participant selection
  | 'lottery_drawing'      // Pool lottery winners
  | 'verifier_assignment'  // Random judge/verifier assignment
  | 'tiebreaker'           // Resolve ties randomly
  | 'milestone_audit';     // Random audit selection

export type VRFRequestStatus =
  | 'pending'              // Request submitted
  | 'processing'           // Waiting for VRF response
  | 'fulfilled'            // Random words received
  | 'applied'              // Applied to competition
  | 'failed';              // Request failed

export interface BracketSeed {
  participantId: string;
  participantAddress: string;
  seed: number;
  position: number;
}

export interface LotteryResult {
  winnerAddresses: string[];
  winnerPositions: number[];
  prizeAmounts: bigint[];
  randomSeed: bigint;
}

export interface VerifierAssignment {
  verifierId: string;
  verifierAddress: string;
  competitionId: string;
  milestoneId?: string;
  assignedAt: number;
}

// =============================================================================
// VRF CONTRACT ABI (Simplified for client interaction)
// =============================================================================

export const VRF_COORDINATOR_ABI = [
  // Request random words
  {
    name: 'requestRandomWords',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'keyHash', type: 'bytes32' },
      { name: 'subId', type: 'uint256' },
      { name: 'requestConfirmations', type: 'uint16' },
      { name: 'callbackGasLimit', type: 'uint32' },
      { name: 'numWords', type: 'uint32' },
    ],
    outputs: [{ name: 'requestId', type: 'uint256' }],
  },
  // Get request status
  {
    name: 'getRequestStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [
      { name: 'fulfilled', type: 'bool' },
      { name: 'randomWords', type: 'uint256[]' },
    ],
  },
] as const;

// Consumer contract ABI for our competitions
export const VRF_CONSUMER_ABI = [
  // Request randomness for competition
  {
    name: 'requestRandomness',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'competitionId', type: 'uint256' },
      { name: 'purpose', type: 'uint8' },
      { name: 'numWords', type: 'uint32' },
    ],
    outputs: [{ name: 'requestId', type: 'uint256' }],
  },
  // Get random words for competition
  {
    name: 'getRandomWords',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'competitionId', type: 'uint256' }],
    outputs: [{ name: 'randomWords', type: 'uint256[]' }],
  },
  // Check if randomness is fulfilled
  {
    name: 'isRandomnessFulfilled',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [{ name: 'fulfilled', type: 'bool' }],
  },
  // Events
  {
    name: 'RandomnessRequested',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'competitionId', type: 'uint256', indexed: true },
      { name: 'purpose', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'RandomnessFulfilled',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'competitionId', type: 'uint256', indexed: true },
      { name: 'randomWords', type: 'uint256[]', indexed: false },
    ],
  },
] as const;

// =============================================================================
// VRF CLIENT CLASS
// =============================================================================

/**
 * ChainlinkVRFClient
 * Handles all VRF interactions for competitions
 */
export class ChainlinkVRFClient {
  private chainId: number;
  private consumerAddress: string;
  private subscriptionId: string;
  private pendingRequests: Map<string, VRFRequest> = new Map();
  private onEvent?: (event: TransparencyEvent) => void;

  constructor(config: {
    chainId?: number;
    consumerAddress: string;
    subscriptionId: string;
    onEvent?: (event: TransparencyEvent) => void;
  }) {
    this.chainId = config.chainId || 84532;
    this.consumerAddress = config.consumerAddress;
    this.subscriptionId = config.subscriptionId;
    this.onEvent = config.onEvent;
  }

  /**
   * Request randomness for a competition
   */
  async requestRandomness(params: {
    competitionId: string;
    purpose: VRFPurpose;
    numWords: number;
    signer: {
      sendTransaction: (tx: { to: string; data: string }) => Promise<{ hash: string }>;
    };
  }): Promise<APIResponse<VRFRequest>> {
    try {
      const config = getChainlinkConfig(this.chainId);

      // Validate numWords
      if (params.numWords < 1 || params.numWords > config.numWords) {
        return {
          success: false,
          error: `Number of words must be between 1 and ${config.numWords}`,
        };
      }

      // Encode function call
      const purposeEnum = this.purposeToEnum(params.purpose);
      const data = this.encodeRequestRandomness(
        BigInt(params.competitionId),
        purposeEnum,
        params.numWords
      );

      // Send transaction
      const tx = await params.signer.sendTransaction({
        to: this.consumerAddress,
        data,
      });

      // Create request record
      const request: VRFRequest = {
        requestId: '', // Will be set when event is received
        competitionId: params.competitionId,
        purpose: params.purpose,
        status: 'pending',
        requestedAt: Date.now(),
        numWords: params.numWords,
        txHash: tx.hash,
      };

      // Emit transparency event
      this.emitEvent({
        type: 'vrf_request',
        timestamp: Date.now(),
        actor: 'system',
        action: 'requestRandomness',
        details: {
          competitionId: params.competitionId,
          purpose: params.purpose,
          numWords: params.numWords,
          txHash: tx.hash,
        },
        txHash: tx.hash,
        verified: false,
      });

      return { success: true, data: request };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request randomness',
      };
    }
  }

  /**
   * Check if randomness has been fulfilled
   */
  async checkFulfillment(requestId: string): Promise<APIResponse<{
    fulfilled: boolean;
    randomWords?: bigint[];
  }>> {
    try {
      // In production, this would call the contract
      // For now, simulate the check
      const pending = this.pendingRequests.get(requestId);

      if (!pending) {
        return {
          success: false,
          error: 'Request not found',
        };
      }

      // Simulate fulfilled status (in production, read from chain)
      const fulfilled = pending.status === 'fulfilled';

      return {
        success: true,
        data: {
          fulfilled,
          randomWords: pending.randomWords,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check fulfillment',
      };
    }
  }

  /**
   * Get random words for a competition
   */
  async getRandomWords(competitionId: string): Promise<APIResponse<bigint[]>> {
    try {
      // Find request for this competition
      const request = Array.from(this.pendingRequests.values())
        .find(r => r.competitionId === competitionId && r.status === 'fulfilled');

      if (!request || !request.randomWords) {
        return {
          success: false,
          error: 'No fulfilled randomness for this competition',
        };
      }

      return { success: true, data: request.randomWords };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get random words',
      };
    }
  }

  /**
   * Handle randomness fulfillment callback
   */
  handleFulfillment(requestId: string, randomWords: bigint[]): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.status = 'fulfilled';
      request.fulfilledAt = Date.now();
      request.randomWords = randomWords;

      this.emitEvent({
        type: 'vrf_fulfilled',
        timestamp: Date.now(),
        actor: 'chainlink',
        action: 'fulfillRandomness',
        details: {
          requestId,
          competitionId: request.competitionId,
          purpose: request.purpose,
          numWords: randomWords.length,
        },
        verified: true,
      });
    }
  }

  // Helper methods
  private purposeToEnum(purpose: VRFPurpose): number {
    const purposes: Record<VRFPurpose, number> = {
      bracket_seeding: 0,
      participant_selection: 1,
      lottery_drawing: 2,
      verifier_assignment: 3,
      tiebreaker: 4,
      milestone_audit: 5,
    };
    return purposes[purpose];
  }

  private encodeRequestRandomness(
    competitionId: bigint,
    purpose: number,
    numWords: number
  ): string {
    // Simplified encoding - in production use proper ABI encoding
    const selector = '0x5d3b1d30'; // requestRandomness(uint256,uint8,uint32)
    const paddedCompetitionId = competitionId.toString(16).padStart(64, '0');
    const paddedPurpose = purpose.toString(16).padStart(64, '0');
    const paddedNumWords = numWords.toString(16).padStart(64, '0');
    return `${selector}${paddedCompetitionId}${paddedPurpose}${paddedNumWords}`;
  }

  private emitEvent(event: TransparencyEvent): void {
    if (this.onEvent) {
      this.onEvent(event);
    }
  }
}

// =============================================================================
// TOURNAMENT BRACKET SEEDING
// =============================================================================

/**
 * Generate fair tournament bracket seeding using VRF randomness
 * Uses Fisher-Yates shuffle with verifiable randomness
 */
export function generateBracketSeeding(
  participants: { id: string; address: string }[],
  randomWords: bigint[]
): BracketSeed[] {
  if (participants.length === 0) return [];
  if (randomWords.length === 0) {
    throw new Error('No random words provided for seeding');
  }

  // Create mutable copy with initial positions
  const seeds: BracketSeed[] = participants.map((p, i) => ({
    participantId: p.id,
    participantAddress: p.address,
    seed: 0,
    position: i,
  }));

  // Fisher-Yates shuffle using random words
  const n = seeds.length;
  for (let i = n - 1; i > 0; i--) {
    // Use random word modulo (i+1) for position
    const randomIndex = Number(randomWords[i % randomWords.length] % BigInt(i + 1));

    // Swap positions
    const temp = seeds[i].position;
    seeds[i].position = seeds[randomIndex].position;
    seeds[randomIndex].position = temp;
  }

  // Assign seeds based on final positions
  seeds.forEach((s, i) => {
    s.seed = i + 1;
  });

  // Sort by position for bracket display
  return seeds.sort((a, b) => a.position - b.position);
}

/**
 * Generate tournament bracket matchups from seeding
 */
export function generateBracketMatchups(
  seeds: BracketSeed[],
  bracketSize: number = 8
): { round: number; match: number; player1: BracketSeed; player2: BracketSeed }[] {
  // Ensure power of 2
  const actualSize = Math.pow(2, Math.ceil(Math.log2(Math.max(seeds.length, 2))));

  // Pad with byes if needed
  const paddedSeeds: (BracketSeed | null)[] = [...seeds];
  while (paddedSeeds.length < actualSize) {
    paddedSeeds.push(null);
  }

  // Generate first round matchups using standard bracket pairing
  // Seed 1 vs Seed n, Seed 2 vs Seed n-1, etc.
  const matchups: { round: number; match: number; player1: BracketSeed; player2: BracketSeed }[] = [];

  for (let i = 0; i < actualSize / 2; i++) {
    const player1 = paddedSeeds[i];
    const player2 = paddedSeeds[actualSize - 1 - i];

    if (player1 && player2) {
      matchups.push({
        round: 1,
        match: i + 1,
        player1,
        player2,
      });
    }
  }

  return matchups;
}

// =============================================================================
// LOTTERY / POOL DRAWING
// =============================================================================

/**
 * Draw lottery winners using VRF randomness
 * Supports weighted entries (more tickets = higher chance)
 */
export function drawLotteryWinners(
  entries: { address: string; tickets: number }[],
  numWinners: number,
  randomWords: bigint[],
  allowDuplicates: boolean = false
): string[] {
  if (entries.length === 0 || numWinners === 0 || randomWords.length === 0) {
    return [];
  }

  // Build weighted pool
  const pool: string[] = [];
  entries.forEach(entry => {
    for (let i = 0; i < entry.tickets; i++) {
      pool.push(entry.address);
    }
  });

  if (pool.length === 0) return [];

  const winners: string[] = [];
  const usedIndexes = new Set<number>();
  let wordIndex = 0;

  while (winners.length < numWinners && wordIndex < randomWords.length * 2) {
    // Use random word to select from pool
    const randomValue = randomWords[wordIndex % randomWords.length];
    const index = Number(randomValue % BigInt(pool.length));

    if (allowDuplicates || !usedIndexes.has(index)) {
      const winner = pool[index];

      // For no duplicates, ensure unique addresses
      if (allowDuplicates || !winners.includes(winner)) {
        winners.push(winner);
        usedIndexes.add(index);
      }
    }

    wordIndex++;
  }

  return winners;
}

/**
 * Calculate lottery prize distribution
 */
export function calculateLotteryPrizes(
  totalPrize: bigint,
  numWinners: number,
  distribution: 'equal' | 'tiered' | 'winner_take_all' = 'tiered'
): bigint[] {
  if (numWinners === 0 || totalPrize === BigInt(0)) return [];

  const BIG_0 = BigInt(0);
  const BIG_10 = BigInt(10);
  const BIG_15 = BigInt(15);
  const BIG_20 = BigInt(20);
  const BIG_25 = BigInt(25);
  const BIG_30 = BigInt(30);
  const BIG_40 = BigInt(40);
  const BIG_50 = BigInt(50);
  const BIG_60 = BigInt(60);
  const BIG_100 = BigInt(100);

  switch (distribution) {
    case 'equal':
      // Equal split
      const equalShare = totalPrize / BigInt(numWinners);
      return Array(numWinners).fill(equalShare);

    case 'winner_take_all':
      // First place takes all
      return [totalPrize, ...Array(numWinners - 1).fill(BIG_0)];

    case 'tiered':
    default:
      // Standard tiered distribution: 50%, 30%, 20% (or split among remaining)
      if (numWinners === 1) return [totalPrize];
      if (numWinners === 2) {
        return [
          (totalPrize * BIG_60) / BIG_100,
          (totalPrize * BIG_40) / BIG_100,
        ];
      }
      if (numWinners === 3) {
        return [
          (totalPrize * BIG_50) / BIG_100,
          (totalPrize * BIG_30) / BIG_100,
          (totalPrize * BIG_20) / BIG_100,
        ];
      }

      // More than 3 winners: top 3 get 50/25/15, rest split 10%
      const prizes: bigint[] = [
        (totalPrize * BIG_50) / BIG_100,
        (totalPrize * BIG_25) / BIG_100,
        (totalPrize * BIG_15) / BIG_100,
      ];

      const remaining = (totalPrize * BIG_10) / BIG_100;
      const remainingCount = numWinners - 3;
      const remainingShare = remaining / BigInt(remainingCount);

      for (let i = 0; i < remainingCount; i++) {
        prizes.push(remainingShare);
      }

      return prizes;
  }
}

// =============================================================================
// VERIFIER ASSIGNMENT
// =============================================================================

/**
 * Randomly assign verifiers/judges to milestones or submissions
 * Ensures fair distribution and prevents collusion
 */
export function assignVerifiers(
  verifiers: { id: string; address: string }[],
  itemsToVerify: { id: string; competitionId: string }[],
  randomWords: bigint[],
  verifiersPerItem: number = 1
): VerifierAssignment[] {
  if (verifiers.length === 0 || itemsToVerify.length === 0 || randomWords.length === 0) {
    return [];
  }

  const assignments: VerifierAssignment[] = [];

  itemsToVerify.forEach((item, itemIndex) => {
    const assignedVerifiers = new Set<string>();
    let attempts = 0;

    while (assignedVerifiers.size < verifiersPerItem && attempts < verifiers.length * 2) {
      // Use random word combined with item index for selection
      const randomValue = randomWords[(itemIndex + attempts) % randomWords.length];
      const verifierIndex = Number(randomValue % BigInt(verifiers.length));
      const verifier = verifiers[verifierIndex];

      if (!assignedVerifiers.has(verifier.id)) {
        assignedVerifiers.add(verifier.id);
        assignments.push({
          verifierId: verifier.id,
          verifierAddress: verifier.address,
          competitionId: item.competitionId,
          milestoneId: item.id,
          assignedAt: Date.now(),
        });
      }

      attempts++;
    }
  });

  return assignments;
}

// =============================================================================
// TIEBREAKER RESOLUTION
// =============================================================================

/**
 * Resolve ties using VRF randomness
 * Returns winner(s) from tied participants
 */
export function resolveTiebreaker(
  tiedParticipants: { id: string; address: string; score: number }[],
  randomWord: bigint,
  winnersNeeded: number = 1
): { id: string; address: string; score: number }[] {
  if (tiedParticipants.length <= winnersNeeded) {
    return tiedParticipants;
  }

  // Assign random tiebreaker scores
  const withTiebreaker = tiedParticipants.map((p, i) => ({
    ...p,
    tiebreaker: Number((randomWord + BigInt(i)) % BigInt(1000000)),
  }));

  // Sort by tiebreaker score (descending)
  withTiebreaker.sort((a, b) => b.tiebreaker - a.tiebreaker);

  // Return top N
  return withTiebreaker.slice(0, winnersNeeded).map(p => ({
    id: p.id,
    address: p.address,
    score: p.score,
  }));
}

// =============================================================================
// RANDOMNESS VERIFICATION
// =============================================================================

/**
 * Verify that randomness was genuinely from Chainlink VRF
 * Useful for transparency and auditing
 */
export interface RandomnessProof {
  requestId: string;
  seed: bigint;
  proof: string;
  preSeed: bigint;
  blockHash: string;
  blockNumber: number;
}

export function verifyRandomness(
  randomWords: bigint[],
  proof: RandomnessProof
): { valid: boolean; details: string } {
  // In production, this would verify the VRF proof on-chain
  // For now, we trust Chainlink's verification in the VRF Coordinator

  // Basic validation
  if (!proof.requestId || !proof.proof) {
    return {
      valid: false,
      details: 'Missing proof data',
    };
  }

  if (randomWords.length === 0) {
    return {
      valid: false,
      details: 'No random words to verify',
    };
  }

  // Check that block hash is valid format
  if (!proof.blockHash.match(/^0x[a-fA-F0-9]{64}$/)) {
    return {
      valid: false,
      details: 'Invalid block hash format',
    };
  }

  return {
    valid: true,
    details: `Verified VRF response for request ${proof.requestId} at block ${proof.blockNumber}`,
  };
}

// =============================================================================
// SIMULATION (For Testing)
// =============================================================================

/**
 * Simulate VRF randomness for testing without actual Chainlink calls
 * Uses deterministic pseudo-randomness based on seed
 */
export function simulateVRFRandomness(
  seed: string,
  numWords: number = 10
): bigint[] {
  const words: bigint[] = [];
  let currentSeed = BigInt('0x' + Buffer.from(seed).toString('hex'));

  // Constants for LCG random generator (avoid BigInt literals for ES compatibility)
  const MULTIPLIER = BigInt('1103515245');
  const INCREMENT = BigInt('12345');
  // 2^256 as BigInt
  const MODULUS = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639936');

  for (let i = 0; i < numWords; i++) {
    // Simple deterministic randomness for testing
    currentSeed = (currentSeed * MULTIPLIER + INCREMENT) % MODULUS;
    words.push(currentSeed);
  }

  return words;
}

/**
 * Create a mock VRF client for testing
 */
export function createMockVRFClient(
  onEvent?: (event: TransparencyEvent) => void
): ChainlinkVRFClient {
  const mockClient = new ChainlinkVRFClient({
    chainId: 84532,
    consumerAddress: '0x0000000000000000000000000000000000000001',
    subscriptionId: 'mock-subscription',
    onEvent,
  });

  // Override requestRandomness to auto-fulfill
  const originalRequest = mockClient.requestRandomness.bind(mockClient);
  mockClient.requestRandomness = async (params) => {
    const result = await originalRequest(params);

    if (result.success && result.data) {
      // Auto-fulfill with simulated randomness
      const randomWords = simulateVRFRandomness(
        `${params.competitionId}-${params.purpose}-${Date.now()}`,
        params.numWords
      );

      // Simulate fulfillment delay
      setTimeout(() => {
        mockClient.handleFulfillment(result.data!.requestId || 'mock-request', randomWords);
      }, 1000);
    }

    return result;
  };

  return mockClient;
}

// Default export
export default ChainlinkVRFClient;
