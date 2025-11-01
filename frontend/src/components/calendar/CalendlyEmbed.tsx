/**
 * CALENDLY EMBED COMPONENT
 * Componente para embedding de Calendly optimizado para Next.js 2025
 * Basado en mejores prácticas de integración Calendly + React
 *
 * ENHANCED: Auto-saves appointment data to backend when scheduled
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

"use client";

import React, { useEffect, useCallback } from 'react';

interface CalendlyEmbedProps {
  url: string;
  height?: number;
  className?: string;
  prefill?: {
    name?: string;
    email?: string;
    customQuestions?: Record<string, string>;
  };
  utm?: {
    utmCampaign?: string;
    utmSource?: string;
    utmMedium?: string;
    utmContent?: string;
    utmTerm?: string;
  };
  // NUEVO: Props para guardar automáticamente la cita
  giftId?: string;
  tokenId?: string;
  onAppointmentScheduled?: (data: any) => void;
}

export const CalendlyEmbed: React.FC<CalendlyEmbedProps> = ({
  url,
  height = 700,
  className = "",
  prefill = {},
  utm = {},
  giftId,
  tokenId,
  onAppointmentScheduled
}) => {
  // Función para guardar automáticamente la cita en el backend
  const saveAppointmentToBackend = useCallback(async (eventData: any) => {
    // CRITICAL FIX: REQUIRE giftId from props - NO sessionStorage fallback
    // The giftId MUST be resolved and passed by the parent component
    if (!giftId) {
      console.error('❌ CRITICAL: No giftId provided to save appointment', {
        tokenId,
        hasGiftIdProp: !!giftId,
        hasTokenIdProp: !!tokenId
      });
      // Don't save without valid giftId - show error to user
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.innerHTML = '❌ Error: No se puede guardar la cita (falta giftId)';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
      return;
    }

    const effectiveGiftId = giftId;  // Use ONLY the prop, no fallbacks

    console.log('✅ Using giftId from props for appointment (no fallback):', {
      giftId: effectiveGiftId,
      tokenId,
      source: 'parent_component_prop'
    });

    try {
      console.log('📅 Guardando cita automáticamente...', {
        giftId: effectiveGiftId,
        tokenId,
        eventData
      });

      // Extraer información del evento de Calendly
      // CRITICAL FIX: Robust eventTime extraction with multiple fallbacks
      let eventTime = '00:00'; // Sensible default

      // Try primary source: eventData.event.start_time
      if (eventData.event?.start_time) {
        try {
          eventTime = new Date(eventData.event.start_time).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        } catch (e) {
          console.warn('⚠️ Failed to parse event.start_time, trying fallback');
        }
      }

      // Try fallback source: payload.event.start_time
      if (eventTime === '00:00' && eventData.payload?.event?.start_time) {
        try {
          eventTime = new Date(eventData.payload.event.start_time).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        } catch (e) {
          console.warn('⚠️ Failed to parse payload.event.start_time, using default');
        }
      }

      // Try alternative: scheduled_time
      if (eventTime === '00:00' && eventData.event?.scheduled_time) {
        try {
          eventTime = new Date(eventData.event.scheduled_time).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        } catch (e) {
          console.warn('⚠️ Failed to parse scheduled_time');
        }
      }

      console.log('📅 Extracted eventTime:', {
        eventTime,
        rawStartTime: eventData.event?.start_time,
        source: eventData.event?.start_time ? 'event.start_time' : 'fallback'
      });

      const appointmentData = {
        eventName: eventData.event?.event_type_name || 'Consulta CryptoGift',
        eventDate: eventData.event?.start_time ? new Date(eventData.event.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        eventTime, // Use robustly extracted time
        duration: eventData.event?.duration || 30,
        timezone: eventData.event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        meetingUrl: eventData.event?.location?.join_url || eventData.event?.location || '',
        inviteeName: eventData.invitee?.name || prefill.name || '',
        inviteeEmail: eventData.invitee?.email || prefill.email || '',
        additionalInfo: {
          eventUri: eventData.event?.uri,
          inviteeUri: eventData.invitee?.uri,
          status: eventData.event?.status || 'scheduled',
          createdAt: eventData.event?.created_at,
          cancelUrl: eventData.invitee?.cancel_url,
          rescheduleUrl: eventData.invitee?.reschedule_url
        }
      };

      // Llamar al endpoint para guardar la cita
      const response = await fetch('/api/calendar/save-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          giftId: effectiveGiftId,
          tokenId,
          appointmentData
        })
      });

      if (response.ok) {
        console.log('✅ Cita guardada exitosamente en el sistema');

        // Mostrar notificación de éxito al usuario
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse';
        notification.innerHTML = '✅ ¡Cita agendada y guardada exitosamente!';
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.remove();
        }, 5000);

        // Llamar callback opcional
        if (onAppointmentScheduled) {
          onAppointmentScheduled(appointmentData);
        }
      } else {
        console.error('Error al guardar la cita:', await response.text());
      }
    } catch (error) {
      console.error('Error al procesar la cita:', error);
    }
  }, [giftId, tokenId, prefill, onAppointmentScheduled]);

  useEffect(() => {
    // Cargar Calendly widget script dinámicamente
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    // CRITICAL: Escuchar eventos de Calendly
    const handleCalendlyEvent = (e: MessageEvent) => {
      // Verificar que el mensaje viene de Calendly
      if (e.origin !== 'https://calendly.com') return;

      // Parsear el mensaje
      if (e.data && e.data.event) {
        console.log('📅 Evento de Calendly recibido:', e.data.event);

        // Detectar cuando se agenda una cita
        if (e.data.event === 'calendly.event_scheduled') {
          console.log('🎉 ¡Cita agendada! Guardando automáticamente...');
          saveAppointmentToBackend(e.data.payload);
        }
      }
    };

    // Agregar listener para mensajes de Calendly
    window.addEventListener('message', handleCalendlyEvent);

    return () => {
      // Cleanup
      window.removeEventListener('message', handleCalendlyEvent);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [saveAppointmentToBackend]);

  // Construir URL con parámetros
  const buildCalendlyUrl = () => {
    const urlObj = new URL(url);
    
    // Añadir prefill parameters
    if (prefill.name) urlObj.searchParams.set('name', prefill.name);
    if (prefill.email) urlObj.searchParams.set('email', prefill.email);
    
    // Añadir custom questions
    if (prefill.customQuestions) {
      Object.entries(prefill.customQuestions).forEach(([key, value]) => {
        urlObj.searchParams.set(`a1`, value); // Calendly custom question format
      });
    }
    
    // Añadir UTM parameters
    Object.entries(utm).forEach(([key, value]) => {
      if (value) urlObj.searchParams.set(key, value);
    });
    
    return urlObj.toString();
  };

  return (
    <div className={`calendly-embed-container ${className}`}>
      <div
        className="calendly-inline-widget"
        data-url={buildCalendlyUrl()}
        style={{ minWidth: '320px', height: `${height}px` }}
      />
    </div>
  );
};