/**
 * REAL-TIME EVENTS HOOK
 * =====================
 *
 * React hook for subscribing to real-time competition events via SSE.
 *
 * Features:
 * - Automatic reconnection on disconnect
 * - Event filtering by type
 * - Event history caching
 * - Connection status tracking
 *
 * Usage:
 * ```tsx
 * const { events, isConnected, error } = useRealtimeEvents({
 *   competitionId: 'abc123',
 *   onEvent: (event) => console.log('New event:', event),
 *   eventTypes: ['bet.placed', 'vote.cast'],
 * });
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CompetitionEvent, CompetitionEventType } from '../lib/eventSystem';

// =============================================================================
// TYPES
// =============================================================================

export interface UseRealtimeEventsOptions {
  /**
   * Competition ID to subscribe to (optional - subscribes to all if not provided)
   */
  competitionId?: string;

  /**
   * Event types to filter (optional - receives all if not provided)
   */
  eventTypes?: CompetitionEventType[];

  /**
   * Callback for each event received
   */
  onEvent?: (event: CompetitionEvent) => void;

  /**
   * Callback when connection status changes
   */
  onConnectionChange?: (isConnected: boolean) => void;

  /**
   * Callback for errors
   */
  onError?: (error: Error) => void;

  /**
   * Auto-reconnect on disconnect (default: true)
   */
  autoReconnect?: boolean;

  /**
   * Maximum reconnect attempts (default: 5)
   */
  maxReconnectAttempts?: number;

  /**
   * Reconnect delay in ms (default: 3000)
   */
  reconnectDelay?: number;

  /**
   * Maximum events to keep in history (default: 100)
   */
  maxHistory?: number;

  /**
   * Enable/disable the connection (default: true)
   */
  enabled?: boolean;
}

export interface UseRealtimeEventsReturn {
  /**
   * List of received events (newest first)
   */
  events: CompetitionEvent[];

  /**
   * Connection status
   */
  isConnected: boolean;

  /**
   * Connection error
   */
  error: Error | null;

  /**
   * Client ID assigned by the server
   */
  clientId: string | null;

  /**
   * Number of reconnect attempts
   */
  reconnectAttempts: number;

  /**
   * Manually reconnect
   */
  reconnect: () => void;

  /**
   * Disconnect
   */
  disconnect: () => void;

  /**
   * Clear event history
   */
  clearEvents: () => void;

  /**
   * Get events by type
   */
  getEventsByType: (type: CompetitionEventType) => CompetitionEvent[];
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useRealtimeEvents(
  options: UseRealtimeEventsOptions = {}
): UseRealtimeEventsReturn {
  const {
    competitionId,
    eventTypes,
    onEvent,
    onConnectionChange,
    onError,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 3000,
    maxHistory = 100,
    enabled = true,
  } = options;

  // State
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, [clearReconnectTimeout]);

  // Connect
  const connect = useCallback(() => {
    // Don't connect if disabled
    if (!enabled) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Build URL
    let url = '/api/competition/events';
    if (competitionId) {
      url += `?competitionId=${encodeURIComponent(competitionId)}`;
    }

    // Create EventSource
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Handle connection opened
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      onConnectionChange?.(true);
    };

    // Handle connected event
    eventSource.addEventListener('connected', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setClientId(data.clientId);
      } catch (err) {
        console.error('Failed to parse connected event:', err);
      }
    });

    // Handle competition events
    const handleEvent = (e: MessageEvent) => {
      try {
        const event: CompetitionEvent = JSON.parse(e.data);

        // Filter by event type if specified
        if (eventTypes && !eventTypes.includes(event.type)) {
          return;
        }

        // Add to events list
        setEvents((prev) => {
          const newEvents = [event, ...prev];
          return newEvents.slice(0, maxHistory);
        });

        // Call callback
        onEvent?.(event);
      } catch (err) {
        console.error('Failed to parse event:', err);
      }
    };

    // Listen to all event types
    const allEventTypes: CompetitionEventType[] = [
      'competition.created',
      'competition.started',
      'competition.ended',
      'competition.resolved',
      'competition.cancelled',
      'participant.joined',
      'participant.withdrew',
      'bet.placed',
      'bet.sold',
      'vote.cast',
      'vote.result',
      'prize.distributed',
      'safe.transaction',
      'safe.confirmation',
      'safe.execution',
      'market.update',
      'market.resolved',
      'chat.message',
      'dispute.created',
      'dispute.resolved',
      'error',
    ];

    allEventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, handleEvent);
    });

    // Also listen to generic message events
    eventSource.onmessage = handleEvent;

    // Handle errors
    eventSource.onerror = () => {
      setIsConnected(false);
      onConnectionChange?.(false);

      const connectionError = new Error('SSE connection failed');
      setError(connectionError);
      onError?.(connectionError);

      // Close the connection
      eventSource.close();
      eventSourceRef.current = null;

      // Auto-reconnect if enabled
      if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connect();
        }, reconnectDelay);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [
    enabled,
    competitionId,
    eventTypes,
    onEvent,
    onConnectionChange,
    onError,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    maxHistory,
    reconnectAttempts,
    clearReconnectTimeout,
  ]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Get events by type
  const getEventsByType = useCallback(
    (type: CompetitionEventType): CompetitionEvent[] => {
      return events.filter((event) => event.type === type);
    },
    [events]
  );

  // Connect on mount / when dependencies change
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, competitionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    events,
    isConnected,
    error,
    clientId,
    reconnectAttempts,
    reconnect,
    disconnect,
    clearEvents,
    getEventsByType,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for subscribing to bet events
 */
export function useBetEvents(competitionId: string) {
  return useRealtimeEvents({
    competitionId,
    eventTypes: ['bet.placed', 'bet.sold'],
  });
}

/**
 * Hook for subscribing to vote events
 */
export function useVoteEvents(competitionId: string) {
  return useRealtimeEvents({
    competitionId,
    eventTypes: ['vote.cast', 'vote.result'],
  });
}

/**
 * Hook for subscribing to Safe transaction events
 */
export function useSafeEvents(competitionId: string) {
  return useRealtimeEvents({
    competitionId,
    eventTypes: ['safe.transaction', 'safe.confirmation', 'safe.execution'],
  });
}

/**
 * Hook for subscribing to chat events
 */
export function useChatEvents(competitionId: string) {
  return useRealtimeEvents({
    competitionId,
    eventTypes: ['chat.message'],
  });
}

/**
 * Hook for subscribing to market update events
 */
export function useMarketEvents(competitionId: string) {
  return useRealtimeEvents({
    competitionId,
    eventTypes: ['market.update', 'market.resolved'],
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useRealtimeEvents;
