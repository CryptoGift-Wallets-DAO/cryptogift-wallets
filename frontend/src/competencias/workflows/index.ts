/**
 * COMPETITION WORKFLOWS
 * Complete workflow definitions for all 6 competition categories
 *
 * Each workflow is designed for:
 * 1. AI understanding and execution
 * 2. Minimal user steps through smart defaults
 * 3. Clear validation and error handling
 * 4. Real-time tracking and transparency
 */

import type { Workflow, WorkflowStep } from '../types';
import { registerWorkflow } from '../lib/workflowEngine';

// ============================================================================
// 1. PREDICTION WORKFLOW (Binary Yes/No Markets)
// ============================================================================

export const predictionWorkflow: Workflow = {
  id: 'workflow_prediction',
  name: 'Crear Predicción',
  description: 'Crea un mercado de predicción con opciones SI/NO',
  category: 'prediction',

  steps: [
    {
      id: 'pred_question',
      type: 'input',
      name: 'Pregunta de Predicción',
      description: 'Define la pregunta que los participantes van a predecir',
      aiDescription: 'El usuario define una pregunta de sí/no para que otros predigan el resultado',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      validation: [
        { type: 'required', message: 'La pregunta es obligatoria' },
        { type: 'min', value: 10, message: 'Mínimo 10 caracteres' },
        { type: 'max', value: 200, message: 'Máximo 200 caracteres' }
      ],
      component: 'TextInput',
      props: {
        label: '¿Qué quieres predecir?',
        placeholder: '¿Bitcoin superará los $100,000 antes del 31 de diciembre?',
        hint: 'Redacta una pregunta clara que pueda responderse con SÍ o NO'
      }
    },
    {
      id: 'pred_description',
      type: 'input',
      name: 'Descripción y Contexto',
      description: 'Añade contexto y reglas para la predicción',
      aiDescription: 'Información adicional sobre cómo se resolverá la predicción',
      aiCanExecute: false,
      aiPrefillable: true,
      required: false,
      component: 'TextArea',
      props: {
        label: 'Descripción (opcional)',
        placeholder: 'Añade detalles sobre cómo se determinará el resultado...',
        rows: 4
      }
    },
    {
      id: 'pred_end_date',
      type: 'input',
      name: 'Fecha de Cierre',
      description: 'Cuándo se dejarán de aceptar apuestas',
      aiDescription: 'Fecha límite para participar en la predicción',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      validation: [
        { type: 'required', message: 'La fecha de cierre es obligatoria' },
        { type: 'custom', message: 'Debe ser una fecha futura' }
      ],
      component: 'DateTimePicker',
      props: {
        label: '¿Cuándo cierra la predicción?',
        minDate: 'now',
        defaultOffset: 7 // días
      }
    },
    {
      id: 'pred_resolution_date',
      type: 'input',
      name: 'Fecha de Resolución',
      description: 'Cuándo se conocerá el resultado',
      aiDescription: 'Fecha en la que se determinará si fue SÍ o NO',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      validation: [
        { type: 'required', message: 'La fecha de resolución es obligatoria' }
      ],
      component: 'DateTimePicker',
      props: {
        label: '¿Cuándo se sabrá el resultado?',
        minDate: 'now'
      },
      dependsOn: ['pred_end_date']
    },
    {
      id: 'pred_initial_prob',
      type: 'selection',
      name: 'Probabilidad Inicial',
      description: 'Estima la probabilidad inicial de que sea SÍ',
      aiDescription: 'Probabilidad inicial que establece el mercado CPMM',
      aiCanExecute: true,
      aiPrefillable: true,
      required: true,
      component: 'ProbabilitySlider',
      props: {
        label: '¿Qué tan probable crees que es?',
        defaultValue: 50,
        min: 1,
        max: 99,
        step: 1,
        hint: 'Esta será la probabilidad inicial del mercado'
      }
    },
    {
      id: 'pred_entry_fee',
      type: 'input',
      name: 'Apuesta Mínima',
      description: 'Cantidad mínima para participar',
      aiDescription: 'Cantidad mínima de tokens para entrar a la predicción',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      validation: [
        { type: 'required', message: 'La apuesta mínima es obligatoria' },
        { type: 'min', value: 0.001, message: 'Mínimo 0.001 ETH' }
      ],
      component: 'TokenAmountInput',
      props: {
        label: 'Apuesta mínima',
        defaultValue: '0.01',
        currency: 'ETH',
        hint: 'Cantidad mínima que cada participante debe apostar'
      }
    },
    {
      id: 'pred_resolution_method',
      type: 'selection',
      name: 'Método de Resolución',
      description: 'Quién determina el resultado',
      aiDescription: 'Selección del sistema que decidirá el outcome final',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'ResolutionMethodSelector',
      props: {
        label: '¿Quién determinará el resultado?',
        options: [
          { value: 'single_arbiter', label: 'Un árbitro de confianza', description: 'Una persona decide el resultado' },
          { value: 'multisig_panel', label: 'Panel de jueces', description: 'Varios jueces votan el resultado' },
          { value: 'oracle', label: 'Oráculo automático', description: 'Un feed de datos externo determina el resultado' },
          { value: 'community_vote', label: 'Voto comunitario', description: 'Los participantes votan el resultado' }
        ]
      }
    },
    {
      id: 'pred_judges',
      type: 'input',
      name: 'Configurar Jueces',
      description: 'Añade los árbitros o jueces',
      aiDescription: 'Direcciones de wallet de los jueces que resolverán la predicción',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'JudgeConfiguration',
      props: {
        label: 'Añadir jueces',
        minJudges: 1,
        maxJudges: 21
      },
      condition: {
        type: 'value',
        field: 'pred_resolution_method',
        operator: '!=',
        value: 'oracle'
      }
    },
    {
      id: 'pred_liquidity',
      type: 'input',
      name: 'Liquidez Inicial',
      description: 'Fondos para el mercado CPMM',
      aiDescription: 'Liquidez que el creador aporta para que el mercado funcione',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      validation: [
        { type: 'required', message: 'La liquidez inicial es obligatoria' },
        { type: 'min', value: 0.01, message: 'Mínimo 0.01 ETH de liquidez' }
      ],
      component: 'TokenAmountInput',
      props: {
        label: 'Liquidez inicial del mercado',
        defaultValue: '0.1',
        currency: 'ETH',
        hint: 'Esta liquidez será devuelta al final (menos fees del mercado)'
      }
    },
    {
      id: 'pred_confirm',
      type: 'confirmation',
      name: 'Confirmar Predicción',
      description: 'Revisa y confirma la creación',
      aiDescription: 'Paso final de confirmación antes de crear el mercado',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'ConfirmationSummary',
      props: {
        title: 'Confirmar creación de predicción',
        showEstimatedGas: true
      }
    },
    {
      id: 'pred_create_safe',
      type: 'transaction',
      name: 'Crear Safe',
      description: 'Desplegando Gnosis Safe para los fondos',
      aiDescription: 'Transacción para crear el Safe que custodiará los fondos',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Creando Safe...',
        description: 'Desplegando contrato de custodia'
      }
    },
    {
      id: 'pred_create_market',
      type: 'transaction',
      name: 'Crear Mercado',
      description: 'Creando mercado en Manifold',
      aiDescription: 'Llamada API para crear el mercado de predicción en Manifold',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Creando mercado...',
        description: 'Conectando con Manifold Markets'
      },
      dependsOn: ['pred_create_safe']
    },
    {
      id: 'pred_deposit',
      type: 'transaction',
      name: 'Depositar Liquidez',
      description: 'Enviando liquidez inicial al Safe',
      aiDescription: 'Transacción para depositar la liquidez inicial',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Depositando liquidez...',
        description: 'Enviando fondos al Safe'
      },
      dependsOn: ['pred_create_market']
    }
  ],

  currentStep: 0,
  completedSteps: [],
  data: {},

  aiSummary: 'Workflow para crear mercados de predicción binarios (SÍ/NO) con probabilidades CPMM de Manifold y custodia en Gnosis Safe',
  aiKeywords: ['predicción', 'apuesta', 'sí', 'no', 'binario', 'probabilidad', 'mercado'],
  aiExamples: [
    '¿Bitcoin llegará a $100k este año?',
    '¿España ganará el mundial?',
    '¿Lloverá mañana en Madrid?'
  ],
  estimatedTotalSeconds: 300
};

