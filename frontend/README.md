# CryptoGift Wallet Frontend

Este frontend está construido con Next.js y thirdweb SDK. Consulta la documentación y variables de entorno necesarias en el README original.

## 🚨 CRITICAL UPDATE (Agosto 24, 2025) - WALLET DASHBOARD AUDIT & GAS-PAID FALLBACK ✅

### 🔍 DEEP SYSTEM AUDIT - WALLET DASHBOARD FUNCTIONALITY
- ✅ **CSP BLOCKING FIXED**: 30+ domains added to middleware.ts for analytics, IPFS, monitoring
- ✅ **FUNCTION SELECTORS**: Corrected escrow giftCounter() from 0x3e914080 to 0x7ebee30f
- ✅ **AUTH CHALLENGE**: Fixed SIWE challenge API with proper address field
- ✅ **CORE VALIDATED**: RPC, Redis, NFT contract all operational

### 🚀 ROBUST GAS-PAID FALLBACK SYSTEM
- ✅ **AUTO-DETECTION**: `validateBiconomyConfig()` checks SDK and env vars at runtime
- ✅ **PRIMARY METHOD**: Gas-paid transactions 100% functional as main method
- ✅ **SMART FALLBACK**: Gasless when available, gas-paid always works
- ✅ **DYNAMIC DISABLE**: `gaslessTemporarilyDisabled = !validateBiconomyConfig()`
- ✅ **VERCEL GUIDE**: Complete VERCEL_ENV_SETUP.md with all variables

### TECHNICAL IMPLEMENTATIONS
1. **Fallback System** (`lib/biconomyV2.ts`):
   - Smart transaction routing with automatic fallback
   - Detects Biconomy availability and falls back to gas-paid
   - Returns mock account when SDK not installed

2. **CSP Fixes** (`middleware.ts`):
   - Added Amplitude, PostHog, Sentry, 0x Protocol domains
   - Fixed IPFS dweb.link access
   - Enabled all external service integrations

3. **Environment Documentation** (`VERCEL_ENV_SETUP.md`):
   - Categorized variables by priority
   - Instructions for obtaining API keys
   - Troubleshooting guide included

## 📊 PREVIOUS UPDATE (Agosto 23, 2025) - MOBILE & UX PERFECTION ✅

### 🚀 MOBILE UX PERFECTION - CRITICAL FIXES DEPLOYED
- ✅ **MOBILE IPFS UPLOADS**: Exponential backoff retry system (2s→4s→8s) - no más fallos en primer intento
- ✅ **DAO SHOWCASE UNIFIED**: Sales Masterclass con celebración "¡Ya eres parte de CryptoGift!" en ambos contextos
- ✅ **THEME TOGGLE FIX**: Selector de tema funciona sin redirigir a página de inicio

### TECHNICAL IMPLEMENTATIONS
1. **IPFS Retry Logic** (`utils/ipfs.ts`):
   - Completed incomplete retry loop (lines 246-356)
   - Added exponential backoff with progressive timeouts
   - Early exit on success to avoid unnecessary retries

2. **PreClaim DAO Showcase** (`education/PreClaimFlow.tsx`):
   - Changed lessonId from "claim-first-gift" to "sales-masterclass"
   - Unified celebration experience across contexts

3. **Theme Navigation Fix** (`Navbar.tsx`):
   - Separated ThemeToggle from Link component
   - Independent theme selector without navigation side-effects

## 🎓 PREVIOUS UPDATE (Agosto 20, 2025) - UNIFIED EDUCATION SYSTEM + CRITICAL FIXES ✅

### 🎓 UNIFIED KNOWLEDGE ↔ EDUCATIONAL REQUIREMENTS SYSTEM DEPLOYED
- ✅ **BREAKTHROUGH**: Same Sales Masterclass usado en Knowledge Academy Y Educational Requirements
- ✅ **LessonModalWrapper**: Modal universal con estructura GiftWizard para educación perfecta
- ✅ **Lesson Registry System**: Automatic detection - nuevas lecciones en Knowledge automáticamente disponibles
- ✅ **Zero Duplication**: EXACTAMENTE la misma lección sin modificación alguna
- ✅ **Critical Education Bugs Fixed**: Claimer field, wallet connection timing, gateData fallbacks
- ✅ **Confetti Celebration Enhanced**: Perfect celebration system que funciona en ambos modos
- ✅ **Mobile Education Compatible**: Complete mobile workflow con error handling robusto

