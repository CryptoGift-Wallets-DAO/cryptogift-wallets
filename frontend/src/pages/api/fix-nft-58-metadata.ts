/**
 * FIX NFT #58 METADATA
 * Special endpoint to fix the metadata for NFT #58 that's missing escrow attributes
 * This will update the stored metadata to include the Timeframe attribute for MetaMask compatibility
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata, storeNFTMetadata, createNFTMetadata } from '../../lib/nftMetadataStore';

interface FixMetadataResponse {
  success: boolean;
  tokenId?: string;
  before?: any;
  after?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FixMetadataResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const contractAddress = '0xE9F316159a0830114252a96a6B7CA6efD874650F';
    const tokenId = '58';
    
    console.log(`🔧 FIXING METADATA for NFT ${tokenId}`);
    
    // Get current metadata
    const currentMetadata = await getNFTMetadata(contractAddress, tokenId);
    
    if (!currentMetadata) {
      return res.status(404).json({
        success: false,
        error: 'NFT metadata not found'
      });
    }
    
    console.log('📋 CURRENT METADATA:', JSON.stringify(currentMetadata, null, 2));
    
    // Create enhanced attributes with escrow-specific data
    const enhancedAttributes = [
      ...currentMetadata.attributes,
      { trait_type: "Timeframe", value: "SEVEN_DAYS" },
      { trait_type: "Expires At", value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
      { trait_type: "Security", value: "Password Protected" }
    ];
    
    // Remove duplicates based on trait_type
    const uniqueAttributes = enhancedAttributes.filter((attr, index, arr) => 
      arr.findIndex(a => a.trait_type === attr.trait_type) === index
    );
    
    // Create updated metadata
    const updatedMetadata = createNFTMetadata({
      contractAddress: currentMetadata.contractAddress,
      tokenId: currentMetadata.tokenId,
      name: currentMetadata.name,
      description: currentMetadata.description,
      imageIpfsCid: currentMetadata.imageIpfsCid,
      metadataIpfsCid: currentMetadata.metadataIpfsCid,
      attributes: uniqueAttributes,
      mintTransactionHash: currentMetadata.mintTransactionHash,
      owner: currentMetadata.owner,
      creatorWallet: currentMetadata.creatorWallet
    });
    
    console.log('📋 UPDATED METADATA:', JSON.stringify(updatedMetadata, null, 2));
    
    // Store the updated metadata
    await storeNFTMetadata(updatedMetadata);
    
    console.log('✅ METADATA FIXED for NFT #58');
    
    return res.status(200).json({
      success: true,
      tokenId,
      before: currentMetadata.attributes,
      after: uniqueAttributes
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fix NFT #58 metadata:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fix metadata'
    });
  }
}