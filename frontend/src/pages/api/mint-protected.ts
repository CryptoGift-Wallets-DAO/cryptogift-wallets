import { NextApiRequest, NextApiResponse } from "next";
import { rateLimit, RATE_LIMITS, getClientIdentifier } from "../../lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.MINT);
    
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many mint requests. Please wait before trying again.',
        resetTime: rateLimitResult.resetTime,
        maxRequests: RATE_LIMITS.MINT.maxRequests,
        windowMs: RATE_LIMITS.MINT.windowMs,
      });
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMITS.MINT.maxRequests);
    res.setHeader('X-RateLimit-Remaining', RATE_LIMITS.MINT.maxRequests - rateLimitResult.count);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);
    
    // Your existing mint logic here
    const { to, amount, referrer, metadata } = req.body;
    
    if (!to || !amount) {
      return res.status(400).json({ error: 'Missing required parameters: to, amount' });
    }
    
    // Validate amount limits
    const minAmount = 5; // Minimum $5 USD
    const maxAmount = 1000; // Maximum $1000 USD
    
    if (amount < minAmount || amount > maxAmount) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: `Amount must be between $${minAmount} and $${maxAmount}`,
        minAmount,
        maxAmount
      });
    }
    
    // Log the mint request for monitoring
    console.log(`Mint request from ${identifier}:`, {
      to,
      amount,
      referrer,
      timestamp: new Date().toISOString(),
    });
    
    // TODO: Implement your actual mint logic here
    // This would typically involve:
    // 1. Validating the recipient address
    // 2. Processing the payment
    // 3. Minting the NFT
    // 4. Creating the Token Bound Account
    // 5. Crediting referrer fees
    
    res.status(200).json({ 
      success: true,
      message: 'Mint request processed successfully',
      rateLimitInfo: {
        remaining: RATE_LIMITS.MINT.maxRequests - rateLimitResult.count,
        resetTime: rateLimitResult.resetTime,
      }
    });
    
  } catch (error) {
    console.error('Mint API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}