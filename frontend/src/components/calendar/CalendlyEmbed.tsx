/**
 * CALENDLY EMBED COMPONENT
 * Componente para embedding de Calendly optimizado para Next.js 2025
 * Basado en mejores prácticas de integración Calendly + React
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

"use client";

import React, { useEffect } from 'react';

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
}

export const CalendlyEmbed: React.FC<CalendlyEmbedProps> = ({
  url,
  height = 700,
  className = "",
  prefill = {},
  utm = {}
}) => {
  useEffect(() => {
    // Cargar Calendly widget script dinámicamente
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script al desmontar
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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