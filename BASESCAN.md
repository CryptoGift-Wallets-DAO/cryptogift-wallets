# 🔍 BaseScan & MetaMask Display Issues - Deep Analysis

## 🚨 CRITICAL FINDING - August 14, 2025

**THE REAL PROBLEM:** It's not about the endpoint format, it's about ON-CHAIN tokenURI metadata propagation!

## 📊 Test Results

| Token | MetaMask | Wallet App | BaseScan | On-Chain tokenURI |
|-------|----------|------------|----------|-------------------|
| #169 | ✅ Works | ✅ Works | ❌ No image | `ipfs://QmcHwKAASGhoMmb4DMnUDzBsHYbjF8qzbbHi4e1Vr9Fn4b` |
| #170 | ✅ Works | ✅ Works | ❌ No image | `ipfs://QmNVKWm2zJqJuusveXvknUJj2g4ky1n6eMVzTvXhRYkYK9` |
| #173 | ❌ **FAILS** | ✅ Works | ❌ No image | `ipfs://QmdCbEB9sbiMNm4aTKmRU79vdWkudjyAi88fYAWPerFgQe` |
| #174 | ✅ Works | ✅ Works | ❌ No image | `ipfs://QmPKLkFKZiuE7YqK33U1c3E7rTHknQMFd6e9JyR3wh6ZAJ` |

## 🎯 ROOT CAUSE ANALYSIS

### 1. **MetaMask Reads ON-CHAIN tokenURI, NOT Our API Endpoint**
```
Token 173 On-Chain: ipfs://QmdCbEB9sbiMNm4aTKmRU79vdWkudjyAi88fYAWPerFgQe/metadata.json
Token 174 On-Chain: ipfs://QmPKLkFKZiuE7YqK33U1c3E7rTHknQMFd6e9JyR3wh6ZAJ/metadata.json
```

Both metadata.json files ARE accessible and contain:
- `"image": "ipfs://QmWLWRpUB8A3RAPSQ2fkpjrJv2u7EjUT43vBQkDYqwXNSp/..."`
- `"image_url": "https://ipfs.io/ipfs/QmWLWRpUB8A3RAPSQ2fkpjrJv2u7EjUT43vBQkDYqwXNSp/..."`

### 2. **The Issue is INCONSISTENT - Not Deterministic**
- Token 173 fails in MetaMask despite having IDENTICAL structure to 174
- Both have accessible metadata.json
- Both have accessible images
- The failure appears to be TIMING/CACHE related in MetaMask

### 3. **BaseScan Issues are SEPARATE from MetaMask Issues**
- BaseScan may be looking for specific headers or formats
- Our endpoint returns correct canonical format but BaseScan might need specific gateway
- Legacy tokens (135, 127) have `data:image/svg` placeholders causing 503 errors

## 🔧 Current System Architecture

### What Works ✅
1. **Our Platform**: Always displays images correctly
2. **Wallet App**: Shows images 99% of the time (except token 173)
3. **Canonical Format**: `image: ipfs://` + `image_url: https://` is correct
4. **Gateway Selection**: dweb.link > ipfs.io > pinata > nftstorage

### What Doesn't Work ❌
1. **BaseScan**: Never shows images (might need specific headers/format)
2. **MetaMask Consistency**: Random failures like token 173
3. **Legacy Tokens**: data:image SVG placeholders cause 503 errors

## 🎮 The Three Different Data Sources

1. **ON-CHAIN tokenURI** → What MetaMask/BaseScan read first
   - Points to: `ipfs://<metadataCID>/metadata.json`
   - This metadata contains the actual image links

2. **Our API Endpoint** → `/api/nft-metadata/[contract]/[tokenId]`
   - Used by: Our platform, some wallets
   - Returns: Canonical format with dynamic gateway selection

3. **Stored Metadata** → Redis/cache
   - Used by: `/api/nft/` endpoint for platform display
   - Can have outdated gateway URLs

## 🚀 Solutions Attempted

### ✅ Implemented Successfully
1. **Canonical Format**: image=ipfs://, image_url=HTTPS
2. **Dynamic Gateway Selection**: getBestGatewayForCid with LRU cache
3. **Multi-gateway Validation**: ≥2 gateways required
4. **Data:image Support**: For legacy placeholder tokens

