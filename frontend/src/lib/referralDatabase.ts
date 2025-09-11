// Simple file-based referral database for development
// In production, this should be replaced with a proper database

import { promises as fs } from 'fs';
import path from 'path';

export interface ReferralRecord {
  id: string;
  referrerAddress: string;
  referredAddress?: string;
  referredEmail?: string;
  referredIP?: string; // IP address for automatic account creation
  referredUserDisplay: string;
  registrationDate: string;
  status: 'registered' | 'activated' | 'active';
  source?: string;
  lastActivity: string;
  gifts: GiftRecord[];
  totalEarnings: number;
  isIPBased?: boolean; // Flag to indicate if account was created automatically by IP
}

export interface GiftRecord {
  id: string;
  tokenId: string;
  amount: number;
  commission: number;
  date: string;
  transactionHash?: string;
  status: 'completed' | 'pending';
  paymentStatus?: 'paid' | 'pending_blockchain' | 'pending_payment' | 'pending_review';
  estimatedPaymentDate?: string;
  pendingReason?: 'blockchain_confirmation' | 'payment_processing' | 'fraud_review' | 'manual_review';
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  conversionRate: number;
}

const REFERRALS_DIR = path.join('/tmp', 'referrals-data');
const REFERRALS_FILE = path.join(REFERRALS_DIR, 'referrals.json');

async function ensureReferralsDir() {
  try {
    await fs.access(REFERRALS_DIR);
  } catch {
    await fs.mkdir(REFERRALS_DIR, { recursive: true });
  }
}

