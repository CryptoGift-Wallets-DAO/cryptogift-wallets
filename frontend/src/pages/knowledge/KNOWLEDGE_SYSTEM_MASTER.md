# 📚 KNOWLEDGE SYSTEM MASTER DOCUMENT
## Sistema Maestro de Creación de Contenido Educativo - CryptoGift Wallets

### 🎯 DECLARACIÓN DE PROPÓSITO
Este documento es la fuente única de verdad para toda creación de contenido educativo en CryptoGift Wallets. Cualquier módulo, lección o experiencia de aprendizaje DEBE seguir estos estándares sin excepción.

---

## 🧠 FUNDAMENTOS PSICOLÓGICOS DEL APRENDIZAJE

### Principios Neurobiológicos Base
1. **Aprendizaje Activo (Active Learning)**
   - El cerebro retiene 90% de lo que hace vs 10% de lo que lee
   - Cada concepto debe tener una interacción física/digital inmediata
   - Dopamina se libera con feedback inmediato positivo

2. **Teoría de Carga Cognitiva (Cognitive Load Theory)**
   - Máximo 7±2 elementos nuevos por sesión
   - Información presentada en chunks de 3-5 minutos
   - Progresión de simple → complejo → aplicado

3. **Curva del Olvido de Ebbinghaus**
   - Repaso a las 24h: retención 80%
   - Repaso a la semana: retención 90%
   - Sistema de Daily Tips como refuerzo espaciado

4. **Flow State (Csikszentmihalyi)**
   - Balance entre desafío y habilidad
   - Feedback inmediato y claro
   - Metas alcanzables en cada micro-paso

5. **Andragogía vs Pedagogía**
   - Adultos aprenden por necesidad práctica inmediata
   - Experiencia previa como base constructivista
   - Autonomía en el ritmo y elección de rutas

---

## 📋 ESTÁNDARES NO NEGOCIABLES

### 1. ESTRUCTURA TEMPORAL
```
Micro-lección: 5-7 minutos
Módulo completo: 15-20 minutos
Sesión máxima: 30 minutos
Daily Tip: 60-90 segundos
```

### 2. PATRÓN UNIVERSAL DE LECCIÓN
```
DO → EXPLAIN → CHECK → REINFORCE
```

#### DO (30% del tiempo)
- Acción inmediata sin explicación previa
- "Primero hazlo, luego entenderás por qué"
- Ejemplo: "Pulsa este botón para reclamar tu NFT"

#### EXPLAIN (40% del tiempo)
- Contexto DESPUÉS de la acción
- Máximo 3 conceptos nuevos
- Lenguaje simple, metáforas cotidianas

#### CHECK (20% del tiempo)
- Validación sin castigo por error
- Pistas progresivas (3 niveles)
- Celebración de aciertos

#### REINFORCE (10% del tiempo)
- Resumen en 1 frase memorable
- Conexión con siguiente paso
- Badge o progreso visible

### 3. ACCESIBILIDAD MANDATORIA
- WCAG 2.1 AA mínimo
- Keyboard navigation completa
- Alt text en TODAS las imágenes
- Contraste mínimo 4.5:1
- Font size mínimo 16px mobile

### 4. MÉTRICAS DE ÉXITO
```javascript
{
  completion_rate: >= 85%,
  correct_first_attempt: >= 60%,
  time_to_complete: within_120%_of_estimate,
  nps_score: >= 8.0,
  retention_d7: >= 25%
}
```

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Jerarquía de Contenido
```
/knowledge
  /fundamentals     (Conceptos base blockchain)
  /wallet-basics    (Uso de wallets)
  /cryptogift       (Nuestro producto específico)
  /security         (Seguridad y mejores prácticas)
  /advanced         (DeFi, TBA, smart contracts)
  /collaboration    (Captación y onboarding)
```

