import { withDebugAuth } from '../../../lib/debugAuth';
import { NextApiRequest, NextApiResponse } from 'next';

// DEBUG ENDPOINT: Get detailed mint logs and trace mint process issues
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 DEBUG: Getting mint trace information...');

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasIPFSKeys: !!(process.env.PINATA_JWT || process.env.NFTSTORAGE_API_KEY),
        hasNFTContract: !!process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS,
        hasRedisConnection: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)
      },
      commonIssues: {
        imageVerificationFailing: {
          description: 'IPFS verification timeout or gateway issues',
          solution: 'Check verifyImageAccessibility function in mint.ts',
          debug: 'Look for "Image verification result" logs'
        },
        metadataNotStoring: {
          description: 'Metadata fails to store in Redis',
          solution: 'Check Redis connection and storeNFTMetadata function',
          debug: 'Look for "Metadata stored successfully" or storage errors'
        },
        placeholderInMetadata: {
          description: 'Image placeholder used during metadata creation',
          solution: 'Check if imageFile parameter contains correct CID',
          debug: 'Look for "Image being stored" logs in mint process'
        }
      },
      checkSteps: [
        {
          step: 1,
          action: 'Create a new NFT',
          lookFor: '🔍 Processed imageIpfsCid: [CID]'
        },
        {
          step: 2,
          action: 'Check image verification',
          lookFor: '🔍 Image verification result: {accessible: true/false}'
        },
        {
          step: 3,
          action: 'Check metadata creation',
          lookFor: '🖼️ Image being stored: ipfs://[CID]'
        },
        {
          step: 4,
          action: 'Check storage success',
          lookFor: '✅ Metadata stored successfully in Redis'
        },
        {
          step: 5,
          action: 'Check storage verification',
          lookFor: '✅ NFT metadata stored and verified successfully'
        }
      ],
      troubleshooting: {
        ifVerificationFails: 'Temporarily disable strict IPFS verification',
        ifStorageFails: 'Check Redis connection and keys',
        ifPlaceholderUsed: 'Check imageFile parameter in mint API call'
      },
      recentLogs: [] as any[]
    };

    // Check recent mint logs if available
    try {
      // Try to get recent logs from the logs endpoint
      const logsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/debug/mint-logs`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        debugInfo.recentLogs = logsData.logs?.slice(-10) || []; // Last 10 logs
      }
    } catch (error) {
      debugInfo.recentLogs = ['Could not fetch recent logs'];
    }

    console.log('🔍 DEBUG: Mint trace completed', debugInfo);

    res.status(200).json({
      success: true,
      debug: debugInfo,
      instructions: {
        usage: 'Create a new NFT and watch browser console + server logs',
        endpoints: [
          '/api/debug/image-flow?contractAddress=CONTRACT&tokenId=TOKEN_ID',
          '/api/debug/mint-logs',
          '/api/debug/mint-trace (this endpoint)'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Mint trace debug error:', error);
    res.status(500).json({
      error: 'Mint trace analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
// Export with debug authentication
export default withDebugAuth(handler);
