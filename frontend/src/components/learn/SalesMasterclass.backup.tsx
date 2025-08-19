/**
 * SALES MASTERCLASS INTERACTIVE MODULE
 * The Ultimate 15-Minute Pitch Experience
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
  // In production, you can add canvas-confetti here
  // For now, just log the celebration
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
  Clock
} from 'lucide-react';

// Types
interface SalesBlock {
  id: string;
  title: string;
  duration: number;
  type: 'opening' | 'demo' | 'problem' | 'cases' | 'vision' | 'credibility' | 'close';
  content: any;
  triggers: string[];
}

interface LeadData {
  path: 'quest' | 'integration' | 'whitelabel' | 'investor';
  availability: string;
  contact: string;
  interests: string[];
  nps?: number;
  claimedGift?: boolean;
}

interface Metrics {
  startTime: number;
  blockTimes: Record<string, number>;
  interactions: number;
  claimSuccess: boolean;
  leadSubmitted: boolean;
  wowMoments: number;
}

// Constants
const GIFT_CLAIM_URL = process.env.NEXT_PUBLIC_SITE_URL 
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/gift/claim/demo-`
  : 'https://cryptogift-wallets.vercel.app/gift/claim/demo-';

const SALES_BLOCKS: SalesBlock[] = [
  {
    id: 'opening',
    title: 'La Revolución Comienza',
    duration: 5, // Reducido de 30s a 5s para lectura rápida
    type: 'opening',
    content: {
      headline: 'De $0 a $100M en Regalos Cripto',
      subheadline: 'Sin Pagar un Solo Centavo de Gas',
      hook: '15 minutos que cambiarán tu visión del futuro'
    },
    triggers: ['pattern_interrupt', 'curiosity']
  },
  {
    id: 'demo',
    title: 'Vívelo Ahora',
    duration: 120,
    type: 'demo',
    content: {
      instruction: 'Escanea y Reclama tu NFT',
      emphasis: 'Gas = $0 • Custodia = 0 • Fricción = 0'
    },
    triggers: ['endowment_effect', 'reciprocity']
  },
  {
    id: 'problem',
    title: 'El Problema de $10B',
    duration: 120,
    type: 'problem',
    content: {
      stats: {
        unclaimed: '97%',
        gasCost: '$5-50',
        mobileFail: '50%',
        custody: '100%'
      }
    },
    triggers: ['pain_agitation', 'contrast']
  },
  {
    id: 'cases',
    title: 'Casos Reales, Resultados Reales',
    duration: 180,
    type: 'cases',
    content: {
      cases: [
        { client: 'TechCorp', result: '10,000 onboarded', saved: '$200k' },
        { client: 'GameFi X', result: '50,000 NFTs', engagement: '+340%' },
        { client: 'Brand Y', result: 'ROI 8.5x', time: '90 días' }
      ]
    },
    triggers: ['social_proof', 'authority']
  },
  {
    id: 'vision',
    title: 'El Futuro es Hoy',
    duration: 210,
    type: 'vision',
    content: {
      roadmap: {
        q1: 'Quest Builder',
        q2: 'Marketplace',
        q3: 'Multi-chain',
        q4: 'Enterprise Suite'
      },
      tam: '$10B',
      som: '$100M'
    },
    triggers: ['fomo', 'opportunity']
  },
  {
    id: 'credibility',
    title: 'Números que Hablan',
    duration: 150,
    type: 'credibility',
    content: {
      metrics: {
        nfts: '50,000+',
        saved: '$500,000',
        uptime: '100%',
        rating: '4.9/5'
      },
      audit: 'CertiK 95/100'
    },
    triggers: ['authority', 'trust']
  },
  {
    id: 'close',
    title: 'Tu Momento es Ahora',
    duration: 90,
    type: 'close',
    content: {
      paths: [
        { name: 'Quest Creator', spots: 33, revenue: '30%' },
        { name: 'Integration Partner', spots: 19, bonus: '1M free tx' },
        { name: 'White-Label', spots: 6, sla: '99.99%' },
        { name: 'Investor', spots: 'Closing soon', min: '$50k' }
      ],
      urgency: '48h = 20% lifetime discount'
    },
    triggers: ['scarcity', 'urgency', 'commitment']
  }
];

const SalesMasterclass: React.FC = () => {
  // State
  const [currentBlock, setCurrentBlock] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SALES_BLOCKS[0].duration);
  const [isPaused, setIsPaused] = useState(false);
  const [leadData, setLeadData] = useState<Partial<LeadData>>({});
  const [metrics, setMetrics] = useState<Metrics>({
    startTime: Date.now(),
    blockTimes: {},
    interactions: 0,
    claimSuccess: false,
    leadSubmitted: false,
    wowMoments: 0
  });
  const [showQR, setShowQR] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'waiting' | 'claiming' | 'success'>('waiting');
  
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);

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
    if (!isPaused && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentBlock < SALES_BLOCKS.length - 1) {
      handleNextBlock();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isPaused, currentBlock]);

  // Block Navigation
  const handleNextBlock = useCallback(() => {
    const nextBlock = currentBlock + 1;
    if (nextBlock < SALES_BLOCKS.length) {
      setCurrentBlock(nextBlock);
      setTimeLeft(SALES_BLOCKS[nextBlock].duration);
      
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
  }, [currentBlock]);

  // Claim Monitoring
  const startClaimMonitoring = useCallback(() => {
    // Simulate claim detection (in production, use WebSocket or polling)
    setTimeout(() => {
      setClaimStatus('claiming');
      setTimeout(() => {
        setClaimStatus('success');
        celebrate();
        setMetrics(prev => ({ ...prev, claimSuccess: true }));
      }, 3000);
    }, 10000);
  }, [celebrate]);

  // Render Block Content
  const renderBlockContent = () => {
    const block = SALES_BLOCKS[currentBlock];

    switch (block.type) {
      case 'opening':
        return <OpeningBlock content={block.content} onNext={handleNextBlock} />;
      case 'demo':
        return <DemoBlock 
          content={block.content} 
          showQR={showQR}
          giftUrl={generateDemoGiftUrl()}
          claimStatus={claimStatus}
          onNext={handleNextBlock}
        />;
      case 'problem':
        return <ProblemBlock content={block.content} onNext={handleNextBlock} />;
      case 'cases':
        return <CasesBlock content={block.content} onNext={handleNextBlock} />;
      case 'vision':
        return <VisionBlock content={block.content} onNext={handleNextBlock} />;
      case 'credibility':
        return <CredibilityBlock content={block.content} onNext={handleNextBlock} />;
      case 'close':
        return <CloseBlock 
          content={block.content}
          onSubmit={(data) => {
            setLeadData(data);
            setMetrics(prev => ({ ...prev, leadSubmitted: true }));
            celebrate();
          }}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="sales-masterclass min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
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

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBlock}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto"
          >
            {renderBlockContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Metrics Overlay (Debug/Admin) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/90 p-4 rounded-lg text-xs font-mono">
          <div>Block: {SALES_BLOCKS[currentBlock].id}</div>
          <div>Interactions: {metrics.interactions}</div>
          <div>Wow Moments: {metrics.wowMoments}</div>
          <div>Claim: {claimStatus}</div>
          <div>Lead: {metrics.leadSubmitted ? '✅' : '⏳'}</div>
        </div>
      )}
    </div>
  );
};

// Block Components
const OpeningBlock: React.FC<{ content: any; onNext: () => void }> = ({ content, onNext }) => (
  <div className="text-center py-20">
    <motion.h1 
      className="text-7xl font-black mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {content.headline}
    </motion.h1>
    <h2 className="text-3xl mb-8 text-gray-300">{content.subheadline}</h2>
    <p className="text-xl text-yellow-400 mb-8">{content.hook}</p>
    
    {/* BOTÓN SIGUIENTE - USER CONTROL */}
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
      ¡EMPEZAR AHORA!
      <span className="text-lg">→</span>
    </motion.button>
    
    <div className="mt-8 text-gray-400 text-sm">
      👆 Haz clic para continuar • ⏱️ Auto-avance en 5s
    </div>
    
    <motion.div 
      className="mt-12"
      animate={{ y: [0, 10, 0] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <Sparkles className="w-16 h-16 mx-auto text-yellow-400" />
    </motion.div>
  </div>
);

const DemoBlock: React.FC<{ 
  content: any; 
  showQR: boolean; 
  giftUrl: string;
  claimStatus: string;
  onNext: () => void;
}> = ({ content, showQR, giftUrl, claimStatus, onNext }) => (
  <div className="text-center py-12">
    <h2 className="text-5xl font-bold mb-8">{content.instruction}</h2>
    
    {showQR && claimStatus === 'waiting' && (
      <motion.div 
        className="bg-white p-8 rounded-2xl inline-block mb-8"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring" }}
      >
        <QRCodeSVG value={giftUrl} size={300} level="H" />
        <p className="text-black mt-4 font-semibold">Válido por 120 segundos</p>
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
        <p className="text-2xl text-yellow-400 mb-8">{content.emphasis}</p>
      </motion.div>
    )}
    
    {/* BOTÓN SIGUIENTE SIEMPRE VISIBLE */}
    <motion.button
      onClick={onNext}
      className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 
                 text-white font-bold text-xl rounded-xl hover:scale-105 transition-all duration-300 shadow-lg
                 cursor-pointer mt-8"
      style={{
        animation: 'pulse 1.43s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Rocket className="w-6 h-6" />
      CONTINUAR MASTERCLASS
      <span className="text-lg">→</span>
    </motion.button>
    
    <div className="mt-4 text-gray-400 text-sm">
      {claimStatus === 'waiting' && "👆 Haz clic para continuar • ⏱️ Auto-avance en 2 min"}
      {claimStatus === 'claiming' && "👆 Haz clic para continuar mientras procesa"}
      {claimStatus === 'success' && "👆 ¡Ya tienes tu NFT! Continúa la experiencia"}
    </div>
  </div>
);

const ProblemBlock: React.FC<{ content: any; onNext: () => void }> = ({ content, onNext }) => (
  <div>
    <div className="grid md:grid-cols-2 gap-8 py-12">
      <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-8">
        <h3 className="text-3xl font-bold mb-6 text-red-400">ANTES 😰</h3>
        <ul className="space-y-4">
          <li className="flex items-center gap-3">
            <span className="text-red-500">❌</span>
            <span>{content.stats.unclaimed} nunca se reclaman</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-red-500">❌</span>
            <span>{content.stats.gasCost} en gas fees</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-red-500">❌</span>
            <span>{content.stats.mobileFail} fallan en móvil</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-red-500">❌</span>
            <span>{content.stats.custody} custodia = riesgo</span>
          </li>
        </ul>
      </div>
      
      <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-8">
        <h3 className="text-3xl font-bold mb-6 text-green-400">AHORA 🚀</h3>
        <ul className="space-y-4">
          <li className="flex items-center gap-3">
            <span className="text-green-500">✅</span>
            <span>100% reclamables sin gas</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-green-500">✅</span>
            <span>$0 para usuarios siempre</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-green-500">✅</span>
            <span>Mobile-first, deeplinks OK</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-green-500">✅</span>
            <span>Zero custodia, 100% seguro</span>
          </li>
        </ul>
      </div>
    </div>
    
    {/* BOTÓN SIGUIENTE */}
    <div className="text-center mt-8">
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
        <BarChart3 className="w-6 h-6" />
        VER CASOS REALES
        <span className="text-lg">→</span>
      </motion.button>
      
      <div className="mt-4 text-gray-400 text-sm">
        👆 Haz clic para continuar • ⏱️ Auto-avance en 2 min
      </div>
    </div>
  </div>
);

const CasesBlock: React.FC<{ content: any; onNext: () => void }> = ({ content, onNext }) => (
  <div className="py-12">
    <h2 className="text-4xl font-bold text-center mb-12">Casos Reales 📊</h2>
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      {content.cases.map((case_: any, idx: number) => (
        <motion.div
          key={idx}
          className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.2 }}
        >
          <div className="text-yellow-400 font-bold text-xl mb-2">{case_.client}</div>
          <div className="text-3xl font-bold mb-2">{case_.result}</div>
          <div className="text-green-400">{case_.saved || case_.engagement || case_.time}</div>
        </motion.div>
      ))}
    </div>
    
    {/* BOTÓN SIGUIENTE */}
    <div className="text-center mt-8">
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
        <Globe className="w-6 h-6" />
        VER EL FUTURO
        <span className="text-lg">→</span>
      </motion.button>
      
      <div className="mt-4 text-gray-400 text-sm">
        👆 Haz clic para continuar • ⏱️ Auto-avance en 3 min
      </div>
    </div>
  </div>
);

const VisionBlock: React.FC<{ content: any; onNext: () => void }> = ({ content, onNext }) => (
  <div className="py-12">
    <h2 className="text-4xl font-bold text-center mb-12">Roadmap to $100M 🗺️</h2>
    <div className="grid md:grid-cols-4 gap-4 mb-12">
      {Object.entries(content.roadmap).map(([quarter, feature], idx) => (
        <motion.div
          key={quarter}
          className="bg-gradient-to-t from-purple-900/20 to-blue-900/20 border border-blue-500/30 rounded-xl p-6 text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="text-blue-400 font-bold mb-2">{quarter.toUpperCase()}</div>
          <div className="text-xl">{String(feature)}</div>
        </motion.div>
      ))}
    </div>
    
    <div className="text-center mb-8">
      <div className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-2xl px-8 py-4 rounded-full">
        TAM: {content.tam} → SOM: {content.som}
      </div>
    </div>
    
    {/* BOTÓN SIGUIENTE */}
    <div className="text-center mt-8">
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
        <Trophy className="w-6 h-6" />
        VER CREDENCIALES
        <span className="text-lg">→</span>
      </motion.button>
      
      <div className="mt-4 text-gray-400 text-sm">
        👆 Haz clic para continuar • ⏱️ Auto-avance en 3.5 min
      </div>
    </div>
  </div>
);

const CredibilityBlock: React.FC<{ content: any; onNext: () => void }> = ({ content, onNext }) => (
  <div className="py-12">
    <h2 className="text-4xl font-bold text-center mb-12">Números que Hablan 💯</h2>
    <div className="grid md:grid-cols-4 gap-6 mb-12">
      {Object.entries(content.metrics).map(([key, value], idx) => (
        <motion.div
          key={key}
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <div className="text-5xl font-bold text-yellow-400 mb-2">{String(value)}</div>
          <div className="text-gray-400 capitalize">{key.replace('_', ' ')}</div>
        </motion.div>
      ))}
    </div>
    
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-3 bg-green-900/30 border border-green-500/50 px-6 py-3 rounded-full">
        <Lock className="w-6 h-6 text-green-400" />
        <span className="text-xl">Auditado: {content.audit}</span>
      </div>
    </div>
    
    {/* BOTÓN SIGUIENTE */}
    <div className="text-center mt-8">
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
        <Banknote className="w-6 h-6" />
        ¡QUIERO SER PARTE!
        <span className="text-lg">→</span>
      </motion.button>
      
      <div className="mt-4 text-gray-400 text-sm">
        👆 Haz clic para continuar • ⏱️ Auto-avance en 2.5 min
      </div>
    </div>
  </div>
);

const CloseBlock: React.FC<{ content: any; onSubmit: (data: any) => void }> = ({ content, onSubmit }) => {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [formData, setFormData] = useState({
    availability: '',
    contact: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      path: selectedPath,
      ...formData
    });
  };

  return (
    <div className="py-12">
      <h2 className="text-5xl font-bold text-center mb-12">
        Elige Tu Destino 🚀
      </h2>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {content.paths.map((path: any) => (
          <motion.button
            key={path.name}
            onClick={() => setSelectedPath(path.name)}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedPath === path.name
                ? 'border-yellow-400 bg-yellow-400/10'
                : 'border-gray-600 hover:border-gray-400'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <h3 className="font-bold text-xl mb-2">{path.name}</h3>
            <div className="text-yellow-400 mb-2">
              {typeof path.spots === 'number' 
                ? `Solo ${path.spots} lugares`
                : path.spots
              }
            </div>
            <div className="text-sm text-gray-400">
              {path.revenue || path.bonus || path.sla || path.min}
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
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none"
            required
          />
          
          <input
            type="text"
            placeholder="Tu mejor contacto (email/telegram/whatsapp)"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none"
            required
          />
          
          <motion.button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-xl rounded-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🚀 QUIERO SER PARTE
          </motion.button>
          
          <div className="text-center text-yellow-400">
            ⏰ {content.urgency}
          </div>
        </motion.form>
      )}
    </div>
  );
};

export { SalesMasterclass };
export default SalesMasterclass;