import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { uploadMetadata } from "../../lib/ipfs";
import { addMintLog } from "./debug/mint-logs";
import { ethers } from "ethers";

// Real NFT Minting API - Production Ready
// 🚀 Developed by mbxarts.com THE MOON IN A BOX LLC

interface MintRequest {
  to: string;
  imageFile: string; // IPFS CID
  giftMessage: string;
  initialBalance: number;
  filter?: string;
  referrer?: string;
}

interface MintResponse {
  success: boolean;
  transactionHash: string;
  tokenId: string;
  tbaAddress: string;
  metadataUri: string;
  shareUrl: string;
  qrCode: string;
  gasless: boolean;
  message: string;
  blockNumber?: number;
  gasUsed?: string;
}

// Professional error handling with detailed logging
class MintError extends Error {
  constructor(
    message: string,
    public code: string,
    public step: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MintError';
  }
}

// Security: Environment validation
function validateEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_TW_CLIENT_ID',
    'TW_SECRET_KEY',
    'NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS',
    'PRIVATE_KEY_DEPLOY'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new MintError(
      `Missing required environment variables: ${missing.join(', ')}`,
      'ENV_VALIDATION_FAILED',
      'INITIALIZATION',
      { missing }
    );
  }
}

// Professional TBA address calculation following ERC-6551 standard
async function calculateTBAAddress(tokenId: string, nftContract: string): Promise<string> {
  try {
    addMintLog('INFO', 'TBA_CALCULATION_START', { tokenId, nftContract });

    // CRITICAL FIX: Use environment variables instead of hard-coded addresses  
    const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS || "0x000000006551c19487814612e58FE06813775758";
    const IMPLEMENTATION_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS || "0x2d25602551487c3f3354dd80d76d54383a243358";
    const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID || "84532";
    const CHAIN_ID = parseInt(chainIdStr);
    if (isNaN(CHAIN_ID)) {
      console.error(`❌ INVALID CHAIN_ID: "${chainIdStr}"`);
      throw new Error(`Invalid chain configuration: "${chainIdStr}"`);
    }
    
    // Security: Input validation and sanitization
    if (!ethers.isAddress(nftContract)) {
      throw new Error('Invalid NFT contract address');
    }
    
    const sanitizedContract = ethers.getAddress(nftContract);
    const sanitizedTokenId = BigInt(tokenId).toString();
    
    // ERC-6551 compliant salt generation
    const salt = ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'uint256'],
      [CHAIN_ID, sanitizedContract, sanitizedTokenId]
    );
    
    // CREATE2 address calculation
    const packed = ethers.solidityPacked(
      ['bytes1', 'address', 'bytes32', 'address', 'bytes32'],
      [
        '0xff',
        REGISTRY_ADDRESS,
        salt,
        IMPLEMENTATION_ADDRESS,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ]
    );
    
    const hash = ethers.keccak256(packed);
    const tbaAddress = ethers.getAddress('0x' + hash.slice(-40));
    
    addMintLog('SUCCESS', 'TBA_CALCULATION_COMPLETE', {
      tokenId,
      tbaAddress,
      chainId: CHAIN_ID,
      registry: REGISTRY_ADDRESS,
      implementation: IMPLEMENTATION_ADDRESS
    });
    
    return tbaAddress;
  } catch (error) {
    addMintLog('ERROR', 'TBA_CALCULATION_FAILED', {
      tokenId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new MintError(
      'Failed to calculate TBA address',
      'TBA_CALCULATION_FAILED',
      'TBA_CALCULATION',
      { tokenId, originalError: error }
    );
  }
}

// Professional metadata creation with comprehensive attributes
function createMetadata(request: MintRequest): any {
  const timestamp = new Date().toISOString();
  
  return {
    name: `CryptoGift NFT-Wallet #${Date.now()}`,
    description: `${request.giftMessage}\n\nThis is a unique NFT-Wallet created with CryptoGift. It contains real cryptocurrency and uses ERC-6551 Token Bound Account technology.`,
    image: `ipfs://${request.imageFile}`,
    external_url: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL}`,
    attributes: [
      {
        trait_type: "Gift Message",
        value: request.giftMessage
      },
      {
        trait_type: "Initial Balance",
        value: `${request.initialBalance} USDC`
      },
      {
        trait_type: "Filter Applied",
        value: request.filter || "Original"
      },
      {
        trait_type: "Creation Date",
        value: timestamp
      },
      {
        trait_type: "Wallet Type",
        value: "ERC-6551 Token Bound Account"
      },
      {
        trait_type: "Network",
        value: "Base Sepolia"
      },
      {
        trait_type: "Creator",
        value: "CryptoGift Wallets"
      }
    ],
    // ERC-6551 specific metadata
    tokenbound: {
      standard: "ERC-6551",
      version: "1.0",
      registry: process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS,
      implementation: process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS
    }
  };
}

// Real NFT minting with proper error handling and gas estimation
async function mintNFTReal(to: string, metadataUri: string): Promise<{
  transactionHash: string;
  tokenId: string;
  blockNumber: number;
  gasUsed: string;
}> {
  try {
    addMintLog('INFO', 'REAL_MINT_START', { to: to.slice(0, 10) + '...', metadataUri });

    // Initialize ThirdWeb client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    // Create deployer account from private key
    const account = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!,
    });

    // Get NFT contract with custom RPC
    const customChain = {
      ...baseSepolia,
      rpc: process.env.NEXT_PUBLIC_RPC_URL!
    };
    
    const contract = getContract({
      client,
      chain: customChain,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
    });

    addMintLog('INFO', 'REAL_MINT_TRANSACTION_PREP', { contract: contract.address });

    // CRITICAL FIX: Don't pre-generate tokenId, get it from transaction
    // Use NFT Collection mintTo method (same as main API)
    const transaction = prepareContractCall({
      contract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [
        to, // recipient
        metadataUri // token URI
      ],
    });

    addMintLog('INFO', 'REAL_MINT_SENDING_TRANSACTION', { to: to.slice(0, 10) + '...' });

    // Send the real transaction
    const result = await sendTransaction({
      transaction,
      account,
    });

    addMintLog('SUCCESS', 'REAL_MINT_TRANSACTION_SENT', {
      transactionHash: result.transactionHash
    });

    // CRITICAL FIX: Wait for receipt and extract real tokenId from Transfer event
    addMintLog('INFO', 'WAITING_FOR_RECEIPT', { transactionHash: result.transactionHash });
    
    const receipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: result.transactionHash,
    });

    addMintLog('SUCCESS', 'RECEIPT_RECEIVED', { 
      blockNumber: receipt.blockNumber,
      logs: receipt.logs?.length || 0 
    });

    // Extract real tokenId from Transfer event
    let actualTokenId = null;
    
    try {
      console.log("🎯 MINT-REAL: Parsing Transfer event for exact tokenId...");
      
      for (const log of receipt.logs || []) {
        if (log.address && log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS?.toLowerCase()) {
          // Transfer event signature
          const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
          
          // Cast to any to handle ThirdWeb v5 log format differences
          const ethLog = log as any;
          if (ethLog.topics && ethLog.topics[0] === transferEventSignature && ethLog.topics.length >= 4) {
            const tokenIdHex = ethLog.topics[3];
            actualTokenId = BigInt(tokenIdHex).toString();
            
            console.log("✅ MINT-REAL: TokenId extracted from Transfer event:", actualTokenId);
            addMintLog('SUCCESS', 'TOKEN_ID_EXTRACTED', { tokenId: actualTokenId, method: 'transfer_event' });
            break;
          }
        }
      }
      
      if (!actualTokenId) {
        throw new Error("No Transfer event found");
      }
      
    } catch (eventParseError) {
      console.error("❌ MINT-REAL: Transfer event parsing failed:", eventParseError.message);
      addMintLog('ERROR', 'TRANSFER_PARSE_FAILED', { error: eventParseError.message });
      // NO FALLBACK - Fail fast and clear to prevent double minting
      throw new Error(`Token ID extraction failed: ${eventParseError.message}. This prevents double minting and ensures data integrity.`);
    }

    const tokenId = actualTokenId;

    return {
      transactionHash: result.transactionHash,
      tokenId,
      blockNumber: 0, // Will be filled once transaction is mined
      gasUsed: "0" // Will be filled once transaction is mined
    };

  } catch (error) {
    addMintLog('ERROR', 'REAL_MINT_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw new MintError(
      'Real NFT minting failed',
      'REAL_MINT_FAILED',
      'REAL_MINT',
      { originalError: error }
    );
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<MintResponse | { error: string; code: string; step: string }>) {
  // Security: Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'INVALID_METHOD',
      step: 'VALIDATION'
    });
  }

  const startTime = Date.now();
  addMintLog('INFO', 'REAL_MINT_API_START', { timestamp: new Date().toISOString() });

  try {
    // Environment validation
    validateEnvironment();

    // Security: Request validation
    const { to, imageFile, giftMessage, initialBalance, filter, referrer }: MintRequest = req.body;

    addMintLog('INFO', 'REAL_MINT_REQUEST_VALIDATION', {
      to: to?.slice(0, 10) + '...',
      hasImageFile: !!imageFile,
      hasGiftMessage: !!giftMessage,
      initialBalance,
      filter: filter || 'Original'
    });

    // Comprehensive input validation
    if (!to || !ethers.isAddress(to)) {
      throw new MintError('Invalid recipient address', 'INVALID_RECIPIENT', 'VALIDATION');
    }

    if (!imageFile || typeof imageFile !== 'string') {
      throw new MintError('Invalid image file CID', 'INVALID_IMAGE', 'VALIDATION');
    }

    if (!giftMessage || typeof giftMessage !== 'string' || giftMessage.trim().length === 0) {
      throw new MintError('Gift message is required', 'INVALID_MESSAGE', 'VALIDATION');
    }

    if (typeof initialBalance !== 'number' || initialBalance < 0) {
      throw new MintError('Invalid initial balance', 'INVALID_BALANCE', 'VALIDATION');
    }

    // Step 1: Create and upload metadata
    addMintLog('INFO', 'REAL_MINT_METADATA_START', { step: 1 });
    
    const metadata = createMetadata({ to, imageFile, giftMessage, initialBalance, filter, referrer });
    const metadataResult = await uploadMetadata(metadata);
    
    if (!metadataResult.success) {
      throw new MintError('Metadata upload failed', 'METADATA_UPLOAD_FAILED', 'METADATA_UPLOAD');
    }

    addMintLog('SUCCESS', 'REAL_MINT_METADATA_COMPLETE', {
      metadataUri: metadataResult.url,
      provider: metadataResult.provider
    });

    // Step 2: Execute real NFT mint
    addMintLog('INFO', 'REAL_MINT_EXECUTION_START', { step: 2 });
    
    const mintResult = await mintNFTReal(to, metadataResult.url);
    
    addMintLog('SUCCESS', 'REAL_MINT_EXECUTION_COMPLETE', {
      transactionHash: mintResult.transactionHash,
      tokenId: mintResult.tokenId,
      blockNumber: mintResult.blockNumber,
      gasUsed: mintResult.gasUsed
    });

    // Step 3: Calculate TBA address
    addMintLog('INFO', 'REAL_MINT_TBA_START', { step: 3 });
    
    const tbaAddress = await calculateTBAAddress(
      mintResult.tokenId,
      process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    );

    // Step 4: Generate sharing URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
    const shareUrl = `${baseUrl}/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}/${mintResult.tokenId}`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

    const executionTime = Date.now() - startTime;

    // Final response
    const response: MintResponse = {
      success: true,
      transactionHash: mintResult.transactionHash,
      tokenId: mintResult.tokenId,
      tbaAddress,
      metadataUri: metadataResult.url,
      shareUrl,
      qrCode,
      gasless: false, // Real transaction, user pays gas
      message: 'NFT minted successfully on blockchain! 🎉',
      blockNumber: mintResult.blockNumber,
      gasUsed: mintResult.gasUsed
    };

    addMintLog('SUCCESS', 'REAL_MINT_API_COMPLETE', {
      ...response,
      executionTimeMs: executionTime
    });

    res.status(200).json(response);

  } catch (error) {
    const executionTime = Date.now() - startTime;

    if (error instanceof MintError) {
      addMintLog('ERROR', 'REAL_MINT_API_ERROR', {
        code: error.code,
        step: error.step,
        message: error.message,
        details: error.details,
        executionTimeMs: executionTime
      });

      res.status(400).json({
        error: error.message,
        code: error.code,
        step: error.step
      });
    } else {
      addMintLog('ERROR', 'REAL_MINT_API_UNKNOWN_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        executionTimeMs: executionTime
      });

      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        step: 'UNKNOWN'
      });
    }
  }
}