// ============================================================================
// 2. TOURNAMENT WORKFLOW (Brackets/Eliminatorias)
// ============================================================================

export const tournamentWorkflow: Workflow = {
  id: 'workflow_tournament',
  name: 'Crear Torneo',
  description: 'Crea un torneo con brackets eliminatorios',
  category: 'tournament',

  steps: [
    {
      id: 'tour_name',
      type: 'input',
      name: 'Nombre del Torneo',
      description: 'Define el nombre y tema del torneo',
      aiDescription: 'Nombre identificativo del torneo',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      validation: [
        { type: 'required', message: 'El nombre es obligatorio' },
        { type: 'min', value: 5, message: 'Mínimo 5 caracteres' }
      ],
      component: 'TextInput',
      props: {
        label: 'Nombre del torneo',
        placeholder: 'Torneo FIFA 2025 - Copa de Campeones'
      }
    },
    {
      id: 'tour_format',
      type: 'selection',
      name: 'Formato del Torneo',
      description: 'Tipo de bracket y eliminación',
      aiDescription: 'Estructura del torneo (single/double elimination, round robin)',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TournamentFormatSelector',
      props: {
        label: 'Formato',
        options: [
          { value: 'single_elimination', label: 'Eliminación Simple', description: 'Pierdes y quedas fuera' },
          { value: 'double_elimination', label: 'Doble Eliminación', description: 'Segunda oportunidad' },
          { value: 'round_robin', label: 'Todos contra Todos', description: 'Cada uno juega con cada uno' },
          { value: 'swiss', label: 'Sistema Suizo', description: 'Rondas con emparejamiento dinámico' }
        ]
      }
    },
    {
      id: 'tour_participants',
      type: 'input',
      name: 'Número de Participantes',
      description: 'Cuántos participantes tendrá el torneo',
      aiDescription: 'Cantidad de jugadores/equipos en el torneo',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      validation: [
        { type: 'required', message: 'El número de participantes es obligatorio' },
        { type: 'min', value: 2, message: 'Mínimo 2 participantes' },
        { type: 'max', value: 256, message: 'Máximo 256 participantes' }
      ],
      component: 'NumberInput',
      props: {
        label: 'Participantes',
        defaultValue: 8,
        suggestions: [4, 8, 16, 32, 64]
      }
    },
    {
      id: 'tour_entry_fee',
      type: 'input',
      name: 'Cuota de Entrada',
      description: 'Cuánto paga cada participante',
      aiDescription: 'Fee de entrada que forma el prize pool',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TokenAmountInput',
      props: {
        label: 'Cuota de entrada',
        defaultValue: '0.05',
        currency: 'ETH'
      }
    },
    {
      id: 'tour_prize_distribution',
      type: 'selection',
      name: 'Distribución de Premios',
      description: 'Cómo se reparte el prize pool',
      aiDescription: 'Porcentajes de distribución entre ganadores',
      aiCanExecute: true,
      aiPrefillable: true,
      required: true,
      component: 'PrizeDistributionSelector',
      props: {
        label: 'Distribución',
        presets: [
          { name: 'Winner Takes All', distribution: [100] },
          { name: 'Top 3', distribution: [60, 30, 10] },
          { name: 'Top 4', distribution: [50, 25, 15, 10] },
          { name: 'Top 8', distribution: [35, 20, 15, 10, 5, 5, 5, 5] }
        ],
        allowCustom: true
      }
    },
    {
      id: 'tour_registration_end',
      type: 'input',
      name: 'Cierre de Inscripciones',
      description: 'Hasta cuándo se pueden inscribir',
      aiDescription: 'Fecha límite para inscribirse al torneo',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'DateTimePicker',
      props: {
        label: 'Inscripciones hasta',
        minDate: 'now'
      }
    },
    {
      id: 'tour_start_date',
      type: 'input',
      name: 'Inicio del Torneo',
      description: 'Cuándo comienza el torneo',
      aiDescription: 'Fecha y hora de inicio de la primera ronda',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'DateTimePicker',
      props: {
        label: 'El torneo comienza',
        minDate: 'now'
      },
      dependsOn: ['tour_registration_end']
    },
    {
      id: 'tour_match_rules',
      type: 'input',
      name: 'Reglas de Partidas',
      description: 'Cómo se determinan los ganadores de cada partida',
      aiDescription: 'Reglas específicas para determinar ganadores de cada encuentro',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'MatchRulesEditor',
      props: {
        label: 'Reglas de partidas',
        templates: ['bestOf1', 'bestOf3', 'bestOf5', 'points', 'custom']
      }
    },
    {
      id: 'tour_judges',
      type: 'input',
      name: 'Jueces del Torneo',
      description: 'Quién validará los resultados de cada partida',
      aiDescription: 'Árbitros que confirmarán resultados de partidas',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'JudgeConfiguration',
      props: {
        label: 'Jueces',
        minJudges: 1,
        perMatchJudges: 1
      }
    },
    {
      id: 'tour_confirm',
      type: 'confirmation',
      name: 'Confirmar Torneo',
      description: 'Revisa y confirma la creación',
      aiDescription: 'Confirmación final antes de crear el torneo',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'TournamentConfirmation',
      props: {
        showBracketPreview: true
      }
    },
    {
      id: 'tour_deploy',
      type: 'transaction',
      name: 'Desplegar Torneo',
      description: 'Creando Safe y configuración on-chain',
      aiDescription: 'Transacciones para crear el torneo en blockchain',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Desplegando torneo...',
        steps: ['Crear Safe', 'Configurar Guards', 'Registrar Torneo']
      }
    }
  ],

  currentStep: 0,
  completedSteps: [],
  data: {},

  aiSummary: 'Workflow para crear torneos con brackets eliminatorios, cuotas de entrada y distribución de premios automática',
  aiKeywords: ['torneo', 'bracket', 'eliminatoria', 'competencia', 'partida', 'final'],
  aiExamples: [
    'Torneo de FIFA entre amigos',
    'Competencia de ajedrez del barrio',
    'Liga de poker mensual'
  ],
  estimatedTotalSeconds: 420
};

