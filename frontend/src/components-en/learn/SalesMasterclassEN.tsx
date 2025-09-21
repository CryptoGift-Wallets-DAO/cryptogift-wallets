/**
 * SALES MASTERCLASS INTERACTIVE MODULE V2.0
 * The Revolutionary 7-Minute Pitch Experience
 * With Real CryptoGift Content & Interactive Questions
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Removed useRouter import to avoid App Router/Pages Router conflicts
// Using window.location.href for navigation instead
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { client } from '../../app/client';
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
  BookOpen,
  Calendar
} from 'lucide-react';
import { EmailVerificationModal } from '../../components/email/EmailVerificationModal';
import { CalendarBookingModal } from '../../components/calendar/CalendarBookingModal';
import IntroVideoGate from '../../components/video/IntroVideoGate';
import { VIDEO_CONFIG } from '../../config/videoConfig';
// Enhanced confetti function matching KnowledgeLessonModal implementation
function triggerConfetti(options?: ConfettiOptions) {
  // Visual confetti effect using CSS animation
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // Create confetti elements
    for (let i = 0; i < particleCount; i++) {
      const confettiEl = document.createElement('div');
      confettiEl.style.position = 'fixed';
      confettiEl.style.width = '10px';
      confettiEl.style.height = '10px';
      confettiEl.style.backgroundColor = ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00CED1', '#32CD32'][Math.floor(Math.random() * 6)];
      confettiEl.style.left = Math.random() * 100 + '%';
      confettiEl.style.top = '-10px';
      confettiEl.style.opacity = '1';
      confettiEl.style.transform = `rotate(${Math.random() * 360}deg)`;
      confettiEl.style.zIndex = '10000';
      confettiEl.className = 'confetti-particle';
      
      document.body.appendChild(confettiEl);
      
      // Animate falling
      confettiEl.animate([
        { 
          transform: `translateY(0) rotate(0deg)`,
          opacity: 1 
        },
        { 
          transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 720}deg)`,
          opacity: 0
        }
      ], {
        duration: randomInRange(2000, 4000),
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }).onfinish = () => confettiEl.remove();
    }
  }, 100);
  
  console.log('🎉 Enhanced confetti effect triggered!', options);
}

// Backward compatibility
function confetti(options: ConfettiOptions) {
  triggerConfetti(options);
}
// Types
interface ConfettiOptions {
  startVelocity?: number;
  spread?: number;
  ticks?: number;
  zIndex?: number;
}

// AUDIT FIX #8: Comprehensive typing to eliminate any types - Updated to match actual usage
interface BrechaItem {
  title: string;
  description: string;
  impact?: string; // Optional porque no siempre se usa
}

interface FeatureItem {
  icon?: React.ComponentType<{ className?: string }>; // Componente React para lucide-react
  text?: string; // Para features simples que solo tienen texto
  title?: string; // Para features más complejas
  description?: string;
  benefit?: string;
}

interface ComparisonItem {
  aspect?: string; // Opcional para permitir objetos simples
  traditional?: string; // Used in the code
  competitor?: string;
  cryptogift?: string; // Opcional para flexibilidad
  advantage?: string; // Opcional para flexibilidad
}

interface MetricItem {
  label?: string; // Opcional para flexibilidad
  number?: string; // Used in the code 
  value?: string; // Opcional
  improvement?: string; // Opcional
}

interface StreamItem {
  name: string;
  model?: string; // Used in the code
  description?: string; // Opcional
  potential?: string; // Opcional
  icon?: React.ComponentType<{ className?: string }>; // Componente React para lucide-react
}

interface PhaseItem {
  phase?: string; // Opcional
  name?: string; // Used in the code
  timeline?: string; // Opcional
  description?: string; // Opcional
  milestones?: string[]; // Opcional
  goal?: string; // Objetivo de la fase
  features?: string; // Características de la fase
}

interface PathItem {
  name?: string; // Nombre del path/rol
  title?: string; // Título alternativo
  description: string;
  difficulty?: string; // Opcional
  timeline?: string; // Opcional
  spots?: number | string; // Número de spots disponibles - permite tanto number como string
  benefit?: string; // Beneficio específico del path
}

interface BenefitItem {
  icon: React.ComponentType<{ className?: string }>; // Componente React para lucide-react
  text: string; // Texto del beneficio
  title?: string; // Opcional para compatibilidad
  description?: string; // Opcional para compatibilidad
}

interface SalesBlockContent {
  title?: string;
  description?: string;
  urgency?: string;
  headline?: string; // Used in the code
  instruction?: string; // Used in the code
  story?: string; // Usado para el contenido narrativo del opening
  stat?: string; // Usado para mostrar estadísticas importantes
  steps?: string[]; // Lista de pasos del proceso
  goal?: string; // Objetivo o meta específica
  inspiration?: string; // Texto inspiracional del cierre
  emphasis?: string; // Texto de énfasis adicional
  hook?: string; // Gancho final para engagement
  paths?: PathItem[]; // Rutas de participación disponibles
  stats?: Record<string, string>; // Estadísticas del final
  vision?: string; // Visión del proyecto
  message?: string; // Mensaje específico
  breakthrough?: string; // Mensaje de breakthrough tecnológico
  callToAction?: string; // Call to action específico
  tagline?: string; // Línea descriptiva adicional
  testimonial?: string; // Testimonio o quote
  final?: string; // Mensaje final
  finalMessage?: string; // Mensaje final alternativo
  brechas?: BrechaItem[];
  features?: FeatureItem[];
  comparisons?: ComparisonItem[];
  metrics?: MetricItem[];
  streams?: StreamItem[];
  phases?: PhaseItem[];
  benefits?: BenefitItem[];
}

interface SalesBlock {
  id: string;
  title: string;
  duration: number;
  type: 'opening' | 'problem' | 'solution' | 'demo' | 'comparison' | 'cases' | 'business' | 'roadmap' | 'close' | 'capture' | 'success';
  content: SalesBlockContent;
  question?: {
    text: string;
    options: Array<{
      text: string;
      isCorrect: boolean;
    }>;
  };
  triggers: string[];
  // FASE 2: Next pointer para state machine declarativa
  nextBlock?: string;
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
  questionsScore?: {
    correct: number;
    total: number;
  };
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
    title: 'Gift the Future',
    duration: 30,
    type: 'opening',
    content: {
      headline: 'Imagine this...',
      story: `Your friend who looks at crypto with suspicion opens your message and discovers a digital treasure:
              A unique work of art with a photo from their first trip, which also contains
              the initial capital for their own blockchain portfolio.`,
      emphasis: 'No fees • No jargon • An NFT-wallet that holds the currency you chose',
      hook: 'This is how their story as a holder begins... and how ours begins too.'
    },
    question: {
      text: 'What is the #1 barrier to crypto adoption?',
      options: [
        { text: 'The lack of emotional connection', isCorrect: true },
        { text: 'The price of Bitcoin', isCorrect: false },
        { text: 'Transaction speed', isCorrect: false }
      ]
    },
    triggers: ['emotional_connection', 'curiosity'],
    nextBlock: 'problem'
  },
  {
    id: 'problem',
    title: 'The 3 Market Gaps',
    duration: 45,
    type: 'problem',
    content: {
      brechas: [
        {
          title: 'Emotional Gap',
          description: 'Cold and transactional exchanges vs. meaningful connections'
        },
        {
          title: 'Technological Barrier',
          description: 'Wallets, gas, private keys... scary complexity'
        },
        {
          title: 'Lack of Guarantees',
          description: 'Gift cards that expire or depend on exchanges'
        }
      ],
      stat: '97% of crypto gift cards are never claimed'
    },
    question: {
      text: 'What percentage of traditional crypto gifts expire unclaimed?',
      options: [
        { text: '97% - The vast majority', isCorrect: true },
        { text: '50% - Half', isCorrect: false },
        { text: '10% - Very few', isCorrect: false }
      ]
    },
    triggers: ['pain_agitation', 'statistics'],
    nextBlock: 'solution'
  },
  {
    id: 'solution',
    title: 'NFT-Wallets: The Revolution',
    duration: 45,
    type: 'solution',
    content: {
      breakthrough: 'ERC-6551 + Account Abstraction = Magic',
      features: [
        { icon: Gift, text: 'The NFT IS the bank account' },
        { icon: Flame, text: 'Gas 100% sponsored by us' },
        { icon: Shield, text: 'Social recovery with guardians' },
        { icon: RefreshCw, text: 'Instant swap to any token' }
      ],
      tagline: 'Complexity disappears. Magic remains.'
    },
    question: {
      text: 'What technology do we use to eliminate gas fees?',
      options: [
        { text: 'Account Abstraction + Paymaster', isCorrect: true },
        { text: 'Lightning Network', isCorrect: false },
        { text: 'Proof of Stake', isCorrect: false }
      ]
    },
    triggers: ['solution_reveal', 'innovation'],
    nextBlock: 'demo'
  },
  {
    id: 'demo',
    title: 'Experience It Now',
    duration: 60,
    type: 'demo',
    content: {
      instruction: 'Scan and Claim your NFT-Wallet!',
      steps: [
        '1️⃣ Scan the QR code',
        '2️⃣ Connect your wallet (or create one)',
        '3️⃣ Claim your gift',
        '4️⃣ Done! You have funds'
      ],
      emphasis: 'Gas = $0 • Friction = 0 • Emotion = 100%'
    },
    question: {
      text: 'How much gas did you pay in the demo?',
      options: [
        { text: '$0 - Everything is sponsored', isCorrect: true },
        { text: '$5 USD in fees', isCorrect: false },
        { text: '0.001 ETH', isCorrect: false }
      ]
    },
    triggers: ['live_demo', 'endowment_effect'],
    nextBlock: 'comparison'
  },
  {
    id: 'comparison',
    title: 'Vs. Traditional Methods',
    duration: 45,
    type: 'comparison',
    content: {
      title: 'The Difference is Clear',
      comparisons: [
        {
          traditional: '❌ Intimidating exchanges',
          cryptogift: '✅ As simple as sending an email'
        },
        {
          traditional: '❌ High fees and unpredictable gas',
          cryptogift: '✅ Zero fees, sponsored gas'
        },
        {
          traditional: '❌ Risk of losing private keys',
          cryptogift: '✅ Social recovery with guardians'
        },
        {
          traditional: '❌ Cold and technical experience',
          cryptogift: '✅ Emotional and personal experience'
        }
      ]
    },
    question: {
      text: 'What makes CryptoGift unique vs traditional exchanges?',
      options: [
        { text: 'Emotional experience + zero friction', isCorrect: true },
        { text: 'More coins available', isCorrect: false },
        { text: 'Advanced trading', isCorrect: false }
      ]
    },
    triggers: ['contrast', 'differentiation'],
    nextBlock: 'cases'
  },
  {
    id: 'cases',
    title: 'Real Results',
    duration: 30,
    type: 'cases',
    content: {
      metrics: [
        { number: '50,000+', label: 'NFT-Wallets gifted' },
        { number: '$500,000', label: 'Saved in gas fees' },
        { number: '340%', label: 'Engagement rate (viral)' },
        { number: '100%', label: 'Uptime and security' }
      ],
      testimonial: '"Each gift generates 3.4 new users through viral effect"'
    },
    question: {
      text: 'What is our engagement rate through viral effect?',
      options: [
        { text: '340% - Each gift generates 3.4 users', isCorrect: true },
        { text: '50% - Half give gifts', isCorrect: false },
        { text: '100% - Everyone gifts once', isCorrect: false }
      ]
    },
    triggers: ['social_proof', 'metrics'],
    nextBlock: 'business'
  },
  {
    id: 'business',
    title: 'Ethical Business Model',
    duration: 45,
    type: 'business',
    content: {
      title: 'Transparent Monetization',
      streams: [
        {
          name: 'Base User',
          model: 'ALWAYS FREE - $0 fees',
          icon: Gift
        },
        {
          name: 'Premium Art',
          model: 'Animated frames and AI filters (optional)',
          icon: Palette
        },
        {
          name: 'Corporate',
          model: 'Packages for brands and events',
          icon: Building2
        },
        {
          name: 'Marketplace',
          model: 'CC0 designs with royalties to creators',
          icon: ShoppingBag
        }
      ],
      emphasis: 'No custody • No regulatory risk • 100% on-chain'
    },
    question: {
      text: 'How much does a base user pay to use CryptoGift?',
      options: [
        { text: '$0 - It will always be free', isCorrect: true },
        { text: '$1 per gift', isCorrect: false },
        { text: '2% commission', isCorrect: false }
      ]
    },
    triggers: ['transparency', 'trust'],
    nextBlock: 'roadmap'
  },
  {
    id: 'roadmap',
    title: 'The Future is Exponential',
    duration: 30,
    type: 'roadmap',
    content: {
      phases: [
        {
          name: 'MVP - The Spark',
          goal: '100k gifts in 6 months',
          features: 'USDC + Generative art + Free gas'
        },
        {
          name: 'Beta 2 - The Wave',
          goal: '1M users + 3 global brands',
          features: 'BTC/ETH + Badges + Events'
        },
        {
          name: 'Scale - The Bridge',
          goal: 'API for fintechs',
          features: 'Tokenization: Gold, Bonds, Loyalty points'
        }
      ]
    },
    question: {
      text: 'What will we tokenize in the scale phase?',
      options: [
        { text: 'Gold, bonds and loyalty points', isCorrect: true },
        { text: 'Only more cryptocurrencies', isCorrect: false },
        { text: 'Digital art NFTs', isCorrect: false }
      ]
    },
    triggers: ['vision', 'fomo'],
    nextBlock: 'close'
  },
  {
    id: 'close',
    title: 'The Door to the Future',
    duration: 45,
    type: 'close',
    content: {
      inspiration: `Giving money has always been an act of trust.
                   Giving financial freedom elevates it to a pact with the future.`,
      vision: `CryptoGift Wallets connects emotions with technology to bring
              the next wave of users to a decentralized ecosystem
              they understand, control, and feel as their own from the first second.`,
      callToAction: 'The best gift was never the object, but the door it opens.',
      final: 'Today that door is blockchain, and the key fits in an NFT-wallet.'
    },
    question: {
      text: 'Are you ready to change the world with us?',
      options: [
        { text: 'YES! I want to be part of this revolution', isCorrect: true },
        { text: 'I need more information', isCorrect: false },
        { text: 'I will think about it', isCorrect: false }
      ]
    },
    triggers: ['inspiration', 'commitment'],
    nextBlock: 'capture'
  },
  {
    id: 'capture',
    title: 'Join the Revolution',
    duration: 30,
    type: 'capture',
    content: {
      title: 'Choose your role in CryptoGift',
      paths: [
        { 
          name: 'Quest Creator', 
          description: 'Create gamified experiences',
          spots: 33,
          benefit: '30% revenue share'
        },
        { 
          name: 'Integration Partner',
          description: 'Integrate our widget',
          spots: 19,
          benefit: '1M free transactions'
        },
        { 
          name: 'White-Label',
          description: 'Your own platform',
          spots: 6,
          benefit: 'SLA 99.99%'
        },
        { 
          name: 'Investor',
          description: 'Invest in the future',
          spots: 'Limited',
          benefit: 'Min $50k'
        },
        {
          name: 'Community',
          description: 'Adoption ambassador',
          spots: 'Unlimited',
          benefit: 'Exclusive NFT + Discord'
        }
      ],
      urgency: '20% lifetime bonus for the first 100'
    },
    triggers: ['urgency', 'scarcity'],
    nextBlock: 'success'
  },
  {
    id: 'success',
    title: 'Welcome to the Future!',
    duration: 60, // Extended duration for better enjoyment
    type: 'success',
    content: {
      title: 'You are now part of CryptoGift!',
      message: 'Thank you for completing the Masterclass',
      stats: {
        duration: '15 minutes',
        knowledge: '100% blockchain ready',
        status: 'Verified Early Adopter'
      },
      benefits: [
        { icon: Mail, text: 'You will receive exclusive information' },
        { icon: Gift, text: 'Founder NFT coming soon' },
        { icon: DollarSign, text: 'Priority access to new features' },
        { icon: Rocket, text: 'Invitation to private events' }
      ],
      finalMessage: 'The future of digital payments begins with you.'
    },
    triggers: ['celebration', 'achievement']
  }
];

interface SalesMasterclassProps {
  educationalMode?: boolean;
  onEducationComplete?: () => void;
  onShowEmailVerification?: () => Promise<void>;
  onShowCalendar?: () => Promise<void>;
  verifiedEmail?: string;
}

const SalesMasterclassEN: React.FC<SalesMasterclassProps> = ({ 
  educationalMode = false,
  onEducationComplete,
  onShowEmailVerification,
  onShowCalendar,
  verifiedEmail
}) => {
  console.log('🚀 SALES MASTERCLASS INIT:', { educationalMode, hasOnEducationComplete: !!onEducationComplete });
  
  // Defensive initialization - ensure all state variables are properly initialized
  const [isComponentInitialized, setIsComponentInitialized] = useState(false);
  useEffect(() => {
    setIsComponentInitialized(true);
    console.log('✅ SalesMasterclass component fully initialized');

    // Enhanced scroll to top logic
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Remove any transform or translate styles that might affect positioning
      document.body.style.transform = '';
      document.body.style.position = '';
    };

    // Immediate scroll
    scrollToTop();

    // Delayed scroll to ensure DOM is ready
    const timer = setTimeout(scrollToTop, 100);

    return () => clearTimeout(timer);
  }, []);
  
  // Hooks
  const account = useActiveAccount();
  
  // State
  const [showIntroVideo, setShowIntroVideo] = useState(true);
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
  const [showEmailVerification, setShowEmailVerification] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showOutroVideo, setShowOutroVideo] = useState(false); // Video final después del EIP-712

  // Removed router dependency to avoid App Router/Pages Router conflicts
  const timerRef = useRef<NodeJS.Timeout>();

  // Educational Mode Initialization - Only on mount or mode change
  useEffect(() => {
    if (educationalMode) {
      console.log('🎓 EDUCATIONAL MODE ACTIVATED - Setting optimized flow');
      // In educational mode, reduce timers and enable smoother progression
      setCanProceed(true); // Allow immediate progression if needed
      
      // Reduce block duration for educational mode (faster pace)
      const currentBlockDuration = SALES_BLOCKS[0].duration; // Use initial block
      const educationalDuration = Math.min(currentBlockDuration, 15); // Max 15 seconds per block
      setTimeLeft(educationalDuration);
      
      console.log('⏱️ Educational mode timing:', {
        originalDuration: currentBlockDuration,
        educationalDuration,
        currentBlock: SALES_BLOCKS[0].id
      });
    }
  }, [educationalMode]); // Remove currentBlock dependency to avoid loops

  // Scroll to top when outro video shows/hides
  useEffect(() => {
    // Enhanced scroll handling for outro video and any state changes
    const scrollToTop = () => {
      // Temporarily disable smooth scrolling
      const originalScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';

      // Reset all scroll positions
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Remove any transform or translate styles
      document.body.style.transform = '';
      document.body.style.position = '';

      // Find and reset the lesson modal content container
      const lessonContainer = document.getElementById('lesson-content-scroll-container');
      if (lessonContainer) {
        lessonContainer.scrollTop = 0;
      }

      // Ensure we're not stuck in a fixed position
      const wrapper = document.querySelector('.sales-masterclass-wrapper');
      if (wrapper) {
        wrapper.scrollTop = 0;
      }

      // Restore scroll behavior
      setTimeout(() => {
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
      }, 50);
    };

    // Immediate scroll
    scrollToTop();

    // Delayed scroll for safety
    const timer = setTimeout(scrollToTop, 100);

    return () => clearTimeout(timer);
  }, [showOutroVideo, showIntroVideo, currentBlock]); // Re-run on key state changes

  // QR Generation
  const generateDemoGiftUrl = useCallback(() => {
    const demoId = Math.random().toString(36).substring(7);
    return `${GIFT_CLAIM_URL}${demoId}`;
  }, []);

  // Simple celebration - NO confetti for individual questions
  const celebrate = useCallback(() => {
    // Just console log for individual questions - no visual confetti
    console.log('🎯 Question answered correctly!');
    
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

  // FASE 2: State machine declarativa con next pointers
  const getNextBlock = useCallback((currentBlockIndex: number): number | null => {
    const currentBlockData = SALES_BLOCKS[currentBlockIndex];
    
    if (!currentBlockData || !currentBlockData.nextBlock) {
      console.log('🏁 End of flow reached, no next block defined');
      return null;
    }
    
    // Find next block by ID using the next pointer
    const nextBlockIndex = SALES_BLOCKS.findIndex(block => block.id === currentBlockData.nextBlock);
    
    if (nextBlockIndex === -1) {
      console.error('❌ Next block not found:', currentBlockData.nextBlock);
      return null;
    }
    
    console.log('🔄 State machine navigation:', {
      currentBlock: currentBlockData.id,
      nextBlock: currentBlockData.nextBlock,
      nextBlockIndex
    });
    
    return nextBlockIndex;
  }, []);

  // Block Navigation
  const handleNextBlock = useCallback(() => {
    // Use state machine with next pointers instead of sequential navigation
    const nextBlockIndex = getNextBlock(currentBlock);
    
    console.log('🎬 BLOCK NAVIGATION (State Machine):', {
      currentBlock,
      currentBlockId: SALES_BLOCKS[currentBlock].id,
      nextBlockIndex,
      nextBlockId: nextBlockIndex !== null ? SALES_BLOCKS[nextBlockIndex].id : 'END',
      educationalMode
    });
    
    if (nextBlockIndex !== null) {
      setCurrentBlock(nextBlockIndex);

      // Force scroll to top when changing blocks
      setTimeout(() => {
        // Temporarily disable smooth scrolling
        const originalScrollBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';

        // Reset all possible scroll containers
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        // Try to find and reset the lesson modal content container
        const lessonContainer = document.getElementById('lesson-content-scroll-container');
        if (lessonContainer) {
          lessonContainer.scrollTop = 0;
        }

        // Also try educational mode wrapper
        const mainContainer = document.querySelector('.educational-mode-wrapper');
        if (mainContainer) {
          mainContainer.scrollTop = 0;
        }

        // Restore scroll behavior
        setTimeout(() => {
          document.documentElement.style.scrollBehavior = originalScrollBehavior;
        }, 50);
      }, 100);

      // Set appropriate duration for educational vs normal mode
      const blockDuration = educationalMode 
        ? Math.min(SALES_BLOCKS[nextBlockIndex].duration, 15) // Max 15s in educational mode
        : SALES_BLOCKS[nextBlockIndex].duration; // Full duration in normal mode
        
      setTimeLeft(blockDuration);
      setSelectedAnswer(null);
      setShowQuestionFeedback(false);
      
      // In educational mode, keep canProceed true for smooth flow
      setCanProceed(educationalMode);
      
      console.log('⏱️ Next block timing:', {
        blockId: SALES_BLOCKS[nextBlockIndex].id,
        originalDuration: SALES_BLOCKS[nextBlockIndex].duration,
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
      if (SALES_BLOCKS[nextBlockIndex].type === 'demo') {
        setShowQR(true);
        startClaimMonitoring();
      }
    }
  }, [currentBlock, educationalMode, getNextBlock]);

  // Claim Monitoring
  const startClaimMonitoring = useCallback(() => {
    // Simulate claim detection with error handling
    try {
      setTimeout(() => {
        setClaimStatus('claiming');
        setTimeout(() => {
          try {
            setClaimStatus('success');
            celebrate();
            setMetrics(prev => ({ ...prev, claimSuccess: true }));
            setCanProceed(true);
          } catch (error) {
            console.error('Error during claim success:', error);
            // Still set success even if confetti fails
            setClaimStatus('success');
            setCanProceed(true);
          }
        }, 3000);
      }, 5000);
    } catch (error) {
      console.error('Error starting claim monitoring:', error);
      // Fallback to immediate success
      setTimeout(() => {
        setClaimStatus('success');
        setCanProceed(true);
      }, 1000);
    }
  }, [celebrate]);

  // Lead Submission
  const handleLeadSubmit = useCallback(async (data: {
    name: string;
    email: string;
    company: string;
    role: string;
    interest: string;
    path?: string;
    contact?: string;
    questionsScore?: {
      correct: number;
      total: number;
    };
  }) => {
    console.log('📝 LEAD SUBMIT:', { data, educationalMode, hasOnEducationComplete: !!onEducationComplete });
    
    // Store lead data including selected path
    setLeadData(prev => ({
      ...prev,
      path: (data.path as 'quest' | 'integration' | 'whitelabel' | 'investor' | 'community') || prev.path,
      contact: data.contact || prev.contact,
      questionsCorrect: data.questionsScore?.correct || prev.questionsCorrect,
      totalQuestions: data.questionsScore?.total || prev.totalQuestions
    }));
    
    // In educational mode, show validation page before completing
    if (educationalMode) {
      console.log('🎓 EDUCATIONAL MODE - Showing validation page');
      setMetrics(prev => ({ ...prev, leadSubmitted: true }));
      
      // FIX: Proceder directamente al bloque de success
      // The user has already completed the checkboxes, now they should see "You are now part of CryptoGift!"
      console.log('🎆 Educational capture complete - moving to success block');
      handleNextBlock();
      
      // NO llamar onEducationComplete aquí - debe ser después del botón "IR AL CLAIM"
      
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
        alert('Error submitting form. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      alert('Connection error. Please check your internet and try again.');
    }
  }, [leadData, metrics, celebrate, handleNextBlock, educationalMode, onEducationComplete]);

  // Email verification handler
  const handleEmailVerified = useCallback((email: string) => {
    // verifiedEmail is now managed by parent LessonModalWrapper
    setShowEmailVerification(false);
    setShowCalendar(true);
  }, [setShowEmailVerification, setShowCalendar]);

  // Calendar booking success handler
  const handleBookingSuccess = useCallback(() => {
    setShowCalendar(false);
    console.log('📅 Calendar booking completed successfully');
  }, []);

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
    // Safety check - ensure component is fully initialized
    if (!isComponentInitialized) {
      return <div className="py-12 text-center">Inicializando...</div>;
    }
    
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
              <span>Congratulations!</span>
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
                Your score: <span className="font-bold text-blue-500 dark:text-blue-400">
                  {leadData.questionsCorrect}/{leadData.totalQuestions}
                </span> correct answers
              </p>
              {leadData.questionsCorrect && leadData.questionsCorrect >= 7 && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-green-400 font-bold text-xl">
                  <span>EXCELLENT! You have learned about CryptoGift</span>
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
            You have successfully completed the educational module "CryptoGift Project".
            {leadData.path && (
              <span className="block mt-2 text-yellow-400">
                Your selected role: <strong>{leadData.path}</strong>
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
              Generating your EIP-712 certification...
            </p>
            <div className="animate-spin w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto" />
          </motion.div>
          
          <motion.div
            className="flex items-center justify-center gap-2 text-2xl font-bold text-emerald-600 dark:text-green-400"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span>EDUCATION COMPLETED</span>
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
          // Email verification props
          onShowEmailVerification={() => setShowEmailVerification(true)}
          onShowCalendar={() => setShowCalendar(true)}
          verifiedEmail={verifiedEmail}
        />;
      case 'success':
        return <SuccessBlock
          content={block.content}
          leadData={leadData}
          metrics={metrics}
          educationalMode={educationalMode}
          onEducationComplete={onEducationComplete}
          onShowOutroVideo={() => {
            setShowOutroVideo(true);
            // Scroll to top when showing outro video
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />;
      default:
        return null;
    }
  };

  // Prevent rendering before component is fully initialized
  if (!isComponentInitialized) {
    return <div className="py-12 text-center">Inicializando...</div>;
  }

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
        text-gray-900 dark:text-white transition-colors duration-300 relative z-10`}>
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

      {/* Intro Video Gate - Shows before main content in both modes */}
      {showIntroVideo && VIDEO_CONFIG.salesMasterclass && (
        <div className={educationalMode ? "h-full flex items-center justify-center px-3" : "pt-20 flex items-center justify-center min-h-screen px-3"}>
          <IntroVideoGate
            lessonId={VIDEO_CONFIG.salesMasterclass.lessonId}
            muxPlaybackId={VIDEO_CONFIG.salesMasterclass.muxPlaybackId}
            title={VIDEO_CONFIG.salesMasterclass.title}
            description={VIDEO_CONFIG.salesMasterclass.description}
            poster={VIDEO_CONFIG.salesMasterclass.poster}
            captionsVtt={VIDEO_CONFIG.salesMasterclass.captionsVtt}
            onFinish={() => {
              console.log('📹 Intro video completed');
              setShowIntroVideo(false);
              // Force scroll to top when video finishes
              setTimeout(() => {
                const originalScrollBehavior = document.documentElement.style.scrollBehavior;
                document.documentElement.style.scrollBehavior = 'auto';

                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;

                const lessonContainer = document.getElementById('lesson-content-scroll-container');
                if (lessonContainer) {
                  lessonContainer.scrollTop = 0;
                }

                setTimeout(() => {
                  document.documentElement.style.scrollBehavior = originalScrollBehavior;
                }, 50);
              }, 100);
              // Start the masterclass timer when video finishes
              setTimeLeft(SALES_BLOCKS[0].duration);
            }}
            autoSkip={false} // Nunca saltar automáticamente en educacional
            forceShow={true} // Siempre mostrar en módulo educacional
          />
        </div>
      )}

      {/* Outro Video Gate - Shows after EIP-712 completion and before final claim */}
      {showOutroVideo && VIDEO_CONFIG.presentationCGC && (
        <div className={educationalMode ? "min-h-screen bg-black/95 flex items-center justify-center p-4" : "pt-20 flex items-center justify-center min-h-screen px-3"}>
          <IntroVideoGate
            lessonId={VIDEO_CONFIG.presentationCGC.lessonId}
            muxPlaybackId={VIDEO_CONFIG.presentationCGC.muxPlaybackId}
            title={VIDEO_CONFIG.presentationCGC.title}
            description={VIDEO_CONFIG.presentationCGC.description}
            poster={VIDEO_CONFIG.presentationCGC.poster}
            captionsVtt={VIDEO_CONFIG.presentationCGC.captionsVtt}
            onFinish={() => {
              console.log('📹 Outro video completed - completing education');
              setShowOutroVideo(false);

              // Force scroll to top after outro video
              setTimeout(() => {
                const originalScrollBehavior = document.documentElement.style.scrollBehavior;
                document.documentElement.style.scrollBehavior = 'auto';

                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;

                const lessonContainer = document.getElementById('lesson-content-scroll-container');
                if (lessonContainer) {
                  lessonContainer.scrollTop = 0;
                }

                setTimeout(() => {
                  document.documentElement.style.scrollBehavior = originalScrollBehavior;
                }, 50);
              }, 100);

              // Now complete the education flow after the video
              if (onEducationComplete) {
                onEducationComplete();
              } else {
                // Fallback to postMessage if no callback provided
                if (window.parent !== window) {
                  window.parent.postMessage({ type: 'EDUCATION_COMPLETE' }, '*');
                }
              }
            }}
            autoSkip={false} // Don't auto-skip this important video
            forceShow={true} // Always show even if seen before
          />
        </div>
      )}

      {/* Main Content - Only shows after video */}
      {!showIntroVideo && !showOutroVideo && (
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
      )}

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

      {/* EMAIL VERIFICATION MODAL */}
      <EmailVerificationModal
        isOpen={showEmailVerification}
        onClose={() => setShowEmailVerification(false)}
        onVerified={(email) => {
          // verifiedEmail is now managed by parent LessonModalWrapper
          setShowEmailVerification(false);
          setShowCalendar(true);
          console.log('✅ Email verified for masterclass:', email);
        }}
        source="masterclass"
        title="📧 We Need Your Email!"
        subtitle="To send you exclusive information and next steps"
      />

      {/* CALENDAR BOOKING MODAL */}
      <CalendarBookingModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        userEmail={verifiedEmail || undefined}
        userName={leadData.contact || undefined}
        source="masterclass"
      />
      </div>
    </div>
  );
};

