/**
 * MANUAL RECONCILIATION TRIGGER
 * Allows manual triggering of blockchain reconciliation
 * Useful for testing and immediate data import
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { debugLogger } from '@/lib/secureDebugLogger';
import { isAnalyticsEnabled } from '@/lib/analytics/canonicalEvents';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
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
    const baseUrl = process.env.NEXT_PUBLIC_URL || `https://${req.headers.host}`;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    if (!internalSecret) {
      return res.status(500).json({
        success: false,
        error: 'Internal API secret not configured'
      });
    }

    debugLogger.operation('Manually triggering reconciliation');

    // Trigger reconciliation
    const reconcileResponse = await fetch(`${baseUrl}/api/referrals/_internal/reconcile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'manual_trigger',
        timestamp: new Date().toISOString(),
        fromBlock: req.body.fromBlock // Optional: specify starting block
      })
    });

    const reconcileData = await reconcileResponse.json();

    // Also trigger materialization for immediate roll-ups
    const materializeResponse = await fetch(`${baseUrl}/api/analytics/_internal/materialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'manual_trigger',
        timestamp: new Date().toISOString()
      })
    });

    const materializeData = await materializeResponse.json();

    // Setup schedules if not already done
    const scheduleResponse = await fetch(`${baseUrl}/api/analytics/_internal/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${internalSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        triggerImmediate: false // Don't trigger again
      })
    });

    const scheduleData = await scheduleResponse.json();

    debugLogger.operation('Manual reconciliation completed', {
      reconcile: reconcileData,
      materialize: materializeData,
      schedule: scheduleData
    });

    return res.status(200).json({
      success: true,
      message: 'Reconciliation triggered successfully',
      results: {
        reconciliation: {
          success: reconcileData.success,
          eventsProcessed: reconcileData.eventsProcessed,
          fromBlock: reconcileData.fromBlock,
          toBlock: reconcileData.toBlock
        },
        materialization: {
          success: materializeData.success,
          eventsProcessed: materializeData.eventsProcessed,
          rollups: materializeData.rollups
        },
        schedules: {
          success: scheduleData.success,
          configured: scheduleData.schedules
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Trigger reconciliation error:', error);
    debugLogger.error('Failed to trigger reconciliation', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to trigger reconciliation',
      message: error.message || 'Unknown error'
    });
  }
}