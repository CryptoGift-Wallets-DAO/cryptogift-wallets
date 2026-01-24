# 🎯 PLAN DE ACCIÓN: PRODUCTION READY

> **Fecha**: 19 Enero 2026
> **Estado**: ACTIVO - En ejecución
> **Protocolo**: PERFECTO Y ROBUSTO
> **Objetivo**: Llevar el sistema a 100% production-ready

---

## RESUMEN EJECUTIVO

Este documento consolida dos auditorías independientes (interna + externa) y define el plan de acción definitivo para alcanzar production-ready.

**Auditorías realizadas:**
1. Auditoría Interna (Claude Opus 4.5) - 19 Ene 2026
2. Auditoría Externa (proporcionada por usuario) - Ene 2026

---

## 🔴 PRIORIDAD 0: BLOQUEANTES DE SEGURIDAD (INMEDIATO)

### SEC-001: Rotación de claves expuestas en repo
**Severidad**: 🔴 CRÍTICA - BLOQUEANTE
**Impacto**: Compromiso total de fondos y firmas si las claves fueron usadas
**Evidencia**:
- `IMPORTANT_CONFIGURATION.md:14-21` - Private key + Mnemonic en texto plano
- `VERCEL_ENV_SETUP.md:11-27` - Client IDs, URLs, RPC endpoints

**DEFINICIÓN DE DONE:**
- [ ] Claves rotadas en todos los servicios (ThirdWeb, Alchemy, Upstash)
- [ ] Nueva wallet de Approver generada y fondos transferidos
- [ ] Archivos de documentación sanitizados (solo placeholders)
- [ ] Pre-commit hook para detectar secretos
- [ ] Verificación: grep -r "0xe409aef94880" devuelve 0 resultados

**FIX DETALLADO:**

```bash
# PASO 1: Generar nueva wallet de Approver (HACER AHORA)
node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('=== NUEVA WALLET APPROVER ===');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
console.log('');
console.log('ACCIÓN: Guardar estos valores en lugar SEGURO (no en repo)');
"

# PASO 2: Transferir rol de Approver en contrato (si aplica)
# Verificar si el contrato permite cambio de approver

# PASO 3: Actualizar en Vercel Dashboard
# - APPROVER_PRIVATE_KEY = nueva clave
# - Marcar como "Sensitive"

# PASO 4: Rotar en servicios externos
# - ThirdWeb: Regenerar Client ID
# - Alchemy: Regenerar API key
# - Upstash: Regenerar tokens
```

**ARCHIVOS A MODIFICAR:**
1. `IMPORTANT_CONFIGURATION.md` → Eliminar secretos, usar placeholders
2. `VERCEL_ENV_SETUP.md` → Eliminar valores reales, usar `your_xxx_here`

**Esfuerzo**: S (1-2 horas)
**Dependencias**: Acceso a Vercel, ThirdWeb, Alchemy, Upstash dashboards
**Riesgo si no se hace**: Pérdida de fondos, compromiso de firmas EIP-712

---

### SEC-002: Añadir secret scanning en CI
**Severidad**: 🔴 ALTA
**Impacto**: Prevenir futuras exposiciones

**DEFINICIÓN DE DONE:**
- [ ] Pre-commit hook con gitleaks o similar
- [ ] GitHub workflow que bloquea PRs con secretos
- [ ] Verificación: commit con secreto es rechazado

**FIX DETALLADO:**

```bash
# Instalar gitleaks
brew install gitleaks

# Crear .gitleaks.toml
cat > .gitleaks.toml << 'EOF'
title = "CryptoGift Secret Scanner"

[extend]
useDefault = true

[[rules]]
description = "Ethereum Private Key"
regex = '''(0x)?[a-fA-F0-9]{64}'''
tags = ["key", "ethereum"]

[[rules]]
description = "Mnemonic Phrase"
regex = '''(?i)(seed|mnemonic|phrase).*[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}'''
tags = ["mnemonic"]

[allowlist]
paths = [
  '''\.env\.example''',
  '''node_modules''',
]
EOF

# Añadir pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

gitleaks protect --staged --verbose
EOF
chmod +x .husky/pre-commit
```

**Esfuerzo**: S (30 min)
**Dependencias**: SEC-001 completado primero

---

## 🟠 PRIORIDAD 1: ESTABILIDAD DE BUILD Y DEPLOY

### BUILD-001: Resolver fallo de build por NEXT_PUBLIC_SITE_URL
**Severidad**: 🟠 ALTA
**Impacto**: No se puede desplegar
**Evidencia**: `Error: NEXT_PUBLIC_SITE_URL or VERCEL_URL is required for metadata base URL`

