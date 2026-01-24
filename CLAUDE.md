# CLAUDE.md - Documentación de Actualización de Sesión para Claude
## 🎯 CONTEXTO COMPLETO CRYPTOGIFT WALLETS

---

## 📋 PREÁMBULO IMPRESCINDIBLE

**CryptoGift Wallets** es una **plataforma Web3 revolucionaria** que permite **regalar NFT-wallets con criptomonedas reales** usando tecnología **ERC-6551 (Token Bound Accounts)**. 

### 🎯 CONCEPTO CORE REVOLUCIONARIO
- **NFT = Wallet Real**: Cada NFT tiene una wallet integrada ERC-6551 que almacena criptomonedas reales
- **Zero Custodia Humana**: Sistema programático sin regulaciones de custody
- **Transferencia Automática**: El destinatario se convierte en dueño real del NFT automáticamente via safeTransferFrom()
- **Gas Gratis**: Todas las transacciones patrocinadas por Paymaster (Account Abstraction)

### 🌐 DEPLOYMENT & STATUS ACTUAL
- **🚀 PRODUCTION LIVE**: https://cryptogift-wallets.vercel.app
- **🎯 Red Principal**: Base Mainnet (L2) - Chain ID: 8453
- **🎯 Red Testing**: Base Sepolia (L2) - Chain ID: 84532
- **📊 Estado**: PRODUCTION READY ✅ FUNCIONAL ✅ OPTIMIZADO ✅

### 🔒 ÚLTIMO COMMIT & CAMBIOS RECIENTES
- **Fecha**: Enero 14, 2026
- **Cambio Principal**: Sistema Competencias Fase 0 - Auth + Base Mainnet
- **Solución**: Middleware autenticación SIWE para competencias + migración a Base Mainnet
- **Files**: `authMiddleware.ts` (NEW), `create.ts`, `join.ts`, `bet.ts`, `distribute.ts`, `safeClient.ts`, `safeIntegration.ts`
- **Resultado**: ✅ APIs competencias protegidas con JWT! ✅ Contratos Safe en Base Mainnet!

### 🏆 SISTEMA DE COMPETENCIAS (NUEVO)
**Estado**: Fase 0 completada, Fases 1-6 pendientes
**Ubicación**: `frontend/src/competencias/`
**Documentación**: `PLAN_ACCION_COMPETENCIAS.md`

**Infraestructura Reutilizada**:
- Sistema SIWE existente (`siweAuth.ts`, `siweClient.ts`)
- Endpoints auth existentes (`/api/auth/challenge`, `/api/auth/verify`)
- Redis para rate limiting y storage

**Contratos Safe Base Mainnet (8453)**:
```
SAFE_L2_SINGLETON:   0xfb1bffC9d739B8D520DaF37dF666da4C687191EA
SAFE_PROXY_FACTORY:  0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC
MULTI_SEND:          0x998739BFdAAdde7C933B942a68053933098f9EDa
FALLBACK_HANDLER:    0x017062a1dE2FE6b99BE3d9d37841FeD19F573804
```

---

## 🏗️ ARQUITECTURA TÉCNICA COMPLETA

### 🔗 CONTRATOS SMART DESPLEGADOS Y VERIFICADOS
```solidity
// CORE SYSTEM CONTRACTS (Base Sepolia)
NFT_CONTRACT           = "0xeFCba1D72B8f053d93BA44b7b15a1BeED515C89b"     // Main NFT Contract
ESCROW_CONTRACT        = "0x46175CfC233500DA803841DEef7f2816e7A129E0"     // Escrow System 
SIMPLE_APPROVAL_GATE   = "0x99cCBE808cf4c01382779755DEf1562905ceb0d2"     // Education EIP-712
ERC6551_REGISTRY       = "0x000000006551c19487814612e58FE06813775758"     // Standard Registry
ERC6551_IMPLEMENTATION = "0x2d25602551487c3f3354dd80d76d54383a243358"     // Account Implementation

// STATUS: All contracts DEPLOYED ✅ VERIFIED ✅ OPERATIONAL ✅
```

### 📱 STACK TECNOLÓGICO AVANZADO

#### **Frontend Cutting-Edge:**
- **Next.js 15** con App Router y TypeScript
- **ThirdWeb v5** - Web3 SDK con Account Abstraction integrado
- **Tailwind CSS** + **Framer Motion** - Design system avanzado
- **React 18** - Concurrent features y Suspense

#### **Blockchain & Web3:**
- **Base Sepolia** (L2) - Transacciones rápidas y baratas
- **ERC-6551** Token Bound Accounts - NFT = Wallet breakthrough
- **Account Abstraction** - Paymaster gasless con Biconomy v4.5.7 (FALLBACK ROBUSTO)
- **OpenZeppelin** - Contratos seguros y auditados

#### **🚀 SISTEMA DE FALLBACK CRÍTICO (NUEVO):**
- **Auto-detección Biconomy**: `validateBiconomyConfig()` verifica disponibilidad en runtime
- **Gas-Paid Primary**: Método principal 100% funcional siempre
- **Gasless Bonus**: Se activa automáticamente cuando está configurado
- **Dynamic Disable**: `gaslessTemporarilyDisabled = !validateBiconomyConfig()`
- **Fallback Wrapper**: Retorna mock account cuando SDK no instalado

#### **Integraciones Críticas:**
- **NFT.Storage + IPFS** - Almacenamiento descentralizado permanente
- **Upstash Redis** - Sesiones, cache, education progress
- **PhotoRoom API v2** - Filtros IA para imágenes
- **0x Protocol v2** - Swaps descentralizados
- **Telegram Bot** - Alertas de monitoreo automático

---

## 🎨 DESIGN SYSTEM & APARIENCIA GENIAL

