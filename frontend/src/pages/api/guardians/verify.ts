import { NextApiRequest, NextApiResponse } from 'next';
import { guardianSystem } from '../../../lib/guardianSystem';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress, guardianAddress, verificationCode, signature } = req.body;

  if (!walletAddress || !guardianAddress || !verificationCode) {
    return res.status(400).json({ 
      error: 'Missing required fields: walletAddress, guardianAddress, verificationCode' 
    });
  }

  try {
    console.log(`🔐 Verifying guardian ${guardianAddress.slice(0, 10)}... for wallet ${walletAddress.slice(0, 10)}...`);

    const result = await guardianSystem.verifyGuardian(
      walletAddress,
      guardianAddress,
      verificationCode,
      signature
    );

    if (result.success) {
      console.log(`✅ Guardian verification successful`);
      
      // Check if all guardians are verified
      const setup = await guardianSystem.getGuardianSetup(walletAddress);
      const allVerified = setup?.guardians.every(g => g.status === 'verified') || false;
      
      return res.status(200).json({
        success: true,
        message: result.message,
        allGuardiansVerified: allVerified,
        systemStatus: setup?.status || 'unknown',
        nextSteps: allVerified ? [
          'Guardian system is now ACTIVE',
          'Your wallet is protected by social recovery',
          'Guardians can initiate recovery if needed',
          'Keep your guardian contacts updated'
        ] : [
          'Guardian verified successfully',
          'Waiting for remaining guardians to verify',
          'System will be active once all guardians are verified'
        ]
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Error in guardian verification API:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Guardian verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}