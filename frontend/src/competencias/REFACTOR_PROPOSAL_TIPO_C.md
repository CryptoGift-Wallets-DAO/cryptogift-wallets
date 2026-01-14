# PROPUESTA REFACTOR TIPO C: Integracion Safe Real para Competencias

**Fecha**: 2026-01-13
**Tipo**: TIPO C - Complejo (>3 archivos, refactoring mayor)
**Estimacion**: 20-30 horas de desarrollo
**Impacto**: Critico - Sistema de custodia de fondos

---

## 1. CONTEXTO ACTUAL

### 1.1 Estado del Codigo Existente

El modulo de competencias (`/frontend/src/competencias/`) fue creado en el commit `581e31c` con la siguiente arquitectura:

```
competencias/
  api/           # API handlers (create.ts, events.ts, list.ts)
  components/    # UI components (WorkflowWizard, CompetitionCard, etc.)
  contracts/     # CompetitionFactory.sol (no desplegado)
  hooks/         # React hooks (useSafe, useCompetition, useManifold)
  lib/           # Core libraries
    - safeIntegration.ts (782 lineas - SCAFFOLDING)
    - manifoldClient.ts (funcional - API externa)
    - redisSchema.ts (funcional)
    - eventSystem.ts (funcional)
  types/         # TypeScript definitions
  workflows/     # AI workflow definitions
```

### 1.2 Problemas Criticos Identificados

#### PROBLEMA 1: safeIntegration.ts es 100% SCAFFOLDING

**Evidencia tecnica:**

```typescript
// Linea 501-510 - FAKE HASH FUNCTION
function generateHash(input: string): string {
  // Placeholder - use keccak256 in production
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}
```

Esta funcion usa JavaScript hash basico en lugar de keccak256. TODAS las transacciones Safe dependen de hashes criptograficos correctos.

```typescript
// Linea 775-780 - FAKE TRANSACTION EXECUTION
return {
  success: true,
  data: {
    txHash: '0x' + 'pending'.padEnd(64, '0')  // NUNCA ES REAL
  }
};
```

La funcion `distributePrizes()` NUNCA ejecuta una transaccion real.

```typescript
// Linea 43-47 - MODULOS NO DESPLEGADOS
DELAY_MODIFIER: '0x0000000000000000000000000000000000000000',
ROLES_MODIFIER: '0x0000000000000000000000000000000000000000',
COMPETITION_GUARD: '0x0000000000000000000000000000000000000000'
```

Los modulos estan configurados como direcciones nulas.

#### PROBLEMA 2: API Endpoints No Existen

El hook `useSafe.ts` llama a endpoints que NO EXISTEN:

```typescript
// useSafe.ts linea 121-134
async function fetchSafe(safeAddress: string): Promise<GnosisSafe | null> {
  const response = await fetch(`/api/safe/${safeAddress}`);  // NO EXISTE
  // ...
}

// linea 162-172
async function fetchPendingTransactions(safeAddress: string) {
  const response = await fetch(`/api/safe/${safeAddress}/transactions`);  // NO EXISTE
  // ...
}
```

**Directorios verificados:**
- `/api/safe/` - NO EXISTE
- `/api/competition/[id]/safe/` - NO EXISTE

#### PROBLEMA 3: Safe SDK No Instalado

```bash
grep -r "@safe-global" package.json
# No matches found
```

Las dependencias oficiales de Gnosis Safe no estan instaladas:
- `@safe-global/protocol-kit` - Para operaciones con Safe
- `@safe-global/api-kit` - Para Safe Transaction Service
- `@safe-global/safe-core-sdk-types` - Tipos TypeScript

#### PROBLEMA 4: create.ts Crea Safes Falsos

```typescript
// create.ts linea 156-161
const safeResult = await createCompetitionSafe(competition, {
  sendTransaction: async () => {
    // In real implementation, this would send the transaction
    return { hash: `0x${competitionId.replace(/-/g, '')}` };  // HASH FALSO
  },
});
```

### 1.3 Recursos Existentes Aprovechables

**Configuracion disponible (.env.local):**
```
SAFE_BASE_ADDRESS=0x1B8dd3d34a31eE54d5ACAE0969F0a8E23dc547ec
SAFE_BASE_API_KEY=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Dependencias ya instaladas:**
- `ethers@6.15.0` - Para interaccion blockchain
- `viem@2.21.0` - Alternativa moderna a ethers
- `@upstash/redis` - Para almacenamiento de estado

**Infraestructura:**
- Safe existente en Base Sepolia
- Redis configurado y funcional
- API structure definida

---

## 2. SOLUCION PROPUESTA

### 2.1 Arquitectura Objetivo

```
FLUJO DE FONDOS PARA COMPETENCIAS
=================================

1. CREACION
   Usuario crea competencia
        |
        v
   [Safe Transaction Service API]
        |
        v
   Competition Safe (multisig) <-- Conectado al Safe existente
        |                          o nuevo Safe creado
        v
   Redis almacena metadata

