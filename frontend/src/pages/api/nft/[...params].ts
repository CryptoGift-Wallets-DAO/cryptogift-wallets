import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getNFTMetadata, resolveIPFSUrl } from "../../../lib/nftMetadataStore";
import { getBestGatewayForCid, normalizeCidPath } from "../../../utils/ipfs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🔍 NFT API LOOKUP STARTED ===========================================");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔧 Method:", req.method);
  console.log("📋 Query params:", req.query);
  console.log("🌍 Origin:", req.headers.origin || 'None');
  
  if (req.method !== 'GET') {
    console.error("❌ Invalid method:", req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { params } = req.query;
    console.log("📝 Raw params:", params);
    
    if (!Array.isArray(params) || params.length !== 2) {
      console.error("❌ Invalid parameters format:", { 
        isArray: Array.isArray(params), 
        length: params?.length,
        params 
      });
      return res.status(400).json({ 
        error: 'Invalid parameters. Expected: [contractAddress, tokenId]' 
      });
    }

    const [contractAddress, tokenId] = params;
    console.log("🎯 PARSED PARAMETERS:");
    console.log("  📝 Contract Address:", contractAddress);
    console.log("  🎯 Token ID:", tokenId);
    console.log("  📏 Contract length:", contractAddress?.length);
    console.log("  📊 Token ID type:", typeof tokenId);

    // Initialize ThirdWeb Client with proper validation
    const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
    const secretKey = process.env.TW_SECRET_KEY;

    if (!clientId) {
      console.error('❌ TW_CLIENT_ID not configured');
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable - ThirdWeb client not configured'
      });
    }

    // Create client - secretKey is optional for read-only operations
    const client = createThirdwebClient({
      clientId: clientId,
      ...(secretKey && { secretKey }) // Only include if available
    });

    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress,
    });
    
    // REAL IMPLEMENTATION: Get actual NFT data
    
    // Try to read token URI from contract (if it's a real NFT contract)
    let tokenURI = "";
    let owner = "0x0000000000000000000000000000000000000000";
    
    try {
      // Try reading tokenURI from contract first
      tokenURI = await readContract({
        contract: nftContract,
        method: "function tokenURI(uint256 tokenId) view returns (string)",
        params: [BigInt(tokenId)],
      });
      console.log("✅ Token URI found on contract:", tokenURI);
      
      // ENHANCED: If we got a tokenURI, try to fetch the metadata/image directly from IPFS
      if (tokenURI) {
        let ipfsUrl = tokenURI;
        
        // 🔥 CANONICAL FIX: Use getBestGatewayForCid with fallback gateways
        if (tokenURI.startsWith("ipfs://")) {
          console.log('🎯 CANONICAL: Using getBestGatewayForCid for tokenURI');
          const bestGateway = await getBestGatewayForCid(tokenURI, 8000);

          // CRITICAL FIX: Always try gateways, even if getBestGatewayForCid fails
          let gatewaysToTry: string[] = [];

          if (bestGateway) {
            gatewaysToTry = [bestGateway.url];
            console.log(`✅ CANONICAL: Using best gateway ${bestGateway.gateway}: ${bestGateway.url}`);
          } else {
            // FALLBACK: Use default gateways when getBestGatewayForCid fails
            console.log('⚠️ CANONICAL: No working gateway found, using fallback gateways');
            // CRITICAL FIX: Use normalizeCidPath to handle legacy formats like ipfs://ipfs/...
            const cid = normalizeCidPath(tokenURI.replace('ipfs://', ''));
            gatewaysToTry = [
              `https://ipfs.io/ipfs/${cid}`,
              `https://cloudflare-ipfs.com/ipfs/${cid}`,
              `https://gateway.pinata.cloud/ipfs/${cid}`,
              `https://nftstorage.link/ipfs/${cid}`
            ];
          }

          for (const gateway of gatewaysToTry) {
            try {
              console.log(`🔍 CACHE BYPASS: Trying IPFS gateway: ${gateway}`);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout
              
              const ipfsResponse = await fetch(gateway, { 
                signal: controller.signal,
                headers: { 
                  'Accept': 'application/json, image/*',
                  'Cache-Control': 'no-cache, no-store, must-revalidate', // FORCE NO CACHE
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              });
              
              clearTimeout(timeoutId);
              
              if (ipfsResponse.ok) {
                const contentType = ipfsResponse.headers.get('content-type');
                console.log(`🔍 IPFS Content-Type: ${contentType}`);
                
                // Check if it's an image file (direct NFT image)
                if (contentType && contentType.startsWith('image/')) {
                  console.log("🖼️ DIRECT IMAGE: TokenURI points to image file, creating metadata");
                  
                  // Calculate TBA address
                  const { ethers } = await import("ethers");
                  const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS || "0x000000006551c19487814612e58FE06813775758";
                  const IMPLEMENTATION_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS || "0x2d25602551487c3f3354dd80d76d54383a243358";
                  const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
                  
                  const salt = ethers.solidityPackedKeccak256(
                    ['uint256', 'address', 'uint256'],
                    [CHAIN_ID, contractAddress, tokenId]
                  );
                  
                  const packed = ethers.solidityPacked(
                    ['bytes1', 'address', 'bytes32', 'address', 'bytes32'],
                    [
                      '0xff',
                      REGISTRY_ADDRESS,
                      salt,
                      IMPLEMENTATION_ADDRESS,
                      '0x0000000000000000000000000000000000000000000000000000000000000000'
                    ]
                  );
                  
                  const hash = ethers.keccak256(packed);
                  const tbaAddress = ethers.getAddress('0x' + hash.slice(-40));
                  
                  // Return metadata for direct image NFT
                  return res.status(200).json({
                    success: true,
                    id: tokenId,
                    name: `CryptoGift NFT-Wallet #${tokenId}`,
                    description: "Un regalo cripto único con wallet integrada ERC-6551",
                    image: gateway, // Use the working gateway URL
                    attributes: [
                      {
                        trait_type: "Wallet Type",
                        value: "ERC-6551 Token Bound Account"
                      },
                      {
                        trait_type: "Network", 
                        value: "Base Sepolia"
                      },
                      {
                        trait_type: "Content Type",
                        value: contentType
                      }
                    ],
                    tokenId: tokenId, // Keep as string
                    contractAddress,
                    owner,
                    tbaAddress,
                    tbaBalance: "0",
                    tbaDeployed: false,
                    network: "Base Sepolia",
                    chainId: 84532,
                    source: 'direct_image_ipfs',
                    gateway: gateway
                  });
                }
                
                // Try to parse as JSON metadata
                try {
                  const metadata = await ipfsResponse.json();
                  console.log("✅ DIRECT IPFS: Retrieved JSON metadata:", metadata);
                  console.log("🖼️ DIRECT IPFS: Image field:", metadata.image);
                  
                  // 🔥 CANONICAL FIX: Use getBestGatewayForCid with fallback for image URL
                  let processedImageUrl = metadata.image;
                  if (processedImageUrl && processedImageUrl.startsWith("ipfs://")) {
                    console.log('🎯 CANONICAL: Processing image URL from IPFS');
                    const bestImageGateway = await getBestGatewayForCid(processedImageUrl, 6000);
                    if (bestImageGateway) {
                      processedImageUrl = bestImageGateway.url;
                      console.log(`✅ CANONICAL: Using best gateway ${bestImageGateway.gateway} for image`);
                    } else {
                      // FALLBACK: Use default gateway for image WITH NORMALIZATION
                      console.log('⚠️ CANONICAL: No working gateway, using ipfs.io fallback with normalization');
                      // CRITICAL FIX: Normalize the CID path to handle ipfs://ipfs/... formats
                      const normalizedCid = normalizeCidPath(processedImageUrl.replace('ipfs://', ''));
                      processedImageUrl = `https://ipfs.io/ipfs/${normalizedCid}`;
                      console.log('🔧 Normalized fallback URL:', processedImageUrl.substring(0, 80) + '...');
                    }
                  }

                  // ALWAYS clean up malformed URLs regardless of previous conditions
                  if (processedImageUrl && processedImageUrl.includes('ipfs/ipfs/')) {
                    console.log('🔧 Additional cleanup for malformed IPFS URL:', processedImageUrl);
                    processedImageUrl = processedImageUrl.replace(/ipfs\/ipfs\//g, 'ipfs/');
                  }
                  
                  // Calculate TBA address for completeness
                  const { ethers } = await import("ethers");
                  const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS || "0x000000006551c19487814612e58FE06813775758";
                  const IMPLEMENTATION_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS || "0x2d25602551487c3f3354dd80d76d54383a243358";
                  const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
                  
                  const salt = ethers.solidityPackedKeccak256(
                    ['uint256', 'address', 'uint256'],
                    [CHAIN_ID, contractAddress, tokenId]
                  );
                  
                  const packed = ethers.solidityPacked(
                    ['bytes1', 'address', 'bytes32', 'address', 'bytes32'],
                    [
                      '0xff',
                      REGISTRY_ADDRESS,
                      salt,
                      IMPLEMENTATION_ADDRESS,
                      '0x0000000000000000000000000000000000000000000000000000000000000000'
                    ]
                  );
                  
                  const hash = ethers.keccak256(packed);
                  const tbaAddress = ethers.getAddress('0x' + hash.slice(-40));
                  
                  // Return the real metadata with processed image URL
                  return res.status(200).json({
                    success: true,
                    id: tokenId,
                    name: metadata.name,
                    description: metadata.description,
                    image: processedImageUrl,
                    attributes: metadata.attributes || [],
                    tokenId: tokenId, // Keep as string
                    contractAddress,
                    owner,
                    tbaAddress,
                    tbaBalance: "0",
                    tbaDeployed: false,
                    network: "Base Sepolia",
                    chainId: 84532,
                    source: 'direct_ipfs_metadata',
                    gateway: gateway
                  });
                } catch (jsonError) {
                  console.log(`⚠️ Not JSON metadata, content-type: ${contentType}`);
                  continue; // Try next gateway
                }
              }
            } catch (gatewayError) {
              console.log(`⚠️ Gateway ${gateway} failed:`, gatewayError.message);
              continue; // Try next gateway
            }
          }
        }
      }
    } catch (tokenURIError) {
      console.log("⚠️ No tokenURI found on contract, checking stored metadata");
      console.log("Contract:", contractAddress, "TokenId:", tokenId);
    }
    
    // Try to read owner
    try {
      owner = await readContract({
        contract: nftContract,
        method: "function ownerOf(uint256 tokenId) view returns (address)",
        params: [BigInt(tokenId)],
      });
      console.log("✅ Owner found:", owner);
    } catch (ownerError) {
      console.log("⚠️ No owner found, using deployer");
      owner = process.env.WALLET_ADDRESS || "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a";
    }

    // CRITICAL FIX: Add runtime cache toggle via environment variable
    const disableCache = process.env.DISABLE_METADATA_CACHE === 'true';
    let nft;
    let storedMetadata = null;
    
    console.log("💾 METADATA LOOKUP ===========================================");
    console.log("🔧 Cache disabled:", disableCache ? "YES" : "NO");
    console.log("🔍 SEARCHING FOR STORED METADATA:");
    console.log("  📝 Contract Address:", contractAddress);
    console.log("  🎯 Token ID:", tokenId);
    console.log("  📊 Contract type:", typeof contractAddress);
    console.log("  📊 TokenID type:", typeof tokenId);
    console.log("  📏 Contract length:", contractAddress?.length);
    console.log("  🏗️ Expected format: 0x[40 chars]");
    
    if (!disableCache) {
      // Normal metadata lookup from storage
      console.log("🔍 Calling getNFTMetadata...");
      storedMetadata = await getNFTMetadata(contractAddress, tokenId);
    } else {
      console.log("⚠️ CACHE DISABLED: Skipping metadata lookup via DISABLE_METADATA_CACHE env var");
    }
    console.log("📊 Metadata lookup result:", {
      found: !!storedMetadata,
      hasImage: !!(storedMetadata?.image),
      hasImageCid: !!(storedMetadata?.imageIpfsCid),
      contractMatches: storedMetadata?.contractAddress === contractAddress,
      tokenIdMatches: storedMetadata?.tokenId === tokenId
    });
    
    console.log("🔍 CRITICAL DEBUG: Redis lookup result:", {
      found: !!storedMetadata,
      hasImage: !!(storedMetadata?.image),
      hasImageCid: !!(storedMetadata?.imageIpfsCid),
      storedImageValue: storedMetadata?.image,
      storedImageCidValue: storedMetadata?.imageIpfsCid
    });
    
    if (storedMetadata) {
      console.log("✅ FOUND STORED METADATA!");
      console.log("📄 Complete stored metadata:", JSON.stringify(storedMetadata, null, 2));
      
      // 🔥 CANONICAL FIX: Use getBestGatewayForCid instead of resolveIPFSUrl for stored metadata
      const originalImage = storedMetadata.image;
      let finalImageUrl = originalImage;
      
      console.log("🔗 IMAGE RESOLUTION DEBUG - BEFORE:", {
        originalImageField: originalImage,
        isIPFSFormat: originalImage?.startsWith('ipfs://'),
        isPlaceholder: originalImage?.includes('placeholder'),
        ipfsCid: storedMetadata.imageIpfsCid
      });
      
      // If stored image is in ipfs:// format, use canonical gateway resolution
      if (originalImage?.startsWith('ipfs://')) {
        console.log('🎯 CANONICAL: Stored image is ipfs://, using getBestGatewayForCid');
        const bestImageGateway = await getBestGatewayForCid(originalImage, 6000);
        if (bestImageGateway) {
          finalImageUrl = bestImageGateway.url;
          console.log(`✅ CANONICAL: Using best gateway ${bestImageGateway.gateway} for stored image: ${finalImageUrl}`);
        } else {
          console.log('⚠️ CANONICAL: No working gateway found for stored image, using resolveIPFSUrl fallback');
          finalImageUrl = resolveIPFSUrl(originalImage);
        }
      } else if (originalImage?.startsWith('https://')) {
        // If it's already HTTPS, check if it contains IPFS path and convert to canonical
        if (originalImage.includes('/ipfs/')) {
          console.log('🔄 CANONICAL: Stored image is HTTPS IPFS, extracting to ipfs:// format');
          const ipfsMatch = originalImage.match(/\/ipfs\/([^\/\?#]+.*?)(?:\?|#|$)/);
          if (ipfsMatch) {
            const cidPath = ipfsMatch[1];
            const ipfsFormat = `ipfs://${cidPath}`;
            console.log('✅ CANONICAL: Extracted ipfs:// format:', ipfsFormat);
            
            const bestImageGateway = await getBestGatewayForCid(ipfsFormat, 6000);
            if (bestImageGateway) {
              finalImageUrl = bestImageGateway.url;
              console.log(`✅ CANONICAL: Using best gateway ${bestImageGateway.gateway} for converted image: ${finalImageUrl}`);
            } else {
              console.log('⚠️ CANONICAL: No working gateway found for converted image, keeping original');
              finalImageUrl = originalImage;
            }
          }
        }
      }
      
      console.log("🔗 IMAGE RESOLUTION DEBUG - AFTER:", {
        originalImageField: originalImage?.substring(0, 60) + '...',
        finalImageUrl: finalImageUrl?.substring(0, 60) + '...',
        gatewayChanged: originalImage !== finalImageUrl
      });
      
      // CRITICAL: Detect if we're accidentally serving placeholder from stored metadata
      if (originalImage?.includes('placeholder')) {
        console.log("🚨 CRITICAL ISSUE: Placeholder was stored in metadata!");
        console.log("🚨 This means the problem is in the mint process, not display");
      }
      
      nft = {
        id: tokenId,
        name: storedMetadata.name,
        description: storedMetadata.description,
        image: finalImageUrl, // 🔥 CANONICAL FIX: Use canonical gateway URL
        attributes: storedMetadata.attributes || []
      };
    } else {
      console.log("❌ CRITICAL: No stored metadata found!");
      console.log("📂 Search details:", { 
        searchContract: contractAddress, 
        searchTokenId: tokenId,
        contractLength: contractAddress?.length,
        tokenIdLength: tokenId?.toString().length
      });
      console.log("🚨 ROOT CAUSE: Metadata was never stored during mint OR lookup is failing");
      console.log("🔍 SURGICAL FIX: Using comprehensive fallback system instead of placeholder");
      
      // 🔥 SURGICAL FIX: Instead of placeholder, use comprehensive fallback system
      try {
        const { getNFTMetadataWithFallback } = await import('../../../lib/nftMetadataFallback');
        const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cryptogift-wallets.vercel.app';
        
        console.log("🔄 Attempting comprehensive fallback chain: Redis → on-chain → IPFS → placeholder");
        const fallbackResult = await getNFTMetadataWithFallback({
          contractAddress,
          tokenId,
          publicBaseUrl,
          timeout: 8000
        });
        
        if (fallbackResult.metadata && !fallbackResult.metadata.image.includes('placeholder')) {
          console.log(`✅ FALLBACK SUCCESS: Retrieved real metadata via ${fallbackResult.source} (${fallbackResult.latency}ms)`);
          nft = {
            id: tokenId,
            name: fallbackResult.metadata.name,
            description: fallbackResult.metadata.description,
            image: fallbackResult.metadata.image,
            attributes: fallbackResult.metadata.attributes || [],
            tbaAddress: owner, // Keep TBA integration
            success: true,
            source: `fallback_${fallbackResult.source}`,
            latency: fallbackResult.latency
          };
        } else {
          throw new Error('Fallback also returned placeholder');
        }
      } catch (fallbackError) {
        console.warn("⚠️ Comprehensive fallback failed:", fallbackError.message);
        // Only now use placeholder as final resort
        nft = {
          id: tokenId,
          name: `CryptoGift NFT-Wallet #${tokenId}`,
          description: "Un regalo cripto único con wallet integrada ERC-6551. NOTA: Metadata no encontrada en almacenamiento, usando valores por defecto.",
          image: "/images/cg-wallet-placeholder.png",
          attributes: [
            {
              trait_type: "Initial Balance",
              value: "0 USDC"
            },
            {
              trait_type: "Wallet Type",
              value: "ERC-6551 Token Bound Account"
            },
            {
              trait_type: "Network",
              value: "Base Sepolia"
            },
            {
              trait_type: "Debug Info",
              value: "All fallback methods exhausted - using final placeholder"
            }
          ]
        };
        console.log("🚨 FINAL RESORT: Using placeholder after all fallback methods failed");
      }
    }

    // If we have a tokenURI, try to fetch metadata
    if (tokenURI && (tokenURI.startsWith("https://") || tokenURI.startsWith("http://"))) {
      try {
        console.log("🔍 Fetching metadata from:", tokenURI);
        // Create controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const metadataResponse = await fetch(tokenURI, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          console.log("✅ Raw metadata from IPFS:", metadata);
          
          // 🔥 CANONICAL FIX: Use getBestGatewayForCid for image URL handling
          let imageUrl = metadata.image || nft.image;
          if (imageUrl && imageUrl.startsWith("ipfs://")) {
            console.log('🎯 CANONICAL: Using getBestGatewayForCid for final image URL');
            const bestImageGateway = await getBestGatewayForCid(imageUrl, 6000);
            if (bestImageGateway) {
              imageUrl = bestImageGateway.url;
              console.log(`✅ CANONICAL: Using best gateway ${bestImageGateway.gateway} for final image: ${imageUrl}`);
            } else {
              console.log('⚠️ CANONICAL: No working gateway found for final image, keeping original');
            }
          }
          
          nft = {
            id: tokenId,
            name: metadata.name || nft.name,
            description: metadata.description || nft.description,
            image: imageUrl,
            attributes: metadata.attributes || nft.attributes
          };
          console.log("✅ Processed NFT data:", { name: nft.name, image: nft.image });
        }
      } catch (metadataError) {
        console.log("⚠️ Failed to load metadata from IPFS:", metadataError instanceof Error ? metadataError.message : 'Unknown error');
        console.log("Using defaults for token", tokenId);
      }
    }
    
    // Calculate REAL TBA address using ERC-6551 standard
    const { ethers } = await import("ethers");
    const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS || "0x000000006551c19487814612e58FE06813775758";
    const IMPLEMENTATION_ADDRESS = process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS || "0x2d25602551487c3f3354dd80d76d54383a243358";
    const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532"); // Base Sepolia
    
    const salt = ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'uint256'],
      [CHAIN_ID, contractAddress, tokenId]
    );
    
    const packed = ethers.solidityPacked(
      ['bytes1', 'address', 'bytes32', 'address', 'bytes32'],
      [
        '0xff',
        REGISTRY_ADDRESS,
        salt,
        IMPLEMENTATION_ADDRESS,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ]
    );
    
    const hash = ethers.keccak256(packed);
    const tbaAddress = ethers.getAddress('0x' + hash.slice(-40));
    
    console.log(`✅ Real TBA address calculated: ${tbaAddress}`);
    
    // Check TBA balance (simplified for now)
    const balance = "0";
    const isDeployed = false;

    // Return the NFT data directly (not nested under 'nft')
    // CRITICAL FIX: Keep tokenId as string to prevent exponential notation
    res.status(200).json({
      success: true,
      ...nft,
      owner,
      tbaAddress,
      tbaBalance: balance,
      tbaDeployed: isDeployed,
      contractAddress,
      tokenId: tokenId, // Keep as string - no parseInt()
      network: "Base Sepolia",
      chainId: 84532,
    });

  } catch (error) {
    console.error('NFT API error:', error);
    res.status(500).json({
      error: 'Failed to get NFT data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}