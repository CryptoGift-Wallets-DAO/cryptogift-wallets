/**
 * DEMO GIFT GENERATOR
 * Sistema para generar gifts de demostración para el módulo de ventas
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

// Simple UUID generator to avoid external dependency
function generateId(): string {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface DemoGift {
  id: string;
  tokenId: string;
  claimUrl: string;
  expiresAt: number;
  password: string;
  claimed: boolean;
}

class DemoGiftService {
  private static instance: DemoGiftService;
  private activeGifts: Map<string, DemoGift> = new Map();
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cryptogift-wallets.vercel.app';
  }

  static getInstance(): DemoGiftService {
    if (!this.instance) {
      this.instance = new DemoGiftService();
    }
    return this.instance;
  }

  /**
   * Genera un gift de demostración temporal
   */
  generateDemoGift(sessionId: string): DemoGift {
    const giftId = `demo-${generateId().slice(0, 8)}`;
    const tokenId = `DEMO-${Math.floor(Math.random() * 10000)}`;
    
    const gift: DemoGift = {
      id: giftId,
      tokenId,
      claimUrl: `${this.baseUrl}/gift/claim/${giftId}`,
      expiresAt: Date.now() + (2 * 60 * 1000), // 2 minutos
      password: 'DEMO123', // Password simple para demo
      claimed: false
    };

    this.activeGifts.set(sessionId, gift);
    
    // Auto-cleanup después de expirar
    setTimeout(() => {
      this.activeGifts.delete(sessionId);
    }, 3 * 60 * 1000);

    return gift;
  }

  /**
   * Simula el claim de un gift
   */
  async claimDemoGift(sessionId: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const gift = this.activeGifts.get(sessionId);
    
    if (!gift) {
      return { 
        success: false, 
        error: 'Gift no encontrado o expirado' 
      };
    }

    if (gift.claimed) {
      return { 
        success: false, 
        error: 'Gift ya reclamado' 
      };
    }

    if (Date.now() > gift.expiresAt) {
      return { 
        success: false, 
        error: 'Gift expirado' 
      };
    }

    // Simular delay de transacción
    await new Promise(resolve => setTimeout(resolve, 2000));

    gift.claimed = true;
    
    // Generar hash de transacción simulado
    const txHash = `0x${Array.from({length: 64}, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    return {
      success: true,
      transactionHash: txHash
    };
  }

  /**
   * Verifica el estado de un gift
   */
  getGiftStatus(sessionId: string): {
    exists: boolean;
    claimed?: boolean;
    expired?: boolean;
  } {
    const gift = this.activeGifts.get(sessionId);
    
    if (!gift) {
      return { exists: false };
    }

    return {
      exists: true,
      claimed: gift.claimed,
      expired: Date.now() > gift.expiresAt
    };
  }

  /**
   * Limpia todos los gifts activos (para cleanup)
   */
  clearAllGifts(): void {
    this.activeGifts.clear();
  }
}

export const demoGiftService = DemoGiftService.getInstance();

/**
 * Hook para usar en componentes React
 */
export function useDemoGift(sessionId: string) {
  const [gift, setGift] = React.useState<DemoGift | null>(null);
  const [claiming, setClaiming] = React.useState(false);
  const [claimResult, setClaimResult] = React.useState<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  } | null>(null);

  const generateGift = React.useCallback(() => {
    const newGift = demoGiftService.generateDemoGift(sessionId);
    setGift(newGift);
    return newGift;
  }, [sessionId]);

  const claimGift = React.useCallback(async () => {
    setClaiming(true);
    try {
      const result = await demoGiftService.claimDemoGift(sessionId);
      setClaimResult(result);
      if (result.success && gift) {
        setGift({ ...gift, claimed: true });
      }
      return result;
    } finally {
      setClaiming(false);
    }
  }, [sessionId, gift]);

  const checkStatus = React.useCallback(() => {
    return demoGiftService.getGiftStatus(sessionId);
  }, [sessionId]);

  return {
    gift,
    claiming,
    claimResult,
    generateGift,
    claimGift,
    checkStatus
  };
}

// Import React for the hook
import React from 'react';