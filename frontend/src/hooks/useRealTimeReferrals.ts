import { useState, useEffect, useRef, useCallback } from 'react';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  conversionRate: number;
}

interface SSEEvent {
  type: 'connected' | 'stats_update' | 'stats_changed' | 'new_activations' | 'heartbeat' | 'error';
  data?: any;
  message?: string;
  timestamp: string;
}

interface UseRealTimeReferralsReturn {
  stats: ReferralStats | null;
  recentActivations: any[];
  isConnected: boolean;
  error: string | null;
  lastUpdate: string | null;
}

export function useRealTimeReferrals(address: string | undefined): UseRealTimeReferralsReturn {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [recentActivations, setRecentActivations] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('📡 Disconnecting SSE for real-time referrals');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!address) return;

    disconnect(); // Clean up any existing connection

    console.log('📡 Connecting to real-time referral updates for:', address.slice(0, 10) + '...');

    try {
      const eventSource = new EventSource(`/api/referrals/live-updates?address=${address}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          setLastUpdate(data.timestamp);

          switch (data.type) {
            case 'connected':
              console.log('📡 Real-time updates connected');
              break;

            case 'stats_update':
            case 'stats_changed':
              const newStats = data.type === 'stats_changed' ? data.data.current : data.data;
              setStats(newStats);
              
              if (data.type === 'stats_changed') {
                console.log('📊 Real-time stats update:', data.data.changes);
                
                // Show notification for significant changes
                if (data.data.changes.newReferrals > 0 || data.data.changes.newEarnings > 0) {
                  const message = `🎉 New activity! +${data.data.changes.newReferrals} referrals, +$${data.data.changes.newEarnings.toFixed(2)} earnings`;
                  console.log(message);
                  
                  // You could dispatch a custom event here for toast notifications
                  window.dispatchEvent(new CustomEvent('referral-update', {
                    detail: { message, changes: data.data.changes }
                  }));
                }
              }
              break;

            case 'new_activations':
              setRecentActivations(prev => [...data.data, ...prev].slice(0, 10)); // Keep last 10
              console.log('🎁 New referral activations:', data.data.length);
              break;

            case 'heartbeat':
              // Just update last seen time
              break;

            case 'error':
              console.error('SSE error from server:', data.message);
              setError(data.message || 'Unknown server error');
              break;

            default:
              console.log('Unknown SSE event type:', data.type);
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError);
          setError('Failed to parse update data');
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        setIsConnected(false);
        setError('Connection lost');

        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect SSE...');
          connect();
        }, 5000);
      };

    } catch (connectionError) {
      console.error('Failed to establish SSE connection:', connectionError);
      setError('Failed to connect to real-time updates');
    }
  }, [address, disconnect]);

  // Connect/disconnect based on address availability
  useEffect(() => {
    if (address) {
      connect();
    } else {
      disconnect();
    }

    return disconnect;
  }, [address, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    stats,
    recentActivations,
    isConnected,
    error,
    lastUpdate
  };
}