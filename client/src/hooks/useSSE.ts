import { useEffect, useState, useRef, useCallback } from 'react';

export interface SSEEvent {
  id: string;
  runId: string;
  type: string;
  payload: any;
  sequenceNumber: number;
  timestamp: string;
}

export function useSSE(runId: string | undefined, onEventReceived?: (event: SSEEvent) => void) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<string>('');

  const connect = useCallback(() => {
    if (!runId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/runs/${runId}/events${lastEventIdRef.current ? `?lastEventId=${lastEventIdRef.current}` : ''}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      // Auto reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          connect();
        }
      }, 3000);
    };

    // Generic listener for SSE messages
    const eventTypes = [
      'run.created',
      'agent.started',
      'agent.completed',
      'patch.generated',
      'test.started',
      'test.completed',
      'counterexample.discovered',
      'trust.collapsed',
      'mutation.completed',
      'security.finding',
      'circuit_breaker.activated',
      'repair.retry',
      'verification.blocked',
      'verification.completed',
      'human.decision'
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const parsed: SSEEvent = JSON.parse(e.data);
          lastEventIdRef.current = parsed.id;
          setEvents(prev => [...prev, parsed]);
          onEventReceived?.(parsed);
        } catch (err) {
          console.warn('Failed to parse SSE event payload:', err);
        }
      });
    }
  }, [runId, onEventReceived]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return { events, isConnected };
}
