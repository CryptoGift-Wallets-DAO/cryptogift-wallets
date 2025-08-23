/**
 * Tenderly Simulation Adapter
 * Uses Tenderly API for advanced simulation with state diffs
 * CONSULT FIRST before enabling in production
 */

import { SimulationAdapter, type SimulationRequest } from './base';
import type { 
  SimulationResult, 
  BalanceChange, 
  TokenChange, 
  ApprovalDetection,
  Risk 
} from '../config';
import { identifySpender } from '@/lib/approvals/config';

interface TenderlyConfig {
  apiKey: string;
  project: string;
  username: string;
}

interface TenderlySimulationRequest {
  network_id: string;
  from: string;
  to: string;
  input: string;
  value?: string;
  gas?: number;
  gas_price?: string;
  save: boolean;
  save_if_fails: boolean;
  simulation_type: 'quick' | 'full';
}

interface TenderlySimulationResponse {
  simulation: {
    id: string;
    status: boolean;
    gasUsed: number;
    method: string;
    errorMessage?: string;
    errorInfo?: {
      error_message: string;
      address: string;
    };
  };
  transaction: {
    hash: string;
    block_number: number;
    from: string;
    to: string;
    gas: number;
    gas_price: string;
    value: string;
    input: string;
    status: boolean;
    error_message?: string;
    call_trace: any[];
    logs: any[];
    state_diff: any[];
    asset_changes?: Array<{
      token_info: {
        standard: string;
        type: string;
        contract_address: string;
        symbol: string;
        name: string;
        decimals?: number;
      };
      type: string;
      from: string;
      to: string;
      amount?: string;
      token_id?: string;
      raw_amount: string;
    }>;
  };
}

export class TenderlySimulationAdapter extends SimulationAdapter {
  private config: TenderlyConfig | null = null;
  private baseUrl = 'https://api.tenderly.co/api/v1';
  
  constructor(timeout?: number, config?: TenderlyConfig) {
    super(timeout);
    this.config = config || this.loadConfig();
  }
  
  private loadConfig(): TenderlyConfig | null {
    if (typeof window === 'undefined') return null;
    
    const apiKey = process.env.TENDERLY_API_KEY;
    const project = process.env.TENDERLY_PROJECT;
    const username = process.env.TENDERLY_USERNAME;
    
    if (!apiKey || !project || !username) {
      console.warn('Tenderly configuration incomplete');
      return null;
    }
    
    return { apiKey, project, username };
  }
  
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    if (!this.config) {
      throw new Error('Tenderly not configured');
    }
    
    const networkId = this.getNetworkId(request.chainId);
    
    const tenderlyRequest: TenderlySimulationRequest = {
      network_id: networkId,
      from: request.from,
      to: request.to,
      input: request.data,
      value: request.value?.toString() || '0',
      gas: request.gas ? Number(request.gas) : 8000000,
      gas_price: request.gasPrice?.toString() || '20000000000',
      save: false,
      save_if_fails: false,
      simulation_type: 'full',
    };
    