async function loadReferrals(): Promise<ReferralRecord[]> {
  try {
    await ensureReferralsDir();
    const data = await fs.readFile(REFERRALS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveReferrals(referrals: ReferralRecord[]): Promise<void> {
  await ensureReferralsDir();
  await fs.writeFile(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
}

export async function trackReferralClick(referrerAddress: string, referredIdentifier: string, source?: string, ipAddress?: string): Promise<void> {
  console.log('🔗 Tracking referral click:', { referrerAddress, referredIdentifier, source });
  
  const referrals = await loadReferrals();
  
  // Check if this referral already exists (by IP or identifier)
  const existingReferral = referrals.find(r => 
    r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase() && 
    (r.referredUserDisplay === referredIdentifier || (ipAddress && r.referredIP === ipAddress))
  );
  
  if (existingReferral) {
    // Update last activity and merge information
    existingReferral.lastActivity = new Date().toISOString();
    if (ipAddress && !existingReferral.referredIP) {
      existingReferral.referredIP = ipAddress;
    }
    if (!existingReferral.isIPBased && referredIdentifier.startsWith('ip_')) {
      // This was an IP-based account, keep it marked as such
      existingReferral.isIPBased = true;
    }
    console.log('📝 Updated existing referral activity');
  } else {
    // Create new referral record
    const isIPBasedAccount = !referredIdentifier || referredIdentifier.startsWith('ip_');
    const displayIdentifier = isIPBasedAccount && ipAddress ? 
      `ip_${ipAddress.split('.').slice(-2).join('.')}` : // Show last 2 IP octets for privacy
      referredIdentifier;
    
    const newReferral: ReferralRecord = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      referrerAddress: referrerAddress.toLowerCase(),
      referredIP: ipAddress,
      referredUserDisplay: displayIdentifier,
      registrationDate: new Date().toISOString(),
      status: 'registered',
      source: source || 'direct',
      lastActivity: new Date().toISOString(),
      gifts: [],
      totalEarnings: 0,
      isIPBased: isIPBasedAccount
    };
    
    referrals.push(newReferral);
    console.log('✅ Created new referral record:', newReferral.id, isIPBasedAccount ? '(IP-based)' : '(user-based)');
  }
  
  await saveReferrals(referrals);
}

// Function to upgrade IP-based account to user account when they connect wallet/email
export async function upgradeIPAccountToUser(ipAddress: string, userAddress?: string, userEmail?: string): Promise<void> {
  console.log('🔄 Upgrading IP-based account to user account:', { ipAddress, userAddress: userAddress?.slice(0, 10) + '...', userEmail });
  
  const referrals = await loadReferrals();
  
  // Find IP-based referral record
  const ipReferral = referrals.find(r => r.referredIP === ipAddress && r.isIPBased);
  
  if (ipReferral) {
    // Update with user information
    if (userAddress) {
      ipReferral.referredAddress = userAddress.toLowerCase();
    }
    if (userEmail) {
      ipReferral.referredEmail = userEmail;
    }
    
    // Update display identifier
    ipReferral.referredUserDisplay = generateUserDisplay(userAddress, userEmail);
    ipReferral.isIPBased = false; // No longer IP-based
    ipReferral.lastActivity = new Date().toISOString();
    
    console.log('✅ Upgraded IP-based referral to user account:', {
      id: ipReferral.id,
      newDisplay: ipReferral.referredUserDisplay,
      referrer: ipReferral.referrerAddress.slice(0, 10) + '...'
    });
    
    await saveReferrals(referrals);
  } else {
    console.log('ℹ️ No IP-based referral found for upgrade:', ipAddress);
  }
}

export async function trackReferralActivation(
  referrerAddress: string, 
  referredIdentifier: string, 
  giftData: {
    tokenId: string;
    amount: number;
    commission: number;
    transactionHash?: string;
  }
): Promise<void> {
  console.log('🎁 Tracking referral activation:', { referrerAddress, referredIdentifier, giftData });
  
  const referrals = await loadReferrals();
  
  // Find referral by multiple criteria to handle IP->Wallet transitions
  const referral = referrals.find(r => {
    if (r.referrerAddress.toLowerCase() !== referrerAddress.toLowerCase()) {
      return false;
    }
    
    // Direct match by display identifier
    if (r.referredUserDisplay === referredIdentifier) {
      return true;
    }
    
    // Check if this is an IP-based account that now has a wallet address
    // Extract wallet address from referredIdentifier if it's a wallet format
    if (referredIdentifier.startsWith('...') && referredIdentifier.length === 9) {
      const walletSuffix = referredIdentifier.substring(3);
      // Check if the referral has a wallet address that matches this suffix
      if (r.referredAddress && r.referredAddress.toLowerCase().endsWith(walletSuffix.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  });
  
  if (referral) {
    // Update referral status
    referral.status = referral.gifts.length > 0 ? 'active' : 'activated';
    referral.lastActivity = new Date().toISOString();
    
    // Update display identifier to most recent info (IP-based -> Wallet-based)
    if (referral.isIPBased && referredIdentifier.startsWith('...')) {
      const oldDisplay = referral.referredUserDisplay;
      referral.referredUserDisplay = referredIdentifier;
      referral.isIPBased = false;
      console.log('🔄 Upgraded referral display from IP-based to wallet-based:', {
        oldDisplay,
        newDisplay: referredIdentifier
      });
    }
    
    // Add gift record with realistic pending status (testnet = pending blockchain confirmation)
    const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ID === '84532'; // Base Sepolia
    const giftRecord: GiftRecord = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenId: giftData.tokenId,
      amount: giftData.amount,
      commission: giftData.commission,
      date: new Date().toISOString(),
      transactionHash: giftData.transactionHash,
      status: 'completed', // Gift is completed
      paymentStatus: isTestnet ? 'pending_blockchain' : 'paid', // But payment pending on testnet
      pendingReason: isTestnet ? 'blockchain_confirmation' : undefined,
      estimatedPaymentDate: isTestnet ? 
        new Date(Date.now() + (1 + Math.random() * 4) * 60 * 60 * 1000).toISOString() : // 1-5 hours
        undefined
    };
    
    referral.gifts.push(giftRecord);
    referral.totalEarnings += giftData.commission;
    
    console.log('✅ Updated referral with activation:', referral.id);
  } else {
    console.warn('⚠️ Referral not found for activation:', { referrerAddress, referredIdentifier });
  }
  
  await saveReferrals(referrals);
}

export async function getReferralStats(referrerAddress: string): Promise<ReferralStats> {
  const referrals = await loadReferrals();
  const userReferrals = referrals.filter(r => r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase());
  
  const totalReferrals = userReferrals.length;
  const activeReferrals = userReferrals.filter(r => r.status === 'activated' || r.status === 'active').length;
  const totalEarnings = userReferrals.reduce((sum, r) => sum + r.totalEarnings, 0);
  const pendingRewards = 0; // For now, assuming all rewards are immediate
  const conversionRate = totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0;
  
  return {
    totalReferrals,
    activeReferrals,
    totalEarnings,
    pendingRewards,
    conversionRate
  };
}

export async function getUserReferrals(referrerAddress: string): Promise<ReferralRecord[]> {
  const referrals = await loadReferrals();
  return referrals.filter(r => r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase());
}

export async function getUserEarningsHistory(referrerAddress: string) {
  const referrals = await loadReferrals();
  const userReferrals = referrals.filter(r => r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase());
  
  const earnings = [];
  for (const referral of userReferrals) {
    for (const gift of referral.gifts) {
      earnings.push({
        id: gift.id,
        date: gift.date,
        amount: gift.commission,
        referredUser: referral.referredAddress || '',
        referredUserDisplay: referral.referredUserDisplay,
        giftAmount: gift.amount,
        giftTokenId: gift.tokenId,
        transactionHash: gift.transactionHash,
        status: gift.status
      });
    }
  }
  
  return earnings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getUserPendingRewards(referrerAddress: string) {
  const referrals = await loadReferrals();
  const userReferrals = referrals.filter(r => r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase());
  
  const pendingRewards = [];
  for (const referral of userReferrals) {
    for (const gift of referral.gifts) {
      // Only include rewards that are pending payment
      if (gift.paymentStatus && gift.paymentStatus !== 'paid') {
        pendingRewards.push({
          id: gift.id,
          date: gift.date,
          amount: gift.commission,
          referredUser: referral.referredAddress || '',
          referredUserDisplay: referral.referredUserDisplay,
          giftAmount: gift.amount,
          giftTokenId: gift.tokenId,
          estimatedCompletionDate: gift.estimatedPaymentDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          reason: gift.pendingReason || 'blockchain_confirmation',
          transactionHash: gift.transactionHash
        });
      }
    }
  }
  
  return pendingRewards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Helper function to generate user display identifier
export function generateUserDisplay(address?: string, email?: string): string {
  if (address && address.startsWith('0x')) {
    return `...${address.slice(-6)}`;
  }
  if (email) {
    const parts = email.split('@');
    if (parts.length === 2) {
      const [local, domain] = parts;
      return `${local.slice(0, 4)}...@${domain}`;
    }
  }
  return `user_${Date.now().toString().slice(-6)}`;
}