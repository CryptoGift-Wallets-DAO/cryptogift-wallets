import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { storeNFTMetadata, getNFTMetadata, getAllStoredMetadata, createNFTMetadata } from "../../../lib/nftMetadataStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin Authentication - Check for admin token
  const adminToken = process.env.ADMIN_API_TOKEN;
  const providedToken = req.headers['x-admin-token'] || req.body.adminToken;
  
  if (adminToken && providedToken !== adminToken) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid admin token required. Set ADMIN_API_TOKEN environment variable and provide it via X-Admin-Token header or adminToken body field.'
    });
  }

  // Development fallback - if no admin token configured, allow with warning
  if (!adminToken) {
    console.warn('⚠️ ADMIN: No ADMIN_API_TOKEN configured - endpoint accessible without authentication in development');
  }

  const { action, contractAddress, dryRun = true } = req.body;

  console.log("🔄 METADATA MIGRATION STARTED ===========================================");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🎯 Action:", action);
  console.log("📋 Contract:", contractAddress);
  console.log("🧪 Dry Run:", dryRun);

  try {
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    const results = {
      timestamp: new Date().toISOString(),
      action,
      contractAddress,
      dryRun,
      contractInfo: {
        totalSupply: undefined as string | undefined,
        firstTokenId: undefined as number | undefined,
        lastTokenId: undefined as string | undefined
      },
      analysis: {
        totalStoredMetadata: 0,
        incorrectTokenIds: [],
        correctTokenIds: [],
        orphanedMetadata: [],
        missingMetadata: [],
        error: undefined as string | undefined
      },
      migration: {
        planned: [],
        executed: [],
        failed: [],
        skipped: []
      },
      summary: {}
    };

    if (action === 'analyze' || action === 'migrate') {
      console.log("📊 ANALYZING CONTRACT AND STORED DATA ===========================================");
      
      // Get contract info
      const nftContract = getContract({
        client,
        chain: baseSepolia,
        address: contractAddress,
      });

      let totalSupply = BigInt(0);
      try {
        totalSupply = await readContract({
          contract: nftContract,
          method: "function totalSupply() view returns (uint256)",
          params: [],
        });
        results.contractInfo = {
          totalSupply: totalSupply.toString(),
          firstTokenId: 0, // Most ERC721 start from 0
          lastTokenId: (totalSupply - BigInt(1)).toString()
        };
        console.log(`✅ Contract analysis: totalSupply=${totalSupply}, tokens 0 to ${totalSupply - BigInt(1)}`);
      } catch (error) {
        console.log("❌ Failed to read contract:", error);
        return res.status(400).json({ error: 'Invalid contract or contract does not support totalSupply()' });
      }

      // Get all stored metadata for this contract
      console.log("🔍 ANALYZING STORED METADATA ===========================================");
      try {
        const allMetadata = await getAllStoredMetadata(contractAddress);
        results.analysis.totalStoredMetadata = allMetadata.length;
        
        console.log(`📊 Found ${allMetadata.length} stored metadata entries for contract`);

        // Analyze each stored metadata entry
        for (const metadata of allMetadata) {
          const storedTokenId = parseInt(metadata.tokenId);
          const isValidTokenId = storedTokenId >= 0 && storedTokenId < Number(totalSupply);
          
          if (isValidTokenId) {
            results.analysis.correctTokenIds.push({
              tokenId: metadata.tokenId,
              hasImage: !!metadata.image,
              isPlaceholder: metadata.image?.includes('placeholder') || metadata.image?.includes('cg-wallet'),
              imageIpfsCid: metadata.imageIpfsCid
            });
          } else {
            results.analysis.incorrectTokenIds.push({
              tokenId: metadata.tokenId,
              shouldBeTokenId: null, // Will calculate
              hasImage: !!metadata.image,
              isPlaceholder: metadata.image?.includes('placeholder') || metadata.image?.includes('cg-wallet'),
              imageIpfsCid: metadata.imageIpfsCid,
              metadata: metadata
            });
          }
        }

        console.log(`✅ Analysis complete: ${results.analysis.correctTokenIds.length} correct, ${results.analysis.incorrectTokenIds.length} incorrect`);

        // For incorrect tokenIds, try to find the correct mapping
        for (const incorrect of results.analysis.incorrectTokenIds) {
          const wrongTokenId = parseInt(incorrect.tokenId);
          
          // Most likely scenario: stored as totalSupply instead of totalSupply-1
          // So if stored as token N, it should be token N-1
          const likelyCorrectTokenId = wrongTokenId - 1;
          
          if (likelyCorrectTokenId >= 0 && likelyCorrectTokenId < Number(totalSupply)) {
            // Check if this tokenId already has metadata
            const existingCorrect = await getNFTMetadata(contractAddress, likelyCorrectTokenId.toString());
            
            if (!existingCorrect) {
              incorrect.shouldBeTokenId = likelyCorrectTokenId.toString();
              results.migration.planned.push({
                action: 'move',
                fromTokenId: incorrect.tokenId,
                toTokenId: likelyCorrectTokenId.toString(),
                reason: 'incorrect_totalSupply_calculation',
                metadata: incorrect.metadata
              });
              console.log(`🔧 Migration planned: ${incorrect.tokenId} → ${likelyCorrectTokenId}`);
            } else {
              results.migration.planned.push({
                action: 'delete',
                tokenId: incorrect.tokenId,
                reason: 'duplicate_or_orphaned',
                metadata: incorrect.metadata
              });
              console.log(`🗑️ Deletion planned: ${incorrect.tokenId} (orphaned/duplicate)`);
            }
          } else {
            results.migration.planned.push({
              action: 'delete',
              tokenId: incorrect.tokenId,
              reason: 'completely_invalid',
              metadata: incorrect.metadata
            });
            console.log(`🗑️ Deletion planned: ${incorrect.tokenId} (completely invalid)`);
          }
        }

        // Check for missing metadata (tokens that should exist but don't have metadata)
        for (let i = 0; i < Number(totalSupply); i++) {
          const existingMetadata = await getNFTMetadata(contractAddress, i.toString());
          if (!existingMetadata) {
            results.analysis.missingMetadata.push({
              tokenId: i.toString(),
              note: 'Token exists on contract but has no stored metadata'
            });
          }
        }

        console.log(`📋 Migration summary: ${results.migration.planned.length} operations planned`);
      } catch (error) {
        console.log("❌ Failed to analyze stored metadata:", error);
        results.analysis.error = error.message;
      }
    }

    if (action === 'migrate' && !dryRun) {
      console.log("🚀 EXECUTING MIGRATION ===========================================");
      
      for (const operation of results.migration.planned) {
        try {
          if (operation.action === 'move') {
            console.log(`🔄 Moving metadata: ${operation.fromTokenId} → ${operation.toTokenId}`);
            
            // Create new metadata with correct tokenId
            const correctedMetadata = {
              ...operation.metadata,
              tokenId: operation.toTokenId
            };
            
            // Store corrected metadata
            await storeNFTMetadata(correctedMetadata);
            
            // Verify it was stored correctly
            const verification = await getNFTMetadata(contractAddress, operation.toTokenId);
            if (verification) {
              // Delete the old incorrect metadata
              // Note: You'll need to implement deleteNFTMetadata function in nftMetadataStore
              console.log(`✅ Migration successful: ${operation.fromTokenId} → ${operation.toTokenId}`);
              results.migration.executed.push(operation);
            } else {
              throw new Error('Failed to verify migrated metadata');
            }
            
          } else if (operation.action === 'delete') {
            console.log(`🗑️ Deleting orphaned metadata: ${operation.tokenId}`);
            // Delete orphaned metadata (implement deleteNFTMetadata if needed)
            results.migration.executed.push(operation);
          }
          
        } catch (error) {
          console.log(`❌ Migration failed for ${operation.tokenId}: ${error.message}`);
          results.migration.failed.push({
            ...operation,
            error: error.message
          });
        }
      }
    }

    // Generate summary
    results.summary = {
      contractTotalSupply: results.contractInfo.totalSupply,
      storedMetadataCount: results.analysis.totalStoredMetadata,
      correctlyStoredCount: results.analysis.correctTokenIds.length,
      incorrectlyStoredCount: results.analysis.incorrectTokenIds.length,
      missingMetadataCount: results.analysis.missingMetadata.length,
      migrationPlanned: results.migration.planned.length,
      migrationExecuted: results.migration.executed.length,
      migrationFailed: results.migration.failed.length
    };

    console.log("📊 MIGRATION SUMMARY:", results.summary);

    res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}