### 🔴 CRITICAL EDUCATION FIXES IMPLEMENTED THIS SESSION
1. **Missing claimer field**: LessonModalWrapper now sends required claimer field to education/approve API
2. **Wallet connection timing**: Mobile flow now requires wallet connection before password validation  
3. **Silent gateData fallbacks**: Proper error display instead of dangerous fallback to '0x'
4. **Modal height issues**: Conditional height classes fixed empty space at bottom

### PREVIOUS: EIP-712 EDUCATION SYSTEM
- ✅ **EIP-712 Pre-Claim Education**: Complete education system with stateless approvals
- ✅ **Sales Masterclass Module**: 15-minute interactive presentation
- ✅ **SimpleApprovalGate Contract**: Deployed and verified on Base Sepolia (0x99cCBE...)
- ✅ **<30k Gas Verification**: Ultra-efficient signature-based approvals
- ✅ **Session Management**: Redis-based progress tracking with JWT authentication

### MOBILE CLAIMING CRISIS RESOLVED
- ❌ **ANTES**: Mobile claims mostraban "Error de conexión" después de signing transaction
- ❌ **ANTES**: NFTs claimed desde mobile aparecían con placeholder images
- ✅ **AHORA**: Mobile claims completan exitosamente con imágenes reales
- ✅ **AHORA**: Paridad completa entre mobile y PC experience

### ROOT CAUSE IDENTIFIED
- **Frontend claims** (mobile) NO actualizaban Redis metadata después del claim
- **Backend claims** (PC) SÍ actualizaban Redis automáticamente
- Metadata endpoints devolvían placeholders cuando no encontraban data en Redis cache

### SOLUCIÓN IMPLEMENTADA
1. **Nuevo endpoint**: `/api/nft/update-metadata-after-claim` (283 lines)
   - JWT authentication para seguridad
   - Updates Redis con metadata real después de frontend claims
   - TTL 30 días para efficient caching
   - Stores claim data (claimer, transaction hash, fecha)

