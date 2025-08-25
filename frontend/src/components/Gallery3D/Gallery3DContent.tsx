"use client";

import React, { useRef, useState, useEffect } from 'react';

interface Gallery3DContentProps {
  gpuTier: 'low' | 'medium' | 'high';
}

// Placeholder component until Three.js dependencies are installed
export default function Gallery3DContent({ gpuTier }: Gallery3DContentProps) {
  const [currentWall, setCurrentWall] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0); // Accumulated rotation angle for smooth transitions
  
  // GPU-based quality settings
  const quality = {
    low: { particles: 5, blur: 'backdrop-blur-sm', transition: '1s' },
    medium: { particles: 10, blur: 'backdrop-blur-md', transition: '0.8s' },
    high: { particles: 20, blur: 'backdrop-blur-xl', transition: '0.6s' }
  }[gpuTier];

  const walls = [
    {
      id: 'nft',
      title: "NFT Collection",
      description: "Arte digital único creado con IA",
      color: "from-purple-600 to-purple-900",
      icon: "🎨",
      features: [
        "Generación con IA personalizada",
        "Verificación blockchain",
        "Propiedad verdadera",
        "Marketplace integrado"
      ]
    },
    {
      id: 'wallets',
      title: "Smart Wallets",
      description: "Seguridad blockchain avanzada",
      color: "from-blue-600 to-blue-900",
      icon: "🔐",
      features: [
        "Abstracción de cuentas",
        "Gasless transactions",
        "Recovery social",
        "Multi-signature"
      ]
    },
    {
      id: 'academy',
      title: "Academia Web3",
      description: "Aprende y gana certificados NFT",
      color: "from-green-600 to-green-900",
      icon: "🎓",
      features: [
        "Cursos interactivos",
        "Certificados NFT",
        "Gamificación",
        "Comunidad de aprendizaje"
      ]
    },
    {
      id: 'community',
      title: "Comunidad Global",
      description: "Conecta con creadores del mundo",
      color: "from-orange-600 to-orange-900",
      icon: "🌍",
      features: [
        "DAO governance",
        "Eventos exclusivos",
        "Colaboraciones",
        "Rewards system"
      ]
    }
  ];

  useEffect(() => {
    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevWall();
      } else if (e.key === 'ArrowRight') {
        handleNextWall();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleWallClick = (index: number) => {
    // Calculate shortest rotation path to target wall
    const diff = index - currentWall;
    const shortestPath = diff > 2 ? diff - 4 : diff < -2 ? diff + 4 : diff;
    setRotationAngle(prev => prev + (shortestPath * 90));
    setCurrentWall(index);
  };
  
  const handleNextWall = () => {
    setRotationAngle(prev => prev - 90); // Continuous rotation
    setCurrentWall((prev) => (prev + 1) % walls.length);
  };
  
  const handlePrevWall = () => {
    setRotationAngle(prev => prev + 90); // Continuous rotation
    setCurrentWall((prev) => (prev - 1 + walls.length) % walls.length);
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {/* Animated Background with CSS Animation */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div 
          className="absolute inset-0 opacity-30 animate-gradient-shift"
          style={{
            background: `radial-gradient(circle at 50% 50%, purple 0%, transparent 50%)`,
          }}
        />
      </div>
      
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(90deg); }
          50% { transform: scale(1) rotate(180deg); }
          75% { transform: scale(1.1) rotate(270deg); }
        }
        .animate-gradient-shift {
          animation: gradient-shift 20s ease-in-out infinite;
        }
      `}</style>

      {/* 3D Museum Room - INTERIOR VIEW CORRECTED */}
      <div className="relative h-full flex items-center justify-center" style={{ perspective: '1200px' }}>
        <div 
          className="relative"
          style={{
            width: '0px', // Container at center point
            height: '0px',
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotationAngle}deg)`, // Use accumulated rotation angle
            transition: `transform ${quality.transition} cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          {/* Room Walls - TRUE INTERIOR VIEW */}
          {walls.map((wall, index) => {
            // INTERIOR VIEW: We are INSIDE looking at walls that surround us
            // First rotate to position, then translate BACKWARDS to create interior
            let transform = '';
            if (index === 0) transform = 'rotateY(0deg) translateZ(-400px)';      // Front wall - push back
            if (index === 1) transform = 'rotateY(-90deg) translateZ(-400px)';    // Right wall - rotate left, push back
            if (index === 2) transform = 'rotateY(-180deg) translateZ(-400px)';   // Back wall - rotate 180, push back
            if (index === 3) transform = 'rotateY(-270deg) translateZ(-400px)';   // Left wall - rotate right, push back
            
            return (
              <div
                key={wall.id}
                className="absolute cursor-pointer"
                style={{
                  width: '800px',  // Larger for immersive view
                  height: '600px', // Larger for immersive view
                  left: '50%',
                  top: '50%',
                  marginLeft: '-400px', // Center the larger walls
                  marginTop: '-300px',  // Center the larger walls
                  transform,
                  backfaceVisibility: 'hidden', // Hide back faces for clean interior
                }}
              onClick={(e) => {
                e.stopPropagation();
                handleNextWall();
              }}
            >
              {/* Glass Panel Effect */}
              <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${wall.color} 
                            ${quality.blur} border border-white/10 p-8
                            shadow-2xl relative overflow-hidden`}>
                
                {/* Animated Particles - GPU optimized */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(quality.particles)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${5 + Math.random() * 10}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col">
                  {/* Icon */}
                  <div className="text-6xl mb-4">{wall.icon}</div>
                  
                  {/* Title */}
                  <h2 className="text-4xl font-bold text-white mb-2">{wall.title}</h2>
                  
                  {/* Description */}
                  <p className="text-xl text-white/80 mb-6">{wall.description}</p>
                  
                  {/* Features */}
                  <div className="flex-1 flex flex-col justify-center">
                    <ul className="space-y-3">
                      {wall.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-white/90">
                          <span className="w-2 h-2 bg-white/60 rounded-full" />
                          <span className="text-lg">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Security Panel */}
                  <div className="mt-6 p-4 bg-black/30 rounded-xl backdrop-blur-sm border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 text-sm font-mono">SECURITY: VERIFIED</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-100" />
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-200" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glass Refraction Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-20">
        <button
          onClick={handlePrevWall}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all"
          aria-label="Previous wall"
        >
          <span className="text-white">←</span>
        </button>
        
        <div className="flex gap-2">
          {walls.map((wall, index) => (
            <button
              key={wall.id}
              onClick={(e) => {
                e.stopPropagation();
                handleWallClick(index);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentWall === index 
                  ? 'bg-white w-8' 
                  : 'bg-white/30 hover:bg-white/60'
              }`}
              aria-label={`View ${wall.title}`}
            />
          ))}
        </div>
        
        <button
          onClick={handleNextWall}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all"
          aria-label="Next wall"
        >
          <span className="text-white">→</span>
        </button>
      </div>

      {/* Title Overlay */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
          CRYPTOGIFT GALLERY
        </h1>
        <p className="text-gray-400 text-lg">
          Museo Digital Inmersivo • GPU: {gpuTier.toUpperCase()}
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center text-gray-400 text-sm bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
        Usa las flechas ← → o click en las paredes para rotar
      </div>
    </div>
  );
}