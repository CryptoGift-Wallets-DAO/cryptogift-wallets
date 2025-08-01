async function testIPFSGateways() {
  console.log("🌐 TESTING IPFS GATEWAYS ===========================================");
  console.log("📅 Timestamp:", new Date().toISOString());
  
  // Image from the working NFT
  const IMAGE_CID = "QmcSqtuDTRwKUaHG6btMbzd6au26NXuYZqEDTWh2tpaJJJ/cg-wallet-logo.png";
  
  // IPFS Gateways to test (in order of preference)
  const gateways = [
    { name: "NFT.Storage", url: `https://nftstorage.link/ipfs/${IMAGE_CID}` },
    { name: "IPFS.io", url: `https://ipfs.io/ipfs/${IMAGE_CID}` },
    { name: "Cloudflare", url: `https://cloudflare-ipfs.com/ipfs/${IMAGE_CID}` },
    { name: "Pinata", url: `https://gateway.pinata.cloud/ipfs/${IMAGE_CID}` },
    { name: "Dweb.link", url: `https://dweb.link/ipfs/${IMAGE_CID}` },
    { name: "4everland", url: `https://gateway.4everland.co/ipfs/${IMAGE_CID}` },
    { name: "Infura", url: `https://ipfs.infura.io/ipfs/${IMAGE_CID}` },
    { name: "Fleek", url: `https://ipfs.fleek.co/ipfs/${IMAGE_CID}` }
  ];
  
  console.log(`🎯 Testing image: ${IMAGE_CID}`);
  console.log(`📊 Testing ${gateways.length} gateways...\n`);
  
  const results = [];
  
  for (const gateway of gateways) {
    console.log(`🔍 Testing ${gateway.name}: ${gateway.url}`);
    
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(gateway.url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      const result = {
        name: gateway.name,
        url: gateway.url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        responseTime: `${responseTime}ms`,
        accessible: response.ok && response.status === 200
      };
      
      results.push(result);
      
      if (result.accessible) {
        console.log(`  ✅ SUCCESS: ${result.responseTime} - ${result.contentType} (${result.contentLength} bytes)`);
      } else {
        console.log(`  ❌ FAILED: ${result.status} ${result.statusText}`);
      }
      
    } catch (error) {
      const result = {
        name: gateway.name,
        url: gateway.url,
        error: error.message,
        accessible: false,
        responseTime: 'timeout/error'
      };
      
      results.push(result);
      console.log(`  ❌ ERROR: ${error.message}`);
    }
    
    console.log(""); // Empty line for readability
  }
  
  console.log("📊 SUMMARY ===========================================");
  
  const working = results.filter(r => r.accessible);
  const failed = results.filter(r => !r.accessible);
  
  console.log(`✅ Working gateways: ${working.length}/${results.length}`);
  console.log(`❌ Failed gateways: ${failed.length}/${results.length}`);
  
  if (working.length > 0) {
    console.log("\n🏆 WORKING GATEWAYS (sorted by speed):");
    working
      .sort((a, b) => parseInt(a.responseTime) - parseInt(b.responseTime))
      .forEach((gateway, index) => {
        console.log(`  ${index + 1}. ${gateway.name}: ${gateway.responseTime}`);
        console.log(`     📁 Size: ${gateway.contentLength} bytes`);
        console.log(`     🔗 URL: ${gateway.url}`);
        console.log("");
      });
  }
  
  if (failed.length > 0) {
    console.log("💥 FAILED GATEWAYS:");
    failed.forEach(gateway => {
      console.log(`  ❌ ${gateway.name}: ${gateway.error || `${gateway.status} ${gateway.statusText}`}`);
    });
  }
  
  console.log("\n🎯 RECOMMENDATIONS:");
  if (working.length > 0) {
    const fastest = working.sort((a, b) => parseInt(a.responseTime) - parseInt(b.responseTime))[0];
    console.log(`📈 Fastest: ${fastest.name} (${fastest.responseTime})`);
    console.log(`🔗 Best URL: ${fastest.url}`);
    
    console.log("\n🚀 For MetaMask compatibility, use these gateways in order:");
    working
      .sort((a, b) => parseInt(a.responseTime) - parseInt(b.responseTime))
      .slice(0, 3)
      .forEach((gateway, index) => {
        console.log(`  ${index + 1}. ${gateway.name}: ${gateway.url.replace(IMAGE_CID, '{CID}')}`);
      });
  } else {
    console.log("❌ No working gateways found - this is a serious issue!");
  }
  
  return results;
}

// Test IPFS image
testIPFSGateways()
  .then(results => {
    console.log("\n✅ Gateway test completed!");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Gateway test failed:", error);
    process.exit(1);
  });