"use client";

/**
 * COMPETITION SUCCESS - Pantalla post-creación
 *
 * Muestra los links para compartir después de crear una competencia.
 * Diseño: 1-2 clicks y listo.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Copy,
  Share2,
  Users,
  Scale,
  ExternalLink,
  MessageCircle,
  Send,
  QrCode,
  Trophy,
  Sparkles,
} from 'lucide-react';

interface CompetitionSuccessProps {
  competitionId: string;
  title: string;
  hasArbiters: boolean;
  config: {
    format: string;
    maxParticipants: number | 'unlimited';
    stakeAmount: string;
    currency: string;
  };
  onClose?: () => void;
  onViewCompetition?: () => void;
}

interface LinkCardProps {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  color: string;
  emoji: string;
}

function LinkCard({ title, description, link, icon, color, emoji }: LinkCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [link]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: link,
        });
      } catch (err) {
        // User cancelled or error
        handleCopy();
      }
    } else {
      handleCopy();
    }
  }, [title, description, link, handleCopy]);

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${description}\n\n${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTelegram = () => {
    const text = encodeURIComponent(description);
    const url = encodeURIComponent(link);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br ${color}
        border border-white/20
        p-5
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{emoji}</div>
        <div>
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <p className="text-white/70 text-sm">{description}</p>
        </div>
      </div>

      {/* Link display */}
      <div className="bg-black/20 rounded-xl p-3 mb-4 flex items-center gap-2">
        <span className="text-white/60">{icon}</span>
        <span className="flex-1 text-white/90 text-sm font-mono truncate">
          {link}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Copy - Main action */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          className={`
            flex-1 py-3 px-4 rounded-xl font-semibold
            flex items-center justify-center gap-2
            transition-all duration-200
            ${copied
              ? 'bg-green-500 text-white'
              : 'bg-white/20 hover:bg-white/30 text-white'
            }
          `}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>Copiar Link</span>
            </>
          )}
        </motion.button>

        {/* Share button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="p-3 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
          title="Compartir"
        >
          <Share2 className="w-5 h-5" />
        </motion.button>

        {/* WhatsApp */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleWhatsApp}
          className="p-3 rounded-xl bg-green-600/80 hover:bg-green-600 text-white transition-colors"
          title="WhatsApp"
        >
          <MessageCircle className="w-5 h-5" />
        </motion.button>

        {/* Telegram */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleTelegram}
          className="p-3 rounded-xl bg-blue-500/80 hover:bg-blue-500 text-white transition-colors"
          title="Telegram"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

export function CompetitionSuccess({
  competitionId,
  title,
  hasArbiters,
  config,
  onClose,
  onViewCompetition,
}: CompetitionSuccessProps) {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://cryptogift-wallets.vercel.app';

  // Links para compartir
  const participantLink = `${baseUrl}/competencia/${competitionId}/join`;
  const arbiterLink = `${baseUrl}/competencia/${competitionId}/arbiter`;

  return (
    <div className="space-y-6">
      {/* Success header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500
                     flex items-center justify-center shadow-lg shadow-green-500/30"
        >
          <Check className="w-10 h-10 text-white" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-white">
            Competencia Creada!
          </h2>
          <p className="text-gray-400 mt-1">
            {title}
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300">
            {config.format}
          </span>
          <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300">
            {config.maxParticipants === 'unlimited' ? '∞' : config.maxParticipants} participantes
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400">
            {config.stakeAmount} {config.currency}
          </span>
        </div>
      </motion.div>

      {/* Divider with instruction */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-gray-900 text-gray-400 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Comparte estos links
          </span>
        </div>
      </div>

      {/* Links to share */}
      <div className="space-y-4">
        {/* Participantes - Siempre visible */}
        <LinkCard
          title="Link para Participantes"
          description={`Únete a: ${title}`}
          link={participantLink}
          icon={<Users className="w-4 h-4" />}
          color="from-blue-600/30 to-cyan-600/20"
          emoji="🎮"
        />

        {/* Árbitros - Solo si aplica */}
        {hasArbiters && (
          <LinkCard
            title="Link para Árbitros"
            description={`Arbitra: ${title}`}
            link={arbiterLink}
            icon={<Scale className="w-4 h-4" />}
            color="from-purple-600/30 to-pink-600/20"
            emoji="⚖️"
          />
        )}
      </div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4"
      >
        <div className="flex gap-3">
          <div className="text-xl">💡</div>
          <div className="text-sm text-amber-200/80">
            <strong className="text-amber-400">Tip:</strong> Tú también puedes unirte usando el link de participantes.
            Solo haz click en el link o cópialo y ábrelo en tu navegador.
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onViewCompetition}
          className="flex-1 py-3 px-4 rounded-xl font-semibold
                   bg-gradient-to-r from-amber-500 to-orange-500 text-black
                   flex items-center justify-center gap-2
                   hover:shadow-lg hover:shadow-amber-500/25 transition-all"
        >
          <Trophy className="w-5 h-5" />
          <span>Ver Competencia</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="py-3 px-6 rounded-xl font-medium
                   bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          Cerrar
        </motion.button>
      </div>
    </div>
  );
}

export default CompetitionSuccess;
