/**
 * Pimlico REST Client
 * Direct API implementation without SDK dependency
 */

import { getAAConfig, formatTokenAmount } from './config';

interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

interface PaymasterResponse {
  paymasterAndData: string;
  preVerificationGas: string;
  verificationGasLimit: string;
  callGasLimit: string;
  paymaster?: string;
}

interface GasEstimateResponse {
  preVerificationGas: string;
  verificationGasLimit: string;
  callGasLimit: string;
}

export class PimlicoClient {
  private apiKey: string;
  private chainId: number;
  private bundlerUrl: string;
  
  constructor(chainId: number) {
    const config = getAAConfig(chainId);
    this.apiKey = config.pimlico.apiKey;
    this.chainId = chainId;
    this.bundlerUrl = config.bundlerUrl;
  }
  
  /**
   * Sponsor user operation with ERC-20 paymaster
   */
  async sponsorUserOperation(
    userOp: Partial<UserOperation>,
    paymasterToken?: string
  ): Promise<PaymasterResponse> {
    try {
      const method = paymasterToken 
        ? 'pm_sponsorUserOperation' 
        : 'pm_sponsorUserOperation';
      
      const params = paymasterToken
        ? [
            userOp,
            {
              token: paymasterToken,
              // Additional paymaster config
            },
          ]
        : [userOp];
      
      const response = await this.sendRequest(method, params);
      
      console.log('[Pimlico] Paymaster response:', {
        paymaster: response.paymaster,
        token: paymasterToken,
      });
      
      return response;
    } catch (error) {
      console.error('[Pimlico] Sponsor error:', error);
      throw error;
    }
  }
  
  /**
   * Estimate gas for user operation
   */
  async estimateUserOperationGas(
    userOp: Partial<UserOperation>
  ): Promise<GasEstimateResponse> {
    try {
      const response = await this.sendRequest('eth_estimateUserOperationGas', [
        userOp,
        getAAConfig(this.chainId).entryPoint.v07,
      ]);
      
      console.log('[Pimlico] Gas estimate:', response);
      
      return response;
    } catch (error) {
      console.error('[Pimlico] Gas estimate error:', error);
      throw error;
    }
  }
  
  /**
   * Get ERC-20 paymaster allowance
   */
  async getPaymasterAllowance(
    account: string,
    token: string
  ): Promise<bigint> {
    try {
      const response = await this.sendRequest('pm_getERC20TokenAllowance', [
        account,
        token,
      ]);
      
      return BigInt(response);
    } catch (error) {
      console.error('[Pimlico] Allowance error:', error);
      return 0n;
    }
  }
  
  /**
   * Get ERC-20 token quote for gas
   */
  async getTokenQuote(
    token: string,
    gasAmount: bigint
  ): Promise<{
    tokenAmount: bigint;
    rate: number;
  }> {
    try {
      const response = await this.sendRequest('pm_getERC20TokenQuote', [
        token,
        '0x' + gasAmount.toString(16),
      ]);
      
      return {
        tokenAmount: BigInt(response.tokenAmount),
        rate: response.rate,
      };
    } catch (error) {
      console.error('[Pimlico] Quote error:', error);
      throw error;
    }
  }
  
  /**
   * Get supported ERC-20 tokens
   */
  async getSupportedTokens(): Promise<string[]> {
    try {
      const response = await this.sendRequest('pm_supportedERC20Tokens', []);
      return response;
    } catch (error) {
      console.error('[Pimlico] Supported tokens error:', error);
      return [];
    }
  }
  
  /**
   * Send user operation
   */
  async sendUserOperation(
    userOp: UserOperation
  ): Promise<string> {
    try {
      const response = await this.sendRequest('eth_sendUserOperation', [
        userOp,
        getAAConfig(this.chainId).entryPoint.v07,
      ]);
      
      console.log('[Pimlico] UserOp sent:', response);
      
      return response;
    } catch (error) {
      console.error('[Pimlico] Send error:', error);
      throw error;
    }
  }
  
  /**
   * Get user operation receipt
   */
  async getUserOperationReceipt(hash: string): Promise<any> {
    try {
      const response = await this.sendRequest('eth_getUserOperationReceipt', [hash]);
      return response;
    } catch (error) {
      console.error('[Pimlico] Receipt error:', error);
      return null;
    }
  }
  
  /**
   * Get user operation by hash
   */
  async getUserOperationByHash(hash: string): Promise<any> {
    try {
      const response = await this.sendRequest('eth_getUserOperationByHash', [hash]);
      return response;
    } catch (error) {
      console.error('[Pimlico] Get UserOp error:', error);
      return null;
    }
  }
  
  /**
   * Get account nonce
   */
  async getAccountNonce(account: string): Promise<bigint> {
    try {
      const response = await this.sendRequest('eth_getAccountNonce', [
        account,
        getAAConfig(this.chainId).entryPoint.v07,
      ]);
      
      return BigInt(response);
    } catch (error) {
      console.error('[Pimlico] Nonce error:', error);
      return 0n;
    }
  }
  
  /**
   * Validate user operation
   */
  async validateUserOperation(
    userOp: Partial<UserOperation>
  ): Promise<boolean> {
    try {
      // Check if operation meets our security requirements
      const callData = userOp.callData || '0x';
      
      // Extract function selector (first 4 bytes)
      if (callData.length >= 10) {
        const selector = callData.slice(0, 10);
        const config = getAAConfig(this.chainId);
        
        // Check if selector is allowed
        if (!config.paymaster.allowedSelectors.includes(selector)) {
          console.warn('[Pimlico] Function selector not allowed:', selector);
          return false;
        }
      }
      
      // Additional validation can be added here
      
      return true;
    } catch (error) {
      console.error('[Pimlico] Validation error:', error);
      return false;
    }
  }
  
  /**
   * Send JSON-RPC request
   */
  private async sendRequest(method: string, params: any[]): Promise<any> {
    const response = await fetch(this.bundlerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }
    
    return data.result;
  }
}

// Singleton instances per chain
const clients: Map<number, PimlicoClient> = new Map();

/**
 * Get Pimlico client for chain
 */
export function getPimlicoClient(chainId: number): PimlicoClient {
  if (!clients.has(chainId)) {
    clients.set(chainId, new PimlicoClient(chainId));
  }
  return clients.get(chainId)!;
}

/**
 * Format gas estimate for display
 */
export function formatGasEstimate(
  estimate: GasEstimateResponse,
  maxFeePerGas: bigint
): {
  totalGas: bigint;
  totalCostWei: bigint;
  totalCostEth: string;
} {
  const totalGas = 
    BigInt(estimate.preVerificationGas) +
    BigInt(estimate.verificationGasLimit) +
    BigInt(estimate.callGasLimit);
  
  const totalCostWei = totalGas * maxFeePerGas;
  const totalCostEth = formatTokenAmount(totalCostWei, 18);
  
  return {
    totalGas,
    totalCostWei,
    totalCostEth,
  };
}