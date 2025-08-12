/**
 * METADATA UPDATER
 * Updates NFT metadata with real tokenId after minting
 * Fixes the issue where metadata has Date.now() instead of real tokenId
 */

import { uploadMetadata } from './ipfs';
import { getPublicBaseUrl } from './publicBaseUrl';

export interface NFTMetadataTemplate {
  name?: string;
  description: string;
  image: string;
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
    
    // Create comprehensive metadata with real tokenId
    const finalMetadata: NFTMetadataTemplate = {
      name: `CryptoGift NFT #${tokenId}`,
      description: giftMessage || "Un regalo cripto único creado con amor",
      image: `https://gateway.thirdweb.com/ipfs/${imageIpfsCid}`, // HTTP URL for wallet/explorer compatibility
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
    
    return {
      success: true,
      metadataCid: metadataUploadResult.cid,
      metadataUrl: metadataUploadResult.url
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