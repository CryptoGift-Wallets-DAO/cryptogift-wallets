# POPUP LEGACY - DEPRECATED MOBILE REDIRECT SYSTEM

## Why this was removed

**Date:** August 8, 2025  
**Reason:** Duplicate mobile popup causing `-32002 "Request already pending"` errors

## Original Problem

ClaimEscrowInterface had its own MobileWalletRedirect popup that showed simultaneously with ConnectAndAuthButton's popup during SIWE authentication, causing:

- Double popups appearing together
- MetaMask mobile "-32002 Request already pending" errors  
- User confusion and poor mobile UX
- Unnecessary code duplication

## Solution Applied

**RADICAL ELIMINATION** - Completely removed the duplicate popup system:

- ✅ ConnectAndAuthButton popup handles ALL mobile authentication UX
- ✅ Claim transactions work perfectly without additional popups  
- ✅ Simplified architecture: ONE popup, ONE responsibility
- ✅ Clean mobile experience without conflicts

## Original Code Location

The removed popup was in:
- `ClaimEscrowInterface.tsx` lines ~843-849 (JSX)
- `ClaimEscrowInterface.tsx` line ~86 (state)  
- `ClaimEscrowInterface.tsx` line ~22 (import)

## Backup Information

If needed for reference, the original MobileWalletRedirect component still exists at:
`/src/components/ui/MobileWalletRedirect.tsx`

It's used successfully by ConnectAndAuthButton and should NOT be duplicated elsewhere.

## Lesson Learned

> "EL PRIMERO FUNCIONA, PARA QUE QUEREMOS EL SEGUNDO??? NO TIENE SENTIDO"

User feedback was correct. Simplification over complexity. Remove redundant systems entirely.