// ============================================================================
// 3. CHALLENGE WORKFLOW (1v1 or Team Challenges)
// ============================================================================

export const challengeWorkflow: Workflow = {
  id: 'workflow_challenge',
  name: 'Crear Desafío',
  description: 'Crea un desafío 1v1 o entre equipos',
  category: 'challenge',

  steps: [
    {
      id: 'chal_title',
      type: 'input',
      name: 'Título del Desafío',
      description: 'Define el desafío',
      aiDescription: 'Nombre o descripción corta del desafío',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      validation: [
        { type: 'required', message: 'El título es obligatorio' }
      ],
      component: 'TextInput',
      props: {
        label: '¿Cuál es el desafío?',
        placeholder: 'Te reto a una partida de ajedrez'
      }
    },
    {
      id: 'chal_type',
      type: 'selection',
      name: 'Tipo de Desafío',
      description: '1v1 o equipos',
      aiDescription: 'Si es individual o por equipos',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'ChallengeTypeSelector',
      props: {
        label: 'Tipo',
        options: [
          { value: '1v1', label: '1 vs 1', description: 'Duelo individual' },
          { value: 'team', label: 'Equipos', description: 'Equipos compiten entre sí' }
        ]
      }
    },
    {
      id: 'chal_opponent',
      type: 'input',
      name: 'Oponente',
      description: 'A quién desafías',
      aiDescription: 'Wallet o username del oponente',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'OpponentSelector',
      props: {
        label: '¿A quién desafías?',
        allowOpen: true,
        placeholder: 'Dirección de wallet o dejar abierto'
      }
    },
    {
      id: 'chal_stake',
      type: 'input',
      name: 'Apuesta',
      description: 'Cuánto apuesta cada lado',
      aiDescription: 'Cantidad que cada participante pone en juego',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TokenAmountInput',
      props: {
        label: 'Apuesta por cada lado',
        defaultValue: '0.1',
        currency: 'ETH'
      }
    },
    {
      id: 'chal_rules',
      type: 'input',
      name: 'Reglas del Desafío',
      description: 'Cómo se determina el ganador',
      aiDescription: 'Condiciones específicas para ganar el desafío',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'RulesEditor',
      props: {
        label: 'Reglas',
        templates: [
          'El que gane la partida',
          'El que tenga más puntos',
          'El primero en completar X',
          'Personalizado'
        ]
      }
    },
    {
      id: 'chal_deadline',
      type: 'input',
      name: 'Fecha Límite',
      description: 'Cuándo debe completarse el desafío',
      aiDescription: 'Deadline para completar el desafío',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'DateTimePicker',
      props: {
        label: 'Fecha límite',
        minDate: 'now'
      }
    },
    {
      id: 'chal_judge',
      type: 'input',
      name: 'Árbitro',
      description: 'Quién decide el ganador si hay disputa',
      aiDescription: 'Árbitro de confianza para resolver el desafío',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'JudgeConfiguration',
      props: {
        label: 'Árbitro',
        minJudges: 1,
        maxJudges: 3
      }
    },
    {
      id: 'chal_confirm',
      type: 'confirmation',
      name: 'Confirmar Desafío',
      description: 'Revisa y lanza el desafío',
      aiDescription: 'Confirmación final antes de crear el desafío',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'ChallengeConfirmation',
      props: {
        showOpponentNotification: true
      }
    },
    {
      id: 'chal_create',
      type: 'transaction',
      name: 'Crear Desafío',
      description: 'Desplegando contrato del desafío',
      aiDescription: 'Transacción para crear el desafío on-chain',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Creando desafío...'
      }
    },
    {
      id: 'chal_deposit',
      type: 'transaction',
      name: 'Depositar Apuesta',
      description: 'Enviando tu apuesta al escrow',
      aiDescription: 'Depósito de la apuesta del retador',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Depositando apuesta...'
      },
      dependsOn: ['chal_create']
    }
  ],

  currentStep: 0,
  completedSteps: [],
  data: {},

  aiSummary: 'Workflow para crear desafíos directos 1v1 o entre equipos con apuestas y árbitro',
  aiKeywords: ['desafío', 'reto', '1v1', 'duelo', 'versus', 'vs'],
  aiExamples: [
    'Te reto a una carrera de 100m',
    'Apuesto a que te gano al FIFA',
    'Duelo de trivia sobre historia'
  ],
  estimatedTotalSeconds: 240
};