### Estructura JSON de Lección
```json
{
  "id": "module-id@v1",
  "category": "fundamentals|wallet-basics|cryptogift|security|advanced",
  "title": {
    "es": "Título en Español",
    "en": "Title in English"
  },
  "metadata": {
    "author": "team_member_id",
    "created": "2025-08-19",
    "version": "1.0.0",
    "est_minutes": 7,
    "difficulty": "beginner|intermediate|advanced",
    "prerequisites": ["module-id-1", "module-id-2"],
    "tags": ["nft", "wallet", "gas", "tba"]
  },
  "learning_objectives": [
    {
      "id": "obj-1",
      "description": "El usuario podrá...",
      "measurable": true,
      "success_criteria": "score >= 80%"
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "type": "widget_type",
      "duration_seconds": 45,
      "content": {},
      "interaction": {},
      "validation": {},
      "hints": [
        {"level": 1, "text": "Pista sutil"},
        {"level": 2, "text": "Pista más directa"},
        {"level": 3, "text": "Respuesta casi completa"}
      ],
      "feedback": {
        "correct": "¡Excelente! Has entendido que...",
        "incorrect": "No exactamente. Recuerda que...",
        "partial": "Vas bien, pero considera también..."
      }
    }
  ],
  "practice": {
    "required": true,
    "min_questions": 6,
    "passing_score": 0.8,
    "question_bank": "practice_bank_id",
    "adaptive": true
  },
  "completion": {
    "badge": "badge_id",
    "certificate": false,
    "next_recommended": ["module-id-3", "module-id-4"],
    "cooldown_hours": 24
  }
}
```

---

## 🎨 TIPOS DE WIDGETS EDUCATIVOS

### 1. choice_single
- Pregunta de opción única
- Mínimo 3, máximo 5 opciones
- Distractor plausible pero incorrecto

### 2. choice_multi
- Múltiples respuestas correctas
- Indicar cuántas seleccionar
- Feedback por cada opción

### 3. true_false
- Afirmación clara sin ambigüedad
- Explicación del por qué

### 4. simulator_slider
- Concepto variable (gas, congestión, etc.)
- Visualización en tiempo real
- Punto óptimo a encontrar

### 5. guided_click
- Secuencia de acciones en UI simulada
- Highlighting de elementos
- Prevención de errores

### 6. hotspot_explain
- Áreas interactivas en imagen/diagrama
- Información progresiva
- Orden lógico de exploración

### 7. code_fill
- Completar pseudo-código
- Sintaxis simplificada
- Auto-completado con validación

### 8. drag_drop
- Ordenar pasos de proceso
- Categorizar elementos
- Feedback visual inmediato

### 9. wallet_simulator
- Interacción con wallet mock
- Transacciones simuladas
- Visualización de gas y confirmaciones

### 10. transaction_explorer
- Leer transacción real
- Identificar elementos clave
- Entender el flow

---

## 📊 SISTEMA DE PROGRESIÓN

### Niveles de Maestría
```
Novice      (0-20%)   : Primeros pasos
Apprentice  (21-40%)  : Conceptos básicos
Practitioner(41-60%)  : Aplicación práctica
Expert      (61-80%)  : Casos complejos
Master      (81-100%) : Puede enseñar a otros
```

### Desbloqueables
- Módulos avanzados tras completar fundamentales
- Daily Tips personalizados según progreso
- Certificados compartibles (social proof)
- Acceso a comunidad de práctica

### Sistema de Puntos
```javascript
const scoring = {
  first_attempt_correct: 100,
  second_attempt_correct: 75,
  third_attempt_correct: 50,
  used_hint_level_1: -10,
  used_hint_level_2: -20,
  used_hint_level_3: -30,
  speed_bonus: (time_left / total_time) * 50,
  streak_multiplier: 1 + (streak_days * 0.1)
}
```

---

## 🚀 PROCESO DE CREACIÓN DE CONTENIDO

### FASE 1: DISEÑO INSTRUCCIONAL (2-3 días)
1. **Análisis de Necesidad**
   - ¿Qué problema resuelve?
   - ¿Quién es el usuario target?
   - ¿Qué debe poder hacer después?

