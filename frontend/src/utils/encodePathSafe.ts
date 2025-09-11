/**
 * UNIVERSAL SAFE PATH ENCODING UTILITY - SINGLE SOURCE OF TRUTH
 * Prevents double-encoding, handles malformed URLs, preserves query/hash
 * Supports IPFS, HTTP, HTTPS while excluding data: and ar: schemes
 */

export function encodeAllPathSegmentsSafe(input?: string): string {
  if (!input) return input ?? '';
  
  // EXCLUSIONS: Do not re-encode special schemes
  if (input.startsWith('data:') || input.startsWith('ar://')) {
    return input;
  }

  /**
   * SAFE ENCODING PER SEGMENT with orphaned % normalization
   * Normalizes orphaned % characters before decode/encode cycle
   */
  const safeEncodeSeg = (seg: string): string => {
    if (seg === '') return '';
    
    // Normalize orphaned % characters (50%.png → 50%25.png)
    let normalizedSeg = seg.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
    
    try {
      return encodeURIComponent(decodeURIComponent(normalizedSeg));
    } catch {
      // Total tolerance: if decode fails, just encode as-is
      return encodeURIComponent(normalizedSeg);
    }
  };

  // IPFS scheme: ipfs://CID/path/to/file.png?x=1#hash
  if (input.startsWith('ipfs://')) {
    const rest = input.slice('ipfs://'.length);
    const qhIndex = rest.search(/[?#]/);
    const pathPart = qhIndex === -1 ? rest : rest.slice(0, qhIndex);
    const tail = qhIndex === -1 ? '' : rest.slice(qhIndex);
    
    return `ipfs://${pathPart.split('/').map(safeEncodeSeg).join('/')}${tail}`;
  }

  // HTTP/HTTPS: https://gateway/ipfs/CID/path a/b.png?x=1#h
  try {
    const url = new URL(input);
    const normalizedPath = url.pathname.split('/').map(safeEncodeSeg).join('/');
    
    // Preserve origin, query, and hash
    return `${url.origin}${normalizedPath}${url.search}${url.hash}`;
  } catch {
    // Fallback for malformed URLs
    const qhIndex = input.search(/[?#]/);
    const pathPart = qhIndex === -1 ? input : input.slice(0, qhIndex);
    const tail = qhIndex === -1 ? '' : input.slice(qhIndex);
    
    return `${pathPart.split('/').map(safeEncodeSeg).join('/')}${tail}`;
  }
}