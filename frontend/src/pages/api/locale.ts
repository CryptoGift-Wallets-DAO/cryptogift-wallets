import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { locale } = req.body;

  if (!locale || !['en', 'es', 'qps-ploc'].includes(locale)) {
    return res.status(400).json({ error: 'Invalid locale' });
  }

  // Set the NEXT_LOCALE cookie for middleware to detect
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${locale}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`);

  console.log('🌐 Locale cookie set:', locale);

  return res.status(200).json({ success: true, locale });
}