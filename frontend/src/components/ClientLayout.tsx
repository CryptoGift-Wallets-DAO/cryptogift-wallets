"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AmplitudeProvider } from "./monitoring/AmplitudeProvider";

// KILL-SWITCH: Dynamic import with SSR disabled for StaticBackground
const StaticBackground = dynamic(() => import("./ui/StaticBackground").then(mod => ({ default: mod.StaticBackground })), {
  ssr: false,
  loading: () => null
});

const ThirdwebWrapper = dynamic(() => import("./ThirdwebWrapper").then(mod => {
  console.log('🔍 ClientLayout: ThirdwebWrapper loaded successfully');
  return { default: mod.ThirdwebWrapper };
}).catch(err => {
  console.error('🚨 ClientLayout: ThirdwebWrapper failed to load:', err);
  throw err;
}), {
  ssr: false,
  loading: () => {
    console.log('🔍 ClientLayout: ThirdwebWrapper loading fallback showing...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Web3 components...</p>
        </div>
      </div>
    );
  }
});

const Navbar = dynamic(() => import("./Navbar").then(mod => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <div className="h-16 bg-background shadow-lg" />
});

const Footer = dynamic(() => import("./Footer").then(mod => ({ default: mod.Footer })), {
  ssr: false,
  loading: () => <div className="h-32 bg-background" />
});

const MintDebugger = dynamic(() => import("./MintDebugger").then(mod => ({ default: mod.MintDebugger })), {
  ssr: false,
  loading: () => null
});

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  console.log('🔍 ClientLayout: Rendering with children:', !!children);
  
  return (
    <ThemeProvider>
      <ThirdwebWrapper>
        <AmplitudeProvider>
          <ErrorBoundary>
            {/* FONDO ESTÁTICO - CON KILL-SWITCH */}
            {process.env.NEXT_PUBLIC_DISABLE_BG !== '1' && <StaticBackground />}
            
            {/* ESTRUCTURA PRINCIPAL */}
            <div className="relative min-h-screen flex flex-col">
              {/* NAVBAR ORIGINAL CON THEME TOGGLE */}
              <Navbar />
              
              {/* CONTENIDO PRINCIPAL */}
              <main className="flex-1 relative z-0">
                {children}
              </main>
              
              {/* FOOTER */}
              <Footer />
              <MintDebugger />
            </div>
          </ErrorBoundary>
        </AmplitudeProvider>
      </ThirdwebWrapper>
    </ThemeProvider>
  );
}