### 🌈 GLASS MORPHISM AESTHETIC PHILOSOPHY
La plataforma sigue una **estética glass morphism premium** con:
- **Backdrop Blur Effects**: `backdrop-blur-xl backdrop-saturate-150`
- **Transparencias Sofisticadas**: `bg-white/60 dark:bg-gray-800/60`
- **Colores Tenues Premium**: Gradientes sutiles con saturación elevada
- **Shadow System**: `shadow-xl shadow-blue-500/10` con colores temáticos
- **Border Elegance**: `border-gray-200/50 dark:border-gray-700/50`

### 🎭 COMPONENTES UI PREMIUM
```typescript
// THEME SYSTEM HIERARCHY COMPLETO
CryptoGiftTheme = {
  // Core Components
  Card: ThemeCard,           // Content containers con variants
  Section: ThemeSection,     // Page layout sections  
  Button: ThemeButton,       // Consistent button styling
  Input: ThemeInput,         // Form inputs con theming
  Layout: ThemeLayout,       // Page layouts

  // Advanced Glass Panels
  Panel: AdaptivePanel,      // Base panel system
  GlassPanel,               // Glassmorphism variant
  LuxuryPanel,              // Premium effects

  // Sophisticated Headers
  Header: GlassPanelHeader,              // Advanced blur headers
  DashboardHeader: DashboardGlassHeader, // Dashboard specific
  ModalHeader: ModalGlassHeader          // Modal specific
}
```

### 🎨 ESTÁNDARES VISUALES OBLIGATORIOS
- **Hover/Touch System**: Sin botones feos, interacción natural premium
- **Click Outside to Close**: UX sin interrupciones, elegante
- **Spring Physics**: stiffness: 300, damping: 25 (estándar animaciones)
- **Glass Morphism**: backdrop-blur-xl + transparencias sofisticadas
- **Mobile-First**: Touch events = Mouse events, experiencia unificada

### 🏆 ICONOGRAFÍA & BRANDING
**Sistema Actual**: Lucide React (iconos semánticos), Emoji estratégico, Dynamic Icons
**Roadmap**: Custom SVG icon system con identidad CryptoGift para brand recognition y cohesión visual

---

## 🚀 SISTEMAS CRÍTICOS OPERATIVOS Y FUNCIONALES

### ✅ MOBILE UX PERFECTION (R1-R6) COMPLETADO
Optimizaciones móviles críticas 100% implementadas:

#### **R1 - Mobile Deeplink Authentication** ✅
- **User-Activation First-Line**: `wallet_addEthereumChain` immediate para mobile compliance
- **MetaMask SDK Detection**: Native deeplinks con detección automática
- **Triple Fallback System**: MetaMask native → custom scheme → universal link
- **Impact**: Mobile authentication flows directamente de vuelta a la app

#### **R2 - Enhanced MetaMask NFT Visibility** ✅  
- **Pre-pin TokenURI**: Metadata fetch antes de `wallet_watchAsset`
- **Smart Toast System**: Success/warning/info notifications con actions
- **User Denial Handling**: Step-by-step manual instructions + copy button
- **Impact**: NFTs visible en MetaMask mobile en menos de 30 segundos

#### **R3 - Spanish Error Messages + Unit Tests** ✅
- **Corrected Messages**: "Gift reclamado", "Gift expirado", "Gift todavía no Reclamado"
- **Spanish Date Format**: DD/MM/YYYY con `toLocaleDateString('es-ES')`
- **Jest Unit Tests**: 6 test cases cubriendo todos los estados
- **Impact**: Mensajes claros en español con fechas específicas

#### **R4 - Vertical Image Layout Fix** ✅
- **ResizeObserver Implementation**: Dynamic container sizing
- **Flex Wrapper**: Eliminates margins on vertical images (9:16)
- **object-contain Fix**: Applied across GiftSummary, FilterSelector, ImageUpload
- **Impact**: Imágenes verticales se muestran completas sin recortes ni márgenes

#### **R5 - Desktop Zoom Compensation** ✅
- **CSS @media Rules**: `(min-width: 1024px)` para desktop only
- **Scale 1.12**: Compensa zoom global 0.88 (1/0.88 ≈ 1.136)
- **WCAG AA Compliance**: Minimum font sizes maintained
- **Impact**: Desktop UI perfectly scaled mientras mobile mantiene zoom 0.88

#### **R6 - IPFS Gateway Retry System** ✅
- **3-Gateway Fallback**: Pinata → Cloudflare → IPFS.io
- **Exponential Backoff**: 5s → 7s → 9s timeouts con HEAD requests
- **Telemetry Integration**: `gtag('event', 'ipfs_retry')` con performance tracking
- **Impact**: IPFS images load consistently across all mobile/desktop platforms

### ✅ EDUCATION GATE SYSTEM BREAKTHROUGH COMPLETO

#### **🎓 UNIFIED KNOWLEDGE ↔ EDUCATIONAL REQUIREMENTS SYSTEM** ✅
**ARQUITECTURA REVOLUCIONARIA**: Knowledge Academy y Educational Requirements usan EXACTAMENTE la misma Sales Masterclass sin duplicación

**COMPONENTS CLAVE**:
```typescript
// LESSON MODAL WRAPPER - Sistema Universal
export interface LessonModalWrapperProps {
  lessonId: string;
  mode: 'knowledge' | 'educational';  // Context modes
  isOpen: boolean;
  onClose: () => void;
  tokenId?: string;                   // Para educational mode
  sessionToken?: string;              // Para educational flow
  onComplete?: (gateData: string) => void;
}

// LESSON REGISTRY - Detección Automática
export const LESSON_REGISTRY: Record<string, LessonDefinition> = {
  'sales-masterclass': {
    id: 'sales-masterclass',
    title: 'Sales Masterclass - De $0 a $100M en 15 minutos',
    description: 'La presentación definitiva de CryptoGift...',
    estimatedTime: 15,
    component: SalesMasterclass // EXACT same component
  }
};
```

