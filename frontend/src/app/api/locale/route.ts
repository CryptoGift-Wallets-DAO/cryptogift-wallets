import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();
    
    // Validate locale
    if (!locale || !['es', 'en'].includes(locale)) {
      return new Response(JSON.stringify({ error: 'Invalid locale' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set the locale cookie
    const cookieStore = await cookies();
    cookieStore.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false, // Allow client-side access for debugging
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    console.log(`✅ Locale cookie set to: ${locale}`);

    return new Response(null, { 
      status: 204,
      headers: {
        'Set-Cookie': `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      }
    });

  } catch (error) {
    console.error('❌ Error setting locale:', error);
    return new Response(JSON.stringify({ error: 'Failed to set locale' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}