/**
 * DIAGNOSTIC ENDPOINT - Test BOTH Redis instances
 * Verifies which Redis has the actual data for gift #313
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { tokenId = '313' } = req.query;

  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      tokenId,
      instances: {}
    };

    // Test Instance 1: exotic-alien (production)
    console.log('🔍 Testing exotic-alien-13383...');
    try {
      const redis1 = new Redis({
        url: 'https://exotic-alien-13383.upstash.io',
        token: 'ATRHAAIncDE4Y2IyNzI0MmExMzY0Zjc2YTc1ZThkYjhkZDQ0ZjAzZXAxMTMzODM'
      });

      const mapping1 = await redis1.hgetall(`gift_mapping:${tokenId}`);
      const detail1 = mapping1?.giftId
        ? await redis1.hgetall(`gift:detail:${mapping1.giftId}`)
        : null;

      results.instances.exotic_alien = {
        url: 'https://exotic-alien-13383.upstash.io',
        name: 'exotic-alien-13383 (PRODUCTION)',
        status: 'connected',
        data: {
          mapping: mapping1 || 'NOT_FOUND',
          giftDetail: detail1 || 'NOT_FOUND'
        }
      };
      console.log('✅ exotic-alien connected, mapping:', !!mapping1);
    } catch (error: any) {
      results.instances.exotic_alien = {
        url: 'https://exotic-alien-13383.upstash.io',
        name: 'exotic-alien-13383 (PRODUCTION)',
        status: 'error',
        error: error.message
      };
      console.error('❌ exotic-alien error:', error.message);
    }

    // Test Instance 2: fit-mole (local/development)
    console.log('🔍 Testing fit-mole-59344...');
    try {
      const redis2 = new Redis({
        url: 'https://fit-mole-59344.upstash.io',
        token: 'AefQAAIjcDE4ZjY1NjEwYWZjZDY0MTgzOWFkZjY2ZTA4MjJlNzg0OHAxMA'
      });

      const mapping2 = await redis2.hgetall(`gift_mapping:${tokenId}`);
      const detail2 = mapping2?.giftId
        ? await redis2.hgetall(`gift:detail:${mapping2.giftId}`)
        : null;

      results.instances.fit_mole = {
        url: 'https://fit-mole-59344.upstash.io',
        name: 'fit-mole-59344 (LOCAL)',
        status: 'connected',
        data: {
          mapping: mapping2 || 'NOT_FOUND',
          giftDetail: detail2 || 'NOT_FOUND'
        }
      };
      console.log('✅ fit-mole connected, mapping:', !!mapping2);
    } catch (error: any) {
      results.instances.fit_mole = {
        url: 'https://fit-mole-59344.upstash.io',
        name: 'fit-mole-59344 (LOCAL)',
        status: 'error',
        error: error.message
      };
      console.error('❌ fit-mole error:', error.message);
    }

    // Summary
    const exoticHasData = results.instances.exotic_alien?.data?.mapping !== 'NOT_FOUND';
    const fitMoleHasData = results.instances.fit_mole?.data?.mapping !== 'NOT_FOUND';

    results.summary = {
      exotic_alien_has_data: exoticHasData,
      fit_mole_has_data: fitMoleHasData,
      recommendation: exoticHasData
        ? 'Use exotic-alien-13383 (has data)'
        : fitMoleHasData
        ? 'Use fit-mole-59344 (has data)'
        : 'CRITICAL: No data found in either instance!'
    };

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('💥 Test both Redis failed:', error);
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
}