#### **🎓 ESTADO DEL SISTEMA EDUCACIONAL** (27 Agosto 2025)
**STATUS**: FUNCIONAL ✅ después de fixes críticos

**FLUJO EDUCACIONAL RESTAURADO**:
1. ✅ Email verification con OTP - Resend API funcional
2. ✅ Inline checkboxes en Sales Masterclass - Sin popups
3. ✅ Success overlay "¡Ya eres parte de CryptoGift!"
4. ✅ ConnectButton aparece correctamente
5. ✅ EIP-712 generation después de wallet connection
6. ✅ Claim habilitado con gateData válido

**PROBLEMAS RESUELTOS HOY**:
- **Redis JSON Parsing**: Upstash auto-parses, añadido type checking
- **ConnectButton Hidden**: Fixed state management con delays
- **Infinite Re-renders**: Eliminada dependencia circular
- **EIP-712 Stuck**: Corregido flow de generación post-wallet

#### **🔐 EIP-712 STATELESS APPROVAL ARCHITECTURE** ✅
**SECURITY BREAKTHROUGH**: Zero on-chain writes para education approvals
```solidity
// GAS EFICIENTE: ~28.5k per check (target: <30k) ✅
function check(address claimer, uint256 giftId, bytes calldata data) 
    external view returns (bool ok, string memory reason) {
    
    if (data.length >= 97) { // signature + deadline
        bytes32 structHash = keccak256(abi.encode(
            APPROVAL_TYPEHASH,
            claimer,
            giftId,
            REQUIREMENTS_VERSION,
            deadline,
            block.chainid,
            address(this)
        ));
        
        bytes32 digest = keccak256(abi.encodePacked("\\x19\\x01", DOMAIN_SEPARATOR, structHash));
        address signer = recoverSigner(digest, signature);
        
        if (signer == approver && block.timestamp <= deadline) {
            return (true, "0"); // Approved via signature ✅
        }
    }
    
    // Fallback: Check mapping override
    return approvals[keccak256(abi.encodePacked(giftId, claimer))] 
        ? (true, "0") : (false, "1");
}
```

### ✅ KNOWLEDGE ACADEMY SYSTEM COMPLETO

#### **🌳 CURRICULUM TREE INTERACTIVO** ✅
Sistema educativo completo con **21 módulos** organizados jerárquicamente:

**TU RUTA DE APRENDIZAJE - NODOS ESPECÍFICOS RESTAURADOS**:
1. 🚀 **Inicio** → Bienvenida al ecosistema (2min, 100 XP)
2. 👛 **Wallet Básico** → Gestión segura de billeteras (8min, 350 XP) 
3. 🖼️ **Intro NFTs** → Propiedad digital revolucionaria (12min, 480 XP)
4. 🪙 **Crypto Básico** → Fundamentos blockchain (15min, 500 XP)
5. 🎁 **CryptoGift** → Maestría en regalos cripto (10min, 650 XP)
6. 🏦 **DeFi** → Finanzas descentralizadas (25min, 900 XP)
7. 💎 **Sales Masterclass** → Monetización profesional (20min, 1200 XP)
8. 🏆 **Experto Crypto** → Nivel máximo profesional (45min, 2000 XP)

#### **🏗️ CREATOR STUDIO SYSTEM** ✅
**Tab System** en Knowledge Academy con 4 tabs integrados:
- **Aprender** (Learn): Contenido educativo existente
- **Crear** (Create): Creator Studio con wizard y templates
- **Mi Contenido**: Lessons/campaigns creadas
- **Analíticas**: Performance metrics y engagement

**PATTERN OBLIGATORIO**: **DO→EXPLAIN→CHECK→REINFORCE**
- **DO**: Hands-on action (25-35%)
- **EXPLAIN**: Concept understanding (25-35%)
- **CHECK**: Knowledge verification (20-25%)
- **REINFORCE**: Consolidation (15-20%)

### ✅ BASESCAN & METAMASK COMPATIBILITY COMPLETA

#### **🖼️ NFT IMAGE DISPLAY UNIVERSAL - DEFINITIVELY FIXED** ✅
**PROBLEMA RESUELTO (Enero 25, 2025)**: NFT images displaying perfectly en MetaMask Y BaseScan

**5 ROOT CAUSES CRÍTICOS RESUELTOS**:
1. **File Path Truncation**: Regex `/\/ipfs\/([^\/\?]+)/` → `/\/ipfs\/(.+?)(?:\?|#|$)/` preserva `/image.png`
2. **Frontend Placeholder Recycling**: Backend ahora rechaza placeholders y fetches fresh metadata
3. **Redis Serialization Issues**: Attributes manejados como string o array correctamente
4. **IPFS Normalization**: `normalizeCidPath()` elimina duplicaciones `ipfs://ipfs/`
5. **Gateway Forcing**: Respeta gateways funcionales en lugar de forzar ipfs.io

**RESULTADO FINAL**:
- ✅ NFT images appear in MetaMask within 10 seconds
- ✅ Mobile claiming works perfectly
- ✅ BaseScan compatibility maintained
- ✅ Comprehensive `NFT_METADATA_RUNBOOK.md` created

#### **📱 MOBILE CLAIMING CRISIS DEFINITIVELY RESOLVED** ✅
**BREAKTHROUGH**: Complete metadata system overhaul
- **Previous Issue**: Frontend claims (mobile) enviaban placeholders al backend
- **Current Solution**:
  - `/api/nft/update-metadata-after-claim` validates and rejects placeholders
  - Fresh metadata fetched from server post-claim
  - Redis updated with real images, not placeholders
