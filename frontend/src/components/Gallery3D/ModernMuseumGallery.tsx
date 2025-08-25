"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  futuristic?: boolean;
}

interface ModernMuseumGalleryProps {
  gpuTier: 'low' | 'medium' | 'high';
}

export default function ModernMuseumGallery({ gpuTier }: ModernMuseumGalleryProps) {
  const [currentWall, setCurrentWall] = useState(0);
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  
  // Generate dynamic artworks
  const generateArtworks = (): Record<string, Artwork[]> => {
    return {
      front: [
        // Hero piece - center
        {
          id: 'mona-modern',
          title: 'Digital Renaissance',
          artist: 'AI × Human Collaboration',
          year: '2024',
          image: '/Arte-IA-Personalizado.png',
          description: 'A fusion of classical art and modern identity',
          price: '₿ 2.5',
          size: 'hero',
          position: { x: 0, y: 0 },
          futuristic: true
        },
        // Left side pieces
        {
          id: 'cyber-1',
          title: 'Neon Dreams',
          artist: 'CryptoArtist #001',
          year: '2024',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('gradient1')),
          description: 'Abstract representation of digital consciousness',
          price: '₿ 0.8',
          size: 'small',
          position: { x: -35, y: 0 }
        },
        {
          id: 'cyber-2',
          title: 'Quantum Particles',
          artist: 'Neural Network',
          year: '2024',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('particles')),
          description: 'Visualization of quantum superposition',
          price: '₿ 1.2',
          size: 'small',
          position: { x: -35, y: -15 }
        },
        // Right side pieces
        {
          id: 'cyber-3',
          title: 'Binary Sunset',
          artist: 'Digital Nomad',
          year: '2024',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('sunset')),
          description: 'The last sunset in the metaverse',
          price: '₿ 1.5',
          size: 'small',
          position: { x: 35, y: 0 }
        },
        {
          id: 'cyber-4',
          title: 'Neural Pathways',
          artist: 'Synaptic Artist',
          year: '2024',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('neural')),
          description: 'Mapping the digital mind',
          price: '₿ 0.9',
          size: 'small',
          position: { x: 35, y: -15 }
        }
      ],
      right: [
        {
          id: 'hologram-1',
          title: 'Holographic Memory',
          artist: 'Time Traveler',
          year: '2055',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('hologram')),
          description: 'Memories stored in light',
          price: '₿ 3.0',
          size: 'large',
          position: { x: 0, y: 0 },
          futuristic: true
        },
        {
          id: 'matrix-1',
          title: 'Code Rain',
          artist: 'The Architect',
          year: '2024',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('matrix')),
          description: 'The fabric of digital reality',
          price: '₿ 2.1',
          size: 'medium',
          position: { x: -20, y: 10 }
        }
      ],
      back: [
        {
          id: 'portal-1',
          title: 'Interdimensional Gateway',
          artist: 'Void Walker',
          year: '2024',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('portal')),
          description: 'Gateway to parallel universes',
          price: '₿ 5.0',
          size: 'hero',
          position: { x: 0, y: 0 },
          futuristic: true
        }
      ],
      left: [
        {
          id: 'crystal-1',
          title: 'Data Crystals',
          artist: 'Quantum Sculptor',
          year: '2024',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('crystal')),
          description: 'Information crystallized',
          price: '₿ 1.8',
          size: 'medium',
          position: { x: 0, y: 0 }
        },
        {
          id: 'wave-1',
          title: 'Sine Wave Symphony',
          artist: 'Frequency Master',
          year: '2024',
          image: 'data:image/svg+xml;base64,' + btoa(generateArtSVG('wave')),
          description: 'Music visualized',
          price: '₿ 1.3',
          size: 'medium',
          position: { x: 20, y: 10 }
        }
      ]
    };
  };

  // Generate procedural art SVGs
  function generateArtSVG(type: string): string {
    const colors = {
      gradient1: ['#8B5CF6', '#3B82F6', '#10B981'],
      particles: ['#F59E0B', '#EF4444', '#8B5CF6'],
      sunset: ['#F97316', '#EF4444', '#A855F7'],
      neural: ['#3B82F6', '#10B981', '#F59E0B'],
      hologram: ['#60A5FA', '#A78BFA', '#F472B6'],
      matrix: ['#10B981', '#34D399', '#6EE7B7'],
      portal: ['#8B5CF6', '#A855F7', '#C084FC'],
      crystal: ['#60A5FA', '#3B82F6', '#1E40AF'],
      wave: ['#10B981', '#34D399', '#059669']
    };

    const selectedColors = colors[type] || colors.gradient1;
    
    return `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-${type}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${selectedColors[0]};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${selectedColors[1]};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${selectedColors[2]};stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="400" height="400" fill="url(#grad-${type})" />
        ${type === 'particles' ? generateParticles() : ''}
        ${type === 'neural' ? generateNeuralNetwork() : ''}
        ${type === 'matrix' ? generateMatrix() : ''}
        ${type === 'wave' ? generateWaves() : ''}
        ${type === 'crystal' ? generateCrystal() : ''}
        ${type === 'portal' ? generatePortal() : ''}
      </svg>
    `;
  }

  function generateParticles(): string {
    let particles = '';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 400;
      const y = Math.random() * 400;
      const r = Math.random() * 3 + 1;
      particles += `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="0.8" filter="url(#glow)"/>`;
    }
    return particles;
  }

  function generateNeuralNetwork(): string {
    let paths = '';
    for (let i = 0; i < 20; i++) {
      const x1 = Math.random() * 400;
      const y1 = Math.random() * 400;
      const x2 = Math.random() * 400;
      const y2 = Math.random() * 400;
      paths += `<path d="M ${x1} ${y1} Q ${(x1+x2)/2} ${(y1+y2)/2 - 50} ${x2} ${y2}" 
                     stroke="white" stroke-width="1" fill="none" opacity="0.3"/>`;
    }
    return paths;
  }

  function generateMatrix(): string {
    let text = '';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 400;
      const y = Math.random() * 400;
      const char = String.fromCharCode(0x30A0 + Math.random() * 96);
      text += `<text x="${x}" y="${y}" fill="#10B981" font-family="monospace" 
                     font-size="14" opacity="${Math.random()}">${char}</text>`;
    }
    return text;
  }

  function generateWaves(): string {
    let waves = '';
    for (let i = 0; i < 5; i++) {
      const amplitude = 30 + i * 10;
      const frequency = 0.02 - i * 0.002;
      let path = 'M 0 200 ';
      for (let x = 0; x <= 400; x += 5) {
        const y = 200 + Math.sin(x * frequency) * amplitude;
        path += `L ${x} ${y} `;
      }
      waves += `<path d="${path}" stroke="white" stroke-width="${3-i*0.5}" 
                      fill="none" opacity="${0.8 - i * 0.1}"/>`;
    }
    return waves;
  }

  function generateCrystal(): string {
    return `
      <polygon points="200,50 300,150 250,350 150,350 100,150" 
               fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
      <polygon points="200,100 250,150 225,250 175,250 150,150" 
               fill="white" opacity="0.2"/>
      <line x1="200" y1="50" x2="200" y2="350" stroke="white" opacity="0.4"/>
      <line x1="100" y1="150" x2="300" y2="150" stroke="white" opacity="0.4"/>
    `;
  }

  function generatePortal(): string {
    let rings = '';
    for (let i = 0; i < 10; i++) {
      const r = 50 + i * 15;
      rings += `<circle cx="200" cy="200" r="${r}" fill="none" 
                       stroke="white" stroke-width="${3 - i * 0.2}" 
                       opacity="${1 - i * 0.08}"/>`;
    }
    return rings;
  }

  const [artworks] = useState(generateArtworks());
  const walls = ['front', 'right', 'back', 'left'];

  const handleNextWall = () => {
    setRotationAngle(prev => prev - 90);
    setCurrentWall((prev) => (prev + 1) % 4);
  };

  const handlePrevWall = () => {
    setRotationAngle(prev => prev + 90);
    setCurrentWall((prev) => (prev - 1 + 4) % 4);
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
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {/* Futuristic Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950" />
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" 
               style={{
                 backgroundImage: `linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)`,
                 backgroundSize: '50px 50px',
                 animation: 'grid-move 10s linear infinite'
               }} />
        </div>
      </div>

      {/* Gallery Room Container */}
      <div className="relative h-full" style={{ perspective: '1000px' }}>
        {/* Ceiling */}
        <div className="absolute top-0 left-0 right-0 h-20 z-20 bg-gradient-to-b from-gray-900 to-transparent">
          {/* Futuristic LED strips */}
          <div className="flex justify-center gap-16 pt-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="relative">
                <div className="w-20 h-1 bg-cyan-400 blur-sm animate-pulse" 
                     style={{ animationDelay: `${i * 0.2}s` }} />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-32 
                              bg-gradient-to-b from-cyan-400/20 to-transparent" />
              </div>
            ))}
          </div>
        </div>

        {/* Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-32 z-20">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/80 to-transparent">
            {/* Reflective surface */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {/* Holographic floor pattern */}
            <div className="absolute inset-0 opacity-20"
                 style={{
                   backgroundImage: `repeating-linear-gradient(90deg, 
                     transparent, transparent 50px, 
                     rgba(0,255,255,0.1) 50px, rgba(0,255,255,0.1) 51px)`,
                   animation: 'floor-scan 5s linear infinite'
                 }} />
          </div>
        </div>

        {/* Rotating Gallery Container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="relative"
            style={{
              width: '1200px',
              height: '600px',
              transformStyle: 'preserve-3d',
              transform: `rotateY(${rotationAngle}deg)`,
              transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Gallery Walls */}
            {walls.map((wall, index) => {
              const wallArtworks = artworks[wall] || [];
              let transform = '';
              let width = '1200px';
              let height = '600px';
              
              // Position walls to form a continuous room
              if (index === 0) transform = 'translateZ(600px)';           // Front
              if (index === 1) transform = 'rotateY(90deg) translateZ(600px)';   // Right
              if (index === 2) transform = 'rotateY(180deg) translateZ(600px)';  // Back
              if (index === 3) transform = 'rotateY(270deg) translateZ(600px)';  // Left
              
              return (
                <div
                  key={wall}
                  className="absolute"
                  style={{
                    width,
                    height,
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${parseInt(width)/2}px`,
                    marginTop: `-${parseInt(height)/2}px`,
                    transform,
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {/* Wall Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
                    {/* Futuristic wall texture */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0"
                           style={{
                             backgroundImage: `repeating-linear-gradient(45deg, 
                               transparent, transparent 10px, 
                               rgba(0,255,255,0.1) 10px, rgba(0,255,255,0.1) 11px)`,
                           }} />
                    </div>
                  </div>

                  {/* Artworks on Wall */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {wallArtworks.map((artwork) => {
                      const sizes = {
                        small: 'w-32 h-32',
                        medium: 'w-48 h-48',
                        large: 'w-64 h-64',
                        hero: 'w-80 h-80'
                      };
                      
                      return (
                        <div
                          key={artwork.id}
                          className={`absolute ${sizes[artwork.size]} cursor-pointer 
                                    transform hover:scale-105 transition-all duration-300`}
                          style={{
                            left: `${50 + artwork.position.x}%`,
                            top: `${50 + artwork.position.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          onClick={() => setSelectedArt(artwork)}
                        >
                          {/* Frame */}
                          <div className={`relative w-full h-full p-2 
                                        ${artwork.futuristic 
                                          ? 'bg-gradient-to-br from-cyan-600 to-purple-600' 
                                          : 'bg-gradient-to-br from-amber-800 to-amber-900'}
                                        shadow-2xl`}>
                            {/* Artwork */}
                            <div className="relative w-full h-full bg-black overflow-hidden">
                              {artwork.image.startsWith('/') ? (
                                <img 
                                  src={artwork.image} 
                                  alt={artwork.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img 
                                  src={artwork.image} 
                                  alt={artwork.title}
                                  className="w-full h-full"
                                />
                              )}
                              
                              {/* Holographic overlay for futuristic pieces */}
                              {artwork.futuristic && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-purple-500/20 animate-pulse" />
                              )}
                            </div>
                            
                            {/* Title Plaque */}
                            <div className="absolute -bottom-8 left-0 right-0 bg-black/80 backdrop-blur-sm px-2 py-1">
                              <p className="text-xs text-white text-center truncate">{artwork.title}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-30">
        <button
          onClick={handlePrevWall}
          className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-sm border border-cyan-500/50 flex items-center justify-center transition-all"
        >
          <span className="text-cyan-400">←</span>
        </button>
        
        <div className="flex gap-2">
          {walls.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentWall === index 
                  ? 'bg-cyan-400 w-8 shadow-lg shadow-cyan-400/50' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={handleNextWall}
          className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-sm border border-cyan-500/50 flex items-center justify-center transition-all"
        >
          <span className="text-cyan-400">→</span>
        </button>
      </div>

      {/* Artwork Detail Modal */}
      <AnimatePresence>
        {selectedArt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-8"
            onClick={() => setSelectedArt(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="max-w-4xl w-full bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-cyan-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid md:grid-cols-2 gap-8">
                <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                  {selectedArt.image.startsWith('/') ? (
                    <img 
                      src={selectedArt.image} 
                      alt={selectedArt.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={selectedArt.image} 
                      alt={selectedArt.title}
                      className="w-full h-full"
                    />
                  )}
                </div>
                
                <div className="flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{selectedArt.title}</h2>
                    <p className="text-cyan-400 mb-4">{selectedArt.artist} • {selectedArt.year}</p>
                    <p className="text-gray-300 mb-6">{selectedArt.description}</p>
                  </div>
                  
                  {selectedArt.price && (
                    <div className="bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg p-4">
                      <p className="text-white text-2xl font-bold">{selectedArt.price}</p>
                      <p className="text-white/80 text-sm">Current Price</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes floor-scan {
          0% { transform: translateX(0); }
          100% { transform: translateX(50px); }
        }
      `}</style>
    </div>
  );
}