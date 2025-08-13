import { NextApiRequest, NextApiResponse } from 'next';
import { isIpfsUrl, extractCidPath, toGatewayHttps, encodePathSegments } from '../../lib/ipfs';

/**
 * CURL TEST ENDPOINT - Verification of surgical IPFS improvements
 * Test cases from your specifications:
 * 
 * Input: ipfs://Qm…/Mi foto (1).png → Output: https://cloudflare-ipfs.com/ipfs/Qm…/Mi%20foto%20(1).png
 * Input: ipfs://ipfs://Qm…/a.png → Output sin doble ipfs://
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 CURL TEST: IPFS URL Processing and Validation');
    
    // Test cases as specified
    const testCases = [
      // Test 1: Spaces in filename
      {
        name: 'Spaces in filename',
        input: 'ipfs://QmTestCID123456789/Mi foto (1).png',
        expectedOutput: 'https://cloudflare-ipfs.com/ipfs/QmTestCID123456789/Mi%20foto%20(1).png'
      },
      // Test 2: Double prefix elimination  
      {
        name: 'Double ipfs:// prefix',
        input: 'ipfs://ipfs://QmTestCID987654321/a.png',
        expectedOutput: 'https://cloudflare-ipfs.com/ipfs/QmTestCID987654321/a.png' // Should strip both prefixes
      },
      // Test 3: Normal case
      {
        name: 'Normal IPFS URL',
        input: 'ipfs://QmNormalTest123/image.jpg',
        expectedOutput: 'https://cloudflare-ipfs.com/ipfs/QmNormalTest123/image.jpg'
      },
      // Test 4: Already HTTPS
      {
        name: 'Already HTTPS gateway',
        input: 'https://ipfs.io/ipfs/QmExisting123/file.png',
        expectedOutput: 'https://ipfs.io/ipfs/QmExisting123/file.png' // Should return as-is
      }
    ];

    const results = [];
    const validationResults = [];

    console.log('🔄 Processing test cases...');
    
    for (const testCase of testCases) {
      console.log(`\n📝 Testing: ${testCase.name}`);
      console.log(`   Input: ${testCase.input}`);
      
      // Step 1: Extract CID/path
      const cidPath = extractCidPath(testCase.input);
      console.log(`   Extracted CID/Path: ${cidPath}`);
      
      // Step 2: Convert to HTTPS gateway (use original input for HTTPS URLs)
      const outputUrl = toGatewayHttps(testCase.input, 'cloudflare');
      console.log(`   Output URL: ${outputUrl}`);
      
      // Step 3: Validate against expected
      const matches = outputUrl === testCase.expectedOutput;
      console.log(`   Matches Expected: ${matches ? '✅' : '❌'}`);
      
      if (!matches) {
        console.log(`   Expected: ${testCase.expectedOutput}`);
      }

      results.push({
        name: testCase.name,
        input: testCase.input,
        cidPath,
        outputUrl,
        expectedOutput: testCase.expectedOutput,
        matches
      });

      // Step 4: HEAD validation for real URLs (skip test URLs)
      if (!testCase.input.includes('QmTest') && !testCase.input.includes('QmNormal') && !testCase.input.includes('QmExisting')) {
        console.log(`   🔍 HEAD validation: ${outputUrl}`);
        
        try {
          const headResponse = await fetch(outputUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          
          const status = headResponse.status;
          const isValid = status === 200 || status === 206;
          
          console.log(`   HEAD → ${status} ${isValid ? '✅' : '❌'}`);
          
          validationResults.push({
            url: outputUrl,
            status,
            valid: isValid,
            redirects: headResponse.redirected ? 1 : 0
          });
        } catch (error) {
          console.log(`   HEAD → Failed: ${error.message}`);
          validationResults.push({
            url: outputUrl,
            status: 'error',
            valid: false,
            error: error.message
          });
        }
      }
    }

    // Summary
    const passed = results.filter(r => r.matches).length;
    const failed = results.length - passed;
    
    console.log(`\n📊 Test Results: ${passed}/${results.length} passed`);
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed,
        failed
      },
      testResults: results,
      validationResults,
      instructions: {
        curl_head: 'curl -I "<image-url-final>" → 200/206, ≤2 redirects',
        curl_json: 'curl -s "<tokenURI-json>" | jq -r .image | xargs -I{} curl -IL "{}" → 200/206'
      }
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('❌ CURL test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      step: 'curl_test_execution'
    });
  }
}