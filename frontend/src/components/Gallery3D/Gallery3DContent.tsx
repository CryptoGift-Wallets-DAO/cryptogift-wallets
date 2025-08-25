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

      {/* Modern Gallery Room - Professional Museum Style */}
      <div className="relative h-full flex items-center justify-center" style={{ perspective: '1200px' }}>
        {/* Professional Gallery Ceiling with Recessed Lighting */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-900 to-gray-850 z-10">
          {/* Main ceiling surface */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900">
            {/* Subtle texture */}
            <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700" />
          </div>
          
          {/* Recessed LED Track Lighting */}
          <div className="absolute inset-x-0 top-4 flex justify-center gap-24">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="relative">
                {/* Light housing */}
                <div className="w-6 h-6 bg-black rounded-full shadow-inner">
                  <div className="w-4 h-4 mx-auto mt-1 bg-yellow-100 rounded-full blur-sm" />
                </div>
                {/* Light beam */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-96 bg-gradient-to-b from-yellow-50/20 via-yellow-50/5 to-transparent" 
                     style={{ clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Marble Floor with Reflections */}
        <div className="absolute bottom-0 left-0 right-0 h-32 z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900 to-transparent">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-transparent to-gray-800/20" />
            {/* Marble Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700" 
                   style={{ backgroundSize: '100px 100px' }} />
            </div>
            {/* Reflection Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        </div>

        <div 
          className="relative"
          style={{
            width: '0px',
            height: '0px',
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotationAngle}deg)`,
            transition: `transform ${quality.transition} cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          {/* Gallery Walls - Only Front Wall Fully Visible */}
          {walls.map((wall, index) => {
            // Configure walls for museum-style view
            let transform = '';
            let opacity = 1;
            let width = '800px';
            
            if (index === 0) {
              transform = 'rotateY(0deg) translateZ(-500px)';      // Front wall - main display
              opacity = 1;
            } else if (index === 1) {
              transform = 'rotateY(-90deg) translateZ(-500px) translateX(-350px)';    // Right wall - partial
              opacity = 0.3;
              width = '200px';
            } else if (index === 2) {
              transform = 'rotateY(-180deg) translateZ(-500px)';   // Back wall - hidden
              opacity = 0;
            } else if (index === 3) {
              transform = 'rotateY(-270deg) translateZ(-500px) translateX(350px)';   // Left wall - partial
              opacity = 0.3;
              width = '200px';
            }
            
            return (
              <div
                key={wall.id}
                className="absolute cursor-pointer"
                style={{
                  width: index === 1 || index === 3 ? width : '800px',
                  height: '500px',
                  left: '50%',
                  top: '50%',
                  marginLeft: index === 1 || index === 3 ? '-100px' : '-400px',
                  marginTop: '-250px',
                  transform,
                  opacity,
                  backfaceVisibility: 'hidden',
                  pointerEvents: index === 2 ? 'none' : 'auto', // Disable clicks on hidden wall
                }}
              onClick={(e) => {
                e.stopPropagation();
                handleNextWall();
              }}
            >
              {/* Museum Art Frame */}
              <div className={`w-full h-full ${index === 1 || index === 3 ? 'bg-gray-800' : `bg-gradient-to-br ${wall.color}`} 
                            border-8 border-amber-900 shadow-2xl relative overflow-hidden`}
                   style={{ 
                     boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)',
                     background: index === 1 || index === 3 ? '#1a1a1a' : undefined 
                   }}>
                
                {/* Only show content on front wall */}
                {index === 0 && (
                  <>
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

                </div>

                {/* Glass Refraction Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                  </>
                )}
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


      {/* Instructions */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center text-gray-400 text-sm bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
        Usa las flechas ← → o click en las paredes para rotar
      </div>
    </div>
  );
}