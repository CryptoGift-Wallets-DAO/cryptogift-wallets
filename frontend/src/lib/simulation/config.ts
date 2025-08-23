/**
 * Transaction Simulation Configuration
 * Feature flags and backend selection for tx simulation
 */

export type SimulationBackend = 'local' | 'tenderly' | 'defender';

export interface SimulationConfig {
  enabled: boolean;
  backend: SimulationBackend;
  timeout: number;
  showGas: boolean;
  showBalances: boolean;
  showApprovals: boolean;
  tenderly?: {
    apiKey: string;
    project: string;
    username: string;
  };
}

export interface SimulationResult {
  success: boolean;
  revertReason?: string;
  gasEstimate?: bigint;
  gasPrice?: bigint;
  totalCost?: bigint;
  balanceChanges: BalanceChange[];
  tokenChanges: TokenChange[];
  approvalsDetected: ApprovalDetection[];
  risks: Risk[];
  raw?: any; // Backend-specific raw response
}

export interface BalanceChange {
  address: string;
  before: bigint;
  after: bigint;
  diff: bigint;
  symbol?: string;
  decimals?: number;
}

export interface TokenChange {
  token: string;
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155';
  symbol?: string;
  name?: string;
  from: string;
  to: string;
  amount?: bigint; // ERC20
  tokenId?: bigint; // ERC721/1155
  ids?: bigint[]; // ERC1155 batch
  amounts?: bigint[]; // ERC1155 batch
}

export interface ApprovalDetection {
  token: string;
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155';
  symbol?: string;
  owner: string;
  spender: string;
  amount?: bigint; // ERC20
  tokenId?: bigint; // ERC721
  isOperator?: boolean; // ERC721/1155
  risk: 'low' | 'medium' | 'high' | 'critical';
}

export interface Risk {
  level: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  mitigation?: string;
}

/**
 * Get simulation configuration from environment
 */
export function getSimulationConfig(): SimulationConfig {
  if (typeof window === 'undefined') {
    return getDefaultConfig();
  }

  const config: SimulationConfig = {
    enabled: process.env.NEXT_PUBLIC_FEATURE_SIM_PREVIEW === 'on',
    backend: (process.env.NEXT_PUBLIC_SIM_BACKEND || 'local') as SimulationBackend,
    timeout: parseInt(process.env.NEXT_PUBLIC_SIM_TIMEOUT || '5000'),
    showGas: process.env.NEXT_PUBLIC_SIM_SHOW_GAS !== 'false',
    showBalances: process.env.NEXT_PUBLIC_SIM_SHOW_BALANCES !== 'false',
    showApprovals: process.env.NEXT_PUBLIC_SIM_SHOW_APPROVALS !== 'false',
  };

  // Add Tenderly config if backend is tenderly
  if (config.backend === 'tenderly') {
    const apiKey = process.env.TENDERLY_API_KEY;
    const project = process.env.TENDERLY_PROJECT;
    const username = process.env.TENDERLY_USERNAME;
    
    if (apiKey && project && username) {
      config.tenderly = { apiKey, project, username };
    } else {
      console.warn('Tenderly backend selected but credentials not configured, falling back to local');
      config.backend = 'local';
    }
  }

  return config;
}

/**
 * Get default configuration
 */
function getDefaultConfig(): SimulationConfig {
  return {
    enabled: false,
    backend: 'local',
    timeout: 5000,
    showGas: true,
    showBalances: true,
    showApprovals: true,
  };
}

/**
 * Check if simulation is enabled
 */
export function isSimulationEnabled(): boolean {
  return getSimulationConfig().enabled;
}

/**
 * Format balance change for display
 */
export function formatBalanceChange(change: BalanceChange): string {
  const diffBigInt = change.after - change.before;
  const isPositive = diffBigInt > 0n;
  const symbol = change.symbol || 'ETH';
  const decimals = change.decimals || 18;
  
  // Convert to decimal string
  const divisor = 10n ** BigInt(decimals);
  const whole = diffBigInt / divisor;
  const fraction = diffBigInt % divisor;
  
  const sign = isPositive ? '+' : '';
  const value = `${whole}.${fraction.toString().padStart(decimals, '0').slice(0, 4)}`;
  
  return `${sign}${value} ${symbol}`;
}

/**
 * Calculate risk level for a transaction
 */
export function calculateTransactionRisk(result: SimulationResult): Risk[] {
  const risks: Risk[] = [];
  
  // Check for revert
  if (!result.success) {
    risks.push({
      level: 'danger',
      title: 'Transaction will fail',
      description: result.revertReason || 'Transaction is expected to revert',
      mitigation: 'Review transaction parameters and ensure sufficient balance',
    });
  }
  
  // Check for high value transfers
  const highValueTransfer = result.balanceChanges.some(change => {
    const value = change.diff < 0n ? -change.diff : change.diff;
    return value > 10n ** 18n; // More than 1 ETH
  });
  
  if (highValueTransfer) {
    risks.push({
      level: 'warning',
      title: 'High value transfer',
      description: 'This transaction involves significant value movement',
      mitigation: 'Double-check recipient address and amounts',
    });
  }
  
  // Check for infinite approvals
  const infiniteApproval = result.approvalsDetected.some(approval => {
    const MAX_UINT256 = 2n ** 256n - 1n;
    return approval.amount === MAX_UINT256;
  });
  
  if (infiniteApproval) {
    risks.push({
      level: 'danger',
      title: 'Unlimited approval detected',
      description: 'This transaction grants unlimited spending permission',
      mitigation: 'Consider approving only the required amount',
    });
  }
  
  // Check for unknown spenders
  const unknownSpender = result.approvalsDetected.some(approval => {
    return approval.risk === 'critical';
  });
  
  if (unknownSpender) {
    risks.push({
      level: 'danger',
      title: 'Unknown contract approval',
      description: 'Approving an unverified contract is risky',
      mitigation: 'Verify the contract address before proceeding',
    });
  }
  
  // Check gas cost
  if (result.totalCost && result.totalCost > 10n ** 17n) { // > 0.1 ETH
    risks.push({
      level: 'warning',
      title: 'High gas cost',
      description: `Estimated gas cost: ${(result.totalCost / 10n ** 18n).toString()} ETH`,
      mitigation: 'Consider waiting for lower gas prices',
    });
  }
  
  return risks;
}