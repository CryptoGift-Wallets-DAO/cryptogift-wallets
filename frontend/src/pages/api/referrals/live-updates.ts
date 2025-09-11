import { NextApiRequest, NextApiResponse } from 'next';
import { kvReferralDB } from '../../../lib/referralDatabaseKV';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests for SSE
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address parameter is required' });
  }

  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  console.log('📡 SSE connection established for:', address.slice(0, 10) + '...');

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Real-time updates connected',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Function to send updates to client
  const sendUpdate = (data: any) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE update:', error);
    }
  };

  // Store last known stats to detect changes
  let lastStats = await kvReferralDB.getReferralStats(address);
  
  // Send initial stats
  sendUpdate({
    type: 'stats_update',
    data: lastStats,
    timestamp: new Date().toISOString()
  });

  // Set up polling interval to check for changes
  const interval = setInterval(async () => {
    try {
      // Check for recent activations
      const recentActivations = await kvReferralDB.getRecentActivations(5);
      const userActivations = recentActivations.filter(
        activation => activation.referrerAddress.toLowerCase() === address.toLowerCase()
      );

      if (userActivations.length > 0) {
        sendUpdate({
          type: 'new_activations',
          data: userActivations,
          timestamp: new Date().toISOString()
        });
      }

      // Check for stats changes
      const currentStats = await kvReferralDB.getReferralStats(address);
      
      if (
        currentStats.totalReferrals !== lastStats.totalReferrals ||
        currentStats.totalEarnings !== lastStats.totalEarnings ||
        currentStats.activeReferrals !== lastStats.activeReferrals
      ) {
        const statsChange = {
          previous: lastStats,
          current: currentStats,
          changes: {
            newReferrals: currentStats.totalReferrals - lastStats.totalReferrals,
            newEarnings: currentStats.totalEarnings - lastStats.totalEarnings,
            newActiveReferrals: currentStats.activeReferrals - lastStats.activeReferrals
          }
        };

        sendUpdate({
          type: 'stats_changed',
          data: statsChange,
          timestamp: new Date().toISOString()
        });

        lastStats = currentStats;
        
        console.log('📊 Stats change detected for', address.slice(0, 10) + '...:', statsChange.changes);
      }

      // Send heartbeat to keep connection alive
      sendUpdate({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in SSE polling:', error);
      sendUpdate({
        type: 'error',
        message: 'Error checking for updates',
        timestamp: new Date().toISOString()
      });
    }
  }, 10000); // Check every 10 seconds

  // Clean up when client disconnects
  req.on('close', () => {
    console.log('📡 SSE connection closed for:', address.slice(0, 10) + '...');
    clearInterval(interval);
  });

  req.on('error', (error) => {
    console.error('SSE connection error:', error);
    clearInterval(interval);
  });
}