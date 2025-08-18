import type { NextApiRequest, NextApiResponse } from 'next';
import { getContract, readContract } from 'thirdweb';
import { client } from '../../app/client';
import { baseSepolia } from 'thirdweb/chains';
import { getGiftIdFromMapping } from '../../lib/giftMappingStore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId } = req.query;

  if (!tokenId || typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'Invalid token ID' });
  }

  try {
    console.log(`🔍 Checking if gift ${tokenId} has password...`);

    // Get gift mapping to find actual giftId
    const giftId = await getGiftIdFromMapping(tokenId);
    
    if (!giftId) {
      // CRITICAL FIX: If no mapping, ASSUME PASSWORD EXISTS (all gifts have passwords)
      // But NO education requirements (since we can't verify)
      console.log(`⚠️ No gift mapping found for token ${tokenId} - assuming PASSWORD EXISTS but NO education`);
      return res.status(200).json({
        success: true,
        hasPassword: true,  // ALWAYS true - all gifts have passwords
        hasEducation: false, // Can't verify education without mapping
        reason: 'no_mapping_assume_password'
      });
    }

    console.log(`✅ Token ${tokenId} maps to Gift ${giftId}`);

    // Get escrow contract
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
    if (!escrowAddress) {
      console.error('❌ ESCROW_CONTRACT_ADDRESS not configured');
      return res.status(200).json({
        success: true,
        hasPassword: false,
        hasEducation: false,
        reason: 'no_escrow_config'
      });
    }

    const escrowContract = getContract({
      client,
      chain: baseSepolia,
      address: escrowAddress as `0x${string}`
    });

    // Check if gift has password (passwordHash != 0x0)
    const gift = await readContract({
      contract: escrowContract,
      method: "function getGift(uint256 giftId) view returns (address creator, address nftContract, uint256 tokenId, uint256 expirationTime, bytes32 passwordHash, string message, uint8 status)",
      params: [BigInt(giftId)]
    }) as readonly [string, string, bigint, bigint, string, string, number];

    const [creator, nftContract, tokenIdFromContract, expirationTime, passwordHash, message, status] = gift;
    const hasPassword = passwordHash !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    // TEMPORARY WORKAROUND: Check if token > 189 (when education was implemented)
    // Tokens 190+ were created after education feature was added
    // This is a temporary solution until mapping is properly stored
    const tokenNumber = parseInt(tokenId);
    const hasEducation = hasPassword && tokenNumber >= 190; // Tokens 190+ have education
    
    console.log(`📊 Gift ${giftId} requirements:`, {
      tokenId,
      hasPassword,
      hasEducation,
      passwordHash: hasPassword ? passwordHash.slice(0, 10) + '...' : 'none',
      logic: tokenNumber >= 190 ? 'Post-education era token' : 'Pre-education era token'
    });

    return res.status(200).json({
      success: true,
      hasPassword,
      hasEducation,
      giftId,
      educationModules: hasEducation ? [1] : [] // Default to module 1 if education enabled
    });

  } catch (error: any) {
    console.error('❌ Error checking gift password:', error);
    
    // Default to no password if error
    return res.status(200).json({
      success: true,
      hasPassword: false,
      hasEducation: false,
      reason: 'error',
      error: error.message
    });
  }
}