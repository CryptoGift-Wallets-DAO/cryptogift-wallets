"use client";

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary specifically for ThirdwebProvider context errors
 * Prevents the entire app from crashing due to useActiveAccount context issues
 */
export class SafeThirdwebWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a ThirdwebProvider context error
    if (error.message.includes('useActiveAccount must be used within <ThirdwebProvider>')) {
      return { hasError: true, error };
    }
    
    // For other errors, don't catch them
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('⚠️ ThirdwebProvider context error caught:', error.message);
    console.warn('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
          <div className="flex items-center space-x-2">
            <div className="text-yellow-600">⚠️</div>
            <div>
              <h3 className="text-yellow-800 font-medium">Wallet Connection Issue</h3>
              <p className="text-yellow-700 text-sm mt-1">
                There was a temporary issue with wallet connectivity. Please refresh the page.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Note: No custom hook needed - just use Error Boundary to catch context errors