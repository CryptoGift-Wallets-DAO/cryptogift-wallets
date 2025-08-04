# 🚀 CryptoGift Indexer - Guía de Despliegue Modo Sombra

## 📋 DÍA 3-7: MODO SOMBRA + VALIDACIÓN A/B

### 🎯 OBJETIVO
Desplegar el indexer en modo sombra (`READ_FROM=onchain`) donde:
- ✅ El indexer corre en paralelo construyendo la base de datos
- ✅ La aplicación principal sigue leyendo de blockchain (cero cambios UX)
- ✅ Validamos la integridad con A/B testing diario
- ✅ Zero risk deployment con capacidad de rollback instantáneo

---

## 🔧 PASO 1: CONFIGURACIÓN INICIAL

### 1.1 Database Setup (Neon Free Tier)
```bash
# 1. Crear cuenta en Neon.tech
# 2. Crear database "cryptogift-indexer"
# 3. Copiar connection string

export DATABASE_URL="postgresql://user:pass@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 1.2 RPC Configuration
```bash
# Opción 1: RPC Públicos (gratis)
export RPC_HTTP="https://sepolia.base.org"
export RPC_WS="wss://sepolia.base.org"

# Opción 2: Alchemy Free Tier (300M CU/mes)
export RPC_HTTP="https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
export RPC_WS="wss://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
```

### 1.3 Environment Setup
```bash
# En indexer/.env
DATABASE_URL="postgresql://..."
RPC_HTTP="https://sepolia.base.org"
RPC_WS="wss://sepolia.base.org"

# CRITICAL: Modo sombra
READ_FROM=onchain

# Config validada
CHAIN_ID=84532
CONTRACT_ADDRESS="0x46175CfC233500DA803841DEef7f2816e7A129E0"
DEPLOYMENT_BLOCK=28915000
BATCH_BLOCKS=4000
CONFIRMATIONS=20
```

---

## 🗄️ PASO 2: INICIALIZACIÓN DE DATABASE

### 2.1 Migración
```bash
cd cryptogift-wallets/indexer
npm install
npm run db:migrate
```

### 2.2 Verificación
```bash
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Debe mostrar:
# gift_mappings
# pending_events  
# indexer_checkpoint
# indexer_locks
# indexer_dlq
```

---

## 📦 PASO 3: BACKFILL INICIAL

### 3.1 Ejecutar Backfill Histórico
```bash
# IMPORTANTE: Esto puede tomar varias horas dependiendo del rango
npm run backfill

# Monitorear progreso en otra terminal:
npm run status
```

### 3.2 Progreso Esperado
```bash
📊 Backfill Progress:
   Blocks: 28915000 → 29100000 (185k blocks)
   Rate: ~2000 blocks/min
   ETA: ~90 minutos

🔍 Revisar logs para:
   - Batch sizes adaptivos (4000→2000→1000 si hay rate limits)
   - DLQ entries (debe mantenerse en 0)
   - Memory usage estable
```

---

## 📡 PASO 4: LIVE STREAMING

### 4.1 Iniciar Indexer Completo
```bash
# Esto inicia: backfill (si incompleto) + streaming + reconciliation
npm start

# O en desarrollo con logs detallados:
npm run dev
```

### 4.2 Verificación de Salud
```bash
# Health check básico
curl localhost:3001/health

# Status completo  
curl localhost:3001/status | jq

# Métricas para alertas
curl localhost:3001/metrics | grep indexer_lag_seconds
```

---

## 🔍 PASO 5: VALIDACIÓN A/B DIARIA

### 5.1 A/B Testing Script
```bash
# Test con 100 tokenIds random
npm run ab-check

# Test extendido
npm run ab-check -- --size 200 --range 100000

# Resultado esperado: >98% match rate
```

### 5.2 Interpretación de Resultados
```bash
✅ PASSING: 98-100% match rate
   - Indexer funcionando correctamente
   - DB y onchain sincronizados

⚠️ WARNING: 95-98% match rate  
   - Revisar DLQ entries
   - Posibles gaps en procesamiento
   - Re-ejecutar reconciliation

❌ FAILING: <95% match rate
   - DETENER deployment
   - Investigar discrepancias
   - Revisar logs de errores
```

---

## 📊 PASO 6: MONITOREO 24/7

### 6.1 Métricas Críticas
```bash
# Lag del indexer
curl localhost:3001/metrics | grep indexer_lag_seconds
# Target: <120s

