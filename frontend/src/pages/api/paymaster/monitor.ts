import { NextApiRequest, NextApiResponse } from 'next';

// Paymaster monitoring and limits for crypto novice users
interface PaymasterLimits {
  dailyGasLimit: number; // in wei
  maxTransactionsPerDay: number;
  maxAmountPerTransaction: number; // in USDC cents
  cooldownPeriod: number; // in minutes
}

// Default limits for new users (crypto novices)
const DEFAULT_LIMITS: PaymasterLimits = {
  dailyGasLimit: 0.002 * 1e18, // 0.002 ETH worth of gas per day
  maxTransactionsPerDay: 10,
  maxAmountPerTransaction: 100 * 100, // $100 USDC
  cooldownPeriod: 5 // 5 minute cooldown between large transactions
};

// In-memory storage for demo (should use Redis in production)
const userLimits = new Map<string, {
  limits: PaymasterLimits;
  dailyUsage: {
    gasUsed: number;
    transactionCount: number;
    lastReset: number;
  };
  lastTransactionTime: number;
}>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleLimitCheck(req, res);
  } else if (req.method === 'GET') {
    return handleGetLimits(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleLimitCheck(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userAddress, gasEstimate, transactionAmount, transactionType } = req.body;

    if (!userAddress) {
      return res.status(400).json({ error: 'User address required' });
    }

    // Get or create user limits
    let userData = userLimits.get(userAddress.toLowerCase());
    if (!userData) {
      userData = {
        limits: DEFAULT_LIMITS,
        dailyUsage: {
          gasUsed: 0,
          transactionCount: 0,
          lastReset: Date.now()
        },
        lastTransactionTime: 0
      };
      userLimits.set(userAddress.toLowerCase(), userData);
    }

    // Reset daily usage if needed (24 hours)
    const now = Date.now();
    if (now - userData.dailyUsage.lastReset > 24 * 60 * 60 * 1000) {
      userData.dailyUsage = {
        gasUsed: 0,
        transactionCount: 0,
        lastReset: now
      };
    }

    // Check limits
    const checks = {
      dailyGasLimit: userData.dailyUsage.gasUsed + gasEstimate <= userData.limits.dailyGasLimit,
      dailyTransactionLimit: userData.dailyUsage.transactionCount < userData.limits.maxTransactionsPerDay,
      amountLimit: !transactionAmount || transactionAmount <= userData.limits.maxAmountPerTransaction,
      cooldown: now - userData.lastTransactionTime >= userData.limits.cooldownPeriod * 60 * 1000
    };

    const allowed = Object.values(checks).every(check => check);

    if (allowed) {
      // Update usage
      userData.dailyUsage.gasUsed += gasEstimate;
      userData.dailyUsage.transactionCount += 1;
      userData.lastTransactionTime = now;
      userLimits.set(userAddress.toLowerCase(), userData);
    }

    res.status(200).json({
      allowed,
      checks,
      remainingLimits: {
        gasRemaining: userData.limits.dailyGasLimit - userData.dailyUsage.gasUsed,
        transactionsRemaining: userData.limits.maxTransactionsPerDay - userData.dailyUsage.transactionCount,
        nextAvailableTime: userData.lastTransactionTime + (userData.limits.cooldownPeriod * 60 * 1000)
      },
      userType: 'crypto_novice' // Could be determined based on transaction history
    });

  } catch (error) {
    console.error('❌ Paymaster limit check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetLimits(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userAddress } = req.query;

    if (!userAddress || typeof userAddress !== 'string') {
      return res.status(400).json({ error: 'User address required' });
    }

    const userData = userLimits.get(userAddress.toLowerCase());
    
    if (!userData) {
      return res.status(200).json({
        limits: DEFAULT_LIMITS,
        usage: {
          gasUsed: 0,
          transactionCount: 0,
          lastReset: Date.now()
        },
        userType: 'new_user'
      });
    }

    res.status(200).json({
      limits: userData.limits,
      usage: userData.dailyUsage,
      userType: 'crypto_novice'
    });

  } catch (error) {
    console.error('❌ Get limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}