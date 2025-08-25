"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';

interface WallData {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  features: string[];
  position: [number, number, number];
  rotation: [number, number, number];
}

// Componente para cada pared/obra
function Artwork({ data, index, onNext }: { data: WallData; index: number; onNext: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  // Simple scale animation without react-spring
  useFrame(() => {
    if (meshRef.current) {
      const targetScale = hovered ? 1.05 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <group position={data.position} rotation={data.rotation}>
      {/* Cuadro/Obra en la pared */}
      <mesh
        ref={meshRef}
        onClick={() => setShowPanel(!showPanel)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial 
          color={data.color}
          transparent
          opacity={0.8}
          emissive={data.color}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </mesh>

      {/* Título de la obra */}
      <Text
        position={[0, 2.5, 0.1]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {data.title}
      </Text>

      {/* Panel de información (overlay HTML) */}
      {showPanel && (
        <Html center distanceFactor={10}>
          <div className="backdrop-blur-xl bg-black/80 p-6 rounded-2xl border border-white/20 
                        min-w-[300px] max-w-[400px] text-white">
            <h3 className="text-xl font-bold mb-2">{data.title}</h3>
            <p className="text-sm text-gray-300 mb-4">{data.description}</p>
            <ul className="space-y-1 mb-4">
              {data.features.map((feature, i) => (
                <li key={i} className="text-xs text-gray-400">• {feature}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPanel(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all"
              >
                Cerrar
              </button>
              <button 
                onClick={onNext}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 
                         hover:from-purple-700 hover:to-blue-700 rounded-lg text-sm transition-all"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Componente de la sala/museo
function Room({ currentWall, onNext }: { currentWall: number; onNext: () => void }) {
  const walls: WallData[] = [
    {
      id: 'nft',
      title: "NFT Collection",
      description: "Arte digital único creado con IA",
      color: "#8b5cf6",
      icon: "🎨",
      features: [
        "Generación con IA personalizada",
        "Verificación blockchain",
        "Propiedad verdadera",
        "Marketplace integrado"
      ],
      position: [0, 0, -9.9],
      rotation: [0, 0, 0]
    },
    {
      id: 'wallets',
      title: "Smart Wallets",
      description: "Seguridad blockchain avanzada",
      color: "#3b82f6",
      icon: "🔐",
      features: [
        "Abstracción de cuentas",
        "Gasless transactions",
        "Recovery social",
        "Multi-signature"
      ],
      position: [9.9, 0, 0],
      rotation: [0, -Math.PI/2, 0]
    },
    {
      id: 'academy',
      title: "Academia Web3",
      description: "Aprende y gana certificados NFT",
      color: "#10b981",
      icon: "🎓",
      features: [
        "Cursos interactivos",
        "Certificados NFT",
        "Gamificación",
        "Comunidad de aprendizaje"
      ],
      position: [0, 0, 9.9],
      rotation: [0, Math.PI, 0]
    },
    {
      id: 'community',
      title: "Comunidad Global",
      description: "Conecta con creadores del mundo",
      color: "#f97316",
      icon: "🌍",
      features: [
        "DAO governance",
        "Eventos exclusivos",
        "Colaboraciones",
        "Rewards system"
      ],
      position: [-9.9, 0, 0],
      rotation: [0, Math.PI/2, 0]
    }
  ];

  return (
    <>
      {/* Sala con BackSide - ESTO ES CLAVE PARA VER DESDE DENTRO */}
      <mesh>
        <boxGeometry args={[20, 10, 20]} />
        <meshStandardMaterial 
          color="#0a0e15" 
          side={THREE.BackSide}  // ← CRÍTICO: Renderiza el interior
        />
      </mesh>

      {/* Iluminación */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={1} />
      <pointLight position={[0, -5, 0]} intensity={0.5} color="#8b5cf6" />

      {/* Obras/Paredes */}
      {walls.map((wall, index) => (
        <Artwork 
          key={wall.id} 
          data={wall} 
          index={index}
          onNext={onNext}
        />
      ))}

      {/* Piso con reflejo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#0a0a0a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </>
  );
}

// Controlador de cámara con rotación suave
function CameraController({ targetRotation }: { targetRotation: number }) {
  const { camera } = useThree();
  const currentRotation = useRef(0);

  useFrame((state, delta) => {
    // Interpolación suave de la rotación
    const diff = targetRotation - currentRotation.current;
    
    // Manejo del wrap-around para rotación continua
    let adjustedDiff = diff;
    if (Math.abs(diff) > Math.PI) {
      adjustedDiff = diff > 0 ? diff - 2 * Math.PI : diff + 2 * Math.PI;
    }
    
    currentRotation.current += adjustedDiff * 0.05;
    
    // Aplicar rotación a la cámara
    camera.position.x = Math.sin(currentRotation.current) * 0.01;
    camera.position.z = Math.cos(currentRotation.current) * 0.01;
    camera.lookAt(
      Math.sin(currentRotation.current) * 10,
      0,
      -Math.cos(currentRotation.current) * 10
    );
  });

  return null;
}

// Componente principal
export default function Gallery3DRoom({ gpuTier }: { gpuTier: string }) {
  const [currentWall, setCurrentWall] = useState(0);
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    setCurrentWall((prev) => (prev + 1) % 4);
  };

  const handlePrev = () => {
    setCurrentWall((prev) => (prev - 1 + 4) % 4);
  };

  const handleWallClick = (index: number) => {
    setCurrentWall(index);
  };

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const targetRotation = -(currentWall * Math.PI / 2);

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas
        camera={{ 
          position: [0, 0, 0.01], 
          fov: 60,
          near: 0.1,
          far: 100
        }}
        gl={{
          antialias: gpuTier !== 'low',
          powerPreference: gpuTier === 'high' ? 'high-performance' : 'default'
        }}
      >
        <CameraController targetRotation={targetRotation} />
        <Room currentWall={currentWall} onNext={handleNext} />
      </Canvas>

      {/* Controles de navegación */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-20">
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm 
                   border border-white/20 flex items-center justify-center transition-all"
          aria-label="Previous wall"
        >
          <span className="text-white">←</span>
        </button>
        
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((index) => (
            <button
              key={index}
              onClick={() => handleWallClick(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentWall === index 
                  ? 'bg-white w-8' 
                  : 'bg-white/30 hover:bg-white/60'
              }`}
              aria-label={`Wall ${index + 1}`}
            />
          ))}
        </div>
        
        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm 
                   border border-white/20 flex items-center justify-center transition-all"
          aria-label="Next wall"
        >
          <span className="text-white">→</span>
        </button>
      </div>

      {/* Título */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 
                     bg-clip-text text-transparent mb-2">
          CRYPTOGIFT GALLERY
        </h1>
        <p className="text-gray-400 text-sm">
          Museo Digital Inmersivo • GPU: {gpuTier.toUpperCase()}
        </p>
      </div>

      {/* Instrucciones */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 
                    text-center text-gray-400 text-xs bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
        Usa las flechas ← → o click en las obras • Vista desde el interior
      </div>
    </div>
  );
}