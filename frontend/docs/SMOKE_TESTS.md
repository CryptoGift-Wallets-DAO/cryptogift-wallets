# 🧪 Smoke Tests - GiftEscrow Enterprise

> **Contrato**: `0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086`  
> **Red**: Base Sepolia (84532)  
> **Status**: ✅ Desplegado y verificado

## 📋 TESTS A EJECUTAR

### Test 1: Verificar Estado del Contrato ✅
```bash
# Check contract verification
forge verify-check --chain-id 84532 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086

# Check basic view functions
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "VERSION()" --rpc-url $BASE_SEPOLIA_RPC
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "IMMUTABLE()" --rpc-url $BASE_SEPOLIA_RPC
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "giftCounter()" --rpc-url $BASE_SEPOLIA_RPC
```

### Test 2: Crear NFT de Prueba
```bash
# Deploy or use existing NFT contract for testing
NFT_CONTRACT=0x54314166B36E3Cc66cFb36265D99697f4F733231  # From .env.local

# Mint NFT to test account
cast send $NFT_CONTRACT "mintTo(address,string)" $TEST_ADDRESS "ipfs://test-uri" \
  --private-key $TEST_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC

# Approve escrow to transfer NFT
cast send $NFT_CONTRACT "setApprovalForAll(address,bool)" 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 true \
  --private-key $TEST_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC
```

### Test 3: Crear Gift (createGift) 🎁
```bash
# Parameters for createGift
TOKEN_ID=1
NFT_CONTRACT=0x54314166B36E3Cc66cFb36265D99697f4F733231
PASSWORD="test_password_123"
SALT=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
TIMEFRAME=0  # FIFTEEN_MINUTES
GIFT_MESSAGE="Happy Birthday from CryptoGift!"
GATE=0x0000000000000000000000000000000000000000  # No gate

# Execute createGift
cast send 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 \
  "createGift(uint256,address,string,bytes32,uint256,string,address)" \
  $TOKEN_ID $NFT_CONTRACT "$PASSWORD" $SALT $TIMEFRAME "$GIFT_MESSAGE" $GATE \
  --private-key $TEST_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC

# Verify gift was created
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "giftCounter()" --rpc-url $BASE_SEPOLIA_RPC
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "getGift(uint256)" 1 --rpc-url $BASE_SEPOLIA_RPC
```

### Test 4: Verificar Estado del Gift 📊
```bash
# Check gift details
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "getGift(uint256)" 1 --rpc-url $BASE_SEPOLIA_RPC
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "getGiftMessage(uint256)" 1 --rpc-url $BASE_SEPOLIA_RPC
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "canClaimGift(uint256)" 1 --rpc-url $BASE_SEPOLIA_RPC
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "isGiftExpired(uint256)" 1 --rpc-url $BASE_SEPOLIA_RPC

# Check NFT is held by escrow
cast call $NFT_CONTRACT "ownerOf(uint256)" $TOKEN_ID --rpc-url $BASE_SEPOLIA_RPC
```

### Test 5: Reclamar Gift (claimGift) 🎉
```bash
# Claim gift with correct password
cast send 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 \
  "claimGift(uint256,string,bytes32,bytes)" \
  1 "$PASSWORD" $SALT "0x" \
  --private-key $CLAIMER_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC

# Verify gift was claimed
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "getGift(uint256)" 1 --rpc-url $BASE_SEPOLIA_RPC

# Verify NFT was transferred to claimer
cast call $NFT_CONTRACT "ownerOf(uint256)" $TOKEN_ID --rpc-url $BASE_SEPOLIA_RPC
```

### Test 6: Test Password Incorrecto 🔒
```bash
# Create second gift for password test
cast send 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 \
  "createGift(uint256,address,string,bytes32,uint256,string,address)" \
  2 $NFT_CONTRACT "correct_password" $SALT $TIMEFRAME "Test Gift 2" $GATE \
  --private-key $TEST_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC

# Try to claim with wrong password (should fail)
cast send 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 \
  "claimGift(uint256,string,bytes32,bytes)" \
  2 "wrong_password" $SALT "0x" \
  --private-key $CLAIMER_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC
# Expected: Transaction reverts with WrongPassword error
```

