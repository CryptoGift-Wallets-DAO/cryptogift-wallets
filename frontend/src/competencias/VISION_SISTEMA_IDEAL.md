# VISIÓN DEL SISTEMA IDEAL DE COMPETENCIAS

> **Fecha**: Enero 14, 2026
> **Versión**: Visión Máximo Esplendor
> **Filosofía**: 3 Taps para Crear, 1 Tap para Unirse, 0 Fricción

---

## FILOSOFÍA CORE

> "La competencia más rápida del mundo cripto. Piedra, papel o tijera para ver quién paga la cuenta. El ganador recibe en 5 segundos."

### Principios Fundamentales
1. **Ultra-Velocidad**: Crear competencia en <10 segundos
2. **Zero Fricción**: Un link, un tap, estás dentro
3. **Mobile-First**: Diseñado para el bolsillo, no el escritorio
4. **Tap-to-Everything**: NFC, QR, Deep Links
5. **Instant Settlement**: El ganador recibe inmediatamente
6. **Reputation-Driven**: Tu historial te define

---

## CASOS DE USO PRINCIPALES

### 1. 🪨📄✂️ PIEDRA PAPEL TIJERA - "¿Quién Paga?"
**Escenario**: Estás en un restaurante, la cuenta llega, nadie quiere pagar.

**Flujo Ideal**:
```
1. Abres app → "Quick Challenge" → "¿Quién Paga?" (1 tap)
2. Se genera QR code instantáneo
3. Amigo escanea QR o tap NFC (1 tap)
4. Ambos depositan automáticamente (ej: 50% cada uno del monto)
5. App muestra "3, 2, 1..." y ambos eligen
6. Resultado instantáneo
7. Ganador recibe TODO el pot
8. +1 reputación para ambos por juego justo
```

**Tiempo total**: <30 segundos

### 2. ⚽ PARTIDO DE FÚTBOL AMISTOSO
**Escenario**: Partido 5v5 el sábado, cada jugador pone $10.

**Flujo Ideal**:
```
1. Capitán crea: "Fútbol Sábado" → 2 equipos → $10 entrada (3 taps)
2. Genera link compartible por WhatsApp
3. 9 amigos abren link → "Unirse" (1 tap cada uno)
4. Cada uno deposita $10 automáticamente
5. Pot = $100 (menos 2.5% = $97.50 para ganador)
6. Sábado: Partido termina
7. Capitán declara ganador → "Equipo A"
8. Capitán del Equipo B confirma (anti-fraude)
9. $97.50 se distribuye al Equipo A instantáneamente
10. Todos ganan reputación (+5 por participar, +10 por ganar)
```

### 3. 🎮 TORNEO RÁPIDO DE GAMING
**Escenario**: Torneo de FIFA en la casa de un amigo, 8 jugadores.

**Flujo Ideal**:
```
1. Host crea: "FIFA Tournament" → 8 players → $5 entrada
2. Bracket se genera automáticamente (VRF para orden)
3. Link compartido, 8 personas se unen
4. Pot = $40 → Distribución: 60% (1st), 30% (2nd), 10% (3rd)
5. Cada match: ganador reporta → perdedor confirma (2 taps)
6. Si disputa: escalación a juez designado
7. Final termina → Distribución automática
8. Leaderboard actualizado, reputaciones suben
```

### 4. 🎯 APUESTA DE PREDICCIÓN
**Escenario**: "¿Quién gana el partido Argentina vs Brasil?"

**Flujo Ideal**:
```
1. Creador: "Argentina vs Brasil" → Mercado binario → $100 liquidez
2. Probabilidad inicial: 50/50
3. Usuarios apuestan: Compran shares YES o NO
4. CPMM ajusta probabilidades en tiempo real
5. Partido termina → Oracle o creador resuelve
6. Ganadores reciben payout proporcional
7. Creador gana fees por liquidez provista
```

### 5. 💰 POOL COLABORATIVO
**Escenario**: Juntar dinero para regalo de cumpleaños del jefe.

**Flujo Ideal**:
```
1. Organizador: "Regalo para Juan" → Meta $200 → Deadline viernes
2. Link a 15 compañeros de trabajo
3. Cada uno contribuye lo que quiera (mínimo $5)
4. Progress bar muestra avance en tiempo real
5. Meta alcanzada o deadline llega
6. Fondos van automáticamente a wallet del organizador
7. Si no se alcanza meta: refund automático a todos
```

