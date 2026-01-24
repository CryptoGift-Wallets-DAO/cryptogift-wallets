/**
 * KLEROS INTEGRATION
 * Decentralized arbitration for competition disputes
 *
 * Kleros is a decentralized dispute resolution protocol that uses
 * game-theoretic incentives to have jurors correctly assess disputes.
 *
 * Flow:
 * 1. Dispute raised in competition
 * 2. Evidence submitted to Kleros
 * 3. Jurors randomly selected via stake-weighted sortition
 * 4. Jurors vote on outcome
 * 5. Winner determined by Schelling point coordination
 * 6. Appeal period (optional)
 * 7. Final ruling enforced
 *
 * Reference: https://kleros.io/
 * Contracts: https://github.com/kleros/kleros
 */

import type { APIResponse } from '../types';

// ============================================================================
// KLEROS TYPES
// ============================================================================

export interface KlerosDispute {
  disputeId: string;
  competitionId: string;
  arbitrable: string;  // Contract address that requested arbitration
  status: KlerosDisputeStatus;
  ruling: number;
  ruledAt?: number;
  createdAt: number;

  // Case details
  numberOfChoices: number;
  choices: string[];
  currentRound: number;
  nbVotes: number;

  // Evidence
  metaEvidenceURI: string;
  evidenceGroupId: string;

  // Timing
  appealPeriodStart?: number;
  appealPeriodEnd?: number;
}

export type KlerosDisputeStatus =
  | 'Waiting'      // Waiting for evidence
  | 'Appealable'   // Can be appealed
  | 'Solved';      // Final ruling

export interface KlerosEvidence {
  evidenceURI: string;
  submitter: string;
  submittedAt: number;
  title: string;
  description: string;
  fileHash?: string;
}

export interface KlerosJuror {
  address: string;
  stakedPNK: string;  // Amount staked
  subcourts: number[];  // Courts they're eligible for
}

export interface KlerosSubcourt {
  id: number;
  name: string;
  description: string;
  minStake: string;
  feeForJuror: string;
  jurorsForCourtJump: number;
  timePeriods: number[];  // [evidence, commit, vote, appeal, execution] in seconds
}

export interface KlerosArbitrationCost {
  arbitrationCost: string;  // Wei
  feeToken: string;
  courtId: number;
}

export interface MetaEvidence {
  title: string;
  description: string;
  question: string;
  rulingOptions: {
    type: string;
    titles: string[];
    descriptions: string[];
  };
  category: string;
  fileURI?: string;
  evidenceDisplayInterfaceURI?: string;
  aliases?: Record<string, string>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Kleros on different chains
const KLEROS_ADDRESSES: Record<number, {
  court: string;
  arbitrable: string;
  evidenceModule: string;
}> = {
  // Ethereum Mainnet
  1: {
    court: '0x988b3A538b618C7A603e1c11Ab82Cd16dbE28069',
    arbitrable: '0x0000000000000000000000000000000000000000',  // TBD
    evidenceModule: '0x0000000000000000000000000000000000000000'  // TBD
  },
  // Gnosis Chain (xDAI)
  100: {
    court: '0x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002',
    arbitrable: '0xe08a4027e1021Ca45a6b883e4c94C21F0b30C14f',
    evidenceModule: '0x0000000000000000000000000000000000000000'
  },
  // Base Mainnet (production)
  8453: {
    court: '0x0000000000000000000000000000000000000000',  // Not deployed yet on Base Mainnet
    arbitrable: '0x0000000000000000000000000000000000000000',
    evidenceModule: '0x0000000000000000000000000000000000000000'
  },
  // Base Sepolia (testnet - legacy)
  84532: {
    court: '0x0000000000000000000000000000000000000000',  // Not deployed
    arbitrable: '0x0000000000000000000000000000000000000000',
    evidenceModule: '0x0000000000000000000000000000000000000000'
  }
};

// Subcourt IDs for CryptoGift competitions
const COMPETITION_COURTS: Record<string, number> = {
  'prediction': 1,    // General Court - good for simple disputes
  'tournament': 1,    // General Court
  'challenge': 1,     // General Court
  'pool': 1,          // General Court
  'milestone': 1,     // General Court
  'ranking': 1        // General Court
};

// Current chain - PRODUCTION: Base Mainnet
const CHAIN_ID = 8453;  // Base Mainnet

// ============================================================================
// KLEROS CLIENT
// ============================================================================

export class KlerosClient {
  private chainId: number;
  private courtAddress: string;
  private arbitrableAddress: string;