- **Impact**: Mobile NFTs show real images immediately after claiming

---

## 📁 ESTRUCTURA CLAVE DE ARCHIVOS Y COMPONENTS

### 🎯 CORE COMPONENTS CRÍTICOS
```typescript
// GIFT CREATION & MANAGEMENT
frontend/src/components/GiftWizard.tsx              // ⭐ Wizard principal creación
frontend/src/components/escrow/ClaimEscrowInterface.tsx // ⭐ Claim + education system
frontend/src/components/escrow/GiftEscrowConfig.tsx  // Config educación + advanced options

// EDUCATION SYSTEM
frontend/src/components/education/PreClaimFlow.tsx   // ⭐ Flujo educativo pre-claim
frontend/src/components/education/LessonModalWrapper.tsx // ⭐ Modal universal educación
frontend/src/components/learn/SalesMasterclass.tsx   // ⭐ Módulo educativo principal

// WALLET & NFT MANAGEMENT  
frontend/src/components/TBAWallet/WalletInterface.tsx // ⭐ TBA wallet interface
frontend/src/components/WalletInterface.tsx          // Wallet operations
frontend/src/components/NFTImage.tsx                 // NFT display component

// KNOWLEDGE ACADEMY
frontend/src/components/learn/CurriculumTreeView.tsx  // ⭐ Árbol curricular interactivo
frontend/src/components/learn/LearningPath.tsx       // ⭐ Ruta aprendizaje (COMPONENTE PATRÓN UX)
frontend/src/components/learn/LearningContainer.tsx   // Container sistema learning

// UI SYSTEM PREMIUM
frontend/src/components/ui/GlassPanelHeader.tsx      // ⭐ Glass morphism headers
frontend/src/components/ui/ThemeSystem.tsx           // ⭐ Unified theme system
frontend/src/components/ui/NotificationSystem.tsx    // ⭐ Real-time notifications
frontend/src/components/ui/ChainSwitchingSystem.tsx  // ⭐ Intelligent chain switching
```

### 🔗 APIs CRÍTICAS Y ENDPOINTS
```typescript
// CORE MINTING & CLAIMING APIS
frontend/src/pages/api/mint-escrow.ts                // ⭐ Mint NFTs con escrow temporal
frontend/src/pages/api/claim-nft.ts                 // ⭐ Claim NFTs con validation
frontend/src/pages/api/validate-claim.ts            // Validación de claims

// EDUCATION SYSTEM APIS
frontend/src/pages/api/education/approve.ts         // ⭐ EIP-712 education signatures
frontend/src/pages/api/education/get-requirements.ts // Get required modules
frontend/src/pages/api/pre-claim/validate.ts        // Password + education check

// METADATA & COMPATIBILITY
frontend/src/pages/api/metadata/[contractAddress]/[tokenId].ts      // MetaMask compatibility
frontend/src/pages/api/nft-metadata/[contractAddress]/[tokenId].ts  // BaseScan compatibility
frontend/src/pages/api/nft/update-metadata-after-claim.ts           // ⭐ Mobile Redis sync

// UTILITY & INTEGRATION
frontend/src/pages/api/upload.ts                    // IPFS upload system
frontend/src/pages/api/swap.ts                      // 0x Protocol swaps
frontend/src/pages/api/referrals.ts                 // Referral system
```

### 🏗️ LIB & UTILITIES ARCHITECTURE
```typescript
// CORE LIBRARIES
frontend/src/lib/constants.ts                       // ⭐ Configuraciones críticas
frontend/src/lib/errorHandler.ts                    // ⭐ Error management system
frontend/src/lib/ipfs.ts                           // ⭐ IPFS multi-gateway system
frontend/src/lib/escrowUtils.ts                     // ⭐ Escrow utilities

// AUTHENTICATION & SECURITY
frontend/src/lib/siweAuth.ts                        // ⭐ Sign-In with Ethereum
frontend/src/lib/siweClient.ts                      // SIWE client utilities
frontend/src/lib/approverConfig.ts                  // Education approver config

// DATA MANAGEMENT
frontend/src/lib/redisConfig.ts                     // ⭐ Redis configuration
frontend/src/lib/giftMappingStore.ts                // ⭐ Gift ID mapping system
frontend/src/lib/nftMetadataStore.ts                // NFT metadata caching

// EDUCATION & LEARNING
frontend/src/lib/lessonRegistry.ts                  // ⭐ Lesson registration system
frontend/src/data/curriculumData.ts                 // ⭐ Complete curriculum data
```

---

## 🎯 VISIÓN A LARGO PLAZO Y METAS ESTRATÉGICAS

### 🚀 ROADMAP TECNOLÓGICO AVANZADO

#### **FASE 1 - FOUNDATION COMPLETE** ✅ ACHIEVED
- ✅ **Core NFT-Wallet System**: ERC-6551 implementation functional
- ✅ **Gasless Transactions**: Account Abstraction via Biconomy
- ✅ **Education Gate System**: Pre-claim education con EIP-712
- ✅ **Mobile UX Perfection**: R1-R6 comprehensive optimization
- ✅ **Production Deployment**: Base Sepolia live y functional

#### **FASE 2 - ECOSYSTEM EXPANSION** 🎯 IN PROGRESS
**METAS INMEDIATAS (Q4 2025)**:
- 🔄 **Multi-Chain Support**: Ethereum Mainnet + Base Mainnet deployment  
- 🎨 **Custom Icon System**: CryptoGift branded iconography complete
- 🏆 **Gamification Layer**: Achievement system + NFT badges
- 📊 **Advanced Analytics**: User behavior tracking + optimization
- 🌐 **i18n Localization**: Multi-language support beyond Spanish

