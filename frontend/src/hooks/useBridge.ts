/**
 * Bridge Hook
 * Manages bridge quotes, execution, and tracking
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { prepareTransaction, sendTransaction } from 'thirdweb';
import { client } from '@/app/client';
import { baseSepolia } from 'thirdweb/chains';
import { BRIDGE_CONFIG, calculateSlippage } from '@/lib/bridges/config';
import { lifiClient, type Route, type QuoteRequest } from '@/lib/bridges/lifi-client';

export interface BridgeQuote {
  routes: Route[];
  fromAmount: string;
  estimatedToAmount: string;
  estimatedGas: string;
  estimatedTime: number;
  selectedRoute?: Route;
}

export function useBridge() {
  const account = useActiveAccount();
  const address = account?.address;
  
  const [enabled] = useState(() => BRIDGE_CONFIG.enabled);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  
  // Get quote for bridge
  const getQuote = useCallback(async (params: {
    fromChain: number;
    toChain: number;
    fromToken: string;
    toToken: string;
    amount: string; // Amount in token units (not wei)
  }) => {
    if (!address) {
      setError('Connect wallet first');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    setQuote(null);
    
    try {
      // Convert amount to wei (assuming 18 decimals for ETH, 6 for USDC)
      const decimals = params.fromToken === 'USDC' ? 6 : 18;
      const fromAmount = (parseFloat(params.amount) * Math.pow(10, decimals)).toString();
      
      // Check amount limits
      const amountUSD = parseFloat(params.amount); // Simplified, should use price oracle
      if (amountUSD < BRIDGE_CONFIG.limits.min) {
        throw new Error(`Minimum amount is $${BRIDGE_CONFIG.limits.min}`);
      }
      if (amountUSD > BRIDGE_CONFIG.limits.max) {
        throw new Error(`Maximum amount is $${BRIDGE_CONFIG.limits.max}`);
      }
      
      const quoteRequest: QuoteRequest = {
        fromChain: params.fromChain,
        toChain: params.toChain,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount,
        fromAddress: address,
        slippage: BRIDGE_CONFIG.slippage.default / 10000,
      };
      
      // Track quote request
      track('QUOTE_REQUEST', {
        fromChain: params.fromChain,
        toChain: params.toChain,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
      });
      
      const result = await lifiClient.getQuote(quoteRequest);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.routes.length === 0) {
        throw new Error('No routes available for this bridge');
      }
      
      // Calculate estimates
      const bestRoute = result.routes[0];
      const toDecimals = params.toToken === 'USDC' ? 6 : 18;
      const estimatedToAmount = (parseFloat(bestRoute.toAmount) / Math.pow(10, toDecimals)).toFixed(6);
      
      const bridgeQuote: BridgeQuote = {
        routes: result.routes,
        fromAmount: params.amount,
        estimatedToAmount,
        estimatedGas: bestRoute.gasCostUSD || '0',
        estimatedTime: bestRoute.executionDuration || 0,
        selectedRoute: bestRoute,
      };
      
      setQuote(bridgeQuote);
      
      // Track success
      track('QUOTE_SUCCESS', {
        routeCount: result.routes.length,
        estimatedToAmount,
        estimatedGas: bestRoute.gasCostUSD,
        estimatedTime: bestRoute.executionDuration,
      });
      
      return bridgeQuote;
    } catch (err: any) {
      const message = err.message || 'Failed to get quote';
      setError(message);
      
      // Track failure
      track('QUOTE_FAILURE', { error: message });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);
  
  // Select a route
  const selectRoute = useCallback((routeId: string) => {
    if (!quote) return;
    
    const route = quote.routes.find(r => r.id === routeId);
    if (!route) return;
    
    setQuote({
      ...quote,
      selectedRoute: route,
    });
    
    // Track selection
    track('ROUTE_SELECTED', {
      routeId,
      tool: route.steps[0]?.tool,
      steps: route.steps.length,
    });
  }, [quote]);
  
  // Execute bridge
  const executeBridge = useCallback(async () => {
    if (!account || !address || !quote?.selectedRoute) {
      setError('No route selected');
      return false;
    }
    
    setIsExecuting(true);
    setError(null);
    setTxHash(null);
    setStatus('preparing');
    
    try {
      const route = quote.selectedRoute;
      
      // Track execution start
      track('EXECUTION_START', {
        routeId: route.id,
        fromChain: route.fromChainId,
        toChain: route.toChainId,
      });
      
      // Shadow mode - don't execute
      if (BRIDGE_CONFIG.shadowMode) {
        console.log('[Bridge] Shadow mode: Would execute route', route);
        setStatus('shadow_complete');
        
        // Simulate success
        setTimeout(() => {
          track('EXECUTION_SUCCESS', { shadow: true });
          setIsExecuting(false);
        }, 2000);
        
        return true;
      }
      
      // Get transaction data
      setStatus('getting_transaction');
      const txData = await lifiClient.getTransactionData(route);
      
      if (txData.error || !txData.transactionRequest) {
        throw new Error(txData.error || 'Failed to get transaction');
      }
      
      // Check approval if needed
      const firstStep = route.steps[0];
      if (firstStep?.action?.fromToken?.address !== '0x0000000000000000000000000000000000000000') {
        setStatus('checking_approval');
        
        // Track approval
        track('APPROVAL_REQUEST', {
          token: firstStep.action.fromToken.symbol,
          spender: txData.transactionRequest.to,
        });
        
        // In production, check and request approval here
        console.log('[Bridge] Would check/request approval for', firstStep.action.fromToken.symbol);
      }
      
      // Prepare transaction
      setStatus('sending_transaction');
      const tx = prepareTransaction({
        chain: baseSepolia, // TODO: Get chain dynamically based on route
        client,
        to: txData.transactionRequest.to,
        data: txData.transactionRequest.data,
        value: BigInt(txData.transactionRequest.value || '0'),
        gas: BigInt(txData.transactionRequest.gasLimit || '500000'),
      });
      
      // Send transaction
      const result = await sendTransaction({
        transaction: tx,
        account,
      });
      
      const hash = result.transactionHash;
      setTxHash(hash);
      setStatus('confirming');
      
      console.log('[Bridge] Transaction sent:', hash);
      
      // Track success
      track('EXECUTION_SUCCESS', {
        txHash: hash,
        routeId: route.id,
      });
      
      // Start tracking status
      trackBridgeStatus(hash, route.fromChainId, route.toChainId);
      
      return true;
    } catch (err: any) {
      const message = err.message || 'Bridge execution failed';
      setError(message);
      setStatus('failed');
      
      // Track failure
      track('EXECUTION_FAILURE', { error: message });
      
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, [account, address, quote]);
  
  // Track bridge status
  const trackBridgeStatus = useCallback(async (
    txHash: string,
    fromChain: number,
    toChain: number
  ) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5s intervals
    
    const checkStatus = async () => {
      attempts++;
      
      const status = await lifiClient.getStatus(txHash, fromChain, toChain);
      
      if (!status) {
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          setStatus('timeout');
        }
        return;
      }
      
      setStatus(status.status.toLowerCase());
      
      if (status.status === 'PENDING') {
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        }
      } else if (status.status === 'DONE') {
        console.log('[Bridge] Complete:', status);
      } else if (status.status === 'FAILED') {
        setError('Bridge failed: ' + (status.substatus || 'Unknown error'));
      }
    };
    
    // Start checking after 5 seconds
    setTimeout(checkStatus, 5000);
  }, []);
  
  // Track telemetry
  const track = useCallback((event: string, data?: any) => {
    const eventName = BRIDGE_CONFIG.telemetry.events[event as keyof typeof BRIDGE_CONFIG.telemetry.events] || event;
    
    console.log(`[Telemetry] ${eventName}`, data);
    
    // In production, send to analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(eventName, {
        ...data,
        provider: BRIDGE_CONFIG.provider,
        shadowMode: BRIDGE_CONFIG.shadowMode,
      });
    }
  }, []);
  
  return {
    // Feature flag
    enabled,
    shadowMode: BRIDGE_CONFIG.shadowMode,
    
    // State
    isLoading,
    isExecuting,
    error,
    quote,
    txHash,
    status,
    
    // Actions
    getQuote,
    selectRoute,
    executeBridge,
    
    // Config
    config: BRIDGE_CONFIG,
  };
}