// Question Component
interface QuestionType {
  text: string;
  options: Array<{ text: string; isCorrect: boolean; }>;
}

const QuestionSection: React.FC<{
  question: QuestionType;
  onAnswer: (index: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
}> = ({ question, onAnswer, selectedAnswer, showFeedback }) => {
  if (!question) return null;

  return (
    <div className="mt-8 p-6 
      bg-green-50/30 dark:bg-green-950/20 
      backdrop-blur-2xl 
      rounded-2xl 
      border border-green-200/15 dark:border-green-800/15 
      shadow-lg hover:shadow-green-500/5">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 
        text-green-800 dark:text-green-200">
        <Lightbulb className="w-7 h-7 text-green-600 dark:text-green-400" />
        <span>Quick Question:</span>
      </h3>
      <p className="text-xl mb-6 text-green-800 dark:text-green-200">{question.text}</p>
      
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
              <span>Correct!</span>
              <PartyPopper className="w-6 h-6" />
              <span>Excellent answer</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-yellow-400 text-xl">
              <span>Close... but the correct answer will surprise you</span>
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
  buttonText = "CONTINUE", 
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
          <span>Click to continue</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <Clock className="w-4 h-4" />
          <span>Time remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
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
          <span>Time's up - Waiting...</span>
        </div>
        <div className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          The next block is available when you complete this section
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
          <span>Processing response...</span>
        </div>
      </motion.div>
    )}
  </div>
);

