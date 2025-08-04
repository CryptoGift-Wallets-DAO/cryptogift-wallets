# Variables de Entorno Requeridas - CryptoGift Wallets

## 🔐 **CONFIGURACIÓN ACTUALIZADA (August 4, 2025)**

**⚠️ IMPORTANTE**: Este archivo ha sido limpiado de secrets. Ver `.env.example` para valores de ejemplo.

## 📱 **Mobile UX Features Configuration**

Las siguientes características móviles están habilitadas por defecto y no requieren variables adicionales:
- **R1: Deeplink Authentication** - Configurado automáticamente con MetaMask SDK
- **R2: NFT Visibility Enhancement** - Usa variables ThirdWeb existentes
- **R3: Spanish Error Messages** - Habilitado por defecto
- **R4: Vertical Image Layouts** - CSS responsivo automático  
- **R5: Auto Theme + Zoom** - CSS global sin configuración
- **R6: IPFS Gateway Retry** - Gateways públicos sin API keys

## ThirdWeb Configuration
Configurar estas variables en Vercel Dashboard:

### Para el Cliente (Frontend)
```
NEXT_PUBLIC_TW_CLIENT_ID=your_thirdweb_client_id
```

### Para APIs de Servidor (Backend)
```
TW_SECRET_KEY=your_thirdweb_secret_key
```

## 🎁 **Variables Core para NFT Ownership Transfer System**

### **Contratos Principales (REQUERIDOS)**
```bash
# Contract principal para NFTs
NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS=0x_your_deployed_nft_contract

# ERC-6551 Token Bound Account Configuration  
NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS=0x000000006551c19487814612e58FE06813775758
NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS=0x2d25602551487c3f3354dd80d76d54383a243358

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=your_rpc_endpoint
```

### **Sistema de Transferencia (REQUERIDOS)**
```bash
# Private key para transferencias programáticas (servidor only)
PRIVATE_KEY_DEPLOY=your_deployer_private_key

# Configuración de fees
NEXT_PUBLIC_CREATION_FEE_PERCENT=4
NEXT_PUBLIC_REF_TREASURY_ADDRESS=0x_your_treasury_address
```

### **Persistencia de Metadata (REQUERIDOS)**
```bash
# Redis/Upstash para metadata storage
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

### **Features Opcionales**
```bash
# IPFS Storage
NFT_STORAGE_API_KEY=your_nft_storage_key
PINATA_API_KEY=your_pinata_key

# AI Art Filters
PHOTOROOM_API_KEY=your_photoroom_key

# Testing & Debug
DISABLE_METADATA_CACHE=false  # Set to 'true' for testing
```

## 🔄 **CAMBIOS CRÍTICOS IMPLEMENTADOS:**

### **1. Unificación de Variables**
- ❌ **DEPRECATED**: `NEXT_PUBLIC_NFT_DROP_ADDRESS` 
- ✅ **NUEVO**: `NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS`
- **Razón**: Evitar inconsistencias en metadata y contratos

### **2. Sistema de Transferencia Programática**
- **`PRIVATE_KEY_DEPLOY`**: Usado para transferencias automáticas durante claim
- **ERC-6551 addresses**: Estandarizadas con suffijo `_ADDRESS`
- **Zero custodia humana**: Solo transferencia programática automática

### **3. Persistencia Mejorada**
- **Redis variables**: Requeridas para metadata persistence
- **Cache toggle**: `DISABLE_METADATA_CACHE` para testing
- **Validación estricta**: Metadata debe verificarse antes de completar mint

## 📋 **SETUP RÁPIDO PARA DESARROLLO:**

1. **Copiar variables base**:
   ```bash
   cp .env.example .env.local
   ```

2. **Configurar valores mínimos**:
   - `NEXT_PUBLIC_TW_CLIENT_ID`
   - `TW_SECRET_KEY` 
   - `NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS`
   - `PRIVATE_KEY_DEPLOY`
   - Redis/KV variables

3. **Testing mode**:
   ```bash
   # Para testing sin cache
   DISABLE_METADATA_CACHE=true
   ```

**📖 Para configuración completa, ver `frontend/.env.example` con todos los valores actualizados.**

## Importante
- Las variables `NEXT_PUBLIC_*` se usan en el cliente (components, pages)
- Las variables sin prefijo se usan en APIs de servidor (páginas en `/api/`)
- Ambas versiones del CLIENT_ID deben tener el mismo valor