/**
 * LI.FI REST API Client
 * Lightweight implementation without SDK dependency
 */

import { BRIDGE_CONFIG, isTokenAllowed, isProtocolAllowed, getTokenAddress } from './config';

/**
 * Quote request parameters
 */
export interface QuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string; // Token symbol
  toToken: string;
  fromAmount: string; // Amount in wei
  fromAddress: string; // User wallet
  toAddress?: string; // Recipient (defaults to fromAddress)
  slippage?: number; // Decimal (0.01 = 1%)
  allowExchanges?: boolean;
  maxPriceImpact?: number;
}

/**
 * Route response from LI.FI
 */
export interface Route {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  gasCostUSD?: string;
  executionDuration?: number; // seconds
  steps: RouteStep[];
  tags?: string[]; // CHEAPEST, FASTEST, etc.
}

/**
 * Route step (bridge or swap)
 */
export interface RouteStep {
  id: string;
  type: 'lifi' | 'swap' | 'bridge' | 'custom';
  tool: string; // Bridge/DEX name
  toolDetails: {
    name: string;
    logoURI?: string;
  };
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: TokenInfo;
    toToken: TokenInfo;
    fromAmount: string;
    toAmount: string;
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    executionDuration: number;
    gasCostUSD?: string;
    feeCostUSD?: string;
  };
  transactionRequest?: any; // Transaction to execute
}

/**
 * Token information
 */
export interface TokenInfo {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
}

/**
 * Status response for tracking
 */
export interface StatusResponse {
  transactionId: string;
  status: 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND';
  substatus?: string;
  fromChain: number;
  toChain: number;
  tool: string;
  action: any;
  sending?: {
    txHash?: string;
    amount?: string;
    token?: TokenInfo;
  };
  receiving?: {
    txHash?: string;
    amount?: string;
    token?: TokenInfo;
  };
}

/**
 * LI.FI REST client
 */
class LiFiClient {
  private baseUrl: string;
  private headers: HeadersInit;
  
  constructor() {
    this.baseUrl = BRIDGE_CONFIG.lifi.apiUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Add API key if available
    if (BRIDGE_CONFIG.lifi.apiKey) {
      this.headers['x-lifi-api-key'] = BRIDGE_CONFIG.lifi.apiKey;
    }
  }
  
  /**
   * Get quote for bridge route
   */
  async getQuote(params: QuoteRequest): Promise<{ routes: Route[]; error?: string }> {
    try {
      // Validate tokens
      if (!isTokenAllowed(params.fromToken)) {
        return { routes: [], error: `Token ${params.fromToken} not allowed` };
      }
      if (!isTokenAllowed(params.toToken)) {
        return { routes: [], error: `Token ${params.toToken} not allowed` };
      }
      
      // Get token addresses
      const fromTokenAddress = getTokenAddress(params.fromChain, params.fromToken);
      const toTokenAddress = getTokenAddress(params.toChain, params.toToken);
      
      if (!fromTokenAddress || !toTokenAddress) {
        return { routes: [], error: 'Token not supported on chain' };
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        fromChain: params.fromChain.toString(),
        toChain: params.toChain.toString(),
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress || params.fromAddress,
        slippage: (params.slippage || BRIDGE_CONFIG.slippage.default / 10000).toString(),
        allowExchanges: (params.allowExchanges ?? true).toString(),
      });
      
      // Add preferences
      if (BRIDGE_CONFIG.routePreferences.maxSteps) {
        queryParams.append('maxSteps', BRIDGE_CONFIG.routePreferences.maxSteps.toString());
      }
      if (BRIDGE_CONFIG.routePreferences.preferDirectRoute) {
        queryParams.append('preferDirectRoute', 'true');
      }
      
      const url = `${this.baseUrl}/quote?${queryParams}`;
      
      console.log('[LiFi] Getting quote:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[LiFi] Quote error:', error);
        return { routes: [], error: `Failed to get quote: ${response.status}` };
      }
      
      const data = await response.json();
      
      // Filter routes by allowed protocols
      const filteredRoutes = this.filterRoutes(data.routes || []);
      
