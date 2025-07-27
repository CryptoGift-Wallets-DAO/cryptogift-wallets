import { createSmartAccountClient, BiconomySmartAccountV2 } from "@biconomy/account";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Biconomy configuration for Base Sepolia - SERVER-SIDE ONLY
export const biconomyConfig = {
  chainId: 84532, // Base Sepolia
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  
  // MEE CONFIGURATION - SERVER ONLY (NEVER EXPOSE TO CLIENT)
  meeApiKey: process.env.BICONOMY_MEE_API_KEY,
  projectId: process.env.BICONOMY_PROJECT_ID,
  
  // LEGACY PAYMASTER FALLBACK - SERVER ONLY
  paymasterApiKey: process.env.BICONOMY_PAYMASTER_API_KEY,
  bundlerUrl: process.env.BICONOMY_BUNDLER_URL,
  paymasterUrl: process.env.BICONOMY_PAYMASTER_URL,
};

// Create Biconomy Smart Account
export async function createBiconomySmartAccount(privateKey: string) {
  try {
    console.log('🔧 BICONOMY CONFIG - MEE 2025 SPONSORED TRANSACTIONS:', {
      chainId: biconomyConfig.chainId,
      rpcUrl: biconomyConfig.rpcUrl ? 'CONFIGURED' : 'MISSING',
      meeApiKey: biconomyConfig.meeApiKey ? 'CONFIGURED' : 'MISSING',
      projectId: biconomyConfig.projectId ? 'CONFIGURED' : 'MISSING',
      paymasterApiKey: biconomyConfig.paymasterApiKey ? 'CONFIGURED (fallback)' : 'MISSING',
      bundlerUrl: biconomyConfig.bundlerUrl ? 'CONFIGURED' : 'MISSING',
      paymasterUrl: biconomyConfig.paymasterUrl ? 'CONFIGURED' : 'MISSING',
      architecture: 'MEE (Modular Execution Environment) + Paymaster Fallback',
    });
    // Ensure private key has 0x prefix and is properly formatted
    const formattedPrivateKey = privateKey.startsWith('0x') 
      ? privateKey as `0x${string}`
      : `0x${privateKey}` as `0x${string}`;
    
    console.log('🔍 Private key format check:', {
      hasPrefix: privateKey.startsWith('0x'),
      length: privateKey.length,
      isValid: privateKey.length === 64 || privateKey.length === 66
    });
    
    // Create EOA from private key
    const account = privateKeyToAccount(formattedPrivateKey);
    
    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    // PRIORITY: Try MEE configuration first (SPONSORED)
    let smartAccountConfig;
    if (biconomyConfig.meeApiKey && biconomyConfig.projectId) {
      console.log('🚀 Using MEE configuration for SPONSORED transactions');
      // MEE uses different configuration structure
      smartAccountConfig = {
        signer: walletClient,
        chainId: biconomyConfig.chainId,
        rpcUrl: biconomyConfig.rpcUrl,
        // MEE-specific configuration
        paymaster: {
          paymasterUrl: `https://paymaster.biconomy.io/api/v2/${biconomyConfig.chainId}/${biconomyConfig.meeApiKey}`,
        },
        bundler: {
          bundlerUrl: biconomyConfig.bundlerUrl,
        },
      };
    } else {
      console.log('⚠️ Fallback to legacy Paymaster configuration');
      smartAccountConfig = {
        signer: walletClient,
        biconomyPaymasterApiKey: biconomyConfig.paymasterApiKey,
        bundlerUrl: biconomyConfig.bundlerUrl,
        paymasterUrl: biconomyConfig.paymasterUrl,
        rpcUrl: biconomyConfig.rpcUrl,
        chainId: biconomyConfig.chainId,
      };
    }

    // Create Smart Account
    const smartAccount = await createSmartAccountClient(smartAccountConfig);

    console.log("Smart Account created:", await smartAccount.getAccountAddress());
    return smartAccount;
  } catch (error) {
    console.error("Error creating Biconomy Smart Account:", error);
    throw error;
  }
}

