/**
 * CSP Violation Report Endpoint
 * POST /api/security/csp-report
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * Used to monitor CSP violations before switching from report-only to enforce mode.
 *
 * CSP Migration Path:
 * 1. Start with Content-Security-Policy-Report-Only (current default)
 * 2. Monitor this endpoint for violations
 * 3. Fix any legitimate resources being blocked
 * 4. Set CSP_ENFORCE=true only when violations are zero
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// CSP Report format from browsers
interface CSPViolationReport {
  'csp-report'?: {
    'document-uri'?: string;
    'referrer'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'disposition'?: string;
    'blocked-uri'?: string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code'?: number;
    'script-sample'?: string;
  };
}

// Response type
interface CSPReportResponse {
  received: boolean;
  message?: string;
}

// Rate limiting: Track reports per IP (in-memory, resets on deploy)
const reportCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // Max 100 reports per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = reportCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    reportCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count++;
  return false;
}

// Sanitize report data for logging (no PII)
function sanitizeReport(report: CSPViolationReport['csp-report']): Record<string, unknown> {
  if (!report) return {};

  return {
    directive: report['violated-directive'] || report['effective-directive'],
    blockedUri: report['blocked-uri']?.substring(0, 200), // Truncate long URIs
    disposition: report['disposition'],
    // Omit document-uri, referrer, source-file to avoid PII leaks
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CSPReportResponse>
) {
  // Only accept POST requests (browser sends reports via POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ received: false, message: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.socket.remoteAddress ||
                   'unknown';

  if (isRateLimited(clientIP)) {
    return res.status(429).json({ received: false, message: 'Rate limited' });
  }

  try {
    const report = req.body as CSPViolationReport;
    const cspReport = report?.['csp-report'];

    if (!cspReport) {
      return res.status(400).json({ received: false, message: 'Invalid report format' });
    }

    // Log sanitized report (no PII)
    const sanitized = sanitizeReport(cspReport);
    const isEnforce = cspReport['disposition'] === 'enforce';

    // Log with appropriate level
    if (isEnforce) {
      // Enforce mode = blocking resources = critical
      console.error('[CSP-ENFORCE] Violation blocked:', JSON.stringify(sanitized));
    } else {
      // Report-only mode = just monitoring = info level
      console.info('[CSP-REPORT] Violation detected:', JSON.stringify(sanitized));
    }

    // In production, you could also:
    // 1. Store in Redis for aggregation
    // 2. Send to Sentry/monitoring
    // 3. Trigger alerts for new directive violations

    return res.status(204).end(); // 204 No Content is standard for report endpoints

  } catch (error) {
    // Don't expose error details
    console.error('[CSP-REPORT] Error processing report');
    return res.status(500).json({ received: false, message: 'Error processing report' });
  }
}

// Disable body parser size limit for CSP reports
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb', // CSP reports are small
    },
  },
};