#### **FASE 3 - PLATFORM MATURITY** 🎯 PLANNED (2026)
**VISIÓN ENTERPRISE**:
- 🏢 **B2B Integration**: White-label solutions para empresas
- 🤖 **AI Content Generation**: Automated gift personalization
- 💼 **Corporate Partnerships**: Integration con major wallets
- 📱 **Native Mobile Apps**: iOS/Android applications
- 🌍 **Global Scaling**: Multi-region deployment strategy

#### **FASE 4 - WEB3 INNOVATION LEADERSHIP** 🎯 VISION (2027+)
**BREAKTHROUGH OBJECTIVES**:
- 🧬 **Next-Gen Token Standards**: Contributions to ERC evolution
- 🌌 **Metaverse Integration**: Virtual gift experiences
- ⚡ **L2/L3 Pioneer**: Custom blockchain solutions
- 🔗 **Cross-Chain Mastery**: Universal NFT-wallet compatibility
- 🏛️ **DeFi Protocol Integration**: Advanced financial products

### 🎨 DESIGN EVOLUTION ROADMAP
**CURRENT**: Glass Morphism Premium → **NEXT**: Neo-Glassmorphism + AI Visuals → **FUTURE**: 3D + Haptic
**Icon Evolution**: Custom SVG (P1) → Animated Lottie (P2) → AI-Generated (P3)

### 💡 PROPUESTAS PROACTIVAS INMEDIATAS
**HIGH-IMPACT IMPROVEMENTS READY**:
1. **NotificationProvider**: Global system para transaction/wallet feedback con block explorer links
2. **Glass Headers**: Expandir a /knowledge, /referrals, /token/[id], / (DashboardGlassHeader variants)
3. **Chain Switching**: Universal deployment con context-aware detection (wallet/claim/mint/education)
4. **Creator Templates**: Expand library (onboarding, security, defi, nft, collaboration - 65+ templates)
5. **Performance Monitoring**: IPFS latency, transaction success, UX completion, education analytics

---

## 📊 HISTORIAL CRÍTICO DE SESIONES Y ACHIEVEMENTS

### 🚀 NOVIEMBRE 12, 2025 - COMPREHENSIVE FUNDING STRATEGY & DOCUMENTATION ✅
**STRATEGIC SESSION**: Created complete 90-day funding strategy with detailed execution plan

#### **📋 CONTEXTO Y OBJETIVO**
- **SITUACIÓN**: Proyecto funcional pero necesita financiamiento urgente para continuar desarrollo
- **OBJETIVO**: Conseguir $30k-700k en 90 días a través de grants, accelerators y inversores
- **APPROACH**: División 80/20 (Claude crea contenido / Usuario ejecuta)

#### **📚 DOCUMENTACIÓN COMPLETA CREADA**
Creada carpeta `/frontend/public/videos e informacion para las presentaciones/` con:

**Documentos Principales (6 archivos):**
- `00_INICIO_AQUI.md` - Punto de entrada, decisión de ruta (Opción A/B/C)
- `01_INVENTARIO_ASSETS.md` - Assets existentes vs. gaps (40% completado, 60% falta)
- `03_METRICAS_REALES_INSTRUCCIONES.md` - Guía paso a paso para recopilar traction metrics
- `05_CLAUDE_TAREAS_AUTONOMAS.md` - 60 horas de trabajo que Claude hará (pitch deck, grants, código, etc.)
- `06_TUS_TAREAS_PASO_A_PASO.md` - Guía detallada usuario (20-30h en 90 días, 15-20 min/día)
- `RESUMEN_EJECUTIVO.md` - Overview completo con probabilidades y outcomes esperados

**Carpetas de Trabajo:**
- `METRICAS/` - Template para recopilar métricas + screenshots
- `TEMPLATES/` - Templates listos para grants/outreach
- `DELIVERABLES/` - Donde Claude guardará todo lo creado

#### **🎯 ESTRATEGIA DE 3 RUTAS PARALELAS**

**RUTA 1: Grants ($50k-150k potencial, 60% prob)**
- Base Builder Grant ($3k-15k)
- Optimism Season 7 ($10k-100k)
- Gitcoin Grants ($5k-20k)
- Polygon Farcaster Frame ($10k-50k)

**RUTA 2: Accelerators ($100k-500k, 30% prob)**
- Alliance DAO ($500k + network)
- Techstars Web3 ($120k)
- Alchemist ($150k)

**RUTA 3: Inversores Directos ($100k-500k, 40% prob)**
- Angels crypto ($25k-100k c/u)
- Micro VCs Web3 ($100k-250k)
- Revenue share deals ($50k-150k)

#### **💡 INSIGHTS CLAVE IDENTIFICADOS**

**Assets Existentes (✅):**
- Producto funcional en Base Sepolia
- ~380 wallets creados, ~85% claim rate (estimado)
- 2 videos presentación en Mux (92MB + 112MB)
- Sales Masterclass completa (10 bloques educativos)
- Stack tech innovador (ERC-6551 + AA + EIP-712)

**Gaps Críticos (❌):**
- Pitch deck (necesario para todo)
- Métricas reales documentadas (números inflados en Sales Masterclass)
- Video demo 90s (diferente a presentaciones largas)
- Grant applications escritas
- Product Hunt launch kit
- Farcaster Frame

**Problema con Métricas Actuales:**
- Sales Masterclass dice "50,000+ wallets" → Real: ~380
- Dice "$500,000 saved" → Sin calcular
- Dice "340% engagement" → Sin datos
- **CRÍTICO**: Números inflados destruyen credibilidad, mejor usar reales

#### **📊 DIVISIÓN DE TRABAJO DEFINIDA**

**Claude (80% del trabajo, 50-60 horas):**
- ✅ Escribir TODO: pitch deck, grant apps, scripts, 1-pagers
- ✅ Investigar: competidores, market size, benchmarks
- ✅ Desarrollar: Farcaster Frame, analytics, OG images
- ✅ Crear: Templates outreach, financial projections, cap table
- ✅ Estrategia: GTM roadmap, risk mitigation

