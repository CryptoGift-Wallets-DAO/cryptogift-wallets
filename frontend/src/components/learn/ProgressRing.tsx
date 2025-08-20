/**
 * PROGRESS RING COMPONENT - Estilo Brilliant
 * Anillos de progreso animados con efectos visuales espectaculares
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: 'blue' | 'green' | 'purple' | 'gold' | 'gradient';
  animated?: boolean;
  showPercentage?: boolean;
  glowEffect?: boolean;
  pulseOnComplete?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  color = 'gradient',
  animated = true,
  showPercentage = true,
  glowEffect = true,
  pulseOnComplete = true
}) => {
  const [displayProgress, setDisplayProgress] = useState(animated ? 0 : progress);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;
  
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'stroke-blue-500';
      case 'green':
        return 'stroke-green-500';
      case 'purple':
        return 'stroke-purple-500';
      case 'gold':
        return 'stroke-yellow-500';
      case 'gradient':
      default:
        return '';
    }
  };

  const isComplete = displayProgress >= 100;

  return (
    <motion.div 
      className="relative inline-flex items-center justify-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      {/* Glow effect background */}
      {glowEffect && displayProgress > 0 && (
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{
            background: color === 'gradient' 
              ? 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, rgba(59,130,246,0.5) 100%)'
              : undefined,
            backgroundColor: color !== 'gradient' ? `var(--${color}-500)` : undefined,
            transform: `scale(${1 + displayProgress / 200})`
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        className={`transform -rotate-90 ${pulseOnComplete && isComplete ? 'animate-pulse' : ''}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        
        {/* Progress circle */}
        <defs>
          <linearGradient id={`progress-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={color !== 'gradient' ? getColorClasses() : ''}
          stroke={color === 'gradient' ? `url(#progress-gradient-${label})` : undefined}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: animated ? 'stroke-dashoffset 1.5s ease-in-out' : 'none',
          }}
        />

        {/* Completion celebration particles */}
        {isComplete && (
          <g>
            {[...Array(8)].map((_, i) => (
              <motion.circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r="2"
                fill={color === 'gradient' ? '#A855F7' : 'currentColor'}
                initial={{ 
                  x: 0, 
                  y: 0,
                  opacity: 0 
                }}
                animate={{
                  x: Math.cos((i * Math.PI) / 4) * (radius + 20),
                  y: Math.sin((i * Math.PI) / 4) * (radius + 20),
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                  delay: i * 0.1
                }}
              />
            ))}
          </g>
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.div 
            className="text-2xl font-bold text-gray-900 dark:text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={Math.floor(displayProgress)}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {Math.floor(displayProgress)}%
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
        
        {label && (
          <motion.div 
            className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {label}
          </motion.div>
        )}
        
        {sublabel && (
          <motion.div 
            className="text-xs text-gray-500 dark:text-gray-500 text-center px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {sublabel}
          </motion.div>
        )}

        {/* Completion badge */}
        {isComplete && (
          <motion.div
            className="absolute -top-2 -right-2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">✓</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Variant for multiple rings in a group
export const ProgressRingGroup: React.FC<{
  rings: Array<{
    progress: number;
    label: string;
    color?: ProgressRingProps['color'];
  }>;
  size?: number;
}> = ({ rings, size = 100 }) => {
  return (
    <div className="flex gap-6 flex-wrap justify-center">
      {rings.map((ring, index) => (
        <motion.div
          key={ring.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <ProgressRing
            progress={ring.progress}
            label={ring.label}
            color={ring.color}
            size={size}
            strokeWidth={6}
            glowEffect={true}
            pulseOnComplete={true}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default ProgressRing;