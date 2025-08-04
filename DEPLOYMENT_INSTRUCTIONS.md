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

### 4. 🎯 URL de tu Aplicación

Después del deployment, tu URL será algo como:
**https://cryptogift-wallets-[hash].vercel.app**

### 5. ✅ Verificar Funcionalidad

1. **Homepage**: Debe cargar con el wizard de creación
2. **Connect Wallet**: Debe conectar con MetaMask/Coinbase
3. **Create Gift**: Debe abrir el wizard completo
4. **Referrals**: Panel de referidos funcional

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

**¡Tu plataforma CryptoGift Wallets estará 100% operativa con experiencia mobile perfecta!** 🚀📱

---

## 📞 SOPORTE

Si necesitas ayuda:
- Revisa los logs en Vercel dashboard
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que el directorio root sea `frontend`

**¡Disfruta regalando el futuro!** 🎁✨