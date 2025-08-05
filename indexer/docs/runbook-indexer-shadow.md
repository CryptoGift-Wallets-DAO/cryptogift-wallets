# 📋 RUNBOOK DIARIO - INDEXER MODO SOMBRA DÍA 3–7

## 🎯 OBJETIVO & ALCANCE

**Propósito**: Validar operación estable del indexador CryptoGift en modo sombra durante 7 días consecutivos antes del FLIP a producción.

**Modo Sombra**: `READ_FROM=onchain` - La app sigue leyendo blockchain mientras el indexador construye DB en paralelo.

**Cobertura**: 
- Sincronización blockchain → DB
- Validación A/B (DB vs onchain)  
- Detección temprana de desvíos
- Preparación para FLIP SEMANA 2

---

## ⚡ COMANDOS DIARIOS (COPIAR/PEGAR)

### **🌅 MAÑANA (9:00 AM CST)**
```bash
cd /mnt/c/Users/rafae/cryptogift-wallets/indexer
npm run status
# ✅ OK si: indexing_lag < 30s y dlq = 0
```

### **🌆 TARDE (5:00 PM CST)**  
```bash
cd /mnt/c/Users/rafae/cryptogift-wallets/indexer
npm run ab-check -- --size 1000
# ✅ OK si: A/B = 100% match
```

---

## ✅ CRITERIOS DE OK (DÍA A DÍA)

- **indexing_lag** < 30s sostenido
- **dlq** = 0 
- **A/B** = 100% match

**Meta**: 7 días consecutivos cumpliendo criterios = Ready for FLIP

---

## 🚨 PROTOCOLO DE DESVÍOS (ACCIÓN INMEDIATA)

### **📊 A/B < 100% MATCH**
```bash
# Paso 1: Reconciliación automática
npm run reconcile
npm run ab-check -- --size 1000

# Si persiste: revisar txHash/logIndex/blockNumber de mismatches y ABI
# Investigar manualmente los casos específicos
```

### **⏰ LAG ≥ 120s POR >5 MIN**
```bash
# Bajar lote y usar RPC fallback
BATCH_BLOCKS=2000 npm start

# Forzar reconciliación
npm run reconcile
```

### **🔴 LAG ≥ 300s POR >15 MIN**
```bash
# Full reset según scripts del repo
npm run db:reset
npm run db:migrate
npm run backfill
npm start
```

### **💀 DLQ > 0**
- Inspeccionar razones específicas
- Reintentar procesamiento
- Si es decode/ABI: corregir y reejecutar
- Documentar causa raíz

### **🔌 WS CAÍDO O GAPS**
```bash
# Degradar a polling
# Verificar gap detector = 0
# Correr reconcile con lookback ampliado
npm run reconcile
```

---

## 🔄 FLIP Y ROLLBACK (SEMANA 2)

### **🚀 FLIP CRITERIA MET**
**Cuando 7/7 días cumplan OK:**
```bash
# Cambiar a modo producción
READ_FROM=db

# Reiniciar indexer
npm start

# Monitoreo intensivo 48–72h
```

### **🛡️ ROLLBACK INMEDIATO**
**Si algo no cuadra:**
```bash
# Volver a modo sombra
READ_FROM=onchain
npm start

# La app continúa funcionando normal
```

---

## 🔒 SEGURIDAD

- **No exponer secretos** en logs o comandos
- **Endpoints protegidos**: `/status`, `/metrics`, `/alerts` (token/IP)
- **Credenciales**: Solo en variables de entorno
- **Logs**: Sin información sensible

---

## 📊 REGISTRO DIARIO

| Fecha | Lag | DLQ | A/B % | Acciones | Observaciones |
|-------|-----|-----|-------|----------|---------------|
| 08/04 | 67s | 0   | N/A*  | Backfill completado | *A/B test necesita fix código |
| 08/05 |     |     |       |          |               |
| 08/06 |     |     |       |          |               |
| 08/07 |     |     |       |          |               |
| 08/08 |     |     |       |          |               |
| 08/09 |     |     |       |          |               |
| 08/10 |     |     |       |          |               |

**FLIP DATE TARGET**: 08/11 (si 7/7 días ✅)

---

## 📡 ANEXOS

### **🔗 URLs/PUERTO DEL SERVICIO**
- **Status**: `http://localhost:3001/status`
- **Health**: `http://localhost:3001/health`  
- **Metrics**: `http://localhost:3001/metrics`
- **Alerts**: `http://localhost:3001/alerts`

### **⚙️ VARIABLES CLAVE**
```bash
RPC_HTTP="https://base-sepolia.g.alchemy.com/public"
RPC_WS="wss://base-sepolia.g.alchemy.com/public"
RPC_WS_FALLBACK="wss://base-sepolia-rpc.publicnode.com"
BATCH_BLOCKS=4000
CONFIRMATIONS=20
READ_FROM=onchain
```

### **📝 DÓNDE VER LOGS**
```bash
# Development logs (tiempo real)
npm run dev

# Production logs  
npm start | tee indexer.log

# Filtrar errores críticos
grep "ERROR\|WARN\|SLO Alert\|Reorg" indexer.log
```

### **🚨 ESTADO ACTUAL (DÍA 4)**
- **Database**: ✅ Operacional
- **RPC**: ✅ Optimizado (Alchemy)
- **Backfill**: ✅ Completado (352k bloques)
- **Live Streaming**: ❌ Errores de compilación TypeScript
- **A/B Testing**: ❌ Runtime errors  

**CRÍTICO**: Live streaming y A/B testing deben repararse antes de continuar protocolo DÍA 5-7.

---

**📋 ESTE ES TU RUNBOOK OPERACIONAL DÍA 3-7**  
**Actualizado**: Agosto 4, 2025  
**Próxima revisión**: Después de fixes críticos