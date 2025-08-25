/**
 * Local Simulation Adapter
 * Uses viem's simulateContract for local simulation
 */

import { 
  createPublicClient, 
  http, 
  type PublicClient,
  type Address,
  parseAbi,
  decodeFunctionData,
  formatEther,
} from 'viem';
import { mainnet, sepolia, base, baseSepolia } from 'viem/chains';
import { SimulationAdapter, type SimulationRequest } from './base';
import type { SimulationResult, BalanceChange, TokenChange, ApprovalDetection, Risk } from '../config';
import { identifySpender } from '@/lib/approvals/config';

// Common contract signatures for detection
const SIGNATURES = {
  // ERC20
  TRANSFER: '0xa9059cbb', // transfer(address,uint256)
  APPROVE: '0x095ea7b3', // approve(address,uint256)
  TRANSFER_FROM: '0x23b872dd', // transferFrom(address,address,uint256)
  
  // ERC721
  SAFE_TRANSFER_FROM: '0x42842e0e', // safeTransferFrom(address,address,uint256)
  SET_APPROVAL_FOR_ALL: '0xa22cb465', // setApprovalForAll(address,bool)
  
  // Common DEX
  SWAP: '0x7ff36ab5', // swapExactETHForTokens
  SWAP_V2: '0x38ed1739', // swapExactTokensForTokens
};

const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

export class LocalSimulationAdapter extends SimulationAdapter {
  private clients: Map<number, PublicClient> = new Map();
  
  constructor(timeout?: number) {
    super(timeout);
    this.initializeClients();
  }
  
  private initializeClients() {
    // Initialize clients for supported chains
    const chains = [
      { id: 1, chain: mainnet, rpc: 'https://eth.llamarpc.com' },
      { id: 11155111, chain: sepolia, rpc: 'https://sepolia.gateway.tenderly.co' },
      { id: 8453, chain: base, rpc: 'https://mainnet.base.org' },
      { id: 84532, chain: baseSepolia, rpc: process.env.NEXT_PUBLIC_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e' },
    ];
    
    chains.forEach(({ id, chain, rpc }) => {
      this.clients.set(id, createPublicClient({
        chain,
        transport: http(rpc),
      }) as any);
    });
  }
  
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const client = this.clients.get(request.chainId);
    if (!client) {
      throw new Error(`Unsupported chain ID: ${request.chainId}`);
    }
    
    try {
      // Get initial balances
      const initialBalance = await client.getBalance({ address: request.from });
      
      // Detect transaction type
      const txType = this.detectTransactionType(request.data);
      const { approvals, tokens } = await this.parseTransactionData(
        request,
        client,
        txType
      );
      
      // Use eth_call to simulate
      const result = await this.withTimeout(
        client.call({
          account: request.from,
          to: request.to,
          data: request.data,
          value: request.value,
          gas: request.gas,
        })
      );
      
      // Estimate gas
      const gasEstimate = await this.withTimeout(
        client.estimateGas({
          account: request.from,
          to: request.to,
          data: request.data,
          value: request.value,
        })
      );
      
      // Get gas price
      const gasPrice = await client.getGasPrice();
      const totalCost = gasEstimate * gasPrice + (request.value || 0n);
      
      // Calculate balance changes
      const balanceChanges: BalanceChange[] = [];
      if (request.value && request.value > 0n) {
        balanceChanges.push({
          address: request.from,
          before: initialBalance,
          after: initialBalance - request.value - (gasEstimate * gasPrice),
          diff: -(request.value + (gasEstimate * gasPrice)),
          symbol: 'ETH',
          decimals: 18,
        });
        
        const toBalance = await client.getBalance({ address: request.to });
        balanceChanges.push({
          address: request.to,
          before: toBalance,
          after: toBalance + request.value,
          diff: request.value,
          symbol: 'ETH',
          decimals: 18,
        });
      }
      
      // Build risks
      const risks: Risk[] = [];
      
      // Check if transaction would fail
      if (!result.data) {
        risks.push({
          level: 'danger',
          title: 'Transaction may fail',
          description: 'Simulation returned empty data',
          mitigation: 'Review transaction parameters',
        });
      }
      
      // Check for high gas
      if (totalCost > 10n ** 17n) { // > 0.1 ETH
        risks.push({
          level: 'warning',
          title: 'High transaction cost',
          description: `Estimated cost: ${formatEther(totalCost)} ETH`,
          mitigation: 'Consider waiting for lower gas prices',
        });
      }
      
      // Check approvals
      approvals.forEach(approval => {
        if (approval.risk === 'critical') {
          risks.push({
            level: 'danger',
            title: 'Risky approval detected',
            description: `Approving unknown contract: ${approval.spender.slice(0, 10)}...`,
            mitigation: 'Verify the contract before approving',
          });
        } else if (approval.amount === 2n ** 256n - 1n) {
          risks.push({
            level: 'warning',
            title: 'Unlimited approval',
            description: 'Granting maximum spending permission',
            mitigation: 'Consider approving only needed amount',
          });
        }
      });
      
      return {
        success: true,
        gasEstimate,
        gasPrice,
        totalCost,
        balanceChanges,
        tokenChanges: tokens,
        approvalsDetected: approvals,
        risks,
        raw: { data: result.data },
      };
      
    } catch (error: any) {
      // Handle revert
      if (error.message?.includes('revert')) {
        const revertReason = this.extractRevertReason(error.message);
        return {
          success: false,
          revertReason,
          balanceChanges: [],
          tokenChanges: [],
          approvalsDetected: [],
          risks: [{
            level: 'danger',
            title: 'Transaction will revert',
            description: revertReason || 'Transaction is expected to fail',
            mitigation: 'Check input parameters and account balance',
          }],
        };
      }
      
      throw error;
    }
  }
  
