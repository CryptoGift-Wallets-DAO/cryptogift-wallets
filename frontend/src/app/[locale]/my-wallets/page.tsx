"use client";

import React from 'react';

export default function MyWalletsPageMinimal() {
  console.log('🔍 MyWalletsPageMinimal: Component loaded successfully');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🔧 My Wallets - Minimal Version (FROM LOCALE)
        </h1>
        <p className="text-gray-600 mb-4">
          This is a simplified version of the my-wallets page to test basic functionality.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            ✅ If you can see this page, the routing is working correctly.
          </p>
          <p className="text-orange-600 text-sm mt-2">
            📍 Loading from [locale]/my-wallets directory
          </p>
        </div>
      </div>
    </div>
  );
}