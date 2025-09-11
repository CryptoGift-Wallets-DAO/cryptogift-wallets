# 🚀 PLAN DE IMPLEMENTACIÓN - KNOWLEDGE SYSTEM
## Roadmap Ejecutivo para los Primeros 90 Días

---

## 📅 SEMANA 1-2: FUNDACIÓN TÉCNICA

### Sprint 1: Infraestructura Base (Días 1-7)

#### Día 1-2: Setup Arquitectónico
```typescript
// Estructura de carpetas a crear
/frontend
  /src
    /components
      /learn
        /core
          - LessonEngine.tsx      // Motor principal
          - StepNavigator.tsx     // Navegación
          - ProgressTracker.tsx   // Tracking
        /widgets
          - ChoiceSingle.tsx
          - ChoiceMulti.tsx
          - SimulatorSlider.tsx
          - GuidedClick.tsx
          - HotspotExplain.tsx
    /lib
      /learn
        - lessonSchema.ts         // Validación Zod
        - lessonTypes.ts          // TypeScript types
        - progressStore.ts        // Estado y persistencia
        - telemetry.ts           // Analytics
    /pages
      /knowledge
        - index.tsx              // Hub principal
        /[category]
          /[lessonId].tsx        // Páginas dinámicas
      /api
        /learn
          - progress.ts          // GET/POST progreso
          - complete.ts          // Certificación
          - telemetry.ts        // Eventos
```

#### Día 3-4: Schema y Validación
```typescript
// lessonSchema.ts
import { z } from 'zod';

export const LessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+@v\d+$/),
  category: z.enum(['fundamentals', 'wallet-basics', 'cryptogift', 'security', 'advanced']),
  title: z.object({
    es: z.string().max(60),
    en: z.string().max(60)
  }),
  metadata: z.object({
    author: z.string(),
    created: z.string().datetime(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    est_minutes: z.number().min(1).max(30),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    prerequisites: z.array(z.string()).optional(),
    tags: z.array(z.string())
  }),
  learning_objectives: z.array(z.object({
    id: z.string(),
    description: z.string(),
    measurable: z.boolean(),
    success_criteria: z.string()
  })),
  steps: z.array(StepSchema),
  practice: PracticeSchema.optional(),
  completion: CompletionSchema
});

// Validación en build time
export const validateLesson = (data: unknown) => {
  return LessonSchema.parse(data);
};
```

#### Día 5-7: Motor de Lecciones
```typescript
// LessonEngine.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

interface LessonState {
  currentStep: number;
  answers: Record<string, any>;
  hints: Record<string, number>;
  startTime: number;
  score: number;
  completed: boolean;
}

export const LessonEngine: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const [state, setState] = useState<LessonState>(initState);
  const router = useRouter();
  
  // Auto-save cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      saveProgress(state);
    }, 30000);
    return () => clearInterval(interval);
  }, [state]);
  
  // Navegación con validación
  const handleNext = useCallback(async () => {
    if (!validateStep(state.currentStep)) return;
    
    await trackEvent('learn_step_complete', {
      step_id: lesson.steps[state.currentStep].id,
      duration: Date.now() - state.startTime,
      score: calculateStepScore()
    });
    
    if (state.currentStep < lesson.steps.length - 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    } else {
      completeLesson();
    }
  }, [state, lesson]);
  
  // Render del widget actual
  const CurrentWidget = getWidgetComponent(lesson.steps[state.currentStep].type);
  
  return (
    <div className="lesson-container">
      <ProgressBar current={state.currentStep} total={lesson.steps.length} />
      <CurrentWidget 
        step={lesson.steps[state.currentStep]}
        onComplete={handleNext}
        onHint={handleHint}
      />
      <NavigationControls 
        canGoBack={state.currentStep > 0}
        canGoNext={validateStep(state.currentStep)}
        onBack={handleBack}
        onNext={handleNext}
      />
    </div>
  );
};
```

### Sprint 2: Widgets Fundamentales (Días 8-14)

