import { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

// ERC-20 ABI for allowance checking
const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, owner, spender, amount } = req.body;

    if (!token || !owner || !spender || !amount) {
      return res.status(400).json({ 
        error: 'Missing required parameters: token, owner, spender, amount' 
      });
    }

    // Connect to Base Sepolia RPC
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    
    // Create contract instance
    const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
    
    // Get current allowance
    const allowance = await tokenContract.allowance(owner, spender);
    
    // Convert amount to BigInt for comparison
    const requiredAmount = ethers.parseUnits(amount.toString(), 18);
    
    // Check if allowance is sufficient
    const hasAllowance = allowance >= requiredAmount;
    
    res.status(200).json({ 
      hasAllowance,
      currentAllowance: allowance.toString(),
      requiredAmount: requiredAmount.toString(),
      token,
      owner,
      spender
    });
    
  } catch (error) {
    console.error('Allowance check error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}