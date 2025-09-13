import { createThirdwebClient } from "thirdweb";

let _client: ReturnType<typeof createThirdwebClient> | null = null;

export function getClient() {
  if (_client) return _client;
  
  const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
  
  if (!clientId) {
    console.error('❌ CRITICAL: NEXT_PUBLIC_TW_CLIENT_ID not found in environment');
    if (typeof window === 'undefined') {
      // During build time, return null gracefully
      return null;
    }
    throw new Error("ThirdWeb client ID not found. Please set NEXT_PUBLIC_TW_CLIENT_ID in your environment variables.");
  }
  
  console.log('✅ THIRDWEB CLIENT: Initializing with clientId:', clientId.slice(0, 8) + '...');
  
  _client = createThirdwebClient({
    clientId: clientId,
  });
  
  console.log('✅ THIRDWEB CLIENT: Successfully created');
  
  return _client;
}

// SAFE CLIENT EXPORT: Create client dynamically to handle SSR
export const client = typeof window !== 'undefined' ? getClient() : null;

// Export a getter function for components that need to ensure client is available
export const getClientSafe = () => {
  if (typeof window === 'undefined') return null;
  return getClient();
};
