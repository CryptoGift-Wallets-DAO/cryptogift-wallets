/**
 * GIFT INFO API
 * Get detailed information about an escrow gift by token ID
 * Public read-only endpoint for gift status and metadata
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { readContract } from 'thirdweb';
import { 
  getEscrowContract,
  getGiftStatus,
  formatTimeRemaining,
  isGiftExpired,
  generateGiftLink,
  parseEscrowError,
  validateTokenId,
  getGiftIdFromTokenId
} from '../../../lib/escrowUtils';
import { getNFTMetadataWithFallback } from '../../../lib/nftMetadataFallback';
import { getPublicBaseUrl } from '../../../lib/publicBaseUrl';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from '../../../lib/escrowABI';

// Types
interface GiftInfoResponse {
  success: boolean;
  gift?: {
    tokenId: string;
    creator: string;
    nftContract: string;
    expirationTime: number;
    status: 'active' | 'expired' | 'claimed' | 'returned';
    timeRemaining?: string;
    canClaim: boolean;
    giftLink: string;
    isExpired: boolean;
  };
  error?: string;
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Get gift information from contract
async function getGiftInfo(tokenId: string): Promise<{
  success: boolean;
  gift?: EscrowGift;
  canClaim?: boolean;
  timeRemaining?: number;
  error?: string;
}> {
  try {
    const escrowContract = getEscrowContract();
    
    console.log('🔍 GIFT INFO: Fetching data for token', tokenId);
    
    // CRITICAL FIX: Map tokenId to giftId first
    const giftId = await getGiftIdFromTokenId(tokenId);
    
    if (giftId === null) {
      console.log('❌ GIFT INFO: No giftId found for tokenId', tokenId);
      return {
        success: false,
        error: 'Gift not found - this NFT is not registered in escrow'
      };
    }
    
    console.log(`✅ GIFT INFO: Mapped tokenId ${tokenId} → giftId ${giftId}`);
    
    // Get gift data and claim status using correct giftId
    const [giftData, claimStatus] = await Promise.all([
      readContract({
        contract: escrowContract,
        method: "getGift",
        params: [BigInt(giftId)]
      }),
      readContract({
        contract: escrowContract,
        method: "canClaimGift",
        params: [BigInt(giftId)]
      })
    ]);
    
    // getGift returns: [creator, expirationTime, nftContract, tokenId, passwordHash, status]
    const gift: EscrowGift = {
      creator: giftData[0],
      expirationTime: giftData[1],
      nftContract: giftData[2],
      tokenId: giftData[3],
      passwordHash: giftData[4],
      status: giftData[5]
    };
    
    // Handle ThirdWeb v5 tuple return format for canClaimGift
    // TypeScript sees this as readonly [boolean, bigint] so we need explicit tuple handling
    const canClaim = (claimStatus as any)[0];
    const timeRemaining = Number((claimStatus as any)[1]);
    
    console.log('✅ GIFT INFO: Retrieved gift data:', {
      tokenId,
      status: gift.status,
      canClaim,
      timeRemaining
    });
    
    return {
      success: true,
      gift,
      canClaim,
      timeRemaining
    };
    
  } catch (error: any) {
    console.error('❌ GIFT INFO: Failed to get gift data:', error);
    
    // Handle specific contract errors
    if (error.message?.includes('Gift not found') || error.message?.includes('revert')) {
      return {
        success: false,
        error: 'Gift not found or invalid token ID'
      };
    }
    
    return {
      success: false,
      error: parseEscrowError(error)
    };
  }
}

// Get NFT metadata using robust fallback system
async function getNFTMetadataRobust(nftContract: string, tokenId: string, req: NextApiRequest): Promise<{
  name?: string;
  description?: string;
  image?: string;
  error?: string;
}> {
  try {
    const publicBaseUrl = getPublicBaseUrl(req);
    
    // Use comprehensive fallback system: Redis → on-chain tokenURI → IPFS → placeholder
    const result = await getNFTMetadataWithFallback({
      contractAddress: nftContract,
      tokenId,
      publicBaseUrl,
      timeout: 3000 // 3s timeout for gift-info API
    });
    
    console.log(`📋 GIFT INFO: Metadata resolved via ${result.source} in ${result.latency}ms`);
    
    return {
      name: result.metadata.name,
      description: result.metadata.description,
      image: result.metadata.image
    };
    
  } catch (error) {
    console.warn('⚠️ GIFT INFO: Fallback metadata fetch failed:', error);
    return { error: 'Metadata unavailable' };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GiftInfoResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Extract token ID from query
    const { tokenId } = req.query;
    
    if (!tokenId || Array.isArray(tokenId)) {
      return res.status(400).json({
        success: false,
        error: 'Token ID is required'
      });
    }
    
    // Validate token ID
    const tokenIdValidation = validateTokenId(tokenId);
    if (!tokenIdValidation.valid) {
      return res.status(400).json({
        success: false,
        error: tokenIdValidation.message
      });
    }
    
    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_RPC_URL || !ESCROW_CONTRACT_ADDRESS) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }
    
    console.log('🎁 GIFT INFO REQUEST:', { tokenId });
    
    // Get gift information
    const giftResult = await getGiftInfo(tokenId);
    
    if (!giftResult.success || !giftResult.gift) {
      return res.status(404).json({
        success: false,
        error: giftResult.error || 'Gift not found'
      });
    }
    
    const gift = giftResult.gift;
    
    // Determine gift status
    const status = getGiftStatus(gift);
    const expired = isGiftExpired(gift.expirationTime);
    const timeRemaining = expired ? 0 : Number(gift.expirationTime) - Math.floor(Date.now() / 1000);
    
    // Generate gift link
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
    const giftLink = generateGiftLink(tokenId, baseUrl);
    
    // Optional: Get NFT metadata (async, don't block response)
    getNFTMetadataRobust(gift.nftContract, tokenId, req)
      .then(metadata => {
        if (metadata.name || metadata.image) {
          console.log('📸 GIFT INFO: NFT Metadata found:', { 
            name: metadata.name, 
            hasImage: !!metadata.image 
          });
        }
      })
      .catch(err => console.warn('GIFT INFO: Fallback metadata fetch failed:', err));
    
    console.log('✅ GIFT INFO SUCCESS:', {
      tokenId,
      status,
      canClaim: giftResult.canClaim,
      expired,
      timeRemaining: timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : 'Expired'
    });
    
    return res.status(200).json({
      success: true,
      gift: {
        tokenId,
        creator: gift.creator,
        nftContract: gift.nftContract,
        expirationTime: Number(gift.expirationTime),
        status,
        timeRemaining: timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : undefined,
        canClaim: giftResult.canClaim || false,
        giftLink,
        isExpired: expired
      }
    });
    
  } catch (error: any) {
    console.error('💥 GIFT INFO API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: parseEscrowError(error)
    });
  }
}