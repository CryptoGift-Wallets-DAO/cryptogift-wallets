/**
 * EXPIRED GIFTS API
 * Returns expired gifts for authenticated user (creator)
 * User can then return their own expired gifts with their wallet
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { 
  getEscrowContract,
  isGiftExpired,
  parseEscrowError
} from '../../../lib/escrowUtils';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from '../../../lib/escrowABI';
import { verifyJWT, extractTokenFromHeaders } from '../../../lib/siweAuth';

// Types
interface ExpiredGift {
  giftId: number;
  tokenId: string;
  creator: string;
  nftContract: string;
  expirationTime: number;
  status: number;
  nftMetadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
}

interface ExpiredGiftsResponse {
  success: boolean;
  expiredGifts?: ExpiredGift[];
  count?: number;
  error?: string;
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// JWT Authentication middleware
function authenticate(req: NextApiRequest): { success: boolean; address?: string; error?: string } {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeaders(authHeader);
    
    if (!token) {
      return { 
        success: false, 
        error: 'Authentication required. Please sign in with your wallet.' 
      };
    }
    
    const payload = verifyJWT(token);
    if (!payload) {
      return { 
        success: false, 
        error: 'Invalid or expired authentication token. Please sign in again.' 
      };
    }
    
    console.log('✅ Expired gifts JWT authentication successful:', {
      address: payload.address.slice(0, 10) + '...',
      exp: new Date(payload.exp * 1000).toISOString()
    });
    
    return { 
      success: true, 
      address: payload.address 
    };
    
  } catch (error: any) {
    console.error('❌ JWT authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication verification failed' 
    };
  }
}

// CRITICAL FIX: Load metadata directly without internal HTTP calls
async function loadGiftMetadata(tokenId: string, contractAddress: string): Promise<{ name?: string; description?: string; image?: string; }> {
  try {
    console.log(`🔍 Loading metadata for expired token ${tokenId}`);
    
    // Use direct function call instead of HTTP request
    const { getNFTMetadata } = await import('../../../lib/nftMetadataStore');
    const metadata = await getNFTMetadata(contractAddress, tokenId);
    
    if (metadata) {
      console.log(`✅ Metadata found for expired token ${tokenId}:`, {
        hasName: !!metadata.name,
        hasImage: !!metadata.image,
        imageUrl: metadata.image
      });
      
      // CRITICAL FIX: Resolve IPFS URLs properly
      let processedImageUrl = metadata.image;
      if (processedImageUrl && processedImageUrl.startsWith('ipfs://')) {
        const cid = processedImageUrl.replace('ipfs://', '');
        processedImageUrl = `https://nftstorage.link/ipfs/${cid}`;
        console.log(`🔄 Converted IPFS URL for expired token ${tokenId}: ${processedImageUrl}`);
      }
      
      return {
        name: metadata.name || `Gift NFT #${tokenId}`,
        description: metadata.description || 'CryptoGift NFT',
        image: processedImageUrl || '/images/cg-wallet-placeholder.png'
      };
    }
    
    console.log(`📂 No metadata found for expired token ${tokenId}, using defaults`);
    return {
      name: `Gift NFT #${tokenId}`,
      description: 'CryptoGift NFT',
      image: '/images/cg-wallet-placeholder.png'
    };
  } catch (error) {
    console.warn(`⚠️ Could not load metadata for token ${tokenId}:`, error);
    return {
      name: `Gift NFT #${tokenId}`,
      description: 'CryptoGift NFT',
      image: '/images/cg-wallet-placeholder.png'
    };
  }
}

// Get expired gifts for authenticated user
async function getExpiredGiftsForUser(creatorAddress: string): Promise<{
  success: boolean;
  expiredGifts?: ExpiredGift[];
  error?: string;
}> {
  try {
    console.log('🔍 EXPIRED GIFTS: Loading for creator:', creatorAddress.slice(0, 10) + '...');
    
    // Get the current giftCounter
    const escrowContract = getEscrowContract();
    const counter = await readContract({
      contract: escrowContract,
      method: "giftCounter",
      params: []
    });
    
    console.log(`🔍 EXPIRED GIFTS: Checking ${counter} total gifts`);
    
    const expiredGifts: ExpiredGift[] = [];
    
    // Check each gift
    for (let giftId = 1; giftId <= Number(counter); giftId++) {
      try {
        const giftData = await readContract({
          contract: escrowContract,
          method: "getGift",
          params: [BigInt(giftId)]
        });
        
        // Parse gift data (ThirdWeb v5 returns array)
        const gift: EscrowGift = {
          creator: giftData[0],
          expirationTime: giftData[1],
          nftContract: giftData[2],
          tokenId: giftData[3],
          passwordHash: giftData[4],
          status: giftData[5]
        };
        
        // Check if this gift belongs to the authenticated user
        if (gift.creator.toLowerCase() !== creatorAddress.toLowerCase()) {
          continue; // Skip gifts from other creators
        }
        
        // Check if gift is expired and still active (status = 0)
        const isExpired = isGiftExpired(gift.expirationTime);
        const isActive = gift.status === 0;
        
        if (isActive && isExpired) {
          console.log(`🔄 EXPIRED GIFT FOUND: Gift ${giftId} - tokenId ${gift.tokenId}`);
          
          // Load metadata for this gift with contract address
          const metadata = await loadGiftMetadata(gift.tokenId.toString(), gift.nftContract);
          
          expiredGifts.push({
            giftId,
            tokenId: gift.tokenId.toString(),
            creator: gift.creator,
            nftContract: gift.nftContract,
            expirationTime: Number(gift.expirationTime),
            status: gift.status,
            nftMetadata: metadata
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error checking gift ${giftId}:`, error);
        // Continue checking other gifts
      }
    }
    
    console.log(`✅ EXPIRED GIFTS: Found ${expiredGifts.length} expired gifts for user`);
    
    return {
      success: true,
      expiredGifts
    };
    
  } catch (error: any) {
    console.error('❌ Failed to load expired gifts:', error);
    return {
      success: false,
      error: parseEscrowError(error)
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExpiredGiftsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Authenticate request using JWT
    const authResult = authenticate(req);
    if (!authResult.success) {
      return res.status(401).json({ 
        success: false,
        error: authResult.error || 'Unauthorized' 
      });
    }
    
    const authenticatedAddress = authResult.address!;
    console.log('🔐 Expired gifts request authenticated for address:', authenticatedAddress.slice(0, 10) + '...');
    
    // Validate required environment variables
    if (!ESCROW_CONTRACT_ADDRESS) {
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error - escrow contract not configured' 
      });
    }
    
    // Get expired gifts for authenticated user
    const result = await getExpiredGiftsForUser(authenticatedAddress);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to load expired gifts'
      });
    }
    
    console.log('✅ EXPIRED GIFTS SUCCESS:', {
      userAddress: authenticatedAddress.slice(0, 10) + '...',
      expiredCount: result.expiredGifts?.length || 0
    });
    
    return res.status(200).json({
      success: true,
      expiredGifts: result.expiredGifts || [],
      count: result.expiredGifts?.length || 0
    });
    
  } catch (error: any) {
    console.error('💥 EXPIRED GIFTS API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}