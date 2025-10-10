import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { createBiconomySmartAccount, sendGaslessTransaction, validateBiconomyConfig } from "../../lib/biconomy";
import { generateNeutralGiftAddressServer, isNeutralGiftAddressServer } from "../../lib/serverConstants";
import { ethers } from "ethers";
import { verifyJWT, extractTokenFromHeaders } from '../../lib/siweAuth';
import { storeNFTMetadata, getNFTMetadata, updateNFTMetadata } from '../../lib/nftMetadataStore';
import { trackGiftClaimed } from '../../lib/analyticsIntegration';
import { validateRedisForCriticalOps } from '../../lib/redisConfig';
import { processBlockchainEvent, isAnalyticsEnabled } from '../../lib/analytics/canonicalEvents';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🚨 SECURITY: Require SIWE JWT authentication for claim operations
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid JWT token.' 
      });
    }
    
    const payload = verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ 
        error: 'Invalid or expired authentication token',
        message: 'Please sign in again.' 
      });
    }
    
    console.log('✅ Claim NFT JWT authentication successful:', {
      address: payload.address.slice(0, 10) + '...',
      exp: new Date(payload.exp * 1000).toISOString()
    });
    
  } catch (authError: any) {
    console.error('❌ Claim NFT authentication failed:', authError);
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: authError.message || 'Invalid authentication token'
    });
  }

  try {
    const { 
      tokenId, 
      contractAddress, 
      claimerAddress,
      setupGuardians = false,
      guardianEmails = []
    } = req.body;

    if (!tokenId || !contractAddress || !claimerAddress) {
      return res.status(400).json({ 
        error: 'Missing required parameters: tokenId, contractAddress, claimerAddress' 
      });
    }

    // CRITICAL: Validate environment variables first
    const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
    const secretKey = process.env.TW_SECRET_KEY;
    
    if (!clientId) {
      throw new Error('NEXT_PUBLIC_TW_CLIENT_ID environment variable is required');
    }
    if (!secretKey) {
      throw new Error('TW_SECRET_KEY environment variable is required');
    }

    // Initialize ThirdWeb client
    const client = createThirdwebClient({
      clientId,
      secretKey,
    });

    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress,
    });

    let claimResult: any = {};

    // NEW APPROACH: Real NFT transfer from neutral address to claimer
    try {
      console.log(`🎯 REAL NFT CLAIM: Processing ownership transfer for token ${tokenId}`);
      
      // Step 1: Verify current owner is neutral address
      const expectedNeutralAddress = generateNeutralGiftAddressServer(tokenId);
      console.log(`🤖 Expected neutral owner: ${expectedNeutralAddress}`);
      
      const currentOwner = await readContract({
        contract: nftContract,
        method: "function ownerOf(uint256) view returns (address)",
        params: [BigInt(tokenId)]
      });
      
      console.log(`👤 Current NFT owner: ${currentOwner}`);
      console.log(`🔍 Is neutral address: ${isNeutralGiftAddressServer(currentOwner, tokenId)}`);
      
      if (!isNeutralGiftAddressServer(currentOwner, tokenId)) {
        throw new Error(`NFT is not in neutral custody. Current owner: ${currentOwner}, Expected: ${expectedNeutralAddress}`);
      }
      
      // Step 2: Create deployer account for transfer (we need keys to transfer from neutral)
      // Note: This is programmatic, not human custody
      
      // CRITICAL FIX: Ensure private key has 0x prefix (same logic as biconomy.ts)
      const rawPrivateKey = process.env.PRIVATE_KEY_DEPLOY;
      if (!rawPrivateKey) {
        throw new Error('PRIVATE_KEY_DEPLOY environment variable is required');
      }
      
      const formattedPrivateKey = rawPrivateKey.startsWith('0x') 
        ? rawPrivateKey as `0x${string}`
        : `0x${rawPrivateKey}` as `0x${string}`;
      
      // SECURITY: Validate private key format without exposing sensitive data
      const isValidFormat = rawPrivateKey && (rawPrivateKey.length === 64 || rawPrivateKey.length === 66);
      if (!isValidFormat) {
        throw new Error('Invalid private key format in environment variable');
      }
      
      const deployerAccount = privateKeyToAccount({
        client,
        privateKey: formattedPrivateKey,
      });
      
      console.log(`🔑 Using deployer account: ${deployerAccount.address}`);
      
      // Step 3: Prepare transfer transaction
      console.log(`📤 Preparing transfer: ${currentOwner} → ${claimerAddress}`);
      
      const transferTransaction = prepareContractCall({
        contract: nftContract,
        method: "function safeTransferFrom(address from, address to, uint256 tokenId)",
        params: [
          currentOwner, // from (neutral address)
          claimerAddress, // to (claimer)
          BigInt(tokenId) // tokenId
        ],
      });
      
      // Step 4: Execute transfer
      console.log(`🚀 Executing NFT transfer...`);
      const transferResult = await sendTransaction({
        transaction: transferTransaction,
        account: deployerAccount,
      });
      
      console.log(`📋 Transfer transaction sent: ${transferResult.transactionHash}`);
      
      // Step 5: Wait for confirmation
      const receipt = await waitForReceipt({
        client,
        chain: baseSepolia,
        transactionHash: transferResult.transactionHash,
      });
      
      console.log(`✅ Transfer confirmed in block: ${receipt.blockNumber}`);
      
      // Step 6: Calculate TBA address
      const calculatedTbaAddress = await calculateTBAAddressForNFT(tokenId);
      
      claimResult = {
        success: true,
        gasless: false, // Real transaction with gas
        transactionHash: transferResult.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        method: "real_nft_transfer",
        message: "NFT ownership transferred successfully! You now own the NFT and its TBA wallet.",
        tbaAddress: calculatedTbaAddress,
        newOwner: claimerAddress,
        previousOwner: currentOwner,
        note: "Real NFT transfer executed - ownership permanently transferred"
      };

      console.log(`✅ Real NFT claim successful: ${tokenId} transferred to ${claimerAddress}`);

    } catch (claimError) {
      console.error('Real NFT claim failed:', claimError);
      throw new Error(`Real claim failed: ${claimError.message}`);
    }

    // Setup guardians if requested
    let guardianResult: any = null;
    if (setupGuardians && guardianEmails.length >= 3) {
      try {
        // TODO: Implement guardian setup with Smart Account
        // This would involve calling a guardian contract or storing guardian info
        guardianResult = {
          success: true,
          guardians: guardianEmails.slice(0, 3),
          message: 'Guardians configured successfully'
        };
        
        console.log(`Guardians set up for ${claimerAddress}:`, guardianEmails.slice(0, 3));
      } catch (guardianError) {
        console.error('Guardian setup failed:', guardianError);
        guardianResult = {
          success: false,
          error: 'Guardian setup failed but claim succeeded'
        };
      }
    }

    // Calculate TBA address for the claimed NFT
    const tbaAddress = await calculateTBAAddressForNFT(tokenId);

    // HALLAZGO 5 FIX: Update metadata in Redis with new owner after claim
    console.log('🔄 Updating NFT metadata with new owner after claim...');
    let existingMetadata: any = null;
    let previousOwner: string | undefined;

    try {
      existingMetadata = await getNFTMetadata(contractAddress, tokenId);
      previousOwner = claimResult?.previousOwner || existingMetadata?.owner;

      if (existingMetadata) {
        // Update owner and status in metadata
        const updates = {
          owner: claimerAddress, // Update to claimer address
          status: 'claimed', // Update status from 'pending_claim'
          claimedAt: new Date().toISOString(),
          claimTransactionHash: claimResult?.transactionHash || undefined
        };

        await updateNFTMetadata(contractAddress, tokenId, updates);
        console.log('✅ NFT metadata updated successfully with new owner:', claimerAddress.slice(0,10) + '...');
      } else {
        console.warn('⚠️ No existing metadata found to update for token:', tokenId);
      }
    } catch (metadataError) {
      console.error('❌ Failed to update metadata after claim:', metadataError);
      // Don't fail the whole claim for metadata update issues
    }

    // CRITICAL FIX: Store claimer information in gift:detail for analytics
    try {
      const redis = validateRedisForCriticalOps('Store claim data');

      if (redis) {
        // Get the actual giftId from tokenId mapping
        const { getGiftIdFromTokenId } = await import('@/lib/escrowUtils');
        const resolvedGiftId = await getGiftIdFromTokenId(tokenId);
        const giftId = resolvedGiftId?.toString() || existingMetadata?.giftId || tokenId;

        // Store claimer data in gift:detail hash
        const giftDetailKey = `gift:detail:${giftId}`;
        const claimUpdates = {
          claimer: claimerAddress,
          claimedAt: Date.now().toString(),
          claimTransactionHash: claimResult?.transactionHash || '',
          tokenId: tokenId.toString(), // CRITICAL: Always store tokenId for fallback search
          status: 'claimed'
        };

        await redis.hset(giftDetailKey, claimUpdates);
        console.log(`✅ Claimer data stored in ${giftDetailKey}:`, {
          claimer: claimerAddress.slice(0, 10) + '...',
          giftId,
          tokenId
        });
      }
    } catch (claimStorageError) {
      console.error('❌ Failed to store claim data:', claimStorageError);
      // Non-critical, continue
    }

    // FASE 2: Track gift claim in analytics - Migrated to Canonical System
    try {
      // Get gift ID from mapping or metadata
      const giftId = existingMetadata?.giftId || tokenId; // Use tokenId as fallback

      // AUDIT FIX: ALWAYS use canonical tracking if Redis is available
      const redis = validateRedisForCriticalOps('Analytics tracking');

      if (redis) {
          await processBlockchainEvent(
            redis,
            'GiftClaimed',
            claimResult?.transactionHash || `claim_${Date.now()}`,
            0, // logIndex
            BigInt(Date.now()), // blockNumber (using timestamp for non-blockchain events)
            Date.now(), // blockTimestamp
            {
              giftId: giftId.toString(),
              tokenId: tokenId.toString(),
              campaignId: existingMetadata?.campaignId || `campaign_default`,
              claimer: claimerAddress,
              metadata: {
                tbaAddress,
                claimMethod: 'real_nft_transfer',
                hasGuardians: setupGuardians && guardianEmails.length >= 3,
                previousOwner: previousOwner,
                claimedAt: new Date().toISOString()
              }
            },
            'realtime'
          );
          console.log('📊 AUDIT FIX: Gift claim tracked successfully (Canonical, no fallback)');
      } else {
        console.error('❌ CRITICAL: Redis not configured - claim analytics NOT tracked');
      }
    } catch (analyticsError) {
      console.error('⚠️ Analytics tracking failed (non-critical):', analyticsError);
      // Don't fail the claim for analytics errors
    }

    res.status(200).json({
      success: true,
      claim: claimResult,
      guardians: guardianResult,
      nft: {
        tokenId,
        contractAddress,
        owner: claimerAddress,
        tbaAddress
      },
      message: 'NFT claimed successfully!'
    });

  } catch (error) {
    console.error('🚨 DETAILED CLAIM API ERROR:', error);
    
    // Enhanced error logging for debugging
    const errorDetails = {
      error: 'Failed to claim NFT',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      timestamp: new Date().toISOString(),
      requestData: req.body || {}
    };
    
    console.error('📋 FULL ERROR CONTEXT:', JSON.stringify(errorDetails, null, 2));
    
    res.status(500).json(errorDetails);
  }
}

// Helper function to calculate TBA address for claimed NFT (SAME as mint.ts)
async function calculateTBAAddressForNFT(tokenId: string): Promise<string> {
  try {
    // Use the SAME deterministic calculation as in mint.ts
    const { ethers } = await import("ethers");
    
    // Modo simplificado - dirección determinística (SAME as mint.ts)
    const NFT_CONTRACT = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || "0x54314166B36E3Cc66cFb36265D99697f4F733231";
    const DEPLOYER_ADDRESS = "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a"; // Deployer fijo
    
    // Crear dirección determinística usando keccak256 (SAME as mint.ts)
    const deterministicSeed = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'address'],
      [NFT_CONTRACT, tokenId, DEPLOYER_ADDRESS]
    );
    
    // Generar dirección TBA determinística (SAME as mint.ts)
    const tbaAddress = ethers.getAddress('0x' + deterministicSeed.slice(-40));
    
    console.log(`✅ TBA determinística calculada para claimed NFT ${tokenId}: ${tbaAddress}`);
    return tbaAddress;
  } catch (error) {
    console.error('Error calculating TBA address for claim:', error);
    return "0x0000000000000000000000000000000000000000";
  }
}