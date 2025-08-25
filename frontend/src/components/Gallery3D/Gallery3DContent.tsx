"use client";

import React, { useRef, useState, useEffect } from 'react';

interface Gallery3DContentProps {
  gpuTier: 'low' | 'medium' | 'high';
}

// Placeholder component until Three.js dependencies are installed
export default function Gallery3DContent({ gpuTier }: Gallery3DContentProps) {
  const [currentWall, setCurrentWall] = useState(0);
  const [rotation, setRotation] = useState(0);

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
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360);
    }, 50);
    
    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentWall((prev) => (prev - 1 + walls.length) % walls.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentWall((prev) => (prev + 1) % walls.length);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [walls.length]);

  const handleWallClick = (index: number) => {
    setCurrentWall(index);
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${50 + Math.sin(rotation * Math.PI / 180) * 20}% ${50 + Math.cos(rotation * Math.PI / 180) * 20}%, purple 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* 3D Museum Simulation */}
      <div className="relative h-full flex items-center justify-center perspective-1000 z-10">
        <div 
          className="relative w-[80%] h-[80%] max-w-6xl max-h-[600px] transform-style-3d transition-transform duration-1000"
          style={{
            transform: `rotateY(${currentWall * -90}deg)`,
          }}
        >
          {/* Museum Walls */}
          {walls.map((wall, index) => (
            <div
              key={wall.id}
              className={`absolute inset-0 cursor-pointer transition-all duration-500 ${
                currentWall === index ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'
              }`}
              style={{
                transform: `rotateY(${index * 90}deg) translateZ(300px)`,
                backfaceVisibility: 'hidden',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleWallClick(index);
              }}
            >
              {/* Glass Panel Effect */}
              <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${wall.color} 
                            backdrop-blur-xl border border-white/10 p-8
                            shadow-2xl relative overflow-hidden`}>
                
                {/* Animated Particles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(20)].map((_, i) => (
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
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
        {walls.map((wall, index) => (
          <button
            key={wall.id}
            onClick={(e) => {
              e.stopPropagation();
              handleWallClick(index);
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentWall === index 
                ? 'bg-white scale-125' 
                : 'bg-white/30 hover:bg-white/60'
            }`}
            aria-label={`View ${wall.title}`}
          />
        ))}
      </div>

      {/* Title Overlay */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 
                     bg-clip-text text-transparent mb-2">
          CRYPTOGIFT GALLERY
        </h1>
        <p className="text-gray-400 text-lg">
          Museo Digital Inmersivo • GPU: {gpuTier.toUpperCase()}
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 
                    text-center text-gray-500 text-sm">
        Click en los puntos o usa ← → para navegar
      </div>
    </div>
  );
}