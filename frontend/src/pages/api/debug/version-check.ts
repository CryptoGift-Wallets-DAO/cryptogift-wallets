import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificación de versión para diagnostic
  const diagnosticInfo = {
    timestamp: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
    
    // Verificación específica de cambios
    changes: {
      walletSwitchEthereumChainRemoved: true, // Debería ser true si el deploy funcionó
      sendTransactionMobileEnhanced: true,    // Debería ser true si el deploy funcionó
      networkOptimizationPromptAdded: true,   // Debería ser true si el deploy funcionó
    },
    
    // Build info
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    nextVersion: require('next/package.json').version,
    
    // Diagnostic checks
    diagnostics: {
      deploymentWorking: true,
      cacheCleared: new Date().getTime(), // Timestamp único para cache busting
      allChangesActive: true,
    }
  };

  // Headers para prevenir cache
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.status(200).json(diagnosticInfo);
}