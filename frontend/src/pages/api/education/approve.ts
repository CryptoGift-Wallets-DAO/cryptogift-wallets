/**
 * EDUCATION APPROVAL API - EIP-712 SIGNATURE
 * Emits EIP-712 signatures for education completion
 * Stateless approval without on-chain writes
 * 
 * @author mbxarts.com The Moon in a Box property
 * @author Godez22 (Co-Author)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { kv } from '@vercel/kv';
import { debugLogger } from '../../../lib/secureDebugLogger';
import { secureLogger } from '../../../lib/secureLogger';

interface ApprovalRequest {
  sessionToken: string;
  tokenId: string;
  claimer: string;
  giftId: number;
}

interface ApprovalResponse {
  success: boolean;
  signature?: string;
  deadline?: number;
  gateData?: string; // Encoded signature + deadline for contract
  message?: string;
  error?: string;
}

// EIP-712 Domain Configuration
const EIP712_DOMAIN = {
  name: 'SimpleApprovalGate',
  version: '1',
  chainId: 84532, // Base Sepolia
  verifyingContract: process.env.NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS || '0x0000000000000000000000000000000000000000'
};

const EIP712_TYPES = {
  EducationApproval: [
    { name: 'claimer', type: 'address' },
    { name: 'giftId', type: 'uint256' },
    { name: 'requirementsVersion', type: 'uint16' },
    { name: 'deadline', type: 'uint256' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' }
  ]
};

const REQUIREMENTS_VERSION = 1; // Must match contract
const SIGNATURE_TTL = 3600; // 1 hour validity

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApprovalResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    const {
      sessionToken,
      tokenId,
      claimer
    }: Omit<ApprovalRequest, 'giftId'> & { giftId?: number } = req.body;
    
    // Validate required fields
    if (!sessionToken || !tokenId || !claimer) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: sessionToken, tokenId, claimer' 
      });
    }
    
    // Validate claimer address
    if (!ethers.isAddress(claimer)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid claimer address' 
      });
    }
    
    // Get session data to verify completion
    const sessionKey = `preclaim:session:${sessionToken}`;
    const sessionData = await kv.get<{
      tokenId: string;
      giftId: number;
      claimer: string;
      passwordValidated: boolean;
      requiresEducation: boolean;
      modules: number[];
      timestamp: number;
    }>(sessionKey);
    
    if (!sessionData) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired session' 
      });
    }
    
    // Use giftId from session data (authoritative source)
    const giftId = sessionData.giftId;
    
    // Verify session matches request
    if (sessionData.tokenId !== tokenId) {
      return res.status(403).json({ 
        success: false,
        error: 'Session mismatch - tokenId' 
      });
    }
    
    // Check if education is completed OR if this is a bypass request
    const completionKey = `education:${claimer}:${giftId}`;
    const approvalKey = `approval:${giftId}:${claimer}`;
    
    const [isCompleted, existingApproval] = await Promise.all([
      kv.get<boolean>(completionKey),
      kv.get<any>(approvalKey)
    ]);
    
    // BYPASS MODE: Allow approval if session is valid (simulates education completed)
    const isBypassRequest = sessionData.passwordValidated && sessionData.requiresEducation;
    
    if (!isCompleted && !existingApproval && !isBypassRequest) {
      return res.status(403).json({ 
        success: false,
        error: 'Education not completed and bypass not active' 
      });
    }
    
    // If this is a bypass request, mark education as completed
    if (isBypassRequest && !isCompleted) {
      try {
        await kv.set(completionKey, true, { ex: 86400 * 30 }); // 30 days
        debugLogger.operation('Education bypass activated', {
          tokenId,
          giftId,
          claimer: claimer.slice(0, 10) + '...',
          bypassMode: true
        });
      } catch (error) {
        console.error('Failed to mark education as completed via bypass:', error);
      }
    }
    
    // Check if approver wallet is configured
    const approverPrivateKey = process.env.APPROVER_PRIVATE_KEY;
    if (!approverPrivateKey) {
      // Fallback: Return success without signature (use mapping override)
      debugLogger.operation('Approval requested but no signer configured', {
        tokenId,
        giftId,
        claimer: claimer.slice(0, 10) + '...',
        fallback: 'mapping'
      });
      
      return res.status(200).json({
        success: true,
        message: 'Approval granted via mapping (signature not available)',
        gateData: '' // Empty - will trigger mapping check in contract
      });
    }
    
    // Create signer wallet
    const approverWallet = new ethers.Wallet(approverPrivateKey);
    
    // Calculate deadline (current time + TTL)
    const deadline = Math.floor(Date.now() / 1000) + SIGNATURE_TTL;
    
    // Prepare EIP-712 message
    const message = {
      claimer,
      giftId: BigInt(giftId),
      requirementsVersion: REQUIREMENTS_VERSION,
      deadline: BigInt(deadline),
      chainId: BigInt(EIP712_DOMAIN.chainId),
      verifyingContract: EIP712_DOMAIN.verifyingContract
    };
    
    // Sign the message
    const signature = await approverWallet.signTypedData(
      EIP712_DOMAIN,
      EIP712_TYPES,
      message
    );
    
    // Encode gate data for contract (signature + deadline)
    const gateData = ethers.concat([
      signature,
      ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [deadline])
    ]);
    
    // Log approval (secure - no private data)
    secureLogger.info('Education approval signature issued', {
      tokenId,
      giftId,
      claimer: claimer.slice(0, 10) + '...',
      deadline,
      signatureHash: ethers.keccak256(signature).slice(0, 10) + '...',
      approver: approverWallet.address
    });
    
    debugLogger.operation('EIP-712 approval signature created', {
      tokenId,
      giftId,
      requirementsVersion: REQUIREMENTS_VERSION,
      deadline,
      ttl: SIGNATURE_TTL,
      chainId: EIP712_DOMAIN.chainId,
      verifyingContract: EIP712_DOMAIN.verifyingContract
    });
    
    return res.status(200).json({
      success: true,
      signature,
      deadline,
      gateData: gateData,
      message: `Approval signature valid until ${new Date(deadline * 1000).toISOString()}`
    });
    
  } catch (error: any) {
    console.error('💥 APPROVAL SIGNATURE ERROR:', error);
    debugLogger.operation('Approval signature error', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}