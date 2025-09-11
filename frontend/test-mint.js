// Test script for the new mint API
const testMintAPI = async () => {
  const testData = {
    to: "0x742d35Cc6634C0532925a3b8D7396d2A1ba6ddc4",
    amount: 50,
    referrer: "0x123456789abcdef123456789abcdef123456789a",
    metadata: {
      name: "Test CryptoGift",
      description: "Test NFT wallet creation",
      image: "https://example.com/test-image.jpg",
      attributes: [
        { trait_type: "Test", value: "true" }
      ]
    }
  };

  try {
    console.log('Testing mint API with data:', testData);
    
    const response = await fetch('http://localhost:3000/api/mint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Mint API test successful!');
      console.log('Response:', result);
      
      // Verify expected fields
      const expectedFields = ['tokenId', 'tbaAddress', 'shareUrl', 'qrCode', 'transactionHash'];
      expectedFields.forEach(field => {
        if (result[field]) {
          console.log(`✓ ${field}: ${result[field]}`);
        } else {
          console.log(`✗ Missing ${field}`);
        }
      });
      
      // Verify fee calculations
      if (result.fees) {
        console.log('Fee breakdown:', result.fees);
        console.log(`✓ Creation fee: ${result.fees.creation} (${(result.fees.creation / testData.amount * 100).toFixed(1)}%)`);
        console.log(`✓ Referral fee: ${result.fees.referral}`);
        console.log(`✓ Platform fee: ${result.fees.platform}`);
        console.log(`✓ Net amount: ${result.fees.net}`);
      }
    } else {
      console.log('❌ Mint API test failed');
      console.log('Error:', result);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
};

// Run the test
testMintAPI();