  constructor(chainId: number = CHAIN_ID) {
    this.chainId = chainId;
    const addresses = KLEROS_ADDRESSES[chainId];
    if (!addresses) {
      throw new Error(`Kleros not available on chain ${chainId}`);
    }
    this.courtAddress = addresses.court;
    this.arbitrableAddress = addresses.arbitrable;
  }

  // --------------------------------------------------------------------------
  // DISPUTE CREATION
  // --------------------------------------------------------------------------

  /**
   * Get arbitration cost for a specific court
   */
  async getArbitrationCost(courtId: number): Promise<APIResponse<KlerosArbitrationCost>> {
    try {
      // In production, this would call the Kleros Court contract
      // function arbitrationCost(bytes calldata _extraData) external view returns (uint256)

      // Simulated cost for development
      const cost: KlerosArbitrationCost = {
        arbitrationCost: '100000000000000000',  // 0.1 ETH
        feeToken: '0x0000000000000000000000000000000000000000',  // ETH
        courtId
      };

      return { success: true, data: cost };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ARBITRATION_COST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get arbitration cost'
        }
      };
    }
  }

  /**
   * Create a dispute in Kleros
   */
  async createDispute(params: {
    competitionId: string;
    competitionType: string;
    title: string;
    description: string;
    choices: string[];
    evidenceURI?: string;
    arbitrationCost: string;
  }): Promise<APIResponse<{ disputeId: string; txHash: string }>> {
    try {
      const courtId = COMPETITION_COURTS[params.competitionType] || 1;

      // Create meta-evidence
      const metaEvidence: MetaEvidence = {
        title: `Dispute: ${params.title}`,
        description: params.description,
        question: 'Which party should win this dispute?',
        rulingOptions: {
          type: 'multiple-choice',
          titles: params.choices,
          descriptions: params.choices.map(c => `Rule in favor of ${c}`)
        },
        category: `CryptoGift ${params.competitionType}`,
        evidenceDisplayInterfaceURI: 'https://cryptogift-wallets.vercel.app/evidence-display'
      };

      // Upload meta-evidence to IPFS
      const metaEvidenceURI = await this.uploadToIPFS(metaEvidence);

      // In production, call the arbitrable contract:
      // function createDispute(
      //   uint256 _numberOfChoices,
      //   bytes calldata _extraData
      // ) external payable returns (uint256 disputeID)

      // Simulated dispute creation
      const disputeId = `dispute_${Date.now()}_${params.competitionId}`;

      return {
        success: true,
        data: {
          disputeId,
          txHash: `0x${Date.now().toString(16).padStart(64, '0')}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_DISPUTE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create dispute'
        }
      };
    }
  }

  /**
   * Submit evidence for a dispute
   */
  async submitEvidence(params: {
    disputeId: string;
    title: string;
    description: string;
    fileURI?: string;
    submitter: string;
  }): Promise<APIResponse<{ evidenceURI: string; txHash: string }>> {
    try {
      const evidence = {
        title: params.title,
        description: params.description,
        fileURI: params.fileURI,
        submittedAt: Date.now()
      };

      // Upload evidence to IPFS
      const evidenceURI = await this.uploadToIPFS(evidence);

      // In production, call the evidence module:
      // function submitEvidence(
      //   address _arbitrator,
      //   uint256 _disputeID,
      //   string calldata _evidence
      // ) external

      return {
        success: true,
        data: {
          evidenceURI,
          txHash: `0x${Date.now().toString(16).padStart(64, '0')}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUBMIT_EVIDENCE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to submit evidence'
        }
      };
    }
  }

  // --------------------------------------------------------------------------
  // DISPUTE QUERIES
  // --------------------------------------------------------------------------

  /**
   * Get dispute details
   */
  async getDispute(disputeId: string): Promise<APIResponse<KlerosDispute>> {
    try {
      // In production, call:
      // function disputes(uint256) external view returns (
      //   address arbitrated,
      //   uint256 numberOfRulingOptions,
      //   Period period,
      //   uint256 lastPeriodChange,
      //   uint256 ruled
      // )

      // Simulated dispute data
      const dispute: KlerosDispute = {
        disputeId,
        competitionId: disputeId.split('_')[2] || '',
        arbitrable: this.arbitrableAddress,
        status: 'Waiting',
        ruling: 0,
        createdAt: Date.now() - 86400000,  // 1 day ago
        numberOfChoices: 2,
        choices: ['Plaintiff', 'Defendant'],
        currentRound: 0,
        nbVotes: 3,
        metaEvidenceURI: '',
        evidenceGroupId: disputeId
      };

      return { success: true, data: dispute };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_DISPUTE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get dispute'
        }
      };
    }
  }

  /**
   * Get all evidence for a dispute
   */
  async getEvidence(disputeId: string): Promise<APIResponse<KlerosEvidence[]>> {
    try {
      // In production, query evidence events from the contract

      // Simulated evidence
      const evidence: KlerosEvidence[] = [
        {
          evidenceURI: 'ipfs://Qm...',
          submitter: '0x1234...',
          submittedAt: Date.now() - 3600000,
          title: 'Initial Evidence',
          description: 'Evidence supporting the dispute'
        }
      ];

      return { success: true, data: evidence };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_EVIDENCE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get evidence'
        }
      };
    }
  }

  /**
   * Get current ruling (during or after dispute)
   */
  async getCurrentRuling(disputeId: string): Promise<APIResponse<{
    ruling: number;
    isFinal: boolean;
    appealable: boolean;
    appealDeadline?: number;
  }>> {
    try {
      // In production, call:
      // function currentRuling(uint256 _disputeID) external view returns (uint256 ruling)

      return {
        success: true,
        data: {
          ruling: 0,  // 0 = no ruling yet
          isFinal: false,
          appealable: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_RULING_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get ruling'
        }
      };
    }
  }

  // --------------------------------------------------------------------------
  // APPEALS
  // --------------------------------------------------------------------------

  /**
   * Get appeal cost
   */
  async getAppealCost(disputeId: string): Promise<APIResponse<{
    cost: string;
    deadline: number;
  }>> {
    try {
      // In production, call:
      // function appealCost(uint256 _disputeID, bytes calldata _extraData) external view returns (uint256)

      return {
        success: true,
        data: {
          cost: '200000000000000000',  // 0.2 ETH (typically 2x original cost)
          deadline: Date.now() + 86400000  // 1 day from now
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_APPEAL_COST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get appeal cost'
        }
      };
    }
  }

  /**
   * File an appeal
   */
  async fileAppeal(params: {
    disputeId: string;
    side: number;
    appealCost: string;
  }): Promise<APIResponse<{ txHash: string }>> {
    try {
      // In production, call:
      // function appeal(uint256 _disputeID, bytes calldata _extraData) external payable

      return {
        success: true,
        data: {
          txHash: `0x${Date.now().toString(16).padStart(64, '0')}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_APPEAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to file appeal'
        }
      };
    }
  }

  // --------------------------------------------------------------------------
  // COURT INFO
  // --------------------------------------------------------------------------

  /**
   * Get subcourt details
   */
  async getSubcourt(courtId: number): Promise<APIResponse<KlerosSubcourt>> {
    try {
      // Simulated subcourt data
      const subcourt: KlerosSubcourt = {
        id: courtId,
        name: courtId === 1 ? 'General Court' : 'Specialized Court',
        description: 'For general disputes',
        minStake: '1000000000000000000000',  // 1000 PNK
        feeForJuror: '50000000000000000',    // 0.05 ETH
        jurorsForCourtJump: 511,
        timePeriods: [
          86400,   // Evidence: 1 day
          86400,   // Commit: 1 day
          86400,   // Vote: 1 day
          259200,  // Appeal: 3 days
          86400    // Execution: 1 day
        ]
      };

      return { success: true, data: subcourt };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_SUBCOURT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get subcourt'
        }
      };
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  /**
   * Upload data to IPFS
   */
  private async uploadToIPFS(data: unknown): Promise<string> {
    // In production, upload to IPFS/NFT.Storage
    // Return IPFS URI
    const hash = `Qm${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
    return `ipfs://${hash}`;
  }

  /**
   * Check if Kleros is available on current chain
   */
  isAvailable(): boolean {
    const addresses = KLEROS_ADDRESSES[this.chainId];
    return addresses !== undefined && addresses.court !== '0x0000000000000000000000000000000000000000';
  }

  /**
   * Get expected duration for a dispute
   */
  async getExpectedDuration(courtId: number): Promise<number> {
    const result = await this.getSubcourt(courtId);
    if (!result.success || !result.data) return 0;

    // Sum all time periods
    return result.data.timePeriods.reduce((a, b) => a + b, 0);
  }
}

// ============================================================================
// DISPUTE FLOW HELPERS
// ============================================================================

/**
 * Full dispute creation flow for a competition
 */
export async function createCompetitionDispute(params: {
  competitionId: string;
  competitionType: string;
  disputeReason: string;
  disputer: string;
  defendant: string;
  evidenceTitle?: string;
  evidenceDescription?: string;
  evidenceFileURI?: string;
}): Promise<APIResponse<KlerosDispute>> {
  const client = new KlerosClient();

  // Check if Kleros is available
  if (!client.isAvailable()) {
    return {
      success: false,
      error: {
        code: 'KLEROS_UNAVAILABLE',
        message: 'Kleros is not available on this chain'
      }
    };
  }

  // Get arbitration cost
  const courtId = COMPETITION_COURTS[params.competitionType] || 1;
  const costResult = await client.getArbitrationCost(courtId);
  if (!costResult.success) {
    return { success: false, error: costResult.error };
  }

  // Create the dispute
  const disputeResult = await client.createDispute({
    competitionId: params.competitionId,
    competitionType: params.competitionType,
    title: `Competition ${params.competitionId} Dispute`,
    description: params.disputeReason,
    choices: [params.disputer, params.defendant, 'Split/Other'],
    arbitrationCost: costResult.data!.arbitrationCost
  });

  if (!disputeResult.success) {
    return { success: false, error: disputeResult.error };
  }

  // Submit initial evidence if provided
  if (params.evidenceTitle || params.evidenceDescription) {
    await client.submitEvidence({
      disputeId: disputeResult.data!.disputeId,
      title: params.evidenceTitle || 'Initial Dispute Evidence',
      description: params.evidenceDescription || params.disputeReason,
      fileURI: params.evidenceFileURI,
      submitter: params.disputer
    });
  }

  // Get full dispute details
  return client.getDispute(disputeResult.data!.disputeId);
}

/**
 * Handle Kleros ruling for competition
 */
export async function handleKlerosRuling(params: {
  disputeId: string;
  competitionId: string;
  ruling: number;
  choices: string[];
}): Promise<{
  winner: string;
  action: 'distribute' | 'refund' | 'split';
  details: string;
}> {
  const winnerIndex = params.ruling - 1;  // Kleros rulings are 1-indexed

  if (winnerIndex < 0 || winnerIndex >= params.choices.length) {
    return {
      winner: '',
      action: 'refund',
      details: 'Invalid ruling - processing refund'
    };
  }

  const winner = params.choices[winnerIndex];

  // Check if it's a split ruling
  if (winner.toLowerCase().includes('split') || winner.toLowerCase().includes('other')) {
    return {
      winner: 'Split',
      action: 'split',
      details: 'Dispute resolved with split decision'
    };
  }

  return {
    winner,
    action: 'distribute',
    details: `Kleros ruled in favor of ${winner}`
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let klerosClientInstance: KlerosClient | null = null;

export function getKlerosClient(chainId?: number): KlerosClient {
  if (!klerosClientInstance || (chainId && chainId !== CHAIN_ID)) {
    klerosClientInstance = new KlerosClient(chainId || CHAIN_ID);
  }
  return klerosClientInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default KlerosClient;