#### Día 8-9: Widgets de Elección
```typescript
// ChoiceSingle.tsx
export const ChoiceSingle: React.FC<WidgetProps> = ({ step, onComplete, onHint }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const handleSubmit = () => {
    const isCorrect = selected === step.answer;
    
    trackInteraction({
      widget_type: 'choice_single',
      action: 'submit',
      correct: isCorrect,
      attempts: attempts + 1
    });
    
    if (isCorrect) {
      setShowFeedback(true);
      setTimeout(() => onComplete({ score: calculateScore(attempts) }), 2000);
    } else {
      setAttempts(prev => prev + 1);
      if (attempts >= 2) {
        onHint(1); // Mostrar pista nivel 1
      }
    }
  };
  
  return (
    <div className="widget-choice-single">
      <h3>{step.question}</h3>
      <div className="options">
        {step.options.map((option, idx) => (
          <button
            key={idx}
            className={`option ${selected === idx ? 'selected' : ''}`}
            onClick={() => setSelected(idx)}
            aria-pressed={selected === idx}
          >
            {option}
          </button>
        ))}
      </div>
      {showFeedback && (
        <Feedback 
          type={selected === step.answer ? 'correct' : 'incorrect'}
          message={step.feedback[selected === step.answer ? 'correct' : 'incorrect']}
        />
      )}
      <button 
        onClick={handleSubmit} 
        disabled={selected === null}
        className="submit-button"
      >
        Verificar
      </button>
    </div>
  );
};
```

#### Día 10-11: Simuladores Interactivos
```typescript
// SimulatorSlider.tsx
export const SimulatorSlider: React.FC<WidgetProps> = ({ step, onComplete }) => {
  const [value, setValue] = useState(50);
  const [gasEstimate, setGasEstimate] = useState(0);
  
  useEffect(() => {
    // Simular cálculo de gas con paymaster
    const baseGas = 21000;
    const congestionMultiplier = value / 100;
    const gasWithoutPaymaster = baseGas * (1 + congestionMultiplier);
    const gasWithPaymaster = 0; // ¡Magia del paymaster!
    
    setGasEstimate(gasWithPaymaster);
  }, [value]);
  
  return (
    <div className="widget-simulator">
      <h3>Ajusta la congestión de la red</h3>
      <div className="slider-container">
        <label htmlFor="congestion-slider">
          Congestión: {value}%
        </label>
        <input
          id="congestion-slider"
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
        />
      </div>
      <div className="result-display">
        <div className="gas-estimate">
          <span>Gas sin Paymaster:</span>
          <span className="strike">${(value * 0.5).toFixed(2)}</span>
        </div>
        <div className="gas-estimate highlight">
          <span>Gas con nuestro Paymaster:</span>
          <span className="free">$0.00 ✨</span>
        </div>
      </div>
      <p className="explanation">{step.explain}</p>
      <button onClick={() => onComplete({ learned: 'paymaster_benefit' })}>
        ¡Entendido!
      </button>
    </div>
  );
};
```

#### Día 12-14: Persistencia y Telemetría
```typescript
// progressStore.ts
import { kv } from '@vercel/kv';

export class ProgressStore {
  private static instance: ProgressStore;
  private localCache: Map<string, LessonProgress> = new Map();
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new ProgressStore();
    }
    return this.instance;
  }
  
  async saveProgress(userId: string, lessonId: string, progress: LessonProgress) {
    const key = `learn:progress:${userId}:${lessonId}`;
    
    // Guardar localmente primero (optimistic update)
    this.localCache.set(key, progress);
    localStorage.setItem(key, JSON.stringify(progress));
    
    // Luego sincronizar con backend
    try {
      await kv.setex(key, 90 * 24 * 60 * 60, JSON.stringify(progress));
      
      // Telemetría
      await trackEvent('learn_progress_saved', {
        lesson_id: lessonId,
        step: progress.currentStep,
        score: progress.score
      });
    } catch (error) {
      console.error('Failed to sync progress:', error);
      // El progreso local sigue funcionando
    }
  }
  
  async getProgress(userId: string, lessonId: string): Promise<LessonProgress | null> {
    const key = `learn:progress:${userId}:${lessonId}`;
    
    // Intentar cache local primero
    if (this.localCache.has(key)) {
      return this.localCache.get(key)!;
    }
    
    // Luego localStorage
    const localData = localStorage.getItem(key);
    if (localData) {
      return JSON.parse(localData);
    }
    
    // Finalmente KV
    try {
      const data = await kv.get(key);
      if (data) {
        const progress = JSON.parse(data as string);
        this.localCache.set(key, progress);
        return progress;
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
    
    return null;
  }
}
```

---

## 📅 SEMANA 3-4: PRIMEROS MÓDULOS

