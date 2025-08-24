/**
 * ERC-20 Paymaster Hook
 * Handle gas payments in USDC and other tokens
 */

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { getAAConfig, isAASupportedOnChain, formatTokenAmount } from '@/lib/aa/config';
import { getPimlicoClient } from '@/lib/aa/pimlico-client';

interface PaymasterToken {
  symbol: string;
  address: string;
  decimals: number;
  icon: string;
  balance?: bigint;
  allowance?: bigint;
}

interface GasQuote {
  tokenAmount: bigint;
  tokenSymbol: string;
  rate: number;
  formattedAmount: string;
}

interface UseERC20PaymasterReturn {
  enabled: boolean;
  isSupported: boolean;
  tokens: PaymasterToken[];
  selectedToken: PaymasterToken | null;
  isLoading: boolean;
  error: string | null;
  gasQuote: GasQuote | null;
  selectToken: (token: PaymasterToken) => void;
  getQuote: (gasAmount: bigint) => Promise<GasQuote | null>;
  checkAllowance: () => Promise<bigint>;
  approveToken: (amount: bigint) => Promise<boolean>;
  canPayWithToken: (gasAmount: bigint) => boolean;
}

export function useERC20Paymaster(chainId?: number): UseERC20PaymasterReturn {
  const account = useActiveAccount();
  const address = account?.address;
  
  // Get chain ID from account or parameter
  const currentChainId = chainId || (account as any)?.chain?.id || 84532; // Default to Base Sepolia
  
  const [tokens, setTokens] = useState<PaymasterToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<PaymasterToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gasQuote, setGasQuote] = useState<GasQuote | null>(null);
  
  // Check if feature is enabled and supported
  const config = getAAConfig(currentChainId);
  const enabled = config.enabled && config.erc20PaymasterEnabled;
  const isSupported = isAASupportedOnChain(currentChainId);
  
  // Load supported tokens
  useEffect(() => {
    if (!enabled || !isSupported) return;
    
    const paymasterTokens = config.paymasterTokens || [];
    setTokens(paymasterTokens);
    
    // Select first token by default
    if (paymasterTokens.length > 0 && !selectedToken) {
      setSelectedToken(paymasterTokens[0]);
    }
  }, [currentChainId, enabled, isSupported]);
  
  // Load token balances
  useEffect(() => {
    if (!address || !tokens.length) return;
    
    loadTokenBalances();
  }, [address, tokens]);
  
  /**
   * Load token balances and allowances
   */
  const loadTokenBalances = async () => {
    if (!address) return;
    
    try {
      // In production, fetch real balances from blockchain
      // For now, mock data
      const updatedTokens = tokens.map(token => ({
        ...token,
        balance: BigInt(1000000000), // 1000 USDC (6 decimals)
        allowance: BigInt(100000000), // 100 USDC allowance
      }));
      
      setTokens(updatedTokens);
    } catch (err) {
      console.error('[ERC20 Paymaster] Failed to load balances:', err);
    }
  };
  
  /**
   * Select a token for gas payment
   */
  const selectToken = useCallback((token: PaymasterToken) => {
    setSelectedToken(token);
    setGasQuote(null);
  }, []);
  
  /**
   * Get quote for gas payment in selected token
   */
  const getQuote = useCallback(async (gasAmount: bigint): Promise<GasQuote | null> => {
    if (!selectedToken || !enabled) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const client = getPimlicoClient(currentChainId);
      const quote = await client.getTokenQuote(selectedToken.address, gasAmount);
      
      const formattedAmount = formatTokenAmount(quote.tokenAmount, selectedToken.decimals);
      
      const gasQuote: GasQuote = {
        tokenAmount: quote.tokenAmount,
        tokenSymbol: selectedToken.symbol,
        rate: quote.rate,
        formattedAmount,
      };
      
      setGasQuote(gasQuote);
      return gasQuote;
    } catch (err: any) {
      setError(err.message || 'Failed to get quote');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [selectedToken, enabled, currentChainId]);
  
  /**
   * Check token allowance for paymaster
   */
  const checkAllowance = useCallback(async (): Promise<bigint> => {
    if (!address || !selectedToken || !enabled) return 0n;
    
    try {
      const client = getPimlicoClient(currentChainId);
      const allowance = await client.getPaymasterAllowance(address, selectedToken.address);
      
      // Update token with latest allowance
      setTokens(prev => prev.map(t => 
        t.address === selectedToken.address 
          ? { ...t, allowance }
          : t
      ));
      
      return allowance;
    } catch (err) {
      console.error('[ERC20 Paymaster] Failed to check allowance:', err);
      return 0n;
    }
  }, [address, selectedToken, enabled, currentChainId]);
  
  /**
   * Approve token for paymaster
   */
  const approveToken = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!address || !selectedToken || !enabled) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In production, send approval transaction
      // For now, mock success
      console.log('[ERC20 Paymaster] Approving token:', {
        token: selectedToken.symbol,
        amount: formatTokenAmount(amount, selectedToken.decimals),
      });
      
      // Simulate approval delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update allowance
      setTokens(prev => prev.map(t => 
        t.address === selectedToken.address 
          ? { ...t, allowance: amount }
          : t
      ));
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to approve token');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, selectedToken, enabled]);
  
  /**
   * Check if user can pay for gas with selected token
   */
  const canPayWithToken = useCallback((gasAmount: bigint): boolean => {
    if (!selectedToken || !gasQuote) return false;
    
    const balance = selectedToken.balance || 0n;
    const allowance = selectedToken.allowance || 0n;
    const required = gasQuote.tokenAmount;
    
    return balance >= required && allowance >= required;
  }, [selectedToken, gasQuote]);
  
  return {
    enabled,
    isSupported,
    tokens,
    selectedToken,
    isLoading,
    error,
    gasQuote,
    selectToken,
    getQuote,
    checkAllowance,
    approveToken,
    canPayWithToken,
  };
}