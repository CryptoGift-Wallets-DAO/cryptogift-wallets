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
  ArrowRight
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
        { icon: '🎁', text: 'El NFT ES la cuenta bancaria' },
        { icon: '⛽', text: 'Gas 100% patrocinado por nosotros' },
        { icon: '🛡️', text: 'Recuperación social con guardianes' },
        { icon: '🔄', text: 'Swap instantáneo a cualquier token' }
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
          icon: '🎁'
        },
        {
          name: 'Arte Premium',
          model: 'Marcos animados y filtros IA (opcional)',
          icon: '🎨'
        },
        {
          name: 'Corporativo',
          model: 'Paquetes para marcas y eventos',
          icon: '🏢'
        },
        {
          name: 'Marketplace',
          model: 'Diseños CC0 con royalties a creadores',
          icon: '🛍️'
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
    duration: 30,
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
        '📧 Recibirás información exclusiva',
        '🎁 NFT de fundador próximamente',
        '💰 Acceso prioritario a nuevas features',
        '🚀 Invitación a eventos privados'
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

  // Celebration Effect
  const celebrate = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347']
    });
    
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
    } else if (timeLeft === 0 && currentBlock < SALES_BLOCKS.length - 1) {
      // FIXED: Remove canProceed dependency for auto-advance
      // In educational mode, allow auto-advance regardless of interaction
      console.log('⏰ TIME UP - Auto-advancing to next block:', {
        currentBlock,
        nextBlock: currentBlock + 1,
        canProceed,
        educationalMode
      });
      handleNextBlock();
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
    
    // In educational mode, skip lead capture and complete immediately
    if (educationalMode) {
      console.log('🎓 EDUCATIONAL MODE COMPLETION - Triggering celebration and completion');
      setMetrics(prev => ({ ...prev, leadSubmitted: true }));
      celebrate();
      
      // Trigger education completion
      if (onEducationComplete) {
        console.log('✅ Calling onEducationComplete callback in 2 seconds');
        setTimeout(() => {
          onEducationComplete();
        }, 2000);
      }
      
      // Send completion event for iframe
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'MASTERCLASS_COMPLETE' }, '*');
      }
      
      // Move to success block
      handleNextBlock();
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

  // Render Block Content
  const renderBlockContent = () => {
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
      <div className="sales-masterclass min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        {/* Header - Hidden in educational mode */}
        {!educationalMode && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gold/20">
          <div className="max-w-5xl mx-auto px-3 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              CryptoGift Masterclass
            </h1>
            <div className="flex gap-2">
              {SALES_BLOCKS.map((block, idx) => (
                <div
                  key={block.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentBlock 
                      ? 'bg-yellow-400 w-8' 
                      : idx < currentBlock 
                        ? 'bg-green-400' 
                        : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="font-mono text-lg">
                {metrics.correctAnswers}/{metrics.questionsAnswered}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="font-mono text-lg">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 rounded-lg transition-all"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Main Content */}
      <div className={educationalMode ? "pt-10 pb-10 px-3" : "pt-20 pb-10 px-3"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBlock}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            {renderBlockContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Metrics Overlay (Debug/Admin) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/90 p-4 rounded-lg text-xs font-mono">
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
    <div className="mt-8 p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl border border-purple-500/30">
      <h3 className="text-2xl font-bold mb-4 text-yellow-400">
        💡 Pregunta Rápida:
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
                    ? 'bg-green-500/30 border-2 border-green-500'
                    : 'bg-red-500/30 border-2 border-red-500'
                  : option.isCorrect
                    ? 'bg-green-500/20 border-2 border-green-500/50'
                    : 'bg-gray-800/50 border border-gray-600'
                : 'bg-gray-800/50 border border-gray-600 hover:bg-gray-700/50 hover:border-yellow-500 cursor-pointer'
            }`}
            whileHover={!showFeedback ? { scale: 1.02 } : {}}
            whileTap={!showFeedback ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {showFeedback
                  ? option.isCorrect
                    ? '✅'
                    : selectedAnswer === idx
                      ? '❌'
                      : '⭕'
                  : ['🅰️', '🅱️', '🆎'][idx]}
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
            <p className="text-green-400 text-xl font-bold">
              ¡Correcto! 🎉 Excelente respuesta
            </p>
          ) : (
            <p className="text-yellow-400 text-xl">
              Casi... pero la respuesta correcta te sorprenderá 🤔
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Block Components with Questions
const OpeningBlock: React.FC<{ 
  content: any; 
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  onNext: () => void;
  canProceed: boolean;
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
  <div className="py-12">
    <motion.div 
      className="text-center mb-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h1 className="text-6xl font-black mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
        {content.headline}
      </h1>
      
      <div className="max-w-3xl mx-auto">
        <p className="text-xl text-gray-300 mb-6 leading-relaxed">
          {content.story}
        </p>
        
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 rounded-2xl border border-yellow-500/30 mb-6">
          <p className="text-lg text-yellow-400 font-medium">
            {content.emphasis}
          </p>
        </div>
        
        <p className="text-2xl text-white font-bold">
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

    {canProceed && (
      <motion.div 
        className="text-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={onNext}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 
                     text-black font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Rocket className="w-6 h-6" />
          CONTINUAR
          <ArrowRight className="w-6 h-6" />
        </motion.button>
        
        <div className="mt-4 text-gray-400 text-sm">
          👆 Haz clic para continuar • ⏱️ Auto-avance en 30s
        </div>
      </motion.div>
    )}
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
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-12">Las 3 Brechas del Mercado 🚧</h2>
    
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      {content.brechas.map((brecha: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.2 }}
        >
          <h3 className="text-2xl font-bold text-red-400 mb-3">
            {brecha.title}
          </h3>
          <p className="text-gray-300">
            {brecha.description}
          </p>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <div className="inline-block bg-red-500/20 border border-red-500/50 px-8 py-4 rounded-full">
        <p className="text-3xl font-bold text-red-400">
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

    {canProceed && (
      <motion.div 
        className="text-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={onNext}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 
                     text-white font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Shield className="w-6 h-6" />
          VER SOLUCIÓN
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    )}
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
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-8">NFT-Wallets: La Revolución 🚀</h2>
    
    <div className="text-center mb-8">
      <div className="inline-block bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 px-8 py-4 rounded-2xl">
        <p className="text-2xl font-bold text-green-400">
          {content.breakthrough}
        </p>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-4xl mx-auto">
      {content.features.map((feature: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-6 flex items-center gap-4"
          initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <span className="text-4xl">{feature.icon}</span>
          <span className="text-lg">{feature.text}</span>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <p className="text-2xl text-yellow-400 font-bold">
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
}> = ({ content, question, showQR, giftUrl, claimStatus, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
  <div className="text-center py-12">
    <h2 className="text-5xl font-bold mb-8">{content.instruction}</h2>
    
    <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto mb-8">
      <div>
        {showQR && claimStatus === 'waiting' && (
          <motion.div 
            className="bg-white p-8 rounded-2xl inline-block"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <QRCodeSVG value={giftUrl} size={200} level="H" />
            <p className="text-black mt-4 font-semibold">Escanea con tu móvil</p>
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
        
        <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
          <p className="text-green-400 font-bold">{content.emphasis}</p>
        </div>
      </div>
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
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 
                     text-white font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BarChart3 className="w-6 h-6" />
          VER COMPARACIÓN
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    )}
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
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
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
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
            <p className="text-lg">{comp.traditional}</p>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
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

    {canProceed && (
      <motion.div 
        className="text-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={onNext}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 
                     text-white font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <TrendingUp className="w-6 h-6" />
          VER RESULTADOS
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    )}
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
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-12">Resultados Reales 📊</h2>
    
    <div className="grid md:grid-cols-4 gap-4 mb-8">
      {content.metrics.map((metric: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6 text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="text-4xl font-bold text-yellow-400 mb-2">{metric.number}</div>
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

    {canProceed && (
      <motion.div 
        className="text-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={onNext}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 
                     text-white font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Banknote className="w-6 h-6" />
          VER MODELO DE NEGOCIO
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    )}
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
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
  <div className="py-12">
    <h2 className="text-5xl font-bold text-center mb-12">{content.title} 💎</h2>
    
    <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-5xl mx-auto">
      {content.streams.map((stream: any, idx: number) => (
        <motion.div
          key={idx}
          className={`${
            idx === 0 
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50' 
              : 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30'
          } border rounded-xl p-6`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{stream.icon}</span>
            <h3 className="text-xl font-bold">{stream.name}</h3>
          </div>
          <p className={`${idx === 0 ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
            {stream.model}
          </p>
        </motion.div>
      ))}
    </div>

    <div className="text-center mb-8">
      <div className="inline-block bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50 px-8 py-4 rounded-full">
        <p className="text-xl text-blue-400 font-bold">
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

    {canProceed && (
      <motion.div 
        className="text-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={onNext}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 
                     text-white font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Globe className="w-6 h-6" />
          VER ROADMAP
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    )}
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
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
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
          <p className="text-gray-300">{phase.features}</p>
        </motion.div>
      ))}
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
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 
                     text-white font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Heart className="w-6 h-6" />
          MOMENTO INSPIRACIONAL
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    )}
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
}> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed }) => (
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

    {canProceed && (
      <motion.div 
        className="text-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={onNext}
          className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 
                     text-black font-black text-2xl rounded-xl hover:scale-105 transition-all duration-300 shadow-2xl
                     cursor-pointer"
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Rocket className="w-8 h-8" />
          ¡QUIERO SER PARTE!
          <ArrowRight className="w-8 h-8" />
        </motion.button>
      </motion.div>
    )}
  </div>
);