// ============================================================================
// 4. POOL WORKFLOW (Contribution Pools)
// ============================================================================

export const poolWorkflow: Workflow = {
  id: 'workflow_pool',
  name: 'Crear Pool',
  description: 'Crea un pool de contribuciones con condiciones',
  category: 'pool',

  steps: [
    {
      id: 'pool_name',
      type: 'input',
      name: 'Nombre del Pool',
      description: 'Identifica el pool',
      aiDescription: 'Nombre descriptivo del pool de fondos',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TextInput',
      props: {
        label: 'Nombre del pool',
        placeholder: 'Pool para el viaje de fin de año'
      }
    },
    {
      id: 'pool_goal',
      type: 'input',
      name: 'Objetivo del Pool',
      description: 'Para qué se usarán los fondos',
      aiDescription: 'Propósito o destino de los fondos recaudados',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TextArea',
      props: {
        label: 'Objetivo',
        placeholder: 'Describe el propósito del pool...'
      }
    },
    {
      id: 'pool_target',
      type: 'input',
      name: 'Meta de Recaudación',
      description: 'Cuánto quieres recaudar',
      aiDescription: 'Cantidad objetivo a recaudar',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TokenAmountInput',
      props: {
        label: 'Meta',
        defaultValue: '1',
        currency: 'ETH'
      }
    },
    {
      id: 'pool_min_contribution',
      type: 'input',
      name: 'Contribución Mínima',
      description: 'Mínimo para participar',
      aiDescription: 'Cantidad mínima que cada persona debe aportar',
      aiCanExecute: true,
      aiPrefillable: true,
      required: true,
      component: 'TokenAmountInput',
      props: {
        label: 'Contribución mínima',
        defaultValue: '0.01',
        currency: 'ETH'
      }
    },
    {
      id: 'pool_deadline',
      type: 'input',
      name: 'Fecha Límite',
      description: 'Hasta cuándo se aceptan contribuciones',
      aiDescription: 'Deadline para contribuir al pool',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'DateTimePicker',
      props: {
        label: 'Fecha límite',
        minDate: 'now'
      }
    },
    {
      id: 'pool_condition',
      type: 'selection',
      name: 'Condición de Liberación',
      description: 'Cuándo se liberan los fondos',
      aiDescription: 'Condiciones que deben cumplirse para liberar los fondos',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'ConditionSelector',
      props: {
        label: 'Los fondos se liberan cuando...',
        options: [
          { value: 'goal_reached', label: 'Se alcanza la meta', description: 'Todo o nada' },
          { value: 'deadline', label: 'Llega la fecha límite', description: 'Se libera lo recaudado' },
          { value: 'vote', label: 'Los participantes votan', description: 'Decisión colectiva' },
          { value: 'arbiter', label: 'El árbitro decide', description: 'Un tercero autoriza' }
        ]
      }
    },
    {
      id: 'pool_beneficiary',
      type: 'input',
      name: 'Beneficiario',
      description: 'Quién recibe los fondos',
      aiDescription: 'Wallet que recibirá los fondos cuando se liberen',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'AddressInput',
      props: {
        label: 'Wallet beneficiario',
        allowENS: true
      }
    },
    {
      id: 'pool_refund_policy',
      type: 'selection',
      name: 'Política de Reembolso',
      description: 'Qué pasa si no se alcanza la meta',
      aiDescription: 'Reglas de reembolso si el pool no cumple condiciones',
      aiCanExecute: true,
      aiPrefillable: true,
      required: true,
      component: 'RefundPolicySelector',
      props: {
        label: 'Si no se alcanza la meta...',
        options: [
          { value: 'full_refund', label: 'Reembolso completo', description: 'Se devuelve todo' },
          { value: 'partial_release', label: 'Liberación parcial', description: 'Se entrega lo recaudado' },
          { value: 'vote_decision', label: 'Votan los contribuyentes', description: 'Decisión colectiva' }
        ]
      }
    },
    {
      id: 'pool_confirm',
      type: 'confirmation',
      name: 'Confirmar Pool',
      description: 'Revisa y crea el pool',
      aiDescription: 'Confirmación final antes de crear el pool',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'PoolConfirmation',
      props: {}
    },
    {
      id: 'pool_create',
      type: 'transaction',
      name: 'Crear Pool',
      description: 'Desplegando Safe del pool',
      aiDescription: 'Transacción para crear el pool on-chain',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Creando pool...'
      }
    }
  ],

  currentStep: 0,
  completedSteps: [],
  data: {},

  aiSummary: 'Workflow para crear pools de contribución colectiva con metas y condiciones de liberación',
  aiKeywords: ['pool', 'colecta', 'crowdfunding', 'contribución', 'recaudación'],
  aiExamples: [
    'Pool para el regalo de cumpleaños de Juan',
    'Recaudación para el viaje del equipo',
    'Fondo común para la fiesta de fin de año'
  ],
  estimatedTotalSeconds: 300
};

