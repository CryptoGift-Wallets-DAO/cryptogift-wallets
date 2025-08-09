// METAMASK NFT DISPLAY FIX - MASS MIGRATION
// Updates all existing NFTs to use MetaMask-compatible metadata endpoints
// This solves the critical issue where NFT images don't appear in MetaMask

import { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { getAllStoredMetadata } from '../../../lib/nftMetadataStore';

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
  secretKey: process.env.TW_SECRET_KEY!,
});

interface MigrationResult {
  tokenId: string;
  success: boolean;
  error?: string;
  transactionHash?: string;
  newTokenURI?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin access control
  const { adminKey } = req.body;
  if (adminKey !== process.env.API_ACCESS_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const contractAddress = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!;

  try {
    console.log('🚀 STARTING METAMASK NFT DISPLAY FIX MIGRATION');
    console.log(`📋 Contract: ${contractAddress}`);

    // Get all stored metadata
    const allMetadata = await getAllStoredMetadata(contractAddress);
    console.log(`📊 Found ${allMetadata.length} NFTs with stored metadata`);

    if (allMetadata.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No NFTs found to migrate',
        results: []
      });
    }

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

    const results: MigrationResult[] = [];
    const baseUrl = 'https://cryptogift-wallets.vercel.app'; // Production URL

    // Process each NFT
    for (let i = 0; i < allMetadata.length; i++) {
      const metadata = allMetadata[i];
      const tokenId = metadata.tokenId;
      
      try {
        console.log(`🔄 [${i + 1}/${allMetadata.length}] Processing token ${tokenId}...`);

        // Check current tokenURI on contract
        let currentTokenURI = '';
        try {
          currentTokenURI = await readContract({
            contract: nftContract,
            method: "function tokenURI(uint256 tokenId) view returns (string)",
            params: [BigInt(tokenId)],
          });
          console.log(`📋 Current tokenURI: ${currentTokenURI}`);
        } catch (error) {
          console.log(`⚠️ Could not read current tokenURI for ${tokenId}`);
        }

        // Create MetaMask-compatible metadata URL
        const metamaskCompatibleURI = `${baseUrl}/api/nft-metadata/${contractAddress}/${tokenId}`;
        
        // Skip if already using our metadata endpoint
        if (currentTokenURI === metamaskCompatibleURI) {
          console.log(`✅ Token ${tokenId} already has MetaMask-compatible URI`);
          results.push({
            tokenId,
            success: true,
            newTokenURI: metamaskCompatibleURI
          });
          continue;
        }

        console.log(`🎨 NEW URI: ${metamaskCompatibleURI}`);

        // Prepare updateTokenURI transaction
        const updateTransaction = prepareContractCall({
          contract: nftContract,
          method: "function updateTokenURI(uint256 tokenId, string uri)",
          params: [BigInt(tokenId), metamaskCompatibleURI],
        });

        console.log(`🔗 Sending updateTokenURI transaction for ${tokenId}...`);
        
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
          console.log(`✅ SUCCESS: Token ${tokenId} updated`);
          results.push({
            tokenId,
            success: true,
            transactionHash: txResult.transactionHash,
            newTokenURI: metamaskCompatibleURI
          });
        } else {
          console.log(`❌ FAILED: Token ${tokenId} transaction failed`);
          results.push({
            tokenId,
            success: false,
            error: `Transaction failed: ${receipt.status}`
          });
        }

        // Add delay between transactions to avoid rate limiting
        if (i < allMetadata.length - 1) {
          console.log('⏳ Waiting 2 seconds before next transaction...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`❌ ERROR processing token ${tokenId}:`, error);
        results.push({
          tokenId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Generate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('🎉 MIGRATION COMPLETE');
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);

    return res.status(200).json({
      success: true,
      message: 'MetaMask NFT display fix migration completed',
      summary: {
        total: results.length,
        successful,
        failed
      },
      results
    });

  } catch (error) {
    console.error('❌ MIGRATION ERROR:', error);
    return res.status(500).json({
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}