const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

async function checkTokenURI() {
  console.log("🔍 CHECKING TOKEN URI FOR NFT CONTRACT");
  console.log("=====================================");
  
  // Contract details
  const contractAddress = "0x54314166B36E3Cc66cFb36265D99697f4F733231";
  const tokenId = 0;
  const chainName = "Base Sepolia";
  
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`🎫 Token ID: ${tokenId}`);
  console.log(`🌐 Network: ${chainName}`);
  console.log("");
  
  // Setup provider
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e"
  );
  
  // Minimal ERC721 ABI with tokenURI and other useful methods
  const nftABI = [
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function exists(uint256 tokenId) view returns (bool)",
    "function supportsInterface(bytes4 interfaceId) view returns (bool)"
  ];
  
  try {
    // 1. Verify contract exists
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ CONTRACT DOES NOT EXIST ON BLOCKCHAIN");
      return;
    }
    console.log("✅ Contract exists on blockchain");
    console.log(`📏 Code length: ${code.length} bytes`);
    console.log("");
    
    // 2. Create contract instance
    const contract = new ethers.Contract(contractAddress, nftABI, provider);
    
    // 3. Get basic contract info
    console.log("📋 CONTRACT INFORMATION");
    console.log("======================");
    try {
      const name = await contract.name();
      console.log(`📛 Name: ${name}`);
    } catch (error) {
      console.log(`❌ Name: ${error.message.split('\n')[0]}`);
    }
    
    try {
      const symbol = await contract.symbol();
      console.log(`🏷️  Symbol: ${symbol}`);
    } catch (error) {
      console.log(`❌ Symbol: ${error.message.split('\n')[0]}`);
    }
    
    try {
      const totalSupply = await contract.totalSupply();
      console.log(`📊 Total Supply: ${totalSupply.toString()}`);
    } catch (error) {
      console.log(`❌ Total Supply: ${error.message.split('\n')[0]}`);
    }
    
    // 4. Check if token exists and get owner
    console.log("");
    console.log(`🎫 TOKEN ${tokenId} VERIFICATION`);
    console.log("========================");
    
    try {
      const owner = await contract.ownerOf(tokenId);
      console.log(`✅ Token ${tokenId} exists`);
      console.log(`👤 Owner: ${owner}`);
    } catch (error) {
      console.log(`❌ Token ${tokenId} does not exist or error: ${error.message.split('\n')[0]}`);
      // If token doesn't exist, we can't get tokenURI
      return;
    }
    
    // 5. Get tokenURI
    console.log("");
    console.log(`🔗 TOKEN URI FOR TOKEN ${tokenId}`);
    console.log("==========================");
    
    try {
      const tokenURI = await contract.tokenURI(tokenId);
      console.log(`✅ Token URI: ${tokenURI}`);
      
      // 6. Try to fetch and verify metadata
      if (tokenURI) {
        console.log("");
        console.log("🌐 FETCHING METADATA");
        console.log("===================");
        await fetchAndVerifyMetadata(tokenURI);
      }
      
    } catch (error) {
      console.log(`❌ Failed to get token URI: ${error.message.split('\n')[0]}`);
      
      // Additional error details
      if (error.code) {
        console.log(`📋 Error code: ${error.code}`);
      }
      if (error.reason) {
        console.log(`📋 Error reason: ${error.reason}`);
      }
    }
    
    // 7. Check ERC721 compliance
    console.log("");
    console.log("🔍 ERC721 COMPLIANCE CHECK");
    console.log("=========================");
    
    const interfaces = [
      { name: "ERC165", id: "0x01ffc9a7" },
      { name: "ERC721", id: "0x80ac58cd" },
      { name: "ERC721Metadata", id: "0x5b5e139f" },
      { name: "ERC721Enumerable", id: "0x780e9d63" }
    ];
    
    for (const iface of interfaces) {
      try {
        const supported = await contract.supportsInterface(iface.id);
        console.log(`${supported ? '✅' : '❌'} ${iface.name}: ${supported}`);
      } catch (error) {
        console.log(`❌ ${iface.name}: Error checking interface`);
      }
    }
    
  } catch (error) {
    console.log(`💥 GENERAL ERROR: ${error.message}`);
    console.error(error);
  }
}

async function fetchAndVerifyMetadata(uri) {
  try {
    // Handle different URI schemes
    let fetchUrl = uri;
    
    if (uri.startsWith('ipfs://')) {
      const ipfsHash = uri.replace('ipfs://', '');
      fetchUrl = `https://nftstorage.link/ipfs/${ipfsHash}`;
      console.log(`🔄 Converting IPFS URI to HTTP: ${fetchUrl}`);
    }
    
    console.log(`🌐 Fetching metadata from: ${fetchUrl}`);
    
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const contentType = response.headers.get('content-type');
    console.log(`📄 Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const metadata = await response.json();
      console.log("✅ Successfully fetched JSON metadata:");
      console.log("");
      console.log("📋 METADATA CONTENT");
      console.log("==================");
      console.log(JSON.stringify(metadata, null, 2));
      
      // Verify standard NFT metadata fields
      console.log("");
      console.log("🔍 METADATA VALIDATION");
      console.log("=====================");
      
      const requiredFields = ['name', 'description'];
      const optionalFields = ['image', 'external_url', 'attributes'];
      
      requiredFields.forEach(field => {
        if (metadata[field]) {
          console.log(`✅ ${field}: Present`);
        } else {
          console.log(`❌ ${field}: Missing (required)`);
        }
      });
      
      optionalFields.forEach(field => {
        if (metadata[field]) {
          console.log(`✅ ${field}: Present`);
        } else {
          console.log(`⚠️  ${field}: Missing (optional)`);
        }
      });
      
      // Check image URL if present
      if (metadata.image) {
        console.log("");
        console.log("🖼️  IMAGE VERIFICATION");
        console.log("====================");
        await verifyImageUrl(metadata.image);
      }
      
    } else {
      const text = await response.text();
      console.log(`⚠️  Non-JSON response received:`);
      console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
    }
    
  } catch (error) {
    console.log(`❌ Error fetching metadata: ${error.message}`);
  }
}

async function verifyImageUrl(imageUrl) {
  try {
    let fetchUrl = imageUrl;
    
    if (imageUrl.startsWith('ipfs://')) {
      const ipfsHash = imageUrl.replace('ipfs://', '');
      fetchUrl = `https://nftstorage.link/ipfs/${ipfsHash}`;
      console.log(`🔄 Converting IPFS image URI to HTTP: ${fetchUrl}`);
    }
    
    console.log(`🖼️  Checking image at: ${fetchUrl}`);
    
    const response = await fetch(fetchUrl, { method: 'HEAD' });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      console.log(`✅ Image accessible`);
      console.log(`📄 Content-Type: ${contentType}`);
      if (contentLength) {
        console.log(`📏 Size: ${Math.round(contentLength / 1024)} KB`);
      }
      
      if (contentType && contentType.startsWith('image/')) {
        console.log(`✅ Valid image MIME type`);
      } else {
        console.log(`⚠️  Unexpected content type for image`);
      }
    } else {
      console.log(`❌ Image not accessible: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`❌ Error checking image: ${error.message}`);
  }
}

// Execute the check
if (require.main === module) {
  checkTokenURI()
    .then(() => {
      console.log("");
      console.log("🎯 TOKEN URI CHECK COMPLETED");
      console.log("===========================");
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}

module.exports = { checkTokenURI };