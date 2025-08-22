/**
 * SALES MASTERCLASS INTERACTIVE MODULE V2.0
 * The Revolutionary 7-Minute Pitch Experience
 * With Real CryptoGift Content & Interactive Questions
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { client } from '../../app/client';
// Simple confetti function to avoid external dependency
function confetti(options: any) {
  console.log('🎉 Confetti effect triggered!', options);
}
import { 
  CheckCircle, 
  Sparkles, 
  Flame,
  BarChart3,
  Lock,
  Rocket,
  Banknote,
  Globe,
  Trophy,
  Clock,
  Heart,
  Gift,
  Shield,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  Lightbulb,
  AlertCircle,
  Target,
  DollarSign,
  Award,
  Star,
  MessageCircle,
  Play,
  ChevronRight,
  X,
  Check,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Palette,
  Building2,
  ShoppingBag,
  RefreshCw,
  PartyPopper,
  Mail,
  Gamepad2,
  Briefcase,
  UserCheck,
  TrendingDown,
  CheckSquare,
  XCircle,
  CircleDot,
  Hash,
  AtSign,
  Code,
  BookOpen
} from 'lucide-react';

// Types
interface SalesBlock {
  id: string;
  title: string;
  duration: number;
  type: 'opening' | 'problem' | 'solution' | 'demo' | 'comparison' | 'cases' | 'business' | 'roadmap' | 'close' | 'capture' | 'success';
  content: any;
  question?: {
    text: string;
    options: Array<{
      text: string;
      isCorrect: boolean;
    }>;
  };
  triggers: string[];
}

interface LeadData {
  path: 'quest' | 'integration' | 'whitelabel' | 'investor' | 'community';
  availability: string;
  contact: string;
  interests: string[];
  nps?: number;
  claimedGift?: boolean;
  questionsCorrect?: number;
  totalQuestions?: number;
}

interface Metrics {
  startTime: number;
  blockTimes: Record<string, number>;
  interactions: number;
  claimSuccess: boolean;
  leadSubmitted: boolean;
  wowMoments: number;
  questionsAnswered: number;
  correctAnswers: number;
}

// Constants
const GIFT_CLAIM_URL = process.env.NEXT_PUBLIC_SITE_URL 
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/gift/claim/demo-`
  : 'https://cryptogift-wallets.vercel.app/gift/claim/demo-';

const SALES_BLOCKS: SalesBlock[] = [
  {
    id: 'opening',
    title: 'Regala el Futuro',
    duration: 30,
    type: 'opening',
    content: {
      headline: 'Imagina esto...',
      story: `Tu amigo que mira la cripto con recelo abre tu mensaje y descubre un tesoro digital:
              Una obra de arte única con la foto de su primer viaje, que además contiene 
              el capital inicial de su propio portafolio en blockchain.`,
      emphasis: 'Sin comisiones • Sin tecnicismos • Un NFT-wallet que guarda la moneda que elegiste',
      hook: 'Así comienza su historia como holder... y así comienza la nuestra.'
    },
    question: {
      text: '¿Cuál es la barrera #1 para la adopción cripto?',
      options: [
        { text: 'La falta de conexión emocional', isCorrect: true },
        { text: 'El precio de Bitcoin', isCorrect: false },
        { text: 'La velocidad de las transacciones', isCorrect: false }
      ]
    },
    triggers: ['emotional_connection', 'curiosity']
  },
  {
    id: 'problem',
    title: 'Las 3 Brechas del Mercado',
    duration: 45,
    type: 'problem',
    content: {
      brechas: [
        {
          title: 'Brecha Emocional',
          description: 'Exchanges fríos y transaccionales vs. vínculos significativos'
        },
        {
          title: 'Barrera Tecnológica',
          description: 'Wallets, gas, claves privadas... complejidad que asusta'
        },
        {
          title: 'Falta de Garantías',
          description: 'Gift cards que caducan o dependen de exchanges'
        }
      ],
      stat: '97% de gift cards cripto nunca se reclaman'
    },
    question: {
      text: '¿Qué porcentaje de regalos cripto tradicionales caducan sin reclamar?',
      options: [
        { text: '97% - La gran mayoría', isCorrect: true },
        { text: '50% - La mitad', isCorrect: false },
        { text: '10% - Muy pocos', isCorrect: false }
      ]
    },
    triggers: ['pain_agitation', 'statistics']
  },
  {
    id: 'solution',
    title: 'NFT-Wallets: La Revolución',
    duration: 45,
    type: 'solution',
    content: {
      breakthrough: 'ERC-6551 + Account Abstraction = Magic',
      features: [
        { icon: Gift, text: 'El NFT ES la cuenta bancaria' },
        { icon: Flame, text: 'Gas 100% patrocinado por nosotros' },
        { icon: Shield, text: 'Recuperación social con guardianes' },
        { icon: RefreshCw, text: 'Swap instantáneo a cualquier token' }
      ],
      tagline: 'La complejidad desaparece. La magia permanece.'
    },
    question: {
      text: '¿Qué tecnología usamos para eliminar los gas fees?',
      options: [
        { text: 'Account Abstraction + Paymaster', isCorrect: true },
        { text: 'Lightning Network', isCorrect: false },
        { text: 'Proof of Stake', isCorrect: false }
      ]
    },
    triggers: ['solution_reveal', 'innovation']
  },
  {
    id: 'demo',
    title: 'Vívelo Ahora Mismo',
    duration: 60,
    type: 'demo',
    content: {
      instruction: '¡Escanea y Reclama tu NFT-Wallet!',
      steps: [
        '1️⃣ Escanea el código QR',
        '2️⃣ Conecta tu wallet (o crea una)',
        '3️⃣ Reclama tu regalo',
        '4️⃣ ¡Listo! Ya tienes fondos'
      ],
      emphasis: 'Gas = $0 • Fricción = 0 • Emoción = 100%'
    },
    question: {
      text: '¿Cuánto pagaste de gas en el demo?',
      options: [
        { text: '$0 - Todo está patrocinado', isCorrect: true },
        { text: '$5 USD en fees', isCorrect: false },
        { text: '0.001 ETH', isCorrect: false }
      ]
    },
    triggers: ['live_demo', 'endowment_effect']
  },
  {
    id: 'comparison',
    title: 'Vs. Métodos Tradicionales',
    duration: 45,
    type: 'comparison',
    content: {
      title: 'La Diferencia es Clara',
      comparisons: [
        {
          traditional: '❌ Exchanges intimidantes',
          cryptogift: '✅ Simple como enviar un email'
        },
        {
          traditional: '❌ Comisiones altas y gas impredecible',
          cryptogift: '✅ Zero comisiones, gas patrocinado'
        },
        {
          traditional: '❌ Riesgo de perder claves privadas',
          cryptogift: '✅ Recuperación social con guardianes'
        },
        {
          traditional: '❌ Experiencia fría y técnica',
          cryptogift: '✅ Experiencia emotiva y personal'
        }
      ]
    },
    question: {
      text: '¿Qué hace único a CryptoGift vs exchanges tradicionales?',
      options: [
        { text: 'Experiencia emotiva + zero fricción', isCorrect: true },
        { text: 'Más monedas disponibles', isCorrect: false },
        { text: 'Trading avanzado', isCorrect: false }
      ]
    },
    triggers: ['contrast', 'differentiation']
  },
  {
    id: 'cases',
    title: 'Resultados Reales',
    duration: 30,
    type: 'cases',
    content: {
      metrics: [
        { number: '50,000+', label: 'NFT-Wallets regalados' },
        { number: '$500,000', label: 'Ahorrado en gas fees' },
        { number: '340%', label: 'Engagement rate (viral)' },
        { number: '100%', label: 'Uptime y seguridad' }
      ],
      testimonial: '"Cada regalo genera 3.4 nuevos usuarios por efecto viral"'
    },
    question: {
      text: '¿Cuál es nuestro engagement rate por efecto viral?',
      options: [
        { text: '340% - Cada regalo genera 3.4 usuarios', isCorrect: true },
        { text: '50% - La mitad regala', isCorrect: false },
        { text: '100% - Todos regalan una vez', isCorrect: false }
      ]
    },
    triggers: ['social_proof', 'metrics']
  },
  {
    id: 'business',
    title: 'Modelo de Negocio Ético',
    duration: 45,
    type: 'business',
    content: {
      title: 'Monetización Transparente',
      streams: [
        {
          name: 'Usuario Base',
          model: 'SIEMPRE GRATIS - $0 comisiones',
          icon: Gift
        },
        {
          name: 'Arte Premium',
          model: 'Marcos animados y filtros IA (opcional)',
          icon: Palette
        },
        {
          name: 'Corporativo',
          model: 'Paquetes para marcas y eventos',
          icon: Building2
        },
        {
          name: 'Marketplace',
          model: 'Diseños CC0 con royalties a creadores',
          icon: ShoppingBag
        }
      ],
      emphasis: 'Sin custodia • Sin riesgo regulatorio • 100% on-chain'
    },
    question: {
      text: '¿Cuánto paga el usuario base por usar CryptoGift?',
      options: [
        { text: '$0 - Siempre será gratis', isCorrect: true },
        { text: '$1 por cada regalo', isCorrect: false },
        { text: '2% de comisión', isCorrect: false }
      ]
    },
    triggers: ['transparency', 'trust']
  },
  {
    id: 'roadmap',
    title: 'El Futuro es Exponencial',
    duration: 30,
    type: 'roadmap',
    content: {
      phases: [
        {
          name: 'MVP - La Chispa',
          goal: '100k regalos en 6 meses',
          features: 'USDC + Arte generativo + Gas gratis'
        },
        {
          name: 'Beta 2 - La Ola',
          goal: '1M usuarios + 3 marcas globales',
          features: 'BTC/ETH + Badges + Eventos'
        },
        {
          name: 'Escala - El Puente',
          goal: 'API para fintechs',
          features: 'Tokenización: Oro, Bonos, Puntos de lealtad'
        }
      ]
    },
    question: {
      text: '¿Qué tokenizaremos en la fase de escala?',
      options: [
        { text: 'Oro, bonos y puntos de lealtad', isCorrect: true },
        { text: 'Solo más criptomonedas', isCorrect: false },
        { text: 'NFTs de arte digital', isCorrect: false }
      ]
    },
    triggers: ['vision', 'fomo']
  },
  {
    id: 'close',
    title: 'La Puerta al Futuro',
    duration: 45,
    type: 'close',
    content: {
      inspiration: `Regalar dinero siempre fue un acto de confianza.
                   Regalar libertad financiera lo eleva a un pacto de futuro.`,
      vision: `CryptoGift Wallets conecta emociones con tecnología para traer 
              a la siguiente ola de usuarios a un ecosistema descentralizado
              que entienden, controlan y sienten como suyo desde el primer segundo.`,
      callToAction: 'El mejor regalo nunca fue el objeto, sino la puerta que abre.',
      final: 'Hoy esa puerta es blockchain, y la llave cabe en un NFT-wallet.'
    },
    question: {
      text: '¿Estás listo para cambiar el mundo con nosotros?',
      options: [
        { text: '¡SÍ! Quiero ser parte de esta revolución', isCorrect: true },
        { text: 'Necesito más información', isCorrect: false },
        { text: 'Lo pensaré', isCorrect: false }
      ]
    },
    triggers: ['inspiration', 'commitment']
  },
  {
    id: 'capture',
    title: 'Únete a la Revolución',
    duration: 30,
    type: 'capture',
    content: {
      title: 'Elige tu rol en CryptoGift',
      paths: [
        { 
          name: 'Quest Creator', 
          description: 'Crea experiencias gamificadas',
          spots: 33,
          benefit: '30% revenue share'
        },
        { 
          name: 'Integration Partner',
          description: 'Integra nuestro widget',
          spots: 19,
          benefit: '1M transacciones gratis'
        },
        { 
          name: 'White-Label',
          description: 'Tu propia plataforma',
          spots: 6,
          benefit: 'SLA 99.99%'
        },
        { 
          name: 'Investor',
          description: 'Invierte en el futuro',
          spots: 'Limited',
          benefit: 'Min $50k'
        },
        {
          name: 'Community',
          description: 'Embajador de la adopción',
          spots: 'Unlimited',
          benefit: 'NFT exclusivo + Discord'
        }
      ],
      urgency: 'Bonus 20% lifetime para los primeros 100'
    },
    triggers: ['urgency', 'scarcity']
  },
  {
    id: 'success',
    title: '¡Bienvenido al Futuro!',
    duration: 60, // Extended duration for better enjoyment
    type: 'success',
    content: {
      title: '¡Ya eres parte de CryptoGift!',
      message: 'Gracias por completar el Masterclass',
      stats: {
        duration: '15 minutos',
        knowledge: '100% blockchain ready',
        status: 'Early Adopter Verificado'
      },
      benefits: [
        { icon: Mail, text: 'Recibirás información exclusiva' },
        { icon: Gift, text: 'NFT de fundador próximamente' },
        { icon: DollarSign, text: 'Acceso prioritario a nuevas features' },
        { icon: Rocket, text: 'Invitación a eventos privados' }
      ],
      finalMessage: 'El futuro de los pagos digitales comienza contigo.'
    },
    triggers: ['celebration', 'achievement']
  }
];

interface SalesMasterclassProps {
  educationalMode?: boolean;
  onEducationComplete?: () => void;
}

const SalesMasterclass: React.FC<SalesMasterclassProps> = ({ 
  educationalMode = false,
  onEducationComplete
}) => {
  console.log('🚀 SALES MASTERCLASS INIT:', { educationalMode, hasOnEducationComplete: !!onEducationComplete });
  
  // Hooks
  const account = useActiveAccount();
  
  // State
  const [currentBlock, setCurrentBlock] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SALES_BLOCKS[0].duration);
  const [isPaused, setIsPaused] = useState(false);
  const [leadData, setLeadData] = useState<Partial<LeadData>>({
    questionsCorrect: 0,
    totalQuestions: 0
  });
  const [metrics, setMetrics] = useState<Metrics>({
    startTime: Date.now(),
    blockTimes: {},
    interactions: 0,
    claimSuccess: false,
    leadSubmitted: false,
    wowMoments: 0,
    questionsAnswered: 0,
    correctAnswers: 0
  });
  const [showQR, setShowQR] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'waiting' | 'claiming' | 'success'>('waiting');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuestionFeedback, setShowQuestionFeedback] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [showEducationalValidation, setShowEducationalValidation] = useState(false);
  
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout>();

  // Educational Mode Initialization
  useEffect(() => {
    if (educationalMode) {
      console.log('🎓 EDUCATIONAL MODE ACTIVATED - Setting optimized flow');
      // In educational mode, reduce timers and enable smoother progression
      setCanProceed(true); // Allow immediate progression if needed
      
      // Reduce block duration for educational mode (faster pace)
      const currentBlockDuration = SALES_BLOCKS[currentBlock].duration;
      const educationalDuration = Math.min(currentBlockDuration, 15); // Max 15 seconds per block
      setTimeLeft(educationalDuration);
      
      console.log('⏱️ Educational mode timing:', {
        originalDuration: currentBlockDuration,
        educationalDuration,
        currentBlock: SALES_BLOCKS[currentBlock].id
      });
    }
  }, [educationalMode, currentBlock]);

  // QR Generation
  const generateDemoGiftUrl = useCallback(() => {
    const demoId = Math.random().toString(36).substring(7);
    return `${GIFT_CLAIM_URL}${demoId}`;
  }, []);

  // Celebration Effect - Extended for better experience
  const celebrate = useCallback(() => {
    // Multiple confetti bursts for extended celebration
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00CED1'];
    
    // Initial burst
    confetti({
      particleCount: 150,
      spread: 85,
      origin: { y: 0.6 },
      colors: colors,
      ticks: 300 // Extended duration (default is 200)
    });
    
    // Side bursts after 300ms
    setTimeout(() => {
      confetti({
        particleCount: 75,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors: colors,
        ticks: 250
      });
      confetti({
        particleCount: 75,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        colors: colors,
        ticks: 250
      });
    }, 300);
    
    // Center burst after 600ms
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.4 },
        colors: colors,
        ticks: 300
      });
    }, 600);
    
    setMetrics(prev => ({
      ...prev,
      wowMoments: prev.wowMoments + 1
    }));
  }, []);

  // Timer Management
  useEffect(() => {
    if (!isPaused && timeLeft > 0 && !showQuestionFeedback) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // ✅ FIX #3: Timer NO auto-avanza, solo oculta el botón
      // Cuando el timer se agota, simplemente mantener canProceed = false
      // El usuario debe esperar o hacer algo para proceder manualmente
      console.log('⏰ TIME UP - Button hidden, waiting for user action:', {
        currentBlock,
        timeLeft: 0,
        canProceed: false,
        educationalMode
      });
      // No llamamos handleNextBlock() automáticamente
      setCanProceed(false); // Ocultar botón cuando se acaba el tiempo
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isPaused, currentBlock, showQuestionFeedback, educationalMode]);

  // Answer Handler
  const handleAnswerSelect = useCallback((optionIndex: number) => {
    setSelectedAnswer(optionIndex);
    setShowQuestionFeedback(true);
    
    const block = SALES_BLOCKS[currentBlock];
    const isCorrect = block.question?.options[optionIndex].isCorrect || false;
    
    setMetrics(prev => ({
      ...prev,
      questionsAnswered: prev.questionsAnswered + 1,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0)
    }));
    
    setLeadData(prev => ({
      ...prev,
      totalQuestions: (prev.totalQuestions || 0) + 1,
      questionsCorrect: (prev.questionsCorrect || 0) + (isCorrect ? 1 : 0)
    }));
    
    if (isCorrect) {
      celebrate();
    }
    
    // Allow proceeding after answering
    setTimeout(() => {
      setCanProceed(true);
    }, 1500);
  }, [currentBlock, celebrate]);

  // Block Navigation
  const handleNextBlock = useCallback(() => {
    const nextBlock = currentBlock + 1;
    
    console.log('🎬 BLOCK NAVIGATION:', {
      currentBlock,
      currentBlockId: SALES_BLOCKS[currentBlock].id,
      nextBlock,
      nextBlockId: nextBlock < SALES_BLOCKS.length ? SALES_BLOCKS[nextBlock].id : 'END',
      totalBlocks: SALES_BLOCKS.length,
      educationalMode
    });
    
    if (nextBlock < SALES_BLOCKS.length) {
      setCurrentBlock(nextBlock);
      
      // Set appropriate duration for educational vs normal mode
      const blockDuration = educationalMode 
        ? Math.min(SALES_BLOCKS[nextBlock].duration, 15) // Max 15s in educational mode
        : SALES_BLOCKS[nextBlock].duration; // Full duration in normal mode
        
      setTimeLeft(blockDuration);
      setSelectedAnswer(null);
      setShowQuestionFeedback(false);
      
      // In educational mode, keep canProceed true for smooth flow
      setCanProceed(educationalMode);
      
      console.log('⏱️ Next block timing:', {
        blockId: SALES_BLOCKS[nextBlock].id,
        originalDuration: SALES_BLOCKS[nextBlock].duration,
        actualDuration: blockDuration,
        educationalMode
      });
      
      // Track metrics
      setMetrics(prev => ({
        ...prev,
        blockTimes: {
          ...prev.blockTimes,
          [SALES_BLOCKS[currentBlock].id]: Date.now() - prev.startTime
        }
      }));

      // Special actions per block
      if (SALES_BLOCKS[nextBlock].type === 'demo') {
        setShowQR(true);
        startClaimMonitoring();
      }
    }
  }, [currentBlock, educationalMode]);

  // Claim Monitoring
  const startClaimMonitoring = useCallback(() => {
    // Simulate claim detection
    setTimeout(() => {
      setClaimStatus('claiming');
      setTimeout(() => {
        setClaimStatus('success');
        celebrate();
        setMetrics(prev => ({ ...prev, claimSuccess: true }));
        setCanProceed(true);
      }, 3000);
    }, 5000);
  }, [celebrate]);

  // Lead Submission
  const handleLeadSubmit = useCallback(async (data: any) => {
    console.log('📝 LEAD SUBMIT:', { data, educationalMode, hasOnEducationComplete: !!onEducationComplete });
    
    // Store lead data including selected path
    setLeadData(prev => ({
      ...prev,
      path: data.path || prev.path,
      contact: data.contact || prev.contact,
      questionsCorrect: data.questionsScore?.correct || prev.questionsCorrect,
      totalQuestions: data.questionsScore?.total || prev.totalQuestions
    }));
    
    // In educational mode, show validation page before completing
    if (educationalMode) {
      console.log('🎓 EDUCATIONAL MODE - Showing validation page');
      setMetrics(prev => ({ ...prev, leadSubmitted: true }));
      
      // Show validation page
      setShowEducationalValidation(true);
      
      // Extended celebration with longer confetti
      setTimeout(() => {
        // Trigger extended confetti
        for (let i = 0; i < 3; i++) {
          setTimeout(() => celebrate(), i * 1000);
        }
      }, 500);
      
      // After showing validation, trigger completion
      setTimeout(() => {
        // Trigger education completion
        if (onEducationComplete) {
          console.log('✅ Calling onEducationComplete callback to generate EIP-712 signature');
          onEducationComplete();
        }
        
        // Send completion event for iframe
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'MASTERCLASS_COMPLETE' }, '*');
        }
        
        // Move to success block after extended time
        setTimeout(() => {
          handleNextBlock();
          setShowEducationalValidation(false);
        }, 6000); // Extended duration for validation page (6 seconds)
      }, 7000); // Show validation for 7 seconds before proceeding
      
      return;
    }
    
    // Normal lead capture flow for non-educational mode
    const finalData = {
      ...leadData,
      ...data,
      metrics,
      timestamp: Date.now()
    };
    
    console.log('Submitting lead:', finalData);
    
    try {
      const response = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Lead captured successfully:', result);
        
        // Show success message
        if (result.message) {
          alert(result.message); // In production, use a proper toast notification
        }
        
        setMetrics(prev => ({ ...prev, leadSubmitted: true }));
        celebrate();
        
        // Send completion event for educational mode
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'MASTERCLASS_COMPLETE' }, '*');
        }
        
        // Move to final success state after a delay
        setTimeout(() => {
          handleNextBlock();
        }, 3000);
      } else {
        console.error('Failed to submit lead');
        alert('Error al enviar el formulario. Por favor intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      alert('Error de conexión. Por favor verifica tu internet e intenta de nuevo.');
    }
  }, [leadData, metrics, celebrate, handleNextBlock, educationalMode, onEducationComplete]);

  // ✅ FIX #2: ELIMINAR EL PADDING BOTTOM QUE CAUSA EL ESPACIO VACÍO
  useEffect(() => {
    if (educationalMode) {
      const styleElement = document.createElement('style');
      styleElement.id = 'educational-fix-padding';
      styleElement.textContent = `
        .educational-mode-wrapper > div {
          padding-bottom: 0 !important;
        }
        .educational-mode-wrapper .NavigationArea {
          flex: 1 !important;
        }
      `;
      document.head.appendChild(styleElement);
      
      return () => {
        const existingStyle = document.getElementById('educational-fix-padding');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [educationalMode]);


  // Render Block Content
  const renderBlockContent = () => {
    // Show educational validation page if flag is set
    if (showEducationalValidation && educationalMode) {
      return (
        <div className="py-12 text-center">
          <motion.h2 
            className="text-5xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-center gap-3">
              <span>¡Felicidades!</span>
              <PartyPopper className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
          </motion.h2>
          
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-block bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 px-8 py-6 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]">
              <p className="text-3xl mb-4">
                Tu puntuación: <span className="font-bold text-blue-500 dark:text-blue-400">
                  {leadData.questionsCorrect}/{leadData.totalQuestions}
                </span> respuestas correctas
              </p>
              {leadData.questionsCorrect && leadData.questionsCorrect >= 7 && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-green-400 font-bold text-xl">
                  <span>¡EXCELENTE! Has aprendido sobre CryptoGift</span>
                  <Trophy className="w-6 h-6" />
                </div>
              )}
            </div>
          </motion.div>
          
          <motion.p
            className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Has completado exitosamente el módulo educativo "Proyecto CryptoGift".
            {leadData.path && (
              <span className="block mt-2 text-yellow-400">
                Tu rol seleccionado: <strong>{leadData.path}</strong>
              </span>
            )}
          </motion.p>
          
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-lg text-gray-400 mb-4">
              Generando tu certificación EIP-712...
            </p>
            <div className="animate-spin w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto" />
          </motion.div>
          
          <motion.div
            className="flex items-center justify-center gap-2 text-2xl font-bold text-emerald-600 dark:text-green-400"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span>EDUCACIÓN COMPLETADA</span>
            <CheckCircle className="w-8 h-8" />
          </motion.div>
        </div>
      );
    }
    
    const block = SALES_BLOCKS[currentBlock];
    
    console.log('🎬 RENDERING BLOCK:', {
      currentBlock,
      blockId: block.id,
      blockType: block.type,
      educationalMode,
      totalBlocks: SALES_BLOCKS.length
    });

    switch (block.type) {
      case 'opening':
        return <OpeningBlock 
          content={block.content} 
          question={block.question}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'problem':
        return <ProblemBlock 
          content={block.content}
          question={block.question}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'solution':
        return <SolutionBlock
          content={block.content}
          question={block.question}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'demo':
        return <DemoBlock 
          content={block.content}
          question={block.question}
          showQR={showQR}
          giftUrl={generateDemoGiftUrl()}
          claimStatus={claimStatus}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'comparison':
        return <ComparisonBlock
          content={block.content}
          question={block.question}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'cases':
        return <CasesBlock 
          content={block.content}
          question={block.question}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'business':
        return <BusinessBlock
          content={block.content}
          question={block.question}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'roadmap':
        return <RoadmapBlock
          content={block.content}
          question={block.question}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'close':
        return <CloseBlock
          content={block.content}
          question={block.question}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          showFeedback={showQuestionFeedback}
          onNext={handleNextBlock}
          canProceed={canProceed}
          timeLeft={timeLeft}
        />;
      case 'capture':
        return <CaptureBlock 
          content={block.content}
          onSubmit={handleLeadSubmit}
          questionsScore={{
            correct: leadData.questionsCorrect || 0,
            total: leadData.totalQuestions || 0
          }}
          educationalMode={educationalMode}
        />;
      case 'success':
        return <SuccessBlock
          content={block.content}
          leadData={leadData}
          metrics={metrics}
          educationalMode={educationalMode}
        />;
      default:
        return null;
    }
  };

  return (
    <div 
      className="sales-masterclass-wrapper" 
      style={{ 
        transform: 'scale(0.85)',
        transformOrigin: 'top center',
        width: '117.65%',
        marginLeft: '-8.82%'
      }}
    >
      <div className={`sales-masterclass ${educationalMode ? 'h-full' : 'min-h-screen'} 
        bg-gradient-to-br from-slate-50 to-blue-50 
        dark:from-gray-900 dark:to-gray-800 
        text-gray-900 dark:text-white transition-colors duration-300`}>
        {/* Header - Hidden in educational mode */}
        {!educationalMode && (
          <div className="fixed top-0 left-0 right-0 z-50 
            bg-white/95 dark:bg-gray-800/95 
            backdrop-blur-xl backdrop-saturate-150 
            border-b border-gray-200/50 dark:border-gray-700/50 
            shadow-xl">
          <div className="max-w-5xl mx-auto px-3 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r 
              from-blue-600 to-purple-600 
              dark:from-blue-400 dark:to-purple-400 
              bg-clip-text text-transparent">
              CryptoGift Masterclass
            </h1>
            <div className="flex gap-2">
              {SALES_BLOCKS.map((block, idx) => (
                <div
                  key={block.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentBlock 
                      ? 'bg-blue-500 dark:bg-blue-400 w-8' 
                      : idx < currentBlock 
                        ? 'bg-purple-500 dark:bg-purple-400' 
                        : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-mono text-lg">
                {metrics.correctAnswers}/{metrics.questionsAnswered}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-mono text-lg">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-4 py-2 
                bg-white/50 hover:bg-white/70 
                dark:bg-gray-800/50 dark:hover:bg-gray-800/70 
                backdrop-blur-xl 
                border border-gray-200/30 dark:border-gray-700/30 
                rounded-lg transition-all 
                text-gray-700 dark:text-gray-300 
                shadow-sm hover:shadow-md"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Main Content */}
      <div className={educationalMode ? "h-full flex flex-col px-3" : "pt-20 pb-10 px-3"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBlock}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className={`max-w-4xl mx-auto ${educationalMode ? 'flex-1 flex flex-col' : ''}`}
          >
            <div className={educationalMode ? 'h-full flex flex-col educational-mode-wrapper' : ''}>
              {renderBlockContent()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Metrics Overlay (Debug/Admin) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 p-4 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 shadow-xl">
          <div>Block: {SALES_BLOCKS[currentBlock].id}</div>
          <div>Questions: {metrics.correctAnswers}/{metrics.questionsAnswered}</div>
          <div>Wow Moments: {metrics.wowMoments}</div>
          <div>Claim: {claimStatus}</div>
          <div>Lead: {metrics.leadSubmitted ? '✅' : '⏳'}</div>
        </div>
      )}
      </div>
    </div>
  );
};

// Question Component
const QuestionSection: React.FC<{
  question: any;
  onAnswer: (index: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
}> = ({ question, onAnswer, selectedAnswer, showFeedback }) => {
  if (!question) return null;

  return (
    <div className="mt-8 p-6 
      bg-white/40 dark:bg-gray-800/40 
      backdrop-blur-2xl 
      rounded-2xl 
      border border-gray-200/20 dark:border-gray-700/20 
      shadow-lg">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 
        text-gray-800 dark:text-gray-200">
        <Lightbulb className="w-7 h-7 text-blue-500 dark:text-blue-400" />
        <span>Pregunta Rápida:</span>
      </h3>
      <p className="text-xl mb-6">{question.text}</p>
      
      <div className="space-y-3">
        {question.options.map((option: any, idx: number) => (
          <motion.button
            key={idx}
            onClick={() => !showFeedback && onAnswer(idx)}
            disabled={showFeedback}
            className={`w-full p-4 rounded-xl text-left transition-all ${
              showFeedback
                ? selectedAnswer === idx
                  ? option.isCorrect
                    ? 'bg-emerald-100 dark:bg-green-500/30 border-2 border-emerald-500 dark:border-green-500'
                    : 'bg-red-100 dark:bg-red-500/30 border-2 border-red-500'
                  : option.isCorrect
                    ? 'bg-emerald-50 dark:bg-green-500/20 border-2 border-emerald-400/50 dark:border-green-500/50'
                    : 'bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600'
                : 'bg-white/50 dark:bg-gray-800/30 backdrop-blur-xl border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/70 dark:hover:bg-gray-800/50 hover:border-blue-400/50 dark:hover:border-blue-500/30 cursor-pointer shadow-sm hover:shadow-md'
            }`}
            whileHover={!showFeedback ? { scale: 1.02 } : {}}
            whileTap={!showFeedback ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {showFeedback
                  ? option.isCorrect
                    ? <CheckCircle className="w-6 h-6 text-emerald-500 dark:text-green-400" />
                    : selectedAnswer === idx
                      ? <XCircle className="w-6 h-6 text-red-500" />
                      : <Circle className="w-6 h-6 text-gray-400" />
                  : [<Hash className="w-6 h-6 text-amber-600 dark:text-yellow-400" />, 
                     <AtSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />, 
                     <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />][idx]}
              </span>
              <span className="text-lg">{option.text}</span>
            </div>
          </motion.button>
        ))}
      </div>
      
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center"
        >
          {question.options[selectedAnswer!].isCorrect ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-green-400 text-xl font-bold">
              <span>¡Correcto!</span>
              <PartyPopper className="w-6 h-6" />
              <span>Excelente respuesta</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-yellow-400 text-xl">
              <span>Casi... pero la respuesta correcta te sorprenderá</span>
              <AlertCircle className="w-6 h-6" />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

// ✅ FIX #1: Componente de navegación unificado con espacio fijo
const NavigationArea: React.FC<{
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  buttonColor?: string;
}> = ({ 
  onNext, 
  canProceed, 
  timeLeft, 
  buttonText = "CONTINUAR", 
  buttonIcon = <Rocket className="w-6 h-6" />,
  buttonColor = "from-yellow-500 to-orange-500 text-black"
}) => (
  <div className="NavigationArea text-center mt-8 flex-1 flex flex-col justify-center">
    {canProceed && timeLeft > 0 ? (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={onNext}
          className={`inline-flex items-center gap-3 px-8 py-4 
                     bg-gradient-to-r ${buttonColor}
                     backdrop-blur-xl
                     font-bold text-xl rounded-xl 
                     hover:scale-105 transition-all duration-300 
                     shadow-lg hover:shadow-xl
                     border border-white/10
                     cursor-pointer`}
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {buttonIcon}
          {buttonText}
          <ArrowRight className="w-6 h-6" />
        </motion.button>
        
        <div className="mt-4 text-gray-600 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
          <ChevronRight className="w-4 h-4" />
          <span>Haz clic para continuar</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <Clock className="w-4 h-4" />
          <span>Tiempo restante: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
        </div>
      </motion.div>
    ) : timeLeft === 0 ? (
      <motion.div 
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-yellow-400 text-lg font-medium mb-4">
          <Clock className="w-5 h-5" />
          <span>Tiempo agotado - Esperando...</span>
        </div>
        <div className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          El siguiente bloque está disponible cuando completes esta sección
        </div>
        
        <motion.button
          onClick={onNext}
          className={`inline-flex items-center gap-3 px-8 py-4 
                     bg-gradient-to-r ${buttonColor}
                     backdrop-blur-xl
                     font-bold text-xl rounded-xl 
                     hover:scale-105 transition-all duration-300 
                     shadow-lg hover:shadow-xl
                     border border-white/10
                     cursor-pointer`}
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {buttonIcon}
          {buttonText}
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    ) : (
      <motion.div 
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 text-lg">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Procesando respuesta...</span>
        </div>
      </motion.div>
    )}
  </div>
);

// Block Components with Questions
const OpeningBlock: React.FC<{ 
  content: any; 
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <motion.div 
      className="text-center mb-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h1 className="text-6xl font-black mb-6 bg-gradient-to-r 
        from-blue-600 via-purple-600 to-emerald-600 
        dark:from-blue-400 dark:via-purple-400 dark:to-emerald-400 
        bg-clip-text text-transparent
        drop-shadow-2xl">
        {content.headline}
      </h1>
      
      <div className="max-w-3xl mx-auto">
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          {content.story}
        </p>
        
        <div className="bg-white/80 dark:bg-gray-800/80 
          backdrop-blur-xl backdrop-saturate-150 
          p-6 rounded-2xl 
          border border-gray-200/50 dark:border-gray-700/50 
          shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02] mb-6">
          <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
            {content.emphasis}
          </p>
        </div>
        
        <p className="text-2xl text-gray-900 dark:text-white font-bold">
          {content.hook}
        </p>
      </div>
    </motion.div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="CONTINUAR"
      buttonIcon={<Rocket className="w-6 h-6" />}
      buttonColor="from-blue-500 to-purple-500 text-white"
    />
  </div>
);

const ProblemBlock: React.FC<{
  content: any;
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-12 flex items-center justify-center gap-3">
      <span className="bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-300 dark:to-gray-100 bg-clip-text text-transparent">Las 3 Brechas del Mercado</span>
      <AlertCircle className="w-10 h-10 text-gray-600 dark:text-gray-400" />
    </h2>
    
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      {content.brechas.map((brecha: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-white/80 dark:bg-gray-800/80 
            backdrop-blur-xl backdrop-saturate-150 
            border border-gray-200/50 dark:border-gray-700/50 
            rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.2 }}
        >
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
            {brecha.title}
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            {brecha.description}
          </p>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <div className="inline-block 
        bg-white/80 dark:bg-gray-800/80 
        backdrop-blur-xl backdrop-saturate-150 
        border border-gray-200/50 dark:border-gray-700/50 
        px-8 py-4 rounded-full shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]">
        <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
          {content.stat}
        </p>
      </div>
    </div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="VER SOLUCIÓN"
      buttonIcon={<Shield className="w-6 h-6" />}
      buttonColor="from-gray-600 to-gray-800 text-white"
    />
  </div>
);

const SolutionBlock: React.FC<{
  content: any;
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-8 flex items-center justify-center gap-3">
      <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">NFT-Wallets: La Revolución</span>
      <Rocket className="w-10 h-10 text-blue-600 dark:text-blue-400" />
    </h2>
    
    <div className="text-center mb-8">
      <div className="inline-block 
        bg-white/80 dark:bg-gray-800/80 
        backdrop-blur-xl backdrop-saturate-150 
        border border-gray-200/50 dark:border-gray-700/50 
        px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]">
        <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
          {content.breakthrough}
        </p>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-4xl mx-auto">
      {content.features.map((feature: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-white/80 dark:bg-gray-800/80 
            backdrop-blur-xl backdrop-saturate-150 
            border border-gray-200/50 dark:border-gray-700/50 
            rounded-xl p-6 flex items-center gap-4 shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-500/30 dark:to-purple-500/30">
            {React.createElement(feature.icon, { className: "w-6 h-6 text-blue-600 dark:text-blue-400" })}
          </div>
          <span className="text-lg text-gray-700 dark:text-gray-100">{feature.text}</span>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <p className="text-2xl text-amber-600 dark:text-yellow-400 font-bold">
        {content.tagline}
      </p>
    </div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    {canProceed && (
      <motion.div 
        className="text-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={onNext}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 
                     text-white font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Zap className="w-6 h-6" />
          VER DEMO EN VIVO
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    )}
  </div>
);

const DemoBlock: React.FC<{ 
  content: any;
  question: any;
  showQR: boolean; 
  giftUrl: string;
  claimStatus: string;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, showQR, giftUrl, claimStatus, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="text-center py-12">
    <h2 className="text-5xl font-bold mb-8">{content.instruction}</h2>
    
    <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto mb-8">
      <div>
        {showQR && claimStatus === 'waiting' && (
          <motion.div 
            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 p-8 rounded-2xl inline-block shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <QRCodeSVG value={giftUrl} size={200} level="H" />
            <p className="text-gray-800 dark:text-gray-200 mt-4 font-semibold">Escanea con tu móvil</p>
          </motion.div>
        )}
        
        {claimStatus === 'claiming' && (
          <div className="py-20">
            <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-yellow-400 mx-auto" />
            <p className="mt-8 text-2xl">Procesando tu claim...</p>
          </div>
        )}
        
        {claimStatus === 'success' && (
          <motion.div 
            className="py-20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <CheckCircle className="w-32 h-32 text-green-400 mx-auto mb-8" />
            <h3 className="text-4xl font-bold mb-4">¡LO TIENES! 🎉</h3>
          </motion.div>
        )}
      </div>
      
      <div className="text-left">
        <h3 className="text-2xl font-bold mb-4 text-yellow-400">Pasos Simples:</h3>
        {content.steps.map((step: string, idx: number) => (
          <motion.div
            key={idx}
            className="mb-3 text-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
          >
            {step}
          </motion.div>
        ))}
        
        <div className="mt-6 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]">
          <p className="bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent font-bold">{content.emphasis}</p>
        </div>
      </div>
    </div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="VER COMPARACIÓN"
      buttonIcon={<BarChart3 className="w-6 h-6" />}
      buttonColor="from-blue-500 to-purple-500 text-white"
    />
  </div>
);

const ComparisonBlock: React.FC<{
  content: any;
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-12">{content.title} ⚔️</h2>
    
    <div className="max-w-4xl mx-auto">
      {content.comparisons.map((comp: any, idx: number) => (
        <motion.div
          key={idx}
          className="grid md:grid-cols-2 gap-4 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]">
            <p className="text-lg">{comp.traditional}</p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]">
            <p className="text-lg">{comp.cryptogift}</p>
          </div>
        </motion.div>
      ))}
    </div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="VER RESULTADOS"
      buttonIcon={<TrendingUp className="w-6 h-6" />}
      buttonColor="from-orange-500 to-red-500 text-white"
    />
  </div>
);

const CasesBlock: React.FC<{
  content: any;
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-12">Resultados Reales 📊</h2>
    
    <div className="grid md:grid-cols-4 gap-4 mb-8">
      {content.metrics.map((metric: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 text-center shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="text-4xl font-bold text-blue-500 dark:text-blue-400 mb-2">{metric.number}</div>
          <div className="text-sm text-gray-400">{metric.label}</div>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <p className="text-xl text-gray-300 italic">
        {content.testimonial}
      </p>
    </div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="VER MODELO DE NEGOCIO"
      buttonIcon={<Banknote className="w-6 h-6" />}
      buttonColor="from-purple-500 to-indigo-500 text-white"
    />
  </div>
);

const BusinessBlock: React.FC<{
  content: any;
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-12 flex items-center justify-center gap-3">
      <span className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">{content.title}</span>
      <Briefcase className="w-10 h-10 text-purple-600 dark:text-purple-400" />
    </h2>
    
    <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-5xl mx-auto">
      {content.streams.map((stream: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-500/30 dark:to-pink-500/30">
              {React.createElement(stream.icon, { className: "w-6 h-6 text-purple-600 dark:text-purple-400" })}
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{stream.name}</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            {stream.model}
          </p>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <div className="inline-block bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 px-8 py-4 rounded-full shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02]">
        <p className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent font-bold">
          {content.emphasis}
        </p>
      </div>
    </div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="VER ROADMAP"
      buttonIcon={<Globe className="w-6 h-6" />}
      buttonColor="from-blue-500 to-purple-500 text-white"
    />
  </div>
);

const RoadmapBlock: React.FC<{
  content: any;
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-12">El Futuro es Exponencial 🚀</h2>
    
    <div className="space-y-6 max-w-4xl mx-auto mb-8">
      {content.phases.map((phase: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-6"
          initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-bold text-indigo-400">{phase.name}</h3>
            <span className="text-yellow-400 font-bold">{phase.goal}</span>
          </div>
          <p className="text-gray-700 dark:text-gray-300">{phase.features}</p>
        </motion.div>
      ))}
    </div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="MOMENTO INSPIRACIONAL"
      buttonIcon={<Heart className="w-6 h-6" />}
      buttonColor="from-indigo-500 to-purple-500 text-white"
    />
  </div>
);

const CloseBlock: React.FC<{
  content: any;
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <div className="max-w-4xl mx-auto text-center">
      <motion.h2 
        className="text-6xl font-black mb-8 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        La Puerta al Futuro
      </motion.h2>
      
      <motion.div
        className="space-y-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-2xl text-gray-300 leading-relaxed">
          {content.inspiration}
        </p>
        
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-8">
          <p className="text-xl text-white leading-relaxed">
            {content.vision}
          </p>
        </div>
        
        <p className="text-2xl text-yellow-400 font-bold">
          {content.callToAction}
        </p>
        
        <p className="text-3xl text-white font-black">
          {content.final}
        </p>
      </motion.div>

      <motion.div
        className="mb-8"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Gift className="w-20 h-20 mx-auto text-yellow-400" />
      </motion.div>
    </div>

    <QuestionSection
      question={question}
      onAnswer={onAnswer}
      selectedAnswer={selectedAnswer}
      showFeedback={showFeedback}
    />

    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="¡QUIERO SER PARTE!"
      buttonIcon={<Rocket className="w-8 h-8" />}
      buttonColor="from-blue-600 to-purple-600 text-white"
    />
  </div>
);

const CaptureBlock: React.FC<{ 
  content: any; 
  onSubmit: (data: any) => void;
  questionsScore: { correct: number; total: number };
  educationalMode?: boolean;
}> = ({ content, onSubmit, questionsScore, educationalMode = false }) => {
  const account = useActiveAccount(); 
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [formData, setFormData] = useState({
    availability: '',
    contact: ''
  });
  const [showValidation, setShowValidation] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // En modo educacional, mostrar validación después de seleccionar rol
    if (educationalMode && selectedPath) {
      setShowValidation(true);
      // Esperar un momento para mostrar la validación antes de continuar
      setTimeout(() => {
        onSubmit({
          path: selectedPath,
          ...formData,
          questionsScore,
          educationalMode: true
        });
      }, 1500);
      return;
    }
    
    // Modo normal
    onSubmit({
      path: selectedPath,
      ...formData,
      questionsScore
    });
  };

  // 🚀 ARQUITECTURA UNIFICADA: Misma UI para ambos modos (Knowledge y Educational)
  // La página de selección de rol es CRÍTICA para capturar leads antes de completar
  
  // Si ya mostramos validación en modo educacional
  if (showValidation && educationalMode) {
    return (
      <div className="py-12 text-center">
        <motion.h2 
          className="text-5xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ¡Excelente Elección! 🎯
        </motion.h2>
        
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-2xl text-gray-300 mb-4">
            Has elegido: <span className="font-bold text-blue-500 dark:text-blue-400">{selectedPath}</span>
          </p>
          <p className="text-xl text-gray-400">
            Preparando tu acceso al regalo...
          </p>
        </motion.div>
        
        <div className="animate-spin w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  // UI principal unificada para ambos modos
  return (
    <div className="py-12">
      <h2 className="text-5xl font-bold text-center mb-8">
        {content.title} 🚀
      </h2>
      
      {/* Score Display */}
      <div className="text-center mb-8">
        <div className="inline-block bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 px-8 py-4 rounded-full">
          <p className="text-2xl">
            Tu puntuación: <span className="font-bold text-yellow-400">
              {questionsScore.correct}/{questionsScore.total}
            </span> respuestas correctas
          </p>
          {questionsScore.correct === questionsScore.total && (
            <p className="text-green-400 font-bold mt-2">¡PERFECTO! Eres un experto 🏆</p>
          )}
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12 max-w-6xl mx-auto">
        {content.paths.map((path: any) => (
          <motion.button
            key={path.name}
            onClick={() => setSelectedPath(path.name)}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              selectedPath === path.name
                ? 'border-yellow-400 bg-yellow-400/10 scale-105'
                : 'border-gray-600 hover:border-gray-400 hover:bg-gray-800/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <h3 className="font-bold text-xl mb-2">{path.name}</h3>
            <p className="text-sm text-gray-400 mb-3">{path.description}</p>
            <div className="text-yellow-400 mb-2 font-bold">
              {typeof path.spots === 'number' 
                ? `Solo ${path.spots} lugares`
                : path.spots
              }
            </div>
            <div className="text-sm text-green-400">
              {path.benefit}
            </div>
          </motion.button>
        ))}
      </div>

      {selectedPath && (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="max-w-md mx-auto space-y-4"
        >
          {/* En modo educacional, simplificar el formulario */}
          {educationalMode ? (
            <>
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6">
                <p className="text-lg text-gray-300 mb-4">
                  Has seleccionado: <span className="font-bold text-blue-500 dark:text-blue-400">{selectedPath}</span>
                </p>
                <p className="text-sm text-gray-400">
                  Esta información nos ayuda a personalizar tu experiencia en CryptoGift
                </p>
              </div>
              
              {/* Campo opcional de contacto en modo educacional */}
              <input
                type="text"
                placeholder="(Opcional) Tu email si quieres recibir actualizaciones"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none text-white"
              />
              
              {/* Check wallet connection for educational mode */}
              {!account ? (
                <div className="space-y-4">
                  <p className="text-yellow-400 font-semibold text-lg text-center">
                    🔒 Conecta tu wallet para continuar
                  </p>
                  <div className="flex justify-center">
                    <ConnectButton
                      client={client}
                      appMetadata={{
                        name: "CryptoGift Wallets",
                        url: typeof window !== 'undefined' ? window.location.origin : 'https://cryptogift-wallets.vercel.app'
                      }}
                      theme="dark"
                    />
                  </div>
                  <p className="text-gray-400 text-sm text-center">
                    Tu wallet es necesaria para generar la firma EIP-712
                  </p>
                </div>
              ) : (
                <motion.button
                  type="submit"
                  className="w-full py-5 bg-gradient-to-r from-yellow-500 to-green-500 text-black font-black text-2xl rounded-xl hover:scale-105 transition-all shadow-2xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8" />
                    CONTINUAR AL REGALO
                    <Gift className="w-8 h-8" />
                  </div>
                </motion.button>
              )}
            </>
          ) : (
            /* Modo normal - formulario completo */
            <>
              <input
                type="text"
                placeholder="¿Cuándo podemos hablar? (ej: Mañana 3pm)"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none text-white"
                required
              />
              
              <input
                type="text"
                placeholder="Tu mejor contacto (email/telegram/whatsapp)"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none text-white"
                required
              />
              
              <motion.button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-xl rounded-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🚀 CONFIRMAR Y UNIRME
              </motion.button>
              
              <div className="text-center text-yellow-400 text-sm">
                ⏰ {content.urgency}
              </div>
            </>
          )}
        </motion.form>
      )}
    </div>
  );
};

const SuccessBlock: React.FC<{
  content: any;
  leadData: any;
  metrics: any;
  educationalMode?: boolean;
}> = ({ content, leadData, metrics, educationalMode = false }) => {
  const router = useRouter();
  
  return (
    <div className="py-12 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
      </motion.div>
      
      <motion.h1
        className="text-6xl font-black mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {content.title}
      </motion.h1>
      
      <motion.p
        className="text-2xl text-gray-300 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {content.message}
      </motion.p>
      
      {/* Stats */}
      <motion.div
        className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        {Object.entries(content.stats).map(([key, value], idx) => (
          <div
            key={key}
            className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6"
          >
            <div className="text-3xl font-bold text-blue-500 dark:text-blue-400 mb-2">{String(value)}</div>
            <div className="text-gray-400 capitalize">{key.replace('_', ' ')}</div>
          </div>
        ))}
      </motion.div>
      
      {/* Benefits */}
      <motion.div
        className="max-w-2xl mx-auto mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <h3 className="text-2xl font-bold mb-6">Tus Beneficios Exclusivos:</h3>
        <div className="space-y-3">
          {content.benefits.map((benefit: string, idx: number) => (
            <motion.div
              key={idx}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + idx * 0.1 }}
            >
              {benefit}
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      {/* Final Message */}
      <motion.p
        className="text-3xl text-white font-bold mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5 }}
      >
        {content.finalMessage}
      </motion.p>
      
      {/* Actions */}
      <motion.div
        className="flex justify-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7 }}
      >
        <button
          onClick={() => router.push('/knowledge')}
          className="px-8 py-4 
            bg-gradient-to-r from-purple-500 to-pink-500 
            backdrop-blur-xl backdrop-saturate-150 
            text-white font-bold rounded-xl 
            hover:scale-105 transition-all 
            shadow-xl hover:shadow-2xl 
            border border-white/20"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <span>Más Contenido</span>
          </div>
        </button>
        
        <button
          onClick={() => router.push('/')}
          className="px-8 py-4 
            bg-gradient-to-r from-green-500 to-blue-500 
            backdrop-blur-xl backdrop-saturate-150 
            text-white font-bold rounded-xl 
            hover:scale-105 transition-all 
            shadow-xl hover:shadow-2xl 
            border border-white/20"
        >
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            <span>Crear mi Primer Regalo</span>
          </div>
        </button>
      </motion.div>
      
      {/* Celebration Effect */}
      <motion.div
        className="mt-12"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles className="w-16 h-16 mx-auto text-yellow-400" />
      </motion.div>
    </div>
  );
};

export { SalesMasterclass };
export default SalesMasterclass;