'use server';

import { cookies } from 'next/headers';

/**
 * Server Action para setear la cookie de idioma
 * Cumple con Next.js 15 - cookies solo en Server Actions/Route Handlers
 */
export async function setLocaleCookie(locale: 'es' | 'en') {
  const cookieStore = await cookies();
  
  // Persistimos por 1 año con configuración segura
  cookieStore.set('cg.locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    httpOnly: false, // Permitir acceso desde cliente para sync
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  
  return { success: true, locale };
}

/**
 * Server Action para obtener la cookie actual
 */
export async function getLocaleCookie() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('cg.locale');
  return localeCookie?.value || null;
}