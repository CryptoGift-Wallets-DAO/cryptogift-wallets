import { NextApiRequest, NextApiResponse } from 'next';
import { guardianSystem } from '../../../lib/guardianSystem';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ 
      error: 'Missing required parameter: walletAddress' 
    });
  }

  try {
    console.log(`📊 Getting guardian status for wallet: ${walletAddress.slice(0, 10)}...`);

    const setup = await guardianSystem.getGuardianSetup(walletAddress);

    if (!setup) {
      return res.status(404).json({
        success: false,
        message: 'No guardian system found for this wallet',
        hasGuardians: false
      });
    }

    const verifiedGuardians = setup.guardians.filter(g => g.status === 'verified').length;
    const totalGuardians = setup.guardians.length;
    const allVerified = verifiedGuardians === totalGuardians;

    // Calculate security level
    let securityLevel = 'Low';
    if (setup.status === 'active' && allVerified) {
      if (setup.requiredSignatures >= 3) securityLevel = 'Maximum';
      else if (setup.requiredSignatures >= 2) securityLevel = 'High';
      else securityLevel = 'Medium';
    }

    const response = {
      success: true,
      hasGuardians: true,
      status: setup.status,
      securityLevel,
      guardianInfo: {
        total: totalGuardians,
        verified: verifiedGuardians,
        allVerified,
        requiredSignatures: setup.requiredSignatures
      },
      guardians: setup.guardians.map(g => ({
        address: g.address,
        nickname: g.nickname,
        relationship: g.relationship,
        status: g.status,
        verificationMethod: g.verificationMethod,
        addedDate: g.addedDate,
        lastActivity: g.lastActivity
      })),
      setupInfo: {
        setupDate: setup.setupDate,
        lastModified: setup.lastModified,
        recoveryThreshold: setup.recoveryThreshold,
        recoveryLockPeriod: setup.recoveryLockPeriod
      },
      recommendations: generateRecommendations(setup)
    };

    console.log(`✅ Guardian status retrieved: ${setup.status} (${verifiedGuardians}/${totalGuardians} verified)`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error getting guardian status:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get guardian status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function generateRecommendations(setup: any): string[] {
  const recommendations: string[] = [];

  if (setup.status === 'configuring') {
    recommendations.push('Complete guardian verification to activate protection');
  }

  if (setup.guardians.length < 3) {
    recommendations.push('Consider adding a third guardian for maximum security');
  }

  if (setup.requiredSignatures < 2) {
    recommendations.push('Increase required signatures to at least 2 for better security');
  }

  const oldestActivity = setup.guardians
    .map(g => g.lastActivity ? new Date(g.lastActivity).getTime() : 0)
    .reduce((min, time) => Math.min(min, time), Date.now());

  const monthsInactive = (Date.now() - oldestActivity) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsInactive > 6) {
    recommendations.push('Contact guardians to verify they are still reachable');
  }

  if (setup.status === 'active') {
    recommendations.push('Your wallet is well protected! Keep guardian contacts updated');
  }

  return recommendations;
}