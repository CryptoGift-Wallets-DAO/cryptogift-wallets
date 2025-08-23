/**
 * Secure Approval Revocation System
 * Handles race-condition aware revocation for all token types
 */

import { 
  type Address,
  type Account,
  encodeFunctionData,
  type WalletClient,
} from 'viem';
import { prepareContractCall, sendTransaction } from 'thirdweb';
import type { TokenApproval } from './scanner';

// Contract ABIs for revocation
const REVOKE_ABIS = {
  // ERC-20 approve(spender, amount)
  ERC20_APPROVE: 'function approve(address spender, uint256 amount) returns (bool)',
  // ERC-721 approve(to, tokenId) and setApprovalForAll(operator, approved)
  ERC721_APPROVE: 'function approve(address to, uint256 tokenId)',
  ERC721_SET_APPROVAL_FOR_ALL: 'function setApprovalForAll(address operator, bool approved)',
  // ERC-1155 setApprovalForAll(operator, approved)
  ERC1155_SET_APPROVAL_FOR_ALL: 'function setApprovalForAll(address operator, bool approved)',
} as const;

export interface RevocationRequest {
  approval: TokenApproval;
  simulate?: boolean;
  batchWithOthers?: boolean;
}

export interface RevocationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
}

export interface BatchRevocationResult {
  successful: number;
  failed: number;
  results: Map<string, RevocationResult>;
  batchTransactionHash?: string;
}

export class ApprovalRevoker {
  private client: any; // ThirdWeb client
  private account: Account;

  constructor(client: any, account: Account) {
    this.client = client;
    this.account = account;
  }

  /**
   * Revoke a single approval with race-condition protection
   */
  async revokeApproval(
    request: RevocationRequest
  ): Promise<RevocationResult> {
    const { approval, simulate = true } = request;
    
    try {
      // Build revocation transaction based on token type
      const txData = this.buildRevocationTx(approval);
      
      if (simulate) {
        // Simulate transaction first
        const simulationResult = await this.simulateRevocation(approval, txData);
        if (!simulationResult.success) {
          return simulationResult;
        }
      }
      
      // Execute revocation
      const tx = await prepareContractCall({
        contract: {
          address: approval.token,
          chain: this.client.chain,
          client: this.client,
        },
        method: txData.method,
        params: txData.params,
      });
      
      const result = await sendTransaction({
        transaction: tx,
        account: this.account,
      });
      
      return {
        success: true,
        transactionHash: result.transactionHash,
        gasUsed: result.gasUsed,
        effectiveGasPrice: result.effectiveGasPrice,
      };
      
    } catch (error: any) {
      console.error('Revocation failed:', error);
      return {
        success: false,
        error: error.message || 'Revocation failed',
      };
    }
  }