### ❌ Still Failing
1. **BaseScan Display**: Might need specific User-Agent handling
2. **MetaMask Consistency**: Intermittent failures (token 173)
3. **IPFS Propagation**: New uploads may not propagate fast enough

## 📋 The Circular Problem

We keep going in circles because:
1. **Multiple data sources**: on-chain, API, cached
2. **Multiple consumers**: MetaMask, BaseScan, our app, other wallets
3. **Each has different requirements**: Some want ipfs://, some HTTPS, some specific gateways
4. **Changing one breaks another**: Fix BaseScan → break wallet, fix wallet → break BaseScan

## 🎯 Final Recommendations

### PRIORITY 1: Fix MetaMask Consistency (CRITICAL)
```typescript
// In metadataUpdater.ts - ensure image_url uses ipfs.io for on-chain metadata
const imageHttpsUrl = `https://ipfs.io/ipfs/${cleanImageCid}`;
// NOT dweb.link or dynamic gateway for on-chain storage
```

### PRIORITY 2: Warm-up IPFS After Mint
```typescript
// After updateTokenURI, warm up critical gateways
await fetch(`https://ipfs.io/ipfs/${metadataCID}/metadata.json`);
await fetch(`https://ipfs.io/ipfs/${imageCID}`);
await fetch(`https://cloudflare-ipfs.com/ipfs/${metadataCID}/metadata.json`);
```

### PRIORITY 3: BaseScan-Specific Endpoint
```typescript
// Detect BaseScan User-Agent and return specific format
if (req.headers['user-agent']?.includes('Basescan')) {
  // Return image in HTTPS format, not ipfs://
  metadata.image = `https://ipfs.io/ipfs/${cid}`;
}
```

### PRIORITY 4: Validation Requirements
- Upload: minimum 1 gateway (not 2)
- Pre-updateTokenURI: verify ipfs.io OR cloudflare accessible
- Add retry logic with exponential backoff

## ⚠️ Critical Warning

**DO NOT CHANGE**:
1. The canonical format (image: ipfs://, image_url: HTTPS)
2. The working wallet display logic
3. The platform display that already works

**ONLY ADD**:
1. Warm-up calls after mint
2. Special handling for BaseScan User-Agent
3. Better retry/propagation logic

## 📊 Test Matrix Needed

Before any changes, test:
1. New mint → Check MetaMask immediately
2. New mint → Wait 1 minute → Check MetaMask
3. New mint → Check BaseScan after 5 minutes
4. Verify our platform always works
5. Test with different wallets (Trust, Rainbow)

## 🔄 The Audit Conflicts

**Audit A says**: Use HTTPS in image field
- Risk: Breaks wallets expecting ipfs://

**Audit B says**: Use ipfs:// canonical + dynamic image_url
- Current implementation
- Works for wallets, not BaseScan

**Audit C says**: Prioritize ipfs.io gateway
- Makes sense for BaseScan
- But ipfs.io can be slow/timeout

## 📌 Final Verdict

The problem is NOT our endpoint format. The problem is:
1. **IPFS propagation timing** (affects MetaMask)
2. **BaseScan expects specific format** (needs investigation)
3. **On-chain metadata uses ipfs.io** but we return dweb.link

The solution is NOT changing formats back and forth. The solution is:
1. **Ensure ipfs.io has the content** (warm-up)
2. **Keep canonical format** for compatibility
3. **Add BaseScan-specific handling** if needed
4. **Fix the on-chain metadata generation** to use consistent gateways

---

## 🚨 Token 173 Investigation (URGENT)

**SYMPTOM**: Token 173 doesn't display in MetaMask but 174 does

**FINDINGS**:
- Both have valid on-chain tokenURIs
- Both metadata.json files are accessible
- Both images are accessible via ipfs.io
- Structure is IDENTICAL

**HYPOTHESIS**: MetaMask has cached a failed request for 173

**SOLUTION**: 
1. User should "Refresh metadata" in MetaMask
2. We should add warm-up calls immediately after mint
3. Consider adding delay before updateTokenURI to ensure propagation

---

Created: August 14, 2025
Last Updated: Session in progress
Status: UNSOLVED - Requires more investigation outside of circular changes

Made by mbxarts.com The Moon in a Box property
Co-Author: Godez22