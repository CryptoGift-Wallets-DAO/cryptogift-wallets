/**
 * Active Wallet API Endpoint
 * For useActiveWallet hook backend synchronization
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";

interface ActiveWalletRequest {
  address: string;
  chainId?: number;
  syncBalances?: boolean;
  syncTransactions?: boolean;
}

interface ActiveWalletResponse {
  success: boolean;
  address: string;
  chainId: number;
  isActive: boolean;
  lastSeen?: number;
  balances?: {
    eth: string;
    usdc: string;
  };
  metadata?: {
    network: string;
    primaryToken: string;
    lastSynced: number;
  };
}

// Cache for active wallet sessions (in-memory for now)
const activeWalletCache = new Map<string, { lastSeen: number; chainId: number }>();

// Cleanup interval to remove stale entries (15 minutes)
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [address, data] of activeWalletCache.entries()) {
    if (now - data.lastSeen > CACHE_TTL) {
      activeWalletCache.delete(address);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

async function getQuickBalances(client: any, address: string): Promise<{ eth: string; usdc: string }> {
  try {
    const balances = { eth: "0", usdc: "0" };
    
    // Get USDC balance
    try {
      const usdcContract = getContract({
        client,
        chain: baseSepolia,
        address: process.env.NEXT_PUBLIC_USDC_ADDRESS!,
      });
      
      const usdcBalance = await readContract({
        contract: usdcContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [address],
      });
      balances.usdc = (Number(usdcBalance) / 1000000).toString();
    } catch (usdcError) {
      console.warn('USDC balance read failed:', usdcError);
    }
    
    // Get ETH balance using RPC provider (faster for native token)
    try {
      const provider = new (await import('ethers')).ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const ethBalance = await provider.getBalance(address);
      balances.eth = (Number(ethBalance) / 1000000000000000000).toString();
    } catch (ethError) {
      console.warn('ETH balance read failed:', ethError);
    }
    
    return balances;
  } catch (error) {
    console.error('Balance fetching failed:', error);
    return { eth: "0", usdc: "0" };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ActiveWalletResponse>) {
  try {
    // Support both GET and POST methods
    if (req.method === 'GET') {
      // GET: Simple active status check
      const { address, chainId } = req.query;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({
          success: false,
          address: '',
          chainId: 84532,
          isActive: false,
        });
      }
      
      const cachedData = activeWalletCache.get(address);
      const isActive = !!cachedData && (Date.now() - cachedData.lastSeen < CACHE_TTL);
      
      return res.status(200).json({
        success: true,
        address,
        chainId: cachedData?.chainId || parseInt(chainId as string) || 84532,
        isActive,
        lastSeen: cachedData?.lastSeen,
        metadata: isActive ? {
          network: "Base Sepolia",
          primaryToken: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          lastSynced: Date.now(),
        } : undefined,
      });
    }
    
    if (req.method === 'POST') {
      // POST: Update active status with optional balance sync
      const { address, chainId = 84532, syncBalances = false, syncTransactions = false }: ActiveWalletRequest = req.body;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({
          success: false,
          address: '',
          chainId: 84532,
          isActive: false,
        });
      }
      
      // Update cache
      const now = Date.now();
      activeWalletCache.set(address, { lastSeen: now, chainId });
      
      const response: ActiveWalletResponse = {
        success: true,
        address,
        chainId,
        isActive: true,
        lastSeen: now,
        metadata: {
          network: chainId === 8453 ? "Base Mainnet" : "Base Sepolia",
          primaryToken: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          lastSynced: now,
        },
      };
      
      // Optional balance sync
      if (syncBalances) {
        try {
          const client = createThirdwebClient({
            clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
            secretKey: process.env.TW_SECRET_KEY!,
          });
          
          response.balances = await getQuickBalances(client, address);
        } catch (balanceError) {
          console.error('Balance sync failed:', balanceError);
          // Continue without balances
        }
      }
      
      return res.status(200).json(response);
    }
    
    // Method not allowed
    return res.status(405).json({
      success: false,
      address: '',
      chainId: 84532,
      isActive: false,
    });
    
  } catch (error) {
    console.error('Active wallet API error:', error);
    return res.status(500).json({
      success: false,
      address: '',
      chainId: 84532,
      isActive: false,
    });
  }
}