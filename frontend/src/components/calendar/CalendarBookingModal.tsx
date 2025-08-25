/**
 * CALENDAR BOOKING MODAL
 * Modal para mostrar Calendly después de completar Sales Masterclass
 * Integrado con el sistema de modales existente del proyecto
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Video } from 'lucide-react';
import { CalendlyEmbed } from './CalendlyEmbed';

interface CalendarBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  source?: string; // 'masterclass' | 'general'
}

export const CalendarBookingModal: React.FC<CalendarBookingModalProps> = ({
  isOpen,
  onClose,
  userEmail = '',
  userName = '',
  source = 'masterclass'
}) => {
  // URL de Calendly - usando variable de entorno o fallback de demo
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/cryptogift-demo/consultation';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    🎉 ¡Agenda tu Consulta Personalizada!
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Próximo paso después del Masterclass
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Info Cards */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="flex items-center gap-2 justify-center text-blue-600 dark:text-blue-400">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">30 minutos</span>
                </div>
                <div className="flex items-center gap-2 justify-center text-purple-600 dark:text-purple-400">
                  <Video className="w-5 h-5" />
                  <span className="font-medium">Video llamada</span>
                </div>
                <div className="flex items-center gap-2 justify-center text-green-600 dark:text-green-400">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">100% Gratuito</span>
                </div>
              </div>
              <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
                Conversaremos sobre tus objetivos y cómo CryptoGift puede ayudarte a alcanzarlos
              </p>
            </div>

            {/* Calendly Embed */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              <CalendlyEmbed
                url={calendlyUrl}
                height={600}
                prefill={{
                  email: userEmail,
                  name: userName,
                  customQuestions: {
                    'source': source,
                    'completion_date': new Date().toISOString().split('T')[0]
                  }
                }}
                utm={{
                  utmSource: 'cryptogift-masterclass',
                  utmMedium: 'modal',
                  utmCampaign: 'post-masterclass-booking',
                  utmContent: source
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};