# PLAN DEFINITIVO - EDUCATION REQUIREMENTS FIX
*Documento generado: 18 de Agosto 2025*

## 🎯 PROBLEMA RAÍZ IDENTIFICADO

El sistema de education requirements está COMPLETAMENTE ROTO debido a:

1. **INVERSIÓN DE LÓGICA**: El flujo está al revés en `[tokenId].tsx` líneas 86-98
   - ACTUAL (INCORRECTO): `hasEducation=true` → muestra PreClaimFlow → password validation
   - CORRECTO: `hasEducation=true` → password validation → bypass button → claim
   
2. **REDIS KEY MISMATCH**: Los datos se guardan y leen de lugares diferentes
   - Se GUARDA en: `gift:{giftId}:requirements` (mint-escrow.ts)
   - Se LEE de: `education_modules:{tokenId}` (giftEventReader.ts)
   
3. **AUTO-NAVEGACIÓN**: PreClaimFlow navega automáticamente después del password, ocultando el botón de bypass

## ✅ FLUJO CORRECTO DEFINITIVO

### SIN Education Requirements:
```
Usuario → Claim Page → ClaimEscrowInterface DIRECTAMENTE
         (Sin pre-validación de password porque lo ingresará en el claim form)
```

### CON Education Requirements:
```
Usuario → Claim Page → PreClaimFlow → Password Validation → 
→ Botón "Simular educación completada" → Click → 
→ API genera EIP-712 signature → ClaimEscrowInterface con educationGateData
```

## 📋 IMPLEMENTACIÓN EN 6 FASES

### FASE 1: Storage Unificado (CRÍTICO)
**Objetivo**: Estandarizar el storage de education requirements

#### 1.1 Actualizar mint-escrow.ts
```typescript
// frontend/src/pages/api/mint-escrow.ts - Línea ~350
// ANTES:
await kv.set(`gift:${giftIdNumber}:requirements`, JSON.stringify({
  educationModules: educationModules || [],
  gateAddress: gateAddress
}));

// DESPUÉS:
// Guardar en ambas claves para compatibilidad
const educationData = {
  version: 1,
  modules: educationModules || [],
  gateAddress: gateAddress,
  createdAt: Date.now()
};

// Clave principal: education:gift:{giftId}
await kv.set(`education:gift:${giftIdNumber}`, JSON.stringify(educationData), {
  ex: 86400 * 365 // 1 año
});

// Mapping tokenId -> giftId con education flag
await kv.set(`education:token:${mintedTokenId}`, JSON.stringify({
  giftId: giftIdNumber,
  hasEducation: educationModules && educationModules.length > 0
}), {
  ex: 86400 * 365
});
```

#### 1.2 Actualizar giftEventReader.ts
```typescript
// frontend/src/lib/giftEventReader.ts - Línea 110
export async function checkEducationRequirements(tokenId: string | number): Promise<{
  hasEducation: boolean;
  educationModules: number[];
  source: 'redis' | 'blockchain' | 'fallback_secure';
}> {
  try {
    if (process.env.KV_REST_API_URL) {
      const { validateRedisForCriticalOps } = await import('./redisConfig');
      const redis = validateRedisForCriticalOps('Education requirements lookup');
      
      if (redis) {
        // NUEVO: Primero buscar el mapping token -> giftId
        const tokenMapping = await redis.get(`education:token:${tokenId}`);
        
        if (tokenMapping) {
          const mapping = JSON.parse(tokenMapping as string);
          
          // Si hay education, buscar los detalles
          if (mapping.hasEducation) {
            const educationData = await redis.get(`education:gift:${mapping.giftId}`);
            if (educationData) {
              const data = JSON.parse(educationData as string);
              console.log(`✅ Education modules found for token ${tokenId}:`, data.modules);
              return {
                hasEducation: true,
                educationModules: data.modules,
                source: 'redis'
              };
            }
          } else {
            // Explícitamente NO tiene education
            console.log(`✅ Token ${tokenId} has NO education requirements (confirmed)`);
            return {
              hasEducation: false,
              educationModules: [],
              source: 'redis'
            };
          }
        }
      }
    }
    
    // SEGURIDAD: Sin heurísticas - default a NO education
    console.warn(`⚠️ No education data found for token ${tokenId}`);
    return {
      hasEducation: false,
      educationModules: [],
      source: 'fallback_secure'
    };
    
  } catch (error) {
    console.error('❌ Error checking education requirements:', error);
    return {
      hasEducation: false,
      educationModules: [],
      source: 'fallback_secure'
    };
  }
}
```

