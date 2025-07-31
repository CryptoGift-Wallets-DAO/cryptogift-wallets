import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getNFTMetadata, resolveIPFSUrl } from "../../../lib/nftMetadataStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🔍 NFT API LOOKUP STARTED ===========================================");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔧 Method:", req.method);
  console.log("📋 Query params:", req.query);
  console.log("🌐 User Agent:", req.headers['user-agent']?.substring(0, 100));
  
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

    // Initialize ThirdWeb Client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
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
        
        // Convert IPFS URLs to gateway URLs with fallback strategy
        if (tokenURI.startsWith("ipfs://")) {
          const cid = tokenURI.replace("ipfs://", "");
          // Try multiple IPFS gateways for better reliability
          const gateways = [
            `https://nftstorage.link/ipfs/${cid}`,
            `https://ipfs.io/ipfs/${cid}`,
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            `https://cloudflare-ipfs.com/ipfs/${cid}`,
            `https://dweb.link/ipfs/${cid}`
          ];
          
          for (const gateway of gateways) {
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
                  
                  // Process image URL to ensure it's accessible
                  let processedImageUrl = metadata.image;
                  if (processedImageUrl && processedImageUrl.startsWith("ipfs://")) {
                    const imageCid = processedImageUrl.replace("ipfs://", "");
                    processedImageUrl = `https://nftstorage.link/ipfs/${imageCid}`;
                    console.log("🔄 CONVERTED image URL:", processedImageUrl);
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
      
      // CRITICAL: Check what image we're actually using
      const originalImage = storedMetadata.image;
      const resolvedImageUrl = resolveIPFSUrl(storedMetadata.image);
      
      console.log("🔗 IMAGE RESOLUTION DEBUG:", {
        originalImageField: originalImage,
        isIPFSFormat: originalImage?.startsWith('ipfs://'),
        isPlaceholder: originalImage?.includes('placeholder'),
        resolvedImageUrl: resolvedImageUrl,
        ipfsCid: storedMetadata.imageIpfsCid
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
        image: resolvedImageUrl,
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
      console.log("🔍 Next steps: Check /api/debug/image-trace or mint logs");
      
      // Fallback with enhanced debugging info
      nft = {
        id: tokenId,
        name: `CryptoGift NFT-Wallet #${tokenId}`,
        description: "Un regalo cripto único con wallet integrada ERC-6551. NOTA: Metadata no encontrada en almacenamiento, usando valores por defecto.",
        image: "/images/cg-wallet-placeholder.png", // This is the FALLBACK placeholder
        attributes: [
          {
            trait_type: "Initial Balance",
            value: "0 USDC"
          },
          {
            trait_type: "Filter",
            value: "Original"
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
            value: "Metadata not found in storage - check mint process"
          }
        ]
      };
      
      console.log("🚨 DEBUG: Using placeholder because no metadata was stored during mint");
      console.log("🔍 This suggests the problem is in the mint process, not display");
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
          
          // Handle image URLs
          let imageUrl = metadata.image || nft.image;
          if (imageUrl && imageUrl.startsWith("ipfs://")) {
            imageUrl = imageUrl.replace("ipfs://", "https://nftstorage.link/ipfs/");
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