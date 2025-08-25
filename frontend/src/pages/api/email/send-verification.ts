/**
 * EMAIL VERIFICATION API - SEND OTP CODE
 * Sends 6-digit OTP code via Resend with 2025 security best practices
 * Rate limiting + Redis storage + validation
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { getRedisConnection } from '../../../lib/redis/redisConfig';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendVerificationRequest {
  email: string;
  source?: string; // 'masterclass' | 'general'
}

interface SendVerificationResponse {
  success: boolean;
  message: string;
  rateLimited?: boolean;
  retryAfter?: number;
}

// Rate limiting: 3 attempts per email per 10 minutes
const RATE_LIMIT = 3;
const RATE_WINDOW = 10 * 60 * 1000; // 10 minutes
const CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendVerificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, source = 'general' }: SendVerificationRequest = req.body;

    // Validation
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email válido es requerido' 
      });
    }

    // Get Redis connection
    const redis = await getRedisConnection();
    
    // Rate limiting check
    const rateLimitKey = `email_rate_limit:${email}`;
    const attempts = await redis.get(rateLimitKey);
    const currentAttempts = attempts ? parseInt(attempts.toString()) : 0;

    if (currentAttempts >= RATE_LIMIT) {
      const ttl = await redis.ttl(rateLimitKey);
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos. Intenta de nuevo en unos minutos.',
        rateLimited: true,
        retryAfter: ttl > 0 ? ttl : 300
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const verificationKey = `email_verification:${email}`;

    // Store OTP in Redis
    const verificationData = {
      code: otpCode,
      email,
      source,
      createdAt: Date.now(),
      expiresAt: Date.now() + CODE_EXPIRY,
      attempts: 0
    };

    await redis.setex(verificationKey, Math.ceil(CODE_EXPIRY / 1000), JSON.stringify(verificationData));

    // Update rate limiting
    await redis.setex(rateLimitKey, Math.ceil(RATE_WINDOW / 1000), (currentAttempts + 1).toString());

    // Send email via Resend
    const emailTemplate = source === 'masterclass' 
      ? 'CryptoGift Wallets - Verificación de Email (Masterclass)'
      : 'CryptoGift Wallets - Verificación de Email';

    await resend.emails.send({
      from: 'CryptoGift Wallets <noreply@cryptogift-wallets.vercel.app>',
      to: [email],
      subject: `${emailTemplate} - Código: ${otpCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 20px; padding: 40px; text-align: center;">
          <h1 style="margin: 0 0 20px 0; font-size: 32px; font-weight: bold;">
            🎉 CryptoGift Wallets
          </h1>
          
          <div style="background: rgba(255,255,255,0.1); border-radius: 15px; padding: 30px; margin: 20px 0; backdrop-filter: blur(10px);">
            <h2 style="margin: 0 0 15px 0; color: #FFD700; font-size: 24px;">
              Tu código de verificación
            </h2>
            <div style="font-size: 48px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; color: #FFD700; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
              ${otpCode}
            </div>
            <p style="margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">
              Este código expira en 10 minutos
            </p>
          </div>

          ${source === 'masterclass' ? `
            <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; font-size: 16px; opacity: 0.8;">
                ¡Felicidades por completar el Sales Masterclass! 🚀<br>
                Estás a un paso de unirte a la revolución Web3
              </p>
            </div>
          ` : ''}

          <div style="margin-top: 30px; font-size: 14px; opacity: 0.7;">
            <p style="margin: 5px 0;">Si no solicitaste este código, ignora este email.</p>
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} CryptoGift Wallets</p>
          </div>
        </div>
      `
    });

    console.log('✅ Email verification sent:', { 
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), 
      source,
      code: otpCode.slice(0, 2) + '****'
    });

    return res.status(200).json({
      success: true,
      message: 'Código de verificación enviado a tu email'
    });

  } catch (error: any) {
    console.error('❌ Email verification send failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}