import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";

// Helper function to get real wallet data
async function getWalletData(client: any, address: string) {
  try {
    // Get USDC contract
    const usdcContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_USDC_ADDRESS!,
    });

    // Read USDC balance using proper thirdweb v5 syntax
    let usdcBalance = "0";
    try {
      const balance = await readContract({
        contract: usdcContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [address],
      });
      // Convert from wei to USDC (6 decimals)
      usdcBalance = (Number(balance) / 1000000).toString();
    } catch (balanceError) {
      console.warn('Could not read USDC balance:', balanceError);
    }

    // Get ETH balance (native token) using ThirdWeb v5 method
    let ethBalance = "0";
    try {
      const balance = await readContract({
        contract: getContract({
          client,
          chain: baseSepolia,
          address: "0x0000000000000000000000000000000000000000" // Native ETH
        }),
        method: "function balanceOf(address) view returns (uint256)",
        params: [address]
      });
      ethBalance = (Number(balance) / 1000000000000000000).toString(); // Convert from wei to ETH
    } catch (ethError) {
      // Alternative method for native balance using RPC
      try {
        const provider = new (await import('ethers')).ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const balance = await provider.getBalance(address);
        ethBalance = (Number(balance) / 1000000000000000000).toString();
      } catch (rpcError) {
        console.warn('Could not read ETH balance:', ethError, rpcError);
      }
    }

    return {
      balance: ethBalance,
      tokens: [
        {
          address: process.env.NEXT_PUBLIC_USDC_ADDRESS!,
          symbol: "USDC",
          name: "USD Coin",
          balance: usdcBalance,
          decimals: 6,
        },
        {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "ETH",
          name: "Ethereum",
          balance: ethBalance,
          decimals: 18,
        }
      ],
      transactions: [],
      nfts: [],
    };
  } catch (error) {
    console.error('Error getting wallet data:', error);
    // Return empty data on error
    return {
      balance: "0",
      tokens: [
        {
          address: process.env.NEXT_PUBLIC_USDC_ADDRESS!,
          symbol: "USDC",
          name: "USD Coin",
          balance: "0",
          decimals: 6,
        }
      ],
      transactions: [],
      nfts: [],
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid address parameter' 
      });
    }

    // Initialize ThirdWeb Client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    // Get real wallet data
    const walletData = await getWalletData(client, address);
    
    // Create response with additional metadata
    const response = {
      success: true,
      address,
      ...walletData,
      network: "Base Sepolia",
      chainId: 84532,
      primaryToken: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Wallet API error:', error);
    res.status(500).json({
      error: 'Failed to get wallet data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}