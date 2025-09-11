/**
 * SEVEN DAY NFT DEBUG TEST
 * Specific test to identify why 7-day NFTs don't appear in MetaMask
 */

import { TIMEFRAME_OPTIONS } from '../lib/escrowUtils';

describe('Seven Day NFT Debug', () => {
  test('should map SEVEN_DAYS timeframe correctly', () => {
    console.log('🔍 TIMEFRAME_OPTIONS:', TIMEFRAME_OPTIONS);
    
    // Test the mapping that happens in mint-escrow.ts
    const timeframeDays = 'SEVEN_DAYS';
    const timeframeIndex = TIMEFRAME_OPTIONS[timeframeDays as keyof typeof TIMEFRAME_OPTIONS];
    
    console.log('📋 Input timeframeDays:', timeframeDays);
    console.log('📋 Mapped timeframeIndex:', timeframeIndex);
    
    expect(timeframeIndex).toBe(1);
    
    // Test the constants mapping
    const timeConstantsMap = {
      [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 'FIFTEEN_MINUTES',
      [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 'SEVEN_DAYS', 
      [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 'FIFTEEN_DAYS',
      [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 'THIRTY_DAYS'
    };
    
    console.log('📋 timeConstantsMap:', timeConstantsMap);
    console.log('📋 timeConstantsMap[1] (SEVEN_DAYS):', timeConstantsMap[1]);
    
    expect(timeConstantsMap[timeframeIndex]).toBe('SEVEN_DAYS');
    
    // Test the time calculation
    const timeConstants = {
      [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 900,
      [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 604800,
      [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 1296000,
      [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 2592000
    };
    
    console.log('📋 timeConstants[1] (7 days in seconds):', timeConstants[timeframeIndex]);
    expect(timeConstants[timeframeIndex]).toBe(604800); // 7 days = 604800 seconds
  });
  
  test('should create correct metadata structure for 7-day NFT', () => {
    // Simulate the metadata creation for a 7-day NFT
    const mockMetadata = {
      name: 'CryptoGift NFT #123',
      description: 'Test 7-day NFT',
      image: 'ipfs://QmTestImageCid',
      attributes: [
        { trait_type: "Token ID", value: "123" },
        { trait_type: "Creation Date", value: new Date().toISOString() },
        { trait_type: "Platform", value: "CryptoGift Wallets" },
        { trait_type: "Gift Type", value: "Temporal Escrow" },
        { trait_type: "Creator", value: "0x1234567890..." },
        { trait_type: "Timeframe", value: "SEVEN_DAYS" },
        { trait_type: "Expires At", value: new Date(Date.now() + 604800 * 1000).toISOString() },
        { trait_type: "Security", value: "Password Protected" }
      ]
    };
    
    console.log('🔍 7-DAY NFT METADATA:', JSON.stringify(mockMetadata, null, 2));
    
    // Check that the Timeframe attribute is set correctly
    const timeframeAttr = mockMetadata.attributes.find(attr => attr.trait_type === 'Timeframe');
    expect(timeframeAttr?.value).toBe('SEVEN_DAYS');
    
    // Verify MetaMask compatibility requirements
    expect(mockMetadata.name).toBeTruthy();
    expect(mockMetadata.description).toBeTruthy();
    expect(mockMetadata.image).toBeTruthy();
    expect(Array.isArray(mockMetadata.attributes)).toBe(true);
  });
});