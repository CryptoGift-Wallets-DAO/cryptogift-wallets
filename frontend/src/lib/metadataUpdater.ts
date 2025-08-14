/**
 * METADATA UPDATER
 * Updates NFT metadata with real tokenId after minting
 * Fixes the issue where metadata has Date.now() instead of real tokenId
 */

import { uploadMetadata } from './ipfs';
import { getPublicBaseUrl } from './publicBaseUrl';
import { convertIPFSToHTTPS, validateMultiGatewayAccess } from '../utils/ipfs';

export interface NFTMetadataTemplate {
  name?: string;
  description: string;
  image: string;
  image_url?: string;  // HTTPS version for wallet compatibility
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Create final metadata with real tokenId
 */
export async function createFinalMetadata(
  tokenId: string,
  imageIpfsCid: string,
  giftMessage?: string,
  additionalAttributes?: Array<{ trait_type: string; value: string | number }>
): Promise<{
  success: boolean;
  metadataCid?: string;
  metadataUrl?: string;
  error?: string;
}> {
  try {
    console.log('📝 Creating final metadata with real tokenId:', tokenId);
    
    // 🚨 CRITICAL FIX: Handle imageIpfsCid that may have ipfs:// prefix
    const cleanImageCid = imageIpfsCid.startsWith('ipfs://') 
      ? imageIpfsCid.replace('ipfs://', '') 
      : imageIpfsCid;
    
    console.log('🔧 Image CID processing:', {
      original: imageIpfsCid.substring(0, 30) + '...',
      cleaned: cleanImageCid.substring(0, 30) + '...',
      hadPrefix: imageIpfsCid.startsWith('ipfs://')
    });
    
    // Create comprehensive metadata with real tokenId
    // 🔥 CRITICAL FIX: Use DUAL format - IPFS native + ipfs.io for MetaMask/BaseScan
    const imageUrl = `ipfs://${cleanImageCid}`;
    // Use ipfs.io specifically for on-chain metadata (MetaMask/BaseScan preference)
    const imageHttpsUrl = `https://ipfs.io/ipfs/${cleanImageCid}`;
    
    console.log('🖼️ DUAL IMAGE URLs GENERATED:', {
      imageIpfs: imageUrl,
      imageHttps: imageHttpsUrl,
      cleanImageCid: cleanImageCid.substring(0, 40) + '...',
      originalImageCid: imageIpfsCid.substring(0, 40) + '...'
    });
    
    const finalMetadata: NFTMetadataTemplate = {
      name: `CryptoGift NFT #${tokenId}`,
      description: giftMessage || "Un regalo cripto único creado con amor",
      image: imageUrl,        // IPFS native format - preferred by most systems
      image_url: imageHttpsUrl, // HTTPS format - fallback for wallets that don't support IPFS
      external_url: getPublicBaseUrl(),
      attributes: [
        {
          trait_type: "Token ID",
          value: tokenId
        },
        {
          trait_type: "Creation Date",
          value: new Date().toISOString()
        },
        {
          trait_type: "Platform",
          value: "CryptoGift Wallets"
        },
        {
          trait_type: "Status",
          value: "Minted"
        },
        ...(additionalAttributes || [])
      ]
    };
    
    console.log('📦 Final metadata:', finalMetadata);
    
    // Upload final metadata to IPFS
    const metadataUploadResult = await uploadMetadata(finalMetadata);
    
    if (!metadataUploadResult.success) {
      throw new Error(metadataUploadResult.error || 'Failed to upload final metadata');
    }
    
    console.log('✅ Final metadata uploaded:', {
      cid: metadataUploadResult.cid,
      url: metadataUploadResult.url,
      provider: metadataUploadResult.provider
    });
    
    // 🔥 CRITICAL FIX: ALWAYS use IPFS native format for tokenURI
    // This is the ONLY format that works reliably with wallets and BaseScan
    // HTTPS URLs often fail or point to wrong gateways
    const finalMetadataUrl = `ipfs://${metadataUploadResult.cid}`;
    
    console.log('🎯 FORCED IPFS NATIVE FORMAT:', {
      originalUrl: metadataUploadResult.url,
      cid: metadataUploadResult.cid,
      finalUrl: finalMetadataUrl,
      reason: 'IPFS native format is most compatible with wallets/explorers'
    });
    
    // 🔥 NEW: Multi-gateway validation before updateTokenURI with Promise.any+Abort
    console.log('🔍 Validating metadata accessibility across multiple gateways...');
    const metadataValidation = await validateMultiGatewayAccess(finalMetadataUrl, 2, 5000);
    
    if (!metadataValidation.success) {
      console.warn('⚠️ Multi-gateway validation failed for metadata:', {
        workingGateways: metadataValidation.workingGateways.length,
        errors: metadataValidation.errors
      });
      // Don't fail the entire process, but log the issue
    } else {
      console.log('✅ Multi-gateway validation successful for metadata:', {
        workingGateways: metadataValidation.workingGateways.length,
        gateways: metadataValidation.workingGateways.map(url => new URL(url).hostname)
      });
    }
    
    // Also validate image accessibility across gateways
    console.log('🖼️ Validating image accessibility across multiple gateways...');
    const imageValidation = await validateMultiGatewayAccess(imageUrl, 2, 5000);
    
    if (!imageValidation.success) {
      console.warn('⚠️ Multi-gateway validation failed for image:', {
        workingGateways: imageValidation.workingGateways.length,
        errors: imageValidation.errors
      });
    } else {
      console.log('✅ Multi-gateway validation successful for image:', {
        workingGateways: imageValidation.workingGateways.length,
        gateways: imageValidation.workingGateways.map(url => new URL(url).hostname)
      });
    }
    
    console.log('🎯 FINAL METADATA URL FOR TOKENURI:', {
      originalUrl: metadataUploadResult.url,
      finalUrl: finalMetadataUrl,
      cid: metadataUploadResult.cid
    });
    
    // 🔥 CRITICAL FIX: Warm-up IPFS gateways for MetaMask/BaseScan compatibility
    console.log('🔥 WARMING UP IPFS GATEWAYS for MetaMask/BaseScan...');
    const warmupPromises = [];
    
    // Warm up metadata.json on critical gateways (non-blocking)
    const metadataWarmupUrls = [
      `https://ipfs.io/ipfs/${metadataUploadResult.cid}`,
      `https://cloudflare-ipfs.com/ipfs/${metadataUploadResult.cid}`,
      `https://dweb.link/ipfs/${metadataUploadResult.cid}`
    ];
    
    // Warm up image on critical gateways (non-blocking)
    const imageWarmupUrls = [
      `https://ipfs.io/ipfs/${cleanImageCid}`,
      `https://cloudflare-ipfs.com/ipfs/${cleanImageCid}`,
      `https://dweb.link/ipfs/${cleanImageCid}`
    ];
    
    // Fire and forget - don't wait for responses
    for (const url of [...metadataWarmupUrls, ...imageWarmupUrls]) {
      warmupPromises.push(
        fetch(url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5s timeout per request
        })
        .then(() => console.log(`✅ Warmed up: ${url.substring(0, 50)}...`))
        .catch(() => console.log(`⚠️ Warmup failed: ${url.substring(0, 50)}...`))
      );
    }
    
    // Wait maximum 3 seconds for warmups (don't block if they're slow)
    await Promise.race([
      Promise.allSettled(warmupPromises),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
    
    console.log('✅ IPFS warmup completed (best effort)');
    
    return {
      success: true,
      metadataCid: metadataUploadResult.cid,
      metadataUrl: finalMetadataUrl // Use validated URL instead of raw upload result
    };
    
  } catch (error: any) {
    console.error('❌ Failed to create final metadata:', error);
    return {
      success: false,
      error: error.message || 'Failed to create final metadata'
    };
  }
}

/**
 * Update metadata for escrow gifts with additional escrow information
 */
export async function createEscrowMetadata(
  tokenId: string,
  imageIpfsCid: string,
  giftMessage: string,
  creatorAddress: string,
  expirationTime: number,
  timeframeDays: string
): Promise<{
  success: boolean;
  metadataCid?: string;
  metadataUrl?: string;
  error?: string;
}> {
  try {
    console.log('🔒 Creating escrow metadata for tokenId:', tokenId);
    
    const escrowAttributes = [
      {
        trait_type: "Gift Type",
        value: "Temporal Escrow"
      },
      {
        trait_type: "Creator",
        value: creatorAddress.slice(0, 10) + '...'
      },
      {
        trait_type: "Timeframe",
        value: timeframeDays
      },
      {
        trait_type: "Expires At",
        value: new Date(expirationTime * 1000).toISOString()
      },
      {
        trait_type: "Security",
        value: "Password Protected"
      }
    ];
    
    return await createFinalMetadata(
      tokenId,
      imageIpfsCid,
      giftMessage,
      escrowAttributes
    );
    
  } catch (error: any) {
    console.error('❌ Failed to create escrow metadata:', error);
    return {
      success: false,
      error: error.message || 'Failed to create escrow metadata'
    };
  }
}

/**
 * Update metadata for direct mints
 */
export async function createDirectMintMetadata(
  tokenId: string,
  imageIpfsCid: string,
  giftMessage: string,
  creatorAddress: string
): Promise<{
  success: boolean;
  metadataCid?: string;
  metadataUrl?: string;
  error?: string;
}> {
  try {
    console.log('🎯 Creating direct mint metadata for tokenId:', tokenId);
    
    const directMintAttributes = [
      {
        trait_type: "Gift Type",
        value: "Direct Mint"
      },
      {
        trait_type: "Creator",
        value: creatorAddress.slice(0, 10) + '...'
      },
      {
        trait_type: "Transfer Type",
        value: "Immediate"
      }
    ];
    
    return await createFinalMetadata(
      tokenId,
      imageIpfsCid,
      giftMessage,
      directMintAttributes
    );
    
  } catch (error: any) {
    console.error('❌ Failed to create direct mint metadata:', error);
    return {
      success: false,
      error: error.message || 'Failed to create direct mint metadata'
    };
  }
}