// ============================================================================
// 5. MILESTONE WORKFLOW (Goal-based achievements)
// ============================================================================

export const milestoneWorkflow: Workflow = {
  id: 'workflow_milestone',
  name: 'Crear Milestone',
  description: 'Crea un desafío basado en lograr un objetivo',
  category: 'milestone',

  steps: [
    {
      id: 'mile_title',
      type: 'input',
      name: 'Nombre del Milestone',
      description: 'Define el objetivo a lograr',
      aiDescription: 'Nombre del logro o meta a alcanzar',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TextInput',
      props: {
        label: '¿Qué objetivo quieres lograr?',
        placeholder: 'Correr un maratón en menos de 4 horas'
      }
    },
    {
      id: 'mile_description',
      type: 'input',
      name: 'Descripción del Objetivo',
      description: 'Detalla exactamente qué hay que lograr',
      aiDescription: 'Descripción detallada de las condiciones de éxito',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TextArea',
      props: {
        label: 'Descripción',
        placeholder: 'Describe las condiciones exactas para considerar el objetivo cumplido...'
      }
    },
    {
      id: 'mile_metric',
      type: 'selection',
      name: 'Tipo de Métrica',
      description: 'Cómo se mide el progreso',
      aiDescription: 'Tipo de medición para el objetivo',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'MetricTypeSelector',
      props: {
        label: 'Tipo de métrica',
        options: [
          { value: 'boolean', label: 'Sí/No', description: 'Lo logras o no' },
          { value: 'numeric', label: 'Numérico', description: 'Un valor específico' },
          { value: 'percentage', label: 'Porcentaje', description: 'Un % de completitud' },
          { value: 'time', label: 'Tiempo', description: 'Hacerlo en X tiempo' }
        ]
      }
    },
    {
      id: 'mile_target_value',
      type: 'input',
      name: 'Valor Objetivo',
      description: 'El número o valor a alcanzar',
      aiDescription: 'Valor numérico que define el éxito',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'MetricValueInput',
      props: {
        label: 'Valor objetivo'
      },
      condition: {
        type: 'value',
        field: 'mile_metric',
        operator: '!=',
        value: 'boolean'
      }
    },
    {
      id: 'mile_stake',
      type: 'input',
      name: 'Apuesta Personal',
      description: 'Cuánto apuestas a que lo logras',
      aiDescription: 'Cantidad que el usuario pone en juego',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TokenAmountInput',
      props: {
        label: 'Tu apuesta',
        defaultValue: '0.1',
        currency: 'ETH',
        hint: 'Pierdes esto si no cumples el objetivo'
      }
    },
    {
      id: 'mile_deadline',
      type: 'input',
      name: 'Fecha Límite',
      description: 'Cuándo debes lograrlo',
      aiDescription: 'Deadline para completar el milestone',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'DateTimePicker',
      props: {
        label: 'Fecha límite',
        minDate: 'now'
      }
    },
    {
      id: 'mile_verifier',
      type: 'selection',
      name: 'Método de Verificación',
      description: 'Cómo se comprueba que lo lograste',
      aiDescription: 'Sistema para verificar el cumplimiento del objetivo',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'VerificationMethodSelector',
      props: {
        label: '¿Cómo se verifica?',
        options: [
          { value: 'arbiter', label: 'Árbitro de confianza', description: 'Una persona verifica' },
          { value: 'proof', label: 'Prueba fotográfica/video', description: 'Subes evidencia' },
          { value: 'oracle', label: 'Datos automáticos', description: 'API externa verifica' },
          { value: 'witnesses', label: 'Testigos', description: 'Varias personas confirman' }
        ]
      }
    },
    {
      id: 'mile_arbiter',
      type: 'input',
      name: 'Verificador',
      description: 'Quién confirma el logro',
      aiDescription: 'Persona o sistema que validará el cumplimiento',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'JudgeConfiguration',
      props: {
        label: 'Verificador',
        minJudges: 1
      }
    },
    {
      id: 'mile_failure_recipient',
      type: 'input',
      name: 'Si Fallas...',
      description: 'Quién recibe tu apuesta si no lo logras',
      aiDescription: 'Beneficiario si el usuario no cumple el objetivo',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'FailureRecipientSelector',
      props: {
        label: 'Si no lo logras, tu apuesta va a...',
        options: [
          { value: 'charity', label: 'Caridad', description: 'Donación automática' },
          { value: 'arbiter', label: 'Al verificador', description: 'Incentivo para verificar' },
          { value: 'burn', label: 'Se quema', description: 'Se destruye' },
          { value: 'custom', label: 'Wallet específico', description: 'Elige el destinatario' }
        ]
      }
    },
    {
      id: 'mile_confirm',
      type: 'confirmation',
      name: 'Confirmar Milestone',
      description: 'Revisa y activa el desafío',
      aiDescription: 'Confirmación final antes de crear el milestone',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'MilestoneConfirmation',
      props: {}
    },
    {
      id: 'mile_create',
      type: 'transaction',
      name: 'Crear Milestone',
      description: 'Activando tu compromiso on-chain',
      aiDescription: 'Transacción para crear el milestone',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Creando milestone...'
      }
    },
    {
      id: 'mile_deposit',
      type: 'transaction',
      name: 'Depositar Apuesta',
      description: 'Bloqueando tu apuesta en escrow',
      aiDescription: 'Depósito de la apuesta en el contrato',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Depositando apuesta...'
      },
      dependsOn: ['mile_create']
    }
  ],

  currentStep: 0,
  completedSteps: [],
  data: {},

  aiSummary: 'Workflow para crear compromisos personales con apuestas que se pierden si no se cumple el objetivo',
  aiKeywords: ['milestone', 'objetivo', 'meta', 'compromiso', 'reto personal', 'logro'],
  aiExamples: [
    'Bajar 5kg en 2 meses',
    'Leer 12 libros este año',
    'Aprender a programar en 6 meses'
  ],
  estimatedTotalSeconds: 360
};