2. **Enhanced ClaimEscrowInterface.tsx** (lines 254-281):
   - Calls nuevo endpoint después de successful frontend claims
   - Non-blocking implementation (doesn't fail claim if metadata update fails)
   - Comprehensive error handling y logging

3. **TypeScript Fix**: Removed invalid `formData.giftMessage` reference

### ARCHITECTURE IMPACT
```typescript
// NUEVO PATTERN: Post-Claim Redis Sync for Mobile
try {
  const updateResponse = await makeAuthenticatedRequest('/api/nft/update-metadata-after-claim', {
    method: 'POST',
    body: JSON.stringify({
      tokenId, contractAddress, claimerAddress: account.address,
      transactionHash: txResult.transactionHash,
      giftMessage: validationResult.giftInfo?.giftMessage || '',
      imageUrl: nftMetadata?.image || ''
    })
  });
} catch (updateError) {
  // Non-blocking: Don't fail the claim if Redis update fails
}
```

## Scripts principales

- `pnpm dev` — Inicia el servidor de desarrollo
- `pnpm build` — Compila para producción
- `pnpm start` — Inicia el servidor en producción

## Variables de entorno

Consulta `.env.example` para ver todas las claves necesarias.

## 🎨 UI System Architecture (Updated August 2025)

### Unified Theme System
- **CryptoGiftTheme**: Complete design language with glassmorphism effects
- **ThemeSystem.tsx**: Centralized theming with Card, Section, Button, Input, Layout components
- **Adaptive Panels**: Multiple variants (Glass, Luxury, Minimal, Solid) with blur effects

### Smart Chain Management
- **ChainSwitchingSystem**: Intelligent chain detection and switching prompts
- **QuickChainSwitch**: Compact chain switching for headers/toolbars
- **Support**: Base Sepolia (84532) and Ethereum Sepolia (11155111)

### Notification Framework
- **NotificationSystem**: Real-time transaction and wallet action feedback
- **Context-based**: React Context with hooks (useNotifications, useTransactionNotifications)
- **Auto-dismiss**: Configurable timing with persistent options for critical notifications

### Performance Optimizations
- **IPFS URL Encoding**: Fixed special character handling in NFT image paths
- **Redis Development Mode**: Graceful fallbacks for local development without blocking expired gift claims
- **TypeScript Compilation**: Zero errors with proper type handling
- **Education System**: EIP-712 signature verification with <30k gas usage per check
- **Session Management**: Redis-based progress tracking with JWT authentication and rate limiting

## 🔧 Recent System Improvements

### Mobile UX Perfection (August 4, 2025)
1. **R1: Deeplink Authentication** - MetaMask mobile automatic deeplink with user-activation first-line
2. **R2: NFT Visibility Enhanced** - Pre-pinning tokenURI with instant MetaMask display + toast notifications
3. **R3: Spanish Error Messages** - Corrected multilingual error interface with comprehensive unit tests
4. **R4: Vertical Image Layouts** - ResizeObserver dynamic adjustment eliminates margins for vertical images
5. **R5: Auto Theme + Zoom Compensation** - Desktop scaling (1.12x) to compensate global 0.88 zoom
6. **R6: IPFS Gateway Retry System** - Triple-gateway fallback (Pinata → Cloudflare → IPFS.io) with telemetry

### Critical Production Fixes (August 1-3, 2025)
1. **NFT Image Display**: Fixed URL encoding for special characters in IPFS paths
2. **Redis Development Mode**: Non-blocking fallbacks for local development
3. **Chain Switching**: Intelligent user prompts with context-aware requirements
4. **Notification System**: Complete transaction and wallet action feedback

### UI Component Exports
All UI components are available via the centralized export in `src/components/ui/index.ts`:
```typescript
// Unified Theme System
import { CryptoGiftTheme, ThemeCard, ThemeButton } from '@/components/ui';

// Chain Switching
import { ChainSwitchingSystem, QuickChainSwitch } from '@/components/ui';

// Notifications
import { NotificationProvider, useNotifications } from '@/components/ui';

// Glassmorphism Components
import { GlassPanelHeader, AdaptivePanel } from '@/components/ui';
```

--- FOR DEPLOY

Cualquier cambio relevante en la estructura o dependencias debe reflejarse aquí.

### Production Deployment Checklist
- ✅ **EDUCATION SYSTEM DEPLOYED** - Complete pre-claim education with EIP-712 approvals
- ✅ **SimpleApprovalGate Contract** - Deployed and verified on Base Sepolia (0x3FEb...)
- ✅ **5 Education Modules** - Interactive learning system with progress tracking
- ✅ **Session Management** - Redis-based JWT authentication with rate limiting
- ✅ **EIP-712 Signature System** - Stateless verification with <30k gas per check
- ✅ **Mobile UX R1-R6 Implemented** - Complete mobile experience optimization
- ✅ **Deeplink Authentication** - MetaMask mobile integration with user-activation
- ✅ **NFT Visibility Enhanced** - Pre-pinning with instant MetaMask display
- ✅ **Spanish Error Messages** - Corrected multilingual interface with unit tests
- ✅ **Vertical Image Layouts** - ResizeObserver dynamic adjustment system
- ✅ **Auto Theme + Zoom Compensation** - Desktop scaling for optimal viewing
- ✅ **IPFS Gateway Retry System** - Triple-gateway fallback with telemetry
- ✅ **Mobile Claiming Fix** - Frontend Redis metadata sync implemented
- ✅ TypeScript compilation without errors
- ✅ Theme system integration across all components
- ✅ IPFS URL encoding fixes deployed
- ✅ Redis development mode fallbacks implemented
- ✅ Chain switching system operational
- ✅ Notification system integrated
- ✅ Performance optimizations applied
