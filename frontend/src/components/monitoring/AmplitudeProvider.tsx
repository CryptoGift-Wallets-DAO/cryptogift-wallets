'use client';

import { useEffect } from 'react';
import { initAmplitude } from '@/lib/monitoring/amplitude';

export function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Amplitude only on client side
    if (typeof window !== 'undefined') {
      initAmplitude();
    }
  }, []);

  return <>{children}</>;
}