### 6. 🏃 MILESTONE PERSONAL
**Escenario**: "Voy a correr 5km todos los días por un mes."

**Flujo Ideal**:
```
1. Usuario: "5km Daily Challenge" → Stake $100 → 30 días
2. Designa verificador (amigo o Strava oracle)
3. Si falla un día: pierde stake
4. Si completa 30 días: recupera stake + badge NFT
5. Stake perdido va a: caridad / verificador / burn
```

---

## FUNCIONALIDADES ADICIONALES REQUERIDAS

### A. SISTEMA DE COMPARTIR ULTRA-RÁPIDO

#### A.1 QR Code Dinámico
```typescript
interface QuickShareQR {
  competitionId: string;
  expiresAt: number;          // 5 minutos por defecto
  autoJoinOnScan: boolean;    // True = un scan y estás dentro
  prefilledAmount?: string;   // Monto pre-configurado
  role: 'participant' | 'judge';
  style: 'compact' | 'branded';
}

// Generación instantánea
const qr = await generateQuickQR({
  competitionId: 'abc123',
  autoJoinOnScan: true,
  expiresAt: Date.now() + 5 * 60 * 1000
});
```

#### A.2 NFC Tap-to-Share
```typescript
interface NFCCompetitionPayload {
  type: 'competition_invite';
  id: string;
  action: 'join' | 'view';
  expiresAt: number;
}

// Escribir a NFC tag o teléfono cercano
await writeNFCPayload({
  type: 'competition_invite',
  id: competition.id,
  action: 'join'
});

// Leer y auto-unirse
navigator.nfc.addEventListener('reading', async (event) => {
  const payload = parseNFCPayload(event.message);
  if (payload.type === 'competition_invite') {
    await quickJoin(payload.id);
  }
});
```

#### A.3 Deep Links Universales
```
cryptogift://competition/join/{id}
cryptogift://competition/view/{id}
cryptogift://quick-challenge/{type}

// Web fallback
https://cryptogift-wallets.vercel.app/c/{shortCode}
```

#### A.4 Share Sheet Nativo
```typescript
const shareCompetition = async (competition: Competition) => {
  await navigator.share({
    title: competition.title,
    text: `¡Únete a mi competencia! Pot: ${competition.prizePool}`,
    url: `https://cryptogift-wallets.vercel.app/c/${competition.shortCode}`
  });
};
```

---

### B. SISTEMA DE JUECES DINÁMICO

#### B.1 Configuración de Jueces al Crear
```typescript
interface JudgeConfiguration {
  // Cantidad de jueces
  judgeCount: 1 | 3 | 5 | 7;

  // Selección de jueces
  selectionMethod:
    | 'creator_picks'      // Creador elige específicos
    | 'participant_vote'   // Participantes votan jueces
    | 'random_from_pool'   // Aleatorio de pool verificado
    | 'reputation_based';  // Top por reputación

  // Requisitos
  minReputation?: number;
  mustBeParticipant?: boolean;

  // Threshold para resolución
  threshold: 'majority' | 'unanimous' | 'any_one';

  // Incentivos
  judgeReward: {
    type: 'fixed' | 'percentage';
    amount: string;
  };
}
```

#### B.2 Flujo de Votación de Jueces
```typescript
interface JudgeVotingFlow {
  // Fase 1: Competencia termina
  competitionEnded: boolean;

  // Fase 2: Periodo de votación abre
  votingOpensAt: number;
  votingClosesAt: number;

  // Fase 3: Jueces votan
  votes: {
    judgeAddress: string;
    vote: string;         // ID del ganador o resultado
    timestamp: number;
    signature: string;    // Firma para verificación
  }[];

  // Fase 4: Threshold alcanzado
  thresholdReached: boolean;
  finalResult: string;

  // Fase 5: Distribución automática
  distributionTxHash: string;
}
```

#### B.3 Panel de Juez Mobile-First
```typescript
interface JudgePanelMobile {
  // Vista simplificada
  competitionSummary: {
    title: string;
    participants: string[];
    stakes: string;
  };

  // Opciones de voto (máximo 4 para mobile)
  voteOptions: {
    id: string;
    label: string;
    icon?: string;
  }[];

  // Un tap para votar
  onVote: (optionId: string) => Promise<void>;

  // Confirmación con biometría
  requireBiometric: boolean;
}
```

---

### C. SISTEMA DE REPUTACIÓN Y MÉTRICAS

#### C.1 Modelo de Reputación
```typescript
interface UserReputation {
  // Score principal (0-1000)
  totalScore: number;

