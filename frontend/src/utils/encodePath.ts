/**
 * FULL PATH ENCODING UTILITY
 * Encodes all path segments (not just filename) for block explorer compatibility
 * Handles IPFS URLs, HTTP URLs, and respects protocol/host/query parameters
 */

export function encodeAllPathSegments(url?: string): string {
  if (!url) return url || '';

  // IPFS URL: ipfs://CID/folder a/b c/file(1).png → ipfs://CID/folder%20a/b%20c/file(1).png
  if (url.startsWith('ipfs://')) {
    const rest = url.slice('ipfs://'.length);
    const [cid, ...parts] = rest.split('/');
    
    // Encode all path segments after the CID
    const encodedParts = parts.map(segment => 
      segment ? encodeURIComponent(segment) : segment
    );
    
    return `ipfs://${cid}${encodedParts.length > 0 ? '/' + encodedParts.join('/') : ''}`;
  }

  // HTTP/HTTPS URL: encode pathname segments while preserving protocol/host/query
  try {
    const urlObj = new URL(url);
    
    // Split pathname and encode each non-empty segment
    const pathSegments = urlObj.pathname.split('/').map(segment => 
      segment ? encodeURIComponent(segment) : segment
    );
    
    // Reconstruct pathname
    urlObj.pathname = pathSegments.join('/');
    
    // Return complete URL (query/fragment preserved automatically)
    return urlObj.toString();
  } catch (error) {
    // Malformed URL - return original (fail-open approach)
    console.warn(`⚠️ URL encoding failed for: ${url}, returning original`);
    return url;
  }
}