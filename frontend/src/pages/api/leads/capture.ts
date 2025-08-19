/**
 * SALES MASTERCLASS LEAD CAPTURE API
 * Captures and processes qualified leads from the Sales Masterclass
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface LeadData {
  // Lead qualification
  path: 'Quest Creator' | 'Integration Partner' | 'White-Label' | 'Investor';
  availability: string;
  contact: string;
  questionsScore: {
    correct: number;
    total: number;
  };
  
  // Metrics
  metrics?: {
    startTime: number;
    blockTimes: Record<string, number>;
    interactions: number;
    claimSuccess: boolean;
    leadSubmitted: boolean;
    wowMoments: number;
  };
  
  // User engagement
  questionsCorrect?: number;
  totalQuestions?: number;
  answeredQuestions?: number[];
  
  // Metadata
  timestamp: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const leadData = req.body as LeadData;
    
    // Validate required fields
    if (!leadData.path || !leadData.contact || !leadData.availability) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['path', 'contact', 'availability'] 
      });
    }
    
    // Calculate lead score based on engagement
    const engagementScore = calculateEngagementScore(leadData);
    
    // Determine lead quality
    const leadQuality = determineLeadQuality(engagementScore, leadData);
    
    // Prepare lead for storage/notification
    const processedLead = {
      ...leadData,
      engagementScore,
      leadQuality,
      capturedAt: new Date().toISOString(),
      source: 'sales-masterclass',
      // Add user agent for analytics
      userAgent: req.headers['user-agent'] || 'unknown',
      // Add IP for geo-targeting (in production, consider privacy)
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    };
    
    // In production, you would:
    // 1. Store in database
    // await saveLeadToDatabase(processedLead);
    
    // 2. Send to CRM (HubSpot, Salesforce, etc.)
    // await sendToCRM(processedLead);
    
    // 3. Trigger email notifications
    // await sendNotificationEmail(processedLead);
    
    // 4. Add to email marketing list
    // await addToEmailList(processedLead);
    
    // For now, log the lead
    console.log('🎯 NEW QUALIFIED LEAD:', {
      path: processedLead.path,
      contact: processedLead.contact,
      score: processedLead.engagementScore,
      quality: processedLead.leadQuality,
      questionsScore: `${leadData.questionsScore?.correct || 0}/${leadData.questionsScore?.total || 0}`
    });
    
    // Send welcome message based on path
    const welcomeMessage = getWelcomeMessage(leadData.path, leadQuality);
    
    return res.status(200).json({
      success: true,
      message: welcomeMessage,
      leadQuality,
      engagementScore,
      nextSteps: getNextSteps(leadData.path)
    });
    
  } catch (error) {
    console.error('Error capturing lead:', error);
    return res.status(500).json({ 
      error: 'Failed to capture lead',
      message: 'Por favor intenta de nuevo o contáctanos directamente'
    });
  }
}

function calculateEngagementScore(leadData: LeadData): number {
  let score = 0;
  
  // Questions score (max 40 points)
  if (leadData.questionsScore) {
    const questionRatio = leadData.questionsScore.correct / leadData.questionsScore.total;
    score += Math.round(questionRatio * 40);
  }
  
  // Metrics engagement (max 30 points)
  if (leadData.metrics) {
    // Completion bonus
    if (leadData.metrics.leadSubmitted) score += 10;
    
    // Claim success bonus
    if (leadData.metrics.claimSuccess) score += 10;
    
    // Wow moments bonus (max 10)
    score += Math.min(leadData.metrics.wowMoments * 2, 10);
  }
  
  // Time spent bonus (max 20 points)
  if (leadData.metrics?.startTime) {
    const timeSpent = (leadData.timestamp - leadData.metrics.startTime) / 1000; // seconds
    if (timeSpent > 300) score += 10; // More than 5 minutes
    if (timeSpent > 600) score += 10; // More than 10 minutes
  }
  
  // Path selection bonus (max 10 points)
  const pathScores: Record<string, number> = {
    'Investor': 10,
    'White-Label': 8,
    'Integration Partner': 6,
    'Quest Creator': 5
  };
  score += pathScores[leadData.path] || 0;
  
  return Math.min(score, 100); // Cap at 100
}

function determineLeadQuality(score: number, leadData: LeadData): string {
  // Special qualification for investors
  if (leadData.path === 'Investor' && score >= 60) {
    return 'HOT_INVESTOR';
  }
  
  // General qualification
  if (score >= 80) return 'HOT';
  if (score >= 60) return 'WARM';
  if (score >= 40) return 'QUALIFIED';
  return 'COLD';
}

function getWelcomeMessage(path: string, quality: string): string {
  const messages: Record<string, string> = {
    'HOT_INVESTOR': '🔥 ¡Excelente! Un miembro del equipo te contactará en las próximas 24 horas para discutir la oportunidad de inversión.',
    'HOT': '⭐ ¡Perfecto! Has demostrado un conocimiento excepcional. Te contactaremos muy pronto con información exclusiva.',
    'WARM': '✨ ¡Genial! Te enviaremos más información y programaremos una llamada en los próximos días.',
    'QUALIFIED': '👍 ¡Gracias por tu interés! Te enviaremos información detallada por email.',
    'COLD': '📧 Gracias por registrarte. Te mantendremos informado sobre las novedades de CryptoGift.'
  };
  
  if (quality === 'HOT_INVESTOR') return messages['HOT_INVESTOR'];
  return messages[quality] || messages['COLD'];
}

function getNextSteps(path: string): string[] {
  const steps: Record<string, string[]> = {
    'Investor': [
      '📅 Llamada con el CEO en 24-48h',
      '📊 Acceso al pitch deck completo',
      '💼 Presentación del cap table y términos',
      '🎯 Due diligence y cierre'
    ],
    'White-Label': [
      '🔧 Demo técnica personalizada',
      '📋 Propuesta comercial adaptada',
      '🚀 Prueba piloto de 30 días',
      '📈 Plan de implementación'
    ],
    'Integration Partner': [
      '🤝 Reunión de exploración',
      '🔌 Documentación técnica de APIs',
      '💡 Workshop de integración',
      '🎁 1M de transacciones gratis'
    ],
    'Quest Creator': [
      '📚 Acceso a la plataforma beta',
      '🎮 Tutorial de creación de quests',
      '👥 Invitación a la comunidad',
      '💰 Programa de revenue sharing'
    ]
  };
  
  return steps[path] || ['📧 Te contactaremos pronto con más información'];
}