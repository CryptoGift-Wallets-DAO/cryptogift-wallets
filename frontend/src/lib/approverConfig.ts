/**
 * APPROVER CONFIGURATION FOR EDUCATION BYPASS SYSTEM
 * 
 * CRITICAL: The SimpleApprovalGate contract at 0x3FEb03368cbF0970D4f29561dA200342D788eD6B
 * was deployed with a specific immutable approver address.
 * 
 * Contract Deployment (from DeployApprovalGate.s.sol):
 * - Approver: 0x1dBa3F54F9ef623b94398D96323B6a27F2A7b37B (hardcoded fallback in deployment script)
 * - This address is the ONLY one that can sign valid education bypass signatures
 * 
 * ROOT CAUSE OF GateCheckFailed ERROR:
 * The system was trying to sign with a different address, causing all signatures to be rejected.
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { ethers } from 'ethers';

// The deployed contract's immutable approver address (NEW CONTRACT)
export const DEPLOYED_APPROVER_ADDRESS = '0x75e32B5BA0817fEF917f21902EC5a84005d00943';

// SimpleApprovalGate contract address on Base Sepolia (NEW DEPLOYMENT)
export const APPROVAL_GATE_ADDRESS = '0x99cCBE808cf4c01382779755DEf1562905ceb0d2';

/**
 * Get the approver wallet for signing education bypass signatures
 * 
 * IMPORTANT: The private key must correspond to DEPLOYED_APPROVER_ADDRESS
 * Otherwise, all signatures will be rejected by the contract.
 * 
 * Priority order:
 * 1. APPROVER_PRIVATE_KEY - If set and matches the deployed approver
 * 2. PRIVATE_KEY_DEPLOY - If the deployer is also the approver (common pattern)
 * 
 * @returns Configured approver wallet or null if not available
 */
export function getApproverWallet(): ethers.Wallet | null {
  // Try APPROVER_PRIVATE_KEY first
  const approverKey = process.env.APPROVER_PRIVATE_KEY;
  if (approverKey) {
    try {
      const wallet = new ethers.Wallet(approverKey);
      
      // CRITICAL VALIDATION: Ensure the wallet matches the deployed approver
      if (wallet.address.toLowerCase() === DEPLOYED_APPROVER_ADDRESS.toLowerCase()) {
        console.log('✅ Using configured APPROVER_PRIVATE_KEY for address:', wallet.address);
        return wallet;
      } else {
        console.error('❌ APPROVER_PRIVATE_KEY does not match deployed approver!');
        console.error('Expected:', DEPLOYED_APPROVER_ADDRESS);
        console.error('Got:', wallet.address);
        console.error('The contract will reject all signatures from this address.');
      }
    } catch (error) {
      console.error('❌ Invalid APPROVER_PRIVATE_KEY format:', error);
    }
  }
  
  // Try PRIVATE_KEY_DEPLOY as fallback (if deployer is also approver)
  const deployKey = process.env.PRIVATE_KEY_DEPLOY;
  if (deployKey) {
    try {
      const wallet = new ethers.Wallet(deployKey);
      
      // Check if deploy key matches the approver
      if (wallet.address.toLowerCase() === DEPLOYED_APPROVER_ADDRESS.toLowerCase()) {
        console.log('✅ Using PRIVATE_KEY_DEPLOY as approver (deployer is approver)');
        return wallet;
      } else {
        console.log('ℹ️ Deploy key address:', wallet.address);
        console.log('ℹ️ Does not match approver:', DEPLOYED_APPROVER_ADDRESS);
      }
    } catch (error) {
      console.error('❌ Invalid PRIVATE_KEY_DEPLOY format:', error);
    }
  }
  
  console.error('🚨 CRITICAL: No valid approver key found!');
  console.error('The education bypass system will not work.');
  console.error('Required approver address:', DEPLOYED_APPROVER_ADDRESS);
  console.error('Please set APPROVER_PRIVATE_KEY with the private key for this address.');
  
  return null;
}

/**
 * Validate that the environment is properly configured for education bypass
 */
export function validateApproverConfig(): {
  isValid: boolean;
  approverAddress?: string;
  error?: string;
} {
  const wallet = getApproverWallet();
  
  if (!wallet) {
    return {
      isValid: false,
      error: `No private key configured for approver ${DEPLOYED_APPROVER_ADDRESS}`
    };
  }
  
  if (wallet.address.toLowerCase() !== DEPLOYED_APPROVER_ADDRESS.toLowerCase()) {
    return {
      isValid: false,
      approverAddress: wallet.address,
      error: `Wallet address ${wallet.address} does not match deployed approver ${DEPLOYED_APPROVER_ADDRESS}`
    };
  }
  
  return {
    isValid: true,
    approverAddress: wallet.address
  };
}