### FASE 2: Gate Validation (Fail-Closed)
**Objetivo**: Validar configuración del gate al crear gifts

#### 2.1 Actualizar mint-escrow.ts - Validación del Gate
```typescript
// frontend/src/pages/api/mint-escrow.ts - Línea ~290
// Agregar ANTES de asignar gateAddress:
if (educationModules && educationModules.length > 0) {
  const gateEnvVar = process.env.NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS;
  
  if (!gateEnvVar || gateEnvVar === '0x0000000000000000000000000000000000000000') {
    console.error('❌ CRITICAL: Education requested but SIMPLE_APPROVAL_GATE not configured');
    
    return res.status(500).json({
      success: false,
      code: 'GATE_MISSING',
      error: 'Education requirements cannot be set - approval gate not configured',
      details: 'Contact admin to configure NEXT_PUBLIC_SIMPLE_APPROVAL_GATE_ADDRESS'
    });
  }
  
  // Validar que es una dirección válida
  if (!ethers.isAddress(gateEnvVar)) {
    return res.status(500).json({
      success: false,
      code: 'GATE_INVALID',
      error: 'Invalid approval gate address configuration'
    });
  }
  
  gateAddress = gateEnvVar;
  console.log(`✅ Gate validated for education requirements: ${gateAddress}`);
} else {
  gateAddress = '0x0000000000000000000000000000000000000000';
}
```

### FASE 3: Flow Logic Correction (CRÍTICO)
**Objetivo**: Corregir la lógica invertida del flujo

#### 3.1 Actualizar [tokenId].tsx - Líneas 86-98
```typescript
// frontend/src/pages/gift/claim/[tokenId].tsx
const checkGiftRequirements = async (tokenId: string) => {
  try {
    const response = await fetch(`/api/gift-has-password?tokenId=${tokenId}`);
    const data = await response.json();
    
    console.log('🔐 Gift requirements check:', data);
    
    if (data.success) {
      // LÓGICA CORREGIDA:
      // - Si NO tiene education → ir DIRECTO a ClaimEscrowInterface
      // - Si TIENE education → mostrar PreClaimFlow para validación
      
      if (data.hasEducation) {
        console.log('📚 Gift has education requirements - showing PRE-VALIDATION');
        setFlowState(ClaimFlowState.PRE_VALIDATION);
      } else {
        console.log('✨ NO education requirements - SKIP pre-validation, go to CLAIM');
        setEducationGateData('0x'); // No gate data needed
        setFlowState(ClaimFlowState.CLAIM); // DIRECTO AL CLAIM
      }
    }
  } catch (error) {
    console.error('Failed to check gift requirements:', error);
    // Default seguro: ir directo al claim (asume NO education)
    setFlowState(ClaimFlowState.CLAIM);
  }
};
```

#### 3.2 Actualizar estado inicial - Línea 61
```typescript
// ANTES:
const [flowState, setFlowState] = useState<ClaimFlowState>(ClaimFlowState.PRE_VALIDATION);

// DESPUÉS:
const [flowState, setFlowState] = useState<ClaimFlowState | null>(null);
// Usar null inicialmente para evitar flicker, esperar a checkGiftRequirements
```

### FASE 4: Remover Auto-Navegación
**Objetivo**: Permitir que el usuario vea y use el botón de bypass

#### 4.1 Actualizar PreClaimFlow.tsx
```typescript
// frontend/src/components/education/PreClaimFlow.tsx - Línea ~180
// ELIMINAR todo el setTimeout de auto-navegación:

// ANTES:
if (result.requiresEducation) {
  setShowEducationInfo(true);
  setTimeout(() => {
    onValidationSuccess(result.sessionToken, true);
  }, 3000); // ELIMINAR ESTO
}

// DESPUÉS:
if (result.requiresEducation) {
  setShowEducationInfo(true);
  setShowBypassButton(true); // Mostrar botón inmediatamente
  // NO auto-navegar - dejar que el usuario decida
}
```