**Usuario (20% del trabajo, 20-30 horas en 90 días):**
- ⚠️ Recopilar métricas reales (1 hora) - PASO 1 CRÍTICO
- ⚠️ Grabar videos siguiendo scripts (2-3 horas)
- ⚠️ Enviar aplicaciones (30 min c/u, 5-10 total)
- ⚠️ Crear cuentas (PH, Farcaster, ETHGlobal - 2 horas)
- ⚠️ Outreach diario (30 min/día)

#### **🎯 RECOMENDACIÓN: OPCIÓN C (Métricas Primero)**

**Por qué:**
- 1 hora recopilando data → 10x mejor contenido
- Honestidad > números grandes
- Base sólida para TODAS las aplicaciones
- 380 wallets + 85% claim > 50,000+ falsos

**Timeline Recomendado:**
- Día 1: Recopilar métricas (1h)
- Día 2: Base Grant (Claude escribe, usuario envía)
- Día 3-4: Video demo 90s
- Día 5-7: Farcaster Frame + outreach
- Semana 2-3: Product Hunt + más grants
- Semana 4-12: Seguimiento + scale

#### **💰 EXPECTED OUTCOMES (90 DÍAS)**

**Conservador (90% prob):** $35k-45k (2 grants + 1 angel)
**Base (60% prob):** $70k-150k (3 grants + 2-3 angels + PH top 10)
**Optimista (30% prob):** $250k-700k (5 grants + accelerator + angel round)

#### **📝 DELIVERABLES QUE CLAUDE CREARÁ**

**Cuando usuario vuelva con métricas, Claude creará:**
1. Pitch Deck completo (10-15 slides con speaker notes)
2. Base Grant application (contenido completo)
3. Technical 1-pager
4. Video scripts (demo 90s + Loom pitches)
5. Product Hunt kit (tagline + description + first comment)
6. Farcaster Frame (código completo)
7. Outreach templates (4 tipos: investors, accelerators, partnerships, communities)
8. Financial projections (3-year, 3 scenarios)
9. Market sizing (TAM/SAM/SOM con sources)
10. Competitor analysis deep dive
11. [+ 15 items más - ver `05_CLAUDE_TAREAS_AUTONOMAS.md`]

**Total valor del trabajo de Claude:** ~$12,700 (60h × $200/h promedio freelancer)
**Costo para usuario:** $0 ✅

#### **🔄 PRÓXIMOS PASOS AL REINICIAR**

**Usuario debe:**
1. Abrir carpeta `videos e informacion para las presentaciones/`
2. Leer `00_INICIO_AQUI.md`
3. Decir a Claude: "Ya reinicié, leí la doc, voy con Opción C, guíame con métricas"
4. Claude guiará paso a paso en vivo

**Resultado esperado:** Plan ejecutable que no requiere expertise técnico del usuario, solo consistencia diaria (15-20 min).

### 🚀 ENERO 25, 2025 - NFT METADATA DISPLAY FIX DEFINITIVO ✅
**BREAKTHROUGH SESSION**: Finally solved NFT image display issue in MetaMask after multiple attempts

#### **🖼️ 5 ROOT CAUSES IDENTIFICADOS Y RESUELTOS**
- **PROBLEMA CRÍTICO**: NFT images showing placeholders forever in MetaMask after claiming
- **Previous Attempts**: Multiple fixes attempted but images still not showing
- **DEEP ANALYSIS**: Identified 5 interconnected root causes through comprehensive auditing
- **SOLUCIÓN DEFINITIVA**: Implementados 5 fixes críticos en metadata pipeline

#### **📁 FIXES IMPLEMENTADOS**
**Fix #1 - CID Path Preservation** (`mint-escrow.ts:1830-1836`):
```typescript
// ANTES: /\/ipfs\/([^\/\?]+)/ - Solo CID
// DESPUÉS: /\/ipfs\/(.+?)(?:\?|#|$)/ - CID + path completo
```

**Fix #2 - Placeholder Rejection** (`update-metadata-after-claim.ts:199-228`):
- Backend now validates and rejects placeholder images
- Fetches fresh metadata from server when placeholders detected

**Fix #3 - Redis Serialization** (`update-metadata-after-claim.ts:186-196`):
- Properly handles attributes as both string and array
- JSON.parse when string, use as-is when array

**Fix #4 - IPFS Normalization** (`nft/[...params].ts:208-222`):
- Always normalizes with `normalizeCidPath()`
- Eliminates `ipfs://ipfs/` duplications

**Fix #5 - Gateway Respect** (`nft-metadata/[contractAddress]/[tokenId].ts:141-161`):
- Uses working gateway from `getBestGatewayForCid()`
- No longer forces ipfs.io when other gateways work

#### **📚 DOCUMENTATION CREATED**
- **`NFT_METADATA_RUNBOOK.md`**: Complete guide with all fixes, troubleshooting, and configuration
- **`DEVELOPMENT.md`**: Updated with session details and fixes
- **`CLAUDE.md`**: Updated with critical changes and results

**RESULTADO FINAL**: ✅ NFT images appear in MetaMask in <10 seconds!

### 🚀 DICIEMBRE 21, 2025 - COMPLETE i18n ENGLISH TRANSLATIONS ✅
**COMPREHENSIVE SESSION**: Full English translations for educational and video components

#### **🌍 TRADUCCIÓN COMPLETA EN/ES - 6 COMMITS**
- **PROBLEMA CRÍTICO**: Múltiples textos en español persistían en componentes EN después de migración i18n
- **Root Cause**: Traducción incompleta durante clonación inicial de componentes ES→EN
- **SOLUCIÓN TIPO B**: Búsqueda sistemática y traducción de TODOS los textos españoles restantes
- **IMPACT**: ✅ Versión EN 100% en inglés, manteniendo ES intacta

