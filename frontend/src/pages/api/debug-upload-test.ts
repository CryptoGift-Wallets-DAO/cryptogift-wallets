import { NextApiRequest, NextApiResponse } from 'next';
import { uploadMetadata } from '../../lib/ipfs';

/**
 * DIRECT TEST: Upload metadata and test immediate accessibility
 * This will isolate whether the problem is in upload or validation
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🧪 DIRECT UPLOAD TEST: Starting...');
    
    // Create simple test metadata
    const testMetadata = {
      name: "Test NFT",
      description: "Test metadata upload",
      image: "https://via.placeholder.com/300x300/FF0000/FFFFFF?text=TEST",
      attributes: [
        {
          trait_type: "Test",
          value: "Direct Upload Test"
        }
      ]
    };
    
    console.log('📦 Test metadata:', testMetadata);
    
    // Step 1: Upload metadata
    console.log('🔄 Uploading metadata to IPFS...');
    const uploadResult = await uploadMetadata(testMetadata);
    
    console.log('📤 Upload result:', uploadResult);
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        step: 'upload',
        error: uploadResult.error,
        uploadResult
      });
    }
    
    // Step 2: Test immediate accessibility
    const testUrls = [
      `https://gateway.thirdweb.com/ipfs/${uploadResult.cid}`,
      `https://gateway.thirdweb.com/ipfs/${uploadResult.cid}/metadata.json`,
      `https://ipfs.io/ipfs/${uploadResult.cid}`,
      `https://ipfs.io/ipfs/${uploadResult.cid}/metadata.json`,
      uploadResult.url
    ];
    
    console.log('🔍 Testing URLs immediately after upload...');
    const testResults = [];
    
    for (const testUrl of testUrls) {
      try {
        console.log(`🧪 Testing: ${testUrl}`);
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        const result = {
          url: testUrl,
          status: response.status,
          ok: response.ok,
          headers: {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length')
          }
        };
        
        console.log(`📊 Result: ${testUrl.substring(0, 50)}... → ${response.status}`);
        testResults.push(result);
      } catch (error: any) {
        const result = {
          url: testUrl,
          status: 0,
          ok: false,
          error: error.message
        };
        
        console.log(`❌ Failed: ${testUrl.substring(0, 50)}... → ${error.message}`);
        testResults.push(result);
      }
    }
    
    // Step 3: Try to fetch actual content from working URLs
    const workingUrls = testResults.filter(r => r.ok);
    const contentTests = [];
    
    for (const workingResult of workingUrls) {
      try {
        console.log(`📄 Fetching content from: ${workingResult.url.substring(0, 50)}...`);
        const contentResponse = await fetch(workingResult.url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        if (contentResponse.ok) {
          const content = await contentResponse.text();
          contentTests.push({
            url: workingResult.url,
            success: true,
            contentLength: content.length,
            contentPreview: content.substring(0, 200),
            isValidJson: (() => {
              try {
                JSON.parse(content);
                return true;
              } catch {
                return false;
              }
            })()
          });
        } else {
          contentTests.push({
            url: workingResult.url,
            success: false,
            status: contentResponse.status
          });
        }
      } catch (error: any) {
        contentTests.push({
          url: workingResult.url,
          success: false,
          error: error.message
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      testMetadata,
      uploadResult,
      immediateAccessibility: {
        totalUrls: testUrls.length,
        successfulUrls: workingUrls.length,
        results: testResults
      },
      contentValidation: {
        testedUrls: contentTests.length,
        results: contentTests
      },
      conclusion: workingUrls.length > 0 ? 'SOME_URLS_ACCESSIBLE' : 'NO_URLS_ACCESSIBLE',
      recommendations: workingUrls.length === 0 ? [
        'Upload may have failed silently',
        'IPFS node may be unreachable',
        'CID generation may be incorrect'
      ] : [
        'Upload successful',
        'Use working URLs for validation',
        `Best URL: ${workingUrls[0]?.url}`
      ]
    });
    
  } catch (error: any) {
    console.error('❌ Direct upload test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      step: 'test_setup'
    });
  }
}