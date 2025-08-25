/**
 * Interior Museum 360 - Real museum room with 4 walls
 * Based on gallery_new.png and gallery_new_back.png references
 * Implements 360-degree view with proper interior perspective
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NeonFrame } from './NeonFrame';

type GPUTier = 'low' | 'medium' | 'high';

interface MuseumArtwork {
  id: string;
  image: string;
  title: string;
  artist?: string;
  price?: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
}

interface InteriorMuseum360Props {
  artworks?: MuseumArtwork[];
  gpuTier?: GPUTier;
  onArtworkClick?: (artwork: MuseumArtwork) => void;
}

// Quality NFT artworks for gallery display
const SAMPLE_ARTWORKS: MuseumArtwork[] = [
  {
    id: '1',
    image: 'https://i.seadn.io/gae/1n1p9TYYQjE1Y6K6J8Qm8QV7F_QKKj9kYR_8QXWn5Z8NXqH7b2R1K1RnNXgK2K6KlKxpqgZMZ8V5QKqpwGLJ_NW-dI8w1280?auto=format&dpr=1&w=384',
    title: 'Bored Ape #3749',
    artist: 'Yuga Labs',
    size: 'medium'
  },
  {
    id: '2', 
    image: 'https://i.seadn.io/gae/mgzTnPMEu4YgzKgEKy1-5bDRFZl9o12nw6ZWE7jOYfE8o2W-Qp7b7YzNd4WRmxpvzJ9n1K6Q1M-LNMRpNXt8dNgH=s512',
    title: 'CryptoPunk #7804',
    artist: 'Larva Labs',
    size: 'hero'
  },
  {
    id: '3',
    image: 'https://i.seadn.io/gae/2hDpuTi-0AMKvoZJGd-yKWvK4tKdQr_kLOOS_8vJONXr2FDIB_F-G1T2X6-ZIzsOsUUQ?auto=format&dpr=1&w=384',
    title: 'Azuki #5219',
    artist: 'Chiru Labs',
    size: 'medium'
  },
  {
    id: '4',
    image: 'https://i.seadn.io/gae/XN0XuD8Uh3jyRWN2uqzjJO8Q-xVGz4KjQ6Z5QRNgQdNgYw8NX-Xp7gNzOzLJ_N3KjnGnPq6K8dN3M_nQ8dJgKlNL=s512',
    title: 'Doodle #2914',
    artist: 'Burnt Toast',
    size: 'medium'
  },
  {
    id: '5',
    image: 'https://i.seadn.io/gae/TLlEwW36QyxONn6dCK6DUoE4YCZ8e6W8JEKCFJHjKZBK8dXYp7N_RnGz3pQ7LGQ8KlNq8NZgJ5nNg8d5K1G8vQLNqA=s512',
    title: 'CloneX #4321',
    artist: 'RTFKT Studios',
    size: 'large'
  }
];

export function InteriorMuseum360({ 
  artworks = SAMPLE_ARTWORKS,
  gpuTier = 'medium',
  onArtworkClick 
}: InteriorMuseum360Props) {
  const [rotation, setRotation] = useState(0); // 0 = front, 90 = right, 180 = back, 270 = left
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Feature flag check
  const isNeonEnabled = process.env.NEXT_PUBLIC_FEATURE_NEON_GALLERY === '1';

  // Navigate to specific wall
  const navigateToWall = useCallback((direction: 'left' | 'right') => {
    setRotation(prev => {
      if (direction === 'right') {
        return (prev + 90) % 360; // RIGHT arrow goes RIGHT (clockwise)
      } else {
        return prev === 0 ? 270 : prev - 90; // LEFT arrow goes LEFT (counter-clockwise)  
      }
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateToWall('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateToWall('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToWall]);

  // Wall configurations for 360-degree view
  const walls = [
    { 
      id: 'front', 
      rotateY: 0, 
      artworks: artworks.slice(0, 5),
      label: 'Front Wall'
    },
    { 
      id: 'right', 
      rotateY: 90, 
      artworks: artworks.slice(5, 10) || artworks.slice(0, 5),
      label: 'Right Wall'
    },
    { 
      id: 'back', 
      rotateY: 180, 
      artworks: artworks.slice(10, 15) || artworks.slice(0, 5),
      label: 'Back Wall'
    },
    { 
      id: 'left', 
      rotateY: 270, 
      artworks: artworks.slice(15, 20) || artworks.slice(0, 5),
      label: 'Left Wall'
    }
  ];

  if (!isNeonEnabled) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Neon Gallery disabled. Set NEXT_PUBLIC_FEATURE_NEON_GALLERY=1 to enable.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      
      {/* Museum Room Container - Interior 360 View */}
      <div 
        ref={containerRef}
        className="relative w-full h-full"
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 50%'
        }}
      >
        
        {/* Ceiling with LED strips (like reference images) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-700 to-transparent opacity-60" />
          
          {/* LED light strips */}
          <div className="absolute top-4 left-1/4 w-1/2 h-1 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
          <div className="absolute top-6 left-1/3 w-1/3 h-1 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.6)]" />
        </div>

        {/* 360-degree museum room */}
        <motion.div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center'
          }}
          animate={{
            rotateY: -rotation // Negative for correct rotation direction
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
            duration: 0.8
          }}
        >

          {/* Four walls of the museum */}
          {walls.map((wall) => (
            <div
              key={wall.id}
              className="absolute inset-0 w-full h-full"
              style={{
                transform: `rotateY(${wall.rotateY}deg) translateZ(400px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Wall background with museum texture */}
              <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-700 to-gray-600 opacity-90" />
              
              {/* Floor reflection area */}
              <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
              
              {/* Artworks on this wall */}
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="grid grid-cols-3 gap-8 max-w-4xl">
                  {wall.artworks.map((artwork, index) => (
                    <div key={`${wall.id}-${artwork.id}`} className="relative">
                      <NeonFrame
                        src={artwork.image}
                        alt={artwork.title}
                        neon="#58c4ff" // Cyan neon like reference images
                        tier={gpuTier}
                        size={artwork.size}
                        onClick={() => onArtworkClick?.(artwork)}
                        className="hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Artwork info */}
                      <div className="mt-2 text-center">
                        <h3 className="text-white text-sm font-medium">{artwork.title}</h3>
                        {artwork.artist && (
                          <p className="text-gray-300 text-xs">{artwork.artist}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wall label for debugging/orientation */}
              <div className="absolute top-4 left-4 text-white/50 text-xs">
                {wall.label}
              </div>
            </div>
          ))}

          {/* Floor with reflections */}
          <div
            className="absolute bottom-0 left-1/2 w-[800px] h-[800px] -translate-x-1/2"
            style={{
              transform: 'rotateX(90deg) translateZ(-200px)',
              background: `
                linear-gradient(45deg, rgba(100,100,100,0.1) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(100,100,100,0.1) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(100,100,100,0.1) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(100,100,100,0.1) 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          />
          
        </motion.div>

        {/* Navigation arrows - FIXED DIRECTION */}
        <button
          onClick={() => navigateToWall('left')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110"
          aria-label="Rotate left"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => navigateToWall('right')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110"
          aria-label="Rotate right"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Wall indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
          {['Front', 'Right', 'Back', 'Left'].map((wall, index) => (
            <button
              key={wall}
              onClick={() => setRotation(index * 90)}
              className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
                rotation === index * 90 
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50' 
                  : 'bg-black/30 text-gray-300 hover:bg-black/50'
              }`}
            >
              {wall}
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="absolute top-4 right-4 text-white/70 text-sm text-right z-10">
          <p>Use ← → arrow keys</p>
          <p>or click arrows to navigate</p>
        </div>

      </div>
    </div>
  );
}