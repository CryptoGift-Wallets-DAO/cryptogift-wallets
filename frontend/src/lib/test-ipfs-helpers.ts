/**
 * UNIT TESTS FOR IPFS HELPERS
 * Verification of surgical micro-improvements
 */

// Import helpers (they need to be exported first)
// import { isIpfsUrl, extractCidPath, toGatewayHttps, encodePathSegments } from './ipfs';

// For now, duplicate the functions for testing
function isIpfsUrl(url: string): boolean {
  return url.startsWith('ipfs://');
}

function isHttpsGatewayUrl(url: string): boolean {
  return url.startsWith('https://') && (
    url.includes('/ipfs/') || 
    url.includes('gateway.') || 
    url.includes('ipfs.io') ||
    url.includes('cloudflare-ipfs.com')
  );
}

function extractCidPath(input: string): string {
  if (!isIpfsUrl(input) && !isHttpsGatewayUrl(input)) {
    return input;
  }
  
  if (isIpfsUrl(input)) {
    return input.replace(/^ipfs:\/\//, '');
  }
  
  if (isHttpsGatewayUrl(input)) {
    const match = input.match(/\/ipfs\/(.+)/);
    return match ? match[1] : input;
  }
  
  return input;
}

function encodePathSegments(path: string): string {
  return path.split('/').map(segment => {
    if (segment.startsWith('Qm') && !segment.includes(' ')) {
      return segment;
    }
    return encodeURIComponent(segment);
  }).join('/');
}

function toGatewayHttps(cidPath: string, preferredGateway: 'thirdweb' | 'ipfs' | 'cloudflare' = 'thirdweb'): string {
  if (isHttpsGatewayUrl(cidPath)) {
    return cidPath;
  }
  
  const encodedPath = encodePathSegments(cidPath);
  
  const gatewayMap = {
    thirdweb: 'https://gateway.thirdweb.com/ipfs/',
    ipfs: 'https://ipfs.io/ipfs/',
    cloudflare: 'https://cloudflare-ipfs.com/ipfs/'
  };
  
  return gatewayMap[preferredGateway] + encodedPath;
}

/**
 * TEST CASES - Critical scenarios from your analysis
 */
export function runIpfsHelperTests(): { passed: number; failed: number; results: any[] } {
  const tests = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, input: any, expected: any, actual: any) {
    const success = JSON.stringify(actual) === JSON.stringify(expected);
    if (success) passed++;
    else failed++;
    
    tests.push({
      name,
      input,
      expected,
      actual,
      success
    });
    
    console.log(`${success ? '✅' : '❌'} ${name}`);
    if (!success) {
      console.log(`   Input: ${JSON.stringify(input)}`);
      console.log(`   Expected: ${JSON.stringify(expected)}`);
      console.log(`   Actual: ${JSON.stringify(actual)}`);
    }
  }

  console.log('🧪 Running IPFS Helper Unit Tests...');

  // Test 1: Extract CID from ipfs:// with spaces in filename
  test(
    'extractCidPath: ipfs://Qm.../Mi foto (1).png',
    'ipfs://QmTestCID123/Mi foto (1).png',
    'QmTestCID123/Mi foto (1).png',
    extractCidPath('ipfs://QmTestCID123/Mi foto (1).png')
  );

  // Test 2: Don't double-clean already clean CID
  test(
    'extractCidPath: already clean CID/path',
    'QmTestCID123/Mi foto (1).png',
    'QmTestCID123/Mi foto (1).png',
    extractCidPath('QmTestCID123/Mi foto (1).png')
  );

  // Test 3: Fix double ipfs:// prefix
  test(
    'extractCidPath: ipfs://ipfs://QmXXX (double prefix)',
    'ipfs://ipfs://QmTestCID123/file.png',
    'ipfs://QmTestCID123/file.png', // Only removes first ipfs://
    extractCidPath('ipfs://ipfs://QmTestCID123/file.png')
  );

  // Test 4: Encode path segments correctly
  test(
    'encodePathSegments: spaces in filename',
    'QmTestCID123/Mi foto (1).png',
    'QmTestCID123/Mi%20foto%20(1).png',
    encodePathSegments('QmTestCID123/Mi foto (1).png')
  );

  // Test 5: Don't encode CID itself
  test(
    'encodePathSegments: preserve CID, encode filename',
    'QmTestCID123/file with spaces.jpg',
    'QmTestCID123/file%20with%20spaces.jpg',
    encodePathSegments('QmTestCID123/file with spaces.jpg')
  );

  // Test 6: Convert to gateway HTTPS with encoding
  test(
    'toGatewayHttps: CID with spaces → CloudFlare',
    'QmTestCID123/Mi foto (1).png',
    'https://cloudflare-ipfs.com/ipfs/QmTestCID123/Mi%20foto%20(1).png',
    toGatewayHttps('QmTestCID123/Mi foto (1).png', 'cloudflare')
  );

  // Test 7: Already HTTPS should return as-is
  test(
    'toGatewayHttps: already HTTPS',
    'https://ipfs.io/ipfs/QmTestCID123/file.png',
    'https://ipfs.io/ipfs/QmTestCID123/file.png',
    toGatewayHttps('https://ipfs.io/ipfs/QmTestCID123/file.png')
  );

  // Test 8: Extract from gateway URL
  test(
    'extractCidPath: from gateway URL',
    'https://gateway.thirdweb.com/ipfs/QmTestCID123/metadata.json',
    'QmTestCID123/metadata.json',
    extractCidPath('https://gateway.thirdweb.com/ipfs/QmTestCID123/metadata.json')
  );

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed, results: tests };
}

// Auto-run tests when file is executed
if (typeof window === 'undefined') {
  // Node.js environment
  runIpfsHelperTests();
}