// ============================================================================
// 6. RANKING WORKFLOW (Ongoing Leaderboards)
// ============================================================================

export const rankingWorkflow: Workflow = {
  id: 'workflow_ranking',
  name: 'Crear Ranking',
  description: 'Crea una tabla de clasificación continua',
  category: 'ranking',

  steps: [
    {
      id: 'rank_name',
      type: 'input',
      name: 'Nombre del Ranking',
      description: 'Identifica la tabla de clasificación',
      aiDescription: 'Nombre de la competición de ranking',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TextInput',
      props: {
        label: 'Nombre del ranking',
        placeholder: 'Liga de Predicciones Crypto 2025'
      }
    },
    {
      id: 'rank_description',
      type: 'input',
      name: 'Descripción',
      description: 'Explica de qué trata el ranking',
      aiDescription: 'Descripción del sistema de puntuación y temática',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TextArea',
      props: {
        label: 'Descripción',
        placeholder: 'Describe cómo funciona el ranking...'
      }
    },
    {
      id: 'rank_period',
      type: 'selection',
      name: 'Período del Ranking',
      description: 'Cada cuánto se reinicia',
      aiDescription: 'Ciclo de tiempo del ranking (semanal, mensual, etc)',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'PeriodSelector',
      props: {
        label: 'Período',
        options: [
          { value: 'weekly', label: 'Semanal', description: 'Se reinicia cada semana' },
          { value: 'monthly', label: 'Mensual', description: 'Se reinicia cada mes' },
          { value: 'quarterly', label: 'Trimestral', description: 'Cada 3 meses' },
          { value: 'yearly', label: 'Anual', description: 'Todo el año' },
          { value: 'perpetual', label: 'Perpetuo', description: 'Nunca se reinicia' }
        ]
      }
    },
    {
      id: 'rank_scoring',
      type: 'selection',
      name: 'Sistema de Puntuación',
      description: 'Cómo se ganan puntos',
      aiDescription: 'Método para calcular la puntuación de cada participante',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'ScoringSystemSelector',
      props: {
        label: 'Puntuación',
        options: [
          { value: 'wins', label: 'Victorias', description: 'Puntos por ganar' },
          { value: 'accuracy', label: 'Precisión', description: '% de aciertos' },
          { value: 'profit', label: 'Ganancias', description: 'Profit acumulado' },
          { value: 'points', label: 'Puntos acumulados', description: 'Suma de puntos' },
          { value: 'elo', label: 'Rating ELO', description: 'Sistema de rating' },
          { value: 'custom', label: 'Personalizado', description: 'Fórmula propia' }
        ]
      }
    },
    {
      id: 'rank_entry_fee',
      type: 'input',
      name: 'Cuota de Participación',
      description: 'Costo para estar en el ranking',
      aiDescription: 'Fee para participar en el ranking (puede ser 0)',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TokenAmountInput',
      props: {
        label: 'Cuota de entrada',
        defaultValue: '0',
        currency: 'ETH',
        hint: '0 = entrada gratuita'
      }
    },
    {
      id: 'rank_prizes',
      type: 'selection',
      name: 'Estructura de Premios',
      description: 'Cómo se premian los primeros lugares',
      aiDescription: 'Distribución de premios entre los top del ranking',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'RankingPrizeSelector',
      props: {
        label: 'Premios',
        options: [
          { value: 'none', label: 'Sin premios', description: 'Solo por prestigio' },
          { value: 'top3', label: 'Top 3', description: 'Premios para 1°, 2°, 3°' },
          { value: 'top10', label: 'Top 10', description: 'Premios para top 10' },
          { value: 'percentile', label: 'Por percentil', description: 'Top 10%, 25%, etc.' }
        ]
      }
    },
    {
      id: 'rank_prize_pool',
      type: 'input',
      name: 'Prize Pool',
      description: 'Fondos totales para premios',
      aiDescription: 'Cantidad total a distribuir como premios',
      aiCanExecute: false,
      aiPrefillable: true,
      required: true,
      component: 'TokenAmountInput',
      props: {
        label: 'Prize pool total',
        defaultValue: '0.5',
        currency: 'ETH'
      },
      condition: {
        type: 'value',
        field: 'rank_prizes',
        operator: '!=',
        value: 'none'
      }
    },
    {
      id: 'rank_eligibility',
      type: 'selection',
      name: 'Requisitos de Elegibilidad',
      description: 'Quién puede participar',
      aiDescription: 'Condiciones para ser elegible para premios',
      aiCanExecute: true,
      aiPrefillable: true,
      required: true,
      component: 'EligibilitySelector',
      props: {
        label: 'Para ser elegible para premios...',
        options: [
          { value: 'any', label: 'Cualquiera', description: 'Sin restricciones' },
          { value: 'min_activity', label: 'Actividad mínima', description: 'X participaciones' },
          { value: 'staked', label: 'Con stake', description: 'Debe tener tokens en stake' },
          { value: 'verified', label: 'Verificados', description: 'Usuarios verificados' }
        ]
      }
    },
    {
      id: 'rank_confirm',
      type: 'confirmation',
      name: 'Confirmar Ranking',
      description: 'Revisa y lanza el ranking',
      aiDescription: 'Confirmación final antes de crear el ranking',
      aiCanExecute: false,
      aiPrefillable: false,
      required: true,
      component: 'RankingConfirmation',
      props: {}
    },
    {
      id: 'rank_create',
      type: 'transaction',
      name: 'Crear Ranking',
      description: 'Desplegando contrato del ranking',
      aiDescription: 'Transacción para crear el ranking on-chain',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Creando ranking...'
      }
    },
    {
      id: 'rank_fund',
      type: 'transaction',
      name: 'Depositar Prize Pool',
      description: 'Enviando fondos de premios',
      aiDescription: 'Depósito del prize pool en el contrato',
      aiCanExecute: true,
      aiPrefillable: false,
      required: true,
      component: 'TransactionProgress',
      props: {
        title: 'Depositando premios...'
      },
      dependsOn: ['rank_create'],
      condition: {
        type: 'value',
        field: 'rank_prizes',
        operator: '!=',
        value: 'none'
      }
    }
  ],

  currentStep: 0,
  completedSteps: [],
  data: {},

  aiSummary: 'Workflow para crear tablas de clasificación continuas con sistemas de puntuación y premios periódicos',
  aiKeywords: ['ranking', 'clasificación', 'leaderboard', 'liga', 'tabla', 'posiciones'],
  aiExamples: [
    'Liga mensual de predicciones',
    'Ranking de traders del mes',
    'Tabla de mejores jugadores'
  ],
  estimatedTotalSeconds: 300
};

