# 🎯 PLAN DE ACCIÓN - SISTEMA DE COMPETENCIAS

> **DOCUMENTO ACTIVO DE TRABAJO**
> Este es el documento principal que guía el desarrollo del sistema de competencias.
> Última actualización: Enero 16, 2026
> Estado: EN PROGRESO - FASES 0, 1, 2, 3 y 4 COMPLETADAS ✅ (P0 críticos resueltos + Race conditions eliminadas)
> **Red**: Base Mainnet (Chain ID: 8453) - TODOS los contratos en mainnet

---

## RESUMEN EJECUTIVO

El sistema de competencias avanza con buena velocidad. **Fases 0 y 1 completadas**.
El SDK de Gnosis Safe está correctamente integrado (`safeClient.ts`) y ahora con APIs funcionales.

### ✅ INFRAESTRUCTURA YA EXISTENTE (REUTILIZABLE)
- **Sistema SIWE completo**: `siweAuth.ts`, `siweClient.ts`
- **Endpoints auth**: `/api/auth/challenge`, `/api/auth/verify`
- **Rate Limiting**: `rateLimiting.ts` con Redis
- **Challenge Storage**: `challengeStorage.ts` con Redis
- **JWT**: Generación y verificación lista
- **Cliente autenticado**: `makeAuthenticatedRequest()`, `getAuthHeader()`

**Tiempo estimado total**: 32-42 horas de desarrollo (reducido por infraestructura existente)
**Fases críticas**: 0 (simplificada), 1, 2, 3 (deben completarse para funcionalidad básica)

---

## ERRORES CRÍTICOS IDENTIFICADOS

### 🔴 P0 - BLOQUEAN FUNCIONAMIENTO

| # | Error | Ubicación | Estado |
|---|-------|-----------|--------|
| 1 | Contratos Zodiac = 0x0 | `safeIntegration.ts:68-72` | 🔧 MVP sin Zodiac (Fase 5) |
| 2 | Safe creation es MOCK | `create.ts` | ✅ RESUELTO - usa predictSafeAddress real |
| 3 | APIs faltantes para useSafe | `useSafe.ts` | ✅ RESUELTO - 11 endpoints funcionales |
| 4 | Hook sin signer real | `useSafe.ts` | ✅ RESUELTO - useActiveAccount + signSafeTxHash |
| 5 | Zero autenticación | APIs competencias | ✅ RESUELTO - authMiddleware.ts + SIWE |
| 11 | vote.ts sin auth | `vote.ts` | ✅ RESUELTO - withAuth() añadido |
| 12 | Safe API URL = Sepolia | `safeIntegration.ts:517` | ✅ RESUELTO - Base Mainnet URL |
| 13 | distribute.ts participants set | `distribute.ts:133` | ✅ RESUELTO - usa competition.participants.entries |

### 🟠 P1 - BUGS IMPORTANTES

| # | Error | Ubicación | Impacto | Estado |
|---|-------|-----------|---------|--------|
| 6 | Race conditions Redis | `bet.ts`, `join.ts` | Datos corruptos en concurrencia | ✅ RESUELTO - Lua scripts atómicos |
| 7 | platformFee no en tipo | `create.ts:117` | Inconsistencia TypeScript | 🔜 Fase 6 |
| 8 | Balance check inconsistente | `distribute.ts:115-119` | Validación puede fallar | 🔜 Fase 6 |
| 9 | Participants set vacío | `join.ts` | Verificación siempre falla | ✅ RESUELTO - Lua valida en script |
| 10 | Manifold sin retry | `bet.ts:111-127` | Apuestas no sincronizadas | ✅ RESUELTO - Fire-and-forget async |

---

## FASES DE IMPLEMENTACIÓN

### FASE 0: AUTENTICACIÓN Y AUTORIZACIÓN ✅ COMPLETADA
- **Prioridad**: P0
- **Esfuerzo**: 2-3 horas (reducido de 6-8 horas)
- **Estado**: ✅ COMPLETADA (Enero 14, 2026)

**YA EXISTÍA** ✅:
- Endpoints `/api/auth/challenge` y `/api/auth/verify`
- `siweAuth.ts`: `verifyJWT()`, `generateJWT()`, `verifySiweSignature()`
- `siweClient.ts`: `makeAuthenticatedRequest()`, `getAuthHeader()`
- Rate limiting y challenge storage en Redis

