# ⚠️ CONFIGURACIÓN CRÍTICA - APPROVER_PRIVATE_KEY

## 🔴 ERROR COMÚN DE CONFIGURACIÓN

Si configuras incorrectamente el `APPROVER_PRIVATE_KEY` poniendo la **dirección del wallet** en lugar de la **clave privada**, el sistema no funcionará.

### ❌ INCORRECTO:
```env
APPROVER_PRIVATE_KEY=0xTU_WALLET_ADDRESS_AQUI  # ESTO ES LA DIRECCIÓN, NO LA CLAVE
```

### ✅ CORRECTO:
```env
APPROVER_PRIVATE_KEY=0xTU_PRIVATE_KEY_64_CARACTERES_HEX
```

## 📝 CÓMO OBTENER LA CLAVE PRIVADA

1. Genera una nueva wallet dedicada para el Approver
2. **NUNCA** uses la wallet principal con fondos
3. Guarda la clave privada en un lugar seguro (NO en el repo)

```bash
# Generar nueva wallet
node -e "const {ethers}=require('ethers');const w=ethers.Wallet.createRandom();console.log('Address:',w.address);console.log('PrivateKey:',w.privateKey);"
```

## 🔧 PASOS PARA CONFIGURAR

### 1. En Vercel Dashboard:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Añade `APPROVER_PRIVATE_KEY` con tu clave privada
4. **MARCA COMO "Sensitive"** para que no se muestre en logs
5. Save

### 2. En tu archivo `.env.local`:
```env
# SimpleApprovalGate Configuration
NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS=0xTU_CONTRACT_ADDRESS
APPROVER_PRIVATE_KEY=0xTU_PRIVATE_KEY_AQUI
```

## ⚠️ SEGURIDAD IMPORTANTE

1. **NUNCA** subas la clave privada a GitHub
2. **SIEMPRE** marca como "Sensitive" en Vercel
3. **CONSIDERA** usar un servicio de gestión de secretos en producción
4. **TRANSFIERE** el rol de approver a una multisig cuando sea posible

## 🚨 ¿POR QUÉ ES CRÍTICO?

Sin la clave privada correcta:
- ❌ No se pueden emitir firmas EIP-712
- ❌ Los usuarios no podrán reclamar gifts después de la educación
- ❌ El sistema usará fallback (menos eficiente)

## ✅ VERIFICACIÓN

Para verificar que tu configuración funciona correctamente:

1. **Test local**:
```bash
cd frontend
node -e "
const ethers = require('ethers');
const pk = process.env.APPROVER_PRIVATE_KEY;
if (!pk) { console.log('❌ APPROVER_PRIVATE_KEY no configurado'); process.exit(1); }
const wallet = new ethers.Wallet(pk);
console.log('Address derivada:', wallet.address);
console.log('✅ Configuración correcta si la address coincide con tu approver');
"
```

2. **Test en producción**:
- Crear un gift con requisitos educativos
- Completar los módulos
- Verificar que se obtiene la firma EIP-712

## 📊 ESTADO DEL SISTEMA

### ✅ Funcionando:
- Contrato deployado y verificado
- APIs de educación desplegadas
- Sistema de módulos activo

### 🎯 Con APPROVER_PRIVATE_KEY correcto:
- Sistema 100% operativo
- Firmas EIP-712 activas
- Gas optimizado (<30k)

---

**ACCIÓN REQUERIDA**: Configura `APPROVER_PRIVATE_KEY` en Vercel y `.env.local` con la clave privada de tu wallet approver.

Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22