/**
 * MODELOS DATA - CryptoGift Use Cases
 * ====================================
 *
 * Complete catalog of 32 use cases across 8 categories.
 * Each model represents a unique way to use the CryptoGift platform.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import type { Modelo } from '@/types/modelos';

export const MODELOS: Modelo[] = [
  // ============================================================
  // CATEGORIA 1: CRYPTO ONBOARDING (4 modelos)
  // ============================================================
  {
    id: 'regalo-bienvenida',
    title: 'Regalo de Bienvenida Cripto',
    titleEn: 'Crypto Welcome Gift',
    description: 'El modo core del sistema. Regala NFT-wallets con criptomonedas reales a cualquier persona.',
    descriptionEn: 'The core system mode. Gift NFT-wallets with real crypto to anyone.',
    longDescription: 'Permite crear un regalo digital que contiene una wallet real con criptomonedas. El destinatario recibe un NFT que ES su wallet, gracias a ERC-6551. Sin necesidad de conocimientos previos de crypto.',
    longDescriptionEn: 'Create a digital gift containing a real wallet with cryptocurrency. The recipient receives an NFT that IS their wallet, thanks to ERC-6551. No prior crypto knowledge needed.',
    category: 'onboarding',
    icon: 'Gift',
    complexity: 1,
    status: 'deployed',
    integrations: ['escrow', 'erc6551', 'education', 'ipfs', 'paymaster'],
    flow: [
      { step: 1, title: 'Crear Regalo', titleEn: 'Create Gift', description: 'Sube una imagen personalizada y deposita crypto', descriptionEn: 'Upload a custom image and deposit crypto' },
      { step: 2, title: 'Configurar', titleEn: 'Configure', description: 'Establece password y condiciones opcionales', descriptionEn: 'Set password and optional conditions' },
      { step: 3, title: 'Compartir', titleEn: 'Share', description: 'Envia el link unico al destinatario', descriptionEn: 'Send the unique link to recipient' },
      { step: 4, title: 'Claim', titleEn: 'Claim', description: 'El destinatario reclama y recibe su NFT-wallet', descriptionEn: 'Recipient claims and receives their NFT-wallet' }
    ],
    useCases: ['Cumpleanos', 'Navidad', 'Onboarding familiar', 'Welcome packages'],
    useCasesEn: ['Birthdays', 'Christmas', 'Family onboarding', 'Welcome packages'],
    estimatedTime: '5 minutos'
  },
  {
    id: 'onboarding-educativo',
    title: 'Onboarding Educativo',
    titleEn: 'Educational Onboarding',
    description: 'Regalo condicionado a completar modulos educativos antes de reclamar los fondos.',
    descriptionEn: 'Gift conditioned on completing educational modules before claiming funds.',
    longDescription: 'Combina el regalo con educacion obligatoria. El destinatario debe completar lecciones sobre crypto, seguridad y uso de wallets antes de poder reclamar. Garantiza que el receptor entiende lo que recibe.',
    longDescriptionEn: 'Combines gift with mandatory education. Recipient must complete lessons about crypto, security, and wallet usage before claiming. Ensures recipient understands what they receive.',
    category: 'onboarding',
    icon: 'GraduationCap',
    complexity: 2,
    status: 'deployed',
    integrations: ['escrow', 'erc6551', 'education', 'eip712', 'paymaster'],
    flow: [
      { step: 1, title: 'Crear con Educacion', titleEn: 'Create with Education', description: 'Activa el gate educativo al crear', descriptionEn: 'Enable education gate when creating' },
      { step: 2, title: 'Seleccionar Modulos', titleEn: 'Select Modules', description: 'Elige que debe aprender el destinatario', descriptionEn: 'Choose what recipient must learn' },
      { step: 3, title: 'Completar Lecciones', titleEn: 'Complete Lessons', description: 'Destinatario estudia y pasa evaluaciones', descriptionEn: 'Recipient studies and passes assessments' },
      { step: 4, title: 'Claim Desbloqueado', titleEn: 'Claim Unlocked', description: 'Tras aprobar, puede reclamar su regalo', descriptionEn: 'After passing, can claim their gift' }
    ],
    useCases: ['Padres a hijos', 'Empresas a empleados', 'Universidades', 'Programas de alfabetizacion'],
    useCasesEn: ['Parents to children', 'Companies to employees', 'Universities', 'Literacy programs'],
    estimatedTime: '15-30 minutos'
  },
  {
    id: 'first-crypto-experience',
    title: 'Primera Experiencia Crypto',
    titleEn: 'First Crypto Experience',
    description: 'Paquete especial para absolutos principiantes con guia paso a paso.',
    descriptionEn: 'Special package for absolute beginners with step-by-step guide.',
    longDescription: 'Disenado especificamente para personas que nunca han tenido contacto con crypto. Incluye videos introductorios, setup guiado de MetaMask, y pequena cantidad de crypto para experimentar.',
    longDescriptionEn: 'Specifically designed for people who have never had contact with crypto. Includes introductory videos, guided MetaMask setup, and small amount of crypto to experiment.',
    category: 'onboarding',
    icon: 'Sparkles',
    complexity: 1,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'education', 'paymaster', 'email'],
    flow: [
      { step: 1, title: 'Crear Paquete Inicial', titleEn: 'Create Starter Pack', description: 'Selecciona el template "Primera Vez"', descriptionEn: 'Select "First Time" template' },
      { step: 2, title: 'Video Bienvenida', titleEn: 'Welcome Video', description: 'Destinatario ve video explicativo', descriptionEn: 'Recipient watches explanatory video' },
      { step: 3, title: 'Setup Guiado', titleEn: 'Guided Setup', description: 'Instalacion paso a paso de wallet', descriptionEn: 'Step-by-step wallet installation' },
      { step: 4, title: 'Primera Transaccion', titleEn: 'First Transaction', description: 'Practica enviando centavos', descriptionEn: 'Practice sending cents' }
    ],
    useCases: ['Abuelos', 'Personas no tech', 'Mercados emergentes', 'Programas de inclusion'],
    useCasesEn: ['Grandparents', 'Non-tech people', 'Emerging markets', 'Inclusion programs'],
    estimatedTime: '20 minutos'
  },
  {
    id: 'corporate-onboarding',
    title: 'Onboarding Corporativo',
    titleEn: 'Corporate Onboarding',
    description: 'Programa de introduccion crypto para empleados de empresas.',
    descriptionEn: 'Crypto introduction program for company employees.',
    longDescription: 'Solucion empresarial para introducir a todos los empleados al ecosistema crypto. Incluye tracking de progreso, reportes de compliance, y certificados de completacion.',
    longDescriptionEn: 'Enterprise solution to introduce all employees to the crypto ecosystem. Includes progress tracking, compliance reports, and completion certificates.',
    category: 'onboarding',
    icon: 'Building2',
    complexity: 3,
    status: 'building',
    integrations: ['escrow', 'erc6551', 'education', 'gnosis', 'email'],
    flow: [
      { step: 1, title: 'Setup Empresarial', titleEn: 'Enterprise Setup', description: 'Configurar programa para la empresa', descriptionEn: 'Configure program for company' },
      { step: 2, title: 'Invitar Empleados', titleEn: 'Invite Employees', description: 'Enviar invitaciones masivas por email', descriptionEn: 'Send mass email invitations' },
      { step: 3, title: 'Tracking Progreso', titleEn: 'Track Progress', description: 'Dashboard de completacion por equipo', descriptionEn: 'Completion dashboard by team' },
      { step: 4, title: 'Certificacion', titleEn: 'Certification', description: 'Emitir certificados NFT al completar', descriptionEn: 'Issue NFT certificates on completion' }
    ],
    useCases: ['Fintechs', 'Bancos', 'Empresas Web3', 'Departamentos de innovacion'],
    useCasesEn: ['Fintechs', 'Banks', 'Web3 companies', 'Innovation departments'],
    estimatedTime: '1-2 semanas programa'
  },

  // ============================================================
  // CATEGORIA 2: CAMPANAS MARKETING (4 modelos)
  // ============================================================
  {
    id: 'airdrop-nft-wallet',
    title: 'Airdrop con NFT-Wallet',
    titleEn: 'Airdrop with NFT-Wallet',
    description: 'Distribuye tokens a nuevos usuarios con wallet incluida automaticamente.',
    descriptionEn: 'Distribute tokens to new users with wallet automatically included.',
    longDescription: 'Revoluciona los airdrops tradicionales. En lugar de enviar tokens a wallets existentes, crea NFT-wallets precargadas y distribuyelas. El receptor no necesita tener wallet previa.',
    longDescriptionEn: 'Revolutionize traditional airdrops. Instead of sending tokens to existing wallets, create pre-loaded NFT-wallets and distribute them. Recipient needs no prior wallet.',
    category: 'campaigns',
    icon: 'Plane',
    complexity: 2,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'nft', 'paymaster', 'email'],
    flow: [
      { step: 1, title: 'Crear Campana', titleEn: 'Create Campaign', description: 'Define cantidad y tokens por wallet', descriptionEn: 'Define quantity and tokens per wallet' },
      { step: 2, title: 'Generar Wallets', titleEn: 'Generate Wallets', description: 'Sistema crea N NFT-wallets', descriptionEn: 'System creates N NFT-wallets' },
      { step: 3, title: 'Distribuir Links', titleEn: 'Distribute Links', description: 'Comparte links unicos', descriptionEn: 'Share unique links' },
      { step: 4, title: 'Claims Masivos', titleEn: 'Mass Claims', description: 'Usuarios reclaman sus wallets', descriptionEn: 'Users claim their wallets' }
    ],
    useCases: ['Lanzamiento de tokens', 'Promociones', 'Eventos presenciales', 'Partnerships'],
    useCasesEn: ['Token launches', 'Promotions', 'In-person events', 'Partnerships'],
    estimatedTime: '30 minutos setup'
  },
  {
    id: 'referral-rewards',
    title: 'Programa de Referidos',
    titleEn: 'Referral Program',
    description: 'Sistema de recompensas automatico para quienes traen nuevos usuarios.',
    descriptionEn: 'Automatic reward system for those who bring new users.',
    longDescription: 'Implementa un programa de referidos donde tanto el que refiere como el referido reciben recompensas crypto automaticamente al completar ciertas acciones.',
    longDescriptionEn: 'Implement a referral program where both referrer and referred receive crypto rewards automatically upon completing certain actions.',
    category: 'campaigns',
    icon: 'UserPlus',
    complexity: 3,
    status: 'deployed',
    integrations: ['escrow', 'erc6551', 'education', 'paymaster'],
    flow: [
      { step: 1, title: 'Obtener Link', titleEn: 'Get Link', description: 'Usuario genera su link de referido', descriptionEn: 'User generates their referral link' },
      { step: 2, title: 'Compartir', titleEn: 'Share', description: 'Comparte en redes y contactos', descriptionEn: 'Share on social and contacts' },
      { step: 3, title: 'Registro', titleEn: 'Sign Up', description: 'Nuevo usuario se registra via link', descriptionEn: 'New user signs up via link' },
      { step: 4, title: 'Recompensa Doble', titleEn: 'Double Reward', description: 'Ambos reciben crypto automaticamente', descriptionEn: 'Both receive crypto automatically' }
    ],
    useCases: ['Growth hacking', 'Comunidades', 'Influencers', 'Embajadores'],
    useCasesEn: ['Growth hacking', 'Communities', 'Influencers', 'Ambassadors'],
    estimatedTime: 'Continuo'
  },
  {
    id: 'quiz-rewards',
    title: 'Quiz con Recompensas',
    titleEn: 'Quiz with Rewards',
    description: 'Campanas educativas donde los usuarios ganan crypto respondiendo correctamente.',
    descriptionEn: 'Educational campaigns where users earn crypto by answering correctly.',
    longDescription: 'Crea quizzes sobre tu producto, marca o industria. Los participantes que respondan correctamente reciben recompensas crypto directamente a su NFT-wallet.',
    longDescriptionEn: 'Create quizzes about your product, brand, or industry. Participants who answer correctly receive crypto rewards directly to their NFT-wallet.',
    category: 'campaigns',
    icon: 'HelpCircle',
    complexity: 2,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'education', 'eip712', 'paymaster'],
    flow: [
      { step: 1, title: 'Crear Quiz', titleEn: 'Create Quiz', description: 'Define preguntas y respuestas', descriptionEn: 'Define questions and answers' },
      { step: 2, title: 'Configurar Premio', titleEn: 'Set Prize', description: 'Establece crypto por respuesta correcta', descriptionEn: 'Set crypto per correct answer' },
      { step: 3, title: 'Participacion', titleEn: 'Participation', description: 'Usuarios responden el quiz', descriptionEn: 'Users answer the quiz' },
      { step: 4, title: 'Recompensa Automatica', titleEn: 'Auto Reward', description: 'Crypto enviado al aprobar', descriptionEn: 'Crypto sent upon passing' }
    ],
    useCases: ['Learn-to-earn', 'Awareness campaigns', 'Product launches', 'Community engagement'],
    useCasesEn: ['Learn-to-earn', 'Awareness campaigns', 'Product launches', 'Community engagement'],
    estimatedTime: '15 minutos crear'
  },
  {
    id: 'social-challenges',
    title: 'Retos Sociales',
    titleEn: 'Social Challenges',
    description: 'Campanas gamificadas con tareas en redes sociales y recompensas crypto.',
    descriptionEn: 'Gamified campaigns with social media tasks and crypto rewards.',
    longDescription: 'Define retos como seguir cuentas, compartir contenido, o crear posts. Los participantes que completen los retos verificables reciben recompensas automaticas.',
    longDescriptionEn: 'Define challenges like following accounts, sharing content, or creating posts. Participants who complete verifiable challenges receive automatic rewards.',
    category: 'campaigns',
    icon: 'Share2',
    complexity: 3,
    status: 'building',
    integrations: ['escrow', 'erc6551', 'paymaster', 'telegram'],
    flow: [
      { step: 1, title: 'Definir Retos', titleEn: 'Define Challenges', description: 'Lista de tareas a completar', descriptionEn: 'List of tasks to complete' },
      { step: 2, title: 'Verificacion', titleEn: 'Verification', description: 'Sistema verifica completacion', descriptionEn: 'System verifies completion' },
      { step: 3, title: 'Acumular Puntos', titleEn: 'Earn Points', description: 'Puntos por cada tarea', descriptionEn: 'Points per task' },
      { step: 4, title: 'Canjear', titleEn: 'Redeem', description: 'Convertir puntos en crypto', descriptionEn: 'Convert points to crypto' }
    ],
    useCases: ['Viral campaigns', 'Brand awareness', 'Community building', 'Influencer activations'],
    useCasesEn: ['Viral campaigns', 'Brand awareness', 'Community building', 'Influencer activations'],
    estimatedTime: 'Variable'
  },

  // ============================================================
  // CATEGORIA 3: COMPETENCIAS Y APUESTAS (4 modelos)
  // ============================================================
  {
    id: 'apuesta-p2p',
    title: 'Apuesta P2P con Arbitro',
    titleEn: 'P2P Bet with Arbiter',
    description: 'Dos usuarios apuestan sobre un resultado y un tercero arbitra el resultado.',
    descriptionEn: 'Two users bet on an outcome and a third party arbitrates the result.',
    longDescription: 'Sistema de apuestas peer-to-peer donde el escrow mantiene los fondos hasta que un arbitro designado (puede ser humano o smart contract) determina el ganador.',
    longDescriptionEn: 'Peer-to-peer betting system where escrow holds funds until a designated arbiter (human or smart contract) determines the winner.',
    category: 'competitions',
    icon: 'Swords',
    complexity: 3,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'gnosis', 'eip712'],
    flow: [
      { step: 1, title: 'Crear Apuesta', titleEn: 'Create Bet', description: 'Define terminos y monto', descriptionEn: 'Define terms and amount' },
      { step: 2, title: 'Designar Arbitro', titleEn: 'Assign Arbiter', description: 'Elige quien decidira', descriptionEn: 'Choose who will decide' },
      { step: 3, title: 'Depositar Fondos', titleEn: 'Deposit Funds', description: 'Ambas partes depositan', descriptionEn: 'Both parties deposit' },
      { step: 4, title: 'Resolucion', titleEn: 'Resolution', description: 'Arbitro declara ganador', descriptionEn: 'Arbiter declares winner' }
    ],
    useCases: ['Apuestas deportivas', 'Predicciones', 'Retos personales', 'Competencias'],
    useCasesEn: ['Sports betting', 'Predictions', 'Personal challenges', 'Competitions'],
    estimatedTime: 'Variable'
  },
  {
    id: 'prediction-market',
    title: 'Mercado de Predicciones',
    titleEn: 'Prediction Market',
    description: 'Integracion con Manifold para crear mercados de prediccion con custodia real.',
    descriptionEn: 'Integration with Manifold to create prediction markets with real custody.',
    longDescription: 'Usa la logica de probabilidades de Manifold Markets pero con fondos reales custodiados por el escrow de CryptoGift. Lo mejor de ambos mundos.',
    longDescriptionEn: 'Use Manifold Markets probability logic but with real funds custodied by CryptoGift escrow. The best of both worlds.',
    category: 'competitions',
    icon: 'TrendingUp',
    complexity: 4,
    status: 'building',
    integrations: ['escrow', 'erc6551', 'manifold', 'gnosis'],
    flow: [
      { step: 1, title: 'Crear Mercado', titleEn: 'Create Market', description: 'Define pregunta y opciones', descriptionEn: 'Define question and options' },
      { step: 2, title: 'Establecer Pool', titleEn: 'Set Pool', description: 'Deposita liquidez inicial', descriptionEn: 'Deposit initial liquidity' },
      { step: 3, title: 'Trading', titleEn: 'Trading', description: 'Usuarios compran/venden posiciones', descriptionEn: 'Users buy/sell positions' },
      { step: 4, title: 'Resolucion', titleEn: 'Resolution', description: 'Evento ocurre, fondos distribuidos', descriptionEn: 'Event occurs, funds distributed' }
    ],
    useCases: ['Elecciones', 'Deportes', 'Crypto predictions', 'Corporate forecasting'],
    useCasesEn: ['Elections', 'Sports', 'Crypto predictions', 'Corporate forecasting'],
    estimatedTime: 'Dias/semanas'
  },
  {
    id: 'torneo-brackets',
    title: 'Torneo con Brackets',
    titleEn: 'Tournament Brackets',
    description: 'Organiza torneos eliminatorios con premios crypto automaticos.',
    descriptionEn: 'Organize elimination tournaments with automatic crypto prizes.',
    longDescription: 'Sistema completo de brackets para torneos. Soporta single/double elimination. Los premios se distribuyen automaticamente segun posicion final.',
    longDescriptionEn: 'Complete bracket system for tournaments. Supports single/double elimination. Prizes are distributed automatically based on final position.',
    category: 'competitions',
    icon: 'Trophy',
    complexity: 4,
    status: 'planned',
    integrations: ['escrow', 'erc6551', 'gnosis', 'nft'],
    flow: [
      { step: 1, title: 'Crear Torneo', titleEn: 'Create Tournament', description: 'Define formato y premios', descriptionEn: 'Define format and prizes' },
      { step: 2, title: 'Inscripciones', titleEn: 'Registrations', description: 'Participantes pagan entry fee', descriptionEn: 'Participants pay entry fee' },
      { step: 3, title: 'Competir', titleEn: 'Compete', description: 'Enfrentamientos por rondas', descriptionEn: 'Round-by-round matches' },
      { step: 4, title: 'Premiacion', titleEn: 'Awards', description: 'Premios automaticos a ganadores', descriptionEn: 'Automatic prizes to winners' }
    ],
    useCases: ['Esports', 'Fantasy sports', 'Gaming tournaments', 'Skill competitions'],
    useCasesEn: ['Esports', 'Fantasy sports', 'Gaming tournaments', 'Skill competitions'],
    estimatedTime: 'Semanas'
  },
  {
    id: 'pool-apuestas',
    title: 'Pool de Apuestas',
    titleEn: 'Betting Pool',
    description: 'Multiples usuarios aportan a un pool y el ganador se lleva todo.',
    descriptionEn: 'Multiple users contribute to a pool and winner takes all.',
    longDescription: 'Similar a una quiniela. Muchos participantes depositan, todos predicen un resultado, y quienes aciertan comparten el pool proporcionalmente.',
    longDescriptionEn: 'Similar to a betting pool. Many participants deposit, everyone predicts an outcome, and those who guess correctly share the pool proportionally.',
    category: 'competitions',
    icon: 'Users',
    complexity: 3,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'gnosis', 'manifold'],
    flow: [
      { step: 1, title: 'Crear Pool', titleEn: 'Create Pool', description: 'Define evento y opciones', descriptionEn: 'Define event and options' },
      { step: 2, title: 'Depositos', titleEn: 'Deposits', description: 'Participantes aportan y predicen', descriptionEn: 'Participants deposit and predict' },
      { step: 3, title: 'Cierre', titleEn: 'Close', description: 'Pool cerrado, esperar resultado', descriptionEn: 'Pool closed, await result' },
      { step: 4, title: 'Distribucion', titleEn: 'Distribution', description: 'Ganadores reciben parte del pool', descriptionEn: 'Winners receive pool share' }
    ],
    useCases: ['Super Bowl', 'World Cup', 'Oscar predictions', 'Corporate events'],
    useCasesEn: ['Super Bowl', 'World Cup', 'Oscar predictions', 'Corporate events'],
    estimatedTime: 'Variable'
  },

  // ============================================================
  // CATEGORIA 4: GOBERNANZA DAO (4 modelos)
  // ============================================================
  {
    id: 'votacion-tesoreria',
    title: 'Votacion de Tesoreria',
    titleEn: 'Treasury Voting',
    description: 'Los poseedores de NFT-wallets votan sobre el uso de fondos comunitarios.',
    descriptionEn: 'NFT-wallet holders vote on the use of community funds.',
    longDescription: 'Sistema de gobernanza donde cada NFT-wallet representa un voto. Las propuestas de gasto de la tesoreria requieren aprobacion de la comunidad.',
    longDescriptionEn: 'Governance system where each NFT-wallet represents a vote. Treasury spending proposals require community approval.',
    category: 'governance',
    icon: 'Vote',
    complexity: 3,
    status: 'building',
    integrations: ['escrow', 'erc6551', 'gnosis', 'eip712'],
    flow: [
      { step: 1, title: 'Propuesta', titleEn: 'Proposal', description: 'Miembro crea propuesta de gasto', descriptionEn: 'Member creates spending proposal' },
      { step: 2, title: 'Discusion', titleEn: 'Discussion', description: 'Periodo de debate comunitario', descriptionEn: 'Community debate period' },
      { step: 3, title: 'Votacion', titleEn: 'Voting', description: 'Holders votan con sus NFT-wallets', descriptionEn: 'Holders vote with their NFT-wallets' },
      { step: 4, title: 'Ejecucion', titleEn: 'Execution', description: 'Si aprueba, fondos liberados', descriptionEn: 'If approved, funds released' }
    ],
    useCases: ['DAOs', 'Cooperativas', 'Clubes de inversion', 'Fondos comunitarios'],
    useCasesEn: ['DAOs', 'Cooperatives', 'Investment clubs', 'Community funds'],
    estimatedTime: '1-2 semanas'
  },
  {
    id: 'multisig-familiar',
    title: 'Multisig Familiar',
    titleEn: 'Family Multisig',
    description: 'Wallet compartida que requiere multiples firmas familiares para mover fondos.',
    descriptionEn: 'Shared wallet requiring multiple family signatures to move funds.',
    longDescription: 'Combina Gnosis Safe con NFT-wallets para crear una tesoreria familiar. Configuraciones tipicas: 2-of-3, 3-of-5. Ideal para herencias o gastos compartidos.',
    longDescriptionEn: 'Combine Gnosis Safe with NFT-wallets to create a family treasury. Typical configs: 2-of-3, 3-of-5. Ideal for inheritances or shared expenses.',
    category: 'governance',
    icon: 'Users',
    complexity: 4,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'gnosis'],
    flow: [
      { step: 1, title: 'Crear Safe', titleEn: 'Create Safe', description: 'Configurar multisig 2-of-3', descriptionEn: 'Configure 2-of-3 multisig' },
      { step: 2, title: 'Agregar Miembros', titleEn: 'Add Members', description: 'Invitar familiares como firmantes', descriptionEn: 'Invite family as signers' },
      { step: 3, title: 'Proponer Gasto', titleEn: 'Propose Spend', description: 'Un miembro propone transaccion', descriptionEn: 'A member proposes transaction' },
      { step: 4, title: 'Firmar', titleEn: 'Sign', description: 'Otros aprueban con sus firmas', descriptionEn: 'Others approve with signatures' }
    ],
    useCases: ['Herencias', 'Gastos familiares', 'Fondos de emergencia', 'Educacion de hijos'],
    useCasesEn: ['Inheritances', 'Family expenses', 'Emergency funds', 'Children education'],
    estimatedTime: '20 minutos setup'
  },
  {
    id: 'crowdfunding-dao',
    title: 'Crowdfunding DAO',
    titleEn: 'DAO Crowdfunding',
    description: 'Recaudacion colectiva donde los contribuyentes reciben NFT-wallets con derechos.',
    descriptionEn: 'Collective fundraising where contributors receive NFT-wallets with rights.',
    longDescription: 'Sistema de crowdfunding donde cada contribucion genera un NFT-wallet. Estos NFTs dan derechos de gobernanza proporcionales sobre los fondos recaudados.',
    longDescriptionEn: 'Crowdfunding system where each contribution generates an NFT-wallet. These NFTs give proportional governance rights over raised funds.',
    category: 'governance',
    icon: 'HandCoins',
    complexity: 4,
    status: 'planned',
    integrations: ['escrow', 'erc6551', 'gnosis', 'nft'],
    flow: [
      { step: 1, title: 'Crear Campana', titleEn: 'Create Campaign', description: 'Define meta y deadline', descriptionEn: 'Define goal and deadline' },
      { step: 2, title: 'Contribuciones', titleEn: 'Contributions', description: 'Usuarios donan y reciben NFT-wallet', descriptionEn: 'Users donate and receive NFT-wallet' },
      { step: 3, title: 'Meta Alcanzada', titleEn: 'Goal Reached', description: 'Si exito, fondos disponibles', descriptionEn: 'If successful, funds available' },
      { step: 4, title: 'Gobernanza Activa', titleEn: 'Active Governance', description: 'Holders deciden uso de fondos', descriptionEn: 'Holders decide fund usage' }
    ],
    useCases: ['Startups', 'Proyectos comunitarios', 'Causas sociales', 'Arte colectivo'],
    useCasesEn: ['Startups', 'Community projects', 'Social causes', 'Collective art'],
    estimatedTime: 'Semanas/meses'
  },
  {
    id: 'delegacion-votos',
    title: 'Delegacion de Votos',
    titleEn: 'Vote Delegation',
    description: 'Delega tu poder de voto a otro miembro de confianza del DAO.',
    descriptionEn: 'Delegate your voting power to another trusted DAO member.',
    longDescription: 'Sistema de democracia liquida. Si no puedes votar o no tienes opinion formada, delega temporalmente tu poder de voto a alguien de confianza.',
    longDescriptionEn: 'Liquid democracy system. If you cannot vote or have not formed an opinion, temporarily delegate your voting power to someone you trust.',
    category: 'governance',
    icon: 'ArrowRightLeft',
    complexity: 3,
    status: 'planned',
    integrations: ['escrow', 'erc6551', 'gnosis', 'eip712'],
    flow: [
      { step: 1, title: 'Elegir Delegado', titleEn: 'Choose Delegate', description: 'Selecciona miembro de confianza', descriptionEn: 'Select trusted member' },
      { step: 2, title: 'Firmar Delegacion', titleEn: 'Sign Delegation', description: 'Firma EIP-712 para delegar', descriptionEn: 'Sign EIP-712 to delegate' },
      { step: 3, title: 'Voto Activo', titleEn: 'Active Vote', description: 'Delegado vota en tu nombre', descriptionEn: 'Delegate votes on your behalf' },
      { step: 4, title: 'Revocar', titleEn: 'Revoke', description: 'Recupera tu voto cuando quieras', descriptionEn: 'Reclaim your vote anytime' }
    ],
    useCases: ['DAOs grandes', 'Gobernanza corporativa', 'Sindicatos', 'Asociaciones'],
    useCasesEn: ['Large DAOs', 'Corporate governance', 'Unions', 'Associations'],
    estimatedTime: '5 minutos'
  },

  // ============================================================
  // CATEGORIA 5: SERVICIOS FINANCIEROS (4 modelos)
  // ============================================================
  {
    id: 'ahorro-programado',
    title: 'Ahorro Programado',
    titleEn: 'Scheduled Savings',
    description: 'Sistema de ahorro automatico con bloqueo temporal de fondos.',
    descriptionEn: 'Automatic savings system with time-locked funds.',
    longDescription: 'Configura depositos automaticos periodicos a un NFT-wallet con bloqueo temporal. Los fondos solo se pueden retirar despues de la fecha establecida.',
    longDescriptionEn: 'Configure automatic periodic deposits to an NFT-wallet with time lock. Funds can only be withdrawn after the set date.',
    category: 'finance',
    icon: 'PiggyBank',
    complexity: 2,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'streaming'],
    flow: [
      { step: 1, title: 'Configurar Plan', titleEn: 'Configure Plan', description: 'Define monto y frecuencia', descriptionEn: 'Define amount and frequency' },
      { step: 2, title: 'Activar Streaming', titleEn: 'Activate Streaming', description: 'Depositos automaticos comienzan', descriptionEn: 'Automatic deposits start' },
      { step: 3, title: 'Acumular', titleEn: 'Accumulate', description: 'Fondos crecen con el tiempo', descriptionEn: 'Funds grow over time' },
      { step: 4, title: 'Desbloqueo', titleEn: 'Unlock', description: 'Acceso completo en fecha meta', descriptionEn: 'Full access on target date' }
    ],
    useCases: ['Fondo de emergencia', 'Vacaciones', 'Compras grandes', 'Jubilacion'],
    useCasesEn: ['Emergency fund', 'Vacations', 'Big purchases', 'Retirement'],
    estimatedTime: 'Meses/anos'
  },
  {
    id: 'escrow-comercio',
    title: 'Escrow para Comercio',
    titleEn: 'Commerce Escrow',
    description: 'Compra/venta P2P con escrow automatico como intermediario neutral.',
    descriptionEn: 'P2P buy/sell with automatic escrow as neutral intermediary.',
    longDescription: 'Sistema de escrow para transacciones comerciales. El comprador deposita, el vendedor envia, y cuando el comprador confirma recepcion, los fondos se liberan.',
    longDescriptionEn: 'Escrow system for commercial transactions. Buyer deposits, seller ships, and when buyer confirms receipt, funds are released.',
    category: 'finance',
    icon: 'ShoppingCart',
    complexity: 3,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'gnosis', 'telegram'],
    flow: [
      { step: 1, title: 'Acuerdo', titleEn: 'Agreement', description: 'Comprador y vendedor acuerdan precio', descriptionEn: 'Buyer and seller agree on price' },
      { step: 2, title: 'Deposito', titleEn: 'Deposit', description: 'Comprador deposita en escrow', descriptionEn: 'Buyer deposits in escrow' },
      { step: 3, title: 'Envio', titleEn: 'Shipping', description: 'Vendedor envia producto', descriptionEn: 'Seller ships product' },
      { step: 4, title: 'Liberacion', titleEn: 'Release', description: 'Comprador confirma, fondos liberados', descriptionEn: 'Buyer confirms, funds released' }
    ],
    useCases: ['Marketplace P2P', 'Compra de NFTs', 'Servicios freelance', 'Comercio internacional'],
    useCasesEn: ['P2P Marketplace', 'NFT purchases', 'Freelance services', 'International trade'],
    estimatedTime: 'Dias'
  },
  {
    id: 'vesting-empleados',
    title: 'Vesting para Empleados',
    titleEn: 'Employee Vesting',
    description: 'Programa de tokens con liberacion gradual a lo largo del tiempo.',
    descriptionEn: 'Token program with gradual release over time.',
    longDescription: 'Implementa un schedule de vesting tipico de startups. Los tokens se liberan gradualmente (cliff + linear vesting) incentivando la retencion de talento.',
    longDescriptionEn: 'Implement a typical startup vesting schedule. Tokens are released gradually (cliff + linear vesting) incentivizing talent retention.',
    category: 'finance',
    icon: 'Calendar',
    complexity: 4,
    status: 'building',
    integrations: ['escrow', 'erc6551', 'streaming', 'gnosis'],
    flow: [
      { step: 1, title: 'Crear Plan', titleEn: 'Create Plan', description: 'Define cliff, duracion, cantidad', descriptionEn: 'Define cliff, duration, amount' },
      { step: 2, title: 'Asignar', titleEn: 'Assign', description: 'Asociar plan a empleado', descriptionEn: 'Associate plan with employee' },
      { step: 3, title: 'Cliff', titleEn: 'Cliff', description: 'Periodo inicial sin liberacion', descriptionEn: 'Initial period without release' },
      { step: 4, title: 'Vesting', titleEn: 'Vesting', description: 'Liberacion gradual mensual', descriptionEn: 'Monthly gradual release' }
    ],
    useCases: ['Startups', 'Equity compensation', 'Bonus diferidos', 'Retiro por anos'],
    useCasesEn: ['Startups', 'Equity compensation', 'Deferred bonuses', 'Service retirement'],
    estimatedTime: '2-4 anos tipico'
  },
  {
    id: 'swap-automatico',
    title: 'Swap Automatico',
    titleEn: 'Auto Swap',
    description: 'Conversion automatica entre criptomonedas al momento del claim.',
    descriptionEn: 'Automatic conversion between cryptocurrencies at claim time.',
    longDescription: 'El creador deposita en cualquier token, el receptor elige en que token quiere recibir. El swap ocurre automaticamente via 0x Protocol.',
    longDescriptionEn: 'Creator deposits any token, recipient chooses which token to receive. Swap happens automatically via 0x Protocol.',
    category: 'finance',
    icon: 'ArrowLeftRight',
    complexity: 3,
    status: 'deployed',
    integrations: ['escrow', 'erc6551', 'swap', 'paymaster'],
    flow: [
      { step: 1, title: 'Depositar', titleEn: 'Deposit', description: 'Creador deposita cualquier token', descriptionEn: 'Creator deposits any token' },
      { step: 2, title: 'Elegir Token', titleEn: 'Choose Token', description: 'Receptor elige token de salida', descriptionEn: 'Recipient chooses output token' },
      { step: 3, title: 'Swap', titleEn: 'Swap', description: 'Conversion automatica al mejor precio', descriptionEn: 'Auto conversion at best price' },
      { step: 4, title: 'Recibir', titleEn: 'Receive', description: 'Token deseado en NFT-wallet', descriptionEn: 'Desired token in NFT-wallet' }
    ],
    useCases: ['Flexibilidad de tokens', 'DCA automatico', 'Arbitraje', 'Multi-token gifts'],
    useCasesEn: ['Token flexibility', 'Auto DCA', 'Arbitrage', 'Multi-token gifts'],
    estimatedTime: 'Instantaneo'
  },

  // ============================================================
  // CATEGORIA 6: GAMING (4 modelos)
  // ============================================================
  {
    id: 'loot-box-nft',
    title: 'Loot Box NFT',
    titleEn: 'NFT Loot Box',
    description: 'Cajas sorpresa con NFTs y crypto aleatorios dentro.',
    descriptionEn: 'Surprise boxes with random NFTs and crypto inside.',
    longDescription: 'Sistema de loot boxes on-chain con rareza verificable. Cada caja es un NFT-wallet que contiene items aleatorios de diferentes rarezas y valores.',
    longDescriptionEn: 'On-chain loot box system with verifiable rarity. Each box is an NFT-wallet containing random items of different rarities and values.',
    category: 'gaming',
    icon: 'Gift',
    complexity: 3,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'nft', 'paymaster'],
    flow: [
      { step: 1, title: 'Comprar Box', titleEn: 'Buy Box', description: 'Adquiere un loot box NFT', descriptionEn: 'Acquire a loot box NFT' },
      { step: 2, title: 'Abrir', titleEn: 'Open', description: 'Revelar contenido (VRF)', descriptionEn: 'Reveal contents (VRF)' },
      { step: 3, title: 'Reclamar', titleEn: 'Claim', description: 'Items van a tu NFT-wallet', descriptionEn: 'Items go to your NFT-wallet' },
      { step: 4, title: 'Tradear', titleEn: 'Trade', description: 'Vende o intercambia items', descriptionEn: 'Sell or trade items' }
    ],
    useCases: ['Gaming', 'Coleccionables', 'Promociones', 'Events'],
    useCasesEn: ['Gaming', 'Collectibles', 'Promotions', 'Events'],
    estimatedTime: 'Instantaneo'
  },
  {
    id: 'premio-gaming',
    title: 'Premio de Gaming',
    titleEn: 'Gaming Prize',
    description: 'Pool de premios para torneos de videojuegos.',
    descriptionEn: 'Prize pool for video game tournaments.',
    longDescription: 'Sistema automatizado de prize pools. Los participantes contribuyen entry fees, el sistema distribuye automaticamente a los ganadores segun posicion.',
    longDescriptionEn: 'Automated prize pool system. Participants contribute entry fees, system automatically distributes to winners based on position.',
    category: 'gaming',
    icon: 'Gamepad2',
    complexity: 3,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'gnosis', 'nft'],
    flow: [
      { step: 1, title: 'Crear Torneo', titleEn: 'Create Tournament', description: 'Define juego y estructura de premios', descriptionEn: 'Define game and prize structure' },
      { step: 2, title: 'Inscripciones', titleEn: 'Registrations', description: 'Jugadores pagan entry fee', descriptionEn: 'Players pay entry fee' },
      { step: 3, title: 'Jugar', titleEn: 'Play', description: 'Competir en el torneo', descriptionEn: 'Compete in tournament' },
      { step: 4, title: 'Premios', titleEn: 'Prizes', description: 'Top 3 reciben automaticamente', descriptionEn: 'Top 3 receive automatically' }
    ],
    useCases: ['Esports', 'Casual gaming', 'Streamers', 'Gaming communities'],
    useCasesEn: ['Esports', 'Casual gaming', 'Streamers', 'Gaming communities'],
    estimatedTime: 'Horas/dias'
  },
  {
    id: 'nft-upgradeable',
    title: 'NFT Upgradeable',
    titleEn: 'Upgradeable NFT',
    description: 'NFTs que evolucionan y ganan atributos con el tiempo y uso.',
    descriptionEn: 'NFTs that evolve and gain attributes over time and usage.',
    longDescription: 'Sistema de NFTs dinamicos donde el token puede ser mejorado depositando mas crypto o completando quests. La wallet ERC-6551 almacena las mejoras.',
    longDescriptionEn: 'Dynamic NFT system where the token can be upgraded by depositing more crypto or completing quests. The ERC-6551 wallet stores upgrades.',
    category: 'gaming',
    icon: 'TrendingUp',
    complexity: 4,
    status: 'planned',
    integrations: ['escrow', 'erc6551', 'nft', 'education'],
    flow: [
      { step: 1, title: 'Mint Base', titleEn: 'Mint Base', description: 'Crear NFT con stats iniciales', descriptionEn: 'Create NFT with initial stats' },
      { step: 2, title: 'Completar Quests', titleEn: 'Complete Quests', description: 'Ganar XP y materiales', descriptionEn: 'Earn XP and materials' },
      { step: 3, title: 'Upgrade', titleEn: 'Upgrade', description: 'Mejorar stats con materiales', descriptionEn: 'Improve stats with materials' },
      { step: 4, title: 'Evolucion', titleEn: 'Evolution', description: 'Desbloquear nueva forma visual', descriptionEn: 'Unlock new visual form' }
    ],
    useCases: ['Gaming NFTs', 'PFPs evolutivos', 'Achievement badges', 'Membership tiers'],
    useCasesEn: ['Gaming NFTs', 'Evolving PFPs', 'Achievement badges', 'Membership tiers'],
    estimatedTime: 'Continuo'
  },
  {
    id: 'achievement-nft',
    title: 'NFT de Logros',
    titleEn: 'Achievement NFT',
    description: 'Badges NFT que certifican logros y completaciones.',
    descriptionEn: 'NFT badges that certify achievements and completions.',
    longDescription: 'Sistema de achievements on-chain. Completa objetivos especificos y recibe NFT-badges que pueden contener recompensas crypto adicionales.',
    longDescriptionEn: 'On-chain achievement system. Complete specific objectives and receive NFT-badges that may contain additional crypto rewards.',
    category: 'gaming',
    icon: 'Award',
    complexity: 2,
    status: 'deployed',
    integrations: ['escrow', 'erc6551', 'nft', 'education'],
    flow: [
      { step: 1, title: 'Ver Logros', titleEn: 'View Achievements', description: 'Lista de achievements disponibles', descriptionEn: 'List of available achievements' },
      { step: 2, title: 'Completar', titleEn: 'Complete', description: 'Realizar la accion requerida', descriptionEn: 'Perform required action' },
      { step: 3, title: 'Mint Badge', titleEn: 'Mint Badge', description: 'Recibir NFT-badge automatico', descriptionEn: 'Receive automatic NFT-badge' },
      { step: 4, title: 'Mostrar', titleEn: 'Display', description: 'Badge visible en perfil', descriptionEn: 'Badge visible on profile' }
    ],
    useCases: ['Gamificacion', 'Certificados', 'Lealtad', 'Reputation'],
    useCasesEn: ['Gamification', 'Certificates', 'Loyalty', 'Reputation'],
    estimatedTime: 'Variable'
  },

  // ============================================================
  // CATEGORIA 7: SOCIAL Y RELACIONES (4 modelos)
  // ============================================================
  {
    id: 'regalo-aniversario',
    title: 'Regalo de Aniversario',
    titleEn: 'Anniversary Gift',
    description: 'Regalo especial para fechas importantes con mensaje personalizado.',
    descriptionEn: 'Special gift for important dates with personalized message.',
    longDescription: 'Template especial para aniversarios, cumpleanos y fechas especiales. Incluye mensaje personalizado, imagen conmemorativa y crypto como regalo.',
    longDescriptionEn: 'Special template for anniversaries, birthdays, and special dates. Includes personalized message, commemorative image, and crypto as gift.',
    category: 'social',
    icon: 'Heart',
    complexity: 1,
    status: 'deployed',
    integrations: ['escrow', 'erc6551', 'ipfs', 'email'],
    flow: [
      { step: 1, title: 'Elegir Template', titleEn: 'Choose Template', description: 'Selecciona diseno especial', descriptionEn: 'Select special design' },
      { step: 2, title: 'Personalizar', titleEn: 'Personalize', description: 'Agrega mensaje y foto', descriptionEn: 'Add message and photo' },
      { step: 3, title: 'Depositar', titleEn: 'Deposit', description: 'Elige cantidad de crypto', descriptionEn: 'Choose crypto amount' },
      { step: 4, title: 'Enviar', titleEn: 'Send', description: 'Programar envio o enviar ya', descriptionEn: 'Schedule or send now' }
    ],
    useCases: ['Cumpleanos', 'Aniversarios', 'San Valentin', 'Graduaciones'],
    useCasesEn: ['Birthdays', 'Anniversaries', 'Valentines', 'Graduations'],
    estimatedTime: '5 minutos'
  },
  {
    id: 'propina-creador',
    title: 'Propina a Creadores',
    titleEn: 'Creator Tips',
    description: 'Sistema de propinas directas a creadores de contenido.',
    descriptionEn: 'Direct tipping system for content creators.',
    longDescription: 'Los fans pueden enviar propinas crypto directamente a sus creadores favoritos. Sin intermediarios, el creador recibe 100% de la propina.',
    longDescriptionEn: 'Fans can send crypto tips directly to their favorite creators. No intermediaries, creator receives 100% of the tip.',
    category: 'social',
    icon: 'Coins',
    complexity: 1,
    status: 'deployed',
    integrations: ['escrow', 'erc6551', 'paymaster'],
    flow: [
      { step: 1, title: 'Elegir Creador', titleEn: 'Choose Creator', description: 'Busca tu creador favorito', descriptionEn: 'Find your favorite creator' },
      { step: 2, title: 'Cantidad', titleEn: 'Amount', description: 'Define monto de propina', descriptionEn: 'Define tip amount' },
      { step: 3, title: 'Mensaje', titleEn: 'Message', description: 'Agrega nota opcional', descriptionEn: 'Add optional note' },
      { step: 4, title: 'Enviar', titleEn: 'Send', description: 'Propina instantanea', descriptionEn: 'Instant tip' }
    ],
    useCases: ['Streamers', 'YouTubers', 'Artists', 'Writers'],
    useCasesEn: ['Streamers', 'YouTubers', 'Artists', 'Writers'],
    estimatedTime: '1 minuto'
  },
  {
    id: 'grupo-ahorro',
    title: 'Grupo de Ahorro',
    titleEn: 'Savings Group',
    description: 'Tanda o circulo de ahorro entre amigos con escrow automatico.',
    descriptionEn: 'Savings circle among friends with automatic escrow.',
    longDescription: 'Implementa el concepto tradicional de "tanda" o "rosca" pero con smart contracts. Depositos automaticos, turnos programados, y 0% riesgo de incumplimiento.',
    longDescriptionEn: 'Implements the traditional "tanda" or ROSCA concept but with smart contracts. Automatic deposits, scheduled turns, and 0% default risk.',
    category: 'social',
    icon: 'Users',
    complexity: 4,
    status: 'planned',
    integrations: ['escrow', 'erc6551', 'gnosis', 'streaming'],
    flow: [
      { step: 1, title: 'Crear Grupo', titleEn: 'Create Group', description: 'Invita a participantes', descriptionEn: 'Invite participants' },
      { step: 2, title: 'Configurar', titleEn: 'Configure', description: 'Define monto y frecuencia', descriptionEn: 'Define amount and frequency' },
      { step: 3, title: 'Depositos', titleEn: 'Deposits', description: 'Todos depositan periodicamente', descriptionEn: 'Everyone deposits periodically' },
      { step: 4, title: 'Turnos', titleEn: 'Turns', description: 'Cada periodo uno recibe todo', descriptionEn: 'Each period one receives all' }
    ],
    useCases: ['Tandas', 'Circulos de ahorro', 'Grupos familiares', 'Comunidades'],
    useCasesEn: ['ROSCAs', 'Savings circles', 'Family groups', 'Communities'],
    estimatedTime: 'Meses'
  },
  {
    id: 'herencia-digital',
    title: 'Herencia Digital',
    titleEn: 'Digital Inheritance',
    description: 'Programa la transferencia de tus activos crypto a herederos.',
    descriptionEn: 'Program the transfer of your crypto assets to heirs.',
    longDescription: 'Sistema de herencia automatica. Si no hay actividad por X tiempo, los fondos se transfieren automaticamente a los beneficiarios designados.',
    longDescriptionEn: 'Automatic inheritance system. If no activity for X time, funds automatically transfer to designated beneficiaries.',
    category: 'social',
    icon: 'ScrollText',
    complexity: 5,
    status: 'planned',
    integrations: ['escrow', 'erc6551', 'gnosis', 'email'],
    flow: [
      { step: 1, title: 'Designar', titleEn: 'Designate', description: 'Define beneficiarios y %', descriptionEn: 'Define beneficiaries and %' },
      { step: 2, title: 'Trigger', titleEn: 'Trigger', description: 'Configura condicion (tiempo)', descriptionEn: 'Configure condition (time)' },
      { step: 3, title: 'Heartbeat', titleEn: 'Heartbeat', description: 'Confirma actividad periodica', descriptionEn: 'Confirm periodic activity' },
      { step: 4, title: 'Ejecucion', titleEn: 'Execution', description: 'Si no hay heartbeat, fondos se transfieren', descriptionEn: 'If no heartbeat, funds transfer' }
    ],
    useCases: ['Herencias', 'Sucesion empresarial', 'Emergencias', 'Dead mans switch'],
    useCasesEn: ['Inheritances', 'Business succession', 'Emergencies', 'Dead mans switch'],
    estimatedTime: 'Configuracion inicial'
  },

  // ============================================================
  // CATEGORIA 8: ENTERPRISE B2B (4 modelos)
  // ============================================================
  {
    id: 'payroll-crypto',
    title: 'Nomina en Crypto',
    titleEn: 'Crypto Payroll',
    description: 'Paga salarios en criptomonedas de forma automatizada.',
    descriptionEn: 'Pay salaries in cryptocurrency automatically.',
    longDescription: 'Sistema de payroll empresarial en crypto. Configura salarios, define frecuencia, y el sistema distribuye automaticamente a cada empleado.',
    longDescriptionEn: 'Enterprise crypto payroll system. Configure salaries, define frequency, and the system automatically distributes to each employee.',
    category: 'enterprise',
    icon: 'Briefcase',
    complexity: 4,
    status: 'building',
    integrations: ['escrow', 'erc6551', 'gnosis', 'streaming'],
    flow: [
      { step: 1, title: 'Setup', titleEn: 'Setup', description: 'Configura empresa y empleados', descriptionEn: 'Configure company and employees' },
      { step: 2, title: 'Deposito', titleEn: 'Deposit', description: 'Empresa deposita fondos', descriptionEn: 'Company deposits funds' },
      { step: 3, title: 'Distribucion', titleEn: 'Distribution', description: 'Pagos automaticos periodicos', descriptionEn: 'Automatic periodic payments' },
      { step: 4, title: 'Reportes', titleEn: 'Reports', description: 'Documentacion para compliance', descriptionEn: 'Documentation for compliance' }
    ],
    useCases: ['Startups', 'Remote teams', 'Contractors internacionales', 'DAOs'],
    useCasesEn: ['Startups', 'Remote teams', 'International contractors', 'DAOs'],
    estimatedTime: 'Mensual'
  },
  {
    id: 'loyalty-program',
    title: 'Programa de Lealtad',
    titleEn: 'Loyalty Program',
    description: 'Sistema de puntos/rewards para clientes en crypto.',
    descriptionEn: 'Points/rewards system for customers in crypto.',
    longDescription: 'Reemplaza los programas de puntos tradicionales con tokens crypto reales. Los clientes acumulan tokens canjeables por productos, servicios o cash.',
    longDescriptionEn: 'Replace traditional points programs with real crypto tokens. Customers accumulate tokens redeemable for products, services, or cash.',
    category: 'enterprise',
    icon: 'Star',
    complexity: 3,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'nft', 'paymaster'],
    flow: [
      { step: 1, title: 'Disenar Programa', titleEn: 'Design Program', description: 'Define estructura de rewards', descriptionEn: 'Define rewards structure' },
      { step: 2, title: 'Integracion', titleEn: 'Integration', description: 'Conectar con POS/e-commerce', descriptionEn: 'Connect with POS/e-commerce' },
      { step: 3, title: 'Acumulacion', titleEn: 'Accumulation', description: 'Clientes ganan tokens', descriptionEn: 'Customers earn tokens' },
      { step: 4, title: 'Redencion', titleEn: 'Redemption', description: 'Canjear por beneficios', descriptionEn: 'Redeem for benefits' }
    ],
    useCases: ['Retail', 'E-commerce', 'Airlines', 'Hotels'],
    useCasesEn: ['Retail', 'E-commerce', 'Airlines', 'Hotels'],
    estimatedTime: 'Continuo'
  },
  {
    id: 'escrow-contratos',
    title: 'Escrow para Contratos',
    titleEn: 'Contract Escrow',
    description: 'Custodia automatica de fondos para contratos de servicio.',
    descriptionEn: 'Automatic fund custody for service contracts.',
    longDescription: 'Sistema de escrow profesional para contratos B2B. Define milestones, el cliente deposita, y los fondos se liberan al cumplir cada milestone verificado.',
    longDescriptionEn: 'Professional escrow system for B2B contracts. Define milestones, client deposits, and funds release upon verified milestone completion.',
    category: 'enterprise',
    icon: 'FileCheck',
    complexity: 4,
    status: 'ready',
    integrations: ['escrow', 'erc6551', 'gnosis', 'eip712'],
    flow: [
      { step: 1, title: 'Crear Contrato', titleEn: 'Create Contract', description: 'Define terminos y milestones', descriptionEn: 'Define terms and milestones' },
      { step: 2, title: 'Deposito Inicial', titleEn: 'Initial Deposit', description: 'Cliente deposita en escrow', descriptionEn: 'Client deposits in escrow' },
      { step: 3, title: 'Milestones', titleEn: 'Milestones', description: 'Verificacion de entregas', descriptionEn: 'Delivery verification' },
      { step: 4, title: 'Liberacion', titleEn: 'Release', description: 'Fondos liberados por milestone', descriptionEn: 'Funds released per milestone' }
    ],
    useCases: ['Freelancers', 'Agencias', 'Consultoria', 'Desarrollo software'],
    useCasesEn: ['Freelancers', 'Agencies', 'Consulting', 'Software development'],
    estimatedTime: 'Proyecto'
  },
  {
    id: 'white-label',
    title: 'White Label Solution',
    titleEn: 'White Label Solution',
    description: 'Licencia la tecnologia CryptoGift para tu propia marca.',
    descriptionEn: 'License CryptoGift technology for your own brand.',
    longDescription: 'Solucion enterprise completa para que empresas lancen su propia version de CryptoGift con su marca, colores, y configuracion personalizada.',
    longDescriptionEn: 'Complete enterprise solution for companies to launch their own branded version of CryptoGift with their branding and custom configuration.',
    category: 'enterprise',
    icon: 'Building',
    complexity: 5,
    status: 'planned',
    integrations: ['escrow', 'erc6551', 'gnosis', 'aa', 'nft'],
    flow: [
      { step: 1, title: 'Licencia', titleEn: 'License', description: 'Acuerdo comercial', descriptionEn: 'Commercial agreement' },
      { step: 2, title: 'Customizacion', titleEn: 'Customization', description: 'Branding y configuracion', descriptionEn: 'Branding and configuration' },
      { step: 3, title: 'Deploy', titleEn: 'Deploy', description: 'Despliegue en infraestructura propia', descriptionEn: 'Deploy on own infrastructure' },
      { step: 4, title: 'Soporte', titleEn: 'Support', description: 'Mantenimiento y updates', descriptionEn: 'Maintenance and updates' }
    ],
    useCases: ['Bancos', 'Fintechs', 'Exchanges', 'Grandes corporaciones'],
    useCasesEn: ['Banks', 'Fintechs', 'Exchanges', 'Large corporations'],
    estimatedTime: 'Meses'
  }
];

// Export count for easy reference
export const TOTAL_MODELOS = MODELOS.length;

// Helper function to get models by category
export function getModelosByCategory(category: string): Modelo[] {
  if (category === 'all') return MODELOS;
  return MODELOS.filter(m => m.category === category);
}

// Helper function to get models by status
export function getModelosByStatus(status: string): Modelo[] {
  if (status === 'all') return MODELOS;
  return MODELOS.filter(m => m.status === status);
}

// Helper function to search models
export function searchModelos(query: string): Modelo[] {
  const lowerQuery = query.toLowerCase();
  return MODELOS.filter(m =>
    m.title.toLowerCase().includes(lowerQuery) ||
    m.titleEn.toLowerCase().includes(lowerQuery) ||
    m.description.toLowerCase().includes(lowerQuery) ||
    m.descriptionEn.toLowerCase().includes(lowerQuery) ||
    m.useCases.some(uc => uc.toLowerCase().includes(lowerQuery)) ||
    m.integrations.some(i => i.toLowerCase().includes(lowerQuery))
  );
}
