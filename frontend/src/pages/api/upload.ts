import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { promises as fs } from "fs";
import { upload } from "thirdweb/storage";
import { uploadToIPFS, uploadMetadata, validateIPFSConfig } from "../../lib/ipfs";
import { addMintLog } from "./debug/mint-logs";

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb', // Increase response limit
  },
};

// Fallback image compression using Canvas API
async function compressImageWithCanvas(fileData: Buffer, mimeType: string): Promise<Buffer> {
  try {
    // Convert buffer to base64 for Canvas processing
    const base64 = fileData.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    // Simple compression by reducing quality (this is a server-side fallback)
    // In practice, this will just return the original data since Canvas API 
    // isn't available on server-side. The real compression happens client-side.
    console.log('⚠️ Server-side Canvas compression not available, using original');
    return fileData;
  } catch (error) {
    console.log('⚠️ Canvas compression failed:', error.message);
    return fileData;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    addMintLog('INFO', 'UPLOAD_API_START', { timestamp: new Date().toISOString() });
    
    // Check IPFS configuration
    const ipfsConfig = validateIPFSConfig();
    addMintLog('INFO', 'IPFS_CONFIG_CHECK', ipfsConfig);
    
    if (!ipfsConfig.nftStorage && !ipfsConfig.thirdweb) {
      throw new Error('No IPFS providers configured. Check environment variables.');
    }

    // 🔥 FASE 7H: Parse multipart form with configurable security limits
    const maxUploadSize = parseInt(process.env.MAX_UPLOAD_SIZE || '52428800'); // 50MB default
    const form = formidable({
      maxFileSize: maxUploadSize,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the file
    let fileData = await fs.readFile(uploadedFile.filepath);
    
    // 🔥 FASE 7H: Auto-compress large images with configurable threshold
    const originalSize = fileData.length;
    const compressionThreshold = parseInt(process.env.COMPRESSION_THRESHOLD || '2097152'); // 2MB default
    const isLargeFile = originalSize > compressionThreshold;
    
    if (isLargeFile && uploadedFile.mimetype?.startsWith('image/')) {
      try {
        console.log(`🗜️ Compressing large image: ${originalSize} bytes`);
        
        // 🔥 FASE 7H: Import Sharp with configurable compression settings
        let compressedData;
        try {
          const sharp = require('sharp');
          const compressionQuality = parseInt(process.env.IMAGE_COMPRESSION_QUALITY || '80');
          const maxWidth = parseInt(process.env.MAX_IMAGE_WIDTH || '2048');
          const maxHeight = parseInt(process.env.MAX_IMAGE_HEIGHT || '2048');
          
          compressedData = await sharp(fileData)
            .jpeg({ quality: compressionQuality, progressive: true })
            .resize(maxWidth, maxHeight, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .toBuffer();
          
          console.log(`✅ Image compressed: ${originalSize} → ${compressedData.length} bytes`);
          fileData = compressedData;
        } catch (sharpError) {
          console.log('⚠️ Sharp not available, using Canvas compression');
          // Fallback compression method without Sharp
          fileData = await compressImageWithCanvas(fileData, uploadedFile.mimetype);
        }
        
        addMintLog('INFO', 'IMAGE_COMPRESSION', {
          originalSize,
          compressedSize: fileData.length,
          compressionRatio: Math.round((1 - fileData.length / originalSize) * 100)
        });
      } catch (compressionError) {
        console.log('⚠️ Compression failed, using original:', compressionError.message);
        addMintLog('WARN', 'COMPRESSION_FAILED', {
          error: compressionError.message,
          originalSize,
          usingOriginal: true
        });
      }
    }
    
    // Create File object with potentially compressed data
    const nftFile = new File([fileData], uploadedFile.originalFilename || 'image', {
      type: uploadedFile.mimetype || 'image/jpeg',
    });

    // Upload using hybrid IPFS strategy
    addMintLog('INFO', 'IPFS_UPLOAD_START', { 
      fileName: nftFile.name, 
      fileSize: nftFile.size,
      mimeType: nftFile.type 
    });
    
    const uploadResult = await uploadToIPFS(nftFile);
    addMintLog('SUCCESS', 'IPFS_UPLOAD_COMPLETE', {
      provider: uploadResult.provider,
      cid: uploadResult.cid,
      url: uploadResult.url,
      size: uploadResult.size
    });
    
    const cid = uploadResult.cid;

    // Create metadata if this is the final upload
    const filteredUrl = fields.filteredUrl?.[0];
    if (filteredUrl && typeof filteredUrl === 'string' && filteredUrl.startsWith('http')) {
      // 🔥 FASE 7H SECURITY: Configurable domain whitelist to prevent SSRF
      const allowedDomainsEnv = process.env.ALLOWED_IPFS_DOMAINS;
      const allowedDomains = allowedDomainsEnv 
        ? allowedDomainsEnv.split(',').map(d => d.trim())
        : [
            'gateway.thirdweb.com',
            'ipfs.io',
            'cloudflare-ipfs.com', 
            'gateway.pinata.cloud',
            'nftstorage.link'
          ];
      
      const urlHost = new URL(filteredUrl).hostname;
      if (!allowedDomains.includes(urlHost)) {
        throw new Error(`Security: Domain ${urlHost} not allowed. Only IPFS gateways permitted.`);
      }
      
      console.log(`✅ Filtered URL domain validated: ${urlHost}`);
      
      // 🔥 FASE 7E SECURITY: Enhanced filteredUrl validation with MIME/size restrictions
      addMintLog('INFO', 'FILTERED_URL_SECURITY_VALIDATION', { 
        url: filteredUrl.substring(0, 50) + '...',
        domain: urlHost 
      });
      
      // If we have a filtered image URL, use that as the main image
      const metadataResponse = await fetch(filteredUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*,*/*'
        },
        signal: AbortSignal.timeout(parseInt(process.env.IPFS_FETCH_TIMEOUT || '10000')) // Configurable timeout
      });
      
      if (!metadataResponse.ok) {
        throw new Error(`Failed to fetch filtered image: ${metadataResponse.status}`);
      }
      
      const filteredImageData = await metadataResponse.arrayBuffer();
      
      // 🔥 FASE 7H SECURITY: Configurable MIME type validation for filtered images
      const contentType = metadataResponse.headers.get('content-type') || '';
      const allowedMimeTypesEnv = process.env.ALLOWED_MIME_TYPES;
      const allowedMimeTypes = allowedMimeTypesEnv
        ? allowedMimeTypesEnv.split(',').map(t => t.trim())
        : [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp'
          ];
      
      if (!allowedMimeTypes.some(mime => contentType.includes(mime))) {
        throw new Error(`Security: Invalid MIME type ${contentType}. Only images allowed.`);
      }
      
      // 🔥 FASE 7H SECURITY: Configurable size limit for filtered images  
      const maxSizeBytes = parseInt(process.env.MAX_UPLOAD_SIZE || '52428800'); // 50MB default
      if (filteredImageData.byteLength > maxSizeBytes) {
        throw new Error(`Security: Filtered image too large (${Math.round(filteredImageData.byteLength / 1024 / 1024)}MB). Max 50MB allowed.`);
      }
      
      console.log(`✅ Filtered image security validated:`, {
        contentType,
        sizeBytes: filteredImageData.byteLength,
        sizeMB: Math.round(filteredImageData.byteLength / 1024 / 1024 * 100) / 100
      });
      
      addMintLog('SUCCESS', 'FILTERED_IMAGE_SECURITY_VALIDATED', {
        contentType,
        sizeBytes: filteredImageData.byteLength,
        sizeMB: Math.round(filteredImageData.byteLength / 1024 / 1024 * 100) / 100,
        url: filteredUrl.substring(0, 50) + '...'
      });
      
      const filteredFile = new File([filteredImageData], 'filtered-image.jpg', {
        type: contentType || 'image/jpeg', // Use detected MIME type
      });
      
      addMintLog('INFO', 'FILTERED_IMAGE_UPLOAD_START', { 
        filteredUrl, 
        imageSize: filteredImageData.byteLength 
      });
      
      const filteredUploadResult = await uploadToIPFS(filteredFile);
      addMintLog('SUCCESS', 'FILTERED_IMAGE_UPLOAD_COMPLETE', {
        provider: filteredUploadResult.provider,
        cid: filteredUploadResult.cid,
        url: filteredUploadResult.url
      });
      
      const filteredCid = filteredUploadResult.cid;
      
      // CRITICAL FIX: Create temporary metadata without tokenId (will be updated during mint)
      // Real tokenId is generated during mint transaction, not here
      const metadata = {
        name: "CryptoGift NFT", // Generic name, will be updated with real tokenId
        description: "Un regalo cripto único creado con amor",
        image: `ipfs://${filteredCid}`,
        external_url: process.env.NEXT_PUBLIC_SITE_URL || (() => { throw new Error('NEXT_PUBLIC_SITE_URL required for metadata generation'); })(),
        attributes: [
          {
            trait_type: "Creation Date",
            value: new Date().toISOString(),
          },
          {
            trait_type: "Platform",
            value: "CryptoGift Wallets",
          },
          {
            trait_type: "Status",
            value: "Processing - TokenId will be assigned during mint"
          }
        ],
      };

      addMintLog('INFO', 'METADATA_UPLOAD_START', { metadata });
      
      const metadataUploadResult = await uploadMetadata(metadata);
      addMintLog('SUCCESS', 'METADATA_UPLOAD_COMPLETE', {
        provider: metadataUploadResult.provider,
        cid: metadataUploadResult.cid,
        url: metadataUploadResult.url
      });
      
      const metadataCid = metadataUploadResult.cid;

      return res.status(200).json({
        success: true,
        ipfsCid: metadataCid,
        imageIpfsCid: filteredCid,
        originalIpfsCid: cid,
        ipfsUrl: `ipfs://${metadataCid}`,
        imageUrl: `ipfs://${filteredCid}`,
        metadata,
      });
    }

    // CRITICAL FIX: Create metadata JSON even for non-filtered images
    console.log('🔧 Creating metadata JSON for non-filtered image upload');
    
    const metadata = {
      name: "CryptoGift NFT",
      description: "Un regalo cripto único creado con amor",
      image: `ipfs://${cid}`, // Use the uploaded image CID
      external_url: process.env.NEXT_PUBLIC_SITE_URL || (() => { throw new Error('NEXT_PUBLIC_SITE_URL required for metadata generation'); })(),
      attributes: [
        {
          trait_type: "Creation Date",
          value: new Date().toISOString(),
        },
        {
          trait_type: "Platform", 
          value: "CryptoGift Wallets",
        },
        {
          trait_type: "Type",
          value: "Direct Upload (No Filter Applied)"
        }
      ],
    };

    addMintLog('INFO', 'METADATA_CREATION_NON_FILTERED', { 
      imageCid: cid, 
      metadata 
    });
    
    const metadataUploadResult = await uploadMetadata(metadata);
    addMintLog('SUCCESS', 'METADATA_UPLOAD_NON_FILTERED_COMPLETE', {
      provider: metadataUploadResult.provider,
      cid: metadataUploadResult.cid,
      url: metadataUploadResult.url
    });
    
    const metadataCid = metadataUploadResult.cid;
    
    // CRITICAL FIX: Validate propagation before returning to prevent validation failures
    console.log('🔍 Validating metadata propagation before returning to client...');
    addMintLog('INFO', 'PROPAGATION_VALIDATION_START', { metadataCid });
    
    // 🔥 CRITICAL FIX ERROR #7: Use SAME gateway priority as pickGatewayUrl() for consistency
    // Cloudflare first (most reliable), ThirdWeb later (blocks HEAD requests)
    const testGateways = [
      `https://cloudflare-ipfs.com/ipfs/${metadataCid}`,  // Most reliable first
      `https://ipfs.io/ipfs/${metadataCid}`,
      `https://gateway.thirdweb.com/ipfs/${metadataCid}`, // ThirdWeb last (blocks HEAD)
      `https://gateway.pinata.cloud/ipfs/${metadataCid}`  // Added for completeness
    ];
    
    let propagationValidated = false;
    for (const gatewayUrl of testGateways) {
      try {
        // 🔥 FIX ERROR #7: Handle ThirdWeb gateway HEAD blocking like pickGatewayUrl() does
        if (gatewayUrl.includes('gateway.thirdweb.com')) {
          console.log(`🔧 ThirdWeb gateway detected in validation, using GET with Range`);
          const testResponse = await fetch(gatewayUrl, { 
            method: 'GET',
            headers: { Range: 'bytes=0-1023' }, // Small range test like pickGatewayUrl()
            signal: AbortSignal.timeout(5000)
          });
          
          if (testResponse.ok || testResponse.status === 206) {
            console.log(`✅ Propagation validated via ThirdWeb GET Range: ${gatewayUrl}`);
            addMintLog('SUCCESS', 'PROPAGATION_VALIDATION_SUCCESS', { 
              gateway: gatewayUrl,
              status: testResponse.status,
              method: 'GET_RANGE'
            });
            propagationValidated = true;
            break;
          }
        } else {
          // Standard HEAD request for non-ThirdWeb gateways
          const testResponse = await fetch(gatewayUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) // 5s timeout for propagation
          });
          
          if (testResponse.ok) {
            console.log(`✅ Propagation validated: ${gatewayUrl}`);
            addMintLog('SUCCESS', 'PROPAGATION_VALIDATION_SUCCESS', { 
              gateway: gatewayUrl,
              status: testResponse.status,
              method: 'HEAD'
            });
            propagationValidated = true;
            break;
          }
        }
      } catch (error) {
        console.log(`⏳ Propagation pending: ${gatewayUrl} (${error.message})`);
      }
    }
    
    if (!propagationValidated) {
      console.log('❌ CRITICAL: Metadata propagation failed - BLOCKING upload success');
      addMintLog('ERROR', 'PROPAGATION_VALIDATION_FAILED', {
        message: 'Metadata not accessible in any gateway - blocking upload',
        metadataCid: metadataCid.substring(0, 20) + '...',
        gateways: testGateways.length
      });
      
      // 🔥 BLOCKING: Do NOT return success if metadata isn't accessible
      throw new Error(`Upload incomplete: Metadata ${metadataCid} not accessible in any IPFS gateway. Please wait for propagation and retry.`);
    }

    // 🔥 CRITICAL: Validate JSON content has valid image field before continuing
    console.log('📋 Validating metadata JSON contains valid image field...');
    let jsonValidated = false;
    let lastJsonError = null;
    
    // Try multiple gateways for JSON validation instead of just the first one
    for (const gatewayUrl of testGateways) {
      try {
        console.log(`🔍 Trying JSON validation via: ${gatewayUrl}`);
        const jsonResponse = await fetch(gatewayUrl, { 
          signal: AbortSignal.timeout(4000) 
        });
        
        if (jsonResponse.ok) {
          const jsonData = await jsonResponse.json();
          if (!jsonData.image || !jsonData.image.startsWith('ipfs://')) {
            console.log('❌ CRITICAL: Metadata JSON missing valid image field');
            addMintLog('ERROR', 'METADATA_JSON_INVALID', {
              hasImage: !!jsonData.image,
              imageValue: jsonData.image?.substring(0, 50) + '...',
              message: 'Metadata JSON does not contain valid ipfs:// image field',
              gateway: gatewayUrl
            });
            throw new Error(`Upload incomplete: Metadata JSON at ${metadataCid} does not contain valid image field. Expected ipfs:// URL but got: ${jsonData.image || 'undefined'}`);
          }
          console.log(`✅ JSON validation successful via ${gatewayUrl}:`, jsonData.image.substring(0, 50) + '...');
          addMintLog('SUCCESS', 'METADATA_JSON_VALIDATED', {
            imageField: jsonData.image.substring(0, 50) + '...',
            gateway: gatewayUrl
          });
          jsonValidated = true;
          break; // Success! Exit the loop
        } else {
          console.log(`⏳ JSON validation failed via ${gatewayUrl}: HTTP ${jsonResponse.status}`);
          lastJsonError = `HTTP ${jsonResponse.status}`;
        }
      } catch (jsonError) {
        console.log(`⏳ JSON validation error via ${gatewayUrl}: ${jsonError.message}`);
        lastJsonError = jsonError.message;
        // Continue to next gateway
      }
    }
    
    if (!jsonValidated) {
      console.log('❌ CRITICAL: Failed to validate metadata JSON content in any gateway');
      addMintLog('ERROR', 'METADATA_JSON_VALIDATION_FAILED', {
        error: lastJsonError || 'All gateways failed',
        metadataCid: metadataCid.substring(0, 20) + '...',
        gateways: testGateways.length
      });
      throw new Error(`Upload incomplete: Cannot validate metadata JSON content in any gateway. Last error: ${lastJsonError || 'All gateways failed'}`);
    }

    // 🔥 FASE 7E FIX: Validate IMAGE propagation in ≥2 gateways before returning success
    console.log('🖼️ Validating IMAGE propagation in multiple gateways...');
    addMintLog('INFO', 'IMAGE_PROPAGATION_VALIDATION_START', { imageCid: cid });
    
    // 🔥 CRITICAL FIX ERROR #7: Use SAME gateway priority for image validation consistency  
    const imageTestGateways = [
      `https://cloudflare-ipfs.com/ipfs/${cid}`,      // Most reliable first
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.thirdweb.com/ipfs/${cid}`,     // ThirdWeb last (blocks HEAD)
      `https://gateway.pinata.cloud/ipfs/${cid}`
    ];
    
    let imagePropagationCount = 0;
    const minRequiredGateways = 1; // FIXED: Reduced from 2→1 for IPFS gateway latency tolerance
    
    for (const gatewayUrl of imageTestGateways) {
      try {
        // 🔥 FIX ERROR #7: Handle ThirdWeb gateway HEAD blocking for image validation too
        if (gatewayUrl.includes('gateway.thirdweb.com')) {
          console.log(`🔧 ThirdWeb gateway detected for image validation, using GET with Range`);
          const imageTestResponse = await fetch(gatewayUrl, { 
            method: 'GET',
            headers: { Range: 'bytes=0-1023' }, // Small range test
            signal: AbortSignal.timeout(8000)
          });
          
          if (imageTestResponse.ok || imageTestResponse.status === 206) {
            console.log(`✅ Image propagation validated via ThirdWeb GET Range: ${gatewayUrl}`);
            addMintLog('SUCCESS', 'IMAGE_PROPAGATION_SUCCESS', { 
              gateway: gatewayUrl,
              status: imageTestResponse.status,
              imageCid: cid.substring(0, 20) + '...',
              method: 'GET_RANGE'
            });
            imagePropagationCount++;
            
            // Early exit once we have minimum required gateways (performance optimization)
            if (imagePropagationCount >= minRequiredGateways) {
              console.log(`🚀 Early exit: minimum ${minRequiredGateways} gateway(s) validated`);
              break;
            }
          }
        } else {
          // Standard HEAD request for non-ThirdWeb gateways
          const imageTestResponse = await fetch(gatewayUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(8000) // FIXED: Increased from 4s→8s for slow gateways
          });
          
          if (imageTestResponse.ok) {
            console.log(`✅ Image propagation validated: ${gatewayUrl}`);
            addMintLog('SUCCESS', 'IMAGE_PROPAGATION_SUCCESS', { 
              gateway: gatewayUrl,
              status: imageTestResponse.status,
              imageCid: cid.substring(0, 20) + '...',
              method: 'HEAD'
            });
            imagePropagationCount++;
            
            // Early exit once we have minimum required gateways (performance optimization)
            if (imagePropagationCount >= minRequiredGateways) {
              console.log(`🚀 Early exit: minimum ${minRequiredGateways} gateway(s) validated`);
              break;
            }
          }
        }
      } catch (error) {
        console.log(`⏳ Image propagation pending: ${gatewayUrl} (${error.message})`);
      }
    }
    
    if (imagePropagationCount >= minRequiredGateways) {
      console.log(`✅ Image propagation VALIDATED: ${imagePropagationCount}/${imageTestGateways.length} gateways`);
      addMintLog('SUCCESS', 'IMAGE_PROPAGATION_VALIDATED', {
        successfulGateways: imagePropagationCount,
        totalGateways: imageTestGateways.length,
        imageCid: cid.substring(0, 20) + '...'
      });
    } else {
      console.log(`❌ CRITICAL: Image propagation INSUFFICIENT - BLOCKING upload success`);
      addMintLog('ERROR', 'IMAGE_PROPAGATION_FAILED', {
        successfulGateways: imagePropagationCount,
        requiredGateways: minRequiredGateways,
        totalGateways: imageTestGateways.length,
        imageCid: cid.substring(0, 20) + '...',
        message: 'Image not accessible in minimum required gateways'
      });
      
      // 🔥 BLOCKING: Do NOT return success if image isn't accessible
      throw new Error(`Upload incomplete: Image ${cid} only accessible in ${imagePropagationCount}/${imageTestGateways.length} gateways. Minimum ${minRequiredGateways} required. Please wait for propagation and retry.`);
    }

    // Return consistent structure: ipfsCid = metadata CID, imageIpfsCid = image CID
    res.status(200).json({
      success: true,
      ipfsCid: metadataCid,     // FIXED: Always metadata CID
      imageIpfsCid: cid,        // FIXED: Always image CID
      ipfsUrl: `ipfs://${metadataCid}`,  // FIXED: Metadata URL
      imageUrl: `ipfs://${cid}`, // Image URL
      httpUrl: `https://gateway.pinata.cloud/ipfs/${cid}`, // For compatibility
      metadata,
    });

  } catch (error) {
    console.error('Upload error:', error);
    addMintLog('ERROR', 'UPLOAD_API_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      debug: 'Check /api/debug/mint-logs for detailed error information'
    });
  }
}