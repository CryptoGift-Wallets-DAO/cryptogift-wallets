import { withDebugAuth } from '../../../lib/debugAuth';
import { NextApiRequest, NextApiResponse } from "next";
import { getNFTMetadata } from "../../../lib/nftMetadataStore";
import { debugLogger } from '../../../lib/secureDebugLogger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contract, tokenId } = req.query;

    if (contract && tokenId) {
      // Get specific NFT metadata
      debugLogger.operation("Token check initiated", { hasTokenId: true });
      const metadata = await getNFTMetadata(contract as string, tokenId as string);
      
      if (metadata) {
        debugLogger.operation(`✅ Debug: Found metadata for ${contract}:${tokenId}`);
        return res.status(200).json({
          success: true,
          metadata,
          query: { contract, tokenId }
        });
      } else {
        debugLogger.operation(`❌ Debug: No metadata found for ${contract}:${tokenId}`);
        return res.status(404).json({
          success: false,
          message: `No metadata found for ${contract}:${tokenId}`,
          query: { contract, tokenId }
        });
      }
    } else {
      // General metadata info (no bulk listing available)
      debugLogger.operation(`📋 Debug: Metadata endpoint info`);
      
      return res.status(200).json({
        success: true,
        message: 'Metadata debug endpoint',
        usage: {
          specificNFT: '/api/debug/metadata?contract=0x...&tokenId=123',
          info: 'Provide contract and tokenId parameters to get specific NFT metadata'
        },
        availableEndpoints: [
          '/api/debug/image-flow?contractAddress=CONTRACT&tokenId=TOKEN',
          '/api/debug/mint-trace',
          '/api/debug/storage-analysis'
        ]
      });
    }
  } catch (error) {
    console.error('❌ Debug metadata error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
// Export with debug authentication
export default withDebugAuth(handler);