### Módulo 1: "Reclama tu Gift sin Gas" (7 minutos)
```json
{
  "id": "claim-gift-no-gas@v1",
  "category": "cryptogift",
  "title": {
    "es": "Reclama tu Gift sin Gas",
    "en": "Claim your Gift Gas-Free"
  },
  "metadata": {
    "author": "team",
    "created": "2025-08-19",
    "version": "1.0.0",
    "est_minutes": 7,
    "difficulty": "beginner",
    "prerequisites": [],
    "tags": ["gift", "claim", "gas", "paymaster"]
  },
  "learning_objectives": [
    {
      "id": "obj-1",
      "description": "El usuario podrá reclamar un gift sin pagar gas",
      "measurable": true,
      "success_criteria": "Completa claim simulado exitosamente"
    },
    {
      "id": "obj-2",
      "description": "El usuario entenderá qué es un paymaster",
      "measurable": true,
      "success_criteria": "Responde correctamente 3/3 preguntas sobre paymaster"
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "type": "guided_click",
      "duration_seconds": 60,
      "content": {
        "title": "Abre tu primer gift",
        "instruction": "Haz clic en el botón 'Reclamar Gift'"
      },
      "interaction": {
        "targets": ["claim-button"],
        "sequence": ["click-claim", "view-modal"]
      },
      "validation": {
        "type": "sequence_complete",
        "required": ["claim-button-clicked"]
      }
    },
    {
      "id": "step-2",
      "type": "simulator_slider",
      "duration_seconds": 90,
      "content": {
        "title": "¿Por qué no pagas gas?",
        "instruction": "Ajusta la congestión y observa el costo"
      },
      "interaction": {
        "slider_range": [0, 100],
        "show_calculation": true
      },
      "hints": [
        {"level": 1, "text": "Fíjate en el costo con paymaster"},
        {"level": 2, "text": "El paymaster siempre lo cubre"},
        {"level": 3, "text": "Siempre será $0.00"}
      ]
    }
  ]
}
```

### Módulo 2: "Tu NFT es una Wallet" (5 minutos)
```json
{
  "id": "nft-is-wallet@v1",
  "category": "fundamentals",
  "title": {
    "es": "Tu NFT es una Wallet",
    "en": "Your NFT is a Wallet"
  },
  "metadata": {
    "est_minutes": 5,
    "difficulty": "beginner"
  },
  "steps": [
    {
      "id": "step-1",
      "type": "hotspot_explain",
      "content": {
        "title": "Explora tu NFT-Wallet",
        "image": "/learn/assets/nft-wallet-diagram.svg",
        "hotspots": [
          {
            "id": "nft-layer",
            "x": "20%",
            "y": "30%",
            "label": "Capa NFT",
            "description": "Es un NFT normal ERC-721"
          },
          {
            "id": "wallet-layer",
            "x": "50%",
            "y": "50%",
            "label": "Capa Wallet",
            "description": "Tiene una wallet ERC-6551 asociada"
          },
          {
            "id": "funds-layer",
            "x": "80%",
            "y": "70%",
            "label": "Fondos",
            "description": "Puede recibir y enviar crypto"
          }
        ]
      }
    }
  ]
}
```

---

## 📅 SEMANA 5-6: SISTEMA DE PRÁCTICA

### Banco de Preguntas
```typescript
// questionBank.ts
export const questionBank = {
  'claim-basics': [
    {
      id: 'q1',
      type: 'choice_single',
      question: '¿Quién paga el gas cuando reclamas un gift?',
      options: [
        'Tú (el reclamador)',
        'El creador del gift',
        'El paymaster de CryptoGift',
        'La red de Ethereum'
      ],
      answer: 2,
      difficulty: 1,
      topic: 'paymaster'
    },
    {
      id: 'q2',
      type: 'true_false',
      question: 'Un NFT-wallet puede recibir otros NFTs',
      answer: true,
      difficulty: 1,
      topic: 'tba'
    }
  ]
};

// Generador adaptativo
export class AdaptiveQuestionGenerator {
  private userHistory: Map<string, AnswerHistory> = new Map();
  
  getNextQuestion(userId: string, topic: string): Question {
    const history = this.userHistory.get(userId) || new AnswerHistory();
    const difficulty = this.calculateDifficulty(history);
    
    // Buscar pregunta no respondida del nivel apropiado
    const candidates = questionBank[topic].filter(q => 
      !history.answered.has(q.id) && 
      Math.abs(q.difficulty - difficulty) <= 1
    );
    
    if (candidates.length === 0) {
      // Resetear si completó todas
      history.answered.clear();
      return questionBank[topic][0];
    }
    
    // Seleccionar aleatoriamente entre candidatos
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  
  private calculateDifficulty(history: AnswerHistory): number {
    const recentScores = history.getRecentScores(5);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    
    if (avgScore > 0.8) return Math.min(history.currentDifficulty + 1, 5);
    if (avgScore < 0.5) return Math.max(history.currentDifficulty - 1, 1);
    return history.currentDifficulty;
  }
}
```