2. **Objetivos SMART**
   - Specific: Acción concreta
   - Measurable: Métrica clara
   - Achievable: Alcanzable en tiempo estimado
   - Relevant: Conectado a uso real
   - Time-bound: Duración definida

3. **Mapa de Contenido**
   - Pre-requisitos
   - Conceptos núcleo (máx 5)
   - Secuencia lógica
   - Puntos de evaluación

### FASE 2: DESARROLLO (3-5 días)
1. **Scripting**
   - Copy conciso (máx 50 palabras por pantalla)
   - Tono conversacional
   - Ejemplos del mundo real

2. **Creación de Assets**
   - Diagramas vectoriales (SVG)
   - Screenshots anotados
   - Animaciones ligeras (Lottie)

3. **Configuración JSON**
   - Validación con schema
   - Testing de flujos
   - i18n desde inicio

### FASE 3: VALIDACIÓN (2-3 días)
1. **Review Técnico**
   - Precisión de conceptos
   - Funcionamiento de widgets
   - Performance (< 30KB adicional)

2. **Review UX**
   - Fluidez de navegación
   - Claridad de instrucciones
   - Accesibilidad completa

3. **Pilot Testing**
   - 5-10 usuarios reales
   - Observación y métricas
   - Iteración basada en feedback

### FASE 4: DESPLIEGUE (1 día)
1. **Feature Flag**
   - Canary 10% inicial
   - Monitoreo de métricas
   - Rollout gradual

2. **Documentación**
   - Release notes
   - Guía de facilitación
   - FAQs anticipadas

3. **Monitoreo Post-Launch**
   - Completion rates
   - Error reports
   - Feedback cualitativo

---

## 📈 MÉTRICAS Y TELEMETRÍA

### Eventos Obligatorios
```javascript
// Inicio de módulo
track('learn_module_start', {
  module_id,
  user_level,
  entry_point,
  device_type
})

// Progreso por paso
track('learn_step_complete', {
  module_id,
  step_id,
  duration,
  attempts,
  hints_used,
  score
})

// Interacciones
track('learn_interaction', {
  module_id,
  step_id,
  widget_type,
  action,
  correct,
  response_time
})

// Finalización
track('learn_module_complete', {
  module_id,
  total_duration,
  final_score,
  mastery_achieved,
  next_action
})
```

### KPIs Dashboard
- Funnel: Start → Step 1 → ... → Complete
- Tiempo promedio por paso
- Distribución de scores
- Patrones de abandono
- Correlación score-retención

---

## 🎯 CASOS DE USO ESPECÍFICOS

### 1. Onboarding Nuevo Usuario
```
Duración: 7 minutos
Objetivo: Primer claim exitoso
Módulos: wallet-connect → claim-basic → view-nft
Success: NFT visible en wallet
```

### 2. Educación Pre-Claim
```
Duración: 5 minutos
Objetivo: Entender TBA y gas
Módulos: what-is-tba → gas-explained
Success: Responde 3/3 preguntas correctas
```

### 3. Captación Colaborador
```
Duración: 15 minutos
Objetivo: Lead calificado
Módulos: live-demo → architecture → potential → cta
Success: NPS >= 8 + form completado
```

### 4. Security Basics
```
Duración: 10 minutos
Objetivo: Prácticas seguras
Módulos: private-keys → phishing → backup
Success: Completa security checklist
```

---

## 🔧 HERRAMIENTAS Y RECURSOS

### Authoring Tools
- JSON Schema Validator
- Linter de contenido educativo
- Preview environment
- A/B testing framework

### Asset Libraries
- Icon set (Heroicons)
- Illustration kit (Undraw)
- Animation library (Lottie)
- Screenshot annotator

### Templates
```
/templates
  /lesson-basic.json
  /lesson-practice.json
  /lesson-simulation.json
  /quiz-template.json
  /survey-template.json
```

### Review Checklist
- [ ] Objetivos claros y medibles
- [ ] Máximo 7 minutos por lección
- [ ] DO → EXPLAIN → CHECK presente
- [ ] 3 niveles de hints
- [ ] Feedback diferenciado
- [ ] Accesibilidad validada
- [ ] i18n implementado
- [ ] Métricas configuradas
- [ ] Feature flag activo
- [ ] Documentación completa