**DEFINICIÓN DE DONE:**
- [ ] Build local pasa sin errores
- [ ] Build en Vercel pasa sin errores
- [ ] Verificación: `npm run build` exit code 0

**ANÁLISIS DE CAUSA RAÍZ:**
El error ocurre en `/explore` page que requiere metadata base URL en build time.
La variable existe en Vercel pero no está disponible durante el build estático.

**FIX DETALLADO:**

```typescript
// src/app/(marketing)/explore/page.tsx o layout.tsx
// Buscar donde se usa la metadata base URL y añadir fallback

// OPCIÓN A: Conditional metadata
export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
    'http://localhost:3000'
  ),
  // ...
};

// OPCIÓN B: Dynamic metadata con generateMetadata
export async function generateMetadata() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return {
    metadataBase: new URL(baseUrl),
    // ...
  };
}
```

**Esfuerzo**: S (30 min)
**Dependencias**: Ninguna

---

### BUILD-002: Redis conditional import para build time
**Severidad**: 🟠 MEDIA
**Impacto**: Warnings en build, features degradadas
**Evidencia**: `⚠️ Redis not configured - some features will be unavailable`

**DEFINICIÓN DE DONE:**
- [ ] Build no muestra warnings de Redis
- [ ] Features que requieren Redis funcionan en runtime
- [ ] Features fallan gracefully sin Redis

**FIX DETALLADO:**

```typescript
// src/lib/redisConfig.ts
// Mejorar el patrón de conexión lazy

let redisInstance: Redis | null = null;

export function getRedisConnection(): Redis {
  // Solo crear conexión en runtime, no en build time
  if (typeof window !== 'undefined') {
    throw new Error('Redis should only be used server-side');
  }

  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      // En build time, retornar mock silencioso
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
        console.warn('[Redis] Not configured - using mock for build');
        return createMockRedis();
      }
      throw new Error('Redis credentials not configured');
    }

    redisInstance = new Redis({ url, token });
  }

  return redisInstance;
}

function createMockRedis(): Redis {
  return {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    // ... otros métodos mock
  } as unknown as Redis;
}
```

**Esfuerzo**: M (2-3 horas)
**Dependencias**: Ninguna

---

## 🟡 PRIORIDAD 2: CI/CD Y CALIDAD

### CI-001: Hacer CI bloqueante (no informativo)
**Severidad**: 🟡 ALTA
**Impacto**: Deploys con código roto
**Evidencia**: `continue-on-error: true` en workflows, enforcement en "warning"

**DEFINICIÓN DE DONE:**
- [ ] TypeScript errors bloquean merge
- [ ] ESLint errors bloquean merge
- [ ] Tests failing bloquean merge
- [ ] Verificación: PR con error de tipos no puede mergearse

**FIX DETALLADO:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      # BLOQUEANTE - No continue-on-error
      - name: TypeScript Check
        run: pnpm run type-check

      - name: ESLint
        run: pnpm run lint

      - name: Tests
        run: pnpm test -- --passWithNoTests --coverage

      - name: Build
        run: pnpm run build
```

**Esfuerzo**: S (1 hora)
**Dependencias**: BUILD-001, BUILD-002 resueltos primero

---

### CI-002: Activar cron jobs
**Severidad**: 🟡 ALTA
**Impacto**: Gifts expirados no se devuelven automáticamente
**Evidencia**: Cron deshabilitado por Vercel Hobby plan

**DEFINICIÓN DE DONE:**
- [ ] Auto-return ejecuta cada 24 horas
- [ ] Cleanup ejecuta cada 12 horas
- [ ] Logs muestran ejecuciones exitosas
- [ ] Verificación: gift expirado se devuelve automáticamente

**FIX DETALLADO:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/auto-return",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/cleanup-transactions",
      "schedule": "0 */12 * * *"
    }
  ]
}
```

**Alternativa si Vercel Hobby:**
```yaml
# .github/workflows/cron.yml
name: Scheduled Tasks

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  auto-return:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger auto-return
        run: |
          curl -X POST "${{ secrets.SITE_URL }}/api/cron/auto-return" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Esfuerzo**: S (30 min para Vercel Pro, M 2h para GitHub Actions)
**Dependencias**: CRON_SECRET configurado

---

## 🟢 PRIORIDAD 3: FUNCIONALIDAD COMPETENCIAS

### COMP-001: UI para Safe deployment
**Severidad**: 🟢 MEDIA
**Impacto**: Usuarios no pueden completar flujo de competencia
**Evidencia**: Backend listo (`deploy-safe.ts`), falta UI

**DEFINICIÓN DE DONE:**
- [ ] Componente `SafeDeploymentFlow.tsx` creado
- [ ] Integrado en página de competencia
- [ ] Usuario puede desplegar Safe desde UI
- [ ] Estado de deployment se actualiza en tiempo real
- [ ] Verificación: competencia completa con Safe desplegado

**FIX DETALLADO:**

```typescript
// src/components/competitions/SafeDeploymentFlow.tsx
'use client';

