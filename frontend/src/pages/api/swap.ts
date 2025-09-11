import { NextApiRequest, NextApiResponse } from "next";
import { createBiconomySmartAccount, sendGaslessTransaction, validateBiconomyConfig } from "../../lib/biconomy";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { verifyJWT, extractTokenFromHeaders } from "../../lib/siweAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🚨 SECURITY: JWT Authentication required for swap operations
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);
    
    if (!token) {
      console.log("🚨 SECURITY: No JWT token provided for swap - access denied");
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Valid JWT token required for swap operations'
      });
    }
    
    const payload = verifyJWT(token);
    if (!payload) {
      console.log("🚨 SECURITY: Invalid JWT token for swap - access denied");
      return res.status(401).json({ 
        error: 'Invalid authentication token',
        message: 'Please sign in again to continue'
      });
    }
    
    const authenticatedAddress = payload.address;
    console.log('✅ JWT authentication successful for swap:', {
      address: authenticatedAddress.slice(0, 10) + '...',
      exp: new Date(payload.exp * 1000).toISOString()
    });
    
    // Store authenticated address for later validation
    req.body.authenticatedWallet = authenticatedAddress;
    
  } catch (authError: any) {
    console.error('❌ JWT authentication error for swap:', authError);
    return res.status(401).json({
      error: 'Authentication verification failed',
      message: 'Unable to verify authentication token'
    });
  }

  try {
    const { 
      from, 
      to, 
      amount, 
      tbaAddress, 
      executeSwap = false,
      chainId = 84532 // Base Sepolia for testing
    } = req.body;

    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'Missing required parameters: from, to, amount' });
    }

    // Get quote from 0x Protocol
    const apiUrl = chainId === 84532 
      ? `https://base-sepolia.api.0x.org/swap/v2/quote` // Base Sepolia
      : `https://base.api.0x.org/swap/v2/quote`; // Base Mainnet

    const url = new URL(apiUrl);
    url.searchParams.append('buyToken', to);
    url.searchParams.append('sellToken', from);
    url.searchParams.append('sellAmount', amount);
    url.searchParams.append('permit2', 'true');
    url.searchParams.append('chainId', chainId.toString());
    
    if (tbaAddress) {
      url.searchParams.append('takerAddress', tbaAddress);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if available for higher rate limits
    if (process.env.ZEROX_API_KEY) {
      headers['0x-api-key'] = process.env.ZEROX_API_KEY;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('0x API error:', errorData);
      return res.status(response.status).json({ 
        error: '0x API request failed',
        details: errorData 
      });
    }

    const quote = await response.json();
    const { calldata, to: dest, value, permit2 } = quote;

    if (!calldata || !dest) {
      return res.status(500).json({ error: 'Invalid response from 0x API' });
    }

    // If executeSwap is true, execute the swap gaslessly
    if (executeSwap && tbaAddress) {
      try {
        if (!validateBiconomyConfig()) {
          throw new Error('Biconomy not configured for gasless execution');
        }

        // Create Smart Account for the TBA owner
        const smartAccount = await createBiconomySmartAccount(process.env.PRIVATE_KEY_DEPLOY!);

        // Create ThirdWeb client for contract interaction
        const client = createThirdwebClient({
          clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
          secretKey: process.env.TW_SECRET_KEY!,
        });

        // Prepare the swap transaction
        const swapTransaction = {
          to: dest,
          data: calldata,
          value: value || '0',
        };

        // Execute swap gaslessly
        const swapResult = await sendGaslessTransaction(smartAccount, swapTransaction);

        return res.status(200).json({
          success: true,
          executed: true,
          transactionHash: swapResult.transactionHash,
          quote: {
            calldata,
            dest,
            value: value || '0',
            permit2: permit2 || null
          }
        });
      } catch (swapError) {
        console.error('Gasless swap execution failed:', swapError);
        // Return quote anyway for manual execution
        return res.status(200).json({
          success: true,
          executed: false,
          error: 'Gasless execution failed',
          quote: {
            calldata,
            dest,
            value: value || '0',
            permit2: permit2 || null
          }
        });
      }
    }

    // Return quote only
    res.status(200).json({ 
      success: true,
      executed: false,
      quote: {
        calldata, 
        dest, 
        value: value || '0',
        permit2: permit2 || null
      }
    });
  } catch (error) {
    console.error('Swap API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}