---

## 🚨 ANTIPATRONES (QUÉ NO HACER)

### ❌ Wall of Text
- Nunca más de 50 palabras seguidas
- Dividir en bullets o pasos

### ❌ Jargon Overload
- Evitar tecnicismos innecesarios
- Definir términos nuevos inmediatamente

### ❌ Passive Learning
- No videos largos sin interacción
- No PDFs descargables como contenido principal

### ❌ Punitive Feedback
- Nunca mensajes negativos por error
- Siempre ofrecer camino a la respuesta

### ❌ Linear Lock
- No bloquear progreso por un error
- Permitir skip con penalización menor

### ❌ Assumption of Knowledge
- No asumir conocimientos previos
- Siempre ofrecer repaso rápido

---

## 📝 GOVERNANCE Y MANTENIMIENTO

### Roles y Responsabilidades
- **Content Owner**: Define objetivos y revisa
- **Instructional Designer**: Crea estructura
- **Developer**: Implementa widgets
- **QA**: Valida funcionalidad y accesibilidad
- **Product**: Monitorea métricas

### Ciclo de Actualización
- Review mensual de métricas
- Actualización trimestral de contenido
- Deprecación anual de módulos obsoletos

### Versionado
```
v1.0.0 - Launch inicial
v1.1.0 - Feature nueva
v1.0.1 - Bug fix
v2.0.0 - Breaking change
```

---

## 🎓 FILOSOFÍA EDUCATIVA CORE

> "No enseñamos cripto, creamos criptonautas"

### Principios Fundamentales
1. **Experience First**: Vivir antes que estudiar
2. **Failure-Friendly**: Error como parte del aprendizaje
3. **Progress-Visible**: Cada paso cuenta y se ve
4. **Social-Optional**: Compartir logros si se desea
5. **Mastery-Based**: Avanzar por competencia, no tiempo

### Nuestro Compromiso
- Educación gratuita y accesible
- Sin barreras artificiales
- Actualización constante
- Respeto al tiempo del usuario
- Transparencia en el progreso

---

## 📅 ROADMAP KNOWLEDGE SYSTEM

### Q1 2025 (Actual)
- [x] Sistema base de lecciones
- [x] 2 módulos fundamentales
- [ ] Daily Tips básicos
- [ ] Métricas v1

### Q2 2025
- [ ] 10 módulos totales
- [ ] Sistema de badges
- [ ] Práctica adaptativa
- [ ] Panel educator

### Q3 2025
- [ ] Certificaciones on-chain
- [ ] API pública
- [ ] White-label
- [ ] Gamification completa

### Q4 2025
- [ ] AI tutor assistant
- [ ] Community contributions
- [ ] Multi-language (5 idiomas)
- [ ] Mobile app

---

## ✅ APPROVAL CHECKLIST FOR NEW CONTENT

Antes de publicar cualquier contenido nuevo:

- [ ] Cumple DO → EXPLAIN → CHECK
- [ ] Duración <= 7 minutos
- [ ] Objetivos SMART definidos
- [ ] JSON validado contra schema
- [ ] Accesibilidad WCAG 2.1 AA
- [ ] i18n implementado (mínimo ES/EN)
- [ ] Widgets testeados
- [ ] Métricas configuradas
- [ ] Feature flag creado
- [ ] Documentación actualizada
- [ ] Review por 2 team members
- [ ] Pilot con 5 usuarios
- [ ] NPS >= 8.0 en pilot

---

## 📞 SOPORTE Y CONTACTO

- **Slack Channel**: #knowledge-system
- **Documentation**: /docs/knowledge
- **Review Board**: knowledge@cryptogift.com
- **Emergency**: Si un módulo falla, activar kill switch inmediato

---

*Última actualización: 2025-08-19*
*Versión del documento: 1.0.0*
*Aprobado por: Product Team*

Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22