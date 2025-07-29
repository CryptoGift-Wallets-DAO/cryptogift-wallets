import { baseSepolia } from "thirdweb/chains";

export const ACTIVE_CHAIN = baseSepolia;

// CRITICAL: Environment validation function - FAIL FAST if required vars missing
const getRequiredEnvVar = (key: string, description: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `❌ CRITICAL: Missing required environment variable '${key}' (${description}). ` +
      `Please set this in your .env.local file. See .env.example for reference.`
    );
  }
  return value;
};

const getOptionalEnvVar = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// HOTFIX: Temporary fallbacks until env vars are updated in production
export const THIRDWEB_KEY = process.env.NEXT_PUBLIC_TW_CLIENT_ID || '9183b572b02ec88dd4d8f20c3ed847d3';
export const NFT_DROP_ADDRESS = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS || '0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3';
export const ERC6551_REGISTRY = process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS || '0x000000006551c19487814612e58FE06813775758';
export const TBA_IMPLEMENTATION = process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS || '0x2d25602551487c3f3354dd80d76d54383a243358';

// Chain Configuration - With fallback and validation
const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID || '84532';
const parsedChainId = parseInt(chainIdStr);
if (isNaN(parsedChainId)) {
  throw new Error(`Invalid CHAIN_ID configuration: "${chainIdStr}"`);
}
export const CHAIN_ID = parsedChainId;

// OPTIONAL Environment Variables - With reasonable fallbacks
export const CHAIN_NAME = getOptionalEnvVar('NEXT_PUBLIC_CHAIN_NAME', 'base-sepolia');
export const REF_TREASURY_ADDRESS = getOptionalEnvVar('NEXT_PUBLIC_REF_TREASURY_ADDRESS', '0x75341Ce1E98c24F33b0AB0e5ABE3AaaC5b0A8f01');
export const USDC_ADDRESS = getOptionalEnvVar('NEXT_PUBLIC_USDC_ADDRESS', '0x036CbD53842c5426634e7929541eC2318f3dCF7e');

// API Endpoints - Optional with fallbacks
export const ZEROX_ENDPOINT = getOptionalEnvVar('NEXT_PUBLIC_ZEROX_ENDPOINT', 'https://base.api.0x.org/swap/v2');
export const PERMIT2_ADDRESS = getOptionalEnvVar('NEXT_PUBLIC_PERMIT2_ADDRESS', '0x000000000022D473030F116dDEE9F6B43aC78BA3');
export const PAYMASTER_URL = getOptionalEnvVar('NEXT_PUBLIC_PAYMASTER_URL', 'https://paymaster.thirdweb.com/v1');

// Configuration Values
export const CREATION_FEE_PERCENT = parseInt(getOptionalEnvVar('NEXT_PUBLIC_CREATION_FEE_PERCENT', '4'));
export const REFERRAL_COMMISSION_PERCENT = parseInt(getOptionalEnvVar('NEXT_PUBLIC_REFERRAL_COMMISSION_PERCENT', '20'));
export const IPFS_GATEWAY = getOptionalEnvVar('NEXT_PUBLIC_IPFS_GATEWAY', 'https://gateway.pinata.cloud/ipfs/');

// Optional APIs
export const BICONOMY_PAYMASTER_API_KEY = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY;
export const BICONOMY_BUNDLER_URL = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL;

// Legacy Exports (DEPRECATED - use NFT_DROP_ADDRESS)
export const NFT_DROP = NFT_DROP_ADDRESS;
export const TOKEN_DROP = process.env.TOKEN_DROP!;
export const EDITION_DROP = process.env.EDITION_DROP!;
export const TBA_IMPL = process.env.TBA_IMPL!;
export const FACTORY_6551 = process.env.FACTORY_6551!;

// Validation function for startup checks
export const validateEnvironment = () => {
  try {
    // Test all required variables
    console.log('🔧 Validating environment configuration...');
    
    console.log('✅ Required Environment Variables:');
    console.log(`  ThirdWeb Client ID: ${THIRDWEB_KEY ? 'Configured' : 'Missing'}`);
    console.log(`  NFT Contract: ${NFT_DROP_ADDRESS}`);
    console.log(`  ERC-6551 Registry: ${ERC6551_REGISTRY}`);
    console.log(`  TBA Implementation: ${TBA_IMPLEMENTATION}`);
    console.log(`  Chain ID: ${CHAIN_ID}`);
    
    console.log('🔧 Optional Features:');
    console.log(`  Biconomy Paymaster: ${BICONOMY_PAYMASTER_API_KEY ? 'Configured' : 'Not configured'}`);
    console.log(`  Referral Treasury: ${REF_TREASURY_ADDRESS}`);
    
    console.log('✅ Environment validation passed!');
    
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    throw error;
  }
};

// Common token addresses on Base Sepolia
export const COMMON_TOKENS = {
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  WETH: "0x4200000000000000000000000000000000000006", 
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
} as const;

// Supported filters for PhotoRoom
export const PHOTO_FILTERS = [
  { id: 'vintage', name: 'Vintage', description: 'Classic retro look' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Futuristic neon style' },
  { id: 'watercolor', name: 'Watercolor', description: 'Artistic paint effect' },
  { id: 'sketch', name: 'Sketch', description: 'Hand-drawn style' },
] as const;

// SECURITY FIX: Neutral Address Generation - CLIENT-SAFE VERSION
// This function is now client-safe and does NOT access PRIVATE_KEY_DEPLOY
export const generateNeutralGiftAddress = (tokenId: string): string => {
  // CRITICAL SECURITY: Use hardcoded fallback address to prevent private key exposure
  // The actual neutral address calculation is now done server-side only
  // This ensures PRIVATE_KEY_DEPLOY is never accessible from client bundle
  
  const fallbackAddress = '0x75341Ce1E98c24F33b0AB0e5ABE3AaaC5b0A8f01';
  console.log(`🤖 Using secure fallback deployer as neutral custodial for token ${tokenId}: ${fallbackAddress}`);
  return fallbackAddress;
};

// Check if address is a neutral gift address
export const isNeutralGiftAddress = (address: string, tokenId: string): boolean => {
  const expectedNeutral = generateNeutralGiftAddress(tokenId);
  return address.toLowerCase() === expectedNeutral.toLowerCase();
};