  // Componentes
  components: {
    // Participación (+1 por cada competencia)
    participation: number;

    // Victorias (+5 por victoria)
    wins: number;

    // Juez justo (+10 por votación consistente)
    fairJudging: number;

    // Pago a tiempo (+2 por pago instant)
    promptPayment: number;

    // Sin disputas (-20 por disputa perdida)
    noDisputes: number;

    // Creador confiable (+3 por competencia exitosa)
    reliableCreator: number;
  };

  // Badges NFT
  badges: {
    id: string;
    name: string;
    earnedAt: number;
    tokenId?: string;  // Si es NFT on-chain
  }[];

  // Nivel (basado en score)
  level: 'newcomer' | 'regular' | 'trusted' | 'veteran' | 'legend';

  // Streak actual
  currentStreak: number;
  longestStreak: number;
}
```

#### C.2 Métricas del Usuario
```typescript
interface UserMetrics {
  // Totales
  totalCompetitions: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;

  // Financieros
  totalWagered: string;
  totalWon: string;
  totalLost: string;
  netProfit: string;

  // Por categoría
  byCategory: {
    [category: string]: {
      played: number;
      won: number;
      wagered: string;
    };
  };

  // Tendencias
  last7Days: {
    competitions: number;
    wins: number;
    profit: string;
  };

  // Como juez
  judgeMetrics: {
    timesJudged: number;
    consistencyScore: number;  // Qué tan seguido vota con mayoría
    averageResponseTime: number;
  };
}
```

#### C.3 Leaderboards
```typescript
interface Leaderboard {
  // Global
  global: LeaderboardEntry[];

  // Por categoría
  byCategory: {
    [category: string]: LeaderboardEntry[];
  };

  // Por periodo
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];

  // Especializado
  topJudges: LeaderboardEntry[];
  topCreators: LeaderboardEntry[];
  highestWinRate: LeaderboardEntry[];
  biggestWinners: LeaderboardEntry[];
}

interface LeaderboardEntry {
  rank: number;
  address: string;
  ensName?: string;
  avatar?: string;
  score: number;
  metric: string;  // Lo que se está midiendo
}
```

---

### D. QUICK CHALLENGES (Competencias Instantáneas)

#### D.1 Templates Predefinidos
```typescript
const QUICK_TEMPLATES = {
  // 🪨📄✂️ Piedra Papel Tijera
  'rock-paper-scissors': {
    name: '¿Quién Paga?',
    emoji: '🪨📄✂️',
    participants: 2,
    duration: '30s',
    judgeMethod: 'automatic',  // App determina ganador
    defaultStake: 'split_bill',
  },

  // 🎲 Coin Flip
  'coin-flip': {
    name: 'Cara o Cruz',
    emoji: '🪙',
    participants: 2,
    duration: '10s',
    judgeMethod: 'vrf',  // Chainlink VRF
    defaultStake: 'equal',
  },

  // 🎯 Dardos Virtuales
  'darts': {
    name: 'Dardos',
    emoji: '🎯',
    participants: 2,
    duration: '60s',
    judgeMethod: 'score_comparison',
  },

  // 🃏 High Card
  'high-card': {
    name: 'Carta Alta',
    emoji: '🃏',
    participants: [2, 10],  // 2-10 jugadores
    duration: '15s',
    judgeMethod: 'vrf',
  },

  // ⏱️ Trivia Race
  'trivia': {
    name: 'Trivia Rápida',
    emoji: '🧠',
    participants: [2, 20],
    duration: '5min',
    judgeMethod: 'automatic',
  },
};
```

#### D.2 Flujo de Quick Challenge
```typescript
interface QuickChallengeFlow {
  // Paso 1: Seleccionar template (1 tap)
  step1_selectTemplate: {
    templates: typeof QUICK_TEMPLATES;
    selected: string;
  };

  // Paso 2: Configurar stake (1 tap o predefinido)
  step2_stake: {
    presets: ['$1', '$5', '$10', '$20', 'Custom'];
    selected: string;
  };

  // Paso 3: Compartir (QR automático)
  step3_share: {
    qrCode: string;
    link: string;
    nfcReady: boolean;
  };

  // Paso 4: Esperar oponente (auto-detect)
  step4_waitOpponent: {
    timeout: 300000;  // 5 minutos
    onJoin: () => void;
  };

