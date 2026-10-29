import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'path';

export interface AgentEvent {
  id: string;
  type: string;
  source: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  jevVerdict: string | null;
  jevConfidence: number | null;
  userAction: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);
  private db!: Database.Database;

  onModuleInit(): void {
    const dbPath = join(process.cwd(), 'data', 'agent.sqlite');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        jev_verdict TEXT,
        jev_confidence REAL,
        user_action TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      )
    `);
    this.logger.log('Agent memory initialized');
  }

  recordEvent(event: Omit<AgentEvent, 'userAction' | 'resolvedAt'>): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO events (id, type, source, message, severity, jev_verdict, jev_confidence, user_action, created_at, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
      )
      .run(
        event.id,
        event.type,
        event.source,
        event.message,
        event.severity,
        event.jevVerdict,
        event.jevConfidence,
        event.createdAt,
      );
  }

  recordUserAction(eventId: string, action: string): void {
    this.db
      .prepare(
        `UPDATE events SET user_action = ?, resolved_at = ? WHERE id = ?`,
      )
      .run(action, new Date().toISOString(), eventId);
  }

  getUnresolved(): AgentEvent[] {
    return this.db
      .prepare(
        `SELECT id, type, source, message, severity,
              jev_verdict as jevVerdict, jev_confidence as jevConfidence,
              user_action as userAction, created_at as createdAt, resolved_at as resolvedAt
       FROM events WHERE resolved_at IS NULL ORDER BY created_at DESC`,
      )
      .all() as AgentEvent[];
  }

  getRecent(limit = 50): AgentEvent[] {
    return this.db
      .prepare(
        `SELECT id, type, source, message, severity,
              jev_verdict as jevVerdict, jev_confidence as jevConfidence,
              user_action as userAction, created_at as createdAt, resolved_at as resolvedAt
       FROM events ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit) as AgentEvent[];
  }

  getDismissedPatterns(): string[] {
    return (
      this.db
        .prepare(
          `SELECT DISTINCT source || ':' || type as pattern FROM events WHERE user_action = 'dismiss'`,
        )
        .all() as { pattern: string }[]
    ).map((r) => r.pattern);
  }
}
