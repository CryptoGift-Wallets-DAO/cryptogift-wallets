import { NextApiRequest, NextApiResponse } from "next";

/**
 * TEMPORARY TEST ENDPOINT: Verify NEXT_PUBLIC_SITE_URL is available
 * DELETE AFTER CONFIRMING ENVIRONMENT VARIABLE IS WORKING
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_SITE_URL: siteUrl ? `${siteUrl.substring(0, 20)}...` : 'MISSING',
        VERCEL_URL: process.env.VERCEL_URL ? `${process.env.VERCEL_URL.substring(0, 20)}...` : 'MISSING',
        hasVariable: !!siteUrl,
        fullValue: siteUrl // Temporary - will remove after test
      },
      uploadTestResult: siteUrl ? `Would use: ${siteUrl}` : 'ERROR: Variable missing'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}