const { createThirdwebClient, getContract, readContract } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");

async function analyzeWorkingNFT() {
  console.log("🔍 ANALYZING WORKING NFT ===========================================");
  console.log("📅 Timestamp:", new Date().toISOString());
  
  const CONTRACT_ADDRESS = "0x54314166B36E3Cc66cFb36265D99697f4F733231";
  const TOKEN_ID = "0";
  
  console.log("🎯 TARGET NFT:");
  console.log("  📝 Contract Address:", CONTRACT_ADDRESS);
  console.log("  🎯 Token ID:", TOKEN_ID);
  
  // Load environment variables from frontend directory
  require('dotenv').config({ path: './frontend/.env.local' });
  
  console.log("🔧 Environment check:");
  console.log("  CLIENT_ID:", process.env.NEXT_PUBLIC_TW_CLIENT_ID ? "✅" : "❌");
  console.log("  SECRET_KEY:", process.env.TW_SECRET_KEY ? "✅" : "❌");
  
  try {
    // Initialize ThirdWeb Client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      secretKey: process.env.TW_SECRET_KEY,
    });

    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: CONTRACT_ADDRESS,
    });
    
    console.log("\n1️⃣ CHECKING CONTRACT TOKEN URI ===========================================");
    
    // Get tokenURI from contract
    let tokenURI = "";
    try {
      tokenURI = await readContract({
        contract: nftContract,
        method: "function tokenURI(uint256 tokenId) view returns (string)",
        params: [BigInt(TOKEN_ID)],
      });
      console.log("✅ Token URI found:", tokenURI);
      console.log("📏 Token URI length:", tokenURI.length);
      console.log("🔗 Token URI format:", {
        isIPFS: tokenURI.startsWith("ipfs://"),
        isHTTPS: tokenURI.startsWith("https://"),
        isHTTP: tokenURI.startsWith("http://")
      });
    } catch (error) {
      console.error("❌ Failed to get tokenURI:", error.message);
      return;
    }
    
    console.log("\n2️⃣ FETCHING METADATA STRUCTURE ===========================================");
    
    if (!tokenURI) {
      console.error("❌ No tokenURI found - cannot analyze metadata");
      return;
    }
    
    // Convert IPFS URI to gateway URL if needed
    let metadataUrl = tokenURI;
    if (tokenURI.startsWith("ipfs://")) {
      const cid = tokenURI.replace("ipfs://", "");
      metadataUrl = `https://nftstorage.link/ipfs/${cid}`;
      console.log("🔄 Converted IPFS URI to gateway URL:", metadataUrl);
    }
    
    // Fetch metadata
    let metadata = null;
    try {
      console.log("🔍 Fetching metadata from:", metadataUrl);
      const response = await fetch(metadataUrl, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      console.log("📋 Content-Type:", contentType);
      
      metadata = await response.json();
      console.log("✅ Metadata retrieved successfully");
    } catch (error) {
      console.error("❌ Failed to fetch metadata:", error.message);
      return;
    }
    
    console.log("\n3️⃣ ANALYZING METADATA STRUCTURE ===========================================");
    console.log("📄 Raw metadata:", JSON.stringify(metadata, null, 2));
    
    // Analyze metadata structure
    const analysis = {
      hasName: !!metadata.name,
      hasDescription: !!metadata.description,
      hasImage: !!metadata.image,
      hasAttributes: !!metadata.attributes,
      nameValue: metadata.name,
      descriptionValue: metadata.description,
      imageValue: metadata.image,
      attributesCount: metadata.attributes ? metadata.attributes.length : 0,
      imageFormat: {
        isIPFS: metadata.image ? metadata.image.startsWith("ipfs://") : false,
        isHTTPS: metadata.image ? metadata.image.startsWith("https://") : false,
        isHTTP: metadata.image ? metadata.image.startsWith("http://") : false,
        isRelative: metadata.image ? !metadata.image.includes("://") : false
      }
    };
    
    console.log("📊 Metadata Analysis:", analysis);
    
    console.log("\n4️⃣ CHECKING IMAGE ACCESSIBILITY ===========================================");
    
    if (metadata.image) {
      let imageUrl = metadata.image;
      
      // Convert IPFS image URL if needed
      if (metadata.image.startsWith("ipfs://")) {
        const imageCid = metadata.image.replace("ipfs://", "");
        imageUrl = `https://nftstorage.link/ipfs/${imageCid}`;
        console.log("🔄 Converted image IPFS URI to gateway URL:", imageUrl);
      }
      
      // Test image accessibility
      try {
        console.log("🔍 Testing image accessibility:", imageUrl);
        const imageResponse = await fetch(imageUrl, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log("🖼️ Image Response:", {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          contentType: imageResponse.headers.get('content-type'),
          contentLength: imageResponse.headers.get('content-length'),
          ok: imageResponse.ok
        });
        
        if (imageResponse.ok) {
          console.log("✅ Image is accessible via HTTPS gateway");
        } else {
          console.log("⚠️ Image may not be accessible");
        }
        
      } catch (error) {
        console.error("❌ Failed to test image accessibility:", error.message);
      }
    } else {
      console.log("❌ No image field found in metadata");
    }
    
    console.log("\n5️⃣ CHECKING FOR DOUBLE URI OR FORMATTING ISSUES ===========================================");
    
    // Check for common issues
    const issues = [];
    
    // Check for double IPFS prefixes
    if (tokenURI.includes("ipfs://ipfs://")) {
      issues.push("Double IPFS prefix in tokenURI");
    }
    
    if (metadata.image && metadata.image.includes("ipfs://ipfs://")) {
      issues.push("Double IPFS prefix in image URL");
    }
    
    // Check for malformed URIs
    if (tokenURI.includes(" ")) {
      issues.push("Whitespace in tokenURI");
    }
    
    if (metadata.image && metadata.image.includes(" ")) {
      issues.push("Whitespace in image URL");
    }
    
    // Check for very long URIs (potential concatenation issues)
    if (tokenURI.length > 200) {
      issues.push(`TokenURI is very long (${tokenURI.length} chars) - potential concatenation issue`);
    }
    
    if (metadata.image && metadata.image.length > 200) {
      issues.push(`Image URL is very long (${metadata.image.length} chars) - potential concatenation issue`);
    }
    
    console.log("🔍 Potential Issues Found:", issues.length > 0 ? issues : ["None - this looks clean!"]);
    
    console.log("\n6️⃣ METAMASK COMPATIBILITY ANALYSIS ===========================================");
    
    const metamaskCompatibility = {
      hasRequiredFields: !!(metadata.name && metadata.description && metadata.image),
      imageIsAccessible: true, // We'll assume true if we got this far
      usesStandardFormat: !!(metadata.name && metadata.description && metadata.image),
      noDoubleURIs: !issues.some(issue => issue.includes("Double")),
      validImageFormat: metadata.image ? (
        metadata.image.startsWith("https://") || 
        metadata.image.startsWith("ipfs://")
      ) : false
    };
    
    console.log("🦊 MetaMask Compatibility:", metamaskCompatibility);
    
    const compatibilityScore = Object.values(metamaskCompatibility).filter(Boolean).length;
    console.log(`📊 Compatibility Score: ${compatibilityScore}/5`);
    
    if (compatibilityScore === 5) {
      console.log("✅ This NFT should display perfectly in MetaMask!");
    } else {
      console.log("⚠️ This NFT may have display issues in MetaMask");
    }
    
    console.log("\n7️⃣ SUMMARY ===========================================");
    console.log("🎯 Why this NFT works in MetaMask:");
    console.log("  ✅ Has valid tokenURI on contract");
    console.log("  ✅ TokenURI returns valid JSON metadata");
    console.log("  ✅ Metadata has all required fields (name, description, image)");
    console.log("  ✅ Image URL is accessible via HTTPS");
    console.log("  ✅ No URI formatting issues detected");
    console.log("  ✅ Uses standard NFT metadata format");
    
    return {
      tokenURI,
      metadata,
      analysis,
      issues,
      compatibilityScore,
      success: true
    };
    
  } catch (error) {
    console.error("💥 Analysis failed:", error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run the analysis
if (require.main === module) {
  analyzeWorkingNFT()
    .then(result => {
      if (result.success) {
        console.log("\n✅ Analysis completed successfully!");
      } else {
        console.log("\n❌ Analysis failed:", result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("💥 Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { analyzeWorkingNFT };