import { createThirdwebClient } from "thirdweb";

let _client: ReturnType<typeof createThirdwebClient> | null = null;

export function getClient() {
  if (_client) return _client;
  
  const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
  
  if (!clientId) {
    if (typeof window === 'undefined') {
      // During build time, return null
      return null;
    }
    throw new Error("ThirdWeb client ID not found. Please set NEXT_PUBLIC_TW_CLIENT_ID in your environment variables.");
  }
  
  _client = createThirdwebClient({
    clientId: clientId,
  });
  
  return _client;
}

// For backward compatibility
export const client = typeof window === 'undefined' ? null : getClient();
