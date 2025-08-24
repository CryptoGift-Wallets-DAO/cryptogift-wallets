# Production Deployment Checklist

## ✅ Completado

### 1. Security Headers & CSP ✅
- [x] Content Security Policy configurado
- [x] Headers de seguridad (HSTS, X-Frame-Options, etc.)
- [x] CORS configurado correctamente
- [x] Sanitización de inputs con Zod

### 2. API Hardening ✅
- [x] Rate limiting implementado
- [x] Validación de inputs con schemas
- [x] Circuit breaker para servicios externos
- [x] Autenticación JWT/SIWE

### 3. Supply Chain Security ✅
- [x] GitHub Actions para auditoría de dependencias
- [x] SBOM generation con CycloneDX
- [x] Secret scanning con TruffleHog
- [x] License compliance checks
- [x] CodeQL analysis
- [x] Semgrep SAST

### 4. Monitoring & Observability ✅
- [x] Sentry para error tracking
- [x] Analytics (GA4 + Plausible)
- [x] Performance monitoring (Web Vitals)
- [x] Telemetry endpoint
- [x] Health check endpoint
- [x] Custom metrics tracking

### 5. Production Configuration ✅
- [x] Feature flags con gradual rollout
- [x] Shadow mode para testing
- [x] Environment-based configuration
- [x] Production readiness checks

## 📋 Pendiente antes del Deploy

### Variables de Entorno Críticas
```bash
# Necesitas configurar en Vercel:
NEXT_PUBLIC_TW_CLIENT_ID=          # ThirdWeb Client ID
JWT_SECRET=                         # JWT signing secret (genera uno seguro)
NEXTAUTH_SECRET=                    # NextAuth secret (genera uno seguro)
ADMIN_API_TOKEN=                    # Admin API token (genera uno seguro)
NEXT_PUBLIC_SENTRY_DSN=             # Sentry DSN para monitoring
NEXT_PUBLIC_GA_ID=                  # Google Analytics ID
```

### Generar Secrets Seguros
```bash
# Generar JWT_SECRET
openssl rand -base64 32

# Generar NEXTAUTH_SECRET
openssl rand -base64 32

# Generar ADMIN_API_TOKEN
openssl rand -hex 32
```

### Configuración de Sentry
1. Crear cuenta en https://sentry.io
2. Crear nuevo proyecto (Next.js)
3. Copiar DSN a NEXT_PUBLIC_SENTRY_DSN
4. Configurar source maps upload

### Configuración de Analytics
1. Crear propiedad en Google Analytics 4
2. Copiar Measurement ID a NEXT_PUBLIC_GA_ID
3. (Opcional) Configurar Plausible Analytics

## 🚀 Comandos de Deploy

### Build de Producción
```bash
cd frontend
npm run build
```

### Verificar Production Readiness
```bash
# Ejecutar checks de seguridad
npm audit --production

# Verificar types
npm run type-check

# Ejecutar linters
npm run lint

# Test de performance local
npm run build && npm run start
```

### Deploy a Vercel
```bash
# Si no tienes Vercel CLI
npm i -g vercel

# Deploy a producción
vercel --prod
```

## 🔒 Post-Deploy Security

### 1. Verificar Headers
```bash
curl -I https://cryptogift-wallets.vercel.app
# Verificar: Strict-Transport-Security, X-Frame-Options, etc.
```

### 2. Test CSP
```bash
# Verificar en Chrome DevTools > Console
# No debe haber violaciones de CSP
```

### 3. Verificar Rate Limiting
```bash
# Hacer múltiples requests rápidos
for i in {1..20}; do curl https://cryptogift-wallets.vercel.app/api/health; done
# Debe retornar 429 después del límite
```

### 4. Verificar Health Check
```bash
curl https://cryptogift-wallets.vercel.app/api/health
# Debe retornar status: healthy
```

## 📊 Monitoring Post-Deploy

### Sentry
- Verificar que los errores se están capturando
- Configurar alertas para errores críticos
- Revisar performance metrics

### Analytics
- Verificar que los eventos se están registrando
- Configurar objetivos y conversiones
- Crear dashboard de métricas clave

### Performance
- Verificar Web Vitals en Chrome DevTools
- Usar PageSpeed Insights
- Monitorear en Sentry Performance

## 🔄 Rollback Plan

Si algo sale mal:

1. **Immediate Rollback**
   ```bash
   vercel rollback
   ```

2. **Feature Flag Disable**
   - Desactivar features problemáticas sin redeploy
   - Usar shadow mode para testing

3. **Maintenance Mode**
   ```bash
   # Set en Vercel Dashboard
   MAINTENANCE_MODE=true
   MAINTENANCE_MESSAGE="System under maintenance"
   ```

## ✨ Feature Rollout Strategy

### Fase 1: Core Features (Ya activas)
- ✅ Wallet Management
- ✅ Transaction History
- ✅ MEV Protection
- ✅ Approvals System

### Fase 2: Progressive Features (Activar gradualmente)
- [ ] Bridge (comenzar en shadow mode)
- [ ] On-ramp (comenzar con Transak)
- [ ] ERC20 Paymaster
- [ ] Session Keys

### Fase 3: Advanced Features
- [ ] Push Protocol (requiere 50 PUSH stake)
- [ ] Recovery System
- [ ] PWA Support
- [ ] Web Push Notifications

## 📝 Notas Finales

1. **Siempre hacer backup** antes de cambios mayores
2. **Monitorear activamente** las primeras 24 horas
3. **Tener el rollback plan** listo
4. **Comunicar a usuarios** sobre nuevas features
5. **Documentar incidentes** para mejora continua

---

*Última actualización: August 24, 2025*
*Estado: LISTO PARA PRODUCCIÓN* 🚀