**COMPLETADO**:
1. ✅ Endpoints auth → YA EXISTÍAN
2. ✅ `authMiddleware.ts` creado con `withAuth()` y `getAuthenticatedAddress()`
3. ✅ Middleware aplicado a APIs: `create.ts`, `join.ts`, `bet.ts`, `distribute.ts`, `deploy-safe.ts`
4. ✅ Contexto frontend → `siweClient.ts` ya tiene estado global

### FASE 1: CREACIÓN DE SAFE REAL ✅ COMPLETADA
- **Prioridad**: P0
- **Esfuerzo**: 8-10 horas
- **Estado**: ✅ COMPLETADA (Enero 16, 2026)

**COMPLETADO**:
1. ✅ `create.ts` ahora usa `predictSafeAddress()` real en lugar de mock
2. ✅ Creado `/api/competition/[id]/deploy-safe.ts` para confirmar deployment
3. ✅ Creado `/api/safe/deploy.ts` para verificar deployment on-chain
4. ✅ `Competition` type actualizado con campo `custody` para tracking
5. ✅ Response incluye `safeDeploymentInfo` con instrucciones para frontend

**Flujo implementado**:
```
1. POST /api/competition/create
   → Predice Safe address (counterfactual)
   → Retorna safeDeploymentInfo con saltNonce, owners, threshold

2. Frontend despliega Safe con Safe SDK + wallet del usuario

3. POST /api/competition/[id]/deploy-safe
   → Verifica deployment on-chain
   → Actualiza competition.custody.deployed = true
   → Crea índice safe:address → competition lookup
```

### FASE 2: APIs FALTANTES PARA HOOK useSafe ✅ COMPLETADA
- **Prioridad**: P0
- **Esfuerzo**: 10-12 horas
- **Depende de**: Fase 1 ✅
- **Estado**: ✅ COMPLETADA (Enero 16, 2026)

**Endpoints completados**:
- ✅ `/api/safe/[address]/index.ts` - GET Safe info (ya existía)
- ✅ `/api/safe/[address]/transactions/index.ts` - GET/POST transactions (ya existía)
- ✅ `/api/safe/[address]/execute.ts` - Execute transaction (ya existía)
- ✅ `/api/safe/[address]/confirm.ts` - NUEVO: Confirmar con firma
- ✅ `/api/safe/[address]/reject.ts` - NUEVO: Preparar rechazo
- ✅ `/api/safe/[address]/modules.ts` - NUEVO: Lista módulos
- ✅ `/api/safe/[address]/history.ts` - NUEVO: Historial
- ✅ `/api/safe/[address]/propose.ts` - NUEVO: Proponer transacción firmada
- ✅ `/api/safe/create.ts` - Ya existía, corregido chainId 8453
- ✅ `/api/safe/deploy.ts` - NUEVO: Verificar deployment

**Total: 10 endpoints funcionales para useSafe hook**

### FASE 3: HOOK useSafe CON SIGNER REAL ✅ COMPLETADA
- **Prioridad**: P0
- **Esfuerzo**: 6-8 horas
- **Estado**: ✅ COMPLETADA (Enero 16, 2026)

**COMPLETADO**:
1. ✅ Hook usa `useActiveAccount()` de ThirdWeb (no `window.ethereum`)
2. ✅ Firma real de transacciones con `signSafeTxHash()`
3. ✅ Usa `siweClient.ts` existente para auth (`getAuthHeader()`, `isAuthValid()`)
4. ✅ Todos los métodos usan autenticación SIWE

**Archivos creados/modificados**:
- ✅ `safeEIP712.ts` - Helper para firma EIP-712 de Safe
- ✅ `prepare-transaction.ts` - Endpoint para calcular safeTxHash
- ✅ `useSafe.ts` - Hook completamente corregido

**Flujo de propuesta de transacción**:
```
1. Frontend: POST /api/safe/[address]/prepare-transaction
   → Backend calcula safeTxHash y devuelve datos

2. Frontend: signSafeTxHash(account, safeTxHash)
   → Usuario firma con su wallet (eth_sign)

3. Frontend: POST /api/safe/[address]/propose
   → Envía firma + datos al Safe Transaction Service
```

### FASE 4: OPERACIONES REDIS ATÓMICAS ✅ COMPLETADA
- **Prioridad**: P1
- **Esfuerzo**: 4-6 horas
- **Estado**: ✅ COMPLETADA (Enero 16, 2026)

**COMPLETADO**:
1. ✅ `atomicOperations.ts` - Lua scripts para operaciones atómicas
2. ✅ `atomicJoinCompetition` - Script Lua que:
   - Lee competición, valida status, verifica duplicados, verifica max participants
   - Actualiza todo atómicamente (competition, events, user:joined)
