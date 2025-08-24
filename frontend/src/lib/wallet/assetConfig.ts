/**
 * Asset Configuration for wallet_watchAsset
 * Token configurations for easy addition to wallets
 */

export interface AssetConfig {
  type: 'ERC20' | 'ERC721' | 'ERC1155';
  options: {
    address: string;
    symbol: string;
    decimals?: number;
    image?: string;
    tokenId?: string; // For NFTs (experimental)
  };
}

// Production token configurations from your .env.local
export const ASSET_CONFIGS: Record<string, AssetConfig> = {
  // USDC on Base Sepolia
  'USDC_BASE_SEPOLIA': {
    type: 'ERC20',
    options: {
      address: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      symbol: 'USDC',
      decimals: 6,
      image: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    },
  },
  
  // Your Player Token
  'PLAYER_TOKEN': {
    type: 'ERC20',
    options: {
      address: process.env.NEXT_PUBLIC_PLAYER_TOKEN_ADDRESS || '0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b',
      symbol: 'PLAYER',
      decimals: 18,
      image: 'https://cryptogift-wallets.vercel.app/logo.png',
    },
  },
  
  // CryptoGift NFT (experimental - desktop only)
  'CRYPTOGIFT_NFT': {
    type: 'ERC721',
    options: {
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '0xE9F316159a0830114252a96a6B7CA6efD874650F',
      symbol: 'CGIFT',
      decimals: 0,
      image: 'https://cryptogift-wallets.vercel.app/nft-placeholder.png',
    },
  },
  
  // Pet NFT Edition
  'PET_NFT': {
    type: 'ERC721',
    options: {
      address: process.env.NEXT_PUBLIC_PET_NFT_ADDRESS || '0xBd0169Ac15b9b03D79Bd832AF5E358D4CaCEfb49',
      symbol: 'PET',
      decimals: 0,
      image: 'https://cryptogift-wallets.vercel.app/pet-placeholder.png',
    },
  },
};

/**
 * Get asset configuration by key
 */
export function getAssetConfig(key: string): AssetConfig | null {
  return ASSET_CONFIGS[key] || null;
}

/**
 * Get all available assets
 */
export function getAvailableAssets(): { key: string; config: AssetConfig }[] {
  return Object.entries(ASSET_CONFIGS).map(([key, config]) => ({ key, config }));
}

/**
 * Check if asset is NFT
 */
export function isNFTAsset(config: AssetConfig): boolean {
  return config.type === 'ERC721' || config.type === 'ERC1155';
}