const CaptureBlock: React.FC<{ 
  content: any; 
  onSubmit: (data: any) => void;
  questionsScore: { correct: number; total: number };
  educationalMode?: boolean;
}> = ({ content, onSubmit, questionsScore, educationalMode = false }) => {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [formData, setFormData] = useState({
    availability: '',
    contact: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      path: selectedPath,
      ...formData,
      questionsScore
    });
  };

  // Educational mode - simplified completion
  if (educationalMode) {
    return (
      <div className="py-12 text-center">
        <motion.h2 
          className="text-5xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ¡Felicidades! 🎉
        </motion.h2>
        
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-block bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 px-8 py-6 rounded-2xl">
            <p className="text-3xl mb-4">
              Tu puntuación: <span className="font-bold text-yellow-400">
                {questionsScore.correct}/{questionsScore.total}
              </span> respuestas correctas
            </p>
            {questionsScore.correct >= 7 && (
              <p className="text-green-400 font-bold text-xl">¡EXCELENTE! Has aprendido sobre CryptoGift 🏆</p>
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
          Ahora entiendes nuestra visión y cómo funciona la plataforma.
        </motion.p>
        
        <motion.button
          onClick={() => onSubmit({ educationCompleted: true, questionsScore })}
          className="px-12 py-5 bg-gradient-to-r from-yellow-500 to-green-500 text-black font-black text-2xl rounded-xl hover:scale-105 transition-all shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8" />
            COMPLETAR EDUCACIÓN Y RECLAMAR REGALO
            <Gift className="w-8 h-8" />
          </div>
        </motion.button>
      </div>
    );
  }

  // Normal lead capture flow
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
            <div className="text-3xl font-bold text-yellow-400 mb-2">{String(value)}</div>
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
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-all"
        >
          📚 Más Contenido
        </button>
        
        <button
          onClick={() => router.push('/')}
          className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl hover:scale-105 transition-all"
        >
          🎁 Crear mi Primer Regalo
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