  /**
   * Batch revoke multiple approvals (for smart accounts)
   */
  async batchRevokeApprovals(
    requests: RevocationRequest[]
  ): Promise<BatchRevocationResult> {
    const results = new Map<string, RevocationResult>();
    let successful = 0;
    let failed = 0;
    
    // Check if account supports batching (smart account)
    const supportsBatching = await this.accountSupportsBatching();
    
    if (supportsBatching) {
      // Build batch transaction
      try {
        const batchTx = await this.buildBatchRevocationTx(requests);
        const result = await this.executeBatchTransaction(batchTx);
        
        if (result.success) {
          successful = requests.length;
          requests.forEach(req => {
            const key = this.getApprovalKey(req.approval);
            results.set(key, { success: true });
          });
          
          return {
            successful,
            failed: 0,
            results,
            batchTransactionHash: result.transactionHash,
          };
        }
      } catch (error) {
        console.error('Batch revocation failed, falling back to individual:', error);
      }
    }
    
    // Fallback to individual revocations
    for (const request of requests) {
      const key = this.getApprovalKey(request.approval);
      const result = await this.revokeApproval(request);
      
      results.set(key, result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      
      // Add delay between transactions to avoid nonce issues
      if (requests.indexOf(request) < requests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      successful,
      failed,
      results,
    };
  }

  /**
   * Build revocation transaction data
   */
  private buildRevocationTx(approval: TokenApproval): {
    method: string;
    params: any[];
  } {
    switch (approval.tokenType) {
      case 'ERC20':
        // CRITICAL: Always set to 0 first to avoid race condition
        return {
          method: REVOKE_ABIS.ERC20_APPROVE,
          params: [approval.spender, BigInt(0)],
        };
        
      case 'ERC721':
        if (approval.isOperator) {
          // Revoke operator status
          return {
            method: REVOKE_ABIS.ERC721_SET_APPROVAL_FOR_ALL,
            params: [approval.spender, false],
          };
        } else if (approval.tokenId !== undefined) {
          // Revoke individual token approval
          return {
            method: REVOKE_ABIS.ERC721_APPROVE,
            params: ['0x0000000000000000000000000000000000000000', approval.tokenId],
          };
        }
        throw new Error('Invalid ERC-721 approval');
        
      case 'ERC1155':
        // Revoke operator status
        return {
          method: REVOKE_ABIS.ERC1155_SET_APPROVAL_FOR_ALL,
          params: [approval.spender, false],
        };
        
      default:
        throw new Error(`Unsupported token type: ${approval.tokenType}`);
    }
  }

  /**
   * Simulate revocation to check for errors
   */
  private async simulateRevocation(
    approval: TokenApproval,
    txData: { method: string; params: any[] }
  ): Promise<RevocationResult> {
    try {
      // Build call data
      const callData = encodeFunctionData({
        abi: [txData.method],
        functionName: txData.method.split('(')[0].replace('function ', ''),
        args: txData.params,
      });
      
      // Simulate call
      const result = await this.client.call({
        account: this.account,
        to: approval.token,
        data: callData,
      });
      
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Simulation failed: ${error.message}`,
      };
    }
  }

  /**
   * Check if account supports batching (smart account)
   */
  private async accountSupportsBatching(): Promise<boolean> {
    // Check if account is a smart contract
    try {
      const code = await this.client.getBytecode({
        address: this.account.address,
      });
      
      // If account has code, it's a smart account
      return code && code !== '0x';
    } catch (error) {
      return false;
    }
  }

  /**
   * Build batch revocation transaction
   */
  private async buildBatchRevocationTx(
    requests: RevocationRequest[]
  ): Promise<any> {
    const calls = requests.map(req => {
      const txData = this.buildRevocationTx(req.approval);
      return {
        to: req.approval.token,
        data: encodeFunctionData({
          abi: [txData.method],
          functionName: txData.method.split('(')[0].replace('function ', ''),
          args: txData.params,
        }),
        value: BigInt(0),
      };
    });
    
    // This would need to be adapted based on the smart account implementation
    // For now, returning a placeholder
    return {
      calls,
    };
  }

  /**
   * Execute batch transaction (for smart accounts)
   */
  private async executeBatchTransaction(batchTx: any): Promise<RevocationResult> {
    // This would need to be implemented based on the smart account standard
    // For now, returning a failure to trigger fallback
    return {
      success: false,
      error: 'Batch transactions not yet implemented',
    };
  }

  /**
   * Get unique key for an approval
   */
  private getApprovalKey(approval: TokenApproval): string {
    return `${approval.token}-${approval.spender}-${approval.tokenId || 'all'}`;
  }
}

/**
 * Helper function to check if an approval is high risk
 */
export function isHighRiskApproval(approval: TokenApproval): boolean {
  const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  
  // Infinite allowance is always high risk
  if (approval.allowance === MAX_UINT256) {
    return true;
  }
  
  // Operator status is high risk
  if (approval.isOperator) {
    return true;
  }
  
  return false;
}

/**
 * Helper function to format approval for display
 */
export function formatApproval(approval: TokenApproval): string {
  if (approval.tokenType === 'ERC20' && approval.allowance) {
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    if (approval.allowance === MAX_UINT256) {
      return 'Unlimited';
    }
    // Format with decimals if available
    return approval.allowance.toString();
  }
  
  if (approval.isOperator) {
    return 'Full Control (Operator)';
  }
  
  if (approval.tokenId !== undefined) {
    return `Token #${approval.tokenId}`;
  }
  
  return 'Unknown';
}