import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { motion } from 'framer-motion';

interface SafeDeploymentFlowProps {
  competitionId: string;
  safeDeploymentInfo: {
    predictedAddress: string;
    owners: string[];
    threshold: number;
    saltNonce: string;
    deployed: boolean;
  };
  onDeploymentComplete: () => void;
}

export function SafeDeploymentFlow({
  competitionId,
  safeDeploymentInfo,
  onDeploymentComplete
}: SafeDeploymentFlowProps) {
  const account = useActiveAccount();
  const [step, setStep] = useState<'idle' | 'deploying' | 'confirming' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!account) {
      setError('Conecta tu wallet primero');
      return;
    }

    setStep('deploying');
    setError(null);

    try {
      // 1. Deploy Safe usando Safe SDK
      // TODO: Implementar con @safe-global/protocol-kit

      // 2. Confirmar deployment en backend
      const response = await fetch(`/api/competition/${competitionId}/deploy-safe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('siwe_token')}`
        },
        body: JSON.stringify({
          safeAddress: safeDeploymentInfo.predictedAddress,
          txHash: 'deployment_tx_hash'
        })
      });

      if (!response.ok) {
        throw new Error('Error confirmando deployment');
      }

      setStep('done');
      onDeploymentComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setStep('idle');
    }
  };

  return (
    <div className="p-6 bg-white/60 dark:bg-gray-800/60 rounded-xl backdrop-blur-xl">
      <h3 className="text-lg font-semibold mb-4">Desplegar Safe Multi-sig</h3>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Dirección predicha:</strong> {safeDeploymentInfo.predictedAddress}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Threshold:</strong> {safeDeploymentInfo.threshold} de {safeDeploymentInfo.owners.length}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <button
          onClick={handleDeploy}
          disabled={step !== 'idle' || !account}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600
                     text-white rounded-lg font-medium disabled:opacity-50"
        >
          {step === 'idle' && 'Desplegar Safe'}
          {step === 'deploying' && 'Desplegando...'}
          {step === 'confirming' && 'Confirmando...'}
          {step === 'done' && '✅ Safe Desplegado'}
        </button>
      </div>
    </div>
  );
}
```

**Esfuerzo**: L (8-12 horas)
**Dependencias**: SEC-001 completado, Safe SDK integrado

---

### COMP-002: SSE para eventos real-time
**Severidad**: 🟢 MEDIA
**Impacto**: No hay notificaciones en tiempo real
**Evidencia**: Fase 6 de competencias pendiente

**DEFINICIÓN DE DONE:**
- [ ] Endpoint `/api/competition/events/sse` funcional
- [ ] Hook `useRealtimeEvents` conecta al SSE
- [ ] Eventos de join/bet/vote se muestran en tiempo real
- [ ] Reconexión automática si se pierde conexión
- [ ] Verificación: bet de otro usuario aparece sin refresh

**FIX DETALLADO:**

```typescript
// src/pages/api/competition/events/sse.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getRedisConnection } from '../../../../lib/redisConfig';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { competitionId } = req.query;

  if (!competitionId || typeof competitionId !== 'string') {
    return res.status(400).json({ error: 'Competition ID required' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Heartbeat para mantener conexión
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Polling de eventos (alternativa a Redis Pub/Sub)
  const redis = getRedisConnection();
  let lastEventId = 0;

  const pollEvents = async () => {
    try {
      const events = await redis.lrange(
        `competition:${competitionId}:events`,
        0,
        10
      );

      for (const event of events.reverse()) {
        const parsed = typeof event === 'string' ? JSON.parse(event) : event;
        if (parsed.timestamp > lastEventId) {
          lastEventId = parsed.timestamp;
          res.write(`data: ${JSON.stringify(parsed)}\n\n`);
        }
      }
    } catch (error) {
      console.error('SSE poll error:', error);
    }
  };

  const pollInterval = setInterval(pollEvents, 2000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(pollInterval);
    res.end();
  });

  // Initial poll
  await pollEvents();
}
```

**Esfuerzo**: M (4-6 horas)
**Dependencias**: Redis funcionando

---

## 🔵 PRIORIDAD 4: OBSERVABILIDAD Y TESTING

### OBS-001: Re-habilitar PostHog analytics
**Severidad**: 🔵 MEDIA
**Impacto**: Sin tracking de eventos
**Evidencia**: `instrumentation-client.ts` - PostHog deshabilitado

**DEFINICIÓN DE DONE:**
- [ ] PostHog envía eventos sin errores 405
- [ ] Dashboard muestra eventos
- [ ] Verificación: evento de page view visible en PostHog

**FIX DETALLADO:**

```typescript
// src/instrumentation-client.ts
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// PostHog con API directa (sin proxy de Vercel)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com', // Directo, sin proxy
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage',
    // Desactivar si hay problemas de CORS
    disable_session_recording: false,
  });
}
```

**Esfuerzo**: S (1 hora)
**Dependencias**: NEXT_PUBLIC_POSTHOG_KEY configurado

---

### TEST-001: Tests para sistema de competencias
**Severidad**: 🔵 MEDIA
**Impacto**: Riesgo de regresiones
**Evidencia**: Solo 22 tests básicos, ninguno de competencias

**DEFINICIÓN DE DONE:**
- [ ] Tests para `atomicOperations.ts` (join, bet)
- [ ] Tests para `authMiddleware.ts`
- [ ] Tests para endpoints de competencia
- [ ] Cobertura >50% en módulo competencias
- [ ] Verificación: `npm test` pasa con nuevos tests

**FIX DETALLADO:**

```typescript
// src/test/atomicOperations.test.ts
import { atomicJoinCompetition, atomicPlaceBet } from '../competencias/lib/atomicOperations';

