import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { locale } = req.body;

    if (!locale || (locale !== 'es' && locale !== 'en')) {
      return res.status(400).json({ error: 'Invalid locale' });
    }

    // Set the NEXT_LOCALE cookie
    const cookie = serialize('NEXT_LOCALE', locale, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Allow JavaScript to read it
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    res.setHeader('Set-Cookie', cookie);

    console.log(`🌍 Locale changed to: ${locale}`);

    return res.status(200).json({
      success: true,
      locale,
      message: `Locale changed to ${locale}`
    });

  } catch (error) {
    console.error('Error setting locale:', error);
    return res.status(500).json({
      error: 'Failed to set locale',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}