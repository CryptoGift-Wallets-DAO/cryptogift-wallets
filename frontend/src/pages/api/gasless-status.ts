/**
 * GASLESS STATUS API
 * Returns current gasless configuration status to prevent anomalous transactions
 * Allows frontend to check if gasless is enabled before attempting gasless operations
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface GaslessStatusResponse {
  enabled: boolean;
  temporarilyDisabled: boolean;
  reason?: string;
  status: 'available' | 'disabled' | 'error';
  biconomyConfigured: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GaslessStatusResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      enabled: false,
      temporarilyDisabled: true,
      status: 'error',
      biconomyConfigured: false,
      message: 'Method not allowed',
      reason: 'Only GET requests are allowed'
    });
  }
  
  try {
    // Check the same gasless temporary disable flag used in mint-escrow.ts
    const gaslessTemporarilyDisabled = true; // This should match the flag in mint-escrow.ts
    
    // Check if Biconomy is properly configured
    const biconomyConfigured = !!(
      process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL &&
      process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL &&
      process.env.PRIVATE_KEY_DEPLOY
    );
    
    console.log('🔍 GASLESS STATUS CHECK:', {
      gaslessTemporarilyDisabled,
      biconomyConfigured,
      hasPaymasterUrl: !!process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL,
      hasBundlerUrl: !!process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL,
      hasDeployKey: !!process.env.PRIVATE_KEY_DEPLOY
    });
    
    if (gaslessTemporarilyDisabled) {
      return res.status(200).json({
        enabled: false,
        temporarilyDisabled: true,
        status: 'disabled',
        biconomyConfigured,
        message: 'Gasless transactions are temporarily disabled for system robustness',
        reason: 'Focusing on gas-paid robustness before re-enabling gasless features'
      });
    }
    
    if (!biconomyConfigured) {
      return res.status(200).json({
        enabled: false,
        temporarilyDisabled: false,
        status: 'error',
        biconomyConfigured: false,
        message: 'Gasless transactions are not available due to configuration issues',
        reason: 'Biconomy environment variables not properly configured'
      });
    }
    
    // If we get here, gasless should be available
    return res.status(200).json({
      enabled: true,
      temporarilyDisabled: false,
      status: 'available',
      biconomyConfigured: true,
      message: 'Gasless transactions are available and enabled'
    });
    
  } catch (error: any) {
    console.error('❌ Error checking gasless status:', error);
    
    return res.status(500).json({
      enabled: false,
      temporarilyDisabled: true,
      status: 'error',
      biconomyConfigured: false,
      message: 'Error checking gasless status',
      reason: error.message || 'Internal server error'
    });
  }
}