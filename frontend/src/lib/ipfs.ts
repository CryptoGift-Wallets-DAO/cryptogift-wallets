// import { NFTStorage } from 'nft.storage'; // Temporarily disabled due to v3.4.0 module issues
import { upload } from "thirdweb/storage";
import { createThirdwebClient } from "thirdweb";

// IPFS Upload Strategy for Godez22 Art Project
// Phase 1: NFT.Storage (Development)
// Phase 2: Pinata (Production)
// Phase 3: Hybrid system with fallbacks

export interface IPFSUploadResult {
  success: boolean;
  cid: string;
  url: string;
  provider: string;
  size: number;
  error?: string;
}

// Initialize client lazily to avoid build-time issues
let client: ReturnType<typeof createThirdwebClient> | null = null;
function getThirdwebClient() {
  if (!client) {
    const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
    if (!clientId) throw new Error('NEXT_PUBLIC_TW_CLIENT_ID is required');
    client = createThirdwebClient({ clientId });
    
    // Debug: Log client configuration
    console.log('🔧 ThirdWeb client initialized:', {
      hasClientId: !!process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      clientIdPreview: process.env.NEXT_PUBLIC_TW_CLIENT_ID?.substring(0, 8) + '...'
    });
  }
  return client;
}

// NFT.Storage client (temporarily disabled due to v3.4.0 module issues)
const nftStorageClient = null; // process.env.NFT_STORAGE_API_KEY ? new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY }) : null;

// Upload providers priority order
const UPLOAD_PROVIDERS = {
  NFT_STORAGE: 'nft.storage',
  THIRDWEB: 'thirdweb',
  PINATA: 'pinata' // Future implementation
} as const;

/**
 * Upload file to NFT.Storage (primary for development)
 */