---

## 📅 SEMANA 7-8: DAILY TIPS Y GAMIFICATION

### Sistema de Daily Tips
```typescript
// DailyTip.tsx
export const DailyTip: React.FC = () => {
  const [tip, setTip] = useState<Tip | null>(null);
  const [answered, setAnswered] = useState(false);
  const [streak, setStreak] = useState(0);
  
  useEffect(() => {
    loadDailyTip();
    loadStreak();
  }, []);
  
  const loadDailyTip = async () => {
    const userId = getUserAnonId();
    const today = new Date().toISOString().split('T')[0];
    
    // Verificar si ya respondió hoy
    const key = `daily:${userId}:${today}`;
    const completed = await kv.get(key);
    
    if (completed) {
      setAnswered(true);
      return;
    }
    
    // Cargar tip del día
    const tipIndex = hashDate(today) % dailyTips.length;
    setTip(dailyTips[tipIndex]);
  };
  
  const handleAnswer = async (answer: any) => {
    const isCorrect = validateAnswer(tip!, answer);
    
    if (isCorrect) {
      const newStreak = await incrementStreak();
      setStreak(newStreak);
      
      // Celebración si milestone
      if ([7, 14, 30, 60, 100].includes(newStreak)) {
        celebrate(`¡${newStreak} días seguidos!`);
      }
    }
    
    setAnswered(true);
    
    trackEvent('daily_tip_answered', {
      tip_id: tip!.id,
      correct: isCorrect,
      streak: streak,
      time_to_answer: Date.now() - startTime
    });
  };
  
  if (!tip || answered) {
    return <StreakDisplay streak={streak} nextTipIn={timeUntilMidnight()} />;
  }
  
  return (
    <div className="daily-tip-card">
      <div className="tip-header">
        <h3>💡 Tip del Día</h3>
        <StreakBadge streak={streak} />
      </div>
      <TipWidget tip={tip} onAnswer={handleAnswer} />
    </div>
  );
};
```

### Badges y Achievements
```typescript
// achievements.ts
export const achievements = {
  'first_claim': {
    id: 'first_claim',
    name: 'Primer Claim',
    description: 'Reclamaste tu primer gift',
    icon: '🎁',
    points: 100
  },
  'streak_7': {
    id: 'streak_7',
    name: 'Semana Perfecta',
    description: '7 días seguidos de Daily Tips',
    icon: '🔥',
    points: 250
  },
  'speed_learner': {
    id: 'speed_learner',
    name: 'Aprendiz Veloz',
    description: 'Completaste un módulo en menos de 5 minutos',
    icon: '⚡',
    points: 150
  },
  'perfect_score': {
    id: 'perfect_score',
    name: 'Perfección',
    description: '100% en un módulo sin usar pistas',
    icon: '💯',
    points: 300
  }
};

export class AchievementSystem {
  async checkAndAward(userId: string, event: LearningEvent) {
    const userAchievements = await this.getUserAchievements(userId);
    const newAchievements: Achievement[] = [];
    
    // Verificar cada achievement
    for (const [key, achievement] of Object.entries(achievements)) {
      if (!userAchievements.has(key)) {
        if (this.meetsRequirements(achievement, event, userId)) {
          newAchievements.push(achievement);
          await this.awardAchievement(userId, achievement);
        }
      }
    }
    
    // Mostrar notificaciones
    newAchievements.forEach(achievement => {
      showAchievementNotification(achievement);
    });
    
    return newAchievements;
  }
}
```

---

## 📅 SEMANA 9-12: MÓDULO DE CAPTACIÓN

