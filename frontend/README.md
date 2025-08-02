# CryptoGift Wallet Frontend

Este frontend está construido con Next.js y thirdweb SDK. Consulta la documentación y variables de entorno necesarias en el README original.

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

## 🔧 Recent System Improvements

### Critical Production Fixes (August 2025)
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
- ✅ TypeScript compilation without errors
- ✅ Theme system integration across all components
- ✅ IPFS URL encoding fixes deployed
- ✅ Redis development mode fallbacks implemented
- ✅ Chain switching system operational
- ✅ Notification system integrated
- ✅ Performance optimizations applied
