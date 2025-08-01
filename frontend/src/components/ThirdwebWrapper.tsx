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
    // CRITICAL FIX: Initialize client safely
    const thirdwebClient = getClient();
    if (thirdwebClient) {
      setClient(thirdwebClient);
      setMounted(true);
    } else {
      console.error('❌ CRITICAL: ThirdWeb client could not be initialized');
    }
  }, []);

  // CRITICAL FIX: Only render loading state INSIDE provider context
  // Never render children outside ThirdwebProvider
  if (!mounted || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Web3...</p>
        </div>
      </div>
    );
  }

  return (
    <ThirdwebProvider client={client}>
      {children}
    </ThirdwebProvider>
  );
}