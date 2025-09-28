/**
 * QSTASH SCHEDULER CONFIGURATION
 * Sets up scheduled jobs for analytics system
 *
 * Creates idempotent schedules using Upstash-Schedule-Id
 * Ensures no duplicate jobs are created
 *
 * Schedules:
 * - Reconciliation: Every 2 minutes
 * - Materialization: Every hour
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { debugLogger } from '@/lib/secureDebugLogger';
import { isAnalyticsEnabled, getAnalyticsConfig } from '@/lib/analytics/canonicalEvents';

interface QStashSchedule {
  url: string;
  cron: string;
  scheduleId: string;
  headers: Record<string, string>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check feature flag
  if (!isAnalyticsEnabled()) {
    return res.status(200).json({
      success: true,
      disabled: true,
      message: 'Analytics feature is disabled'
    });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      console.error('INTERNAL_API_SECRET not configured');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const providedSecret = authHeader?.replace('Bearer ', '');
    if (providedSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check QStash configuration
    const qstashUrl = process.env.QSTASH_URL || 'https://qstash.upstash.io';
    const qstashToken = process.env.QSTASH_TOKEN;

    if (!qstashToken) {
      return res.status(500).json({
        error: 'QStash not configured',
        message: 'QSTASH_TOKEN environment variable is missing'
      });
    }

    // Get base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_URL || `https://${req.headers.host}`;
    const config = getAnalyticsConfig();

    debugLogger.operation('Setting up QStash schedules', { baseUrl, config });

    // Define schedules
    const schedules: QStashSchedule[] = [
      {
        url: `${baseUrl}/api/referrals/_internal/reconcile`,
        cron: '*/2 * * * *', // Every 2 minutes
        scheduleId: 'ga-reconcile-2min',
        headers: {
          'Authorization': `Bearer ${expectedSecret}`,
          'Content-Type': 'application/json'
        }
      },
      {
        url: `${baseUrl}/api/analytics/_internal/materialize`,
        cron: '0 * * * *', // Every hour at minute 0
        scheduleId: 'ga-materialize-hourly',
        headers: {
          'Authorization': `Bearer ${expectedSecret}`,
          'Content-Type': 'application/json'
        }
      }
    ];

    const results = [];

    // Create or update each schedule
    for (const schedule of schedules) {
      try {
        debugLogger.operation(`Creating schedule: ${schedule.scheduleId}`, {
          url: schedule.url,
          cron: schedule.cron
        });

        // Create schedule using QStash API
        const response = await fetch(`${qstashUrl}/v2/schedules`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${qstashToken}`,
            'Content-Type': 'application/json',
            'Upstash-Schedule-Id': schedule.scheduleId // Idempotent schedule creation
          },
          body: JSON.stringify({
            destination: schedule.url,
            cron: schedule.cron,
            headers: schedule.headers,
            body: JSON.stringify({
              source: 'scheduler',
              timestamp: new Date().toISOString()
            }),
            retries: 3,
            timeout: 30000, // 30 second timeout
            method: 'POST'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();

          // Check if schedule already exists (409 Conflict)
          if (response.status === 409) {
            debugLogger.log(`Schedule ${schedule.scheduleId} already exists, updating...`);

            // Update existing schedule
            const updateResponse = await fetch(`${qstashUrl}/v2/schedules/${schedule.scheduleId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${qstashToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                destination: schedule.url,
                cron: schedule.cron,
                headers: schedule.headers,
                body: JSON.stringify({
                  source: 'scheduler',
                  timestamp: new Date().toISOString()
                }),
                retries: 3,
                timeout: 30000,
                method: 'POST'
              })
            });

            if (updateResponse.ok) {
              const updateData = await updateResponse.json();
              results.push({
                scheduleId: schedule.scheduleId,
                status: 'updated',
                data: updateData
              });
            } else {
              const updateError = await updateResponse.text();
              results.push({
                scheduleId: schedule.scheduleId,
                status: 'update_failed',
                error: updateError
              });
            }
          } else {
            results.push({
              scheduleId: schedule.scheduleId,
              status: 'failed',
              error: errorText
            });
          }
        } else {
          const data = await response.json();
          results.push({
            scheduleId: schedule.scheduleId,
            status: 'created',
            data
          });
        }

      } catch (error: any) {
        debugLogger.error(`Failed to create schedule ${schedule.scheduleId}`, error);
        results.push({
          scheduleId: schedule.scheduleId,
          status: 'error',
          error: error.message
        });
      }
    }

    // Check if we need to trigger immediate execution
    const triggerImmediate = req.body?.triggerImmediate;
    if (triggerImmediate) {
      debugLogger.operation('Triggering immediate execution of reconciliation');

      // Trigger reconciliation immediately
      try {
        const immediateResponse = await fetch(`${baseUrl}/api/referrals/_internal/reconcile`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${expectedSecret}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source: 'manual_trigger',
            timestamp: new Date().toISOString()
          })
        });

        if (immediateResponse.ok) {
          const immediateData = await immediateResponse.json();
          results.push({
            scheduleId: 'immediate-reconciliation',
            status: 'triggered',
            data: immediateData
          });
        }
      } catch (error: any) {
        debugLogger.error('Failed to trigger immediate reconciliation', error);
      }
    }

    debugLogger.operation('QStash schedules setup completed', { results });

    res.status(200).json({
      success: true,
      message: 'Schedules configured successfully',
      schedules: schedules.map(s => ({
        id: s.scheduleId,
        cron: s.cron,
        url: s.url
      })),
      results,
      config: {
        reconciliationInterval: config.reconciliationInterval,
        materializationInterval: config.materializationInterval,
        analyticsEnabled: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const errorTrace = `error-${Date.now()}`;
    console.error('Schedule setup error:', error);
    debugLogger.error('Schedule setup failed', { error: error.message, trace: errorTrace });

    res.status(500).json({
      success: false,
      error: 'Failed to setup schedules',
      message: error.message,
      trace: errorTrace
    });
  }
}