    try {
      const response = await this.withTimeout(
        fetch(`${this.baseUrl}/account/${this.config.username}/project/${this.config.project}/simulate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Access-Key': this.config.apiKey,
          },
          body: JSON.stringify(tenderlyRequest),
        })
      );
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Tenderly API error: ${error}`);
      }
      
      const data: TenderlySimulationResponse = await response.json();
      
      return this.parseResponse(data, request);
      
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        throw new Error('Simulation timed out');
      }
      throw error;
    }
  }
  
  private parseResponse(
    response: TenderlySimulationResponse,
    request: SimulationRequest
  ): SimulationResult {
    const { simulation, transaction } = response;
    
    // Parse balance changes
    const balanceChanges: BalanceChange[] = [];
    const tokenChanges: TokenChange[] = [];
    const approvalsDetected: ApprovalDetection[] = [];
    
    // Process asset changes if available
    if (transaction.asset_changes) {
      transaction.asset_changes.forEach(change => {
        if (change.token_info.standard === 'ERC20') {
          // Track token transfers
          tokenChanges.push({
            token: change.token_info.contract_address as `0x${string}`,
            tokenType: 'ERC20',
            symbol: change.token_info.symbol,
            name: change.token_info.name,
            from: change.from as `0x${string}`,
            to: change.to as `0x${string}`,
            amount: BigInt(change.raw_amount),
          });
          
          // Track balance changes
          if (change.from === request.from || change.to === request.from) {
            const isOutgoing = change.from === request.from;
            balanceChanges.push({
              address: request.from,
              before: 0n, // Tenderly doesn't provide before balance
              after: 0n, // Would need separate query
              diff: isOutgoing ? -BigInt(change.raw_amount) : BigInt(change.raw_amount),
              symbol: change.token_info.symbol,
              decimals: change.token_info.decimals || 18,
            });
          }
        } else if (change.token_info.standard === 'ERC721') {
          tokenChanges.push({
            token: change.token_info.contract_address as `0x${string}`,
            tokenType: 'ERC721',
            name: change.token_info.name,
            from: change.from as `0x${string}`,
            to: change.to as `0x${string}`,
            tokenId: change.token_id ? BigInt(change.token_id) : undefined,
          });
        }
      });
    }
    
    // Parse logs for approvals
    transaction.logs.forEach((log: any) => {
      // Check for Approval event (ERC20)
      if (log.topics[0] === '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925') {
        const owner = `0x${log.topics[1].slice(26)}` as `0x${string}`;
        const spender = `0x${log.topics[2].slice(26)}` as `0x${string}`;
        const amount = BigInt(log.data);
        
        const spenderInfo = identifySpender(spender);
        
        approvalsDetected.push({
          token: log.address,
          tokenType: 'ERC20',
          owner,
          spender,
          amount,
          risk: amount === 2n ** 256n - 1n
            ? (spenderInfo.isKnown ? 'high' : 'critical')
            : (spenderInfo.isKnown ? 'low' : 'medium'),
        });
      }
    });
    
    // Calculate risks
    const risks: Risk[] = [];
    
    if (!simulation.status) {
      risks.push({
        level: 'danger',
        title: 'Transaction will fail',
        description: simulation.errorMessage || 'Transaction is expected to revert',
        mitigation: 'Review transaction parameters',
      });
    }
    
    // Check for high gas usage
    const gasUsed = BigInt(simulation.gasUsed);
    const gasPrice = BigInt(transaction.gas_price);
    const gasCost = gasUsed * gasPrice;
    
    if (gasCost > 10n ** 17n) { // > 0.1 ETH
      risks.push({
        level: 'warning',
        title: 'High gas cost',
        description: `Estimated gas cost: ${(gasCost / 10n ** 18n).toString()} ETH`,
        mitigation: 'Consider waiting for lower gas prices',
      });
    }
    
    return {
      success: simulation.status,
      revertReason: simulation.errorMessage,
      gasEstimate: gasUsed,
      gasPrice,
      totalCost: gasCost + BigInt(transaction.value || 0),
      balanceChanges,
      tokenChanges,
      approvalsDetected,
      risks,
      raw: response,
    };
  }
  
  private getNetworkId(chainId: number): string {
    const networks: Record<number, string> = {
      1: '1',        // Ethereum Mainnet
      11155111: '11155111', // Sepolia
      8453: '8453',  // Base
      84532: '84532', // Base Sepolia
    };
    
    const networkId = networks[chainId];
    if (!networkId) {
      throw new Error(`Unsupported network for Tenderly: ${chainId}`);
    }
    
    return networkId;
  }
  
  async isAvailable(): Promise<boolean> {
    if (!this.config) return false;
    
    try {
      // Check API connectivity
      const response = await fetch(`${this.baseUrl}/account/${this.config.username}/project/${this.config.project}`, {
        method: 'GET',
        headers: {
          'X-Access-Key': this.config.apiKey,
        },
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  getName(): string {
    return 'Tenderly';
  }
}