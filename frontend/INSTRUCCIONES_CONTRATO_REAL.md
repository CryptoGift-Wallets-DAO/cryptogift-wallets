# 🚀 INSTRUCCIONES PARA CREAR NFT REAL

## PASO 1: DESPLEGAR CONTRATO NFT COLLECTION (TÚ DEBES HACER)

### 1.1 Ve a ThirdWeb Dashboard
- URL: https://thirdweb.com/explore/nft-collection
- Haz clic en "Deploy Now"

### 1.2 Conecta tu Wallet
- Dirección: `0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a`
- Red: Base Sepolia
- Asegúrate de tener ETH para gas (~$0.01)

### 1.3 Configuración del Contrato
```
Name: CryptoGift NFT-Wallets
Symbol: CGNFT
Network: Base Sepolia
Primary Sale Recipient: 0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a
Royalty Fee: 0%
Platform Fee: 0%
```

### 1.4 Desplegar
- Haz clic en "Deploy Contract"
- Confirma la transacción en tu wallet
- Espera confirmación en blockchain

### 1.5 Obtener Dirección del Contrato
- Copia la dirección del contrato desplegado
- Debería verse así: `0x1234567890abcdef...`

## PASO 2: ACTUALIZAR CONFIGURACIÓN (TÚ DEBES HACER)

### 2.1 Editar .env.local
Agrega esta línea al archivo `.env.local`:
```bash
NEXT_PUBLIC_NFT_COLLECTION_ADDRESS=0x[DIRECCIÓN_DEL_CONTRATO_QUE_DESPLEGASTE]
```

Ejemplo:
```bash
NEXT_PUBLIC_NFT_COLLECTION_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
```

### 2.2 Reiniciar el Servidor
```bash
# Detener el servidor (Ctrl+C)
# Luego reiniciar:
npm run dev
```

## PASO 3: PROBAR NFT REAL

### 3.1 Ir a la Aplicación
- Ve a: http://localhost:3000
- Crea un nuevo regalo cripto
- Usa cualquier imagen y mensaje
- Configura balance: $0 (para prueba)

### 3.2 Verificar que Funciona
El sistema ahora debería:
- ✅ Crear NFT REAL en blockchain
- ✅ Mostrar transaction hash real
- ✅ Generar TBA address correcta
- ✅ Subir metadata a IPFS
- ✅ Crear URL compartible funcional

## EJEMPLO DE RESULTADO EXITOSO

Cuando funcione correctamente, verás en los logs:
```
🎯 ESTRATEGIA FINAL: NFT Collection REAL
🏗️ Usando contrato NFT Collection real: 0x1234...
✅ Usando mintTo en contrato NFT Collection real
🔍 ENVIANDO TRANSACCIÓN REAL...
✅ NFT REAL CREADO! { transactionHash: '0xabc123...', tokenId: '1', contract: '0x1234...' }
```

## SI HAY PROBLEMAS

### Error: "DEBES ACTUALIZAR NEXT_PUBLIC_NFT_COLLECTION_ADDRESS"
- Significa que no has agregado la dirección del contrato a .env.local
- Solución: Agregar la línea como se indica en el Paso 2.1

### Error: "execution reverted"
- Significa que hay un problema con el contrato
- Solución: Verificar que:
  - El contrato se desplegó correctamente
  - Tu wallet es el owner del contrato
  - El contrato tiene permisos de mint

### Error: "insufficient funds"
- Significa que tu wallet no tiene ETH para gas
- Solución: Agregar ETH en Base Sepolia

## VERIFICACIÓN FINAL

Una vez que todo funcione:
1. Ve a: https://sepolia.basescan.org/address/[TU_CONTRATO]
2. Deberías ver transacciones de mint
3. Ve a: https://thirdweb.com/base-sepolia/[TU_CONTRATO]
4. Deberías ver los NFTs creados

¡ESTO CREARÁ NFTs REALES EN BLOCKCHAIN BASE SEPOLIA!