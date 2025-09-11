import { withDebugAuth } from '../../../lib/debugAuth';
import { NextApiRequest, NextApiResponse } from "next";
import { getNFTMetadata, storeNFTMetadata, createNFTMetadata } from "../../../lib/nftMetadataStore";
import { debugLogger } from '../../../lib/secureDebugLogger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contract, tokenId, action = 'trace' } = req.query;

    if (!contract || !tokenId) {
      return res.status(400).json({ 
        error: 'contract and tokenId parameters are required',
        usage: '/api/debug/image-trace?contract=0x...&tokenId=123&action=trace'
      });
    }

    const contractAddress = contract as string;
    const tokenIdStr = tokenId as string;

    debugLogger.operation("Token check initiated", { hasTokenId: true });

    if (action === 'trace') {
      // STEP 1: Check if metadata exists in Redis
      debugLogger.operation(`🔍 STEP 1: Checking Redis for metadata...`);
      const storedMetadata = await getNFTMetadata(contractAddress, tokenIdStr);
      
      const result = {
        contractAddress,
        tokenId: tokenIdStr,
        timestamp: new Date().toISOString(),
        
        // Redis storage check
        metadataExists: !!storedMetadata,
        storedMetadata: storedMetadata || null,
        
        // Image analysis
        imageAnalysis: null as any,
        
        // Diagnosis
        diagnosis: {
          rootCause: 'unknown',
          recommendations: [] as string[]
        }
      };

      if (storedMetadata) {
        debugLogger.operation(`✅ STEP 1 SUCCESS: Found metadata in Redis`);
        
        // STEP 2: Analyze the stored image
        debugLogger.operation(`🔍 STEP 2: Analyzing stored image...`);
        result.imageAnalysis = {
          imageField: storedMetadata.image,
          imageIpfsCid: storedMetadata.imageIpfsCid,
          isIPFSFormat: storedMetadata.image?.startsWith('ipfs://'),
          isPlaceholder: storedMetadata.image?.includes('placeholder'),
          imageFieldLength: storedMetadata.image?.length,
          hasValidCID: !!(storedMetadata.imageIpfsCid && storedMetadata.imageIpfsCid.length > 10)
        };

        // STEP 3: Determine root cause
        debugLogger.operation(`🔍 STEP 3: Determining root cause...`);
        if (result.imageAnalysis.isPlaceholder) {
          result.diagnosis.rootCause = 'placeholder_stored_in_redis';
          result.diagnosis.recommendations = [
            'The placeholder image was stored in Redis during mint',
            'Check the /api/mint endpoint for proper image CID handling',
            'Verify that actualImageCid is being passed correctly from GiftWizard'
          ];
        } else if (!result.imageAnalysis.isIPFSFormat) {
          result.diagnosis.rootCause = 'invalid_ipfs_format';
          result.diagnosis.recommendations = [
            'Image field does not have ipfs:// format',
            'Check image processing in createNFTMetadata function'
          ];
        } else if (!result.imageAnalysis.hasValidCID) {
          result.diagnosis.rootCause = 'missing_ipfs_cid';
          result.diagnosis.recommendations = [
            'imageIpfsCid field is missing or invalid',
            'Check that imageIpfsCid is properly extracted in /api/mint'
          ];
        } else {
          result.diagnosis.rootCause = 'image_properly_stored';
          result.diagnosis.recommendations = [
            'Image appears to be properly stored in Redis',
            'The issue might be in the display API /api/nft/[...params].ts',
            'Check if the metadata is being found correctly during retrieval'
          ];
        }
      } else {
        debugLogger.operation(`❌ STEP 1 FAILED: No metadata found in Redis`);
        result.diagnosis.rootCause = 'metadata_not_stored';
        result.diagnosis.recommendations = [
          'Metadata was never stored in Redis during mint process',
          'Check the /api/mint endpoint storeNFTMetadata call',
          'Verify Redis connection and storage permissions',
          'Check if the mint process is completing successfully'
        ];
      }

      debugLogger.operation(`✅ IMAGE TRACE COMPLETE:`, result.diagnosis);
      
      return res.status(200).json({
        success: true,
        trace: result,
        nextSteps: [
          'If metadata_not_stored: Check mint logs with /api/debug/mint-logs',
          'If placeholder_stored: Check image processing in GiftWizard and /api/upload',
          'If properly_stored: Check display logic in /api/nft/[...params].ts'
        ]
      });

    } else if (action === 'test-store') {
      // TEST: Store test metadata to verify Redis storage works
      debugLogger.operation(`🧪 TEST: Storing test metadata...`);
      
      const testMetadata = createNFTMetadata({
        contractAddress,
        tokenId: tokenIdStr,
        name: `TEST NFT #${tokenIdStr}`,
        description: 'Test metadata for debugging image issues',
        imageIpfsCid: 'QmTestCID123456789abcdef', // Test CID
        attributes: [
          { trait_type: 'Test Mode', value: 'Debug Storage Test' },
          { trait_type: 'Timestamp', value: new Date().toISOString() }
        ],
        owner: '0x0000000000000000000000000000000000000000'
      });

      await storeNFTMetadata(testMetadata);
      
      // Verify it was stored
      const retrievedTest = await getNFTMetadata(contractAddress, tokenIdStr);
      
      return res.status(200).json({
        success: true,
        test: {
          stored: testMetadata,
          retrieved: retrievedTest,
          storageWorking: !!retrievedTest,
          imageMatches: retrievedTest?.image === testMetadata.image
        }
      });

    } else {
      return res.status(400).json({ 
        error: 'Invalid action',
        validActions: ['trace', 'test-store']
      });
    }

  } catch (error) {
    console.error('❌ Image trace error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
// Export with debug authentication
export default withDebugAuth(handler);
