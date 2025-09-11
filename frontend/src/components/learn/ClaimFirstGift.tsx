/**
 * CLAIM YOUR FIRST GIFT MODULE
 * Primera lección interactiva siguiendo el patrón DO → EXPLAIN → CHECK → REINFORCE
 * Basado en el sistema de SalesMasterclass pero con contenido educativo básico
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SmartIcon } from '../ui/SmartIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Gift, 
  Wallet,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Zap,
  DollarSign,
  Globe,
  Smartphone,
  Info
} from 'lucide-react';

// Types
interface LessonBlock {
  id: string;
  title: string;
  duration: number;
  type: 'do' | 'explain' | 'check' | 'reinforce';
  content: any;
  question?: {
    text: string;
    options: Array<{
      text: string;
      isCorrect: boolean;
    }>;
  };
}

interface ClaimFirstGiftProps {
  educationalMode?: boolean;
  onEducationComplete?: () => void;
}

// ✅ NAVIGATION AREA - Mismo patrón que SalesMasterclass
const NavigationArea: React.FC<{
  onNext: () => void;
  canProceed: boolean;
  timeLeft: number;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  buttonColor?: string;
}> = ({ onNext, canProceed, timeLeft, buttonText = "CONTINUAR", buttonIcon, buttonColor = "from-purple-500 to-pink-500 text-white" }) => (
  <div className="NavigationArea text-center mt-8 flex-1 flex flex-col justify-center">
    {canProceed && timeLeft > 0 ? (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <motion.button
          onClick={onNext}
          className={`inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r ${buttonColor}
                     font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {buttonIcon}
          {buttonText}
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </motion.div>
    ) : timeLeft === 0 ? (
      <div className="space-y-4">
        <div className="text-gray-500 dark:text-gray-400">
          ⏰ Tiempo agotado - Esperando...
        </div>
        {canProceed && (
          <motion.button
            onClick={onNext}
            className={`inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r ${buttonColor}
                       font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            CONTINUAR AHORA →
          </motion.button>
        )}
      </div>
    ) : (
      <div className="text-gray-500 dark:text-gray-400">
        ⏳ Completa la actividad para continuar...
      </div>
    )}
  </div>
);

// ✅ QUESTION SECTION - Mismo patrón que SalesMasterclass
const QuestionSection: React.FC<{
  question: any;
  onAnswer: (idx: number) => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
}> = ({ question, onAnswer, selectedAnswer, showFeedback }) => (
  <div className="max-w-2xl mx-auto">
    <h3 className="text-2xl font-bold text-center mb-6 text-white">{question.text}</h3>
    <div className="grid gap-3">
      {question.options.map((option: any, idx: number) => (
        <motion.button
          key={idx}
          onClick={() => onAnswer(idx)}
          disabled={showFeedback}
          className={`
            p-4 rounded-xl text-left transition-all duration-300 font-medium
            ${selectedAnswer === idx 
              ? (option.isCorrect 
                  ? 'bg-green-500/20 border-2 border-green-500' 
                  : 'bg-red-500/20 border-2 border-red-500')
              : 'bg-white/10 hover:bg-white/20 border border-white/20'
            }
          `}
          whileHover={!showFeedback ? { scale: 1.02 } : {}}
          whileTap={!showFeedback ? { scale: 0.98 } : {}}
        >
          <div className="flex items-center justify-between">
            <span className="text-white">{option.text}</span>
            {showFeedback && selectedAnswer === idx && (
              <span className="text-2xl">
                {option.isCorrect ? '✅' : '❌'}
              </span>
            )}
          </div>
        </motion.button>
      ))}
    </div>
    {showFeedback && (
      <motion.div 
        className="mt-4 p-4 rounded-lg bg-blue-500/20 border border-blue-500/50"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-white">
          {question.options[selectedAnswer!].isCorrect 
            ? '¡Excelente! Has entendido perfectamente. 🎉' 
            : 'No exactamente. La respuesta correcta te muestra el verdadero poder de CryptoGift. 🤔'}
        </p>
      </motion.div>
    )}
  </div>
);

// Bloques de contenido siguiendo DO → EXPLAIN → CHECK → REINFORCE
const blocks: LessonBlock[] = [
  {
    id: 'do-scan-qr',
    title: 'DO: Escanea y Reclama',
    duration: 90,
    type: 'do',
    content: {
      instruction: '¡Vamos a reclamar tu primer regalo cripto SIN PAGAR GAS!',
      qrGiftUrl: 'https://cryptogift-wallets.vercel.app/gift/claim/demo-tutorial-1',
      steps: [
        '1️⃣ Escanea el código QR con tu móvil',
        '2️⃣ Pulsa el botón "RECLAMAR REGALO"',
        '3️⃣ Conecta tu wallet (o crea una nueva)',
        '4️⃣ ¡Listo! El NFT es tuyo sin pagar nada'
      ]
    }
  },
  {
    id: 'explain-no-gas',
    title: 'EXPLAIN: ¿Por qué no pagaste gas?',
    duration: 60,
    type: 'explain',
    content: {
      concept: 'El Paymaster Mágico',
      explanation: 'CryptoGift usa un sistema llamado Paymaster que paga TODO el gas por ti. Es como tener un amigo millonario que siempre paga la cuenta.',
      comparison: {
        before: {
          title: 'Otros NFTs',
          points: [
            '❌ Pagas $5-50 de gas',
            '❌ Necesitas ETH en tu wallet',
            '❌ 50% abandonan por el costo'
          ]
        },
        after: {
          title: 'CryptoGift',
          points: [
            '✅ Gas = $0.00 SIEMPRE',
            '✅ No necesitas cripto previa',
            '✅ 99% completan el claim'
          ]
        }
      }
    },
    question: {
      text: '¿Quién paga el gas cuando reclamas un regalo en CryptoGift?',
      options: [
        { text: 'Tú, el que reclama el regalo', isCorrect: false },
        { text: 'El creador del regalo', isCorrect: false },
        { text: 'El Paymaster de CryptoGift automáticamente', isCorrect: true },
        { text: 'Nadie, es gratis por magia', isCorrect: false }
      ]
    }
  },
  {
    id: 'explain-nft-wallet',
    title: 'EXPLAIN: Tu NFT es una Wallet',
    duration: 60,
    type: 'explain',
    content: {
      concept: 'Token Bound Accounts (ERC-6551)',
      explanation: 'Cada NFT que recibes no es solo una imagen. Es una WALLET que puede recibir y enviar criptomonedas.',
      features: [
        { icon: '💰', text: 'Puede recibir USDC, ETH, etc.' },
        { icon: '🔄', text: 'Puede hacer swaps de tokens' },
        { icon: '🎁', text: 'Puede recibir otros NFTs' },
        { icon: '🔐', text: 'Solo el dueño del NFT controla la wallet' }
      ]
    },
    question: {
      text: '¿Qué hace especial a un NFT de CryptoGift?',
      options: [
        { text: 'Es más bonito que otros NFTs', isCorrect: false },
        { text: 'Tiene una wallet integrada que puede guardar dinero', isCorrect: true },
        { text: 'Se puede vender por más dinero', isCorrect: false },
        { text: 'Cambia de color cada día', isCorrect: false }
      ]
    }
  },
  {
    id: 'check-understanding',
    title: 'CHECK: Verifiquemos lo aprendido',
    duration: 45,
    type: 'check',
    content: {
      review: 'Repasemos los conceptos clave'
    },
    question: {
      text: 'Si tu amigo te envía un regalo con 100 USDC, ¿cuánto pagas para reclamarlo?',
      options: [
        { text: '$5 de gas fees', isCorrect: false },
        { text: '$0 - El Paymaster paga todo', isCorrect: true },
        { text: '2% de comisión', isCorrect: false },
        { text: 'Depende del precio del gas', isCorrect: false }
      ]
    }
  },
  {
    id: 'reinforce-power',
    title: 'REINFORCE: El Poder en tus Manos',
    duration: 30,
    type: 'reinforce',
    content: {
      summary: 'Lo que acabas de aprender',
      keyPoints: [
        '✅ Reclamar NFTs sin pagar gas (Paymaster)',
        '✅ Cada NFT es una wallet (ERC-6551)',
        '✅ Puede recibir y enviar cripto',
        '✅ 100% propiedad tuya, sin intermediarios'
      ],
      nextSteps: 'Ahora puedes crear tu propio regalo y enviárselo a alguien. ¡Sin que paguen gas!'
    }
  }
];

// Block Components
const DoBlock: React.FC<any> = ({ content, onNext, canProceed, timeLeft }) => {
  const [qrScanned, setQrScanned] = useState(false);
  
  return (
    <div className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-4xl font-bold mb-4 text-white">
          🎁 ¡Tu Primer Regalo Cripto te Espera!
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          {content.instruction}
        </p>
        
        <div className="bg-white p-8 rounded-3xl inline-block mb-8 shadow-2xl">
          <QRCodeSVG 
            value={content.qrGiftUrl}
            size={250}
            level="H"
            includeMargin={true}
          />
          <p className="mt-4 text-gray-700 font-medium">
            Escanea con tu móvil 📱
          </p>
        </div>
        
        <div className="max-w-md mx-auto text-left space-y-3 mb-8">
          {content.steps.map((step: string, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + idx * 0.2 }}
              className="bg-white/10 backdrop-blur p-4 rounded-lg text-white"
            >
              {step}
            </motion.div>
          ))}
        </div>
        
        {!qrScanned && (
          <motion.button
            onClick={() => setQrScanned(true)}
            className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ✅ Ya reclamé mi regalo
          </motion.button>
        )}
        
        {qrScanned && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 max-w-md mx-auto"
          >
            <p className="text-green-400 text-xl font-bold mb-2">
              🎉 ¡Felicidades! Has reclamado tu primer NFT
            </p>
            <p className="text-white">
              Y lo mejor: NO pagaste ni un centavo de gas. El Paymaster lo cubrió todo.
            </p>
          </motion.div>
        )}
      </motion.div>
      
      <NavigationArea
        onNext={onNext}
        canProceed={qrScanned}
        timeLeft={timeLeft}
        buttonText="DESCUBRIR EL SECRETO"
        buttonIcon={<Sparkles className="w-6 h-6" />}
        buttonColor="from-green-500 to-blue-500 text-white"
      />
    </div>
  );
};

const ExplainBlock: React.FC<any> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <h2 className="text-4xl font-bold text-center mb-8 text-white">{content.concept}</h2>
    
    <div className="max-w-3xl mx-auto mb-8">
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-2xl p-6 mb-6">
        <p className="text-xl text-white text-center">
          {content.explanation}
        </p>
      </div>
      
      {content.comparison && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-red-400 mb-4">{content.comparison.before.title}</h3>
            <div className="space-y-2">
              {content.comparison.before.points.map((point: string, idx: number) => (
                <p key={idx} className="text-white">{point}</p>
              ))}
            </div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-green-400 mb-4">{content.comparison.after.title}</h3>
            <div className="space-y-2">
              {content.comparison.after.points.map((point: string, idx: number) => (
                <p key={idx} className="text-white">{point}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {content.features && (
        <div className="grid md:grid-cols-2 gap-4">
          {content.features.map((feature: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-4"
            >
              <span className="text-3xl">{feature.icon}</span>
              <span className="text-white">{feature.text}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
    
    {question && (
      <QuestionSection
        question={question}
        onAnswer={onAnswer}
        selectedAnswer={selectedAnswer}
        showFeedback={showFeedback}
      />
    )}
    
    <NavigationArea
      onNext={onNext}
      canProceed={canProceed}
      timeLeft={timeLeft}
      buttonText="CONTINUAR"
      buttonIcon={<ArrowRight className="w-6 h-6" />}
    />
  </div>
);

const CheckBlock: React.FC<any> = ({ content, question, onAnswer, selectedAnswer, showFeedback, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <h2 className="text-4xl font-bold text-center mb-8 text-white">
      🎯 {content.review}
    </h2>
    
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
      buttonText="VER RESUMEN FINAL"
      buttonIcon={<CheckCircle className="w-6 h-6" />}
      buttonColor="from-blue-500 to-purple-500 text-white"
    />
  </div>
);

const ReinforceBlock: React.FC<any> = ({ content, onNext, canProceed, timeLeft }) => (
  <div className="py-12">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
        🎓 {content.summary}
      </h2>
      
      <div className="max-w-2xl mx-auto space-y-4 mb-8">
        {content.keyPoints.map((point: string, idx: number) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
            className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-xl p-4"
          >
            <p className="text-xl text-white font-medium">{point}</p>
          </motion.div>
        ))}
      </div>
      
      <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-2xl p-6 max-w-2xl mx-auto">
        <p className="text-yellow-400 text-xl font-bold mb-2">
          🚀 Próximo Paso:
        </p>
        <p className="text-white text-lg">
          {content.nextSteps}
        </p>
      </div>
    </motion.div>
    
    <NavigationArea
      onNext={onNext}
      canProceed={true}
      timeLeft={timeLeft}
      buttonText="COMPLETAR LECCIÓN"
      buttonIcon={<Trophy className="w-6 h-6" />}
      buttonColor="from-yellow-500 to-orange-500 text-black font-bold"
    />
  </div>
);

// Main Component
export const ClaimFirstGift: React.FC<ClaimFirstGiftProps> = ({ 
  educationalMode = false,
  onEducationComplete
}) => {
  const [currentBlock, setCurrentBlock] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(blocks[0].duration);
  const [blockStartTime, setBlockStartTime] = useState(Date.now());
  
  const block = blocks[currentBlock];
  
  // Timer logic - mismo que SalesMasterclass
  useEffect(() => {
    setTimeLeft(block.duration);
    setBlockStartTime(Date.now());
    setCanProceed(false);
    setSelectedAnswer(null);
    setShowFeedback(false);
    
    // Para bloques DO, permitir proceder después de cierto tiempo
    if (block.type === 'do') {
      const timer = setTimeout(() => setCanProceed(true), 10000);
      return () => clearTimeout(timer);
    }
    
    // Para REINFORCE, siempre puede proceder
    if (block.type === 'reinforce') {
      setCanProceed(true);
    }
  }, [currentBlock]);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          if (block.type === 'explain' || block.type === 'check') {
            setCanProceed(false); // Solo ocultar botón, no auto-avanzar
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentBlock, block.type]);
  
  const handleAnswer = (idx: number) => {
    if (showFeedback) return;
    
    setSelectedAnswer(idx);
    setShowFeedback(true);
    
    setTimeout(() => {
      const isCorrect = block.question?.options[idx].isCorrect;
      setCanProceed(true);
      
      // Track progress
      if (educationalMode) {
        console.log('📚 Educational progress:', {
          block: block.id,
          correct: isCorrect,
          timeSpent: Date.now() - blockStartTime
        });
      }
    }, 1500);
  };
  
  const handleNext = () => {
    if (currentBlock < blocks.length - 1) {
      setCurrentBlock(prev => prev + 1);
    } else {
      // Lección completada
      if (educationalMode && onEducationComplete) {
        onEducationComplete();
      } else {
        // En modo knowledge, mostrar celebración
        console.log('🎉 Lección completada!');
      }
    }
  };
  
  // Render current block
  const renderBlock = () => {
    switch (block.type) {
      case 'do':
        return (
          <DoBlock
            content={block.content}
            onNext={handleNext}
            canProceed={canProceed}
            timeLeft={timeLeft}
          />
        );
      case 'explain':
        return (
          <ExplainBlock
            content={block.content}
            question={block.question}
            onAnswer={handleAnswer}
            selectedAnswer={selectedAnswer}
            showFeedback={showFeedback}
            onNext={handleNext}
            canProceed={canProceed}
            timeLeft={timeLeft}
          />
        );
      case 'check':
        return (
          <CheckBlock
            content={block.content}
            question={block.question}
            onAnswer={handleAnswer}
            selectedAnswer={selectedAnswer}
            showFeedback={showFeedback}
            onNext={handleNext}
            canProceed={canProceed}
            timeLeft={timeLeft}
          />
        );
      case 'reinforce':
        return (
          <ReinforceBlock
            content={block.content}
            onNext={handleNext}
            canProceed={canProceed}
            timeLeft={timeLeft}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={`min-h-screen ${educationalMode ? 'educational-mode-wrapper' : ''}`}>
      <div className="h-full flex flex-col px-3">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">
              Paso {currentBlock + 1} de {blocks.length}
            </span>
            <span className="text-white text-sm">
              ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentBlock + 1) / blocks.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        {/* Block title */}
        <motion.div
          key={block.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {block.title}
          </h1>
          <p className="text-gray-400">
            {block.type === 'do' && '🎯 HACER - Experiencia práctica'}
            {block.type === 'explain' && '📚 EXPLICAR - Entender el concepto'}
            {block.type === 'check' && '✅ VERIFICAR - Confirmar aprendizaje'}
            {block.type === 'reinforce' && '🚀 REFORZAR - Consolidar conocimiento'}
          </p>
        </motion.div>
        
        {/* Block content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={block.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderBlock()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      {/* Educational mode CSS injection */}
      {educationalMode && (
        <style jsx global>{`
          .educational-mode-wrapper {
            background: transparent !important;
          }
          .educational-mode-wrapper .NavigationArea {
            flex: 1 !important;
          }
        `}</style>
      )}
    </div>
  );
};

// Import Trophy for completion
import { Trophy } from 'lucide-react';

export default ClaimFirstGift;