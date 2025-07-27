import { withDebugAuth } from '../../../lib/debugAuth';
import { NextApiRequest, NextApiResponse } from "next";

// CRITICAL: Test IPFS verification function that might be causing placeholder usage
async function verifyImageAccessibility(imageCid: string): Promise<{
  accessible: boolean;
  workingGateway?: string;
  allGatewayResults: Array<{ gateway: string; success: boolean; error?: string }>;
}> {
  const gateways = [
    `https://nftstorage.link/ipfs/${imageCid}`,
    `https://ipfs.io/ipfs/${imageCid}`,
    `https://gateway.pinata.cloud/ipfs/${imageCid}`,
    `https://cloudflare-ipfs.com/ipfs/${imageCid}`
  ];

  const results: Array<{ gateway: string; success: boolean; error?: string }> = [];
  let workingGateway: string | undefined;

  console.log(`🔍 Verifying image accessibility for CID: ${imageCid}`);

  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      console.log(`🔍 Testing gateway: ${gateway}`);
      
      const response = await fetch(gateway, {
        method: 'HEAD', // Just check if resource exists
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ Gateway working: ${gateway}`);
        results.push({ gateway, success: true });
        if (!workingGateway) workingGateway = gateway;
      } else {
        console.log(`❌ Gateway failed (${response.status}): ${gateway}`);
        results.push({ gateway, success: false, error: `HTTP ${response.status}` });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Gateway error: ${gateway} - ${errorMessage}`);
      results.push({ gateway, success: false, error: errorMessage });
    }
  }

  const accessible = results.some(r => r.success);
  
  return {
    accessible,
    workingGateway,
    allGatewayResults: results
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cid, action = 'verify' } = req.query;

    if (action === 'verify') {
      if (!cid || typeof cid !== 'string') {
        return res.status(400).json({ 
          error: 'cid parameter is required',
          usage: '/api/debug/ipfs-verify?cid=QmYourCIDHere&action=verify'
        });
      }

      console.log(`🔍 IPFS VERIFY: Testing CID ${cid}`);
      
      const startTime = Date.now();
      const verificationResult = await verifyImageAccessibility(cid);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const result = {
        cid,
        duration: `${duration}ms`,
        accessible: verificationResult.accessible,
        workingGateway: verificationResult.workingGateway,
        totalGateways: verificationResult.allGatewayResults.length,
        workingGateways: verificationResult.allGatewayResults.filter(r => r.success).length,
        failedGateways: verificationResult.allGatewayResults.filter(r => !r.success).length,
        gatewayResults: verificationResult.allGatewayResults,
        
        diagnosis: {
          accessible: verificationResult.accessible,
          recommendation: verificationResult.accessible 
            ? 'Image is accessible via IPFS gateways - verification should pass'
            : 'Image is NOT accessible - this could cause placeholder usage in mint process'
        }
      };

      console.log(`✅ IPFS VERIFY COMPLETE: ${verificationResult.accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
      
      return res.status(200).json({
        success: true,
        verification: result
      });

    } else if (action === 'test-known-good') {
      // Test with a known good IPFS CID
      const knownGoodCids = [
        'QmYyqMqJEARwVHSqpg6o5VdaqyV9Fg4K9K8Fc4WYxcGS7V', // Known working test image
        'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51', // Another test image
        'QmYjFRYKSXYjgKNKCCNrBc3n4d6SXbgqfFfmjbFNTr6vJV'  // Another test image
      ];

      const results = [];
      
      for (const testCid of knownGoodCids) {
        console.log(`🧪 Testing known good CID: ${testCid}`);
        const verificationResult = await verifyImageAccessibility(testCid);
        results.push({
          cid: testCid,
          accessible: verificationResult.accessible,
          workingGateways: verificationResult.allGatewayResults.filter(r => r.success).length
        });
      }

      const allWorking = results.every(r => r.accessible);
      
      return res.status(200).json({
        success: true,
        knownGoodTest: {
          results,
          allWorking,
          diagnosis: allWorking 
            ? 'IPFS verification function is working correctly with known good CIDs'
            : 'IPFS verification function has issues - this could explain placeholder usage'
        }
      });

    } else {
      return res.status(400).json({ 
        error: 'Invalid action',
        validActions: ['verify', 'test-known-good']
      });
    }

  } catch (error) {
    console.error('❌ IPFS verify error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
// Export with debug authentication
export default withDebugAuth(handler);
