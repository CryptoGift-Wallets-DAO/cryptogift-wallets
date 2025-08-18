# 🚀 DEPLOYMENT INSTRUCTIONS - CryptoGift Wallets

## ✅ TODO ESTÁ LISTO - SIGUE ESTOS PASOS SIMPLES:

### 1. 📦 Preparar el Proyecto
```bash
cd C:\Users\rafae\cryptogift-wallets
git add .
git commit -m "feat: complete CryptoGift Wallets implementation 🎁"
git push origin main
```

### 2. 🌐 Deploy en Vercel (MÉTODO RECOMENDADO)

#### Opción A: Via Dashboard de Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en "New Project"
3. Conecta tu repositorio de GitHub: `cryptogift-wallets`
4. Configura:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### Opción B: Via CLI (Más Rápido)
```bash
# Instalar Vercel CLI
npm install -g vercel

# Navegar al frontend
cd frontend

# Deploy
vercel --prod

# Seguir las instrucciones en pantalla
```

### 3. ⚙️ Variables de Entorno en Vercel

En el dashboard de Vercel, ve a **Settings > Environment Variables** y añade:

#### 🔧 CORE SYSTEM VARIABLES
```
NEXT_PUBLIC_TW_CLIENT_ID=your_thirdweb_client_id
TW_SECRET_KEY=your_thirdweb_secret_key
NFT_STORAGE_API_KEY=your_nft_storage_api_key
NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS=0x_your_deployed_contract_address
NEXT_PUBLIC_CHAIN_ID=84532
PRIVATE_KEY_DEPLOY=your_wallet_private_key
NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS=0x000000006551c19487814612e58FE06813775758
NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS=0x2d25602551487c3f3354dd80d76d54383a243358
```

#### 🎓 EDUCATION SYSTEM VARIABLES (NUEVO - REQUERIDO)
```
# SimpleApprovalGate Contract (Deployed & Verified)
NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS=0x3FEb03368cbF0970D4f29561dA200342D788eD6B

# Education System Authentication (CRITICAL)
APPROVER_PRIVATE_KEY=your_approver_private_key_here
APPROVER_ADDRESS=your_approver_wallet_address

# Session Management & Rate Limiting
JWT_SECRET=your_secure_jwt_secret_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# WalletConnect Mobile Support
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
```

#### 🔐 SECURITY NOTE
- Mark **APPROVER_PRIVATE_KEY** as "Sensitive" in Vercel dashboard
- Mark **JWT_SECRET** as "Sensitive" in Vercel dashboard  
- Mark **TW_SECRET_KEY** as "Sensitive" in Vercel dashboard

### 4. 🎯 URL de tu Aplicación

Después del deployment, tu URL será algo como:
**https://cryptogift-wallets-[hash].vercel.app**

### 5. ✅ Verificar Funcionalidad

#### 🎯 CORE FEATURES
1. **Homepage**: Debe cargar con el wizard de creación
2. **Connect Wallet**: Debe conectar con MetaMask/Coinbase
3. **Create Gift**: Debe abrir el wizard completo
4. **Referrals**: Panel de referidos funcional

#### 🎓 EDUCATION SYSTEM VERIFICATION
1. **Create Gift with Education**: Test gift creation with education requirements
2. **Pre-Claim Flow**: Navigate to gift claim URL → Should show education modules
3. **Module Completion**: Complete required modules → Should generate EIP-712 signature  
4. **Gate Verification**: After education → Should allow claim with approved signature
5. **Admin Functions**: Test set-requirements endpoint with JWT authentication

#### 🔧 TEST COMMANDS (After Deployment)
```bash
# Test education system endpoints
curl -X POST https://your-domain.vercel.app/api/education/get-requirements \
  -H "Content-Type: application/json" \
  -d '{"tokenId": "123"}'

# Test gate verification
curl -X GET https://your-domain.vercel.app/api/education/verify-gate \
  -d '{"giftId": 789, "claimer": "0x...", "signature": "0x..."}'
```

---

## 🔥 DEPLOYMENT ALTERNATIVO - NETLIFY

Si prefieres Netlify:

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Build
cd frontend && npm run build

# Deploy
netlify deploy --prod --dir=.next
```

---

## 🐛 TROUBLESHOOTING

### Error: "Module not found"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error: "Environment variables"
- Asegúrate de que todas las variables estén configuradas en Vercel
- Verifica que no haya espacios extra en las variables

### Error: "Build failed"
- Verifica que estés desplegando desde el directorio `frontend`
- Revisa los logs en Vercel dashboard

---

## 🎉 ¡LISTO!

Una vez deployado, tendrás:

✅ **Homepage funcional** con wizard de creación  
✅ **NFT-Wallets** completamente operativas  
✅ **Sistema de referidos** con comisiones  
✅ **Swaps integrados** con 0x Protocol  
✅ **Gas gratuito** vía Paymaster  
✅ **Arte IA** con PhotoRoom (cuando configures la API key)  
✅ **Mobile UX optimizada** con deeplink authentication
✅ **NFT visibility mejorada** con pre-pinning MetaMask
✅ **Mensajes multilingües** en español correcto
✅ **Imágenes dinámicas** con ajuste automático vertical/horizontal
✅ **Sistema IPFS robusto** con triple-gateway fallback
✅ **Sistema de Educación** con 5 módulos interactivos
✅ **EIP-712 Approvals** con verificación stateless <30k gas
✅ **Rate Limiting** con Redis y session management
✅ **SimpleApprovalGate** contract deployed en Base Sepolia

**¡Tu plataforma CryptoGift Wallets estará 100% operativa con sistema de educación enterprise!** 🚀🎓

---

## 📞 SOPORTE

Si necesitas ayuda:
- Revisa los logs en Vercel dashboard
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que el directorio root sea `frontend`

**¡Disfruta regalando el futuro!** 🎁✨