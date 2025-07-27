import { withDebugAuth } from '../../../lib/debugAuth';
import { NextApiRequest, NextApiResponse } from "next";
import { storeNFTMetadata, createNFTMetadata, getNFTMetadata } from "../../../lib/nftMetadataStore";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action = 'full-test' } = req.query;

    if (action === 'full-test') {
      console.log("🧪 FULL FLOW TEST: Starting complete image flow simulation...");
      
      const testData = {
        contractAddress: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS || '0x1234567890123456789012345678901234567890',
        tokenId: `test_${Date.now()}`,
        testImageCid: 'QmYyqMqJEARwVHSqpg6o5VdaqyV9Fg4K9K8Fc4WYxcGS7V', // Known working test CID
        giftMessage: 'Test gift message for debugging'
      };

      const flowResult = {
        step1_createMetadata: null as any,
        step2_storeMetadata: null as any,
        step3_retrieveMetadata: null as any,
        step4_comparison: null as any,
        diagnosis: {
          success: false,
          issues: [] as string[],
          rootCause: 'unknown'
        }
      };

      try {
        // STEP 1: Create metadata (simulate what happens in /api/mint)
        console.log("🧪 STEP 1: Creating test metadata...");
        const testMetadata = createNFTMetadata({
          contractAddress: testData.contractAddress,
          tokenId: testData.tokenId,
          name: `Test NFT #${testData.tokenId}`,
          description: testData.giftMessage,
          imageIpfsCid: testData.testImageCid,
          attributes: [
            { trait_type: 'Test Mode', value: 'Flow Debugging' },
            { trait_type: 'CID Source', value: 'Known Good Test CID' }
          ],
          owner: '0x1234567890123456789012345678901234567890'
        });

        flowResult.step1_createMetadata = {
          success: true,
          metadata: testMetadata,
          imageField: testMetadata.image,
          imageIpfsCid: testMetadata.imageIpfsCid,
          isIPFSFormat: testMetadata.image?.startsWith('ipfs://'),
          isPlaceholder: testMetadata.image?.includes('placeholder')
        };

        console.log("✅ STEP 1 SUCCESS: Metadata created");
        console.log("🔍 Created image field:", testMetadata.image);

        // STEP 2: Store metadata (simulate Redis storage)
        console.log("🧪 STEP 2: Storing metadata in Redis...");
        await storeNFTMetadata(testMetadata);
        
        flowResult.step2_storeMetadata = {
          success: true,
          storedAt: new Date().toISOString()
        };

        console.log("✅ STEP 2 SUCCESS: Metadata stored in Redis");

        // STEP 3: Retrieve metadata (simulate what happens in /api/nft/[...params])
        console.log("🧪 STEP 3: Retrieving metadata from Redis...");
        const retrievedMetadata = await getNFTMetadata(testData.contractAddress, testData.tokenId);
        
        flowResult.step3_retrieveMetadata = {
          success: !!retrievedMetadata,
          found: !!retrievedMetadata,
          metadata: retrievedMetadata,
          imageField: retrievedMetadata?.image,
          imageIpfsCid: retrievedMetadata?.imageIpfsCid
        };

        if (!retrievedMetadata) {
          console.log("❌ STEP 3 FAILED: Could not retrieve metadata from Redis");
          flowResult.diagnosis.issues.push('Metadata storage/retrieval failed');
        } else {
          console.log("✅ STEP 3 SUCCESS: Metadata retrieved from Redis");
          console.log("🔍 Retrieved image field:", retrievedMetadata.image);
        }

        // STEP 4: Compare what was stored vs what was retrieved
        console.log("🧪 STEP 4: Comparing stored vs retrieved data...");
        flowResult.step4_comparison = {
          originalImage: testMetadata.image,
          retrievedImage: retrievedMetadata?.image,
          imagesMatch: testMetadata.image === retrievedMetadata?.image,
          originalCid: testMetadata.imageIpfsCid,
          retrievedCid: retrievedMetadata?.imageIpfsCid,
          cidsMatch: testMetadata.imageIpfsCid === retrievedMetadata?.imageIpfsCid,
          bothAreIPFS: testMetadata.image?.startsWith('ipfs://') && retrievedMetadata?.image?.startsWith('ipfs://'),
          neitherIsPlaceholder: !testMetadata.image?.includes('placeholder') && !retrievedMetadata?.image?.includes('placeholder')
        };

        // DIAGNOSIS
        if (!retrievedMetadata) {
          flowResult.diagnosis.rootCause = 'storage_retrieval_failure';
          flowResult.diagnosis.issues.push('Metadata not found after storage - Redis issue');
        } else if (retrievedMetadata.image?.includes('placeholder')) {
          flowResult.diagnosis.rootCause = 'placeholder_stored_in_mint';
          flowResult.diagnosis.issues.push('Placeholder image was stored during mint process');
        } else if (!retrievedMetadata.image?.startsWith('ipfs://')) {
          flowResult.diagnosis.rootCause = 'invalid_ipfs_format';
          flowResult.diagnosis.issues.push('Image field does not have proper ipfs:// format');
        } else if (!flowResult.step4_comparison.imagesMatch) {
          flowResult.diagnosis.rootCause = 'data_corruption_in_storage';
          flowResult.diagnosis.issues.push('Image data was corrupted during storage/retrieval');
        } else {
          flowResult.diagnosis.success = true;
          flowResult.diagnosis.rootCause = 'flow_working_correctly';
          console.log("✅ STEP 4 SUCCESS: Full flow working correctly!");
        }

      } catch (error) {
        console.error("❌ Flow test error:", error);
        flowResult.diagnosis.issues.push(`Error during flow test: ${error instanceof Error ? error.message : 'Unknown error'}`);
        flowResult.diagnosis.rootCause = 'unexpected_error';
      }

      return res.status(200).json({
        success: true,
        testData,
        flowResult,
        summary: {
          overallSuccess: flowResult.diagnosis.success,
          rootCause: flowResult.diagnosis.rootCause,
          issues: flowResult.diagnosis.issues,
          recommendation: flowResult.diagnosis.success 
            ? 'The flow is working correctly. Issue must be in the specific NFT data or different contract/tokenId'
            : `Fix required: ${flowResult.diagnosis.rootCause}`
        }
      });

    } else if (action === 'specific-nft') {
      const { contract, tokenId } = req.query;
      
      if (!contract || !tokenId) {
        return res.status(400).json({ 
          error: 'contract and tokenId required for specific-nft test',
          usage: '/api/debug/flow-test?action=specific-nft&contract=0x...&tokenId=123'
        });
      }

      console.log(`🧪 SPECIFIC NFT TEST: Testing ${contract}:${tokenId}`);
      
      const retrievedMetadata = await getNFTMetadata(contract as string, tokenId as string);
      
      return res.status(200).json({
        success: true,
        contract,
        tokenId,
        found: !!retrievedMetadata,
        metadata: retrievedMetadata,
        diagnosis: {
          hasMetadata: !!retrievedMetadata,
          hasImage: !!(retrievedMetadata?.image),
          imageIsIPFS: retrievedMetadata?.image?.startsWith('ipfs://'),
          imageIsPlaceholder: retrievedMetadata?.image?.includes('placeholder'),
          recommendation: !retrievedMetadata 
            ? 'Metadata not found - check if this NFT was minted correctly'
            : retrievedMetadata.image?.includes('placeholder')
            ? 'Placeholder stored in metadata - issue in mint process'
            : 'Metadata appears correct'
        }
      });

    } else {
      return res.status(400).json({ 
        error: 'Invalid action',
        validActions: ['full-test', 'specific-nft']
      });
    }

  } catch (error) {
    console.error('❌ Flow test error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
// Export with debug authentication
export default withDebugAuth(handler);
