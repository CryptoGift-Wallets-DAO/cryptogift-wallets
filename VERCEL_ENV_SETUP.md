# 🚀 VARIABLES DE ENTORNO PARA VERCEL - CONFIGURACIÓN COMPLETA

## 🔴 CRÍTICAS (Sin estas NO funciona)

```bash
# ThirdWeb - OBLIGATORIO
NEXT_PUBLIC_TW_CLIENT_ID=              # Obtener de https://thirdweb.com/dashboard
TW_SECRET_KEY=                          # Secret key de ThirdWeb dashboard

# Blockchain - OBLIGATORIO  
NEXT_PUBLIC_CHAIN_ID=8453              # Base Mainnet
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org

# Contratos - OBLIGATORIO
NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS=0xE9F316159a0830114252a96a6B7CA6efD874650F
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0xA39a66681Ee42cDBD5d40F97ACf1F36eFD88D873
NEXT_PUBLIC_APPROVAL_GATE_ADDRESS=0x99cCBE808cf4c01382779755DEf1562905ceb0d2
PRIVATE_KEY_DEPLOY=                    # Private key para operaciones (SIN 0x prefix)

# Auth - OBLIGATORIO
JWT_SECRET=                             # Generar: openssl rand -base64 32
NEXTAUTH_SECRET=                        # Generar: openssl rand -base64 32
NEXTAUTH_URL=https://cryptogift-wallets.vercel.app

# Admin - OBLIGATORIO
ADMIN_API_TOKEN=                        # Generar: openssl rand -hex 32
```

## 🟡 IMPORTANTES (Funcionalidad completa)

```bash
# Redis/KV Store
UPSTASH_REDIS_REST_URL=                # Crear en https://upstash.com
UPSTASH_REDIS_REST_TOKEN=              # Token de Upstash
KV_REST_API_URL=                        # O usar Vercel KV
KV_REST_API_TOKEN=                      # Token de Vercel KV

# Storage IPFS
NFT_STORAGE_API_KEY=                    # Gratis en https://nft.storage
PINATA_API_KEY=                         # Opcional - https://pinata.cloud
PINATA_API_SECRET=                      # Secret de Pinata

# WalletConnect
NEXT_PUBLIC_WC_PROJECT_ID=             # Obtener de https://cloud.walletconnect.com

# Biconomy (Account Abstraction)
NEXT_PUBLIC_BICONOMY_BUNDLER_URL=https://bundler.biconomy.io/api/v2/8453/
NEXT_PUBLIC_BICONOMY_PAYMASTER_URL=https://paymaster.biconomy.io/api/v1/8453/
BICONOMY_PAYMASTER_API_KEY=            # API key de Biconomy dashboard

# Base Sepolia Testnet (opcional)
ALCHEMY_API_KEY=                        # Para Base Sepolia RPC
BASESCAN_API_KEY=                       # Para verificación de contratos
```

## 🟢 MONITORING (Producción)

```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=                # DSN de Sentry.io
SENTRY_AUTH_TOKEN=                      # Para source maps

# Analytics
NEXT_PUBLIC_GA_ID=                      # Google Analytics 4 ID (G-XXXXXXXXXX)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=          # Opcional - dominio en Plausible

# Otros servicios de analytics (opcionales)
MIXPANEL_TOKEN=                         # Mixpanel project token
AMPLITUDE_API_KEY=                      # Amplitude API key
POSTHOG_API_KEY=                        # PostHog project API key
```

## ⚙️ FEATURE FLAGS

