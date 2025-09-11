"use client";

import React, { useEffect } from 'react';

/**
 * DISABLED: This page was causing interruptions in claim process
 * Authentication success is now handled inline in the same page
 */
export default function AuthenticatedPage() {
  useEffect(() => {
    // IMMEDIATE redirect - no delay, no interruption
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }, []);

  // Minimal loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirigiendo...</p>
      </div>
    </div>
  );
}