import { withDebugAuth } from '../../../lib/debugAuth';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Simple trace viewer for debugging transaction flows
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const logsDir = path.join(process.cwd(), 'logs');
    const tracesFile = path.join(logsDir, 'flow-traces.json');
    const mintLogsFile = path.join(logsDir, 'mint-logs.json');

    // Get flow traces
    let flowTraces = [];
    if (fs.existsSync(tracesFile)) {
      const tracesData = fs.readFileSync(tracesFile, 'utf8');
      flowTraces = JSON.parse(tracesData).slice(-5); // Last 5 traces
    }

    // Get mint logs
    let mintLogs = [];
    if (fs.existsSync(mintLogsFile)) {
      const logsData = fs.readFileSync(mintLogsFile, 'utf8');
      mintLogs = JSON.parse(logsData).slice(-20); // Last 20 logs
    }

    // Generate HTML visualization
    const html = generateTraceVisualizationHTML(flowTraces, mintLogs);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to load traces', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

function generateTraceVisualizationHTML(flowTraces: any[], mintLogs: any[]) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CryptoGift Flow Traces - Debug Viewer</title>
    <style>
        body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .trace { border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px; overflow: hidden; }
        .trace-header { background: #f8f9fa; padding: 10px; border-bottom: 1px solid #ddd; }
        .trace-content { padding: 15px; }
        .step { margin-bottom: 10px; padding: 8px; border-left: 4px solid #ccc; background: #f9f9f9; }
        .step.success { border-left-color: #28a745; background: #d4edda; }
        .step.error { border-left-color: #dc3545; background: #f8d7da; }
        .step.pending { border-left-color: #ffc107; background: #fff3cd; }
        .step.skipped { border-left-color: #6c757d; background: #e2e3e5; }
        .decision { background: #e7f3ff; border: 1px solid #bee5eb; padding: 8px; margin: 5px 0; border-radius: 4px; }
        .error-log { background: #f8d7da; border: 1px solid #f5c6cb; padding: 8px; margin: 5px 0; border-radius: 4px; }
        .timestamp { font-size: 0.8em; color: #666; }
        .path { font-weight: bold; color: #495057; }
        .no-data { text-align: center; color: #666; padding: 40px; }
        .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #0056b3; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 CryptoGift Flow Traces - Debug Viewer</h1>
            <p>Real-time transaction flow debugging • 🚀 Developed by mbxarts.com THE MOON IN A BOX LLC</p>
            <button class="refresh-btn" onclick="window.location.reload()">↻ Refresh Data</button>
        </div>

        ${flowTraces.length > 0 ? `
        <div class="section">
            <h2>📊 Recent Flow Traces (${flowTraces.length})</h2>
            ${flowTraces.map(trace => `
                <div class="trace">
                    <div class="trace-header">
                        <strong>Session: ${trace.sessionId}</strong> 
                        <span class="timestamp">${new Date(trace.startTime).toLocaleString()}</span>
                        <span style="float: right; background: ${trace.finalResult === 'success' ? '#28a745' : trace.finalResult === 'error' ? '#dc3545' : '#ffc107'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">
                            ${trace.finalResult || 'in-progress'}
                        </span>
                    </div>
                    <div class="trace-content">
                        <p><strong>User:</strong> ${trace.userAddress}</p>
                        <p><strong>Steps:</strong> ${trace.steps.length}</p>
                        ${trace.endTime ? `<p><strong>Duration:</strong> ${Math.round((new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime()) / 1000)}s</p>` : ''}
                        
                        <h4>🛤️ Execution Path:</h4>
                        ${trace.steps.map(step => `
                            <div class="step ${step.result || ''}">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span class="path">${step.component}.${step.action}</span>
                                    <span class="timestamp">${new Date(step.timestamp).toLocaleTimeString()}</span>
                                </div>
                                ${step.decision ? `<div class="decision">🤔 DECISION: ${step.decision}</div>` : ''}
                                ${step.error ? `<div class="error-log">❌ ERROR: ${step.error}</div>` : ''}
                                ${step.data ? `<pre>${JSON.stringify(step.data, null, 2).substring(0, 300)}${JSON.stringify(step.data, null, 2).length > 300 ? '...' : ''}</pre>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : `
        <div class="section">
            <div class="no-data">
                <h3>📭 No Flow Traces Found</h3>
                <p>Start a transaction to see traces appear here.</p>
            </div>
        </div>
        `}

        ${mintLogs.length > 0 ? `
        <div class="section">
            <h2>📋 Recent Mint Logs (${mintLogs.length})</h2>
            ${mintLogs.map(log => `
                <div class="step ${log.level === 'ERROR' ? 'error' : log.level === 'SUCCESS' ? 'success' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="path">[${log.level}] ${log.step}</span>
                        <span class="timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    ${log.data ? `<pre>${JSON.stringify(log.data, null, 2).substring(0, 300)}${JSON.stringify(log.data, null, 2).length > 300 ? '...' : ''}</pre>` : ''}
                </div>
            `).join('')}
        </div>
        ` : `
        <div class="section">
            <div class="no-data">
                <h3>📭 No Mint Logs Found</h3>
                <p>Execute a mint transaction to see logs appear here.</p>
            </div>
        </div>
        `}

        <div class="section">
            <h3>🔧 Debug Endpoints</h3>
            <ul>
                <li><a href="/api/debug/flow-trace?latest=true" target="_blank">Latest Flow Trace (JSON)</a></li>
                <li><a href="/api/debug/latest-error" target="_blank">Latest Error (JSON)</a></li>
                <li><a href="/api/debug/mint-logs" target="_blank">All Mint Logs (JSON)</a></li>
                <li><a href="/api/debug/trace-viewer" target="_blank">This Viewer (HTML)</a></li>
            </ul>
        </div>

        <div class="section">
            <h3>💡 How to Use</h3>
            <ol>
                <li><strong>Flow Traces:</strong> Complete transaction flows from start to finish with decision points</li>
                <li><strong>Mint Logs:</strong> Detailed API-level logging with error details</li>
                <li><strong>Real-time:</strong> Refresh this page to see latest traces and logs</li>
                <li><strong>Debug:</strong> Look for ERROR steps and failed decisions to identify issues</li>
            </ol>
        </div>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => window.location.reload(), 30000);
        
        // Add click-to-expand for large data objects
        document.querySelectorAll('pre').forEach(pre => {
            if (pre.textContent.length > 200) {
                pre.style.cursor = 'pointer';
                pre.title = 'Click to expand/collapse';
                pre.addEventListener('click', () => {
                    pre.style.maxHeight = pre.style.maxHeight === 'none' ? '100px' : 'none';
                    pre.style.overflow = pre.style.overflow === 'visible' ? 'hidden' : 'visible';
                });
                pre.style.maxHeight = '100px';
                pre.style.overflow = 'hidden';
            }
        });
    </script>
</body>
</html>
  `;
}
// Export with debug authentication
export default withDebugAuth(handler);
