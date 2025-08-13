import { NextApiRequest, NextApiResponse } from 'next';

/**
 * TEST MINT WITH KNOWN WORKING CID
 * This bypasses upload issues and tests validation + minting directly
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 TESTING MINT WITH KNOWN CID...');
    
    // Use a KNOWN working metadata CID from existing NFTs
    // This CID should have metadata.json that's accessible via IPFS gateways
    const knownWorkingCid = 'QmWGt1YZdYKpuYtsWiHTsQhpPq8pEAP1CiL9cU6kNN6558'; // From testing report
    const testMetadataUri = `ipfs://${knownWorkingCid}`;
    
    console.log('📋 Test parameters:', {
      metadataUri: testMetadataUri,
      knownCid: knownWorkingCid
    });
    
    // Test request body matching what GiftWizard would send
    const testRequestBody = {
      metadataUri: testMetadataUri,
      recipientAddress: undefined, // Direct mint (no escrow)
      giftMessage: 'Test mint to verify pipeline',
      creatorAddress: '0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6', // Your wallet
      gasless: false
    };
    
    console.log('🔄 Forwarding to mint-escrow API...');
    
    // Forward to actual mint-escrow API
    const mintResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/mint-escrow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '', // Forward auth
        'Cookie': req.headers.cookie || '' // Forward session
      },
      body: JSON.stringify(testRequestBody)
    });
    
    const mintResult = await mintResponse.json();
    
    console.log('📊 Mint API result:', {
      status: mintResponse.status,
      ok: mintResponse.ok,
      result: mintResult
    });
    
    // Return comprehensive test results
    return res.status(200).json({
      success: true,
      testType: 'mint_with_known_cid',
      timestamp: new Date().toISOString(),
      input: {
        knownCid,
        metadataUri: testMetadataUri,
        requestBody: testRequestBody
      },
      mintApiResponse: {
        status: mintResponse.status,
        ok: mintResponse.ok,
        result: mintResult
      },
      conclusion: mintResponse.ok ? 
        'VALIDATION_PIPELINE_WORKS' : 
        'VALIDATION_PIPELINE_STILL_FAILS',
      implications: mintResponse.ok ? [
        'Upload is the problem - validation works fine',
        'Need to fix upload in handleGasConfirm',
        'Pipeline is fundamentally sound'
      ] : [
        'Validation itself is broken',
        'Issue is deeper than upload',
        'Need to debug validation logic'
      ]
    });
    
  } catch (error: any) {
    console.error('❌ Test mint failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      step: 'test_execution'
    });
  }
}