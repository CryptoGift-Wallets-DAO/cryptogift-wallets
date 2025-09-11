'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function StaticBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* GRADIENT BASE ANIMADO - NFT GRADE */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br 
                   from-bg-primary via-bg-secondary to-bg-primary
                   dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary"
        animate={{
          background: [
            "linear-gradient(135deg, rgb(255, 255, 255) 0%, rgb(249, 250, 251) 50%, rgb(255, 255, 255) 100%)",
            "linear-gradient(135deg, rgb(254, 252, 234) 0%, rgb(253, 230, 138) 10%, rgb(255, 255, 255) 100%)",
            "linear-gradient(135deg, rgb(255, 255, 255) 0%, rgb(249, 250, 251) 50%, rgb(255, 255, 255) 100%)"
          ]
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* PARTÍCULAS FLOTANTES - ADAPTATIVAS */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: `rgba(251, 191, 36, ${0.2 + Math.random() * 0.3})`, // Gold particles
          }}
          animate={{
            y: [0, -150, 0],
            opacity: [0.1, 0.4, 0.1],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}

      {/* PARTÍCULAS PLATEADAS PARA DARK MODE */}
      <div className="dark:block hidden">
        {Array.from({ length: 25 }).map((_, i) => (
          <motion.div
            key={`silver-${i}`}
            className="absolute w-1 h-1 rounded-full opacity-15"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: `rgba(148, 163, 184, ${0.3 + Math.random() * 0.4})`, // Silver particles
            }}
            animate={{
              y: [0, -120, 0],
              opacity: [0.1, 0.5, 0.1],
              scale: [0.3, 1.2, 0.3],
            }}
            transition={{
              duration: Math.random() * 12 + 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* EFECTO PARALLAX CON MOUSE - ADAPTATIVO */}
      {isClient && (
        <motion.div
          className="absolute inset-0 opacity-5 dark:opacity-10"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
                        rgb(251, 191, 36) 0%, transparent 60%)`
          }}
        />
      )}

      {/* GRID PATTERN SUTIL */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
    </div>
  );
}