// Mock Redis
jest.mock('../lib/redisConfig', () => ({
  getRedisConnection: () => ({
    eval: jest.fn().mockResolvedValue(JSON.stringify({
      success: true,
      data: { entry: {}, participantCount: 1 }
    })),
    sismember: jest.fn().mockResolvedValue(0),
    get: jest.fn().mockResolvedValue(null),
  }),
}));

describe('atomicJoinCompetition', () => {
  it('should join competition successfully', async () => {
    const result = await atomicJoinCompetition(
      'comp-123',
      '0x1234567890123456789012345678901234567890',
      { address: '0x123...', joinedAt: Date.now() },
      { type: 'participant_joined', timestamp: Date.now(), actor: '0x123...', action: 'Joined', verified: true }
    );

    expect(result.success).toBe(true);
    expect(result.data?.participantCount).toBe(1);
  });

  it('should fail if already joined', async () => {
    // Mock para simular ya unido
    // ...
  });
});

describe('atomicPlaceBet', () => {
  it('should calculate shares correctly with CPMM', async () => {
    // Test de cálculo CPMM
  });
});
```

**Esfuerzo**: M (4-6 horas)
**Dependencias**: Ninguna

---

## 📋 CHECKLIST FINAL: PRODUCTION READY

### Seguridad
- [ ] SEC-001: Claves rotadas y archivos sanitizados
- [ ] SEC-002: Secret scanning en CI
- [ ] Console.logs eliminados de APIs críticas
- [ ] CSP en modo enforce (no report-only)

### Build & Deploy
- [ ] BUILD-001: Build local pasa
- [ ] BUILD-002: Redis mock para build time
- [ ] CI-001: CI bloqueante
- [ ] CI-002: Cron jobs activos

### Funcionalidad
- [ ] COMP-001: UI Safe deployment
- [ ] COMP-002: SSE eventos
- [ ] Flujo completo: crear → join → bet → resolver

### Observabilidad
- [ ] OBS-001: PostHog activo
- [ ] Sentry captura errores
- [ ] Logs estructurados (no console.log)

### Testing
- [ ] TEST-001: Tests de competencias
- [ ] Cobertura >50%

---

## ORDEN DE EJECUCIÓN

```
DÍA 1 (CRÍTICO):
├── SEC-001: Rotar claves (2h)
├── SEC-002: Secret scanning (30min)
└── BUILD-001: Fix metadata URL (30min)

DÍA 2 (ESTABILIZACIÓN):
├── BUILD-002: Redis mock (3h)
├── CI-001: CI bloqueante (1h)
└── CI-002: Cron jobs (1h)

DÍA 3-4 (FUNCIONALIDAD):
├── COMP-001: UI Safe (12h)
└── COMP-002: SSE eventos (6h)

DÍA 5 (POLISH):
├── OBS-001: PostHog (1h)
├── TEST-001: Tests (6h)
└── Documentación final
```

---

## VERIFICACIÓN FINAL

Para marcar como PRODUCTION READY, todos estos comandos deben pasar:

```bash
# Build
npm run build  # Exit code 0, sin warnings críticos

# Tests
npm test  # >50% coverage en competencias

# Type check
npm run type-check  # 0 errors

# Secret scan
gitleaks detect --source .  # 0 leaks found

# Health check
curl https://cryptogift-wallets.vercel.app/api/health  # status: healthy
```

---

Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22
