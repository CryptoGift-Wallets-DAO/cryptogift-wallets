"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { useEffect, useState } from "react";
import { getClient } from "../app/client";
import { baseSepolia } from "thirdweb/chains";

interface ThirdwebWrapperProps {
  children: React.ReactNode;
}

export function ThirdwebWrapper({ children }: ThirdwebWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [client, setClient] = useState(null);

  useEffect(() => {
    console.log('🔍 ThirdwebWrapper: Initializing...');
    // CRITICAL FIX: Initialize client safely
    const thirdwebClient = getClient();
    console.log('🔍 ThirdwebWrapper: Client result:', thirdwebClient ? 'SUCCESS' : 'NULL');
    
    if (thirdwebClient) {
      setClient(thirdwebClient);
      setMounted(true);
      console.log('🔍 ThirdwebWrapper: Client set, component mounted');
    } else {
      console.error('❌ CRITICAL: ThirdWeb client could not be initialized');
      // CRITICAL: Still mount even without client for fallback UI
      setMounted(true);
      console.log('🔍 ThirdwebWrapper: Mounted without client for fallback');
    }
  }, []);

  // CRITICAL FIX: Only show loading while not mounted
  if (!mounted) {
    console.log('🔍 ThirdwebWrapper: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Web3...</p>
        </div>
      </div>
    );
  }

  console.log('🔍 ThirdwebWrapper: Rendering provider with client:', !!client);
  
  // If no client available, render children without ThirdwebProvider
  if (!client) {
    console.log('🔍 ThirdwebWrapper: No client available, rendering children without provider');
    return (
      <div>
        {/* Fallback container for when ThirdWeb client is not available */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-center">
          <p className="text-yellow-800 text-sm">
            ⚠️ Wallet functionality temporarily unavailable. Some features may be limited.
          </p>
        </div>
        {children}
      </div>
    );
  }

  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}