#### **📝 TEXTOS TRADUCIDOS - EDUCACIÓN Y VIDEO**
**PreClaimFlowEN.tsx & ClaimEscrowInterfaceEN.tsx:**
- Quiz questions, error messages, success messages
- Educational module descriptions and instructions
- Security warnings and validation messages

**SalesMasterclassEN.tsx - COMPLETO:**
- "Las 3 Brechas del Mercado" → "The 3 Market Gaps"
- Todos los botones de acción: VIEW LIVE DEMO, SEE RESULTS, SEE BUSINESS MODEL, VIEW ROADMAP
- Team descriptions, knowledge center content, module progress
- "Tiempo restante" → "Time remaining"

**Video Components - NUEVOS ARCHIVOS:**
- Created `videoConfigEN.ts` with full English translations
- Created `IntroVideoGateEN.tsx` with "Loading video..." translation
- "Proyecto CryptoGift" → "CryptoGift Project"
- Video descriptions properly translated with formatting preserved

#### **🔧 BUILD ERROR FIX - APOSTROPHES**
- **PROBLEMA**: TypeScript error "Expected ',', got 't'" en Vercel deployment
- **Root Cause**: Unescaped apostrophes en strings ('don't', 'it's')
- **SOLUCIÓN TIPO A**: Escaped apostrophes ('don\'t', 'it\'s')
- **IMPACT**: ✅ Build successful, deployment restored

**FILES MODIFIED**: 7 files, 2 new files created
- `frontend/src/components-en/education/PreClaimFlowEN.tsx`
- `frontend/src/components-en/escrow/ClaimEscrowInterfaceEN.tsx`
- `frontend/src/components-en/education/EducationModuleEN.tsx`
- `frontend/src/components-en/education/LessonModalWrapperEN.tsx`
- `frontend/src/components-en/education/LessonModalWrapperForEducationEN.tsx`
- `frontend/src/components-en/learn/SalesMasterclassEN.tsx`
- `frontend/src/config/videoConfigEN.ts` (NEW)
- `frontend/src/components-en/video/IntroVideoGateEN.tsx` (NEW)

**VALIDATION**: TypeScript clean, ESLint compliant, Vercel deployment successful

### 🚀 AGOSTO 23, 2025 - MOBILE & UX PERFECTION ✅
**FIXES**: Mobile IPFS upload (exponential backoff retry 2s→4s→8s), DAO showcase unified (lessonId→sales-masterclass), Theme toggle navigation (separated from Link)
**FILES**: ipfs.ts, PreClaimFlow.tsx, Navbar.tsx (3 files, 146+/104-)

### 🚀 AGOSTO 21, 2025 - KNOWLEDGE ACADEMY COMPLETE ✅
**BREAKTHROUGH**: TU RUTA DE APRENDIZAJE restaurada (8 módulos curados), Creator Studio (wizard + RuleBuilder + 20+ templates + tab system), Unified Knowledge↔Educational (same Sales Masterclass, LessonModalWrapper universal)
**FILES**: 15+ across curriculum tree, achievement system, type system

### 🚀 AGOSTO 14, 2025 - EDUCATION SYSTEM FIXES ✅
**CRITICAL BUGS FIXED**: Missing claimer field, wallet connection timing, gateData fallbacks, modal height
**MOBILE CLAIMING**: `/api/nft/update-metadata-after-claim` endpoint (Redis sync), NFTs show real images
**FILES**: 8+ education/mobile systems, TypeScript clean

### 🚀 AGOSTO 10, 2025 - PRODUCTION FIX ✅
**CRITICAL**: `req is not defined` in mint-escrow (added req parameter), User-Agent dependencies eliminated (6 locations → timestamp/origin/X-Client-Type)
**FILES**: 11 files (30+/12-)

### 🚀 AGOSTO 9, 2025 - BASESCAN + DESKTOP ZOOM ✅
**FIXES**: BaseScan NFT display (`X-Frame-Options: DENY` → `SAMEORIGIN`), Desktop zoom (100% browser zoom perfect), IPFS fallback (triple gateway NFT.Storage→Cloudflare→IPFS.io, 2s timeout)
**FILES**: Multiple metadata endpoints + fallback systems

### 🚀 AGOSTO 4, 2025 - MOBILE UX R1-R6 ✅
**R1**: Deeplink auth (triple fallback MetaMask→custom→universal) | **R2**: MetaMask NFT visibility (<30s, pre-pin TokenURI) | **R3**: Spanish errors + Jest tests (6 cases, >95%) | **R4**: Vertical images (ResizeObserver, object-contain) | **R5**: Desktop zoom (scale 1.12, WCAG AA) | **R6**: IPFS retry (3-gateway, exponential backoff)
**VALIDATION**: TypeScript clean, ESLint compliant, backward compatible

### 🚀 AGOSTO 2, 2025 - UI SYSTEM REVOLUTION ✅
**NFT FIXES**: URL encoding (special chars), IPFS fallback gateways, MetaMask compatibility
**REDIS**: Development mode fallbacks, expired gifts claimable
**THEME SYSTEM**: ThemeSystem.tsx (variants: default/highlighted/interactive/warning/success), CryptoGiftTheme unified
**GLASS HEADERS**: GlassPanelHeader (blur intensities, scroll effects, Navigation/Dashboard/Modal variants)
**CHAIN SWITCHING**: ChainSwitchingSystem (auto-detection, context-aware, QuickChainSwitch, multi-chain)
**NOTIFICATIONS**: NotificationProvider (transaction/wallet feedback, block explorer links, auto-dismiss)
**FILES**: 15+ across UI system