# Dead Letter Queue
curl localhost:3001/metrics | grep indexer_dlq_count  
# Target: 0

# Batch errors
curl localhost:3001/metrics | grep indexer_batch_errors_consecutive
# Target: <3
```

### 6.2 Alertas Automáticas
```bash
# Revisar alertas SLO
curl localhost:3001/alerts | jq

# Alertas críticas:
# - IndexerDown: Servicio caído
# - HighIndexerLag: Lag >120s durante >5min  
# - DLQEntries: Eventos fallidos
# - RPCDown: Conectividad blockchain
```

---

## 🎯 CRITERIOS DE ACEPTACIÓN (7 DÍAS)

### ✅ Para proceder al FLIP (DÍA 8-14):

1. **Indexing Lag**: <30s promedio sostenido 7 días
2. **DLQ Count**: = 0 durante 7 días
3. **A/B Match Rate**: 100% durante 7 días consecutivos
4. **Uptime**: >99.5% (máximo 1h downtime/semana)
5. **Memory**: Estable, sin leaks
6. **RPC Health**: Sin disconnects prolongados

### ❌ Criterios de STOP:

1. A/B match rate < 95% por >2 días
2. DLQ count > 100 eventos 
3. Indexing lag > 300s sostenido
4. Memory leaks detectados
5. Corrupciones de data

---

## 🚨 PROCEDIMIENTOS DE EMERGENCIA

### 🛑 Rollback Inmediato
```bash
# Si algo falla, el rollback es instantáneo:
# 1. La app SIEMPRE lee de onchain (READ_FROM=onchain)
# 2. No hay cambios en UX
# 3. Simplemente detener el indexer:

npm stop  # o Ctrl+C

# La app continúa funcionando normal con búsqueda onchain
```

### 🔧 Recovery Procedures
```bash
# 1. Database corruption
npm run db:reset
npm run backfill

# 2. RPC issues  
# Cambiar a RPC alternativo en .env
# Reiniciar: npm start

# 3. High lag
# SLO monitor actúa automáticamente:
# - Reduce batch size
# - Reset RPC connections
# - Force reconciliation

# 4. Manual reconciliation
curl -X POST localhost:3001/reconcile
```

---

## 📁 ESTRUCTURA DE LOGS

### 📝 Log Locations
```bash
# Desarrollo
npm run dev  # logs a console

# Producción
npm start | tee indexer.log

# Logs críticos a buscar:
grep "ERROR\|WARN\|SLO Alert\|Reorg" indexer.log
```

### 🔍 Debugging Commands
```bash
# Status detallado
npm run status

# Test específico de tokenId
TOKEN_ID=68 npm run mapping

# Revisar DLQ
psql $DATABASE_URL -c "SELECT * FROM indexer_dlq ORDER BY created_at DESC LIMIT 10;"

# Gaps en bloques
psql $DATABASE_URL -c "SELECT min(block_number), max(block_number), count(*) FROM gift_mappings;"
```

---

## 📊 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] DATABASE_URL configurada y migrada
- [ ] RPC endpoints validados (HTTP + WS)
- [ ] .env con READ_FROM=onchain
- [ ] Tests unitarios passing (npm run test:unit)
- [ ] Sufficient disk space (>10GB para logs)

### Post-Deployment (Día 1)
- [ ] Backfill iniciado y progresando
- [ ] Health endpoint respondiendo
- [ ] Logs sin errores críticos
- [ ] Memory usage estable

### Validación (Día 2-7)
- [ ] A/B test diario ejecutado y documentado
- [ ] Indexing lag <120s sostenido
- [ ] DLQ count = 0
- [ ] SLO alerts monitoreadas
- [ ] Performance trending upward

### Ready for Flip (Día 8)
- [ ] 7 días consecutivos de operación estable
- [ ] A/B match rate 100% confirmado
- [ ] Team trained on monitoring procedures
- [ ] Rollback plan tested y validado

---

## 🔗 ENLACES ÚTILES

- **Neon Database**: https://neon.tech
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **RPC Status**: https://base.org/network-information
- **Alchemy Dashboard**: https://dashboard.alchemy.com
- **Contract Address**: https://sepolia.basescan.org/address/0x46175CfC233500DA803841DEef7f2816e7A129E0

---

**✅ MODO SOMBRA READY - EXECUTE WITH CONFIDENCE** 🚀