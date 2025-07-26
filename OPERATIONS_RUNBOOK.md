# 🚨 CRYPTOGIFT ESCROW - OPERATIONS RUNBOOK

## 📞 EMERGENCY CONTACTS
- **Technical Lead**: Godez22
- **Security Team**: mbxarts.com team
- **Infrastructure**: Base Network Support

## 🔥 EMERGENCY PROCEDURES

### 🛑 PAUSE CONTRACT (Critical Issues)
```bash
# Connect to production wallet
# Execute pause
cast send $ESCROW_ADDRESS "pause()" --private-key $EMERGENCY_KEY --rpc-url $RPC_URL

# Verify pause status
cast call $ESCROW_ADDRESS "paused()" --rpc-url $RPC_URL
```

### 🔄 UNPAUSE CONTRACT (After Fix)
```bash
# Only after thorough verification
cast send $ESCROW_ADDRESS "unpause()" --private-key $EMERGENCY_KEY --rpc-url $RPC_URL
```

### 🚪 DISABLE MALICIOUS GATE
```bash
# If gate is causing issues
cast send $ESCROW_ADDRESS "disableGate(address,string)" $GATE_ADDRESS "Security issue detected" --private-key $GATE_MANAGER_KEY --rpc-url $RPC_URL
```

### 🔧 EMERGENCY GIFT RETURN
```bash
# Return specific gift in emergency
cast send $ESCROW_ADDRESS "emergencyReturn(uint256)" $GIFT_ID --private-key $EMERGENCY_KEY --rpc-url $RPC_URL
```

## 📊 MONITORING ALERTS

### 🔍 **Critical Alerts**
1. **Contract Paused**: Immediate action required
2. **Paymaster Balance < 0.1 ETH**: Refill within 2 hours
3. **Failed UserOps > 100/hour**: Investigate abuse
4. **Slither/Mythril Alerts**: Security review needed

### ⚠️ **Warning Alerts**
1. **High Gas Usage**: Optimize if > 200k per claim
2. **Gate Failures**: Check gate health
3. **Batch Processing Slow**: Increase gas limits
4. **Storage Bloat**: Monitor state size

## 🔧 MAINTENANCE PROCEDURES

### 💰 PAYMASTER REFILL
```bash
# Check current balance
cast balance $ESCROW_ADDRESS --rpc-url $RPC_URL

# Send ETH to contract for paymaster
cast send $ESCROW_ADDRESS --value 1ether --private-key $TREASURY_KEY --rpc-url $RPC_URL
```

### 🧹 CLEANUP EXPIRED GIFTS (Batch)
```bash
# Get expired gifts list
node scripts/getExpiredGifts.js

# Execute batch return with incentive
cast send $ESCROW_ADDRESS "batchReturnExpiredIncentivized(uint256[],address)" "[1,2,3,4,5]" $INCENTIVE_RECIPIENT --private-key $OPERATOR_KEY --rpc-url $RPC_URL
```

### 🔍 HEALTH CHECK SCRIPT
```bash
#!/bin/bash
# healthcheck.sh

echo "🔍 ESCROW HEALTH CHECK"
echo "====================="

# Contract status
PAUSED=$(cast call $ESCROW_ADDRESS "paused()" --rpc-url $RPC_URL)
echo "Paused: $PAUSED"

# Balance check
BALANCE=$(cast balance $ESCROW_ADDRESS --rpc-url $RPC_URL)
echo "Balance: $BALANCE"

# Recent events
echo "Recent events:"
cast logs --address $ESCROW_ADDRESS --from-block -100 --rpc-url $RPC_URL

# Gas price
echo "Current gas price:"
cast gas-price --rpc-url $RPC_URL
```

## 🚨 INCIDENT RESPONSE

### 📋 **Severity Levels**

**🔴 CRITICAL (P0)**
- Contract funds at risk
- Exploit detected
- All operations failing
- **Response**: Immediate pause + war room

**🟡 HIGH (P1)**
- Single function failing
- Gate misbehaving
- Paymaster depleted
- **Response**: Within 2 hours

**🟢 MEDIUM (P2)**
- Performance degradation
- UI issues
- Non-critical bugs
- **Response**: Within 24 hours

### 📞 **Escalation Path**
1. **L1 Support**: Basic monitoring + alerts
2. **L2 Engineering**: Code investigation + fixes
3. **L3 Security**: Advanced threat analysis
4. **L4 Emergency**: Multisig coordination

## 🔐 KEY MANAGEMENT

### 🗝️ **Key Types**
- **DEPLOYER_KEY**: Contract deployment only
- **EMERGENCY_KEY**: Pause/unpause functions
- **GATE_MANAGER_KEY**: Gate management
- **TREASURY_KEY**: Fund management
- **OPERATOR_KEY**: Routine operations

### 🔒 **Security Practices**
- Keys stored in hardware wallets
- Multisig for critical operations
- Regular key rotation (quarterly)
- Principle of least privilege

## 📈 PERFORMANCE BASELINES

### ⛽ **Gas Usage**
- `claimGift`: ~150k gas (target)
- `returnExpiredGift`: ~80k gas
- `batchReturn` (50 items): ~2.5M gas
- `createGift`: ~120k gas

### ⏱️ **Response Times**
- Gift creation: <5 seconds
- Claim processing: <10 seconds
- Batch operations: <30 seconds
- Emergency pause: <60 seconds

## 🔄 BACKUP & RECOVERY

### 💾 **Data Backup**
- Contract state snapshots (daily)
- Event logs archival (weekly)
- ABI + bytecode versioning
- Configuration backups

### 🔄 **Recovery Procedures**
1. **Pause contract** to stop new operations
2. **Export current state** via events
3. **Deploy new contract** if needed
4. **Migrate assets** using emergency functions
5. **Update frontend** configuration
6. **Resume operations** after testing

## 📋 POST-DEPLOYMENT CHECKLIST

### ✅ **Immediate (0-1 hour)**
- [ ] Contract verified on BaseScan
- [ ] Sourcify verification complete
- [ ] Basic smoke tests passed
- [ ] Monitoring dashboards live
- [ ] Alert channels configured

### ✅ **Short-term (1-24 hours)**
- [ ] Full integration tests passed
- [ ] Frontend updated with new address
- [ ] Documentation updated
- [ ] Team notified of deployment
- [ ] First gifts created and claimed

### ✅ **Medium-term (1-7 days)**
- [ ] Performance monitoring stable
- [ ] No critical alerts triggered
- [ ] User adoption tracking
- [ ] Gas optimization analysis
- [ ] Security audit scheduled

## 📞 BUG BOUNTY PROGRAM

### 💰 **Reward Structure**
- **Critical**: $5,000 - $10,000
- **High**: $1,000 - $5,000
- **Medium**: $500 - $1,000  
- **Low**: $100 - $500

### 📧 **Reporting**
- Email: security@mbxarts.com
- Encrypted: Use PGP key on website
- Response: Within 24 hours
- Fix timeline: Based on severity

### 🔒 **Scope**
- Smart contract vulnerabilities
- Economic attacks
- DoS vulnerabilities
- Access control bypasses

**Made by mbxarts.com The Moon in a Box property**

**Co-Author: Godez22**