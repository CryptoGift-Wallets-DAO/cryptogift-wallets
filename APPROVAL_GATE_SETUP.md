# SimpleApprovalGate Configuration Guide

## 🚨 CRITICAL: Education Bypass System Setup

### Contract Information
- **Contract Address**: `0x3FEb03368cbF0970D4f29561dA200342D788eD6B`
- **Network**: Base Sepolia (Chain ID: 84532)
- **BaseScan**: https://sepolia.basescan.org/address/0x3feb03368cbf0970d4f29561da200342d788ed6b

### Required Environment Variables

Add these to your Vercel environment variables:

```env
# Gate Contract Address (already in .env.example)
SIMPLE_APPROVAL_GATE_ADDRESS=0x3FEb03368cbF0970D4f29561dA200342D788eD6B
NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS=0x3FEb03368cbF0970D4f29561dA200342D788eD6B

# Approver Private Key (CRITICAL - must be authorized in contract)
APPROVER_PRIVATE_KEY=your_authorized_approver_private_key_here
```

### ⚠️ IMPORTANT: Approver Setup

The `APPROVER_PRIVATE_KEY` must correspond to an address that is:
1. **Authorized in the SimpleApprovalGate contract** as a valid approver
2. **Has the APPROVER_ROLE** in the contract
3. **Can sign EIP-712 education bypass messages**

### Current Issue (as of Aug 19, 2025)

The error `GateCheckFailed - 245,0x3FEb03368cbF0970D4f29561dA200342D788eD6B,1` indicates:
- The signature is being created correctly
- The contract is being called correctly
- BUT the approver (`0x75e3...d00943`) is not authorized in the contract

### How to Fix

1. **Check Current Approvers**:
   - Go to the contract on BaseScan
   - Read the contract to see authorized approvers
   - Or check with contract owner

2. **Option A: Add Current Signer as Approver**
   - Contract owner needs to call `grantRole(APPROVER_ROLE, 0x75e3...d00943)`
   - This authorizes the current signer

3. **Option B: Use Different Private Key**
   - Get the private key of an already-authorized approver
   - Update `APPROVER_PRIVATE_KEY` in Vercel environment

4. **Option C: Deploy New Contract**
   - Deploy a new SimpleApprovalGate with correct approvers
   - Update all environment variables to new contract address

### Testing the Fix

Once configured:
1. Create a new gift with education requirements
2. Validate the password
3. Click the bypass button
4. Should generate valid EIP-712 signature
5. Claim should succeed without `GateCheckFailed` error

### Security Notes

- **NEVER** commit private keys to git
- **ONLY** store `APPROVER_PRIVATE_KEY` in Vercel environment variables
- **ROTATE** keys regularly for security
- **MONITOR** contract for unauthorized approvals

### Contract Interaction

The SimpleApprovalGate contract expects:
- `claimer`: Address claiming the gift
- `giftId`: The gift being claimed
- `requirementsVersion`: Must be 1
- `deadline`: Unix timestamp for signature expiry
- `chainId`: Must be 84532
- `verifyingContract`: Must match the gate contract address

### Debugging

If you see `GateCheckFailed`, check:
1. Is `APPROVER_PRIVATE_KEY` set in Vercel?
2. Is the approver address authorized in the contract?
3. Are all EIP-712 parameters correct?
4. Is the deadline still valid (not expired)?

Made by mbxarts.com The Moon in a Box property
Co-Author: Godez22