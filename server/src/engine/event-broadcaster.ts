import { Response } from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../db/database.js';

export interface VerificationEvent {
  id: string;
  runId: string;
  type: string;
  payload: any;
  sequenceNumber: number;
  timestamp: string;
}

export class EventBroadcaster {
  private static subscribers: Map<string, Set<Response>> = new Map();
  private static sequenceTracker: Map<string, number> = new Map();

  public static subscribe(runId: string, res: Response, lastEventId?: string): void {
    if (!this.subscribers.has(runId)) {
      this.subscribers.set(runId, new Set());
    }
    this.subscribers.get(runId)!.add(res);

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Replay past events if lastEventId is provided
    if (lastEventId) {
      this.replayPastEvents(runId, res, lastEventId);
    }

    // Keep connection alive with heartbeat comment every 20s
    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeat);
      }
    }, 20000);

    res.on('close', () => {
      clearInterval(heartbeat);
      const subs = this.subscribers.get(runId);
      if (subs) {
        subs.delete(res);
        if (subs.size === 0) {
          this.subscribers.delete(runId);
        }
      }
    });
  }

  public static broadcast(runId: string, eventType: string, payload: any): VerificationEvent {
    const db = getDatabase();
    const currentSeq = (this.sequenceTracker.get(runId) || 0) + 1;
    this.sequenceTracker.set(runId, currentSeq);

    const eventId = `evt-${Date.now()}-${currentSeq}`;
    const timestamp = new Date().toISOString();

    const event: VerificationEvent = {
      id: eventId,
      runId,
      type: eventType,
      payload,
      sequenceNumber: currentSeq,
      timestamp
    };

    // 1. Persist event to SQLite for durable state recovery
    try {
      db.prepare(`
        INSERT INTO run_events (id, run_id, event_type, payload_json, sequence_number, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        event.id,
        event.runId,
        event.type,
        JSON.stringify(event.payload),
        event.sequenceNumber,
        event.timestamp
      );
    } catch (err) {
      console.error('Failed to persist run event:', err);
    }

    // 2. Broadcast to live connected clients
    const subs = this.subscribers.get(runId);
    if (subs && subs.size > 0) {
      const sseMessage = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
      for (const client of subs) {
        try {
          client.write(sseMessage);
        } catch (err) {
          subs.delete(client);
        }
      }
    }

    return event;
  }

  private static replayPastEvents(runId: string, res: Response, lastEventId: string): void {
    const db = getDatabase();
    try {
      // Find sequence of lastEventId
      const lastRow = db.prepare('SELECT sequence_number FROM run_events WHERE id = ?').get(lastEventId) as any;
      const lastSeq = lastRow ? lastRow.sequence_number : 0;

      const rows = db.prepare(`
        SELECT * FROM run_events
        WHERE run_id = ? AND sequence_number > ?
        ORDER BY sequence_number ASC
      `).all(runId, lastSeq) as any[];

      for (const row of rows) {
        const event: VerificationEvent = {
          id: row.id,
          runId: row.run_id,
          type: row.event_type,
          payload: JSON.parse(row.payload_json),
          sequenceNumber: row.sequence_number,
          timestamp: row.timestamp
        };
        res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      console.warn('Event replay failed:', err);
    }
  }
}
