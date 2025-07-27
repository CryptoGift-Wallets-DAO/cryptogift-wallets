import { withDebugAuth } from '../../../lib/debugAuth';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Quick endpoint to get latest error for debugging
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const logsDir = path.join(process.cwd(), 'logs');
    const logsFile = path.join(logsDir, 'mint-logs.json');
    
    if (!fs.existsSync(logsFile)) {
      return res.status(200).json({ 
        error: 'No logs found yet',
        logs: [] 
      });
    }

    const logsData = fs.readFileSync(logsFile, 'utf8');
    const logs = JSON.parse(logsData);
    
    // Get last 10 logs, prioritizing errors
    const errorLogs = logs.filter(log => log.level === 'ERROR').slice(-5);
    const recentLogs = logs.slice(-10);
    
    const combinedLogs = [...errorLogs, ...recentLogs]
      .filter((log, index, self) => 
        index === self.findIndex(l => l.timestamp === log.timestamp)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    res.status(200).json({
      success: true,
      latestError: errorLogs[0] || null,
      recentLogs: combinedLogs,
      totalLogs: logs.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
// Export with debug authentication
export default withDebugAuth(handler);
