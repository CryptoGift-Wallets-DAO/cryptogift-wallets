// UPDATE NFT METADATA FOR METAMASK COMPATIBILITY
// Updates existing NFT tokenURI to point to our MetaMask-compatible metadata endpoint
// This fixes the image display issue in MetaMask

import { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { getNFTMetadata } from '../../../lib/nftMetadataStore';
import { getPublicBaseUrl } from '../../../lib/publicBaseUrl';

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
  secretKey: process.env.TW_SECRET_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId, contractAddress } = req.body;

  if (!tokenId || !contractAddress) {
    return res.status(400).json({ error: 'tokenId and contractAddress are required' });
  }

  try {
    console.log(`🔄 METAMASK UPDATE: Updating tokenURI for ${contractAddress}:${tokenId}`);

    // Verify we have metadata for this NFT
    const metadata = await getNFTMetadata(contractAddress, tokenId);
    if (!metadata) {
      return res.status(404).json({ 
        error: `No metadata found for ${contractAddress}:${tokenId}. Please generate metadata first.` 
      });
    }

    // Create universal metadata URL using dynamic domain detection
    const baseUrl = getPublicBaseUrl(req);
    
    const metamaskCompatibleURI = `${baseUrl}/api/nft-metadata/${contractAddress}/${tokenId}`;
    
    console.log(`🎨 METAMASK URI: ${metamaskCompatibleURI}`);

    // Initialize wallet account
    if (!process.env.PRIVATE_KEY_DEPLOY) {
      throw new Error('PRIVATE_KEY_DEPLOY not configured');
    }

    const account = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY as `0x${string}`,
    });

    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress as `0x${string}`,
    });

    // Prepare updateTokenURI transaction
    const updateTransaction = prepareContractCall({
      contract: nftContract,
      method: "function updateTokenURI(uint256 tokenId, string uri)",
      params: [BigInt(tokenId), metamaskCompatibleURI],
    });

    console.log(`🔗 Sending updateTokenURI transaction...`);
    
    // Send transaction
    const txResult = await sendTransaction({
      transaction: updateTransaction,
      account,
    });

    console.log(`⏳ Waiting for confirmation: ${txResult.transactionHash}`);
    
    // Wait for transaction confirmation
    const receipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: txResult.transactionHash,
    });

    if (receipt.status === 'success') {
      console.log(`✅ METAMASK UPDATE SUCCESS: ${contractAddress}:${tokenId}`);
      console.log(`🎨 New tokenURI: ${metamaskCompatibleURI}`);
      
      return res.status(200).json({
        success: true,
        tokenId,
        contractAddress,
        newTokenURI: metamaskCompatibleURI,
        transactionHash: txResult.transactionHash,
        message: 'TokenURI updated for MetaMask compatibility'
      });
    } else {
      throw new Error(`Transaction failed: ${receipt.status}`);
    }

  } catch (error) {
    console.error('❌ METAMASK UPDATE ERROR:', error);
    return res.status(500).json({
      error: 'Failed to update tokenURI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}