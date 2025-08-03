import { withDebugAuth } from '../../../lib/debugAuth';
import { debugLogger } from '../../../lib/secureDebugLogger';
/**
 * ESCROW CONTRACT VERIFICATION API
 * Get detailed information about the deployed escrow contract
 * Provides contract verification, function availability, and deployment details
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { readContract } from 'thirdweb';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS } from '../../../lib/escrowABI';
import { getEscrowContract } from '../../../lib/escrowUtils';

// Types
interface ContractInfo {
  success: boolean;
  contractAddress: string;
  network: string;
  verification: {
    hasCode: boolean;
    codeSize?: number;
    isVerified?: boolean;
  };
  functions: {
    available: string[];
    tested: { [key: string]: boolean };
  };
  constants?: {
    [key: string]: any;
  };
  error?: string;
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Test contract functions
async function testContractFunctions(): Promise<{ [key: string]: boolean }> {
  const results: { [key: string]: boolean } = {};
  
  try {
    const escrowContract = getEscrowContract();
    
    // Test basic read functions
    try {
      // This should return some constant values
      const testResult = await readContract({
        contract: escrowContract,
        method: "FIFTEEN_MINUTES",
        params: []
      });
      results['FIFTEEN_MINUTES'] = true;
      debugLogger.contractCall('FIFTEEN_MINUTES', true);
    } catch (error) {
      results['FIFTEEN_MINUTES'] = false;
      debugLogger.contractCall('FIFTEEN_MINUTES', false, (error as Error).message);
    }
    
    try {
      const testResult = await readContract({
        contract: escrowContract,
        method: "SEVEN_DAYS", 
        params: []
      });
      results['SEVEN_DAYS'] = true;
      debugLogger.contractCall('SEVEN_DAYS', true);
    } catch (error) {
      results['SEVEN_DAYS'] = false;
      debugLogger.contractCall('SEVEN_DAYS', false, (error as Error).message);
    }
    
    // Test if we can call getGift (should fail for non-existent token but function should exist)
    try {
      await readContract({
        contract: escrowContract,
        method: "getGift",
        params: [BigInt(999999)] // Non-existent token
      });
      results['getGift'] = true;
    } catch (error) {
      // Function exists but reverts for non-existent token (expected)
      if (error.message?.includes('Gift not found') || error.message?.includes('revert')) {
        results['getGift'] = true;
        debugLogger.contractCall('getGift', true, 'Expected revert for non-existent token');
      } else {
        results['getGift'] = false;
        debugLogger.contractCall('getGift', false, (error as Error).message);
      }
    }
    
    // Test canClaimGift function
    try {
      await readContract({
        contract: escrowContract,
        method: "canClaimGift",
        params: [BigInt(999999)] // Non-existent token
      });
      results['canClaimGift'] = true;
    } catch (error) {
      if (error.message?.includes('Gift not found') || error.message?.includes('revert')) {
        results['canClaimGift'] = true;
        debugLogger.contractCall('canClaimGift', true, 'Expected revert for non-existent token');
      } else {
        results['canClaimGift'] = false;
        debugLogger.contractCall('canClaimGift', false, (error as Error).message);
      }
    }
    
  } catch (error) {
    debugLogger.error('Contract function testing', error as Error);
  }
  
  return results;
}

// Get contract constants
async function getContractConstants(): Promise<{ [key: string]: any }> {
  const constants: { [key: string]: any } = {};
  
  try {
    const escrowContract = getEscrowContract();
    
    // Try to read time constants
    const timeConstants = ['FIFTEEN_MINUTES', 'SEVEN_DAYS', 'FIFTEEN_DAYS', 'THIRTY_DAYS'];
    
    for (const constant of timeConstants) {
      try {
        const value = await readContract({
          contract: escrowContract,
          method: constant as any,
          params: []
        });
        constants[constant] = Number(value);
      } catch (error) {
        constants[constant] = `Error: ${error.message}`;
      }
    }
    
  } catch (error) {
    debugLogger.error('Contract constants read', error as Error);
  }
  
  return constants;
}

// Verify contract deployment
async function verifyContract(): Promise<{
  hasCode: boolean;
  codeSize?: number;
  isVerified?: boolean;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Check if contract has code deployed
    const code = await provider.getCode(ESCROW_CONTRACT_ADDRESS!);
    const hasCode = code !== '0x';
    const codeSize = hasCode ? (code.length - 2) / 2 : 0; // Remove '0x' prefix and convert hex to bytes
    
    debugLogger.operation('Contract verification', {
      contractAddress: ESCROW_CONTRACT_ADDRESS!,
      hasCode,
      codeSize
    });
    
    return {
      hasCode,
      codeSize,
      isVerified: hasCode // We can't easily check if it's verified on BaseScan without API
    };
    
  } catch (error) {
    debugLogger.error('Contract verification', error as Error);
    return {
      hasCode: false,
      isVerified: false
    };
  }
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContractInfo>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      contractAddress: ESCROW_CONTRACT_ADDRESS || 'Not configured',
      network: 'base-sepolia',
      verification: { hasCode: false },
      functions: { available: [], tested: {} },
      error: 'Method not allowed'
    });
  }
  
  try {
    debugLogger.operation('Escrow contract verification', { contractAddress: ESCROW_CONTRACT_ADDRESS! });
    
    // Validate environment
    if (!ESCROW_CONTRACT_ADDRESS) {
      return res.status(500).json({
        success: false,
        contractAddress: 'Not configured',
        network: 'base-sepolia', 
        verification: { hasCode: false },
        functions: { available: [], tested: {} },
        error: 'ESCROW_CONTRACT_ADDRESS not configured'
      });
    }
    
    // Parallel execution for efficiency
    const [verification, functionTests, constants] = await Promise.all([
      verifyContract(),
      testContractFunctions(),
      getContractConstants()
    ]);
    
    // Extract available functions from ABI
    const availableFunctions = ESCROW_ABI
      .filter(item => item.type === 'function')
      .map(item => item.name);
    
    debugLogger.operation('Verification complete', {
      contractAddress: ESCROW_CONTRACT_ADDRESS!,
      hasCode: verification.hasCode,
      functionsAvailable: availableFunctions.length,
      functionsTested: Object.keys(functionTests).length
    });
    
    return res.status(200).json({
      success: true,
      contractAddress: ESCROW_CONTRACT_ADDRESS,
      network: 'base-sepolia',
      verification,
      functions: {
        available: availableFunctions,
        tested: functionTests
      },
      constants
    });
    
  } catch (error: any) {
    debugLogger.error('Escrow contract verification', error);
    return res.status(500).json({
      success: false,
      contractAddress: ESCROW_CONTRACT_ADDRESS || 'Not configured',
      network: 'base-sepolia',
      verification: { hasCode: false },
      functions: { available: [], tested: {} },
      error: error.message || 'Contract verification failed'
    });
  }
}
// Export with debug authentication
export default withDebugAuth(handler);
