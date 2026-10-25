import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { SCHEMA_SQL } from './schema.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabasePath(): string {
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'openguard.db');
}

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = getDatabasePath();
    dbInstance = new DatabaseSync(dbPath);
    // Enable WAL mode for high concurrency
    try {
      dbInstance.exec('PRAGMA journal_mode = WAL;');
      dbInstance.exec('PRAGMA foreign_keys = ON;');
    } catch (err) {
      console.warn('Could not set WAL pragma:', err);
    }
    // Run schema migrations
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function initSchema(db: DatabaseSync): void {
  db.exec(SCHEMA_SQL);
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
