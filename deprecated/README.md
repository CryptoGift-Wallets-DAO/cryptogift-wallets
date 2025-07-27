# 📦 DEPRECATED CODE ARCHIVE

## 🗂️ STRUCTURE

### `/v1-contracts/`
Contains deprecated V1 smart contracts with custodial architecture.

### `/frontend-legacy/`
Contains deprecated frontend code and ABIs from V1 implementation.

## ⚠️ IMPORTANT NOTES

**DO NOT USE THIS CODE IN PRODUCTION**

- **V1 Contracts**: Had custodial risks where deployer temporarily owned user NFTs
- **Legacy Frontend**: Used problematic totalSupply fallbacks and unsafe patterns
- **Deprecated ABIs**: Type conflicts and export issues

## 📋 MIGRATION GUIDE

If you need to reference old implementations:

1. **V1 → V2 Contract Migration**: 
   - `createGift()` → `registerGiftMinted()` 
   - Custodial → Zero-custody
   - Deployer ownership → Direct mint-to-escrow

2. **Frontend Migration**:
   - Old ABI imports → New `escrowABI.ts` (V2 only)
   - Remove totalSupply fallbacks
   - Update type definitions

## 🔒 ZERO CUSTODY V2

Current production uses:
- **Contract**: `0x46175CfC233500DA803841DEef7f2816e7A129E0`
- **Architecture**: Zero-custody with `registerGiftMinted`
- **Security**: No deployer ownership of user assets

---

**Made by mbxarts.com The Moon in a Box property**