// ============================================================================
// REGISTER ALL WORKFLOWS
// ============================================================================

export function registerAllWorkflows(): void {
  registerWorkflow(predictionWorkflow);
  registerWorkflow(tournamentWorkflow);
  registerWorkflow(challengeWorkflow);
  registerWorkflow(poolWorkflow);
  registerWorkflow(milestoneWorkflow);
  registerWorkflow(rankingWorkflow);
}

// Auto-register on import
registerAllWorkflows();

// ============================================================================
// WORKFLOW LOOKUP HELPERS
// ============================================================================

export const WORKFLOW_BY_CATEGORY: Record<string, Workflow> = {
  prediction: predictionWorkflow,
  tournament: tournamentWorkflow,
  challenge: challengeWorkflow,
  pool: poolWorkflow,
  milestone: milestoneWorkflow,
  ranking: rankingWorkflow
};

export function getWorkflowForCategory(category: string): Workflow | undefined {
  return WORKFLOW_BY_CATEGORY[category];
}

export function getWorkflowSummaries(): Array<{
  id: string;
  name: string;
  category: string;
  description: string;
  stepCount: number;
  estimatedTime: number;
  keywords: string[];
}> {
  return Object.values(WORKFLOW_BY_CATEGORY).map(w => ({
    id: w.id,
    name: w.name,
    category: w.category,
    description: w.description,
    stepCount: w.steps.length,
    estimatedTime: w.estimatedTotalSeconds,
    keywords: w.aiKeywords
  }));
}
