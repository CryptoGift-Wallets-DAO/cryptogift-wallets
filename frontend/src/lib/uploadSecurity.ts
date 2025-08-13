/**
 * 🔥 FASE 7H: Upload Security Configuration
 * Centralized security validation for file uploads
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

export interface UploadSecurityConfig {
  maxUploadSize: number;
  compressionThreshold: number;
  compressionQuality: number;
  maxImageWidth: number;
  maxImageHeight: number;
  allowedMimeTypes: string[];
  allowedDomains: string[];
  ipfsFetchTimeout: number;
}

/**
 * Get upload security configuration from environment variables with fallbacks
 */
export function getUploadSecurityConfig(): UploadSecurityConfig {
  return {
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '52428800'), // 50MB default
    compressionThreshold: parseInt(process.env.COMPRESSION_THRESHOLD || '2097152'), // 2MB default
    compressionQuality: parseInt(process.env.IMAGE_COMPRESSION_QUALITY || '80'),
    maxImageWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '2048'),
    maxImageHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '2048'),
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES
      ? process.env.ALLOWED_MIME_TYPES.split(',').map(t => t.trim())
      : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedDomains: process.env.ALLOWED_IPFS_DOMAINS
      ? process.env.ALLOWED_IPFS_DOMAINS.split(',').map(d => d.trim())
      : ['gateway.thirdweb.com', 'ipfs.io', 'cloudflare-ipfs.com', 'gateway.pinata.cloud', 'nftstorage.link'],
    ipfsFetchTimeout: parseInt(process.env.IPFS_FETCH_TIMEOUT || '10000')
  };
}

/**
 * Validate file size against configured limits
 */
export function validateFileSize(fileSize: number, config: UploadSecurityConfig): void {
  if (fileSize > config.maxUploadSize) {
    const maxSizeMB = Math.round(config.maxUploadSize / 1024 / 1024);
    const fileSizeMB = Math.round(fileSize / 1024 / 1024);
    throw new Error(`Security: File too large (${fileSizeMB}MB). Maximum ${maxSizeMB}MB allowed.`);
  }
}

/**
 * Validate MIME type against configured allowed types
 */
export function validateMimeType(mimeType: string, config: UploadSecurityConfig): void {
  if (!config.allowedMimeTypes.some(allowed => mimeType.includes(allowed))) {
    throw new Error(`Security: Invalid MIME type ${mimeType}. Only these types allowed: ${config.allowedMimeTypes.join(', ')}`);
  }
}

/**
 * Validate domain against configured allowed domains (prevent SSRF)
 */
export function validateDomain(url: string, config: UploadSecurityConfig): void {
  try {
    const urlHost = new URL(url).hostname;
    if (!config.allowedDomains.includes(urlHost)) {
      throw new Error(`Security: Domain ${urlHost} not allowed. Only these domains permitted: ${config.allowedDomains.join(', ')}`);
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Security: Invalid URL format: ${url}`);
    }
    throw error;
  }
}

/**
 * Check if file needs compression based on configured threshold
 */
export function shouldCompressFile(fileSize: number, mimeType: string | null, config: UploadSecurityConfig): boolean {
  return fileSize > config.compressionThreshold && (mimeType?.startsWith('image/') ?? false);
}

/**
 * Get Sharp compression options from configuration
 */
export function getCompressionOptions(config: UploadSecurityConfig) {
  return {
    quality: config.compressionQuality,
    maxWidth: config.maxImageWidth,
    maxHeight: config.maxImageHeight,
    progressive: true,
    fit: 'inside' as const,
    withoutEnlargement: true
  };
}

/**
 * Log security validation result
 */
export function logSecurityValidation(operation: string, details: Record<string, any>): void {
  console.log(`🛡️ [SECURITY] ${operation}:`, {
    timestamp: new Date().toISOString(),
    ...details
  });
}