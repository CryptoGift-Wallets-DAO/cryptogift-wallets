import { NextApiRequest, NextApiResponse } from 'next';

/**
 * SIMPLE NETWORK TEST: Test if basic API connectivity works
 * This will help isolate network vs logic issues
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const timestamp = new Date().toISOString();
  
  console.log('🌐 Network test endpoint called:', {
    method: req.method,
    timestamp,
    userAgent: req.headers['user-agent']?.substring(0, 50),
    contentType: req.headers['content-type']
  });

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'GET connectivity test successful',
      timestamp,
      serverTime: Date.now()
    });
  }

  if (req.method === 'POST') {
    console.log('📤 POST test with body size:', req.headers['content-length']);
    
    try {
      // Test if we can receive the body
      let bodySize = 0;
      let hasFormData = false;
      
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        hasFormData = true;
        console.log('📦 FormData detected');
      }
      
      return res.status(200).json({
        success: true,
        message: 'POST connectivity test successful',
        timestamp,
        receivedHeaders: {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length'],
          'user-agent': req.headers['user-agent']?.substring(0, 50)
        },
        hasFormData,
        serverTime: Date.now()
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
    allowedMethods: ['GET', 'POST']
  });
}