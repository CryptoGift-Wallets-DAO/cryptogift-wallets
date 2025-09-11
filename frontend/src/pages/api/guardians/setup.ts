import { NextApiRequest, NextApiResponse } from 'next';
import { guardianSystem } from '../../../lib/guardianSystem';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress, guardians, requiredSignatures } = req.body;

  if (!walletAddress || !guardians || !Array.isArray(guardians)) {
    return res.status(400).json({ 
      error: 'Missing required fields: walletAddress, guardians array' 
    });
  }

  try {
    console.log(`🛡️ Setting up guardian system for wallet: ${walletAddress.slice(0, 10)}...`);
    console.log(`👥 ${guardians.length} guardians, ${requiredSignatures || 2} signatures required`);

    const result = await guardianSystem.setupGuardians(
      walletAddress,
      guardians,
      requiredSignatures || Math.min(2, guardians.length)
    );

    if (result.success) {
      console.log(`✅ Guardian setup successful: ${result.setupId}`);
      
      // In production, you would send verification emails/SMS here
      // For now, we return verification codes for testing
      
      return res.status(200).json({
        success: true,
        message: 'Guardian system setup initiated successfully',
        setupId: result.setupId,
        verificationCodes: result.verificationCodes, // Remove in production
        nextSteps: [
          'Verification codes have been sent to each guardian',
          'Each guardian must verify their identity using their code',
          'System will be active once all guardians are verified',
          `Recovery requires ${requiredSignatures || 2} guardian signatures`
        ]
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Guardian setup failed'
      });
    }

  } catch (error) {
    console.error('❌ Error in guardian setup API:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Guardian setup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}