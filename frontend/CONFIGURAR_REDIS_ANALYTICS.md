# 📊 Configuración de Redis para Analytics Dashboard

## ⚠️ IMPORTANTE: Las estadísticas no funcionarán sin Redis configurado

El sistema de Analytics de CryptoGift requiere una base de datos Redis para almacenar todas las estadísticas en tiempo real. Sin Redis configurado, verás "0" en todas las métricas.

## 🚀 Pasos para configurar Redis (GRATIS)

### 1. Crear cuenta en Upstash (Gratis)
1. Ve a https://console.upstash.com/
2. Regístrate con tu email o GitHub
3. El plan gratuito incluye:
   - 10,000 comandos por día
   - 256 MB de almacenamiento
   - Perfecto para desarrollo y testing

### 2. Crear una base de datos Redis
1. Click en "Create Database"
2. Nombre: `cryptogift-analytics` (o el que prefieras)
3. Región: Selecciona la más cercana a ti
4. Type: "Regional" (para el plan gratis)
5. Click "Create"

### 3. Obtener las credenciales
1. En el dashboard de tu base de datos, ve a la pestaña "REST API"
2. Copia estos dos valores:
   - **UPSTASH_REDIS_REST_URL**: Algo como `https://us1-willing-doe-38901.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: Un token largo que empieza con `AX...`

### 4. Configurar las variables en tu proyecto
1. Abre el archivo `frontend/.env.local`
2. Reemplaza las líneas con tus valores reales:

```env
UPSTASH_REDIS_REST_URL=https://tu-database-id.upstash.io
UPSTASH_REDIS_REST_TOKEN=tu-token-aqui
KV_REST_API_URL=https://tu-database-id.upstash.io  # Misma URL
KV_REST_API_TOKEN=tu-token-aqui  # Mismo token
```

### 5. Reiniciar el servidor de desarrollo
```bash
cd frontend
npm run dev
# o
pnpm dev
```

## ✅ Verificar que funciona

### 1. Verificar conexión Redis:
Abre: http://localhost:3000/api/analytics/status

Deberías ver algo como:
```json
{
  "success": true,
  "redis": {
    "connected": true,
    "url": "https://us1-willing-doe-38901.upstash.io",
    "totalKeys": 0
  },
  "message": "No analytics data found. Import historical data or create new gifts to start tracking."
}
```

### 2. Importar datos históricos:
Ve a: http://localhost:3000/es/referrals/import
- Deja el campo de wallet vacío para importar todos los regalos
- Establece el límite en 10-20 para empezar
- Click en "Importar Datos Históricos"

### 3. Ver el dashboard con datos reales:
Ve a: http://localhost:3000/es/referrals/analytics

Ahora deberías ver:
- Número real de regalos creados
- Número de regalos reclamados
- Gráficos con datos históricos
- Estadísticas por campaña

## 🔧 Troubleshooting

### "No se muestra información alguna"
- Verifica que las variables de Redis estén configuradas correctamente
- Revisa la consola del navegador por errores
- Confirma que el endpoint /api/analytics/status muestra `connected: true`

### "Error al importar datos históricos"
- Asegúrate de estar conectado a Base Sepolia
- Verifica que tengas regalos creados previamente
- Intenta con un límite menor (5 regalos)

### "Las estadísticas no se actualizan"
- Los datos se actualizan cuando:
  - Se crea un nuevo regalo
  - Se reclama un regalo
  - Se completa el flujo educativo
- Refresca la página para ver los últimos datos

## 📈 Métricas que se rastrean

El sistema rastrea automáticamente:
- **Gift Created**: Cuando se crea un regalo
- **Gift Viewed**: Cuando alguien ve la página de claim
- **Pre-claim Started**: Cuando inician el proceso de claim
- **Education Progress**: Progreso en módulos educativos
- **Education Completed**: Cuando completan toda la educación
- **Gift Claimed**: Cuando se reclama exitosamente

## 🎯 Próximos pasos

1. Configura Redis siguiendo los pasos anteriores
2. Importa tus datos históricos
3. Crea un nuevo regalo para ver las estadísticas en tiempo real
4. ¡Disfruta de tu Analytics Dashboard con datos reales!

## 💡 Tips

- El plan gratuito de Upstash es suficiente para desarrollo y proyectos pequeños
- Los datos se guardan por 90 días en Redis
- Puedes ver el uso de tu Redis en el dashboard de Upstash
- Para producción, considera actualizar a un plan pago para más capacidad

---

Si tienes problemas, revisa:
1. La consola del navegador (F12)
2. Los logs del servidor (`npm run dev`)
3. El endpoint de status: http://localhost:3000/api/analytics/status