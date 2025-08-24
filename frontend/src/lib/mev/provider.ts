/**
 * MEV Protected Provider with automatic fallback
 * Handles chain-aware RPC selection and health checks
 */

import { createPublicClient, http, PublicClient, Chain } from 'viem';
import { mainnet, sepolia, base, baseSepolia } from 'viem/chains';
import { getMEVProtectedRPC, isMEVProtectionAvailable } from './config';

// Chain configurations
const CHAIN_CONFIG: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  8453: base,
  84532: baseSepolia,
};

// Default RPC endpoints (fallback)
const DEFAULT_RPC_ENDPOINTS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  11155111: 'https://sepolia.gateway.tenderly.co',
  8453: 'https://mainnet.base.org',
  84532: process.env.NEXT_PUBLIC_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e',
};

// Health check cache
const healthCheckCache = new Map<string, { healthy: boolean; timestamp: number }>();
const HEALTH_CHECK_TTL = 60000; // 1 minute

// Circuit breaker state
const circuitBreaker = new Map<string, { failures: number; lastFailure: number }>();
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_TIME = 300000; // 5 minutes

/**
 * Check if an RPC endpoint is healthy
 */
async function isRPCHealthy(rpcUrl: string): Promise<boolean> {
  // Check cache first
  const cached = healthCheckCache.get(rpcUrl);
  if (cached && Date.now() - cached.timestamp < HEALTH_CHECK_TTL) {
    return cached.healthy;
  }

  // Check circuit breaker
  const breaker = circuitBreaker.get(rpcUrl);
  if (breaker && breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    if (Date.now() - breaker.lastFailure < CIRCUIT_BREAKER_RESET_TIME) {
      console.warn(`Circuit breaker open for ${rpcUrl}`);
      return false;
    }
    // Reset circuit breaker after timeout
    circuitBreaker.delete(rpcUrl);
  }

  try {
    // Simple health check: get latest block
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    const data = await response.json();
    const healthy = response.ok && data.result !== undefined;

    // Update cache
    healthCheckCache.set(rpcUrl, { healthy, timestamp: Date.now() });

    // Reset circuit breaker on success
    if (healthy && breaker) {
      circuitBreaker.delete(rpcUrl);
    }

    return healthy;
  } catch (error) {
    console.error(`Health check failed for ${rpcUrl}:`, error);
    
    // Update circuit breaker
    const current = circuitBreaker.get(rpcUrl) || { failures: 0, lastFailure: 0 };
    circuitBreaker.set(rpcUrl, {
      failures: current.failures + 1,
      lastFailure: Date.now(),
    });

    // Update cache
    healthCheckCache.set(rpcUrl, { healthy: false, timestamp: Date.now() });
    
    return false;
  }
}

/**
 * Create a public client with MEV protection if available
 */
export async function createMEVProtectedClient(
  chainId: number
): Promise<{
  client: PublicClient;
  isMEVProtected: boolean;
  rpcUrl: string;
}> {
  const chain = CHAIN_CONFIG[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  // Check if MEV protection is available and get RPC
  const mevRPC = getMEVProtectedRPC(chainId);
  
  if (mevRPC) {
    // Try MEV protected RPC first
    const isHealthy = await isRPCHealthy(mevRPC);
    
    if (isHealthy) {
      console.log(`Using MEV protected RPC for chain ${chainId}`);
      return {
        client: createPublicClient({
          chain,
          transport: http(mevRPC),
        }) as any,
        isMEVProtected: true,
        rpcUrl: mevRPC,
      };
    } else {
      console.warn(`MEV protected RPC unhealthy for chain ${chainId}, falling back to public RPC`);
    }
  }

  // Fallback to public RPC
  const publicRPC = DEFAULT_RPC_ENDPOINTS[chainId];
  if (!publicRPC) {
    throw new Error(`No RPC endpoint available for chain ${chainId}`);
  }

  console.log(`Using public RPC for chain ${chainId} (MEV protection not available)`);
  return {
    client: createPublicClient({
      chain,
      transport: http(publicRPC),
    }) as PublicClient,
    isMEVProtected: false,
    rpcUrl: publicRPC,
  };
}

/**
 * Get RPC endpoint for a chain with fallback logic
 */
export async function getRPCEndpoint(
  chainId: number,
  preferMEVProtection: boolean = true
): Promise<{ url: string; isMEVProtected: boolean }> {
  if (preferMEVProtection && isMEVProtectionAvailable(chainId)) {
    const mevRPC = getMEVProtectedRPC(chainId);
    if (mevRPC && await isRPCHealthy(mevRPC)) {
      return { url: mevRPC, isMEVProtected: true };
    }
  }

  // Fallback to public RPC
  const publicRPC = DEFAULT_RPC_ENDPOINTS[chainId];
  if (!publicRPC) {
    throw new Error(`No RPC endpoint available for chain ${chainId}`);
  }

  return { url: publicRPC, isMEVProtected: false };
}

/**
 * Force health check refresh for an RPC
 */
export function invalidateHealthCheck(rpcUrl: string): void {
  healthCheckCache.delete(rpcUrl);
}

/**
 * Get health check status
 */
export function getHealthStatus(): {
  cache: Array<{ url: string; healthy: boolean; age: number }>;
  circuitBreakers: Array<{ url: string; failures: number; timeSinceLastFailure: number }>;
} {
  const now = Date.now();
  
  return {
    cache: Array.from(healthCheckCache.entries()).map(([url, data]) => ({
      url,
      healthy: data.healthy,
      age: now - data.timestamp,
    })),
    circuitBreakers: Array.from(circuitBreaker.entries()).map(([url, data]) => ({
      url,
      failures: data.failures,
      timeSinceLastFailure: now - data.lastFailure,
    })),
  };
}