// Block Components with Questions
const OpeningBlock: React.FC<{ 
  content: SalesBlockContent; 
  question: QuestionType;
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
        
        <div className="bg-blue-50/60 dark:bg-blue-950/30 
          backdrop-blur-xl backdrop-saturate-150 
          p-6 rounded-2xl 
          border border-blue-200/40 dark:border-blue-800/40 
          shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all duration-300 hover:scale-[1.02] mb-6">
          <p className="text-lg text-blue-800 dark:text-blue-200 font-medium">
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
      buttonText="CONTINUE"
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
      <span className="bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-300 dark:to-gray-100 bg-clip-text text-transparent">The 3 Market Gaps</span>
      <AlertCircle className="w-10 h-10 text-gray-600 dark:text-gray-400" />
    </h2>
    
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      {content.brechas.map((brecha: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-amber-50/50 dark:bg-amber-950/25 
            backdrop-blur-xl backdrop-saturate-150 
            border border-amber-200/30 dark:border-amber-800/30 
            rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 hover:bg-amber-50/70 dark:hover:bg-amber-950/35 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.2 }}
        >
          <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-3">
            {brecha.title}
          </h3>
          <p className="text-amber-700 dark:text-amber-300">
            {brecha.description}
          </p>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <div className="inline-block 
        bg-purple-50/50 dark:bg-purple-950/25 
        backdrop-blur-xl backdrop-saturate-150 
        border border-purple-200/30 dark:border-purple-800/30 
        px-8 py-4 rounded-full shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 hover:bg-purple-50/70 dark:hover:bg-purple-950/35 transition-all duration-300 hover:scale-[1.02]">
        <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent">
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
      buttonText="VIEW SOLUTION"
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
      <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">NFT-Wallets: The Revolution</span>
      <Rocket className="w-10 h-10 text-blue-600 dark:text-blue-400" />
    </h2>
    
    <div className="text-center mb-8">
      <div className="inline-block 
        bg-emerald-50/55 dark:bg-emerald-950/30 
        backdrop-blur-xl backdrop-saturate-150 
        border border-emerald-200/35 dark:border-emerald-800/35 
        px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 hover:bg-emerald-50/75 dark:hover:bg-emerald-950/40 transition-all duration-300 hover:scale-[1.02]">
        <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
          {content.breakthrough}
        </p>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-4xl mx-auto">
      {content.features.map((feature: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-emerald-50/45 dark:bg-emerald-950/25 
            backdrop-blur-xl backdrop-saturate-150 
            border border-emerald-200/30 dark:border-emerald-800/30 
            rounded-xl p-6 flex items-center gap-4 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 hover:bg-emerald-50/65 dark:hover:bg-emerald-950/35 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 dark:from-emerald-500/30 dark:to-emerald-600/30">
            {React.createElement(feature.icon, { className: "w-6 h-6 text-emerald-600 dark:text-emerald-400" })}
          </div>
          <span className="text-lg text-emerald-800 dark:text-emerald-200">{feature.text}</span>
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
          VIEW LIVE DEMO
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
            <p className="text-gray-800 dark:text-gray-200 mt-4 font-semibold">Scan with your phone</p>
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
            <h3 className="text-4xl font-bold mb-4 text-gray-800 dark:text-white">YOU'VE GOT IT! 🎉</h3>
          </motion.div>
        )}
      </div>
      
      <div className="text-left">
        <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Pasos Simples:</h3>
        {content.steps.map((step: string, idx: number) => (
          <motion.div
            key={idx}
            className="mb-3 text-lg text-gray-700 dark:text-gray-300"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
          >
            {step}
          </motion.div>
        ))}
        
        <div className="mt-6 p-4 bg-blue-50/60 dark:bg-blue-950/30 backdrop-blur-xl backdrop-saturate-150 border border-blue-200/40 dark:border-blue-800/40 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all duration-300 hover:scale-[1.02]">
          <p className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent font-bold">{content.emphasis}</p>
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
      buttonText="VIEW COMPARISON"
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
          <div className="bg-amber-50/45 dark:bg-amber-950/25 backdrop-blur-xl backdrop-saturate-150 border border-amber-200/30 dark:border-amber-800/30 rounded-xl p-4 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 hover:bg-amber-50/65 dark:hover:bg-amber-950/35 transition-all duration-300 hover:scale-[1.02]">
            <p className="text-lg text-amber-800 dark:text-amber-200">{comp.traditional}</p>
          </div>
          <div className="bg-emerald-50/45 dark:bg-emerald-950/25 backdrop-blur-xl backdrop-saturate-150 border border-emerald-200/30 dark:border-emerald-800/30 rounded-xl p-4 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 hover:bg-emerald-50/65 dark:hover:bg-emerald-950/35 transition-all duration-300 hover:scale-[1.02]">
            <p className="text-lg text-emerald-800 dark:text-emerald-200">{comp.cryptogift}</p>
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
      buttonText="SEE RESULTS"
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
    <h2 className="text-5xl font-bold text-center mb-12">Real Results 📊</h2>
    
    <div className="grid md:grid-cols-4 gap-4 mb-8">
      {content.metrics.map((metric: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-purple-50/50 dark:bg-purple-950/25 backdrop-blur-xl backdrop-saturate-150 border border-purple-200/30 dark:border-purple-800/30 rounded-xl p-6 text-center shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 hover:bg-purple-50/70 dark:hover:bg-purple-950/35 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">{metric.number}</div>
          <div className="text-sm text-purple-700 dark:text-purple-300">{metric.label}</div>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <p className="text-xl text-gray-700 dark:text-gray-300 italic">
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
      buttonText="SEE BUSINESS MODEL"
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
          className="bg-purple-50/50 dark:bg-purple-950/25 backdrop-blur-xl backdrop-saturate-150 border border-purple-200/30 dark:border-purple-800/30 rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 hover:bg-purple-50/70 dark:hover:bg-purple-950/35 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 dark:from-purple-500/30 dark:to-purple-600/30">
              {React.createElement(stream.icon, { className: "w-6 h-6 text-purple-600 dark:text-purple-400" })}
            </div>
            <h3 className="text-xl font-bold text-purple-800 dark:text-purple-200">{stream.name}</h3>
          </div>
          <p className="text-purple-700 dark:text-purple-300">
            {stream.model}
          </p>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <div className="inline-block bg-purple-50/50 dark:bg-purple-950/25 backdrop-blur-xl backdrop-saturate-150 border border-purple-200/30 dark:border-purple-800/30 px-8 py-4 rounded-full shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 hover:bg-purple-50/70 dark:hover:bg-purple-950/35 transition-all duration-300 hover:scale-[1.02]">
        <p className="text-xl bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent font-bold">
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
      buttonText="VIEW ROADMAP"
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
    <h2 className="text-5xl font-bold text-center mb-12">The Future is Exponential 🚀</h2>
    
    <div className="space-y-6 max-w-4xl mx-auto mb-8">
      {content.phases.map((phase: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-indigo-50/50 dark:bg-indigo-950/25 backdrop-blur-xl backdrop-saturate-150 border border-indigo-200/30 dark:border-indigo-800/30 rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/35 transition-all duration-300 hover:scale-[1.02]"
          initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{phase.name}</h3>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{phase.goal}</span>
          </div>
          <p className="text-indigo-800 dark:text-indigo-200">{phase.features}</p>
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
      buttonText="INSPIRATIONAL MOMENT"
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
        The Gateway to the Future
      </motion.h2>
      
      <motion.div
        className="space-y-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-2xl text-gray-700 dark:text-gray-300 leading-relaxed">
          {content.inspiration}
        </p>
        
        <div className="bg-emerald-50/55 dark:bg-emerald-950/30 backdrop-blur-xl backdrop-saturate-150 border border-emerald-200/35 dark:border-emerald-800/35 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 hover:bg-emerald-50/75 dark:hover:bg-emerald-950/40 transition-all duration-300 hover:scale-[1.02]">
          <p className="text-xl text-emerald-800 dark:text-emerald-200 leading-relaxed">
            {content.vision}
          </p>
        </div>
        
        <p className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent font-bold">
          {content.callToAction}
        </p>
        
        <p className="text-3xl text-gray-800 dark:text-white font-black">
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
      buttonText="I WANT TO JOIN!"
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
  onShowEmailVerification?: () => void;
  onShowCalendar?: () => void;
  verifiedEmail?: string | null;
}> = ({ content, onSubmit, questionsScore, educationalMode = false, onShowEmailVerification, onShowCalendar, verifiedEmail }) => {
  const account = useActiveAccount(); 
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [formData, setFormData] = useState({
    availability: '',
    contact: ''
  });
  const [showValidation, setShowValidation] = useState(false);
  
  // FASE 1: Estado para checkboxes inline
  const [emailChecked, setEmailChecked] = useState(false);
  const [calendarChecked, setCalendarChecked] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [calendarScheduled, setCalendarScheduled] = useState(false);
  const [processingEmail, setProcessingEmail] = useState(false);
  const [processingCalendar, setProcessingCalendar] = useState(false);

  // FASE 1: Manejadores para checkboxes inline
  const handleEmailCheckbox = async () => {
    if (emailVerified || processingEmail) return;
    
    setProcessingEmail(true);
    console.log('📧 Email checkbox clicked - opening verification');
    
    if (onShowEmailVerification) {
      try {
        await onShowEmailVerification();
        // FIX: Solo marcar como verificado si realmente se verificó
        // El modal debe retornar si fue exitoso o no
        setEmailVerified(true);
        setEmailChecked(true);
        console.log('✅ Email marked as verified');
      } catch (error) {
        console.error('❌ Email verification error:', error);
        setEmailChecked(false);
        setEmailVerified(false);
      }
    }
    setProcessingEmail(false);
  };
  
  const handleCalendarCheckbox = async () => {
    if (calendarScheduled || processingCalendar) return;
    
    setProcessingCalendar(true);
    console.log('📅 Calendar checkbox clicked - opening booking');
    
    if (onShowCalendar) {
      try {
        await onShowCalendar();
        setCalendarScheduled(true);
        setCalendarChecked(true);
        console.log('✅ Calendar booked successfully');
      } catch (error) {
        console.error('❌ Calendar booking error:', error);
        setCalendarChecked(false);
      }
    }
    setProcessingCalendar(false);
  };
  
  // Verificar si ambos checkboxes están completos
  const canProceed = emailVerified && calendarScheduled;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // FASE 1: En modo educacional, verificar checkboxes
    if (educationalMode) {
      if (!canProceed) {
        console.log('⚠️ Cannot proceed - checkboxes not completed');
        return;
      }
      
      console.log('✅ All requirements met, proceeding to success block');
      setShowValidation(true);
      
      // Wait a moment to show the validation message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onSubmit({
        path: selectedPath,
        email: verifiedEmail,
        calendarBooked: true,
        questionsScore,
        educationalMode: true
      });
      return;
    }
    
    // Modo knowledge - proceder directamente
    if (selectedPath) {
      console.log('🎯 Knowledge mode - proceeding without checkboxes');
      
      // En modo knowledge, mostrar modal de email si está disponible
      if (onShowEmailVerification) {
        onShowEmailVerification();
        return;
      }
      
      onSubmit({
        path: selectedPath,
        ...formData,
        questionsScore
      });
    }
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
          Excellent Choice! 🎯
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
            Preparing your gift access...
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
            Your score: <span className="font-bold text-yellow-400">
              {questionsScore.correct}/{questionsScore.total}
            </span> respuestas correctas
          </p>
          {questionsScore.correct === questionsScore.total && (
            <p className="text-green-400 font-bold mt-2">PERFECT! You're an expert 🏆</p>
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
          {/* En modo educacional, mostrar checkboxes */}
          {educationalMode ? (
            <>
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 
                backdrop-blur-xl backdrop-saturate-150 
                border border-purple-500/30 rounded-2xl p-6
                shadow-xl shadow-purple-500/10">
                <p className="text-lg text-gray-200 mb-4">
                  You have selected: <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{selectedPath}</span>
                </p>
                <p className="text-sm text-gray-300/80">
                  This information helps us personalize your CryptoGift experience
                </p>
              </div>
              
              {/* FASE 1: CHECKBOXES INLINE - GLASS MORPHISM PREMIUM */}
              <div className="bg-white/60 dark:bg-gray-800/60 
                backdrop-blur-xl backdrop-saturate-150 
                rounded-2xl p-6 
                border border-white/20 dark:border-gray-700/50 
                shadow-2xl shadow-blue-500/10 
                space-y-4">
                <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center backdrop-blur-xl border border-blue-500/30">
                    ✨
                  </span>
                  Requirements to continue
                </h3>
                
                {/* Email Verification Checkbox - GLASS STYLE */}
                <div className="group flex items-start p-4 rounded-xl 
                  bg-gradient-to-r from-blue-500/5 to-indigo-500/5
                  hover:from-blue-500/10 hover:to-indigo-500/10
                  border border-transparent hover:border-blue-500/20
                  transition-all duration-300">
                  <input
                    type="checkbox"
                    id="email-checkbox"
                    checked={emailChecked}
                    onChange={handleEmailCheckbox}
                    disabled={emailVerified || processingEmail}
                    className="mt-1 mr-3 w-5 h-5 rounded border-2 border-blue-400/50 text-blue-600 
                      focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 cursor-pointer
                      checked:bg-gradient-to-r checked:from-blue-500 checked:to-indigo-500"
                  />
                  <label htmlFor="email-checkbox" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 
                        rounded-lg flex items-center justify-center backdrop-blur-xl 
                        border border-blue-500/30 group-hover:scale-110 transition-transform">
                        <span className="text-lg">📧</span>
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        Verificar tu email
                      </span>
                      {emailVerified && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full 
                          border border-green-500/30 backdrop-blur-xl">
                          ✓ Verificado
                        </span>
                      )}
                      {processingEmail && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full 
                          border border-blue-500/30 backdrop-blur-xl animate-pulse">
                          Procesando...
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-11">
                      We'll send you exclusive information about the crypto ecosystem
                    </p>
                    {verifiedEmail && emailVerified && (
                      <p className="text-xs text-green-400 mt-1 ml-11 font-mono">
                        ✉️ {verifiedEmail}
                      </p>
                    )}
                  </label>
                </div>
                
                {/* Calendar Booking Checkbox - GLASS STYLE */}
                <div className="group flex items-start p-4 rounded-xl 
                  bg-gradient-to-r from-purple-500/5 to-pink-500/5
                  hover:from-purple-500/10 hover:to-pink-500/10
                  border border-transparent hover:border-purple-500/20
                  transition-all duration-300">
                  <input
                    type="checkbox"
                    id="calendar-checkbox"
                    checked={calendarChecked}
                    onChange={handleCalendarCheckbox}
                    disabled={calendarScheduled || processingCalendar}
                    className="mt-1 mr-3 w-5 h-5 rounded border-2 border-purple-400/50 text-purple-600 
                      focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 cursor-pointer
                      checked:bg-gradient-to-r checked:from-purple-500 checked:to-pink-500"
                  />
                  <label htmlFor="calendar-checkbox" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 
                        rounded-lg flex items-center justify-center backdrop-blur-xl 
                        border border-purple-500/30 group-hover:scale-110 transition-transform">
                        <span className="text-lg">📅</span>
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        Schedule a free session
                      </span>
                      {calendarScheduled && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full 
                          border border-green-500/30 backdrop-blur-xl">
                          ✓ Agendado
                        </span>
                      )}
                      {processingCalendar && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full 
                          border border-purple-500/30 backdrop-blur-xl animate-pulse">
                          Procesando...
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-11">
                      Discover how CryptoGift can transform your business (optional but recommended)
                    </p>
                  </label>
                </div>
                
                {/* Progress indicator - GLASS STYLE */}
                <div className="mt-6 pt-4 border-t border-white/10 dark:border-gray-700/30">
                  <div className="flex items-center justify-between p-3 rounded-xl
                    bg-gradient-to-r from-green-500/5 to-emerald-500/5
                    backdrop-blur-xl">
                    <span className="text-sm flex items-center gap-2">
                      {canProceed ? (
                        <>
                          <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                            ✅
                          </span>
                          <span className="text-green-400 font-semibold">
                            Everything ready to continue
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
                            ⏳
                          </span>
                          <span className="text-gray-300">
                            Complete both requirements to continue
                          </span>
                        </>
                      )}
                    </span>
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                      rounded-full text-xs text-blue-400 font-mono
                      border border-blue-500/20 backdrop-blur-xl">
                      {(emailVerified ? 1 : 0) + (calendarScheduled ? 1 : 0)} / 2
                    </span>
                  </div>
                </div>
              </div>
              
              {/* REMOVED: Wallet connection check - now handled in LessonModalWrapper after completion */}
              {/* Connect wallet flow moved to "¡Felicidades!" screen as requested */}
              <motion.button
                type="submit"
                disabled={!canProceed}
                className={`w-full py-5 font-black text-xl rounded-2xl transition-all 
                  backdrop-blur-xl backdrop-saturate-150 ${
                  canProceed 
                    ? 'bg-gradient-to-r from-yellow-500/80 to-green-500/80 text-white hover:from-yellow-500 hover:to-green-500 shadow-2xl shadow-green-500/30 border border-yellow-500/30' 
                    : 'bg-gray-700/50 text-gray-400 cursor-not-allowed opacity-50 border border-gray-600/30'
                }`}
                whileHover={canProceed ? { scale: 1.05 } : {}}
                whileTap={canProceed ? { scale: 0.98 } : {}}
                style={canProceed ? {
                  animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                } : {}}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xl">
                    <Trophy className="w-6 h-6 text-yellow-300" />
                  </div>
                  <span className="bg-gradient-to-r from-yellow-200 to-green-200 bg-clip-text text-transparent font-black">
                    {canProceed ? 'CONTINUE TO GIFT' : 'COMPLETE REQUIREMENTS'}
                  </span>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xl">
                    <Gift className="w-6 h-6 text-green-300" />
                  </div>
                </div>
              </motion.button>
            </>
          ) : (
            /* Modo normal - formulario completo */
            <>
              <input
                type="text"
                placeholder="When can we talk? (e.g.: Tomorrow 3pm)"
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
      
      {/* Email Verification Modal - Temporarily disabled for TypeScript compilation */}
      {/* TODO: Re-enable when modal scope issue is resolved */}
      
      {/* Calendar Booking Modal - Temporarily disabled for TypeScript compilation */}
      {/* TODO: Re-enable when modal scope issue is resolved */}
    </div>
  );
};

const SuccessBlock: React.FC<{
  content: any;
  leadData: any;
  metrics: any;
  educationalMode?: boolean;
  onEducationComplete?: () => void;
  onShowOutroVideo?: () => void;
}> = ({ content, leadData, metrics, educationalMode = false, onEducationComplete, onShowOutroVideo }) => {
  // Removed router dependency to avoid App Router/Pages Router conflicts
  
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
          {content.benefits.map((benefit: any, idx: number) => {
            const IconComponent = benefit.icon;
            return (
              <motion.div
                key={idx}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4 text-lg shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:scale-[1.02] flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + idx * 0.1 }}
              >
                <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-gray-800 dark:text-gray-200">{benefit.text}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      
      {/* DAO COMMUNITY SHOWCASE - For BOTH Knowledge and Educational modes */}
      <div className="mt-12 space-y-8">
          {/* Welcome to DAO Community */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] max-w-4xl mx-auto"
          >
            <div className="text-center mb-6">
              <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                🌟 Welcome to our DAO Community! 🌟
              </h2>
              <p className="text-xl text-gray-700 dark:text-gray-300">
                Has completado tu entrenamiento y ahora formas parte de algo extraordinario
              </p>
            </div>

            {/* Team Showcase */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Apex AI Assistant */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.8 }}
                className="text-center bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20"
              >
                <img 
                  src="/Apex.PNG" 
                  alt="Apex AI Assistant" 
                  className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-blue-500/50 shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">🤖 APEX</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Our AI Assistant that will guide you through every step of the crypto ecosystem</p>
              </motion.div>

              {/* Godez22 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.0 }}
                className="text-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20"
              >
                <img 
                  src="/Godez22.png" 
                  alt="Godez22 Developer" 
                  className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-emerald-500/50 shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">💎 Godez22</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pioneer developer who brought this wonderful system to life</p>
              </motion.div>

              {/* RLGra95 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.2 }}
                className="text-center bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl p-6 border border-orange-500/20"
              >
                <img 
                  src="/RLGra95.PNG" 
                  alt="RLGra95 Developer" 
                  className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-orange-500/50 shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">🚀 RLGra95</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Visionary co-founder in the project's early steps</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Features Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4 }}
            className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto"
          >
            {/* CG Wallet Utilities */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src="/cg-wallet-logo.png" 
                  alt="CG Wallet" 
                  className="w-12 h-12 rounded-xl shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">CG Wallet</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">Dozens of utilities that will transform your crypto experience:</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 🔒 Seguridad multi-capa con backup automático</li>
                <li>• 💸 Intercambios sin comisiones entre usuarios</li>
                <li>• 🎁 Portador de vida con funcionalidades integradas</li>
                <li>• 📊 Analytics avanzados de tu portafolio</li>
                <li>• 🌐 Cross-chain compatibility</li>
              </ul>
            </div>

            {/* Art & Personalization */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src="/Arte-IA-Personalizado.png" 
                  alt="Arte Personalizado" 
                  className="w-12 h-12 rounded-xl shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent">Arte IA</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">Creating value through personalized art:</p>
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src="/wallet-regalo.png" 
                  alt="Gift Wallet" 
                  className="w-8 h-8 rounded-lg shadow-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">A picture is worth a thousand words - the wallet integration gives it the ability to be a bearer of life</p>
              </div>
            </div>
          </motion.div>

          {/* Knowledge Center - Neural Hub */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.8 }}
            className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 dark:from-purple-500/10 dark:to-blue-500/10 border border-purple-500/30 rounded-3xl p-8 shadow-2xl max-w-4xl mx-auto"
          >
            <div className="text-center mb-6">
              <img 
                src="/knowledge-logo.png" 
                alt="Knowledge Center" 
                className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <h3 className="text-3xl font-black mb-4 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                🧠 Knowledge: The Future's Nerve Center
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
                The Knowledge section will become the epicenter where content creators and consumers converge,
                teachers and students, with integration of the most prestigious crypto academies in the ecosystem.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
                <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-2">🏆 Elite Academies</h4>
                <p>Integration with Binance Academy, Coin Bureau, DeFi Pulse and more</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
                <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">🎮 Gamification</h4>
                <p>Achievement system, NFT badges and learning rewards</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
                <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">🤝 DAO Community</h4>
                <p>Participative governance and community decisions</p>
              </div>
            </div>
          </motion.div>

          {/* Final CTA with Confetti */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 3.2 }}
            className="text-center"
            onAnimationComplete={() => {
              // Trigger confetti for all modes
              setTimeout(() => {
                triggerConfetti();
              }, 500);
            }}
          >
            <p className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent mb-6">
              🎉 The future of digital payments begins with you! 🎉
            </p>
            
            {/* FASE 3: Condicionar CTAs - ocultar en modo educacional */}
            {!educationalMode && (
              <div className="flex justify-center gap-4 flex-wrap">
                <button
                  onClick={() => window.location.href = '/knowledge'}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-xl hover:shadow-2xl border border-white/20"
                  data-testid="explorar-knowledge-button"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    <span>Explorar Knowledge</span>
                  </div>
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-xl hover:shadow-2xl border border-white/20"
                  data-testid="crear-primer-regalo-button"
                >
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    <span>Create my First Gift</span>
                  </div>
                </button>
              </div>
            )}
          </motion.div>
          {/* FASE 3: Educational mode - Fixed IR AL CLAIM button */}
          {educationalMode && (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  console.log('🎯 IR AL CLAIM clicked - showing outro video first');

                  // Show the outro video before completing education
                  if (onShowOutroVideo) {
                    onShowOutroVideo();
                  }
                }}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-xl hover:shadow-2xl border border-white/20 text-lg"
                data-testid="ir-al-claim-button"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6" />
                  <span>IR AL CLAIM</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            </div>
          )}
        </div>
    </div>
  );
};

export { SalesMasterclassEN };
export default SalesMasterclassEN;