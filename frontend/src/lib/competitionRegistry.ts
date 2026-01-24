/**
 * COMPETITION REGISTRY - Sistema de Tracking Robusto
 *
 * Sistema empresarial para registrar, rastrear y auditar todas las competencias.
 * Mantiene un registro completo de:
 * - Códigos de competencia
 * - IDs únicos
 * - Hashes de transacciones
 * - Direcciones de participantes
 * - Direcciones de árbitros
 * - Timestamps de eventos
 * - Estados y transiciones
 */

// =============================================================================
// TIPOS DE DATOS
// =============================================================================

export type CompetitionStatus =
  | 'draft'           // Creada pero no activa
  | 'pending'         // Esperando participantes
  | 'active'          // En progreso
  | 'resolving'       // Esperando resolución
  | 'completed'       // Finalizada con ganador
  | 'cancelled'       // Cancelada
  | 'disputed';       // En disputa

export type EventType =
  | 'created'
  | 'participant_joined'
  | 'participant_left'
  | 'arbiter_assigned'
  | 'stake_deposited'
  | 'competition_started'
  | 'result_submitted'
  | 'result_disputed'
  | 'resolution_voted'
  | 'prize_distributed'
  | 'competition_completed'
  | 'competition_cancelled';

export interface CompetitionEvent {
  id: string;
  type: EventType;
  timestamp: string;
  actor: string;           // Dirección del actor
  data: Record<string, unknown>;
  txHash?: string;         // Hash de transacción si aplica
  blockNumber?: number;    // Número de bloque si aplica
}

export interface ParticipantRecord {
  address: string;
  joinedAt: string;
  stake?: string;
  stakeTxHash?: string;
  team?: string;
  status: 'active' | 'eliminated' | 'winner' | 'left';
}

export interface ArbiterRecord {
  address: string;
  assignedAt: string;
  votes?: Record<string, unknown>[];
  status: 'pending' | 'active' | 'voted';
}

export interface CompetitionRecord {
  // Identificación
  id: string;                    // ID único generado
  code: string;                  // Código legible (COMP-XXXXXX)
  title: string;                 // Título (auto-generado o custom)
  description?: string;

  // Metadata de creación
  createdAt: string;             // ISO timestamp
  createdBy: string;             // Dirección del creador
  creationTxHash?: string;       // Hash de transacción de creación

  // Configuración
  format: string;
  entryType: string;
  maxParticipants: number | 'unlimited';
  stakeType: string;
  stakeAmount: string;
  currency: string;
  distribution: string;
  resolution: string;
  timing: string;
  matchType: string;
  deadline?: string;
  forSharing: boolean;

  // Estado actual
  status: CompetitionStatus;
  statusUpdatedAt: string;

  // Participantes
  participants: ParticipantRecord[];
  participantCount: number;

  // Árbitros
  arbiters: ArbiterRecord[];

  // Fondos
  totalStaked: string;
  prizePool: string;
  escrowAddress?: string;        // Dirección del contrato escrow

  // Resultados
  winner?: string;
  results?: Record<string, unknown>;
  distributionTxHash?: string;

  // Historial de eventos
  events: CompetitionEvent[];

  // Links
  participantLink: string;
  arbiterLink?: string;
}

// =============================================================================
// GENERACIÓN DE IDs Y CÓDIGOS
// =============================================================================

/**
 * Genera un código único de competencia
 * Formato: COMP-XXXXXX donde X = base36 (0-9, A-Z)
 */
export function generateCompetitionCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `COMP-${timestamp.slice(-4)}${random}`;
}

/**
 * Genera un ID único basado en el código y timestamp
 * Formato: comp_XXXXXXXXXXXXXXXX (16 caracteres alfanuméricos)
 */
