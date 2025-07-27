import { withDebugAuth } from '../../../lib/debugAuth';
import { NextApiRequest, NextApiResponse } from 'next';
import { getNFTMetadata } from '../../../lib/nftMetadataStore';

// DEBUG ENDPOINT: Trace image flow for specific NFT
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contractAddress, tokenId } = req.query;

    if (!contractAddress || !tokenId) {
      return res.status(400).json({
        error: 'Missing parameters',
        required: 'contractAddress and tokenId'
      });
    }

    console.log(`🔍 DEBUG: Tracing image flow for ${contractAddress}:${tokenId}`);

    const debugInfo = {
      timestamp: new Date().toISOString(),
      input: {
        contractAddress: contractAddress as string,
        tokenId: tokenId as string
      },
      steps: {} as any,
      analysis: {} as any
    };

    // Step 1: Check stored metadata
    console.log('STEP 1: Checking stored metadata...');
    debugInfo.steps.storedMetadata = {
      step: 'Check Redis storage',
      status: 'checking'
    };

    const storedMetadata = await getNFTMetadata(contractAddress as string, tokenId as string);
    
    if (storedMetadata) {
      debugInfo.steps.storedMetadata = {
        step: 'Check Redis storage',
        status: 'found',
        data: {
          image: storedMetadata.image,
          imageIpfsCid: storedMetadata.imageIpfsCid,
          name: storedMetadata.name,
          uniqueCreationId: storedMetadata.uniqueCreationId,
          createdAt: storedMetadata.createdAt,
          contractAddress: storedMetadata.contractAddress,
          tokenId: storedMetadata.tokenId
        }
      };
      
      // Step 2: Check image URL format
      console.log('STEP 2: Analyzing image URL...');
      const imageUrl = storedMetadata.image;
      
      debugInfo.steps.imageAnalysis = {
        step: 'Analyze image URL',
        imageUrl: imageUrl,
        isIPFS: imageUrl.startsWith('ipfs://'),
        isHTTP: imageUrl.startsWith('http'),
        isPlaceholder: imageUrl.includes('cg-wallet-placeholder.png'),
        format: imageUrl.startsWith('ipfs://') ? 'IPFS' : 
                imageUrl.startsWith('http') ? 'HTTP' : 
                imageUrl.startsWith('/') ? 'RELATIVE' : 'UNKNOWN'
      };

      // Step 3: Test IPFS accessibility if it's an IPFS URL
      if (imageUrl.startsWith('ipfs://')) {
        console.log('STEP 3: Testing IPFS accessibility...');
        const cid = imageUrl.replace('ipfs://', '');
        const gateways = [
          `https://nftstorage.link/ipfs/${cid}`,
          `https://ipfs.io/ipfs/${cid}`,
          `https://gateway.pinata.cloud/ipfs/${cid}`
        ];

        debugInfo.steps.ipfsAccessibility = {
          step: 'Test IPFS gateways',
          cid: cid,
          gateways: []
        };

        for (const gateway of gateways) {
          try {
            console.log(`Testing gateway: ${gateway}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(gateway, {
              method: 'HEAD',
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            debugInfo.steps.ipfsAccessibility.gateways.push({
              gateway,
              status: response.status,
              success: response.ok,
              headers: {
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length')
              }
            });

            if (response.ok) break; // Found working gateway
            
          } catch (error) {
            debugInfo.steps.ipfsAccessibility.gateways.push({
              gateway,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

    } else {
      debugInfo.steps.storedMetadata = {
        step: 'Check Redis storage',
        status: 'not_found',
        error: 'No metadata found in storage'
      };

      // Step 2: This explains why placeholder is used
      debugInfo.steps.fallbackReason = {
        step: 'Why placeholder is used',
        reason: 'No stored metadata found',
        location: '/api/nft/[...params].ts line 144-169',
        action: 'API returns placeholder as fallback'
      };
    }

    // Step 4: Check what the display API would return
    console.log('STEP 4: Simulating display API response...');
    try {
      const displayResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/nft/${contractAddress}/${tokenId}`);
      const displayData = await displayResponse.json();
      
      debugInfo.steps.displayAPI = {
        step: 'Display API response',
        status: displayResponse.status,
        data: {
          image: displayData.image,
          name: displayData.name,
          description: displayData.description
        }
      };
    } catch (error) {
      debugInfo.steps.displayAPI = {
        step: 'Display API response',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Final analysis
    debugInfo.analysis = {
      problem: storedMetadata ? 
        (storedMetadata.image.includes('placeholder') ? 'STORED_WITH_PLACEHOLDER' : 'IPFS_ACCESS_ISSUE') :
        'METADATA_NOT_STORED',
      recommendation: storedMetadata ?
        (storedMetadata.image.includes('placeholder') ? 'Check mint process - image stored as placeholder' : 'Check IPFS gateway accessibility') :
        'Check mint process - metadata not being stored'
    };

    console.log('🔍 DEBUG: Image flow analysis completed', debugInfo);

    res.status(200).json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
// Export with debug authentication
export default withDebugAuth(handler);
