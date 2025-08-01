# 🚀 FUTURE FEATURES - CRYPTOGIFT WALLETS

## 🕐 CRON JOBS AUTOMATION (REQUIERE VERCEL PRO)

### **Limitaciones Actuales Plan Hobby:**
- ✅ Máximo 2 cron jobs por cuenta
- ⏰ Solo pueden ejecutarse **1 vez al día** máximo
- 💰 Para frecuencias mayores se requiere plan Pro ($20/mes)

### **Cron Jobs Diseñados (LISTOS PARA ACTIVAR):**

#### 1. **Auto-Return Expired Gifts** - `/api/cron/auto-return`
- **Archivo**: `frontend/src/pages/api/cron/auto-return.ts` ✅ IMPLEMENTADO
- **Funcionalidad**: Busca gifts expirados y los devuelve automáticamente al creador
- **Frecuencia Ideal**: Cada 15-30 minutos (requiere Pro)
- **Frecuencia Hobby**: `0 0 * * *` (1 vez al día a medianoche)
- **Autenticación**: Protegido con `CRON_SECRET`
- **Estado**: ✅ Código completo con mapeo tokenId→giftId correcto

#### 2. **Cleanup Transactions** - `/api/cron/cleanup-transactions`
- **Archivo**: `frontend/src/pages/api/cron/cleanup-transactions.ts` ✅ IMPLEMENTADO
- **Funcionalidad**: Limpia transacciones obsoletas en Redis
- **Frecuencia Ideal**: Cada 6 horas (requiere Pro)
- **Frecuencia Hobby**: `0 12 * * *` (1 vez al día al mediodía)
- **Estado**: ✅ Código completo y funcional

### **Configuración Vercel Pro (FUTURO):**
```json
{
  "crons": [
    {
      "path": "/api/cron/auto-return",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/cleanup-transactions", 
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## 🎯 ALTERNATIVA ACTUAL: UX MEJORADA MANUAL

### **Propuesta de Mejora ExpiredGiftManager:**

**ANTES (actual):**
- Botón "🔄 Refresh" genérico
- Usuario debe saber que buscar gifts expirados

**DESPUÉS (propuesta):**
- Botón "🔍 Buscar Regalos Expirados" más descriptivo
- Auto-detección inteligente al cargar la página
- UX más clara para el usuario

### **Beneficios Enfoque Manual:**
- ✅ Control total del usuario sobre cuándo buscar
- ✅ No esperar 6+ horas para auto-return
- ✅ Compatible con plan Hobby de Vercel
- ✅ UX más predecible y transparente
- ✅ No consume cuota de cron jobs para otras funciones críticas

---

## 📋 FEATURES ADICIONALES FUTURAS

### **GitHub Actions Alternative (GRATIS):**
- Usar GitHub Actions cron para llamar endpoints de cron
- Configurar webhooks para auto-return
- Sin limitaciones de Vercel, compatible con plan Hobby

### **Background Jobs con Redis:**
- Implementar cola de trabajos con Bull/BullMQ
- Jobs programados para auto-return
- Más eficiente que cron HTTP calls

### **WebSocket Real-time:**
- Notificaciones push cuando gifts expiran
- Auto-refresh de UI cuando hay cambios
- Mejor UX que polling manual

---

**ESTADO ACTUAL**: Cron jobs **deshabilitados** en `vercel.json` para evitar bloqueo de deployment. Funcionalidad disponible vía ExpiredGiftManager manual.