import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getNFTMetadata } from '../../../lib/nftMetadataStore';
import { promises as fsPromises } from 'fs';
import { withDebugAuth } from '../../../lib/debugAuth';
import { debugLogger } from '../../../lib/secureDebugLogger';

// In-memory storage for production (simple fallback)
let inMemoryTraces: any[] = [];

function handleInMemoryStorage(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { type, sessionId, step, trace } = req.body;

      if (type === 'step') {
        // Add step to existing trace or create new one
        let existingTrace = inMemoryTraces.find(t => t.sessionId === sessionId);
        if (!existingTrace) {
          existingTrace = {
            sessionId,
            startTime: step.timestamp,
            steps: []
          };
          inMemoryTraces.push(existingTrace);
        }
        existingTrace.steps.push(step);
      } else if (type === 'complete') {
        // Update or add complete trace
        const existingIndex = inMemoryTraces.findIndex(t => t.sessionId === trace.sessionId);
        if (existingIndex >= 0) {
          inMemoryTraces[existingIndex] = trace;
        } else {
          inMemoryTraces.push(trace);
        }
      }

      // Keep only last 20 traces to prevent memory bloat
      inMemoryTraces = inMemoryTraces.slice(-20);

      res.status(200).json({ success: true, message: 'Trace data saved (in-memory)' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to save trace', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else if (req.method === 'GET') {
    try {
      const { sessionId, latest } = req.query;

      if (sessionId) {
        // Get specific trace
        const trace = inMemoryTraces.find(t => t.sessionId === sessionId);
        if (!trace) {
          return res.status(404).json({ error: 'Trace not found' });
        }
        
        const analysis = analyzeTrace(trace);
        res.status(200).json({ trace, analysis });
      } else if (latest) {
        // Get latest trace
        const latestTrace = inMemoryTraces.slice(-1)[0];
        if (!latestTrace) {
          return res.status(200).json({ trace: null });
        }
        
        const analysis = analyzeTrace(latestTrace);
        res.status(200).json({ trace: latestTrace, analysis });
      } else {
        // Get all traces summary
        const summary = inMemoryTraces.map(trace => ({
          sessionId: trace.sessionId,
          userAddress: trace.userAddress,
          startTime: trace.startTime,
          endTime: trace.endTime,
          finalResult: trace.finalResult,
          stepCount: trace.steps.length,
          duration: trace.endTime ? 
            new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime() : null
        }));
        
        res.status(200).json({ 
          summary,
          totalTraces: inMemoryTraces.length,
          latestTrace: inMemoryTraces.slice(-1)[0]?.sessionId || null
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to read traces', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Enhanced NFT Metadata Flow Diagnostic with ThirdWeb Integration
async function handleNFTFlowDiagnostic(req: NextApiRequest, res: NextApiResponse) {
  const { contractAddress, tokenId } = req.body;

  debugLogger.operation("🚀 ENHANCED NFT FLOW DIAGNOSTIC STARTED ===========================================");
  debugLogger.operation("📅 Timestamp", { timestamp: new Date().toISOString() });
  debugLogger.operation("🎯 Target NFT", { contractAddress, tokenId });

  try {
    const trace = {
      timestamp: new Date().toISOString(),
      contractAddress,
      tokenId,
      checks: {
        environment: {
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
          workingDir: process.cwd(),
          tmpDir: '/tmp',
          storageDir: '/tmp/nft-metadata',
          contractEnvVar: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
          contractMatches: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS === contractAddress
        },
        thirdwebConnection: null,
        contractValidation: null,
        tokenValidation: null,
        serverMetadata: null,
        tmpFiles: [],
        writePermissions: null,
        ipfsVerification: null,
        rootCauseAnalysis: []
      }
    };

    // 1. ThirdWeb Connection Test
    debugLogger.operation("🌐 TESTING THIRDWEB CONNECTION ===========================================");
    try {
      const { createThirdwebClient, getContract, readContract } = await import("thirdweb");
      const { baseSepolia } = await import("thirdweb/chains");
      
      const client = createThirdwebClient({
        clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
        secretKey: process.env.TW_SECRET_KEY!,
      });

      const nftContract = getContract({
        client,
        chain: baseSepolia,
        address: contractAddress,
      });

      trace.checks.thirdwebConnection = {
        status: 'success',
        clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID ? 'Set' : 'Missing',
        secretKey: process.env.TW_SECRET_KEY ? 'Set' : 'Missing'
      };

      // 2. Contract Validation
      debugLogger.operation("📄 VALIDATING CONTRACT ===========================================");
      try {
        const totalSupply = await readContract({
          contract: nftContract,
          method: "function totalSupply() view returns (uint256)",
          params: [],
        });

        trace.checks.contractValidation = {
          status: 'success',
          totalSupply: totalSupply.toString(),
          isValidContract: true
        };

        // 3. Token Validation
        debugLogger.operation("🎯 VALIDATING TOKEN ===========================================");
        if (BigInt(tokenId) >= totalSupply) {
          trace.checks.tokenValidation = {
            status: 'error',
            exists: false,
            error: `Token ${tokenId} does not exist. Total supply: ${totalSupply}`
          };
          trace.checks.rootCauseAnalysis.push(`TOKEN_NOT_EXISTS: Token ID ${tokenId} exceeds total supply ${totalSupply}`);
        } else {
          // Try to get tokenURI and owner
          let tokenURI = null;
          let owner = null;

          try {
            tokenURI = await readContract({
              contract: nftContract,
              method: "function tokenURI(uint256 tokenId) view returns (string)",
              params: [BigInt(tokenId)],
            });
          } catch (uriError) {
            debugLogger.operation("⚠️ TokenURI read failed", { error: uriError });
          }

          try {
            owner = await readContract({
              contract: nftContract,
              method: "function ownerOf(uint256 tokenId) view returns (address)",
              params: [BigInt(tokenId)],
            });
          } catch (ownerError) {
            debugLogger.operation("⚠️ Owner read failed", { error: ownerError });
          }

          trace.checks.tokenValidation = {
            status: 'success',
            exists: true,
            tokenURI,
            owner,
            hasTokenURI: !!tokenURI,
            hasOwner: !!owner
          };
        }
      } catch (contractError) {
        trace.checks.contractValidation = {
          status: 'error',
          error: contractError instanceof Error ? contractError.message : 'Unknown error',
          isValidContract: false
        };
        trace.checks.rootCauseAnalysis.push(`CONTRACT_ERROR: ${contractError}`);
      }
    } catch (thirdwebError) {
      trace.checks.thirdwebConnection = {
        status: 'error',
        error: thirdwebError instanceof Error ? thirdwebError.message : 'Unknown error'
      };
      trace.checks.rootCauseAnalysis.push(`THIRDWEB_ERROR: ${thirdwebError}`);
    }

    // 4. Check server metadata storage
    debugLogger.operation("💾 CHECKING METADATA STORAGE ===========================================");
    try {
      const serverMetadata = await getNFTMetadata(contractAddress, tokenId);
      trace.checks.serverMetadata = {
        found: !!serverMetadata,
        data: serverMetadata,
        status: 'success',
        hasImage: !!(serverMetadata?.image),
        hasImageCid: !!(serverMetadata?.imageIpfsCid),
        isPlaceholder: serverMetadata?.image?.includes('placeholder') || false,
        contractMatches: serverMetadata?.contractAddress === contractAddress,
        tokenIdMatches: serverMetadata?.tokenId?.toString() === tokenId?.toString()
      };

      if (!serverMetadata) {
        trace.checks.rootCauseAnalysis.push("METADATA_NOT_FOUND: No metadata stored in Redis/Upstash - mint process failed to store");
      } else if (serverMetadata.image?.includes('placeholder')) {
        trace.checks.rootCauseAnalysis.push("PLACEHOLDER_STORED: Placeholder image was stored instead of real image during mint");
      } else if (serverMetadata.contractAddress !== contractAddress) {
        trace.checks.rootCauseAnalysis.push(`CONTRACT_MISMATCH: Stored contract ${serverMetadata.contractAddress} != requested ${contractAddress}`);
      } else if (serverMetadata.tokenId?.toString() !== tokenId?.toString()) {
        trace.checks.rootCauseAnalysis.push(`TOKENID_MISMATCH: Stored token ${serverMetadata.tokenId} != requested ${tokenId}`);
      }
    } catch (error) {
      trace.checks.serverMetadata = {
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      };
      trace.checks.rootCauseAnalysis.push(`METADATA_ERROR: ${error}`);
    }

    // 5. IPFS Verification (if image exists and is not placeholder)
    debugLogger.operation("🔗 IPFS VERIFICATION ===========================================");
    if (trace.checks.serverMetadata?.data?.image && !trace.checks.serverMetadata.isPlaceholder) {
      try {
        const imageUrl = trace.checks.serverMetadata.data.image;
        let testUrl = imageUrl;
        
        if (imageUrl.startsWith('ipfs://')) {
          const cid = imageUrl.replace('ipfs://', '');
          testUrl = `https://nftstorage.link/ipfs/${cid}`;
        }

        debugLogger.operation(`🔍 Testing image accessibility`, { testUrl });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        trace.checks.ipfsVerification = {
          originalUrl: imageUrl,
          testUrl,
          accessible: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        };

        if (!response.ok) {
          trace.checks.rootCauseAnalysis.push(`IPFS_INACCESSIBLE: Image not accessible - ${response.status} at ${testUrl}`);
        }
      } catch (error) {
        trace.checks.ipfsVerification = {
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        };
        trace.checks.rootCauseAnalysis.push(`IPFS_ERROR: ${error}`);
      }
    }

    // 6. Check /tmp directory contents (development only)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const tmpDir = '/tmp/nft-metadata';
        const files = await fsPromises.readdir(tmpDir).catch(() => []);
        trace.checks.tmpFiles = files.map(file => ({
          name: file,
          path: path.join(tmpDir, file),
          isTarget: file === `${contractAddress.toLowerCase()}_${tokenId}.json`
        }));
      } catch (error) {
        trace.checks.tmpFiles = [];
      }

      // 7. Test file write permissions
      try {
        const testFile = '/tmp/test-write.json';
        await fsPromises.writeFile(testFile, JSON.stringify({ test: true }));
        await fsPromises.unlink(testFile);
        trace.checks.writePermissions = { status: 'success' };
      } catch (error) {
        trace.checks.writePermissions = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // 8. Generate Final Analysis
    const criticalIssues = trace.checks.rootCauseAnalysis.filter(issue => 
      issue.includes('METADATA_NOT_FOUND') || 
      issue.includes('PLACEHOLDER_STORED') ||
      issue.includes('CONTRACT_MISMATCH') ||
      issue.includes('TOKEN_NOT_EXISTS')
    );

    const analysis = {
      criticalIssues,
      systemHealth: {
        thirdwebConnection: trace.checks.thirdwebConnection?.status === 'success',
        contractValid: trace.checks.contractValidation?.status === 'success',
        tokenExists: trace.checks.tokenValidation?.status === 'success',
        metadataStored: trace.checks.serverMetadata?.found || false,
        imageAccessible: trace.checks.ipfsVerification?.accessible !== false
      },
      recommendations: criticalIssues.length > 0 ? [
        "Check the mint.ts API logs for the specific NFT creation process",
        "Verify contract addresses match between mint and lookup operations",
        "Test the image upload and IPFS storage process manually",
        "Check Redis/Upstash connection and verify data is being stored"
      ] : [
        "System appears healthy - check browser console for client-side issues"
      ]
    };

    debugLogger.operation('✅ Enhanced NFT Flow diagnostic complete');
    res.status(200).json({ trace, analysis });
  } catch (error) {
    console.error('❌ Enhanced NFT Flow diagnostic error:', error);
    res.status(500).json({ 
      error: 'Enhanced NFT Flow diagnostic failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Flow trace persistence and retrieval
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if this is an NFT metadata diagnostic request
  if (req.method === 'POST' && req.body.contractAddress && req.body.tokenId) {
    return handleNFTFlowDiagnostic(req, res);
  }
  
  // For production/Vercel compatibility, use in-memory storage with fallback
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, use simple in-memory storage (or integrate with your preferred DB)
    return handleInMemoryStorage(req, res);
  }
  
  // Development: use file system
  const logsDir = path.join(process.cwd(), 'logs');
  const tracesFile = path.join(logsDir, 'flow-traces.json');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  if (req.method === 'POST') {
    try {
      const { type, sessionId, step, trace } = req.body;

      let traces = [];
      if (fs.existsSync(tracesFile)) {
        const tracesData = fs.readFileSync(tracesFile, 'utf8');
        traces = JSON.parse(tracesData);
      }

      if (type === 'step') {
        // Add step to existing trace or create new one
        let existingTrace = traces.find(t => t.sessionId === sessionId);
        if (!existingTrace) {
          existingTrace = {
            sessionId,
            startTime: step.timestamp,
            steps: []
          };
          traces.push(existingTrace);
        }
        existingTrace.steps.push(step);
      } else if (type === 'complete') {
        // Update or add complete trace
        const existingIndex = traces.findIndex(t => t.sessionId === trace.sessionId);
        if (existingIndex >= 0) {
          traces[existingIndex] = trace;
        } else {
          traces.push(trace);
        }
      }

      // Keep only last 50 traces to prevent file bloat
      traces = traces.slice(-50);

      fs.writeFileSync(tracesFile, JSON.stringify(traces, null, 2));

      res.status(200).json({ success: true, message: 'Trace data saved' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to save trace', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else if (req.method === 'GET') {
    try {
      const { sessionId, latest } = req.query;

      if (!fs.existsSync(tracesFile)) {
        return res.status(200).json({ traces: [] });
      }

      const tracesData = fs.readFileSync(tracesFile, 'utf8');
      const traces = JSON.parse(tracesData);

      if (sessionId) {
        // Get specific trace
        const trace = traces.find(t => t.sessionId === sessionId);
        if (!trace) {
          return res.status(404).json({ error: 'Trace not found' });
        }
        
        // Generate flow analysis
        const analysis = analyzeTrace(trace);
        
        res.status(200).json({ trace, analysis });
      } else if (latest) {
        // Get latest trace
        const latestTrace = traces.slice(-1)[0];
        if (!latestTrace) {
          return res.status(200).json({ trace: null });
        }
        
        const analysis = analyzeTrace(latestTrace);
        res.status(200).json({ trace: latestTrace, analysis });
      } else {
        // Get all traces summary
        const summary = traces.map(trace => ({
          sessionId: trace.sessionId,
          userAddress: trace.userAddress,
          startTime: trace.startTime,
          endTime: trace.endTime,
          finalResult: trace.finalResult,
          stepCount: trace.steps.length,
          duration: trace.endTime ? 
            new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime() : null
        }));
        
        res.status(200).json({ 
          summary,
          totalTraces: traces.length,
          latestTrace: traces.slice(-1)[0]?.sessionId || null
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to read traces', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function analyzeTrace(trace: any) {
  const analysis = {
    summary: {
      totalSteps: trace.steps.length,
      duration: trace.endTime ? 
        new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime() : null,
      finalResult: trace.finalResult,
      userAddress: trace.userAddress
    },
    path: [],
    decisions: [],
    errors: [],
    criticalPoints: [],
    timeline: []
  };

  // Analyze each step
  trace.steps.forEach((step, index) => {
    // Build execution path
    if (step.component !== 'FLOW_TRACKER') {
      analysis.path.push(`${step.component}.${step.action}`);
    }

    // Track decisions
    if (step.decision) {
      analysis.decisions.push({
        step: index + 1,
        component: step.component,
        decision: step.decision,
        timestamp: step.timestamp,
        data: step.data
      });
    }

    // Track errors
    if (step.result === 'error') {
      analysis.errors.push({
        step: index + 1,
        component: step.component,
        action: step.action,
        error: step.error || step.data?.errorMessage,
        timestamp: step.timestamp
      });
    }

    // Identify critical points
    if (step.action.includes('GASLESS') || step.action.includes('MINT') || step.action.includes('FALLBACK')) {
      analysis.criticalPoints.push({
        step: index + 1,
        component: step.component,
        action: step.action,
        result: step.result,
        timestamp: step.timestamp
      });
    }

    // Build timeline
    analysis.timeline.push({
      step: index + 1,
      time: step.timestamp,
      component: step.component,
      action: step.action,
      result: step.result,
      duration: index > 0 ? 
        new Date(step.timestamp).getTime() - new Date(trace.steps[index - 1].timestamp).getTime() : 0
    });
  });

  // Unique execution path
  analysis.path = [...new Set(analysis.path)];

  return analysis;
}
// Export with debug authentication
export default withDebugAuth(handler);
