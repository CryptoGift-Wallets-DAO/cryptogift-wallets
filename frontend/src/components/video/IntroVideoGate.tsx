/**
 * INTRO VIDEO GATE - Sistema reutilizable de video para lecciones
 * Componente premium con glass morphism effect para reproducir videos introductorios
 * Soporta Mux Player con controles inmersivos y persistencia de progreso
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Volume2, VolumeX, SkipForward, Play, Pause, Maximize, Minimize } from 'lucide-react';

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
          <p className="text-white/80 text-lg">Cargando video...</p>
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
  title = "Video Introductorio",
  description,
  onFinish,
  autoSkip = true,
  forceShow = false,
}: IntroVideoGateProps) {
  // Key para localStorage - permite resetear fácilmente cambiando el lessonId
  const storageKey = useMemo(() => `intro_video_seen:${lessonId}`, [lessonId]);
  
  // Estados
  const [show, setShow] = useState(true);
  const [muted, setMuted] = useState(false); // Inicia con audio habilitado
  const [playing, setPlaying] = useState(true); // Auto-reproducir con audio
  const [fullscreen, setFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const playerRef = React.useRef<any>(null);
  // Use 'any' type for mediaRef to handle both HTMLVideoElement and MuxVideoElementExt
  const mediaRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Detectar móvil para auto-fullscreen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check si ya se vio antes (solo si autoSkip está habilitado)
  // REMOVIDO: En módulo educacional, siempre mostrar video
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

  // Auto-fullscreen en móvil cuando el usuario inicie el video
  useEffect(() => {
    if (isMobile && playing && !fullscreen) {
      // Pequeño delay para asegurar que el video está listo
      setTimeout(() => {
        toggleFullscreen();
      }, 500);
    }
  }, [isMobile, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-hide controls after 3 seconds of no activity
  useEffect(() => {
    const hideControlsTimer = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        if (playing) setShowControls(false);
      }, 3000);
    };

    hideControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [playing]);

  // Handlers
  const handleFinish = useCallback(() => {
    localStorage.setItem(storageKey, "completed");
    setShow(false);
    onFinish();
  }, [storageKey, onFinish]);

  const handleSkip = useCallback(() => {
    // Marcar como visto pero con flag de "skipped"
    localStorage.setItem(storageKey, "skipped");
    setShow(false);
    onFinish();
  }, [storageKey, onFinish]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const togglePlay = useCallback(async () => {
    if (mediaRef.current && typeof mediaRef.current.play === 'function') {
      try {
        if (playing) {
          mediaRef.current.pause();
          setPlaying(false);
        } else {
          await mediaRef.current.play();
          setPlaying(true);
        }
      } catch (error) {
        console.error('Error toggling play:', error);
        // Try to set playing state anyway in case the player handles it internally
        setPlaying(!playing);
      }
    } else {
      console.warn('Media ref not ready yet or play method not available');
    }
  }, [playing]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Intentar fullscreen en el contenedor del video
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          // Safari iOS
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any)?.mozRequestFullScreen) {
          // Firefox
          await (containerRef.current as any).mozRequestFullScreen();
        }
        setFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        }
        setFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  const handleTimeUpdate = useCallback((e: any) => {
    if (e.target) {
      const current = e.target.currentTime || 0;
      const total = e.target.duration || 1;
      setProgress((current / total) * 100);
      setDuration(total);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!show) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        ref={containerRef}
        className="relative w-full max-w-6xl mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        onMouseMove={() => setShowControls(true)}
        onMouseEnter={() => setShowControls(true)}
      >
        {/* Glass container with premium aesthetic */}
        <div className="relative aspect-video w-full 
          bg-gradient-to-br from-gray-900/95 to-black/95 
          backdrop-blur-xl backdrop-saturate-150
          rounded-3xl overflow-hidden 
          border border-white/10 dark:border-gray-800/50
          shadow-2xl shadow-purple-500/20">
          
          {/* Mux Player */}
          <MuxPlayer
            ref={(muxPlayerEl) => {
              playerRef.current = muxPlayerEl;
              // Get the native media element from MuxPlayer
              if (muxPlayerEl) {
                // MuxPlayer exposes the media element differently depending on version
                // Try multiple approaches to get the video element
                try {
                  // First try: direct media property access
                  if (muxPlayerEl.media) {
                    const media = muxPlayerEl.media.nativeEl || muxPlayerEl.media;
                    if (media && typeof media.play === 'function') {
                      mediaRef.current = media;
                      console.log('✅ Media element captured via .media property');
                      return;
                    }
                  }
                  
                  // Second try: look for video element in children (if it's not a shadow DOM)
                  const videoEl = muxPlayerEl.getElementsByTagName?.('video')?.[0];
                  if (videoEl) {
                    mediaRef.current = videoEl;
                    console.log('✅ Media element captured via getElementsByTagName');
                    return;
                  }
                  
                  // Third try: if muxPlayerEl itself is the media element
                  if (typeof muxPlayerEl.play === 'function') {
                    mediaRef.current = muxPlayerEl;
                    console.log('✅ MuxPlayer element is the media element');
                    return;
                  }
                  
                  console.warn('⚠️ Could not capture media element immediately');
                } catch (error) {
                  console.warn('⚠️ Error accessing media element:', error);
                }
              }
            }}
            playbackId={muxPlaybackId}
            streamType="on-demand"
            autoPlay={true}
            muted={muted}
            playsInline
            poster={poster}
            onEnded={handleFinish}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={() => {
              console.log('🎬 Video metadata loaded, ready to play');
              // Try again to get media element if we don't have it yet
              if (playerRef.current && !mediaRef.current) {
                try {
                  // Try to get media element again
                  if (playerRef.current.media) {
                    const media = playerRef.current.media.nativeEl || playerRef.current.media;
                    if (media && typeof media.play === 'function') {
                      mediaRef.current = media;
                      console.log('✅ Media element captured on metadata load');
                      return;
                    }
                  }
                  
                  // Try getElementsByTagName
                  const videoEl = playerRef.current.getElementsByTagName?.('video')?.[0];
                  if (videoEl) {
                    mediaRef.current = videoEl;
                    console.log('✅ Media element captured via getElementsByTagName on metadata load');
                    return;
                  }
                  
                  // Check if playerRef itself is playable
                  if (typeof playerRef.current.play === 'function') {
                    mediaRef.current = playerRef.current;
                    console.log('✅ Player ref is the media element on metadata load');
                  }
                } catch (error) {
                  console.warn('⚠️ Error accessing media on metadata load:', error);
                }
              }
            }}
            onCanPlay={() => {
              console.log('✅ Video can play - player is fully ready');
              // Final attempt to get media element
              if (playerRef.current && !mediaRef.current) {
                try {
                  // Last attempt to get media element
                  if (playerRef.current.media) {
                    const media = playerRef.current.media.nativeEl || playerRef.current.media;
                    if (media && typeof media.play === 'function') {
                      mediaRef.current = media;
                      console.log('✅ Media element captured on canPlay');
                      return;
                    }
                  }
                  
                  // Try direct access to the element if it has play method
                  if (typeof playerRef.current.play === 'function') {
                    mediaRef.current = playerRef.current;
                    console.log('✅ Player is media element on canPlay');
                  }
                } catch (error) {
                  console.warn('⚠️ Error accessing media on canPlay:', error);
                }
              }
            }}
            style={{ 
              width: "100%", 
              height: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 1
            }}
            metadata={{
              video_title: title,
              video_series: "CryptoGift Educational"
            }}
          >
            {captionsVtt && (
              <track 
                kind="subtitles" 
                srcLang="es" 
                src={captionsVtt} 
                default 
                label="Español" 
              />
            )}
          </MuxPlayer>


          {/* Gradient overlays for cinematic effect */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
          </div>

          {/* Title and description (top) */}
          <AnimatePresence>
            {showControls && (
              <motion.div 
                className="absolute top-0 left-0 right-0 z-20 p-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white/10 dark:bg-black/30 
                  backdrop-blur-xl backdrop-saturate-150 
                  rounded-2xl px-6 py-4 
                  border border-white/20 dark:border-gray-700/50
                  shadow-xl max-w-2xl">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {title}
                  </h3>
                  {description && (
                    <p className="text-sm text-white/80">{description}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Control bar (bottom) - Glass morphism style */}
          <AnimatePresence>
            {showControls && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 z-20 p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Progress bar */}
                <div className="mb-3 px-2">
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${progress}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Left controls */}
                  <div className="flex items-center gap-2">
                    {/* Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="p-3 rounded-xl 
                        bg-white/10 hover:bg-white/20 
                        backdrop-blur-xl border border-white/20
                        text-white transition-all hover:scale-105
                        shadow-lg shadow-black/20"
                      aria-label={playing ? "Pausar" : "Reproducir"}
                    >
                      {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>

                    {/* Mute/Unmute */}
                    <button
                      onClick={toggleMute}
                      className="p-3 rounded-xl 
                        bg-white/10 hover:bg-white/20 
                        backdrop-blur-xl border border-white/20
                        text-white transition-all hover:scale-105
                        shadow-lg shadow-black/20"
                      aria-label={muted ? "Activar sonido" : "Silenciar"}
                    >
                      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    {/* Time display */}
                    <div className="px-3 py-2 rounded-xl
                      bg-white/10 backdrop-blur-xl border border-white/20
                      text-white text-sm font-mono">
                      {formatTime(progress * duration / 100)} / {formatTime(duration)}
                    </div>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-2">
                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-3 rounded-xl 
                        bg-white/10 hover:bg-white/20 
                        backdrop-blur-xl border border-white/20
                        text-white transition-all hover:scale-105
                        shadow-lg shadow-black/20"
                      aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                      {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>

                    {/* Skip button - ÚNICO BOTÓN */}
                    <button
                      onClick={handleSkip}
                      className="px-6 py-3 rounded-xl 
                        bg-gradient-to-r from-purple-500 to-pink-500 
                        hover:from-purple-600 hover:to-pink-600
                        text-white font-bold 
                        backdrop-blur-xl border border-purple-400/30
                        transition-all hover:scale-105
                        shadow-lg shadow-purple-500/30
                        flex items-center gap-2"
                      aria-label="Saltar introducción"
                    >
                      <SkipForward className="w-5 h-5" />
                      <span>Saltar intro</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}