#### 4.2 Mejorar handleEducationBypass
```typescript
// frontend/src/components/education/PreClaimFlow.tsx - Línea ~220
const handleEducationBypass = async () => {
  if (!validationState.sessionToken) {
    console.error('No session token for bypass');
    return;
  }
  
  setBypassLoading(true);
  
  try {
    const response = await fetch('/api/education/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: validationState.sessionToken,
        tokenId: tokenId,
        claimer: account?.address || validationState.claimer
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Education bypass approved!');
      // Pasar el gateData al siguiente paso
      onValidationSuccess(
        validationState.sessionToken,
        true,
        result.gateData || '0x'
      );
    } else {
      console.error('Bypass failed:', result.error);
      setValidationState({
        ...validationState,
        error: result.error || 'Failed to bypass education'
      });
    }
  } catch (error) {
    console.error('Bypass error:', error);
    setValidationState({
      ...validationState,
      error: 'Network error during bypass'
    });
  } finally {
    setBypassLoading(false);
  }
};
```

### FASE 5: UI Guards
**Objetivo**: Prevenir estados inconsistentes en la UI

#### 5.1 Agregar loading state en [tokenId].tsx
```typescript
// frontend/src/pages/gift/claim/[tokenId].tsx - Línea 422
{/* Main Content - Dynamic based on flow state */}
<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Mostrar loading mientras se determina el flow */}
  {flowState === null && (
    <div className="text-center py-12">
      <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Verificando requisitos del regalo...</p>
    </div>
  )}
  
  {/* Pre-Validation State */}
  {flowState === ClaimFlowState.PRE_VALIDATION && tokenId && (
    <PreClaimFlow
      tokenId={tokenId as string}
      onValidationSuccess={handlePreClaimValidation}
      giftInfo={giftInfo}
      nftMetadata={nftMetadata}
      className="mx-auto"
    />
  )}
  
  {/* Resto del código... */}
```

### FASE 6: Logging Seguro
**Objetivo**: Debug comprehensivo sin exponer datos sensibles

#### 6.1 Agregar logging en puntos críticos
```typescript
// frontend/src/pages/api/pre-claim/validate.ts
console.log('🔍 PRE-CLAIM VALIDATION:', {
  tokenId,
  hasPassword: !!passwordHash,
  hasEducation: educationModules.length > 0,
  modules: educationModules,
  source: 'redis' // o 'blockchain'
});

// frontend/src/pages/api/education/approve.ts
debugLogger.operation('EDUCATION BYPASS ACTIVATED', {
  tokenId,
  giftId,
  claimer: claimer.slice(0, 10) + '...',
  bypassMode: true,
  timestamp: Date.now()
});
```

## 🎯 CRITERIOS DE ÉXITO

### Evidencia de Éxito Esperada:

1. **Logs para gifts SIN education:**
```
🔐 Gift requirements check: { hasEducation: false }
✨ NO education requirements - SKIP pre-validation, go to CLAIM
```

2. **Logs para gifts CON education:**
```
🔐 Gift requirements check: { hasEducation: true, modules: [1, 2] }
📚 Gift has education requirements - showing PRE-VALIDATION
✅ Password validated successfully
🎓 Showing education bypass button
✅ Education bypass approved!
→ Procede a ClaimEscrowInterface con gateData
```

3. **NO más logs de:**
```
"Defaulting to NO EDUCATION (secure fallback)" // Esto indica Redis key mismatch
"Auto-navigating to education flow..." // Esto oculta el bypass button
```

## 🚀 ORDEN DE IMPLEMENTACIÓN

1. **FASE 1**: Storage Unificado (15 min)
2. **FASE 3**: Flow Logic Correction (5 min)
3. **FASE 4**: Remover Auto-navegación (5 min)
4. **FASE 5**: UI Guards (5 min)
5. **FASE 2**: Gate Validation (10 min)
6. **FASE 6**: Logging (5 min)

**Tiempo total estimado**: 45 minutos

## 📝 NOTAS IMPORTANTES

- **NO MODIFICAR** ClaimEscrowInterface.tsx - funciona perfectamente
- **TODOS** los gifts tienen password (confirmado por el usuario)
- **SOLO ALGUNOS** gifts tienen education requirements
- El sistema debe ser **fail-closed**: sin datos = NO education

## 🔒 SEGURIDAD

- No usar heurísticas (token >= X) - son "adivinables"
- Default siempre a NO education cuando falten datos
- Validar identidad del claimer en approve.ts
- Rate limiting en endpoints críticos

---

*Documento creado siguiendo el Protocolo de Comportamiento Obligatorio v2*
*"SOLUCIONES DURADERAS, LA TOTAL FINAL SIEMPRE"*