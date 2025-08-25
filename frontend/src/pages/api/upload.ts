import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { promises as fs } from "fs";
import { upload } from "thirdweb/storage";
import { uploadToIPFS, uploadMetadata, validateIPFSConfig } from "../../lib/ipfs";
import { addMintLog } from "./debug/mint-logs";
import { convertIPFSToHTTPS, validateMultiGatewayAccess } from "../../utils/ipfs";
import { getPublicBaseUrl } from "../../lib/publicBaseUrl";

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
    const nftFile = new File([fileData as BlobPart], uploadedFile.originalFilename || 'image', {
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
      const imageIpfsUrl = `ipfs://${filteredCid}`;
      const imageHttpsUrl = convertIPFSToHTTPS(imageIpfsUrl);
      
      const metadata = {
        name: "CryptoGift NFT", // Generic name, will be updated with real tokenId
        description: "Un regalo cripto único creado con amor",
        image: imageIpfsUrl,        // IPFS native format - preferred
        image_url: imageHttpsUrl,   // HTTPS format - fallback for wallets
        external_url: getPublicBaseUrl(req), // Use centralized config
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
    
    const nonFilteredImageIpfsUrl = `ipfs://${cid}`;
    const nonFilteredImageHttpsUrl = convertIPFSToHTTPS(nonFilteredImageIpfsUrl);
    
    const metadata = {
      name: "CryptoGift NFT",
      description: "Un regalo cripto único creado con amor",
      image: nonFilteredImageIpfsUrl,        // IPFS native format - preferred
      image_url: nonFilteredImageHttpsUrl,   // HTTPS format - fallback for wallets
      external_url: getPublicBaseUrl(req), // Use centralized config
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
    
    // 🔥 NEW: Multi-gateway validation with Promise.any + AbortController
    console.log('🔍 Starting multi-gateway validation for metadata...');
    addMintLog('INFO', 'MULTI_GATEWAY_VALIDATION_START', { metadataCid });
    
    const metadataIpfsUrl = `ipfs://${metadataCid}`;
    // 🔥 RELAXED: Only require 1 gateway (don't block on propagation)
    const metadataValidation = await validateMultiGatewayAccess(metadataIpfsUrl, 1, 10000);
    
    if (!metadataValidation.success) {
      // 🔥 FAIL-FAST: If 0 gateways work, abort the upload
      if (metadataValidation.workingGateways.length === 0) {
        console.log('❌ CRITICAL: Zero gateways can access metadata - aborting upload');
        addMintLog('ERROR', 'ZERO_GATEWAYS_ACCESSIBLE', {
          message: 'No IPFS gateways can access the uploaded metadata',
          metadataCid: metadataCid.substring(0, 20) + '...',
          errors: metadataValidation.errors
        });
        throw new Error('Upload failed: Metadata is not accessible from any IPFS gateway. Please try again.');
      }
      
      // If at least 1 gateway works, continue with warning
      console.log(`⚠️ WARNING: Only ${metadataValidation.workingGateways.length} gateway(s) accessible - continuing`);
      addMintLog('WARN', 'PARTIAL_GATEWAY_ACCESS', {
        message: 'Some gateways cannot access metadata yet',
        metadataCid: metadataCid.substring(0, 20) + '...',
        workingGateways: metadataValidation.workingGateways.length,
        errors: metadataValidation.errors
      });
    }
    
    console.log('✅ Multi-gateway metadata validation successful!');
    addMintLog('SUCCESS', 'MULTI_GATEWAY_VALIDATION_SUCCESS', {
      metadataCid: metadataCid.substring(0, 20) + '...',
      workingGateways: metadataValidation.workingGateways.length,
      gateways: metadataValidation.workingGateways.map(url => new URL(url).hostname)
    });

    // 🔥 CRITICAL: Validate JSON content has valid image field before continuing
    console.log('📋 Validating metadata JSON contains valid image field...');
    
    // Use the working gateways from the previous validation
    if (metadataValidation.workingGateways.length > 0) {
      try {
        const testGatewayUrl = metadataValidation.workingGateways[0];
        console.log(`🔍 Validating JSON content via: ${testGatewayUrl}`);
        
        const jsonResponse = await fetch(testGatewayUrl, { 
          signal: AbortSignal.timeout(4000) 
        });
        
        if (jsonResponse.ok) {
          const jsonData = await jsonResponse.json();
          if (!jsonData.image || !jsonData.image.startsWith('ipfs://')) {
            console.log('❌ CRITICAL: Metadata JSON missing valid image field');
            addMintLog('ERROR', 'METADATA_JSON_INVALID', {
              hasImage: !!jsonData.image,
              imageValue: jsonData.image?.substring(0, 50) + '...',
              message: 'Metadata JSON does not contain valid ipfs:// image field'
            });
            throw new Error(`Upload incomplete: Metadata JSON at ${metadataCid} does not contain valid image field. Expected ipfs:// URL but got: ${jsonData.image || 'undefined'}`);
          }
          console.log(`✅ JSON validation successful:`, jsonData.image.substring(0, 50) + '...');
          addMintLog('SUCCESS', 'METADATA_JSON_VALIDATED', {
            imageField: jsonData.image.substring(0, 50) + '...'
          });
        } else {
          console.warn(`⚠️ JSON validation failed: HTTP ${jsonResponse.status}`);
        }
      } catch (jsonError) {
        console.warn(`⚠️ JSON validation error: ${jsonError.message}`);
      }
    }

    // 🔥 NEW: Multi-gateway validation for IMAGE with Promise.any + AbortController
    console.log('🖼️ Starting multi-gateway validation for image...');
    addMintLog('INFO', 'IMAGE_MULTI_GATEWAY_VALIDATION_START', { imageCid: cid });
    
    const finalImageIpfsUrl = `ipfs://${cid}`;
    // 🔥 RELAXED: Only require 1 gateway (don't block on propagation)
    const imageValidation = await validateMultiGatewayAccess(finalImageIpfsUrl, 1, 10000);
    
    if (!imageValidation.success) {
      // 🔥 FAIL-FAST: If 0 gateways work, abort the upload
      if (imageValidation.workingGateways.length === 0) {
        console.log('❌ CRITICAL: Zero gateways can access image - aborting upload');
        addMintLog('ERROR', 'ZERO_GATEWAYS_IMAGE_ACCESSIBLE', {
          message: 'No IPFS gateways can access the uploaded image',
          imageCid: cid.substring(0, 20) + '...',
          errors: imageValidation.errors
        });
        throw new Error('Upload failed: Image is not accessible from any IPFS gateway. Please try again.');
      }
      
      // If at least 1 gateway works, continue with warning
      console.log(`⚠️ WARNING: Only ${imageValidation.workingGateways.length} gateway(s) can access image - continuing`);
      addMintLog('WARN', 'PARTIAL_IMAGE_GATEWAY_ACCESS', {
        message: 'Some gateways cannot access image yet',
        imageCid: cid.substring(0, 20) + '...',
        workingGateways: imageValidation.workingGateways.length,
        errors: imageValidation.errors
      });
    }
    
    console.log('✅ Multi-gateway image validation successful!');
    addMintLog('SUCCESS', 'IMAGE_MULTI_GATEWAY_VALIDATION_SUCCESS', {
      imageCid: cid.substring(0, 20) + '...',
      workingGateways: imageValidation.workingGateways.length,
      gateways: imageValidation.workingGateways.map(url => new URL(url).hostname)
    });

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