### Experiencia de 15 Minutos para Colaboradores
```typescript
// CollaboratorOnboarding.tsx
export const CollaboratorOnboarding: React.FC = () => {
  const [stage, setStage] = useState<'demo' | 'explore' | 'commit'>('demo');
  const [interests, setInterests] = useState<string[]>([]);
  const [nps, setNps] = useState<number | null>(null);
  
  const stages = {
    demo: {
      title: 'Vívelo en 2 minutos',
      component: <LiveClaimDemo onComplete={() => setStage('explore')} />
    },
    explore: {
      title: 'Explora el potencial',
      component: <PotentialExplorer onSelect={setInterests} onComplete={() => setStage('commit')} />
    },
    commit: {
      title: '¿Construimos juntos?',
      component: <CommitmentForm interests={interests} onSubmit={handleSubmit} />
    }
  };
  
  return (
    <div className="collaborator-onboarding">
      <ProgressIndicator stages={Object.keys(stages)} current={stage} />
      <div className="stage-content">
        {stages[stage].component}
      </div>
      <TimeEstimate remaining={calculateRemaining(stage)} />
    </div>
  );
};

// Componente de demo en vivo
const LiveClaimDemo: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [giftClaimed, setGiftClaimed] = useState(false);
  
  return (
    <div className="live-demo">
      <h2>No te lo contamos, vívelo</h2>
      <p>Reclama este gift real ahora mismo (sin pagar gas)</p>
      
      <div className="demo-gift-card">
        <img src="/demo-gift.png" alt="Gift de demostración" />
        <button 
          className="claim-button-demo"
          onClick={async () => {
            await claimDemoGift();
            setGiftClaimed(true);
            trackEvent('collaborator_demo_claimed');
          }}
        >
          Reclamar Gift
        </button>
      </div>
      
      {giftClaimed && (
        <div className="success-message">
          <h3>¡Lo tienes! 🎉</h3>
          <p>Revisa tu wallet. Gas pagado: $0.00</p>
          <button onClick={onComplete}>Continuar explorando</button>
        </div>
      )}
    </div>
  );
};
```

---

## 📊 MÉTRICAS Y MONITOREO

### Dashboard de Analytics
```typescript
// LearnAnalytics.tsx
export const LearnAnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  
  useEffect(() => {
    loadMetrics();
  }, []);
  
  return (
    <div className="analytics-dashboard">
      <div className="metrics-grid">
        <MetricCard
          title="Completion Rate"
          value={`${metrics?.completionRate || 0}%`}
          target="85%"
          status={metrics?.completionRate >= 85 ? 'success' : 'warning'}
        />
        <MetricCard
          title="Avg. Time"
          value={`${metrics?.avgTime || 0}m`}
          target="<7m"
          status={metrics?.avgTime <= 7 ? 'success' : 'warning'}
        />
        <MetricCard
          title="NPS Score"
          value={metrics?.nps || 0}
          target="≥8.0"
          status={metrics?.nps >= 8 ? 'success' : 'warning'}
        />
        <MetricCard
          title="D7 Retention"
          value={`${metrics?.retention || 0}%`}
          target="≥25%"
          status={metrics?.retention >= 25 ? 'success' : 'warning'}
        />
      </div>
      
      <FunnelChart
        data={metrics?.funnel || []}
        labels={['Start', 'Step 1', 'Step 2', 'Complete']}
      />
      
      <HeatmapCalendar
        data={metrics?.dailyActivity || []}
        title="Actividad Diaria"
      />
    </div>
  );
};
```

---

## ✅ CHECKLIST DE LANZAMIENTO

### Semana 1-2
- [ ] Estructura de carpetas creada
- [ ] Schema JSON validado
- [ ] Motor de lecciones funcionando
- [ ] 5 widgets básicos implementados
- [ ] Sistema de persistencia local
- [ ] API de progreso funcionando

### Semana 3-4
- [ ] Módulo "Claim sin Gas" completo
- [ ] Módulo "NFT es Wallet" completo
- [ ] Sistema de hints implementado
- [ ] Feedback diferenciado funcionando
- [ ] Telemetría básica activa

### Semana 5-6
- [ ] Banco de 20 preguntas mínimo
- [ ] Sistema adaptativo básico
- [ ] Cálculo de maestría (80%)
- [ ] Certificados de completación

### Semana 7-8
- [ ] Daily Tips funcionando
- [ ] Sistema de streaks
- [ ] 5 badges implementados
- [ ] Notificaciones de logros

### Semana 9-12
- [ ] Módulo captación 15 min
- [ ] Demo en vivo integrada
- [ ] Formulario de leads
- [ ] Dashboard de métricas
- [ ] A/B testing configurado

### Pre-Launch
- [ ] Accesibilidad WCAG 2.1 AA validada
- [ ] i18n ES/EN completo
- [ ] Feature flags configurados
- [ ] Documentación actualizada
- [ ] Pilot con 10 usuarios
- [ ] NPS >= 8.0 en pilot

---

## 🚀 COMANDO DE INICIO

```bash
# Crear estructura inicial
npm run scaffold:knowledge-system

# Validar schemas
npm run validate:lessons

# Iniciar en modo desarrollo
npm run dev:knowledge

# Ejecutar tests
npm run test:knowledge

# Deploy con feature flag
npm run deploy:knowledge -- --canary=10
```

---

*Este plan está diseñado para implementarse en 90 días con un equipo de 2-3 desarrolladores*

Made by mbxarts.com The Moon in a Box property

Co-Author: Godez22