---

## 🔒 PROTOCOLOS DE DESARROLLO OBLIGATORIOS

### ⚡ PROTOCOLO DE COMPORTAMIENTO CRÍTICO

#### **ANTES DE CUALQUIER CAMBIO:**
1. **MINIMAL SCOPE**: Un problema = una corrección quirúrgica
2. **CONSULT FIRST**: Si afecta >5 líneas o cambia herramientas → CONSULTAR
3. **VERIFY EACH STEP**: Probar cada cambio antes del siguiente
4. **PRESERVE FUNCTIONALITY**: Nunca romper lo que funciona por optimización

#### **RED FLAGS - PARAR Y CONSULTAR:**
- Cambios en múltiples herramientas (npm↔pnpm)
- Soluciones en cascada (arreglar 3+ cosas juntas)
- Timeouts/errores de red (esperar conexión estable)
- Revertir y reintentar >2 veces
- Cualquier "temporal" o "workaround"

#### **REGLAS CORE INQUEBRANTABLES:**
- **NO ASUMIR**: Verificar estado actual antes de cambiar
- **CÓDIGO FINAL**: Sin TODOs, console.logs basura, o provisionales
- **CERO SECRETOS**: Todo en .env o paneles seguros
- **CONSISTENCIA**: Una sola versión de cada dependencia
- **BLOQUEANTE = CRÍTICO**: Si algo no cuadra → DETENER y consultar

#### **VERIFICACIÓN OBLIGATORIA:**
**NO marcar como completado sin:**
- ✅ Prueba reproducible (auto/manual)
- ✅ Screenshot/log/hash que demuestre resultado correcto
- ✅ Funcionalidad original preservada

### 🏷️ CLASIFICACIÓN DE CAMBIOS

#### **TIPO A - QUIRÚRGICO** (≤3 líneas, 1 archivo):
- Cambios de configuración minimal
- Fix de bugs específicos
- Corrections de typos o valores

#### **TIPO B - INTERMEDIO** (≤3 archivos, sin refactoring):
- Features nuevos pequeños
- Improvements UX localizados
- Integration de components existentes

#### **TIPO C - COMPLEJO** (>3 archivos, refactoring):
- Architectural changes
- System overhauls
- Major feature implementations
- **REQUIERE CONSULTA PREVIA OBLIGATORIA**

### 📋 VALIDATION CHECKLIST MANDATORY

#### **PRE-COMMIT REQUIREMENTS:**
- [ ] TypeScript compilation: 0 errors
- [ ] ESLint compliance: All rules passing
- [ ] Functionality preservation: Original features intact
- [ ] Performance impact: Measured and documented
- [ ] Mobile compatibility: Tested and verified

#### **DEPLOYMENT READINESS:**
- [ ] Production environment variables configured
- [ ] Error handling comprehensive
- [ ] Fallback systems functional
- [ ] User experience validated
- [ ] Security measures verified

---

## 🎯 COMMITMENT FINAL

**CALIDAD DE PRODUCCIÓN ÚNICAMENTE.**
**VERIFICAR TODO.**
**PRESERVAR FUNCIONALIDAD PRIMERO.**
**PROPONER MEJORAS PROACTIVAS ACORDE A LA VISIÓN.**
**SER EL MEJOR COLABORADOR TÉCNICO POSIBLE.**

---

## 📝 GUÍAS DE MANTENIMIENTO DEL CLAUDE.MD

### ⚠️ LÍMITE DE CARACTERES: 40,000 caracteres máximo (actual: optimizado)

### 🔧 CÓMO ACTUALIZAR SIN EXCEDER LÍMITE:

#### **AL AÑADIR NUEVAS SESIONES:**
1. **Formato Compacto**: Usar formato condensado tipo AGOSTO 2025 (bullet points, pipes |)
2. **Información Esencial**: Solo problema/solución/archivos/resultado
3. **Archivar Sesiones Antiguas**: Mover sesiones >6 meses a `CLAUDE_ARCHIVE.md`

#### **TEMPLATE PARA NUEVAS SESIONES:**
```markdown
### 🚀 [FECHA] - [TÍTULO DESCRIPTIVO] ✅
**PROBLEMA**: [Descripción breve]
**SOLUCIÓN**: [Fix implementado]
**FILES**: [Archivos modificados] ([líneas +/-])
**RESULTADO**: ✅ [Impacto verificable]
```

#### **SECCIONES A COMPRIMIR PRIMERO (SI SE EXCEDE LÍMITE):**
1. **Historial de Sesiones**: Condensar sesiones >3 meses
2. **Roadmap Futuro**: Reducir detalles de fases lejanas (Fase 3-4)
3. **Propuestas Proactivas**: Mantener solo lista, eliminar código ejemplo
4. **Design Roadmap**: Formato ultra-compacto arrow-based

#### **MANTENER SIEMPRE COMPLETAS:**
- ✅ Contratos Smart desplegados (addresses críticas)
- ✅ Stack tecnológico core y versiones
- ✅ Sistemas críticos operativos (R1-R6, Education, etc.)
- ✅ Estructura de archivos críticos
- ✅ Protocolos de desarrollo obligatorios
- ✅ Último commit & cambios recientes

### 📊 VERIFICACIÓN DE TAMAÑO:
```bash
# Contar caracteres actuales
wc -m CLAUDE.md

# Si excede 40,000 → comprimir historial o mover a archivo
```

---

*Esta documentación es el contexto completo e imprescindible para inicios de sesión. Contiene toda la información técnica, arquitectural, histórica y estratégica necesaria para trabajar eficientemente en CryptoGift Wallets. Actualizada continuamente con cada sesión para mantener el conocimiento completo del proyecto.*

**🚀 READY TO INNOVATE - READY TO BUILD - READY TO EXCEL** 🚀