```bash
# Activar/Desactivar features
NEXT_PUBLIC_FEATURE_APPROVALS=on
NEXT_PUBLIC_FEATURE_SIM_PREVIEW=on
NEXT_PUBLIC_FEATURE_WALLET_MANAGEMENT=on
NEXT_PUBLIC_FEATURE_TX_HISTORY=on
NEXT_PUBLIC_FEATURE_PWA=on
NEXT_PUBLIC_FEATURE_A11Y=on
NEXT_PUBLIC_FEATURE_WEBPUSH=off        # Activar cuando esté listo
NEXT_PUBLIC_FEATURE_PUSH_PROTOCOL=off  # Requiere 50 PUSH stake
NEXT_PUBLIC_FEATURE_ERC20_PAYMASTER=on
NEXT_PUBLIC_FEATURE_SESSION_KEYS=on
NEXT_PUBLIC_FEATURE_RECOVERY=on
NEXT_PUBLIC_FEATURE_BRIDGE=on
NEXT_PUBLIC_FEATURE_ONRAMP=on

# Shadow Mode (para testing gradual)
NEXT_PUBLIC_SHADOW_MODE=false
NEXT_PUBLIC_BRIDGE_SHADOW_MODE=false
CSP_REPORT_ONLY=true                   # Cambiar a false después de 24h
```

## 🔄 ON-RAMP PROVIDERS (Opcional)

```bash
NEXT_PUBLIC_ONRAMP_PROVIDER=transak    # transak/moonpay/coinbase
TRANSAK_API_KEY=                       # Si usas Transak
MOONPAY_API_KEY=                       # Si usas MoonPay
COINBASE_API_KEY=                      # Si usas Coinbase Pay
```

## 🌉 BRIDGE PROVIDERS (Opcional)

```bash
SOCKET_API_KEY=                        # Socket.tech API key
LI_FI_API_KEY=                         # LI.FI API key
```

## 🔔 PUSH PROTOCOL (Futuro)

```bash
PUSH_CHANNEL_ADDRESS=                  # Dirección del canal Push
PUSH_CHANNEL_PRIVATE_KEY=              # Private key del canal
PUSH_ENV=staging                       # Cambiar a 'prod' cuando tengas 50 PUSH
```

## 🛡️ SEGURIDAD

```bash
# Configuración de seguridad
CSP_ENFORCE=false                      # true después de 24h en report-only
RATE_LIMITS_ENABLED=true
RATE_LIMIT_BYPASS_TOKEN=               # Token para bypass (testing)
MAINTENANCE_MODE=false                 # true para modo mantenimiento
MAINTENANCE_MESSAGE=                   # Mensaje de mantenimiento

# MEV Protection
NEXT_PUBLIC_MEV_PROTECT_MODE=rpc       # rpc/flashbots/disabled
FLASHBOTS_PROTECT_API_KEY=             # Si usas Flashbots Protect
```

## 📝 TELEMETRY

```bash
NEXT_PUBLIC_TELEMETRY_ENABLED=true     # Activar telemetría
```

---

## 🚨 CÓMO GENERAR SECRETS SEGUROS

```bash
# JWT_SECRET y NEXTAUTH_SECRET
openssl rand -base64 32

# ADMIN_API_TOKEN
openssl rand -hex 32

# PRIVATE_KEY_DEPLOY
# Usar una wallet dedicada para deploy, NO tu wallet personal
# Exportar desde MetaMask: Settings > Security > Show Private Key
```

## ✅ PASOS PARA CONFIGURAR EN VERCEL

1. Ir a https://vercel.com/[tu-usuario]/cryptogift-wallets/settings/environment-variables
2. Agregar cada variable con su valor
3. Seleccionar los entornos donde aplicar (Production/Preview/Development)
4. Click en "Save"
5. Hacer un nuevo deploy para aplicar cambios

## 🔄 ORDEN DE CONFIGURACIÓN RECOMENDADO

1. **Primero**: Variables CRÍTICAS (rojas)
2. **Segundo**: Redis/Storage (UPSTASH o Vercel KV)
3. **Tercero**: WalletConnect y Biconomy
4. **Cuarto**: Monitoring (Sentry + Analytics)
5. **Último**: Features opcionales y providers

## ⚠️ NOTAS IMPORTANTES

- **NUNCA** commits estas variables al repo
- **NUNCA** uses las mismas keys en dev y prod
- **SIEMPRE** rota las keys si sospechas compromiso
- **CSP_REPORT_ONLY=true** por 24h, luego cambiar a false
- **MAINTENANCE_MODE** útil para updates críticos

---

*Última actualización: August 24, 2025*
*Para soporte: Revisar DEVELOPMENT.md*