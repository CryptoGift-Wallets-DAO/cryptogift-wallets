import { NextApiRequest, NextApiResponse } from 'next';

/**
 * DEBUGGING ENDPOINT: Test IPFS validation with specific URLs
 * This will help us understand exactly what's failing in the validation
 */

// Copy the exact functions from mint-escrow.ts for testing
function encodeAllPathSegmentsSafe(path: string): string {
  if (!path || path === '/') return '';
  
  try {
    const segments = path.split('/').filter(segment => segment.length > 0);
    const encodedSegments = segments.map(segment => {
      try {
        const decoded = decodeURIComponent(segment);
        return encodeURIComponent(decoded);
      } catch {
        return segment.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
      }
    });
    return '/' + encodedSegments.join('/');
  } catch (error) {
    return path;
  }
}

function constructGatewayUrls(imageUrl: string): Array<{url: string, gateway: string}> {
  const gateways = [
    'https://gateway.thirdweb.com/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://ipfs.io/ipfs', 
    'https://gateway.pinata.cloud/ipfs',
    'https://nftstorage.link/ipfs'
  ];
  
  if (imageUrl.startsWith('ipfs://')) {
    const ipfsPath = imageUrl.replace('ipfs://', '');
    const [cid, ...pathParts] = ipfsPath.split('/');
    const fullPath = pathParts.length > 0 ? `/${pathParts.join('/')}` : '';
    
    const encodedPath = encodeAllPathSegmentsSafe(fullPath);
    
    console.log('🔧 IPFS Path Construction:', {
      original: imageUrl,
      ipfsPath,
      cid: cid.substring(0, 10) + '...',
      fullPath,
      encodedPath
    });
    
    return gateways.map(gateway => ({
      url: `${gateway}/${cid}${encodedPath}`,
      gateway
    }));
  }
  
  // For HTTPS URLs, return as-is (should not happen for metadata)
  return [{url: imageUrl, gateway: 'original'}];
}

async function testSingleGateway(url: string): Promise<{success: boolean, status?: number, error?: string}> {
  try {
    console.log('🧪 Testing gateway:', url);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000)
    });
    
    console.log('📊 Response:', {
      url: url.substring(0, 50) + '...',
      status: response.status,
      ok: response.ok,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      }
    });
    
    return {
      success: response.ok,
      status: response.status
    };
  } catch (error: any) {
    console.log('❌ Gateway failed:', {
      url: url.substring(0, 50) + '...',
      error: error.message
    });
    return {
      success: false,
      error: error.message
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { testUrl } = req.query;
    
    if (!testUrl || typeof testUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing testUrl parameter'
      });
    }
    
    console.log('🔍 DEBUG: Starting IPFS validation test for:', testUrl);
    
    // Step 1: Generate gateway URLs
    const gatewayUrls = constructGatewayUrls(testUrl);
    
    console.log('🌐 Generated gateway URLs:', gatewayUrls);
    
    // Step 2: Test each gateway
    const results = [];
    for (const candidate of gatewayUrls) {
      const result = await testSingleGateway(candidate.url);
      results.push({
        gateway: candidate.gateway,
        url: candidate.url,
        ...result
      });
    }
    
    // Step 3: Summary
    const successfulGateways = results.filter(r => r.success);
    const failedGateways = results.filter(r => !r.success);
    
    return res.status(200).json({
      success: true,
      testUrl,
      summary: {
        totalGateways: results.length,
        successful: successfulGateways.length,
        failed: failedGateways.length
      },
      results: {
        successful: successfulGateways,
        failed: failedGateways
      },
      conclusion: successfulGateways.length > 0 ? 'AT_LEAST_ONE_WORKING' : 'ALL_GATEWAYS_FAILED'
    });
    
  } catch (error: any) {
    console.error('❌ Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}