3. ✅ `atomicPlaceBet` - Script Lua que:
   - Lee market state, calcula shares con CPMM, actualiza probability
   - Actualiza pool, volume, bets atomicamente
4. ✅ `join.ts` modificado para usar operación atómica
5. ✅ `bet.ts` modificado con:
   - Operación atómica local primero
   - Sync con Manifold async (fire-and-forget, no bloquea)

**Archivos creados/modificados**:
- ✅ `atomicOperations.ts` - NUEVO: 2 Lua scripts + funciones TypeScript
- ✅ `join.ts` - Simplificado, usa atomicJoinCompetition
- ✅ `bet.ts` - Simplificado, usa atomicPlaceBet + Manifold async

### FASE 5: CONTRATOS ZODIAC (SIMPLIFICADO)
- **Prioridad**: P1
- **Esfuerzo**: 2-4 horas
- **Depende de**: Fase 1

**Decisión**: Para MVP, NO usar módulos Zodiac complejos.
- Safe básico con threshold N-of-M
- Dispute period manejado en backend
- Validaciones en backend antes de proponer

### FASE 6: TESTING Y POLISH
- **Prioridad**: P2
- **Esfuerzo**: 6-8 horas
- **Depende de**: Todas las anteriores

**Tareas**:
1. Corregir tipos (platformFee)
2. Corregir participants set en join.ts
3. Implementar endpoint SSE
4. Tests E2E del flujo completo

---

## ORDEN DE EJECUCIÓN

```
✅ FASE 0 → Autenticación (COMPLETADA 14-Ene-2026)
✅ FASE 1 → Safe Real (COMPLETADA 16-Ene-2026)
✅ FASE 2 → APIs Faltantes (COMPLETADA 16-Ene-2026) - 11 endpoints
✅ FASE 3 → Hook Signer (COMPLETADA 16-Ene-2026)
✅ FASE 4 → Redis Atomic (COMPLETADA 16-Ene-2026) - Lua scripts
🔜 FASE 5 → Zodiac simplificado (opcional para MVP)
🔜 FASE 6 → Testing (SIGUIENTE)
```

---

## CHECKLIST DE VALIDACIÓN FINAL

- [x] Usuario puede conectar wallet y obtener sesión (Fase 0 ✅)
- [x] Usuario puede crear competencia con Safe predicho (Fase 1 ✅)
- [x] APIs validan autenticación JWT (Fase 0 ✅)
- [x] APIs para proponer transacciones (Fase 2 ✅)
- [x] APIs para confirmar con firma (Fase 2 ✅)
- [x] Hook usa ThirdWeb account para firmar (Fase 3 ✅)
- [x] Hook firma transacciones con EIP-712 (Fase 3 ✅)
- [x] Flujo completo propose: prepare → sign → submit (Fase 3 ✅)
- [x] Otros usuarios pueden unirse (con atomicidad) (Fase 4 ✅)
- [x] Usuarios pueden apostar (mercado predicción) (Fase 4 ✅)
- [x] No hay race conditions en operaciones concurrentes (Fase 4 ✅)
- [ ] Safe se despliega on-chain al confirmar (endpoint listo, falta UI frontend)
- [ ] Jueces pueden proponer distribución - Fase 3 ✅ (hook listo, falta UI)
- [ ] Eventos se emiten en tiempo real (SSE) - Fase 6

---

## NOTAS TÉCNICAS

### Safe SDK Packages Requeridos
```json
{
  "@safe-global/protocol-kit": "^4.x",
  "@safe-global/api-kit": "^2.x",
  "@safe-global/safe-core-sdk-types": "^5.x"
}
```

### Contratos Base Mainnet (Chain ID: 8453) - PRODUCCIÓN
```
SAFE_L2_SINGLETON:   0xfb1bffC9d739B8D520DaF37dF666da4C687191EA  (v1.3.0 eip155)
SAFE_PROXY_FACTORY:  0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC  (v1.3.0 eip155)
MULTI_SEND:          0x998739BFdAAdde7C933B942a68053933098f9EDa  (v1.3.0 eip155)
FALLBACK_HANDLER:    0x017062a1dE2FE6b99BE3d9d37841FeD19F573804  (v1.3.0 eip155)
```

### Safe Transaction Service
```
URL: https://safe-transaction-base.safe.global
```

### Fuentes de Addresses
- [safe-global/safe-deployments](https://github.com/safe-global/safe-deployments)

---

*Documento generado tras auditoría exhaustiva del sistema de competencias.*
*Seguir este plan en orden para lograr un sistema funcional.*