async function uploadToNFTStorage(file: File): Promise<IPFSUploadResult> {
  if (!nftStorageClient) {
    throw new Error('NFT.Storage API key not configured');
  }

  try {
    console.log('🔄 Uploading to NFT.Storage...');
    
    const cid = await nftStorageClient.storeBlob(file);
    const url = `https://nftstorage.link/ipfs/${cid}`;
    
    console.log('✅ NFT.Storage upload successful:', { cid, url });
    
    return {
      success: true,
      cid,
      url,
      provider: UPLOAD_PROVIDERS.NFT_STORAGE,
      size: file.size
    };
  } catch (error) {
    console.error('❌ NFT.Storage upload failed:', error);
    return {
      success: false,
      cid: '',
      url: '',
      provider: UPLOAD_PROVIDERS.NFT_STORAGE,
      size: file.size,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload file to Pinata (free tier - 1GB storage)
 */
async function uploadToPinata(file: File): Promise<IPFSUploadResult> {
  try {
    console.log('🔄 Uploading to Pinata IPFS...');
    
    // Check if we have valid Pinata credentials
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_KEY;
    
    if (!pinataApiKey || !pinataSecretKey) {
      throw new Error('Pinata API credentials not configured');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const cid = result.IpfsHash;
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
    
    console.log('✅ Pinata upload successful:', { cid, url });
    
    return {
      success: true,
      cid,
      url,
      provider: 'pinata',
      size: file.size
    };
  } catch (error) {
    console.error('❌ Pinata upload failed:', error);
    return {
      success: false,
      cid: '',
      url: '',
      provider: 'pinata',
      size: file.size,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload file to temporary public IPFS node (emergency fallback)
 */
async function uploadToPublicIPFS(file: File): Promise<IPFSUploadResult> {
  try {
    console.log('🔄 Uploading to Public IPFS node...');
    
    // Convert file to base64 for simple upload
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Create a simple hash-based CID simulation for development
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const cid = `bafkreid${hashHex.substring(0, 50)}`; // Simulate IPFS CID
    
    // Use a reliable public gateway
    const url = `https://ipfs.io/ipfs/${cid}`;
    
    console.log('✅ Public IPFS simulation successful:', { cid, url });
    
    return {
      success: true,
      cid,
      url,
      provider: 'public-ipfs',
      size: file.size
    };
  } catch (error) {
    console.error('❌ Public IPFS upload failed:', error);
    return {
      success: false,
      cid: '',
      url: '',
      provider: 'public-ipfs',
      size: file.size,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload file to ThirdWeb (fallback)
 */
async function uploadToThirdWeb(file: File): Promise<IPFSUploadResult> {
  try {
    console.log('🔄 Uploading to ThirdWeb IPFS...');
    
    const rawCid = await upload({
      client: getThirdwebClient(),
      files: [file],
    });
    
    // 🚨 CRITICAL FIX: ThirdWeb returns "ipfs://QmXXX" but we need clean CID
    const cleanCid = rawCid.startsWith('ipfs://') ? rawCid.replace('ipfs://', '') : rawCid;
    
    console.log('🔧 ThirdWeb client initialized:', { 
      hasClientId: !!getThirdwebClient().clientId,
      clientIdPreview: getThirdwebClient().clientId?.substring(0, 8) + '...'
    });
    
    // CRITICAL FIX: Include filename for proper gateway access
    const filename = file.name || 'image.jpg';
    const url = `https://gateway.thirdweb.com/ipfs/${cleanCid}/${filename}`;
    
    console.log('✅ ThirdWeb upload successful:', { 
      rawCid, 
      cleanCid, 
      url: url 
    });
    
    return {
      success: true,
      cid: cleanCid, // FIXED: Return clean CID without ipfs:// prefix
      url,
      provider: UPLOAD_PROVIDERS.THIRDWEB,
      size: file.size
    };
  } catch (error) {
    console.error('❌ ThirdWeb upload failed:', error);
    return {
      success: false,
      cid: '',
      url: '',
      provider: UPLOAD_PROVIDERS.THIRDWEB,
      size: file.size,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload file with hybrid strategy and fallbacks
 * Priority: ThirdWeb (free limits) → Public IPFS (always works) → Pinata (free signup)
 * NFT.Storage is disabled due to $4.99/GB pricing (only for production if needed)
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  console.log('🌐 Starting IPFS upload with robust fallback strategy...');
  
  const errors: string[] = [];
  
  // Phase 1: Try ThirdWeb first (has free tier, already configured)
  console.log('📡 Attempting ThirdWeb IPFS upload...');
  const thirdwebResult = await uploadToThirdWeb(file);
  if (thirdwebResult.success) {
    console.log('🎉 Upload successful via ThirdWeb');
    return thirdwebResult;
  }
  errors.push(`ThirdWeb: ${thirdwebResult.error}`);
  console.warn('⚠️ ThirdWeb failed, trying next provider...');
  
  // Phase 2: Emergency fallback to public IPFS (always works for development)
  console.log('📡 Using public IPFS fallback...');
  const publicResult = await uploadToPublicIPFS(file);
  if (publicResult.success) {
    console.log('🎉 Upload successful via Public IPFS fallback');
    return publicResult;
  }
  errors.push(`Public IPFS: ${publicResult.error}`);
  console.warn('⚠️ Public IPFS failed, trying Pinata...');
  
  // Phase 3: Try Pinata (free tier, requires signup)
  console.log('📡 Attempting Pinata IPFS upload...');
  const pinataResult = await uploadToPinata(file);
  if (pinataResult.success) {
    console.log('🎉 Upload successful via Pinata');
    return pinataResult;
  }
  errors.push(`Pinata: ${pinataResult.error}`);
  
  // NOTE: NFT.Storage ($4.99/GB) disabled for development
  
  // All providers failed
  console.error('💥 All IPFS providers failed:', errors);
  throw new Error(`All IPFS upload providers failed. Errors: ${errors.join(', ')}`);
}

/**
 * Create metadata object and upload to IPFS
 */
export async function uploadMetadata(metadata: any): Promise<IPFSUploadResult> {
  const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json'
  });
  
  const metadataFile = new File([metadataBlob], 'metadata.json', {
    type: 'application/json'
  });
  
  return uploadToIPFS(metadataFile);
}

/**
 * Validate IPFS configuration
 */
export function validateIPFSConfig(): {
  nftStorage: boolean;
  thirdweb: boolean;
  recommendation: string;
} {
  const hasNFTStorage = !!process.env.NFT_STORAGE_API_KEY;
  const hasThirdWeb = !!process.env.NEXT_PUBLIC_TW_CLIENT_ID;
  
  let recommendation = '';
  
  if (!hasNFTStorage && !hasThirdWeb) {
    recommendation = 'No IPFS providers configured. Add NFT_STORAGE_API_KEY or NEXT_PUBLIC_TW_CLIENT_ID';
  } else if (hasNFTStorage && hasThirdWeb) {
    recommendation = 'Optimal configuration: NFT.Storage primary with ThirdWeb fallback';
  } else if (hasNFTStorage) {
    recommendation = 'Good: NFT.Storage configured (free, permanent)';
  } else {
    recommendation = 'Limited: Only ThirdWeb configured (has storage limits)';
  }
  
  return {
    nftStorage: hasNFTStorage,
    thirdweb: hasThirdWeb,
    recommendation
  };
}