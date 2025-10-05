/**
 * LIVE COMPARISON - Check XLEN in BOTH Redis instances
 * Shows which instance is receiving writes in real-time
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      instances: {}
    };

    console.log('🔍 Comparing BOTH Redis instances...');

    // Test Instance 1: exotic-alien (current production config)
    console.log('1. Testing exotic-alien-13383...');
    try {
      const redis1 = new Redis({
        url: 'https://exotic-alien-13383.upstash.io',
        token: 'ATRHAAIncDE4Y2IyNzI0MmExMzY0Zjc2YTc1ZThkYjhkZDQ0ZjAzZXAxMTMzODM'
      });

      const xlen1 = await redis1.xlen('ga:v1:events');
      const recent1 = await redis1.xrevrange('ga:v1:events', '+', '-', 3);

      results.instances.exotic_alien = {
        url: 'https://exotic-alien-13383.upstash.io',
        name: 'exotic-alien-13383 (VERCEL CONFIG)',
        status: 'connected',
        metrics: {
          xlen_ga_v1_events: xlen1,
          recent_events_count: Array.isArray(recent1) ? recent1.length : 0,
          last_3_events: Array.isArray(recent1)
            ? recent1.map(([id, fields]: [string, any]) => ({
                id,
                type: fields.type,
                timestamp: fields.timestamp || fields.blockTimestamp,
                giftId: fields.giftId,
                tokenId: fields.tokenId
              }))
            : []
        }
      };
      console.log(`   ✅ exotic-alien: XLEN = ${xlen1}`);
    } catch (error: any) {
      results.instances.exotic_alien = {
        url: 'https://exotic-alien-13383.upstash.io',
        name: 'exotic-alien-13383 (VERCEL CONFIG)',
        status: 'error',
        error: error.message
      };
      console.error('   ❌ exotic-alien error:', error.message);
    }

    // Test Instance 2: fit-mole (local config)
    console.log('2. Testing fit-mole-59344...');
    try {
      const redis2 = new Redis({
        url: 'https://fit-mole-59344.upstash.io',
        token: 'AefQAAIjcDE4ZjY1NjEwYWZjZDY0MTgzOWFkZjY2ZTA4MjJlNzg0OHAxMA'
      });

      const xlen2 = await redis2.xlen('ga:v1:events');
      const recent2 = await redis2.xrevrange('ga:v1:events', '+', '-', 3);

      results.instances.fit_mole = {
        url: 'https://fit-mole-59344.upstash.io',
        name: 'fit-mole-59344 (LOCAL CONFIG)',
        status: 'connected',
        metrics: {
          xlen_ga_v1_events: xlen2,
          recent_events_count: Array.isArray(recent2) ? recent2.length : 0,
          last_3_events: Array.isArray(recent2)
            ? recent2.map(([id, fields]: [string, any]) => ({
                id,
                type: fields.type,
                timestamp: fields.timestamp || fields.blockTimestamp,
                giftId: fields.giftId,
                tokenId: fields.tokenId
              }))
            : []
        }
      };
      console.log(`   ✅ fit-mole: XLEN = ${xlen2}`);
    } catch (error: any) {
      results.instances.fit_mole = {
        url: 'https://fit-mole-59344.upstash.io',
        name: 'fit-mole-59344 (LOCAL CONFIG)',
        status: 'error',
        error: error.message
      };
      console.error('   ❌ fit-mole error:', error.message);
    }

    // Analysis
    const exotic_xlen = results.instances.exotic_alien?.metrics?.xlen_ga_v1_events || 0;
    const fit_mole_xlen = results.instances.fit_mole?.metrics?.xlen_ga_v1_events || 0;

    results.analysis = {
      exotic_alien_events: exotic_xlen,
      fit_mole_events: fit_mole_xlen,
      conclusion: exotic_xlen > 0
        ? fit_mole_xlen > 0
          ? 'BOTH instances have events - DUAL WRITE or MIGRATION in progress'
          : 'exotic-alien is PRIMARY (has events, fit-mole empty)'
        : fit_mole_xlen > 0
        ? 'fit-mole is PRIMARY (has events, exotic-alien empty)'
        : 'NO EVENTS in either instance - tracking NOT writing',
      recommendation: exotic_xlen > fit_mole_xlen
        ? 'Use exotic-alien-13383 (more events)'
        : fit_mole_xlen > exotic_xlen
        ? 'Use fit-mole-59344 (more events)'
        : 'CRITICAL: No data in either instance'
    };

    console.log('📊 ANALYSIS:', results.analysis.conclusion);

    results.next_steps = [
      '1. Note the XLEN numbers above',
      '2. Create a NEW gift (e.g., #314) and complete the full flow',
      '3. Call this endpoint again',
      '4. The instance whose XLEN increased is the one receiving writes'
    ];

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('💥 Live comparison failed:', error);
    return res.status(500).json({
      error: 'Comparison failed',
      message: error.message,
      stack: error.stack
    });
  }
}