  // Paso 5: Jugar (depende del template)
  step5_play: {
    gameComponent: React.Component;
    onComplete: (result: GameResult) => void;
  };

  // Paso 6: Resultado y distribución (automático)
  step6_result: {
    winner: string;
    txHash: string;
    newReputation: number;
  };
}
```

---

### E. DEPÓSITOS INSTANTÁNEOS

#### E.1 Pre-autorización de Fondos
```typescript
interface PreAuthorization {
  // Usuario pre-aprueba monto máximo
  maxAmount: string;

  // Para competencias rápidas
  validFor: 'quick_challenges' | 'any' | 'specific_category';

  // Duración de la pre-autorización
  expiresAt: number;

  // Permite auto-join con depósito
  autoDeposit: boolean;
}

// Ejemplo: Usuario pre-autoriza $50 para quick challenges
await preAuthorize({
  maxAmount: '50',
  validFor: 'quick_challenges',
  expiresAt: Date.now() + 24 * 60 * 60 * 1000,  // 24 horas
  autoDeposit: true
});

// Ahora puede unirse a quick challenges sin firmar cada vez
```

#### E.2 Hot Wallet para Micro-competencias
```typescript
interface HotWallet {
  // Wallet caliente para competencias <$20
  address: string;
  balance: string;

  // Recarga automática desde wallet principal
  autoTopUp: {
    enabled: boolean;
    threshold: string;   // Cuando baje de X
    amount: string;      // Recargar Y
  };

  // Límites de seguridad
  limits: {
    maxPerCompetition: string;
    maxDaily: string;
    maxWeekly: string;
  };
}
```

#### E.3 Depósito por Biometría
```typescript
interface BiometricDeposit {
  // Un tap con Face ID / Touch ID para confirmar
  authenticate: () => Promise<boolean>;

  // Si autenticado, deposita inmediatamente
  depositOnAuth: boolean;

  // Límite sin autenticación adicional
  noAuthLimit: string;  // ej: $5
}
```

---

### F. SISTEMA DE CIERRE AUTOMÁTICO

#### F.1 Condiciones de Cierre de Registro
```typescript
interface RegistrationClose {
  // Por cantidad de participantes
  onParticipantCount: {
    exact?: number;      // Exactamente N participantes
    minimum?: number;    // Al menos N participantes
    maximum?: number;    // Máximo N participantes
  };

  // Por tiempo
  onTime: {
    deadline?: number;   // Timestamp específico
    afterFirst?: number; // X segundos después del primero
  };

  // Por condición custom
  onCondition: {
    allDeposited?: boolean;  // Todos depositaron
    creatorSignal?: boolean; // Creador cierra manualmente
  };

  // Qué pasa al cerrar
  onClose: {
    action: 'start_competition' | 'wait_for_start' | 'refund_if_minimum_not_met';
  };
}
```

#### F.2 Activación Automática de Votación
```typescript
interface AutoVotingActivation {
  // Trigger de activación
  trigger:
    | 'competition_ended'    // Cuando termina la competencia
    | 'creator_signals'      // Creador indica fin
    | 'oracle_confirms'      // Oracle externo confirma
    | 'participant_consensus'; // Mayoría de participantes

  // Duración del periodo de votación
  votingDuration: number;  // en segundos

  // Recordatorios a jueces
  reminders: {
    at: number[];  // [50%, 80%, 95% del tiempo]
    via: ('push' | 'email' | 'sms')[];
  };

  // Si no votan todos
  fallback: {
    ifNoQuorum: 'extend' | 'majority_wins' | 'refund';
    extensionTime?: number;
  };
}
```

---

### G. NOTIFICACIONES PUSH INTELIGENTES

#### G.1 Tipos de Notificaciones
```typescript
type CompetitionNotification =
  | { type: 'invite_received'; from: string; competition: string; }
  | { type: 'opponent_joined'; competition: string; }
  | { type: 'competition_starting'; in: number; }
  | { type: 'your_turn'; competition: string; action: string; }
  | { type: 'vote_required'; competition: string; deadline: number; }
  | { type: 'you_won'; competition: string; amount: string; }
  | { type: 'you_lost'; competition: string; }
  | { type: 'funds_received'; amount: string; txHash: string; }
  | { type: 'reputation_up'; newScore: number; reason: string; }
  | { type: 'badge_earned'; badge: string; };
