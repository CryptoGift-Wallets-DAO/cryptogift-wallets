import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getNFTMetadata } from "../../../lib/nftMetadataStore";

// API to get all NFT-Wallets owned by a user's address
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🔍 USER NFT-WALLETS API STARTED =====================================");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔧 Method:", req.method);
  
  if (req.method !== 'GET') {
    console.error("❌ Invalid method:", req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userAddress } = req.query;
  
  if (!userAddress || typeof userAddress !== 'string') {
    console.error("❌ Invalid userAddress:", userAddress);
    return res.status(400).json({ error: 'userAddress is required' });
  }

  console.log("👤 User Address:", userAddress);

  try {
    // Initialize ThirdWeb Client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    const contractAddress = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!;
    
    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress,
    });
    
    console.log("📊 Getting total supply...");
    
    // Get total supply to know how many NFTs exist
    const totalSupply = await readContract({
      contract: nftContract,
      method: "function totalSupply() view returns (uint256)",
      params: []
    });
    
    console.log("📈 Total NFTs in contract:", totalSupply.toString());
    
    const userWallets: any[] = [];
    
    // CRITICAL FIX: NFT contract starts from token ID 1, not 0
    // Check each NFT to see if user owns it OR if user's TBA is related
    for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
      try {
        console.log(`🔍 Checking NFT ${tokenId}...`);
        
        // Check if user owns this NFT directly
        let owner;
        try {
          owner = await readContract({
            contract: nftContract,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [BigInt(tokenId)]
          });
        } catch (ownerError) {
          console.log(`⚠️ NFT ${tokenId} has no owner, skipping`);
          continue;
        }
        
        console.log(`👤 NFT ${tokenId} owner:`, owner);
        
        // CRITICAL: Check if user owns this NFT directly OR through TBA relationship
        const userOwnsDirectly = owner.toLowerCase() === userAddress.toLowerCase();
        
        // Also check if this NFT was originally minted to user (stored in metadata)
        let isUserRelated = userOwnsDirectly;
        let nftMetadata = null;
        
        try {
          nftMetadata = await getNFTMetadata(contractAddress, tokenId.toString());
          
          // Check if user is the original recipient or creator
          if (nftMetadata && nftMetadata.owner) {
            const metadataOwner = nftMetadata.owner.toLowerCase();
            if (metadataOwner === userAddress.toLowerCase()) {
              isUserRelated = true;
              console.log(`✅ NFT ${tokenId} is related to user via metadata`);
            }
          }
        } catch (metadataError) {
          console.log(`⚠️ No metadata found for NFT ${tokenId}`);
        }
        
        if (isUserRelated) {
          console.log(`🎯 NFT ${tokenId} belongs to user, adding to wallet list`);
          
          // Calculate TBA address for this NFT
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
          
          // Get NFT image and metadata
          let nftImage = '/images/nft-placeholder.png';
          let nftName = `CryptoGift Wallet #${tokenId}`;
          
          if (nftMetadata) {
            if (nftMetadata.image) {
              // Convert IPFS URLs to accessible format
              if (nftMetadata.image.startsWith('ipfs://')) {
                const cid = nftMetadata.image.replace('ipfs://', '');
                nftImage = `https://nftstorage.link/ipfs/${cid}`;
              } else {
                nftImage = nftMetadata.image;
              }
            }
            
            if (nftMetadata.name) {
              nftName = nftMetadata.name;
            }
          }
          
          userWallets.push({
            id: tokenId.toString(),
            name: nftName,
            address: userAddress,
            tbaAddress: tbaAddress,
            nftContract: contractAddress,
            tokenId: tokenId.toString(),
            image: nftImage,
            balance: {
              eth: '0.0000', // TODO: Get real TBA balance
              usdc: '0.00',
              total: '$0.00'
            },
            isActive: false, // Will be set by frontend
            owner: owner,
            metadata: nftMetadata
          });
        }
      } catch (tokenError) {
        console.log(`⚠️ Error checking NFT ${tokenId}:`, tokenError.message);
        continue;
      }
    }
    
    console.log(`✅ Found ${userWallets.length} NFT-Wallets for user ${userAddress}`);
    
    // Set first wallet as active if any exist
    if (userWallets.length > 0) {
      userWallets[0].isActive = true;
    }
    
    res.status(200).json({
      success: true,
      userAddress,
      walletsFound: userWallets.length,
      wallets: userWallets
    });
    
  } catch (error) {
    console.error('❌ Error getting user NFT wallets:', error);
    res.status(500).json({
      error: 'Failed to get user NFT wallets',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}