### Test 7: Test Gift Expirado (returnExpiredGift) ⏰
```bash
# Create gift with short expiration (15 minutes)
cast send 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 \
  "createGift(uint256,address,string,bytes32,uint256,string,address)" \
  3 $NFT_CONTRACT "expiry_test" $SALT 0 "Will expire soon" $GATE \
  --private-key $TEST_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC

# Wait 16 minutes or manipulate time in test environment

# Return expired gift
cast send 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 \
  "returnExpiredGift(uint256)" 3 \
  --private-key $TEST_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC

# Verify NFT returned to creator
cast call $NFT_CONTRACT "ownerOf(uint256)" 3 --rpc-url $BASE_SEPOLIA_RPC
```

### Test 8: Test Admin Functions 👑
```bash
# Test pause/unpause (only admin)
cast send 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "pause()" \
  --private-key $ADMIN_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC

cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "paused()" --rpc-url $BASE_SEPOLIA_RPC

cast send 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 "unpause()" \
  --private-key $ADMIN_PRIVATE_KEY --rpc-url $BASE_SEPOLIA_RPC

# Test access control
cast call 0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086 \
  "hasRole(bytes32,address)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  $ADMIN_ADDRESS --rpc-url $BASE_SEPOLIA_RPC
```

---

## 🔧 VARIABLES DE PRUEBA

### Cuentas de Test
```bash
# Admin account (deployer)
ADMIN_ADDRESS=0xc655BF2Bd9AfA997c757Bef290A9Bb6ca41c5dE6
ADMIN_PRIVATE_KEY="From .env.local"

# Test accounts (need Base Sepolia ETH)
TEST_ADDRESS=0x... # Creator account
TEST_PRIVATE_KEY=0x...

CLAIMER_ADDRESS=0x... # Claimer account  
CLAIMER_PRIVATE_KEY=0x...
```

### Contratos
```bash
BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e
ESCROW_CONTRACT=0x8b5182b0072f6A7e956FD22D61Ef0Fa6cB937086
NFT_CONTRACT=0x54314166B36E3Cc66cFb36265D99697f4F733231
```

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad Core
- [ ] **Contrato verificado** en BaseScan
- [ ] **VERSION()** retorna "1.0.0"
- [ ] **createGift()** funciona correctamente
- [ ] **claimGift()** con password correcto funciona
- [ ] **claimGift()** con password incorrecto falla apropiadamente
- [ ] **returnExpiredGift()** funciona después de expiración
- [ ] **NFTs transferidos** correctamente en cada paso

### Seguridad
- [ ] **Pause/unpause** solo funciona para admin
- [ ] **Roles** configurados correctamente
- [ ] **ReentrancyGuard** previene ataques
- [ ] **Password hashing** seguro

### Anti-Brute Force
- [ ] **MAX_ATTEMPTS** respetado
- [ ] **Cooldown** aplicado después de intentos fallidos
- [ ] **GiftLockTriggered** evento emitido

### Eventos
- [ ] **GiftCreated** emitido en createGift
- [ ] **GiftClaimed** emitido en claimGift  
- [ ] **GiftReturned** emitido en returnExpiredGift

---

## 🚨 POSIBLES PROBLEMAS

### 1. Trusted Forwarder Incorrecto
- **Síntoma**: Meta-transacciones fallan
- **Causa**: Forwarder de Mumbai en lugar de Base Sepolia
- **Solución**: Ver GASLESS_AA_ROADMAP.md

### 2. Gas Insuficiente
- **Síntoma**: Transactions revert por gas
- **Causa**: Contrato complejo requiere más gas
- **Solución**: Aumentar gas limit

### 3. NFT Approvals
- **Síntoma**: createGift falla
- **Causa**: Escrow no aprobado para transferir NFT
- **Solución**: setApprovalForAll antes de createGift

### 4. Balance Insuficiente
- **Síntoma**: Transactions fallan
- **Causa**: Cuentas sin Base Sepolia ETH
- **Solución**: Usar faucet Base Sepolia

---

## 📊 RESULTADOS ESPERADOS

### Transacciones Exitosas
1. ✅ Deploy NFT contract (si necesario)
2. ✅ Mint NFT to test account
3. ✅ Approve escrow for NFT transfers
4. ✅ Create gift with createGift()
5. ✅ Claim gift with claimGift()
6. ✅ Return expired gift with returnExpiredGift()

### Gas Usage Estimates
- **createGift**: ~250,000 gas
- **claimGift**: ~200,000 gas  
- **returnExpiredGift**: ~150,000 gas

### Event Logs
- Contract events should be emitted and visible in BaseScan
- Frontend should be able to parse events correctly

---

**Una vez completados estos smoke tests exitosamente, el contrato estará 100% validado para uso en producción y podremos proceder con la implementación de gasless/AA según el roadmap.**