export function generateCompetitionId(code: string): string {
  const timestamp = Date.now();
  const idBase = `${code}_${timestamp}`;
  // Usar btoa para generar un string base64, luego limpiar caracteres especiales
  const encoded = typeof window !== 'undefined'
    ? btoa(idBase)
    : Buffer.from(idBase).toString('base64');
  return `comp_${encoded.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
}

/**
 * Genera un ID único para eventos
 */
export function generateEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// =============================================================================
// FORMATEO DE DATOS
// =============================================================================

/**
 * Formatea fecha/hora para título auto-generado
 */
export function formatDateTimeForTitle(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', ' -');
}

/**
 * Genera título automático si no se proporciona uno
 */
export function generateAutoTitle(code: string, format: string): string {
  const formatLabels: Record<string, string> = {
    'adaptive': 'Competencia',
    '1v1': 'Duelo',
    'teams': 'Equipos',
    'freeForAll': 'Battle Royale',
    'bracket': 'Torneo',
    'league': 'Liga',
    'pool': 'Pool',
  };

  const formattedDate = formatDateTimeForTitle(new Date());
  return `${formatLabels[format] || format} ${code} - ${formattedDate}`;
}

/**
 * Abrevia una dirección de wallet
 */
export function abbreviateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Abrevia un hash de transacción
 */
export function abbreviateTxHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

// =============================================================================
// CREACIÓN DE REGISTROS
// =============================================================================

interface CreateCompetitionParams {
  title?: string;
  description?: string;
  format: string;
  entryType: string;
  maxParticipants: number | 'unlimited';
  stakeType: string;
  stakeAmount: string;
  currency: string;
  distribution: string;
  resolution: string;
  timing: string;
  matchType: string;
  deadline?: Date;
  forSharing: boolean;
  creatorAddress: string;
  txHash?: string;
}

/**
 * Crea un nuevo registro de competencia con todos los datos de tracking
 */
export function createCompetitionRecord(params: CreateCompetitionParams): CompetitionRecord {
  const code = generateCompetitionCode();
  const id = generateCompetitionId(code);
  const now = new Date();
  const createdAt = now.toISOString();

  // Generar título
  const title = params.title?.trim() || generateAutoTitle(code, params.format);

  // Generar links
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://cryptogift-wallets.vercel.app';

  const participantLink = `${baseUrl}/competencia/${id}/join`;
  // En modo voting/adaptive cualquiera puede ser juez, también necesita link
  const arbiterLink = ['singleArbiter', 'panel', 'voting'].includes(params.resolution)
    ? `${baseUrl}/competencia/${id}/arbiter`
    : undefined;

  // Crear evento inicial
  const creationEvent: CompetitionEvent = {
    id: generateEventId(),
    type: 'created',
    timestamp: createdAt,
    actor: params.creatorAddress,
    data: {
      code,
      title,
      format: params.format,
      stakeAmount: params.stakeAmount,
      currency: params.currency,
      forSharing: params.forSharing,
    },
    txHash: params.txHash,
  };

  const record: CompetitionRecord = {
    // Identificación
    id,
    code,
    title,
    description: params.description,

    // Metadata de creación
    createdAt,
    createdBy: params.creatorAddress,
    creationTxHash: params.txHash,

    // Configuración
    format: params.format,
    entryType: params.entryType,
    maxParticipants: params.maxParticipants,
    stakeType: params.stakeType,
    stakeAmount: params.stakeAmount,
    currency: params.currency,
    distribution: params.distribution,
    resolution: params.resolution,
    timing: params.timing,
    matchType: params.matchType,
    deadline: params.deadline?.toISOString(),
    forSharing: params.forSharing,

    // Estado actual
    status: 'pending',
    statusUpdatedAt: createdAt,

    // Participantes
    participants: [],
    participantCount: 0,

    // Árbitros
    arbiters: [],

    // Fondos
    totalStaked: '0',
    prizePool: '0',

    // Historial de eventos
    events: [creationEvent],

    // Links
    participantLink,
    arbiterLink,
  };

  return record;
}

// =============================================================================
// FUNCIONES DE ACTUALIZACIÓN
// =============================================================================

/**
 * Añade un participante al registro
 */
export function addParticipant(
  record: CompetitionRecord,
  address: string,
  stake?: string,
  stakeTxHash?: string,
  team?: string
): CompetitionRecord {
  const now = new Date().toISOString();

  const participant: ParticipantRecord = {
    address,
    joinedAt: now,
    stake,
    stakeTxHash,
    team,
    status: 'active',
  };

  const event: CompetitionEvent = {
    id: generateEventId(),
    type: 'participant_joined',
    timestamp: now,
    actor: address,
    data: { stake, team },
    txHash: stakeTxHash,
  };

  // Si hay stake, añadir evento de depósito
  const events = [event];
  if (stake && stakeTxHash) {
    events.push({
      id: generateEventId(),
      type: 'stake_deposited',
      timestamp: now,
      actor: address,
      data: { amount: stake, currency: record.currency },
      txHash: stakeTxHash,
    });
  }

  // Calcular nuevo total staked
  const newTotalStaked = stake
    ? (parseFloat(record.totalStaked) + parseFloat(stake)).toString()
    : record.totalStaked;

  return {
    ...record,
    participants: [...record.participants, participant],
    participantCount: record.participantCount + 1,
    totalStaked: newTotalStaked,
    prizePool: newTotalStaked, // Por ahora igual al total staked
    events: [...record.events, ...events],
  };
}

/**
 * Añade un árbitro al registro
 */
export function addArbiter(
  record: CompetitionRecord,
  address: string
): CompetitionRecord {
  const now = new Date().toISOString();

  const arbiter: ArbiterRecord = {
    address,
    assignedAt: now,
    status: 'pending',
  };

  const event: CompetitionEvent = {
    id: generateEventId(),
    type: 'arbiter_assigned',
    timestamp: now,
    actor: address,
    data: {},
  };

  return {
    ...record,
    arbiters: [...record.arbiters, arbiter],
    events: [...record.events, event],
  };
}

/**
 * Actualiza el estado de la competencia
 */
export function updateStatus(
  record: CompetitionRecord,
  status: CompetitionStatus,
  actor: string,
  eventType: EventType,
  data?: Record<string, unknown>,
  txHash?: string
): CompetitionRecord {
  const now = new Date().toISOString();

  const event: CompetitionEvent = {
    id: generateEventId(),
    type: eventType,
    timestamp: now,
    actor,
    data: data || {},
    txHash,
  };

  return {
    ...record,
    status,
    statusUpdatedAt: now,
    events: [...record.events, event],
  };
}

/**
 * Registra la distribución de premios
 */
export function recordDistribution(
  record: CompetitionRecord,
  winner: string,
  results: Record<string, unknown>,
  distributionTxHash: string,
  actor: string
): CompetitionRecord {
  const now = new Date().toISOString();

  // Actualizar estado del ganador en participantes
  const updatedParticipants = record.participants.map(p => ({
    ...p,
    status: p.address === winner ? 'winner' as const : p.status,
  }));

  const event: CompetitionEvent = {
    id: generateEventId(),
    type: 'prize_distributed',
    timestamp: now,
    actor,
    data: { winner, results, prizePool: record.prizePool },
    txHash: distributionTxHash,
  };

  const completionEvent: CompetitionEvent = {
    id: generateEventId(),
    type: 'competition_completed',
    timestamp: now,
    actor,
    data: { winner },
    txHash: distributionTxHash,
  };

  return {
    ...record,
    status: 'completed',
    statusUpdatedAt: now,
    winner,
    results,
    distributionTxHash,
    participants: updatedParticipants,
    events: [...record.events, event, completionEvent],
  };
}

// =============================================================================
// LOGGING Y DEBUGGING
// =============================================================================

/**
 * Genera un resumen legible del registro para logging
 */
export function logCompetitionRecord(record: CompetitionRecord): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🏆 COMPETITION REGISTRY - TRACKING INFO');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📋 Code: ${record.code}`);
  console.log(`🆔 ID: ${record.id}`);
  console.log(`📝 Title: ${record.title}`);
  console.log(`⏰ Created: ${record.createdAt}`);
  console.log(`👤 Creator: ${abbreviateAddress(record.createdBy)}`);
  if (record.creationTxHash) {
    console.log(`🔗 Tx: ${abbreviateTxHash(record.creationTxHash)}`);
  }
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`🎯 Format: ${record.format}`);
  console.log(`💰 Stake: ${record.stakeAmount} ${record.currency}`);
  console.log(`👥 Participants: ${record.participantCount}/${record.maxParticipants}`);
  console.log(`📊 Status: ${record.status}`);
  console.log(`🔗 Sharing: ${record.forSharing ? 'Yes' : 'No'}`);
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`🔗 Participant Link: ${record.participantLink}`);
  if (record.arbiterLink) {
    console.log(`⚖️ Arbiter Link: ${record.arbiterLink}`);
  }
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`📜 Events: ${record.events.length}`);
  record.events.forEach((event, i) => {
    console.log(`   ${i + 1}. [${event.type}] ${event.timestamp} by ${abbreviateAddress(event.actor)}`);
  });
  console.log('═══════════════════════════════════════════════════════════════');
}

/**
 * Exporta el registro completo como JSON para debugging/auditoría
 */
export function exportCompetitionRecord(record: CompetitionRecord): string {
  return JSON.stringify(record, null, 2);
}

// =============================================================================
// VALIDACIÓN
// =============================================================================

/**
 * Valida que un registro tenga todos los campos requeridos
 */
export function validateCompetitionRecord(record: Partial<CompetitionRecord>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!record.id) errors.push('Missing id');
  if (!record.code) errors.push('Missing code');
  if (!record.title) errors.push('Missing title');
  if (!record.createdAt) errors.push('Missing createdAt');
  if (!record.createdBy) errors.push('Missing createdBy');
  if (!record.format) errors.push('Missing format');
  if (!record.status) errors.push('Missing status');
  if (!record.participantLink) errors.push('Missing participantLink');

  return {
    valid: errors.length === 0,
    errors,
  };
}