2. DEPOSITO (Entry Fees / Prize Pool)
   Participante deposita ETH/tokens
        |
        v
   Transaction firmada por usuario
        |
        v
   [Competition Safe recibe fondos]
        |
        v
   Event emitido + Redis actualizado

3. RESOLUCION
   Jueces determinan ganadores
        |
        v
   [Safe Transaction propuesta]
        |
        v
   Threshold de firmas alcanzado
        |
        v
   [Safe execTransaction on-chain]
        |
        v
   Ganadores reciben premios

4. DISPUTA (opcional)
   Participante disputa resultado
        |
        v
   [Delay Module] activa cooldown
        |
        v
   [Kleros Arbitration] si necesario
        |
        v
   Resolucion final
```

### 2.2 Componentes a Implementar

#### A. Safe SDK Integration (CORE)

**Archivo:** `lib/safeClient.ts` (NUEVO)

```typescript
// Funcionalidades:
- initializeSafeSDK()        // Conectar con Safe existente
- createNewCompetitionSafe() // Crear Safe para competencia
- proposeTransaction()       // Proponer tx al Safe Service
- signTransaction()          // Firmar con wallet del usuario
- executeTransaction()       // Ejecutar cuando threshold alcanzado
- getSafeBalance()           // Obtener balance ETH/tokens
- getTransactionHistory()    // Historial de transacciones
```

#### B. API Endpoints (NUEVO DIRECTORIO)

**Directorio:** `/api/safe/`

```
/api/safe/
  [address]/
    index.ts           # GET Safe info
    balance.ts         # GET Safe balance (ETH + tokens)
    transactions/
      index.ts         # GET/POST transactions
      [safeTxHash].ts  # GET specific tx, POST signature
    execute.ts         # POST execute transaction
  create.ts            # POST create new Safe
```

**Directorio:** `/api/competition/[id]/`

```
/api/competition/[id]/
  safe/
    deposit.ts         # POST deposit to competition Safe
    withdraw.ts        # POST initiate withdrawal
    distribute.ts      # POST distribute prizes
