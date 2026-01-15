# 🎯 PLAN DE ACCIÓN - SISTEMA DE COMPETENCIAS

> **DOCUMENTO ACTIVO DE TRABAJO**
> Este es el documento principal que guía el desarrollo del sistema de competencias.
> Última actualización: Enero 2026
> Estado: EN PROGRESO
> **Red**: Base Mainnet (Chain ID: 8453) - TODOS los contratos en mainnet

---

## RESUMEN EJECUTIVO

El sistema de competencias tiene una arquitectura bien diseñada pero **NO está listo para producción**.
El SDK de Gnosis Safe está correctamente integrado (`safeClient.ts`), pero hay múltiples piezas críticas
que son scaffolding o que fallan silenciosamente.

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

| # | Error | Ubicación | Impacto |
|---|-------|-----------|---------|
| 1 | Contratos Zodiac = 0x0 | `safeIntegration.ts:68-72` | Transacciones a dirección cero |
| 2 | Safe creation es MOCK | `create.ts:156-162` | No se crea Safe real |
| 3 | APIs faltantes para useSafe | `useSafe.ts` | Frontend falla con 404 |
| 4 | Hook sin signer real | `useSafe.ts:228-233` | No puede firmar transacciones |
| 5 | Zero autenticación | Todos los APIs | Cualquiera puede suplantar |

### 🟠 P1 - BUGS IMPORTANTES

| # | Error | Ubicación | Impacto |
|---|-------|-----------|---------|
| 6 | Race conditions Redis | `bet.ts`, `join.ts` | Datos corruptos en concurrencia |
| 7 | platformFee no en tipo | `create.ts:117` | Inconsistencia TypeScript |
| 8 | Balance check inconsistente | `distribute.ts:115-119` | Validación puede fallar |
| 9 | Participants set vacío | `join.ts` | Verificación siempre falla |
| 10 | Manifold sin retry | `bet.ts:111-127` | Apuestas no sincronizadas |

---

## FASES DE IMPLEMENTACIÓN

### FASE 0: AUTENTICACIÓN Y AUTORIZACIÓN ⚡ SIMPLIFICADA
- **Prioridad**: P0
- **Esfuerzo**: 2-3 horas (reducido de 6-8 horas)
- **Bloquea**: Todo lo demás

**YA EXISTE** ✅:
- Endpoints `/api/auth/challenge` y `/api/auth/verify`
- `siweAuth.ts`: `verifyJWT()`, `generateJWT()`, `verifySiweSignature()`
- `siweClient.ts`: `makeAuthenticatedRequest()`, `getAuthHeader()`
- Rate limiting y challenge storage en Redis

**TAREAS RESTANTES**:
1. ✅ ~~Crear endpoints auth~~ → YA EXISTEN
2. 🔧 Crear `authMiddleware.ts` wrapper que use `verifyJWT()` existente
3. 🔧 Aplicar middleware a APIs de competencias (create, join, bet, distribute)
4. ✅ ~~Crear contexto frontend~~ → `siweClient.ts` ya tiene estado global

### FASE 1: CREACIÓN DE SAFE REAL
- **Prioridad**: P0
- **Esfuerzo**: 8-10 horas
- **Depende de**: Fase 0

**Tareas**:
1. Modificar `create.ts` para devolver solo `predictedSafeAddress`
2. Crear endpoint `/api/competition/[id]/confirm-safe`
3. Frontend despliega Safe con signer real
4. Backend verifica deployment y actualiza estado

### FASE 2: APIs FALTANTES PARA HOOK useSafe
- **Prioridad**: P0
- **Esfuerzo**: 10-12 horas
- **Depende de**: Fase 1

**Endpoints a crear**:
- `/api/safe/[address]/propose.ts`
- `/api/safe/[address]/confirm.ts`
- `/api/safe/[address]/execute.ts`
- `/api/safe/[address]/reject.ts`
- `/api/safe/[address]/transactions.ts`
- `/api/safe/[address]/modules.ts`
- `/api/safe/[address]/history.ts`
- `/api/safe/create.ts`

### FASE 3: HOOK useSafe CON SIGNER REAL
- **Prioridad**: P0
- **Esfuerzo**: 6-8 horas
- **Depende de**: Fase 2

**Tareas**:
1. Integrar con ThirdWeb `useActiveAccount`
2. Implementar firma real de transacciones
3. Crear `AuthContext` para sesiones
4. Conectar hook con APIs autenticados

### FASE 4: OPERACIONES REDIS ATÓMICAS
- **Prioridad**: P1
- **Esfuerzo**: 4-6 horas
- **Depende de**: Fase 0

**Tareas**:
1. Crear Lua scripts para operaciones atómicas
2. Implementar `atomicJoinCompetition`
3. Implementar `atomicPlaceBet`
4. Modificar APIs para usar operaciones atómicas

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
DÍA 1-2:  FASE 0 → Autenticación (base para todo)
DÍA 3-4:  FASE 1 → Safe Real
DÍA 5-7:  FASE 2 → APIs Faltantes
DÍA 8-9:  FASE 3 → Hook Signer
DÍA 10:   FASE 4 → Redis Atomic
DÍA 11:   FASE 5 → Zodiac simplificado
DÍA 12:   FASE 6 → Testing
```

---

## CHECKLIST DE VALIDACIÓN FINAL

- [ ] Usuario puede conectar wallet y obtener sesión
- [ ] Usuario puede crear competencia con Safe predicho
- [ ] Safe se despliega on-chain al confirmar
- [ ] Otros usuarios pueden unirse (con atomicidad)
- [ ] Usuarios pueden apostar (mercado predicción)
- [ ] Jueces pueden proponer distribución
- [ ] Firmas se recolectan correctamente
- [ ] Transacción se ejecuta cuando hay threshold
- [ ] Eventos se emiten en tiempo real (SSE)
- [ ] No hay race conditions en operaciones concurrentes

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