```

#### G.2 Configuración de Notificaciones
```typescript
interface NotificationPreferences {
  // Canales
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };

  // Por tipo
  byType: {
    invites: boolean;
    gameUpdates: boolean;
    moneyMovements: boolean;
    reputation: boolean;
    marketing: boolean;
  };

  // Quiet hours
  quietHours: {
    enabled: boolean;
    from: string;  // "22:00"
    to: string;    // "08:00"
    timezone: string;
  };
}
```

---

### H. HISTORIAL Y REPLAYS

#### H.1 Historial de Competencias
```typescript
interface CompetitionHistory {
  // Lista de competencias pasadas
  past: {
    id: string;
    title: string;
    category: string;
    date: number;
    result: 'won' | 'lost' | 'draw' | 'cancelled';
    profit: string;  // Puede ser negativo
    participants: number;
    myPosition?: number;
  }[];

  // Filtros
  filters: {
    category?: string;
    result?: string;
    dateRange?: [number, number];
  };

  // Estadísticas agregadas
  summary: {
    totalPlayed: number;
    totalWon: number;
    winRate: number;
    netProfit: string;
  };
}
```

#### H.2 Replay de Competencia
```typescript
interface CompetitionReplay {
  // Eventos en orden cronológico
  events: {
    timestamp: number;
    type: string;
    actor: string;
    data: any;
  }[];

  // Reproducción
  play: () => void;
  pause: () => void;
  seekTo: (timestamp: number) => void;
  speed: 1 | 2 | 4;

  // Compartir momento específico
  shareAt: (timestamp: number) => string;  // Genera link
}
```

---

### I. INTEGRACIONES SOCIALES

#### I.1 Conexión con Redes
```typescript
interface SocialIntegrations {
  // Verificación de identidad
  verified: {
    twitter?: string;
    farcaster?: string;
    lens?: string;
    ens?: string;
  };

  // Compartir automático
  autoShare: {
    wins: boolean;
    badges: boolean;
    milestones: boolean;
    destination: ('twitter' | 'farcaster' | 'lens')[];
  };

  // Importar amigos
  findFriends: {
    fromTwitter: () => Promise<string[]>;
    fromFarcaster: () => Promise<string[]>;
    fromContacts: () => Promise<string[]>;
  };
}
```

#### I.2 Frames de Farcaster
```typescript
interface FarcasterFrame {
  // Frame para compartir competencia
  competitionFrame: {
    title: string;
    image: string;  // Preview de la competencia
    buttons: [
      { label: 'Unirse', action: 'post' },
      { label: 'Ver Detalles', action: 'link' }
    ];
  };

  // Frame para resultado
  resultFrame: {
    winner: string;
    amount: string;
    buttons: [
      { label: 'Ver Replay', action: 'link' },
      { label: 'Revancha', action: 'post' }
    ];
  };
}
```

---

### J. MODO OFFLINE Y SINCRONIZACIÓN

#### J.1 Competencias Offline
```typescript
interface OfflineSupport {
  // Cache de competencias activas
  cachedCompetitions: Competition[];

  // Cola de acciones pendientes
  pendingActions: {
    action: 'join' | 'vote' | 'bet';
    data: any;
    createdAt: number;
  }[];

  // Sincronización al reconectar
  onReconnect: () => Promise<void>;

  // Conflictos
  conflictResolution: 'server_wins' | 'client_wins' | 'merge';
}
```

---

## FLUJO DE USUARIO IDEAL

### Crear Competencia (3 Taps)
```
Tap 1: "+" → Seleccionar categoría/template
Tap 2: Configurar stake (preset o custom)
Tap 3: Confirmar con biometría

→ QR Code generado automáticamente
→ Link copiado al clipboard
→ NFC ready para tap-to-share
```

### Unirse a Competencia (1 Tap)
```
Recibe link/QR/NFC → Abre app automáticamente
App muestra preview de competencia
Tap 1: "Unirse" (si pre-autorizado, deposita automático)

→ Notificación al creador: "Oponente unido"
→ Competencia inicia cuando condiciones se cumplen
```

### Resolver Competencia (2-3 Taps por Juez)
```
Notificación push: "Tu voto es requerido"
Tap 1: Abrir competencia
Tap 2: Seleccionar ganador
Tap 3: Confirmar con biometría

