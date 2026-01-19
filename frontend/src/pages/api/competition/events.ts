/**
 * API: Competition Events (Server-Sent Events)
 * GET /api/competition/events
 *
 * Real-time event stream for competition updates.
 * Supports filtering by competition ID.
 *
 * Query Parameters:
 * - competitionId (optional): Filter events for a specific competition
 *
 * Headers:
 * - Accept: text/event-stream
 *
 * Response:
 * - Content-Type: text/event-stream
 * - Cache-Control: no-cache
 * - Connection: keep-alive
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import {
  getSSEConnectionManager,
  getEventEmitter,
  type CompetitionEvent,
} from '../../../competencias/lib/eventSystem';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Get competition ID filter
  const { competitionId } = req.query;
  const competitionIdStr = Array.isArray(competitionId)
    ? competitionId[0]
    : competitionId;

  // Generate client ID
  const clientId = uuidv4();

  // Send initial connection message
  const initialEvent = {
    type: 'connected',
    clientId,
    competitionId: competitionIdStr || null,
    timestamp: Date.now(),
  };
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);

  // Add client to connection manager
  const manager = getSSEConnectionManager();
  manager.addClient({
    id: clientId,
    competitionId: competitionIdStr,
    response: {
      write: (data: string) => res.write(data),
      flush: () => {
        // Node.js doesn't need explicit flush
      },
    },
  });

  // Send recent events for the competition
  if (competitionIdStr) {
    const emitter = getEventEmitter();
    const recentEvents = emitter.getEventHistory(competitionIdStr, 10);
    recentEvents.reverse().forEach((event) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  }

  // Handle client disconnect
  req.on('close', () => {
    manager.removeClient(clientId);
  });

  req.on('error', () => {
    manager.removeClient(clientId);
  });

  // Keep connection alive
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(`:keepalive\n\n`);
    } catch {
      clearInterval(keepAliveInterval);
      manager.removeClient(clientId);
    }
  }, 15000);

  // Clean up on response finish
  res.on('finish', () => {
    clearInterval(keepAliveInterval);
    manager.removeClient(clientId);
  });
}
