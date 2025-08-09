/**
 * SAFE PATH ENCODING UTILITY
 * Prevents double-encoding by normalizing before encoding
 * Critical fix for wallet image compatibility
 */

export function encodeAllPathSegmentsSafe(url?: string): string {
  if (!url) return url || '';

  // IPFS URL: ipfs://CID/folder with spaces/file (1).png
  if (url.startsWith('ipfs://')) {
    const rest = url.slice('ipfs://'.length);
    const [cid, ...parts] = rest.split('/');
    
    // Safe encode: decode first to prevent double-encoding
    const encodedParts = parts.map(segment => {
      if (!segment) return segment;
      try {
        // Normalize: decode then encode to prevent %20 → %2520
        return encodeURIComponent(decodeURIComponent(segment));
      } catch (error) {
        // Fallback: encode as-is if decoding fails
        return encodeURIComponent(segment);
      }
    });
    
    return `ipfs://${cid}${encodedParts.length > 0 ? '/' + encodedParts.join('/') : ''}`;
  }

  // HTTP/HTTPS URL: preserve protocol/host/query while fixing pathname
  try {
    const urlObj = new URL(url);
    
    // Safe encode each path segment
    const pathSegments = urlObj.pathname.split('/').map(segment => {
      if (!segment) return segment;
      try {
        // Critical: normalize to prevent double-encoding
        return encodeURIComponent(decodeURIComponent(segment));
      } catch (error) {
        // Fallback: encode as-is if already malformed
        return encodeURIComponent(segment);
      }
    });
    
    urlObj.pathname = pathSegments.join('/');
    return urlObj.toString();
  } catch (error) {
    // Fail-open: return original URL if parsing fails
    console.warn(`⚠️ Safe encoding failed for: ${url}, returning original`);
    return url;
  }
}