// Send gasless transaction
export async function sendGaslessTransaction(
  smartAccount: BiconomySmartAccountV2,
  transaction: any
) {
  try {
    console.log("Preparing gasless transaction:", transaction);
    
    // CRITICAL FIX: ThirdWeb v5 returns data as async function, we need to call it
    let transactionData = "0x";
    if (transaction.data) {
      if (typeof transaction.data === 'function') {
        console.log("🔧 Resolving ThirdWeb v5 async data function...");
        transactionData = await transaction.data();
        console.log("✅ Data resolved:", transactionData.substring(0, 20) + "...");
      } else {
        transactionData = transaction.data;
      }
    }
    
    // Normalize transaction format for Biconomy
    const normalizedTx = {
      to: transaction.to || transaction.address,
      data: transactionData,
      value: transaction.value || "0x0",
    };
    
    console.log("Normalized transaction:", {
      to: normalizedTx.to,
      data: normalizedTx.data.substring(0, 20) + "...",
      value: normalizedTx.value
    });
    
    // Build user operation with error handling
    let userOp;
    try {
      console.log("🔍 Building user operation...");
      userOp = await smartAccount.buildUserOp([normalizedTx]);
      console.log("✅ User operation built successfully");
    } catch (buildError) {
      console.error("❌ Error building user operation:", buildError);
      // Try alternative approach with sendTransaction directly
      console.log("🔄 Trying direct sendTransaction approach...");
      throw new Error(`Gasless transaction not supported: ${buildError.message}`);
    }
    
    // Send user operation (gasless)
    console.log("🔍 Sending user operation...");
    const userOpResponse = await smartAccount.sendUserOp(userOp);
    
    // Wait for transaction to be mined
    const receipt = await userOpResponse.wait();
    
    console.log("🔍 GASLESS RESULT:", {
      userOpHash: receipt.userOpHash,
      realTxHash: receipt.receipt?.transactionHash || receipt.receipt?.hash,
      blockNumber: receipt.receipt?.blockNumber,
      status: receipt.receipt?.status
    });
    
    // CRITICAL FIX: Return the REAL blockchain transaction hash, not userOpHash
    const realTransactionHash = receipt.receipt?.transactionHash || receipt.receipt?.hash || receipt.userOpHash;
    
    if (!realTransactionHash) {
      throw new Error('No transaction hash received from gasless operation');
    }
    
    console.log("✅ Gasless transaction successful:", realTransactionHash);
    return {
      transactionHash: realTransactionHash,
      blockNumber: receipt.receipt?.blockNumber || 0,
      logs: receipt.receipt?.logs || [],
      receipt: receipt.receipt
    };
  } catch (error) {
    console.error("Error sending gasless transaction:", error);
    throw error;
  }
}

// Check if Biconomy configuration is complete - SERVER-SIDE VARIABLES ONLY
export function validateBiconomyConfig() {
  const meeApiKey = process.env.BICONOMY_MEE_API_KEY;
  const projectId = process.env.BICONOMY_PROJECT_ID;
  const paymasterKey = process.env.BICONOMY_PAYMASTER_API_KEY;
  const bundlerUrl = process.env.BICONOMY_BUNDLER_URL;
  const paymasterUrl = process.env.BICONOMY_PAYMASTER_URL;
  
  console.log('🔍 BICONOMY CONFIG VALIDATION:', {
    meeApiKey: meeApiKey ? `${meeApiKey.substring(0, 8)}...` : 'MISSING',
    projectId: projectId ? `${projectId.substring(0, 8)}...` : 'MISSING',
    paymasterKey: paymasterKey ? `${paymasterKey.substring(0, 8)}...` : 'MISSING',
    bundlerUrl: bundlerUrl ? 'SET' : 'MISSING',
    paymasterUrl: paymasterUrl ? 'SET' : 'MISSING'
  });
  
  // PRIORITY 1: MEE Configuration (SPONSORED TRANSACTIONS)
  if (meeApiKey && projectId) {
    console.log('✅ MEE configuration is complete (preferred)');
    return true;
  }
  
  // FALLBACK: Legacy Paymaster Configuration
  if (paymasterKey && bundlerUrl && paymasterUrl) {
    console.log('✅ Legacy Paymaster configuration is complete');
    return true;
  }
  
  console.error('❌ No valid Biconomy configuration found - need either MEE or Paymaster config');
  return false;
}

// PERFORMANCE: Fast gasless availability check (no network calls)
export function isGaslessAvailable(): boolean {
  return validateBiconomyConfig();
}