      // Sort by preference
      const sortedRoutes = this.sortRoutes(filteredRoutes);
      
      // Return top 3 routes
      return { routes: sortedRoutes.slice(0, 3) };
    } catch (error: any) {
      console.error('[LiFi] Quote error:', error);
      return { routes: [], error: error.message };
    }
  }
  
  /**
   * Get transaction data for route
   */
  async getTransactionData(route: Route): Promise<{ transactionRequest?: any; error?: string }> {
    try {
      // For shadow mode, don't get actual transaction
      if (BRIDGE_CONFIG.shadowMode) {
        console.log('[LiFi] Shadow mode: Skipping transaction data');
        return { transactionRequest: null };
      }
      
      const url = `${this.baseUrl}/advanced/routes`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          routes: [route],
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[LiFi] Transaction data error:', error);
        return { error: `Failed to get transaction: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data.routes?.[0]?.steps?.[0]?.transactionRequest) {
        return { error: 'No transaction data in response' };
      }
      
      return { transactionRequest: data.routes[0].steps[0].transactionRequest };
    } catch (error: any) {
      console.error('[LiFi] Transaction error:', error);
      return { error: error.message };
    }
  }
  
  /**
   * Get status of bridge transaction
   */
  async getStatus(
    txHash: string,
    fromChain: number,
    toChain: number
  ): Promise<StatusResponse | null> {
    try {
      const queryParams = new URLSearchParams({
        txHash,
        fromChain: fromChain.toString(),
        toChain: toChain.toString(),
      });
      
      const url = `${this.baseUrl}/status?${queryParams}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });
      
      if (!response.ok) {
        console.error('[LiFi] Status error:', response.status);
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('[LiFi] Status error:', error);
      return null;
    }
  }
  
  /**
   * Get supported chains
   */
  async getChains(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/chains`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.chains || [];
    } catch (error: any) {
      console.error('[LiFi] Chains error:', error);
      return [];
    }
  }
  
  /**
   * Get supported tokens for chain
   */
  async getTokens(chainId: number): Promise<TokenInfo[]> {
    try {
      const url = `${this.baseUrl}/tokens?chains=${chainId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      const tokens = data.tokens?.[chainId] || [];
      
      // Filter by allowed tokens
      return tokens.filter((token: TokenInfo) => 
        isTokenAllowed(token.symbol)
      );
    } catch (error: any) {
      console.error('[LiFi] Tokens error:', error);
      return [];
    }
  }
  
  /**
   * Filter routes by allowed protocols
   */
  private filterRoutes(routes: Route[]): Route[] {
    return routes.filter(route => {
      // Check all steps use allowed protocols
      return route.steps.every(step => {
        const tool = step.tool.toLowerCase();
        
        // Special case for DEX swaps
        if (step.type === 'swap') {
          return BRIDGE_CONFIG.routePreferences.allowExchanges;
        }
        
        // Check if bridge is allowed
        return isProtocolAllowed(tool);
      });
    });
  }
  
  /**
   * Sort routes by preference
   */
  private sortRoutes(routes: Route[]): Route[] {
    const sortBy = BRIDGE_CONFIG.routePreferences.sort;
    
    return routes.sort((a, b) => {
      if (sortBy === 'CHEAPEST') {
        const aCost = parseFloat(a.gasCostUSD || '0');
        const bCost = parseFloat(b.gasCostUSD || '0');
        return aCost - bCost;
      }
      
      if (sortBy === 'FASTEST') {
        const aTime = a.executionDuration || Infinity;
        const bTime = b.executionDuration || Infinity;
        return aTime - bTime;
      }
      
      if (sortBy === 'SAFEST') {
        // Prefer routes with fewer steps
        return a.steps.length - b.steps.length;
      }
      
      return 0;
    });
  }
  
  /**
   * Track telemetry event
   */
  private track(event: string, data?: any) {
    if (!BRIDGE_CONFIG.security.trackingEnabled) return;
    
    console.log(`[Telemetry] ${event}`, data);
    
    // In production, send to analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(event, data);
    }
  }
}

// Export singleton instance
export const lifiClient = new LiFiClient();