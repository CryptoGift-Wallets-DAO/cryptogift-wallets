import { createSmartAccountClient, BiconomySmartAccountV2 } from "@biconomy/account";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Biconomy configuration for Base Sepolia - ALL FROM ENVIRONMENT VARIABLES
export const biconomyConfig = {
  chainId: 84532, // Base Sepolia
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  
  // MEE CONFIGURATION - Modular Execution Environment (Sponsored)
  meeApiKey: process.env.NEXT_PUBLIC_BICONOMY_MEE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_BICONOMY_PROJECT_ID,
  
  // LEGACY PAYMASTER FALLBACK
  paymasterApiKey: process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY,
  bundlerUrl: process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL,
  paymasterUrl: process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL,
};

// Create Biconomy Smart Account
export async function createBiconomySmartAccount(privateKey: string) {
  try {
    console.log('🔧 BICONOMY CONFIG - MEE 2025 SPONSORED TRANSACTIONS:', {
      chainId: biconomyConfig.chainId,
      rpcUrl: biconomyConfig.rpcUrl,
      meeApiKey: biconomyConfig.meeApiKey.substring(0, 10) + '...',
      projectId: biconomyConfig.projectId,
      paymasterApiKey: biconomyConfig.paymasterApiKey.substring(0, 10) + '... (fallback)',
      bundlerUrl: biconomyConfig.bundlerUrl,
      paymasterUrl: biconomyConfig.paymasterUrl,
      architecture: 'MEE (Modular Execution Environment) + Paymaster Fallback',
    });
    // Ensure private key has 0x prefix and is properly formatted
    const formattedPrivateKey = privateKey.startsWith('0x') 
      ? privateKey as `0x${string}`
      : `0x${privateKey}` as `0x${string}`;
    
    console.log('🔍 Private key format check:', {
      original: privateKey.substring(0, 10) + '...',
      formatted: formattedPrivateKey.substring(0, 10) + '...',
      hasPrefix: privateKey.startsWith('0x'),
      length: privateKey.length
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
    
    console.log("Gasless transaction successful:", receipt.userOpHash);
    return {
      transactionHash: receipt.userOpHash,
      blockNumber: receipt.receipt?.blockNumber || 0,
      logs: receipt.receipt?.logs || [],
      receipt: receipt.receipt
    };
  } catch (error) {
    console.error("Error sending gasless transaction:", error);
    throw error;
  }
}

// Check if Biconomy configuration is complete - ALL FROM ENVIRONMENT VARIABLES ONLY
export function validateBiconomyConfig() {
  const meeApiKey = process.env.NEXT_PUBLIC_BICONOMY_MEE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_BICONOMY_PROJECT_ID;
  const paymasterKey = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY;
  const bundlerUrl = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL;
  const paymasterUrl = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL;
  
  // FAST VALIDATION: Check environment first
  const isValidConfig = (meeApiKey && projectId) || (paymasterKey && bundlerUrl && paymasterUrl);
  
  if (!isValidConfig) {
    console.error('❌ No valid Biconomy configuration found');
    return false;
  }
  
  // PRIORITY 1: MEE Configuration (SPONSORED TRANSACTIONS)
  if (meeApiKey && projectId) {
    console.log('✅ Fast MEE validation passed');
    return true;
  }
  
  // FALLBACK: Legacy Paymaster Configuration
  console.log('⚠️ Fast Paymaster validation passed');
  return true;
}

// PERFORMANCE: Fast gasless availability check (no network calls)
export function isGaslessAvailable(): boolean {
  return validateBiconomyConfig();
}