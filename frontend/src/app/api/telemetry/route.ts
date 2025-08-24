/**
 * Telemetry API Endpoint
 * Collects and processes telemetry data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitMiddleware } from '@/lib/security/rate-limiter';
import { getProductionConfig } from '@/lib/config/production';

// Telemetry event schema
const telemetryEventSchema = z.object({
  name: z.string().max(100),
  properties: z.record(z.any()).optional(),
  timestamp: z.number().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

const telemetryBatchSchema = z.object({
  events: z.array(telemetryEventSchema).max(100),
});

export async function POST(req: NextRequest) {
  try {
    // Check if telemetry is enabled
    const config = getProductionConfig();
    if (!config.monitoring.performanceTracking) {
      return NextResponse.json({ success: true, message: 'Telemetry disabled' });
    }
    
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware('api')(req as any);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Parse and validate request
    const body = await req.json();
    const { events } = telemetryBatchSchema.parse(body);
    
    // Process events
    await processTelemetryEvents(events);
    
    return NextResponse.json({ success: true, received: events.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid telemetry data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('[Telemetry] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process telemetry' },
      { status: 500 }
    );
  }
}

/**
 * Process telemetry events
 */
async function processTelemetryEvents(events: any[]) {
  // Get Redis client for aggregation
  const redis = await getRedisClient();
  
  for (const event of events) {
    try {
      // Store in Redis for aggregation
      if (redis) {
        const key = `telemetry:${event.name}:${getHourBucket()}`;
        await redis.hincrby(key, 'count', 1);
        await redis.expire(key, 86400); // 24 hour TTL
        
        // Store metrics
        if (event.name.startsWith('metric.')) {
          const metricKey = `metrics:${event.name}:${getHourBucket()}`;
          const value = event.properties?.value;
          if (typeof value === 'number') {
            await redis.lpush(metricKey, value);
            await redis.ltrim(metricKey, 0, 999); // Keep last 1000 values
            await redis.expire(metricKey, 86400);
          }
        }
      }
      
      // Send to external services
      await sendToExternalServices(event);
      
    } catch (error) {
      console.error('[Telemetry] Failed to process event:', error);
    }
  }
}

/**
 * Send to external analytics services
 */
async function sendToExternalServices(event: any) {
  const promises = [];
  
  // Send to Mixpanel
  if (process.env.MIXPANEL_TOKEN) {
    promises.push(sendToMixpanel(event));
  }
  
  // Send to Amplitude
  if (process.env.AMPLITUDE_API_KEY) {
    promises.push(sendToAmplitude(event));
  }
  
  // Send to PostHog
  if (process.env.POSTHOG_API_KEY) {
    promises.push(sendToPostHog(event));
  }
  
  await Promise.allSettled(promises);
}

/**
 * Send to Mixpanel
 */
async function sendToMixpanel(event: any) {
  try {
    const data = {
      event: event.name,
      properties: {
        ...event.properties,
        time: event.timestamp || Date.now(),
        distinct_id: event.userId || event.sessionId,
        $insert_id: `${event.sessionId}-${event.timestamp}`,
      },
    };
    
    const encoded = Buffer.from(JSON.stringify(data)).toString('base64');
    await fetch(`https://api.mixpanel.com/track?data=${encoded}`, {
      method: 'GET',
    });
  } catch (error) {
    console.debug('[Mixpanel] Error:', error);
  }
}

/**
 * Send to Amplitude
 */
async function sendToAmplitude(event: any) {
  try {
    await fetch('https://api.amplitude.com/2/httpapi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: process.env.AMPLITUDE_API_KEY,
        events: [{
          user_id: event.userId,
          session_id: event.sessionId ? parseInt(event.sessionId) : undefined,
          event_type: event.name,
          time: event.timestamp || Date.now(),
          event_properties: event.properties,
        }],
      }),
    });
  } catch (error) {
    console.debug('[Amplitude] Error:', error);
  }
}

/**
 * Send to PostHog
 */
async function sendToPostHog(event: any) {
  try {
    await fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_API_KEY,
        event: event.name,
        properties: event.properties,
        timestamp: new Date(event.timestamp || Date.now()).toISOString(),
        distinct_id: event.userId || event.sessionId,
      }),
    });
  } catch (error) {
    console.debug('[PostHog] Error:', error);
  }
}

/**
 * Get hour bucket for aggregation
 */
function getHourBucket(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString();
}

/**
 * Get Redis client
 */
async function getRedisClient() {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = await import('@upstash/redis');
      return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    return null;
  } catch (error) {
    console.error('[Redis] Connection error:', error);
    return null;
  }
}

// GET endpoint for metrics dashboard
export async function GET(req: NextRequest) {
  try {
    const config = getProductionConfig();
    if (!config.monitoring.performanceTracking) {
      return NextResponse.json({ error: 'Telemetry disabled' }, { status: 404 });
    }
    
    // Require admin token
    const token = req.headers.get('x-admin-token');
    if (token !== process.env.ADMIN_API_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get aggregated metrics
    const redis = await getRedisClient();
    if (!redis) {
      return NextResponse.json({ error: 'Redis not available' }, { status: 503 });
    }
    
    // Get current hour metrics
    const hourBucket = getHourBucket();
    const keys = await redis.keys(`telemetry:*:${hourBucket}`);
    
    const metrics: Record<string, number> = {};
    for (const key of keys) {
      const count = await redis.hget(key, 'count');
      const eventName = key.split(':')[1];
      metrics[eventName] = parseInt(count as string) || 0;
    }
    
    return NextResponse.json({ metrics, timestamp: hourBucket });
  } catch (error) {
    console.error('[Telemetry] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}