  private detectTransactionType(data: `0x${string}`): string {
    const selector = data.slice(0, 10);
    
    for (const [name, sig] of Object.entries(SIGNATURES)) {
      if (selector === sig) {
        return name;
      }
    }
    
    return 'UNKNOWN';
  }
  
  private async parseTransactionData(
    request: SimulationRequest,
    client: PublicClient,
    txType: string
  ): Promise<{
    approvals: ApprovalDetection[];
    tokens: TokenChange[];
  }> {
    const approvals: ApprovalDetection[] = [];
    const tokens: TokenChange[] = [];
    
    try {
      // Try to decode as ERC20
      if (txType === 'TRANSFER' || txType === 'APPROVE' || txType === 'TRANSFER_FROM') {
        const decoded = decodeFunctionData({
          abi: ERC20_ABI,
          data: request.data,
        });
        
        if (decoded.functionName === 'approve') {
          const [spender, amount] = decoded.args as [Address, bigint];
          const spenderInfo = identifySpender(spender);
          
          // Try to get token info
          let symbol = 'TOKEN';
          try {
            symbol = await client.readContract({
              address: request.to,
              abi: ERC20_ABI,
              functionName: 'symbol',
            } as any) as string;
          } catch {}
          
          approvals.push({
            token: request.to,
            tokenType: 'ERC20',
            symbol,
            owner: request.from,
            spender,
            amount,
            risk: amount === 2n ** 256n - 1n 
              ? (spenderInfo.isKnown ? 'high' : 'critical')
              : (spenderInfo.isKnown ? 'low' : 'medium'),
          });
        } else if (decoded.functionName === 'transfer') {
          const [to, amount] = decoded.args as [Address, bigint];
          
          let symbol = 'TOKEN';
          try {
            symbol = await client.readContract({
              address: request.to,
              abi: ERC20_ABI,
              functionName: 'symbol',
            } as any) as string;
          } catch {}
          
          tokens.push({
            token: request.to,
            tokenType: 'ERC20',
            symbol,
            from: request.from,
            to,
            amount,
          });
        }
      }
    } catch (error) {
      // Not an ERC20 transaction or decoding failed
      console.debug('Failed to decode transaction data:', error);
    }
    
    return { approvals, tokens };
  }
  
  private extractRevertReason(message: string): string {
    // Try to extract revert reason from error message
    const patterns = [
      /revert: (.+)/i,
      /reverted with reason string '(.+)'/i,
      /VM Exception while processing transaction: revert (.+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    // Common revert reasons
    if (message.includes('insufficient')) {
      return 'Insufficient balance';
    }
    if (message.includes('allowance')) {
      return 'Insufficient allowance';
    }
    if (message.includes('transfer amount exceeds')) {
      return 'Transfer amount exceeds balance';
    }
    
    return 'Transaction would revert';
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Check if we can connect to any RPC
      const client = this.clients.get(1); // Mainnet
      if (!client) return false;
      
      const blockNumber = await client.getBlockNumber();
      return blockNumber > 0n;
    } catch {
      return false;
    }
  }
  
  getName(): string {
    return 'Local (viem)';
  }
}