→ Si threshold alcanzado: distribución automática
→ Notificación a ganador: "Has ganado $X"
→ Fondos llegan en <5 segundos
```

---

## COMPONENTES UI ADICIONALES REQUERIDOS

### Mobile-First Components
```
❌ QuickChallengeSelector      - Grid de templates rápidos
❌ StakeSlider                 - Selector de monto deslizable
❌ QRScanner                   - Escáner de QR integrado
❌ NFCHandler                  - Lector/escritor NFC
❌ BiometricPrompt             - Prompt de autenticación
❌ CountdownTimer              - Timer animado para juegos
❌ ResultAnimation             - Animación de victoria/derrota
❌ ReputationBadge             - Badge de nivel de usuario
❌ LeaderboardCard             - Tarjeta de posición en ranking
❌ ShareSheet                  - Sheet nativo de compartir
❌ NotificationCenter          - Centro de notificaciones
❌ HistoryTimeline             - Timeline de historial
❌ QuickActions                - Acciones rápidas flotantes
```

### Game Components
```
❌ RockPaperScissors           - Juego de piedra papel tijera
❌ CoinFlip                    - Animación de moneda
❌ DiceRoll                    - Dados virtuales
❌ CardDraw                    - Sacar carta
❌ SpinWheel                   - Ruleta
❌ TriviaQuestion              - Pregunta de trivia
❌ ReactionTimer               - Test de reacción
```

---

## RESUMEN DE FUNCIONALIDADES ADICIONALES

| Categoría | Funcionalidad | Prioridad |
|-----------|--------------|-----------|
| **Compartir** | QR Dinámico | 🔴 Crítico |
| **Compartir** | NFC Tap-to-Share | 🟠 Alto |
| **Compartir** | Deep Links | 🔴 Crítico |
| **Compartir** | Share Sheet Nativo | 🟠 Alto |
| **Jueces** | Configuración Dinámica | 🔴 Crítico |
| **Jueces** | Panel Mobile | 🔴 Crítico |
| **Jueces** | Votación con Biometría | 🟠 Alto |
| **Reputación** | Sistema de Score | 🟠 Alto |
| **Reputación** | Badges NFT | 🟡 Medio |
| **Reputación** | Leaderboards | 🟠 Alto |
| **Quick** | Templates Predefinidos | 🔴 Crítico |
| **Quick** | Flujo 3-Taps | 🔴 Crítico |
| **Quick** | Juegos Integrados | 🟠 Alto |
| **Depósitos** | Pre-autorización | 🟠 Alto |
| **Depósitos** | Hot Wallet | 🟡 Medio |
| **Depósitos** | Biometría | 🟠 Alto |
| **Cierre** | Auto-close Registration | 🔴 Crítico |
| **Cierre** | Auto-activate Voting | 🔴 Crítico |
| **Notificaciones** | Push Inteligente | 🟠 Alto |
| **Notificaciones** | Recordatorios | 🟠 Alto |
| **Historial** | Timeline | 🟡 Medio |
| **Historial** | Replays | 🟡 Medio |
| **Social** | Farcaster Frames | 🟡 Medio |
| **Social** | Twitter/X Share | 🟡 Medio |
| **Offline** | Cache y Sync | 🟡 Medio |

---

## TIEMPO ESTIMADO ADICIONAL

| Fase | Funcionalidades | Tiempo |
|------|-----------------|--------|
| Quick MVP | QR + Deep Links + Templates básicos | 2 semanas |
| Core UX | Jueces + Reputación + Notificaciones | 3 semanas |
| Games | Juegos integrados + Animaciones | 2 semanas |
| Social | Farcaster + Twitter + Sharing | 2 semanas |
| Polish | NFC + Offline + Optimizaciones | 2 semanas |

**Total adicional**: 11 semanas para visión completa

---

## CONCLUSIÓN

El sistema ideal de competencias es una **experiencia de 3 taps para crear, 1 tap para unirse, y settlement instantáneo**. Combina:

1. **Velocidad extrema** - Sub-30 segundos para competencias rápidas
2. **Mobile-first** - Diseñado para el bolsillo
3. **Tap-to-everything** - QR, NFC, Deep Links
4. **Gamificación** - Reputación, badges, leaderboards
5. **Confianza** - Sistema de jueces configurable
6. **Social** - Integración con Farcaster, Twitter

Esta visión transforma las competencias cripto de algo técnico y lento a algo **tan fácil como enviar un mensaje de WhatsApp**.

---

*"3 Taps. 1 Link. Instant Settlement. That's CryptoGift Competitions."*
