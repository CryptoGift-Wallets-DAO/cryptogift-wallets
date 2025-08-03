/**
 * FORWARDER DIAGNOSIS API
 * Investigates the forwarder contract and gasless transaction flow
 * Helps understand why transactions appear successful but don't show up in Biconomy
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { withDebugAuth } from '../../../lib/debugAuth';
import { biconomyConfig, validateBiconomyConfig } from '../../../lib/biconomy';
import { debugLogger } from '../../../lib/secureDebugLogger';

interface ForwarderDiagnosisResponse {
  success: boolean;
  diagnosis: {
    forwarderContract?: {
      address: string;
      codeExists: boolean;
      isERC2771Forwarder: boolean;
      nonce?: string;
      error?: string;
    };
    biconomyConfig?: {
      isValid: boolean;
      meeConfig: boolean;
      paymasterConfig: boolean;
      urls: {
        paymaster: string;
        bundler: string;
        rpc: string;
      };
    };
    recentTransactions?: {
      totalFound: number;
      gaslessTransactions: any[];
      regularTransactions: any[];
    };
  };
  recommendations: string[];
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ForwarderDiagnosisResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      diagnosis: {},
      recommendations: ['Use GET method'],
      error: 'Method not allowed' 
    });
  }

  const diagnosis: any = {};
  const recommendations: string[] = [];

  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
    
    // 1. INVESTIGATE FORWARDER CONTRACT
    debugLogger.operation('🔍 FORWARDER DIAGNOSIS: Investigating forwarder contract...');
    
    // Get forwarder address from deployment records
    let forwarderAddress: string | null = null;
    
    try {
      // Try to read from broadcast files
      const fs = require('fs');
      const path = require('path');
      const broadcastPath = path.join(process.cwd(), '..', 'broadcast', 'DeployForwarder.s.sol', '84532', 'run-latest.json');
      
      if (fs.existsSync(broadcastPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
        const forwarderTx = deploymentData.transactions?.find((tx: any) => 
          tx.contractName === 'ERC2771ForwarderStandard' || 
          tx.contractName === 'ERC2771Forwarder'
        );
        forwarderAddress = forwarderTx?.contractAddress;
      }
    } catch (error) {
      console.warn('Failed to read forwarder address from deployment files:', error);
    }

    if (forwarderAddress) {
      debugLogger.operation(`🔍 FORWARDER: Found address ${forwarderAddress}`);
      
      try {
        // Check if contract exists
        const code = await provider.getCode(forwarderAddress);
        const codeExists = code !== '0x';
        
        diagnosis.forwarderContract = {
          address: forwarderAddress,
          codeExists,
          isERC2771Forwarder: false,
          error: undefined
        };

        if (codeExists) {
          debugLogger.operation('✅ FORWARDER: Contract code exists');
          
          // Try to call nonce function (standard ERC2771 method)
          try {
            const forwarderABI = [
              "function nonces(address from) view returns (uint256)",
              "function verify((address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data) request, bytes signature) view returns (bool)"
            ];
            const forwarderContract = new ethers.Contract(forwarderAddress, forwarderABI, provider);
            
            // Test with a sample address
            const testAddress = '0x0000000000000000000000000000000000000001';
            const nonce = await forwarderContract.nonces(testAddress);
            
            diagnosis.forwarderContract.nonce = nonce.toString();
            diagnosis.forwarderContract.isERC2771Forwarder = true;
            debugLogger.operation(`✅ FORWARDER: ERC2771 methods work, nonce for test address: ${nonce}`);
          } catch (methodError) {
            console.warn('⚠️ FORWARDER: Contract exists but ERC2771 methods failed:', methodError.message);
            diagnosis.forwarderContract.error = `ERC2771 methods failed: ${methodError.message}`;
            recommendations.push('Forwarder contract may not implement ERC2771 interface correctly');
          }
        } else {
          debugLogger.operation('❌ FORWARDER: No contract code at address');
          recommendations.push('Forwarder contract has no code - deployment may have failed');
        }
      } catch (error) {
        diagnosis.forwarderContract.error = error.message;
        recommendations.push('Failed to interact with forwarder contract');
      }
    } else {
      debugLogger.operation('❌ FORWARDER: No forwarder address found');
      recommendations.push('Cannot find forwarder contract address - check deployment records');
    }

    // 2. BICONOMY CONFIGURATION ANALYSIS
    debugLogger.operation('🔍 BICONOMY DIAGNOSIS: Analyzing configuration...');
    
    const isValidConfig = validateBiconomyConfig();
    diagnosis.biconomyConfig = {
      isValid: isValidConfig,
      meeConfig: !!(biconomyConfig.meeApiKey && biconomyConfig.projectId),
      paymasterConfig: !!(biconomyConfig.paymasterApiKey && biconomyConfig.bundlerUrl),
      urls: {
        paymaster: biconomyConfig.paymasterUrl || 'Not configured',
        bundler: biconomyConfig.bundlerUrl || 'Not configured', 
        rpc: biconomyConfig.rpcUrl || 'Not configured'
      }
    };

    if (!isValidConfig) {
      recommendations.push('Biconomy configuration is incomplete - check environment variables');
    }

    if (biconomyConfig.paymasterUrl?.includes('thirdweb.com')) {
      recommendations.push('Paymaster URL points to ThirdWeb, not Biconomy - this may cause conflicts');
    }

    // 3. RECENT TRANSACTION ANALYSIS
    debugLogger.operation('🔍 TRANSACTION DIAGNOSIS: Searching for recent transactions...');
    
    try {
      const currentBlock = await provider.getBlockNumber();
      const searchBlocks = 1000; // Last 1000 blocks
      const fromBlock = Math.max(0, currentBlock - searchBlocks);
      
      // Search for transactions TO the forwarder (if it exists)
      let gaslessTransactions: any[] = [];
      if (forwarderAddress && diagnosis.forwarderContract?.codeExists) {
        try {
          // Get transactions sent TO the forwarder
          const filter = {
            fromBlock,
            toBlock: 'latest',
            address: forwarderAddress
          };
          
          const logs = await provider.getLogs(filter);
          gaslessTransactions = logs.slice(0, 10); // Limit to 10 recent
        } catch (error) {
          console.warn('Failed to query forwarder transactions:', error.message);
        }
      }

      // Search for regular transactions from deployer wallet
      let regularTransactions: any[] = [];
      try {
        const deployerAddress = process.env.PRIVATE_KEY_DEPLOY ? 
          new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOY).address : null;
        
        if (deployerAddress) {
          // This is a simplified search - in production you'd use more sophisticated querying
          debugLogger.operation(`🔍 Checking recent transactions from deployer: ${deployerAddress}`);
        }
      } catch (error) {
        console.warn('Failed to analyze deployer transactions:', error.message);
      }

      diagnosis.recentTransactions = {
        totalFound: gaslessTransactions.length + regularTransactions.length,
        gaslessTransactions: gaslessTransactions.slice(0, 5),
        regularTransactions: regularTransactions.slice(0, 5)
      };

      if (gaslessTransactions.length === 0 && forwarderAddress) {
        recommendations.push('No transactions found to forwarder contract - gasless transactions may not be working');
      }

    } catch (error) {
      console.warn('Failed to analyze recent transactions:', error.message);
      recommendations.push('Could not analyze recent transactions');
    }

    // 4. GENERATE SPECIFIC RECOMMENDATIONS
    if (diagnosis.forwarderContract?.codeExists && diagnosis.biconomyConfig?.isValid) {
      recommendations.push('✅ Both forwarder and Biconomy config appear valid - check transaction flow logic');
    }

    if (!diagnosis.forwarderContract?.isERC2771Forwarder) {
      recommendations.push('⚠️ Forwarder may not be ERC2771 compatible - verify contract implementation');
    }

    if (diagnosis.recentTransactions?.gaslessTransactions.length === 0) {
      recommendations.push('🔍 No gasless transactions detected - users may be falling back to regular transactions');
    }

    return res.status(200).json({
      success: true,
      diagnosis,
      recommendations
    });

  } catch (error: any) {
    console.error('💥 FORWARDER DIAGNOSIS ERROR:', error);
    return res.status(500).json({
      success: false,
      diagnosis,
      recommendations,
      error: error.message
    });
  }
}

// Export with debug authentication
export default withDebugAuth(handler);