/**
 * CHECK APPROVER KEY CONFIGURATION
 * Verifies if the current private keys match the deployed approver
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: './frontend/.env.local' });

// Updated with NEW CONTRACT deployed with correct approver
const DEPLOYED_APPROVER_ADDRESS = '0x75e32B5BA0817fEF917f21902EC5a84005d00943';
const APPROVAL_GATE_ADDRESS = '0x99cCBE808cf4c01382779755DEf1562905ceb0d2';

console.log('🔍 CHECKING APPROVER KEY CONFIGURATION...\n');
console.log('SimpleApprovalGate Contract:', APPROVAL_GATE_ADDRESS);
console.log('Required Approver Address:', DEPLOYED_APPROVER_ADDRESS);
console.log('=' .repeat(60));

// Check APPROVER_PRIVATE_KEY
if (process.env.APPROVER_PRIVATE_KEY) {
  try {
    const wallet = new ethers.Wallet(process.env.APPROVER_PRIVATE_KEY);
    console.log('\n✅ APPROVER_PRIVATE_KEY is set');
    console.log('   Address:', wallet.address);
    
    if (wallet.address.toLowerCase() === DEPLOYED_APPROVER_ADDRESS.toLowerCase()) {
      console.log('   ✅ MATCHES deployed approver! Education bypass will work.');
    } else {
      console.log('   ❌ DOES NOT MATCH deployed approver!');
      console.log('   ⚠️  The contract will reject all signatures from this address.');
    }
  } catch (error) {
    console.log('\n❌ APPROVER_PRIVATE_KEY is invalid:', error.message);
  }
} else {
  console.log('\n⚠️  APPROVER_PRIVATE_KEY is not set');
}

// Check PRIVATE_KEY_DEPLOY
if (process.env.PRIVATE_KEY_DEPLOY) {
  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOY);
    console.log('\n✅ PRIVATE_KEY_DEPLOY is set');
    console.log('   Address:', wallet.address);
    
    if (wallet.address.toLowerCase() === DEPLOYED_APPROVER_ADDRESS.toLowerCase()) {
      console.log('   ✅ MATCHES deployed approver! Can be used as fallback.');
      console.log('   💡 TIP: The deployer is also the approver.');
    } else {
      console.log('   ℹ️  Does not match approver (deployer ≠ approver)');
    }
  } catch (error) {
    console.log('\n❌ PRIVATE_KEY_DEPLOY is invalid:', error.message);
  }
} else {
  console.log('\n⚠️  PRIVATE_KEY_DEPLOY is not set');
}

console.log('\n' + '=' .repeat(60));

// Final recommendation
let hasValidKey = false;

if (process.env.APPROVER_PRIVATE_KEY) {
  try {
    const wallet = new ethers.Wallet(process.env.APPROVER_PRIVATE_KEY);
    if (wallet.address.toLowerCase() === DEPLOYED_APPROVER_ADDRESS.toLowerCase()) {
      hasValidKey = true;
    }
  } catch {}
}

if (!hasValidKey && process.env.PRIVATE_KEY_DEPLOY) {
  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOY);
    if (wallet.address.toLowerCase() === DEPLOYED_APPROVER_ADDRESS.toLowerCase()) {
      hasValidKey = true;
    }
  } catch {}
}

if (hasValidKey) {
  console.log('✅ CONFIGURATION STATUS: VALID');
  console.log('   Education bypass signatures will work correctly.');
} else {
  console.log('❌ CONFIGURATION STATUS: INVALID');
  console.log('');
  console.log('⚠️  REQUIRED ACTION:');
  console.log('   You need the private key for address:', DEPLOYED_APPROVER_ADDRESS);
  console.log('');
  console.log('   Option 1: Set APPROVER_PRIVATE_KEY with the correct private key');
  console.log('   Option 2: If you have the deployment mnemonic/seed, derive the key');
  console.log('   Option 3: Deploy a new SimpleApprovalGate with your own approver');
  console.log('');
  console.log('   The current configuration will cause all education bypass attempts to fail');
  console.log('   with the error: GateCheckFailed');
}

console.log('\nMade by mbxarts.com The Moon in a Box property');
console.log('Co-Author: Godez22\n');