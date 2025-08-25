"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NFTImage } from '../NFTImage';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  image: string;
  description: string;
  price?: string;
  size: 'small' | 'medium' | 'large' | 'hero';
  position: { x: number; y: number };
  isGlass?: boolean; // Para efectos glass especiales
  cryptoType?: string; // NFT, Wallet, Academy, Community
}

interface LuxuryGlassMuseumGalleryProps {
  gpuTier: 'low' | 'medium' | 'high';
}

export default function LuxuryGlassMuseumGallery({ gpuTier }: LuxuryGlassMuseumGalleryProps) {
  const [currentWall, setCurrentWall] = useState(0);
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  // GPU-based quality settings
  const quality = {
    low: { 
      particles: 8, 
      blur: 'backdrop-blur-sm', 
      transition: '1.2s',
      shadows: false,
      reflections: 'opacity-20'
    },
    medium: { 
      particles: 15, 
      blur: 'backdrop-blur-md', 
      transition: '0.9s',
      shadows: true,
      reflections: 'opacity-40'
    },
    high: { 
      particles: 25, 
      blur: 'backdrop-blur-xl', 
      transition: '0.7s',
      shadows: true,
      reflections: 'opacity-60'
    }
  }[gpuTier];

  // LUXURY ART COLLECTION - Using our NFT images and procedural art
  const artworks: Record<string, Artwork[]> = {
    front: [
      // HERO PIECE - Center focal point
      {
        id: 'hero-main',
        title: 'Digital Renaissance',
        artist: 'AI × Human Collaboration',
        year: '2024',
        image: '/Arte-IA-Personalizado.png',
        description: 'The fusion of classical art and modern AI technology, representing the bridge between traditional creativity and digital innovation.',
        price: '₿ 5.0',
        size: 'hero',
        position: { x: 0, y: 0 },
        isGlass: true,
        cryptoType: 'NFT'
      },
      // SUPPORTING PIECES - Flanking the hero
      {
        id: 'crypto-vault-left',
        title: 'Quantum Vault',
        artist: 'CryptoGift Labs',
        year: '2024',
        image: generateGlassCryptoArt('vault-left'),
        description: 'A secure digital vault floating in quantum space, representing the future of asset storage.',
        price: '₿ 2.5',
        size: 'medium',
        position: { x: -35, y: 8 },
        isGlass: true,
        cryptoType: 'Wallet'
      },
      {
        id: 'crypto-vault-right', 
        title: 'Neural Keys',
        artist: 'Blockchain Artisan',
        year: '2024',
        image: generateGlassCryptoArt('vault-right'),
        description: 'Cryptographic keys visualized as neural pathways in a glass medium.',
        price: '₿ 2.5',
        size: 'medium',
        position: { x: 35, y: 8 },
        isGlass: true,
        cryptoType: 'Wallet'
      },
      // ACCENT PIECES - Corner details
      {
        id: 'academy-crystal',
        title: 'Knowledge Crystal',
        artist: 'Learning Labs',
        year: '2024',
        image: generateGlassCryptoArt('crystal'),
        description: 'Crystallized knowledge floating in digital space.',
        price: '₿ 1.8',
        size: 'small',
        position: { x: -45, y: -20 },
        isGlass: true,
        cryptoType: 'Academy'
      },
      {
        id: 'community-orb',
        title: 'Community Nexus',
        artist: 'Social Architect',
        year: '2024',
        image: generateGlassCryptoArt('orb'),
        description: 'The intersection where individual creators become a collective force.',
        price: '₿ 1.8',
        size: 'small',
        position: { x: 45, y: -20 },
        isGlass: true,
        cryptoType: 'Community'
      }
    ],
    right: [
      {
        id: 'wallet-tech-hero',
        title: 'Smart Wallet Evolution',
        artist: 'DeFi Pioneer',
        year: '2024',
        image: generateGlassCryptoArt('wallet-hero'),
        description: 'The evolution of digital wallets from simple storage to intelligent agents.',
        price: '₿ 4.2',
        size: 'hero',
        position: { x: 0, y: 0 },
        isGlass: true,
        cryptoType: 'Wallet'
      },
      {
        id: 'gasless-flow',
        title: 'Gasless Flow',
        artist: 'Transaction Master',
        year: '2024',
        image: generateGlassCryptoArt('gasless'),
        description: 'The seamless flow of gasless transactions through abstract space.',
        price: '₿ 2.8',
        size: 'medium',
        position: { x: -25, y: 15 },
        isGlass: true,
        cryptoType: 'Wallet'
      },
      {
        id: 'recovery-keys',
        title: 'Recovery Matrix',
        artist: 'Security Artist',
        year: '2024',
        image: generateGlassCryptoArt('recovery'),
        description: 'Social recovery visualized as an interconnected matrix of trust.',
        price: '₿ 2.8',
        size: 'medium',
        position: { x: 25, y: 15 },
        isGlass: true,
        cryptoType: 'Wallet'
      }
    ],
    back: [
      {
        id: 'academy-universe',
        title: 'Web3 Learning Universe',
        artist: 'Knowledge Architect',
        year: '2024',
        image: generateGlassCryptoArt('universe'),
        description: 'An infinite universe of blockchain knowledge waiting to be explored.',
        price: '₿ 6.5',
        size: 'hero',
        position: { x: 0, y: 0 },
        isGlass: true,
        cryptoType: 'Academy'
      },
      {
        id: 'certification-tree',
        title: 'Certification Tree',
        artist: 'Growth Designer',
        year: '2024',
        image: generateGlassCryptoArt('tree'),
        description: 'Knowledge grows like a tree, with each certification as a new branch.',
        price: '₿ 3.1',
        size: 'medium',
        position: { x: -30, y: 10 },
        isGlass: true,
        cryptoType: 'Academy'
      },
      {
        id: 'nft-rewards',
        title: 'NFT Achievement Constellation',
        artist: 'Reward Crafter',
        year: '2024',
        image: generateGlassCryptoArt('constellation'),
        description: 'Achievements and rewards scattered across the learning cosmos.',
        price: '₿ 3.1',
        size: 'medium',
        position: { x: 30, y: 10 },
        isGlass: true,
        cryptoType: 'Academy'
      }
    ],
    left: [
      {
        id: 'community-cosmos',
        title: 'Global Creator Cosmos',
        artist: 'Community Builder',
        year: '2024',
        image: generateGlassCryptoArt('cosmos'),
        description: 'A cosmic view of creators connected across the globe through shared vision.',
        price: '₿ 5.8',
        size: 'hero',
        position: { x: 0, y: 0 },
        isGlass: true,
        cryptoType: 'Community'
      },
      {
        id: 'dao-governance',
        title: 'DAO Governance Portal',
        artist: 'Governance Designer',
        year: '2024',
        image: generateGlassCryptoArt('dao'),
        description: 'The democratic architecture of decentralized decision-making.',
        price: '₿ 3.5',
        size: 'medium',
        position: { x: -28, y: 12 },
        isGlass: true,
        cryptoType: 'Community'
      },
      {
        id: 'collaboration-web',
        title: 'Collaboration Web',
        artist: 'Network Weaver',
        year: '2024',
        image: generateGlassCryptoArt('web'),
        description: 'The intricate web of collaboration that binds the community together.',
        price: '₿ 3.5',
        size: 'medium',
        position: { x: 28, y: 12 },
        isGlass: true,
        cryptoType: 'Community'
      }
    ]
  };

  // Generate luxury glass crypto art with themed colors
  function generateGlassCryptoArt(type: string): string {
    const themes = {
      'vault-left': ['#00D4FF', '#0099CC', '#006B8F'], // Cyan vault
      'vault-right': ['#40E0D0', '#20B2AA', '#008B8B'], // Turquoise
      'crystal': ['#32CD32', '#228B22', '#006400'], // Green academy
      'orb': ['#FF6B35', '#E55100', '#BF360C'], // Orange community
      'wallet-hero': ['#1E88E5', '#1565C0', '#0D47A1'], // Blue wallet
      'gasless': ['#00BCD4', '#0097A7', '#006064'], // Cyan flow
      'recovery': ['#7B1FA2', '#6A1B9A', '#4A148C'], // Purple security
      'universe': ['#4CAF50', '#388E3C', '#2E7D32'], // Green learning
      'tree': ['#8BC34A', '#689F38', '#558B2F'], // Light green growth
      'constellation': ['#FFEB3B', '#FBC02D', '#F57F17'], // Yellow achievements
      'cosmos': ['#FF5722', '#D84315', '#BF360C'], // Deep orange community
      'dao': ['#9C27B0', '#7B1FA2', '#4A148C'], // Purple governance
      'web': ['#FF9800', '#F57C00', '#E65100'] // Orange collaboration
    };

    const colors = themes[type] || themes['vault-left'];
    
    // LUXURY GLASS ART WITH CRYPTO THEMES
    const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="glass-${type}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:0.8" />
          <stop offset="50%" style="stop-color:${colors[1]};stop-opacity:0.6" />
          <stop offset="100%" style="stop-color:${colors[2]};stop-opacity:0.9" />
        </linearGradient>
        <filter id="glass-glow-${type}">
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="inner-glow-${type}">
          <feGaussianBlur stdDeviation="3" result="innerGlow"/>
          <feComposite in="innerGlow" in2="SourceGraphic" operator="over"/>
        </filter>
      </defs>
      
      <!-- Glass Background -->
      <rect width="400" height="400" fill="url(#glass-${type})" opacity="0.3"/>
      
      <!-- Glass Effect Layers -->
      <rect x="20" y="20" width="360" height="360" fill="none" stroke="${colors[0]}" stroke-width="2" opacity="0.6" filter="url(#glass-glow-${type})"/>
      <rect x="40" y="40" width="320" height="320" fill="${colors[1]}" opacity="0.1" filter="url(#inner-glow-${type})"/>
      
      ${generateCryptoPattern(type, colors)}
      
      <!-- Glass Surface Effects -->
      <path d="M 50 50 Q 200 80 350 50 T 350 200 T 200 350 T 50 200 Z" fill="none" stroke="white" stroke-width="1" opacity="0.3"/>
      <circle cx="120" cy="120" r="3" fill="white" opacity="0.8"/>
      <circle cx="280" cy="150" r="2" fill="white" opacity="0.6"/>
      <circle cx="200" cy="280" r="4" fill="${colors[0]}" opacity="0.7"/>
      
      <!-- Glass Refraction Lines -->
      <line x1="0" y1="100" x2="400" y2="120" stroke="white" stroke-width="0.5" opacity="0.2"/>
      <line x1="0" y1="300" x2="400" y2="280" stroke="white" stroke-width="0.5" opacity="0.2"/>
    </svg>`;

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  function generateCryptoPattern(type: string, colors: string[]): string {
    const patterns = {
      'vault-left': `<rect x="150" y="150" width="100" height="100" rx="10" fill="none" stroke="${colors[0]}" stroke-width="3" opacity="0.8"/><circle cx="200" cy="200" r="20" fill="${colors[1]}" opacity="0.6"/>`,
      'vault-right': `<polygon points="200,150 250,200 200,250 150,200" fill="${colors[1]}" opacity="0.7" stroke="${colors[0]}" stroke-width="2"/>`,
      'crystal': `<polygon points="200,100 300,180 250,300 150,300 100,180" fill="none" stroke="${colors[0]}" stroke-width="2" opacity="0.8"/><polygon points="200,150 225,200 175,200" fill="${colors[1]}" opacity="0.5"/>`,
      'orb': `<circle cx="200" cy="200" r="80" fill="none" stroke="${colors[0]}" stroke-width="3" opacity="0.7"/><circle cx="200" cy="200" r="40" fill="${colors[1]}" opacity="0.4"/>`,
      'wallet-hero': `<rect x="120" y="160" width="160" height="80" rx="15" fill="none" stroke="${colors[0]}" stroke-width="3"/><circle cx="150" cy="200" r="8" fill="${colors[1]}"/><line x1="180" y1="190" x2="250" y2="190" stroke="${colors[0]}" stroke-width="2"/><line x1="180" y1="210" x2="270" y2="210" stroke="${colors[0]}" stroke-width="2"/>`,
      'gasless': generateFlowPattern(colors),
      'recovery': generateMatrixPattern(colors),
      'universe': generateStarField(colors),
      'tree': generateTreePattern(colors),
      'constellation': generateConstellationPattern(colors),
      'cosmos': generateCosmicPattern(colors),
      'dao': generateGovernancePattern(colors),
      'web': generateWebPattern(colors)
    };
    
    return patterns[type] || patterns['vault-left'];
  }

  function generateFlowPattern(colors: string[]): string {
    return `<path d="M 50 200 Q 150 100 250 200 T 350 200" fill="none" stroke="${colors[0]}" stroke-width="4" opacity="0.8"/><circle cx="100" cy="170" r="3" fill="${colors[1]}"/><circle cx="200" cy="200" r="4" fill="${colors[1]}"/><circle cx="300" cy="200" r="3" fill="${colors[1]}"/>`;
  }

  function generateMatrixPattern(colors: string[]): string {
    let pattern = '';
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const x = 100 + i * 30;
        const y = 100 + j * 30;
        pattern += `<circle cx="${x}" cy="${y}" r="2" fill="${colors[1]}" opacity="${Math.random() * 0.8 + 0.2}"/>`;
        if (i < 5) {
          pattern += `<line x1="${x}" y1="${y}" x2="${x + 30}" y2="${y}" stroke="${colors[0]}" stroke-width="0.5" opacity="0.4"/>`;
        }
        if (j < 5) {
          pattern += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 30}" stroke="${colors[0]}" stroke-width="0.5" opacity="0.4"/>`;
        }
      }
    }
    return pattern;
  }

  function generateStarField(colors: string[]): string {
    let stars = '';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 400;
      const y = Math.random() * 400;
      const size = Math.random() * 2 + 1;
      stars += `<circle cx="${x}" cy="${y}" r="${size}" fill="${colors[Math.floor(Math.random() * colors.length)]}" opacity="${Math.random() * 0.8 + 0.2}"/>`;
    }
    return stars;
  }

  function generateTreePattern(colors: string[]): string {
    return `<line x1="200" y1="350" x2="200" y2="200" stroke="${colors[2]}" stroke-width="8"/><line x1="200" y1="250" x2="170" y2="220" stroke="${colors[1]}" stroke-width="4"/><line x1="200" y1="250" x2="230" y2="220" stroke="${colors[1]}" stroke-width="4"/><line x1="200" y1="280" x2="160" y2="250" stroke="${colors[1]}" stroke-width="3"/><line x1="200" y1="280" x2="240" y2="250" stroke="${colors[1]}" stroke-width="3"/><circle cx="170" cy="220" r="8" fill="${colors[0]}"/><circle cx="230" cy="220" r="8" fill="${colors[0]}"/><circle cx="160" cy="250" r="6" fill="${colors[0]}"/><circle cx="240" cy="250" r="6" fill="${colors[0]}"/>`;
  }

  function generateConstellationPattern(colors: string[]): string {
    const stars = [[150, 120], [200, 100], [250, 130], [180, 180], [220, 170], [160, 220], [240, 200], [200, 250]];
    let pattern = '';
    
    // Draw stars
    stars.forEach(([x, y], i) => {
      pattern += `<circle cx="${x}" cy="${y}" r="4" fill="${colors[0]}" opacity="0.9"/>`;
      pattern += `<circle cx="${x}" cy="${y}" r="2" fill="white" opacity="0.8"/>`;
    });
    
    // Draw connections
    for (let i = 0; i < stars.length - 1; i++) {
      if (Math.random() > 0.4) {
        const [x1, y1] = stars[i];
        const [x2, y2] = stars[i + 1];
        pattern += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[1]}" stroke-width="1" opacity="0.5"/>`;
      }
    }
    
    return pattern;
  }

  function generateCosmicPattern(colors: string[]): string {
    return `<circle cx="200" cy="200" r="100" fill="none" stroke="${colors[0]}" stroke-width="2" opacity="0.6"/><circle cx="200" cy="200" r="60" fill="none" stroke="${colors[1]}" stroke-width="2" opacity="0.8"/><circle cx="200" cy="200" r="20" fill="${colors[2]}" opacity="0.7"/><path d="M 100 200 A 100 100 0 0 1 300 200 A 100 100 0 0 1 100 200 Z" fill="none" stroke="white" stroke-width="1" opacity="0.3"/>`;
  }

  function generateGovernancePattern(colors: string[]): string {
    return `<polygon points="200,120 240,160 240,240 200,280 160,240 160,160" fill="none" stroke="${colors[0]}" stroke-width="3" opacity="0.8"/><circle cx="200" cy="200" r="30" fill="none" stroke="${colors[1]}" stroke-width="2"/><circle cx="200" cy="160" r="6" fill="${colors[1]}"/><circle cx="220" cy="180" r="6" fill="${colors[1]}"/><circle cx="220" cy="220" r="6" fill="${colors[1]}"/><circle cx="200" cy="240" r="6" fill="${colors[1]}"/><circle cx="180" cy="220" r="6" fill="${colors[1]}"/><circle cx="180" cy="180" r="6" fill="${colors[1]}"/>`;
  }

  function generateWebPattern(colors: string[]): string {
    const nodes = [[200, 150], [250, 180], [230, 230], [170, 230], [150, 180], [180, 200], [220, 200]];
    let pattern = '';
    
    // Draw nodes
    nodes.forEach(([x, y]) => {
      pattern += `<circle cx="${x}" cy="${y}" r="8" fill="${colors[1]}" opacity="0.7" stroke="${colors[0]}" stroke-width="2"/>`;
    });
    
    // Draw web connections
    nodes.forEach(([x1, y1], i) => {
      nodes.forEach(([x2, y2], j) => {
        if (i !== j && Math.random() > 0.6) {
          pattern += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[0]}" stroke-width="1" opacity="0.4"/>`;
        }
      });
    });
    
    return pattern;
  }

  const walls = ['front', 'right', 'back', 'left'];

  const handleNextWall = () => {
    setRotationAngle(prev => prev - 90);
    setCurrentWall((prev) => (prev + 1) % 4);
  };

  const handlePrevWall = () => {
    setRotationAngle(prev => prev + 90);
    setCurrentWall((prev) => (prev - 1 + 4) % 4);
  };

  const handleWallClick = (index: number) => {
    const diff = index - currentWall;
    const shortestPath = diff > 2 ? diff - 4 : diff < -2 ? diff + 4 : diff;
    setRotationAngle(prev => prev + (shortestPath * -90));
    setCurrentWall(index);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevWall();
      if (e.key === 'ArrowRight') handleNextWall();
      if (e.key === 'Escape') setSelectedArt(null);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-black overflow-hidden relative">
      {/* LUXURY MUSEUM ATMOSPHERE */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Premium gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/95 to-black" />
        
        {/* Subtle animated atmosphere - GPU optimized */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(quality.particles)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${8 + Math.random() * 12}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 8}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ARCHITECTURAL MUSEUM GALLERY */}
      <div 
        ref={galleryRef}
        className="relative h-full flex items-center justify-center"
        style={{ perspective: '1400px' }}
      >
        {/* LUXURY CEILING - LED Strip System */}
        <div className="absolute top-0 left-0 right-0 h-32 z-20">
          {/* Main ceiling surface - Dark luxury */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900">
            {/* Ceiling texture */}
            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700" />
          </div>
          
          {/* LED Strip Lighting System - Modern luxury */}
          <div className="absolute inset-x-0 top-6">
            {/* Main LED strips - Create perspective lines */}
            <div className="absolute left-0 right-0 h-2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent rounded-full blur-sm" />
            <div className="absolute left-0 right-0 top-2 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full" />
            
            {/* Directional spot lights */}
            <div className="absolute inset-x-0 top-8 flex justify-center gap-32">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="relative">
                  {/* LED housing */}
                  <div className="w-4 h-4 bg-slate-700 rounded-full shadow-inner border border-slate-600">
                    <div className="w-2 h-2 mx-auto mt-1 bg-cyan-100 rounded-full blur-[1px]" />
                  </div>
                  {/* Light beam - Creates dramatic depth */}
                  <div 
                    className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-b from-cyan-50/15 via-cyan-50/5 to-transparent"
                    style={{ 
                      width: '80px', 
                      height: '100vh',
                      clipPath: 'polygon(45% 0%, 55% 0%, 90% 100%, 10% 100%)'
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LUXURY MARBLE FLOOR - Museum grade with perfect reflections */}
        <div className="absolute bottom-0 left-0 right-0 h-40 z-20">
          {/* Base floor - Dark luxury marble */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900 to-transparent">
            {/* Marble veining pattern */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/30 via-transparent to-slate-700/30" />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-600/20 via-transparent to-slate-600/20" />
            </div>
            
            {/* Luxury marble surface reflections */}
            <div 
              className={`absolute inset-0 bg-gradient-to-t from-cyan-500/5 via-transparent to-transparent ${quality.reflections}`}
              style={{
                background: `linear-gradient(to top, 
                  rgba(6, 182, 212, 0.08) 0%, 
                  rgba(6, 182, 212, 0.03) 30%, 
                  transparent 60%)`
              }}
            />
            
            {/* Polished surface highlights */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent" />
          </div>
        </div>

        {/* ARCHITECTURAL GALLERY CUBE - Perfect perspective */}
        <div 
          className="relative"
          style={{
            width: '0px',
            height: '0px', 
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotationAngle}deg)`,
            transition: `transform ${quality.transition} cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
          }}
        >
          {/* FOUR WALLS - Each wall with architectural precision */}
          {walls.map((wall, index) => {
            const currentArtworks = artworks[wall] || [];
            
            // ARCHITECTURAL POSITIONING - Perfect museum perspective 
            let transform = '';
            let wallOpacity = 1;
            let wallWidth = '1000px';
            let wallHeight = '600px';
            
            // Define architectural perspective for each wall
            if (index === 0) {
              // FRONT WALL - Main exhibition space
              transform = 'rotateY(0deg) translateZ(-600px)';
              wallOpacity = 1;
            } else if (index === 1) {
              // RIGHT WALL - Side exhibition  
              transform = 'rotateY(-90deg) translateZ(-600px) translateX(-200px)';
              wallOpacity = 0.4;
              wallWidth = '400px';
            } else if (index === 2) {
              // BACK WALL - Secondary display
              transform = 'rotateY(-180deg) translateZ(-600px)';
              wallOpacity = 0;
            } else if (index === 3) {
              // LEFT WALL - Side exhibition
              transform = 'rotateY(-270deg) translateZ(-600px) translateX(200px)';  
              wallOpacity = 0.4;
              wallWidth = '400px';
            }
            
            return (
              <div
                key={wall}
                className="absolute cursor-pointer"
                style={{
                  width: wallWidth,
                  height: wallHeight,
                  left: '50%',
                  top: '50%',
                  marginLeft: wallWidth === '400px' ? '-200px' : '-500px',
                  marginTop: '-300px',
                  transform,
                  opacity: wallOpacity,
                  backfaceVisibility: 'hidden',
                  pointerEvents: index === 2 ? 'none' : 'auto',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (index !== currentWall) {
                    handleWallClick(index);
                  }
                }}
              >
                {/* LUXURY WALL SURFACE - Museum quality */}
                <div 
                  className="w-full h-full relative overflow-hidden rounded-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
                    boxShadow: quality.shadows 
                      ? 'inset 0 0 100px rgba(0,0,0,0.3), 0 20px 60px rgba(0,0,0,0.4)' 
                      : 'inset 0 0 50px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(148, 163, 184, 0.1)'
                  }}
                >
                  {/* Wall architectural definition - Creates depth */}
                  <div className="absolute inset-0">
                    {/* Main wall texture */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700/10 to-slate-900/20" />
                    
                    {/* Architectural wall edges - Defines wall boundaries */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400/30 to-transparent" />
                    <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-slate-400/30 to-transparent" />
                    <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-400/30 to-transparent" />
                  </div>

                  {/* ARTWORK DISPLAY - Only show on front wall for clarity */}
                  {index === 0 && (
                    <div className="relative w-full h-full">
                      {currentArtworks.map((artwork) => {
                        // SIZE MAPPING - Luxury gallery sizing
                        let frameSize = { width: 200, height: 150 };
                        let glassSize = { width: 180, height: 130 };
                        
                        if (artwork.size === 'hero') {
                          frameSize = { width: 350, height: 280 };
                          glassSize = { width: 330, height: 260 };
                        } else if (artwork.size === 'large') {
                          frameSize = { width: 280, height: 210 };
                          glassSize = { width: 260, height: 190 };
                        } else if (artwork.size === 'medium') {
                          frameSize = { width: 200, height: 150 };
                          glassSize = { width: 180, height: 130 };
                        } else if (artwork.size === 'small') {
                          frameSize = { width: 150, height: 120 };
                          glassSize = { width: 130, height: 100 };
                        }

                        return (
                          <div
                            key={artwork.id}
                            className="absolute cursor-pointer group"
                            style={{
                              left: `calc(50% + ${artwork.position.x}%)`,
                              top: `calc(50% + ${artwork.position.y}%)`,
                              transform: 'translate(-50%, -50%)',
                              width: frameSize.width,
                              height: frameSize.height,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedArt(artwork);
                            }}
                          >
                            {/* LUXURY GLASS FRAME - Museum quality with crypto styling */}
                            <div 
                              className={`w-full h-full relative overflow-hidden rounded-xl transition-all duration-500 group-hover:scale-105 ${quality.blur}`}
                              style={{
                                background: `linear-gradient(135deg, 
                                  rgba(6, 182, 212, 0.15) 0%,
                                  rgba(14, 165, 233, 0.1) 25%,
                                  rgba(59, 130, 246, 0.08) 50%,
                                  rgba(147, 51, 234, 0.1) 75%,
                                  rgba(6, 182, 212, 0.15) 100%
                                )`,
                                border: '2px solid rgba(6, 182, 212, 0.4)',
                                boxShadow: `
                                  0 0 30px rgba(6, 182, 212, 0.3),
                                  inset 0 0 20px rgba(255, 255, 255, 0.1),
                                  0 8px 32px rgba(0, 0, 0, 0.3)
                                `,
                                backdropFilter: 'blur(12px) saturate(180%)',
                              }}
                            >
                              {/* Glass inner glow effect */}
                              <div 
                                className="absolute inset-1 rounded-lg pointer-events-none"
                                style={{
                                  background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(6, 182, 212, 0.1) 100%)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                              />
                              
                              {/* ARTWORK IMAGE - Using our perfect NFTImage component */}
                              <div 
                                className="absolute inset-4 rounded-lg overflow-hidden"
                                style={{
                                  width: glassSize.width,
                                  height: glassSize.height,
                                  left: '50%',
                                  top: '50%',
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                <NFTImage
                                  src={artwork.image}
                                  alt={artwork.title}
                                  width={glassSize.width}
                                  height={glassSize.height}
                                  className="w-full h-full object-cover rounded-lg"
                                  fit="cover"
                                  priority={artwork.size === 'hero'}
                                />
                              </div>
                              
                              {/* CRYPTO TYPE INDICATOR - Top right corner */}
                              <div className="absolute top-2 right-2 z-10">
                                <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                  artwork.cryptoType === 'NFT' ? 'bg-purple-500/80 text-white' :
                                  artwork.cryptoType === 'Wallet' ? 'bg-blue-500/80 text-white' :
                                  artwork.cryptoType === 'Academy' ? 'bg-green-500/80 text-white' :
                                  artwork.cryptoType === 'Community' ? 'bg-orange-500/80 text-white' :
                                  'bg-cyan-500/80 text-white'
                                }`}>
                                  {artwork.cryptoType}
                                </div>
                              </div>

                              {/* ARTWORK INFO - Bottom overlay with glass effect */}
                              <div 
                                className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 backdrop-blur-md"
                                style={{
                                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%)',
                                }}
                              >
                                <h3 className={`font-bold text-white mb-1 ${
                                  artwork.size === 'hero' ? 'text-sm' : 
                                  artwork.size === 'large' ? 'text-xs' : 'text-[10px]'
                                }`}>
                                  {artwork.title}
                                </h3>
                                <div className="flex justify-between items-center">
                                  <span className={`text-cyan-300 font-medium ${
                                    artwork.size === 'hero' ? 'text-xs' : 'text-[9px]'
                                  }`}>
                                    {artwork.artist}
                                  </span>
                                  {artwork.price && (
                                    <span className={`text-yellow-400 font-bold ${
                                      artwork.size === 'hero' ? 'text-xs' : 'text-[9px]'
                                    }`}>
                                      {artwork.price}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* GLASS REFLECTION EFFECTS - Luxury details */}
                              <div className="absolute top-4 left-4 w-8 h-8 bg-white/20 rounded-full blur-md pointer-events-none" />
                              <div className="absolute top-1/3 right-6 w-2 h-16 bg-white/10 rounded-full blur-sm pointer-events-none" />
                              <div className="absolute bottom-1/4 left-1/2 w-12 h-1 bg-cyan-400/30 rounded-full blur-sm pointer-events-none" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NAVIGATION CONTROLS - Museum style */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex items-center gap-8 z-30">
        <button
          onClick={handlePrevWall}
          className={`w-12 h-12 rounded-full bg-slate-800/80 hover:bg-slate-700/90 border border-cyan-400/40 hover:border-cyan-400/80 backdrop-blur-md flex items-center justify-center transition-all duration-300 ${quality.blur}`}
          style={{
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.05)'
          }}
        >
          <span className="text-cyan-300 text-xl font-bold">←</span>
        </button>
        
        <div className="flex gap-3">
          {walls.map((wall, index) => (
            <button
              key={wall}
              onClick={(e) => {
                e.stopPropagation();
                handleWallClick(index);
              }}
              className={`transition-all duration-300 rounded-full ${
                currentWall === index 
                  ? 'w-12 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-cyan-400/50' 
                  : 'w-3 h-3 bg-slate-600 hover:bg-slate-500 hover:shadow-lg hover:shadow-cyan-400/30'
              }`}
              style={{
                boxShadow: currentWall === index 
                  ? '0 0 15px rgba(6, 182, 212, 0.6)' 
                  : '0 0 8px rgba(0, 0, 0, 0.3)'
              }}
            />
          ))}
        </div>
        
        <button
          onClick={handleNextWall}
          className={`w-12 h-12 rounded-full bg-slate-800/80 hover:bg-slate-700/90 border border-cyan-400/40 hover:border-cyan-400/80 backdrop-blur-md flex items-center justify-center transition-all duration-300 ${quality.blur}`}
          style={{
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.05)'
          }}
        >
          <span className="text-cyan-300 text-xl font-bold">→</span>
        </button>
      </div>

      {/* WALL LABELS - Museum information */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-center z-30">
        <div className={`px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-slate-600/50 ${quality.blur}`}>
          <span className="text-cyan-300 text-sm font-medium">
            {walls[currentWall].charAt(0).toUpperCase() + walls[currentWall].slice(1)} Wall
          </span>
          <div className="text-slate-400 text-xs mt-1">
            {currentWall === 0 && 'NFT Collection & Digital Art'}
            {currentWall === 1 && 'Smart Wallets & Security'}  
            {currentWall === 2 && 'Web3 Academy & Learning'}
            {currentWall === 3 && 'Global Community & DAO'}
          </div>
        </div>
      </div>

      {/* INSTRUCTIONS - Subtle museum guide */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center z-30">
        <div className="text-slate-500 text-xs bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
          Use ← → arrows or click artworks to navigate • Press ESC to close details
        </div>
      </div>

      {/* ARTWORK MODAL - Using our perfect NFTImageModal system */}
      <AnimatePresence>
        {selectedArt && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedArt(null)}
          >
            <motion.div
              className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-auto border border-cyan-400/30"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow: '0 0 60px rgba(6, 182, 212, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedArt(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center border border-cyan-400/40 transition-all"
              >
                <span className="text-cyan-300 text-xl">×</span>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image section */}
                <div className="relative">
                  <div className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-cyan-400/20">
                    <NFTImage
                      src={selectedArt.image}
                      alt={selectedArt.title}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover"
                      fit="cover"
                      priority={true}
                    />
                  </div>
                </div>

                {/* Info section */}
                <div className="space-y-6">
                  <div>
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold mb-4 ${
                      selectedArt.cryptoType === 'NFT' ? 'bg-purple-500/80 text-white' :
                      selectedArt.cryptoType === 'Wallet' ? 'bg-blue-500/80 text-white' :
                      selectedArt.cryptoType === 'Academy' ? 'bg-green-500/80 text-white' :
                      selectedArt.cryptoType === 'Community' ? 'bg-orange-500/80 text-white' :
                      'bg-cyan-500/80 text-white'
                    }`}>
                      {selectedArt.cryptoType}
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{selectedArt.title}</h2>
                    <p className="text-cyan-300 text-lg">{selectedArt.artist} • {selectedArt.year}</p>
                    {selectedArt.price && (
                      <p className="text-yellow-400 text-xl font-bold mt-2">{selectedArt.price}</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                    <p className="text-slate-300 leading-relaxed">{selectedArt.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Collection:</span>
                        <p className="text-white font-medium">CryptoGift Gallery</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Category:</span>
                        <p className="text-white font-medium">{selectedArt.cryptoType}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Medium:</span>
                        <p className="text-white font-medium">Digital Glass Art</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Year:</span>
                        <p className="text-white font-medium">{selectedArt.year}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => setSelectedArt(null)}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                      style={{
                        boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
                      }}
                    >
                      Close Gallery View
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// CSS animations for floating particles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0%, 100% { 
        transform: translateY(0px) translateX(0px) scale(1);
        opacity: 0.4;
      }
      25% { 
        transform: translateY(-10px) translateX(5px) scale(1.1);
        opacity: 0.8;
      }
      50% { 
        transform: translateY(-5px) translateX(-3px) scale(0.9);
        opacity: 0.6;
      }
      75% { 
        transform: translateY(-15px) translateX(8px) scale(1.05);
        opacity: 0.9;
      }
    }
  `;
  
  if (!document.head.querySelector('style[data-luxury-gallery-styles]')) {
    style.setAttribute('data-luxury-gallery-styles', 'true');
    document.head.appendChild(style);
  }
}