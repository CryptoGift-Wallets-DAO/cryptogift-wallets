# 🔍 DÓNDE REVISAR LA WALLET - GUÍA COMPLETA

## 🌐 URLS DE ACCESO

### 🟢 PRODUCCIÓN (Live)
```
https://cryptogift-wallets.vercel.app
```

### 🔵 DESARROLLO LOCAL
```bash
cd frontend
npm run dev
# Abre: http://localhost:3000
```

## 📱 PÁGINAS PRINCIPALES PARA REVISAR

### 1. **Homepage** 
- URL: `/`
- Verificar: Hero, features, CTAs

### 2. **My Wallets** (Principal)
- URL: `/my-wallets`
- Verificar:
  - ✅ Conexión de wallet (MetaMask, Coinbase, etc.)
  - ✅ Creación de NFT-Wallet
  - ✅ Visualización de NFTs
  - ✅ Balance de tokens
  - ✅ Funciones Send/Receive/Swap

### 3. **Gift Claim** 
- URL: `/gift/claim/[tokenId]`
- Ejemplo: `/gift/claim/209`
- Verificar:
  - ✅ Sistema de password
  - ✅ Educational requirements
  - ✅ Claim exitoso
  - ✅ Imágenes NFT visibles

### 4. **Knowledge Center**
- URL: `/knowledge`
- Verificar:
  - ✅ Árbol curricular interactivo
  - ✅ Sales Masterclass
  - ✅ Sistema de lecciones

### 5. **Debug Console** (Solo dev)
- URL: `/debug`
- Verificar logs y errores

## 🧪 FLUJOS DE TESTING CRÍTICOS

### Flujo 1: Crear Gift con Education
```
1. Conectar wallet en /my-wallets
2. Crear nuevo gift con education requirements
3. Obtener link de claim
4. Abrir en modo incógnito
5. Verificar education flow → password → claim
```

### Flujo 2: Mobile Claim
```
1. Crear gift desde PC
2. Enviar link a móvil
3. Conectar wallet móvil (MetaMask/Coinbase)
4. Completar claim
5. Verificar imagen NFT visible
```

### Flujo 3: Account Abstraction
```
1. En /my-wallets con USDC
2. Hacer transacción sin ETH (gasless)
3. Verificar paymaster funciona
4. Verificar fallback a gas nativo
```

## 🔧 ENDPOINTS DE API PARA VERIFICAR

### Health Check
```bash
curl https://cryptogift-wallets.vercel.app/api/health
# Debe retornar: {"status":"healthy"}
```

### Telemetry
```bash
curl https://cryptogift-wallets.vercel.app/api/telemetry \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

### NFT Metadata
```bash
curl https://cryptogift-wallets.vercel.app/api/metadata/0xe9f316159a0830114252a96a6b7ca6efd874650f/209
# Debe retornar metadata JSON con imagen
```

## 📊 HERRAMIENTAS DE VERIFICACIÓN

### 1. **Lighthouse** (PWA & Performance)
```
1. Abrir Chrome DevTools
2. Tab "Lighthouse"
3. Run audit
4. Verificar: PWA ≥90, A11y ≥95
```

### 2. **Security Headers**
```bash
curl -I https://cryptogift-wallets.vercel.app
# Verificar CSP, HSTS, etc.
```

### 3. **Console Errors**
```
1. Abrir Chrome DevTools
2. Tab "Console"
3. NO debe haber errores CSP
4. NO debe haber errores de CORS
```

### 4. **Network Tab**
```
1. Chrome DevTools > Network
2. Verificar todas las requests 200/304
3. No debe haber 429 (rate limit)
4. No debe haber 5xx errores
```

## 🔗 CONTRATOS EN BASE SEPOLIA

### NFT Contract
```
https://sepolia.basescan.org/address/0xE9F316159a0830114252a96a6B7CA6efD874650F
```

### Escrow Contract
```
https://sepolia.basescan.org/address/0xA39a66681Ee42cDBD5d40F97ACf1F36eFD88D873
```

### Approval Gate
```
https://sepolia.basescan.org/address/0x99cCBE808cf4c01382779755DEf1562905ceb0d2
```

## 📱 TESTING MOBILE

### MetaMask Mobile
1. Instalar MetaMask app
2. Agregar Base Sepolia:
   - Chain ID: 84532
   - RPC: https://sepolia.base.org
3. Escanear QR o abrir link directo

### Trust Wallet
1. Similar proceso
2. Soporta WalletConnect v2

### Coinbase Wallet
1. App o extensión
2. Smart Wallet support

## ✅ CHECKLIST PRE-PRODUCCIÓN

- [ ] Todas las páginas cargan sin errores
- [ ] Wallet connection funciona
- [ ] NFT creation exitosa
- [ ] Gift claiming funciona (PC y móvil)
- [ ] Imágenes NFT visibles en MetaMask
- [ ] Education flow completo
- [ ] No errores en console
- [ ] Health check retorna healthy
- [ ] CSP no bloquea funcionalidad
- [ ] Rate limits activos pero no agresivos

---

*Para más detalles técnicos: Ver DEVELOPMENT.md*
*Para configurar Vercel: Ver VERCEL_ENV_SETUP.md*