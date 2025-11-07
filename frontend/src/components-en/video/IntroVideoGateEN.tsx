/**
 * INTRO VIDEO GATE - Sistema reutilizable de video para lecciones
 * Componente simplificado con controles nativos de MuxPlayer (mobile-optimized)
 * Soporta Mux Player con persistencia de progreso
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { SkipForward } from 'lucide-react';

// Carga perezosa del Mux Player para optimización
// @ts-ignore - Mux player types may not be available
const MuxPlayer = dynamic(
  () => import('@mux/mux-player-react').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="relative aspect-video w-full flex items-center justify-center
        bg-gradient-to-br from-gray-900/95 to-black/95 rounded-3xl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent
            rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading video...</p>
        </div>
      </div>
    )
  }
);

interface IntroVideoGateProps {
  lessonId: string;           // ID único de la lección (para persistencia)
  muxPlaybackId: string;      // Playback ID de Mux
  poster?: string;            // Imagen de portada opcional
  captionsVtt?: string;       // Subtítulos opcionales
  title?: string;             // Título del video
  description?: string;       // Descripción opcional
  onFinish: () => void;       // Callback al terminar/saltar
  autoSkip?: boolean;         // Si debe saltarse automáticamente si ya se vio
  forceShow?: boolean;        // Forzar mostrar aunque ya se haya visto
}

export default function IntroVideoGate({
  lessonId,
  muxPlaybackId,
  poster,
  captionsVtt,
  title = "Introductory Video",
  description,
  onFinish,
  autoSkip = true,
  forceShow = false,
}: IntroVideoGateProps) {
  // Key para localStorage - permite resetear fácilmente cambiando el lessonId
  const storageKey = useMemo(() => `intro_video_seen:${lessonId}`, [lessonId]);

  // Estados simplificados
  const [show, setShow] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(true);

  // Check si ya se vio antes (solo si autoSkip está habilitado)
  // En módulo educacional, siempre mostrar video
  useEffect(() => {
    // Comentado para siempre mostrar el video en educacional
    // if (!forceShow && autoSkip && typeof window !== "undefined") {
    //   const seen = localStorage.getItem(storageKey);
    //   if (seen === "completed") {
    //     setShow(false);
    //     onFinish();
    //   }
    // }
  }, [storageKey, onFinish, autoSkip, forceShow]);

  // Handlers
  const handleFinish = useCallback(() => {
    console.log('📹 Video finished naturally');
    localStorage.setItem(storageKey, "completed");
    setShow(false);
    onFinish();
  }, [storageKey, onFinish]);

  const handleSkip = useCallback(() => {
    console.log('⏭️ Video skipped by user');
    // Marcar como visto pero con flag de "skipped"
    localStorage.setItem(storageKey, "skipped");
    setShow(false);
    onFinish();
  }, [storageKey, onFinish]);

  if (!show) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="relative w-full max-w-6xl mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        {/* Glass container with premium aesthetic */}
        <div className="relative aspect-video w-full
          bg-gradient-to-br from-gray-900/95 to-black/95
          backdrop-blur-xl backdrop-saturate-150
          rounded-3xl overflow-hidden
          border border-white/10 dark:border-gray-800/50
          shadow-2xl shadow-purple-500/20">

          {/* Mux Player with NATIVE CONTROLS ONLY */}
          <MuxPlayer
            playbackId={muxPlaybackId}
            streamType="on-demand"
            autoPlay={false}
            muted={false}
            playsInline
            poster={poster}
            onEnded={handleFinish}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              top: 0,
              left: 0
            }}
            metadata={{
              video_title: title,
              video_series: "CryptoGift Educational"
            }}
          >
            {captionsVtt && (
              <track
                kind="subtitles"
                srcLang="en"
                src={captionsVtt}
                default
                label="English"
              />
            )}
          </MuxPlayer>

        </div>

        {/* Title, description and skip button - OUTSIDE video player for clean viewing */}
        <div className="mt-6 space-y-4">
          {/* Title and description card */}
          <div className="bg-white/10 dark:bg-black/30
            backdrop-blur-xl backdrop-saturate-150
            rounded-2xl px-6 py-4
            border border-white/20 dark:border-gray-700/50
            shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {description}
              </p>
            )}
          </div>

          {/* Skip intro button */}
          {showSkipButton && (
            <div className="flex justify-center">
              <button
                onClick={handleSkip}
                className="px-8 py-4 rounded-xl
                  bg-gradient-to-r from-purple-500 to-pink-500
                  hover:from-purple-600 hover:to-pink-600
                  text-white font-bold text-lg
                  backdrop-blur-xl border border-purple-400/30
                  transition-all hover:scale-105
                  shadow-lg shadow-purple-500/30
                  flex items-center gap-3"
                aria-label="Skip intro"
              >
                <SkipForward className="w-6 h-6" />
                <span>Skip intro</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
