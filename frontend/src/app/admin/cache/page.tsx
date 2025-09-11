"use client";

import { useState } from 'react';
import { CacheManager } from '../../../components/admin/CacheManager';

export default function CachePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <CacheManager isOpen={true} onClose={() => window.history.back()} />
    </div>
  );
}