```

#### C. Smart Contracts (DESPLEGAR)

**Archivo:** `contracts/CompetitionGuard.sol`

Funcionalidades:
- Validar que withdrawals van solo a participantes registrados
- Limitar withdrawal amounts segun prize distribution
- Prevenir rug pulls por organizador
- Integracion con Delay Module para disputes

#### D. Hooks Actualizados

**Archivo:** `hooks/useSafe.ts` (REFACTOR)

- Conectar con API endpoints reales
- Manejar estados de transaccion (pending, signed, executed)
- Real-time updates via SSE
- Error handling robusto

### 2.3 Dependencias a Instalar

```bash
pnpm add @safe-global/protocol-kit@^4.1.0
pnpm add @safe-global/api-kit@^2.4.0
pnpm add @safe-global/safe-core-sdk-types@^5.1.0
```

---

## 3. PLAN DE IMPLEMENTACION

### Fase 1: Foundation (8-10 horas)

**Paso 1.1: Instalar Safe SDK**
```bash
cd frontend
pnpm add @safe-global/protocol-kit @safe-global/api-kit @safe-global/safe-core-sdk-types
```

**Paso 1.2: Crear safeClient.ts**
- Configuracion de SafeApiKit con API key existente
- Conexion con Safe existente (0x1B8dd3d34a31eE54d5ACAE0969F0a8E23dc547ec)
- Funciones core: getSafe, proposeTransaction, executeTransaction
- Usar keccak256 real de ethers.js

**Paso 1.3: Crear API endpoints base**
- `/api/safe/[address]/index.ts`
- `/api/safe/[address]/balance.ts`
- `/api/safe/[address]/transactions/index.ts`

### Fase 2: Depositos (4-5 horas)

**Paso 2.1: Endpoint de deposito**
- `/api/competition/[id]/safe/deposit.ts`
- Validar competencia existe y esta activa
- Registrar deposito en Redis
- Emitir evento SSE

**Paso 2.2: UI de deposito**
- Actualizar WorkflowWizard paso de "Join Competition"
- Mostrar balance actual del Safe
- Confirmar deposito con wallet del usuario

### Fase 3: Distribucion de Premios (6-8 horas)

**Paso 3.1: Endpoint de distribucion**
- `/api/competition/[id]/safe/distribute.ts`
- Construir transaccion multiSend para multiples ganadores
- Proponer al Safe Transaction Service
- Recolectar firmas de jueces

**Paso 3.2: Ejecucion**
- Verificar threshold de firmas
- Ejecutar transaccion on-chain
- Actualizar estado en Redis
- Emitir eventos de transparencia

### Fase 4: Competition Guard (4-5 horas)

**Paso 4.1: Desplegar contrato**
- Compilar CompetitionGuard.sol
- Desplegar en Base Sepolia
- Verificar en BaseScan

**Paso 4.2: Integrar Guard**
- Habilitar como Guard del Safe
- Configurar allowed recipients
- Testing de validaciones

### Fase 5: Testing E2E (3-4 horas)

**Escenarios de prueba:**
1. Crear competencia con Safe
2. Participante deposita entry fee
3. Jueces resuelven competencia
4. Premios distribuidos automaticamente
5. Dispute + Delay Module
6. Guard previene withdrawal no autorizado

---

## 4. IMPACTO

### 4.1 Seguridad

**ANTES (Scaffolding):**
- Sin custodia real de fondos
- Hash function insegura
- Sin validacion de firmas
- Vulnerable a cualquier ataque

**DESPUES (Implementacion real):**
- Fondos en Safe multisig auditado
- keccak256 para todos los hashes
- EIP-712 signatures verificadas on-chain
- Guard previene rug pulls
- Delay Module para disputes
- Threshold configurable de firmas

### 4.2 User Experience

**ANTES:**
- Competencias sin fondos reales
- No hay stakes reales
- Sin transparencia verificable

**DESPUES:**
- Depositos reales de ETH/tokens
- Stakes verificables on-chain
- Historial completo en Safe Transaction Service
- Real-time updates de transacciones

### 4.3 AI Agent Compatibility

**Objetivo:** El sistema debe ser tan sencillo que un agente AI pueda:

1. Recibir descripcion natural: "Quiero una competencia de prediccion con 1 ETH de premio, 3 jueces"
2. Configurar automaticamente:
   - Tipo de competencia: prediction
   - Prize pool: 1 ETH
   - Threshold: 2/3 jueces
   - Delay: 24h dispute period
   - Guard: participantes registrados only
3. Ejecutar creacion via API

**Parametros configurables por AI:**
```typescript
interface AICompetitionConfig {
  type: CompetitionCategory;
  prizePool: { amount: string; token: string };
  entryFee?: { amount: string; token: string };
  judges: { addresses: string[]; threshold: number };
  timeline: { duration: number; disputePeriod: number };
  restrictions: { maxParticipants?: number; allowedCountries?: string[] };
}
```

### 4.4 Developer Time

| Fase | Horas | Complejidad |
|------|-------|-------------|
| Foundation | 8-10 | Alta |
| Depositos | 4-5 | Media |
| Distribucion | 6-8 | Alta |
| Guard | 4-5 | Media |
| Testing | 3-4 | Media |
| **TOTAL** | **25-32** | - |

---

## 5. ARCHIVOS AFECTADOS

### Nuevos archivos:
- `lib/safeClient.ts` - Core Safe SDK integration
- `api/safe/[address]/index.ts` - Safe info endpoint
- `api/safe/[address]/balance.ts` - Balance endpoint
- `api/safe/[address]/transactions/index.ts` - Transactions list
- `api/safe/[address]/transactions/[hash].ts` - Single transaction
- `api/safe/create.ts` - Create new Safe
- `api/competition/[id]/safe/deposit.ts` - Deposit to competition
- `api/competition/[id]/safe/distribute.ts` - Distribute prizes
- `contracts/CompetitionGuard.sol` - On-chain guard (ya existe, desplegar)

### Archivos modificados:
- `lib/safeIntegration.ts` - Refactor completo usando Safe SDK
- `hooks/useSafe.ts` - Conectar con API endpoints reales
- `api/competition/create.ts` - Usar Safe SDK real
- `types/index.ts` - Agregar nuevos tipos si necesario
- `package.json` - Agregar dependencias Safe SDK

### Sin cambios:
- `lib/manifoldClient.ts` - Ya funcional
- `lib/redisSchema.ts` - Ya funcional
- `lib/eventSystem.ts` - Ya funcional
- `workflows/*` - Ya funcional
- `components/*` - Mayormente funcional

---

## 6. RIESGOS Y MITIGACIONES

### Riesgo 1: Safe API Key Expiracion
**Mitigacion:** Implementar refresh de API key, fallback a operaciones directas on-chain

### Riesgo 2: Gas Costs
**Mitigacion:** Batch transactions con multiSend, estimar gas antes de ejecutar

### Riesgo 3: Network Congestion
**Mitigacion:** Retry logic con exponential backoff, gas price oracle

### Riesgo 4: Guard Bugs
**Mitigacion:** Audit del contrato, testing extensivo, upgrade path via proxy

---

## 7. DECISION REQUERIDA

**APROBACION PARA PROCEDER CON TIPO C:**

- [ ] Confirmar arquitectura propuesta
- [ ] Confirmar uso del Safe existente (0x1B8d...) vs crear nuevos
- [ ] Confirmar threshold default para jueces (ej: 2/3)
- [ ] Confirmar dispute period default (ej: 24h)
- [ ] Autorizar instalacion de dependencias Safe SDK

---

**Propuesta creada por:** Claude
**Estado:** PENDIENTE APROBACION
**Siguiente paso:** Implementacion Fase 1 tras aprobacion
