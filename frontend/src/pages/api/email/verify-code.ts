/**
 * EMAIL VERIFICATION API - VERIFY OTP CODE
 * Verifies 6-digit OTP code with security measures
 * Rate limiting + attempt tracking + secure validation
 * 
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateRedisForCriticalOps } from '../../../lib/redisConfig';

interface VerifyCodeRequest {
  email: string;
  code: string;
}

interface VerifyCodeResponse {
  success: boolean;
  message: string;
  verified?: boolean;
  expired?: boolean;
  rateLimited?: boolean;
  remainingAttempts?: number;
}

// Security limits
const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_LOCKOUT = 15 * 60 * 1000; // 15 minutes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyCodeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, code }: VerifyCodeRequest = req.body;

    // Validation
    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email y código son requeridos' 
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El código debe ser 6 dígitos' 
      });
    }

    // Get Redis connection with critical validation  
    const redis = validateRedisForCriticalOps('email_verification_verify');
    if (!redis) {
      return res.status(500).json({
        success: false,
        message: 'Servicio temporalmente no disponible'
      });
    }
    
    const verificationKey = `email_verification:${email}`;
    const lockoutKey = `email_lockout:${email}`;
    
    // Check if account is locked out
    const lockout = await redis.get(lockoutKey);
    if (lockout) {
      // Upstash Redis auto-parses JSON, so check if it's already an object
      const lockoutData = typeof lockout === 'string' ? JSON.parse(lockout) : lockout;
      const timeRemaining = Math.ceil((lockoutData.expiresAt - Date.now()) / 1000 / 60);
      
      return res.status(429).json({
        success: false,
        message: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${timeRemaining} minutos.`,
        rateLimited: true
      });
    }

    // Get verification data
    const verificationData = await redis.get(verificationKey);
    if (!verificationData) {
      return res.status(404).json({
        success: false,
        message: 'Código de verificación no encontrado o expirado. Solicita uno nuevo.',
        expired: true
      });
    }

    // Upstash Redis auto-parses JSON, so check if it's already an object
    const data = typeof verificationData === 'string' ? JSON.parse(verificationData) : verificationData;
    
    // Check if code has expired
    if (Date.now() > data.expiresAt) {
      await redis.del(verificationKey); // Clean up expired code
      return res.status(400).json({
        success: false,
        message: 'El código ha expirado. Solicita uno nuevo.',
        expired: true
      });
    }

    // Check attempts
    if (data.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      // Lock account
      const lockoutData = {
        email,
        lockedAt: Date.now(),
        expiresAt: Date.now() + VERIFICATION_LOCKOUT,
        reason: 'too_many_attempts'
      };
      
      await redis.setex(lockoutKey, Math.ceil(VERIFICATION_LOCKOUT / 1000), JSON.stringify(lockoutData));
      await redis.del(verificationKey); // Clean up verification data
      
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.',
        rateLimited: true
      });
    }

    // Verify code
    if (data.code !== code) {
      // Increment attempts
      const updatedData = {
        ...data,
        attempts: data.attempts + 1,
        lastAttempt: Date.now()
      };
      
      const ttl = await redis.ttl(verificationKey);
      await redis.setex(verificationKey, ttl > 0 ? ttl : 300, JSON.stringify(updatedData));
      
      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - updatedData.attempts;
      
      return res.status(400).json({
        success: false,
        message: `Código incorrecto. ${remainingAttempts} intentos restantes.`,
        verified: false,
        remainingAttempts
      });
    }

    // Code is correct - mark as verified
    const verifiedData = {
      email,
      verifiedAt: Date.now(),
      source: data.source || 'general',
      originalCode: data.code
    };

    // Store verified email (30 days expiry)
    const verifiedKey = `email_verified:${email}`;
    await redis.setex(verifiedKey, 30 * 24 * 60 * 60, JSON.stringify(verifiedData));

    // Clean up verification data
    await redis.del(verificationKey);
    
    // Clean up any lockout (in case of edge cases)
    await redis.del(lockoutKey);

    console.log('✅ Email verification successful:', { 
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      source: data.source,
      verifiedAt: new Date(verifiedData.verifiedAt).toISOString()
    });

    return res.status(200).json({
      success: true,
      message: '¡Email verificado exitosamente!',
      verified: true
    });

  } catch (error: any) {
    console.error('❌ Email verification failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}