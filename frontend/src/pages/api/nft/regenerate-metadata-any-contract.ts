import { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { storeNFTMetadata, createNFTMetadata } from '../../../lib/nftMetadataStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractAddress, tokenId } = req.body;

  if (!contractAddress || !tokenId) {
    return res.status(400).json({ 
      error: 'Contract address and token ID are required' 
    });
  }

  try {
    console.log('🔄 REGENERATING METADATA FOR ANY CONTRACT ===========================================');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📋 Contract:', contractAddress);
    console.log('🎯 Token:', tokenId);
    console.log('🏗️ Environment Contract:', process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
    console.log('🔍 Contract Match:', contractAddress === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);

    // Initialize ThirdWeb client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress as `0x${string}`,
    });

    // First, verify the contract and token exist
    console.log('✅ VERIFYING CONTRACT AND TOKEN ===========================================');
    let totalSupply;
    try {
      totalSupply = await readContract({
        contract: nftContract,
        method: "function totalSupply() view returns (uint256)",
        params: [],
      });
      console.log(`✅ Contract is valid, total supply: ${totalSupply}`);
    } catch (error) {
      console.log("❌ Invalid contract address:", error);
      return res.status(400).json({ 
        error: 'Invalid contract address or contract does not support totalSupply()' 
      });
    }

    if (BigInt(tokenId) >= totalSupply) {
      console.log(`❌ Token ${tokenId} does not exist (supply: ${totalSupply})`);
      return res.status(404).json({ 
        error: `Token ${tokenId} does not exist. Total supply: ${totalSupply}` 
      });
    }

    // Try to read tokenURI from contract
    let tokenURI = "";
    try {
      tokenURI = await readContract({
        contract: nftContract,
        method: "function tokenURI(uint256 tokenId) view returns (string)",
        params: [BigInt(tokenId)],
      });
      console.log("✅ Found tokenURI on contract:", tokenURI);
    } catch (error) {
      console.log("❌ Could not read tokenURI from contract:", error);
      return res.status(404).json({ 
        error: 'Token does not have a tokenURI or contract does not support tokenURI()' 
      });
    }

    // If we have a tokenURI, try to fetch metadata from IPFS
    if (tokenURI && (tokenURI.startsWith("ipfs://") || tokenURI.startsWith("https://"))) {
      console.log('🔍 FETCHING METADATA FROM IPFS ===========================================');
      
      let metadataUrl = tokenURI;
      if (tokenURI.startsWith("ipfs://")) {
        const cid = tokenURI.replace("ipfs://", "");
        // Try multiple IPFS gateways
        const gateways = [
          `https://nftstorage.link/ipfs/${cid}`,
          `https://ipfs.io/ipfs/${cid}`,
          `https://gateway.pinata.cloud/ipfs/${cid}`,
          `https://cloudflare-ipfs.com/ipfs/${cid}`,
          `https://dweb.link/ipfs/${cid}`
        ];

        let metadata = null;
        let workingGateway = null;

        // Try each gateway
        for (const gateway of gateways) {
          try {
            console.log(`🔍 Trying gateway: ${gateway}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(gateway, { 
              signal: controller.signal,
              headers: { 
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              metadata = await response.json();
              workingGateway = gateway;
              console.log("✅ Retrieved metadata from IPFS:", metadata);
              break;
            } else {
              console.log(`⚠️ Gateway ${gateway} returned ${response.status}`);
            }
          } catch (gatewayError) {
            console.log(`⚠️ Gateway failed: ${gateway}`, gatewayError.message);
            continue;
          }
        }

        if (metadata) {
          console.log('💾 STORING REGENERATED METADATA ===========================================');
          
          // CRITICAL FIX: Extract CID properly from metadata.image
          let imageIpfsCid = metadata.image;
          if (imageIpfsCid && imageIpfsCid.startsWith('ipfs://')) {
            imageIpfsCid = imageIpfsCid.replace('ipfs://', ''); // Strip ipfs:// prefix
          }
          
          console.log("🔧 FIXED CID HANDLING:", {
            originalImage: metadata.image,
            cleanedCid: imageIpfsCid,
            contractUsed: contractAddress
          });

          // Create our internal metadata format
          const nftMetadata = createNFTMetadata({
            contractAddress, // Use the ACTUAL contract address, not environment variable
            tokenId,
            name: metadata.name || `CryptoGift NFT-Wallet #${tokenId}`,
            description: metadata.description || 'Un regalo cripto único creado con amor',
            imageIpfsCid: imageIpfsCid, // Now properly cleaned CID
            metadataIpfsCid: cid,
            owner: "unknown" // Will be updated when fetched
          });

          // Store the regenerated metadata
          await storeNFTMetadata(nftMetadata);
          console.log("✅ Metadata regenerated and stored successfully");

          // Verify storage worked
          const { getNFTMetadata } = await import('../../../lib/nftMetadataStore');
          const storedCheck = await getNFTMetadata(contractAddress, tokenId);
          
          if (storedCheck) {
            console.log("✅ STORAGE VERIFICATION: Metadata successfully stored and retrieved");
          } else {
            console.log("❌ STORAGE VERIFICATION: Failed to retrieve stored metadata");
          }

          return res.status(200).json({
            success: true,
            message: 'Metadata regenerated successfully',
            metadata: nftMetadata,
            source: 'ipfs_regenerated_any_contract',
            gateway: workingGateway,
            contractUsed: contractAddress,
            environmentContract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
            contractMatch: contractAddress === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
            imageUrl: `ipfs://${imageIpfsCid}` // Return the final image URL
          });
        } else {
          console.log("❌ Could not retrieve metadata from any IPFS gateway");
          return res.status(500).json({
            error: 'Could not retrieve metadata from IPFS',
            tokenURI,
            gateways: gateways,
            contractUsed: contractAddress
          });
        }
      } else {
        // Direct HTTPS URL
        console.log(`🔍 Fetching from direct URL: ${tokenURI}`);
        try {
          const response = await fetch(tokenURI);
          if (response.ok) {
            const metadata = await response.json();
            console.log("✅ Retrieved metadata from direct URL:", metadata);
            
            // Store similar to IPFS case
            const nftMetadata = createNFTMetadata({
              contractAddress,
              tokenId,
              name: metadata.name || `CryptoGift NFT-Wallet #${tokenId}`,
              description: metadata.description || 'Un regalo cripto único creado con amor',
              imageIpfsCid: metadata.image || '',
              owner: "unknown"
            });

            await storeNFTMetadata(nftMetadata);
            
            return res.status(200).json({
              success: true,
              message: 'Metadata regenerated successfully from direct URL',
              metadata: nftMetadata,
              source: 'direct_url',
              contractUsed: contractAddress
            });
          }
        } catch (error) {
          console.log("❌ Failed to fetch from direct URL:", error);
        }
      }
    } else {
      console.log("❌ No valid tokenURI found");
      return res.status(400).json({
        error: 'No valid tokenURI found on contract',
        tokenURI: tokenURI || 'none',
        contractUsed: contractAddress
      });
    }

  } catch (error) {
    console.error('❌ Error regenerating metadata:', error);
    return res.status(500).json({
      error: 'Failed to regenerate metadata',
      message: error instanceof Error ? error.message : 'Unknown error',
      contractUsed: contractAddress
    });
  }
}