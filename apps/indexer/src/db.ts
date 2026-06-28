// SQLite persistent storage (better-sqlite3, synchronous).
import Database from "better-sqlite3";
import { config } from "./config.js";

export interface StoredEvent {
  id: string;
  contract: string;
  kind: string;
  ledger: number;
  ts: string;
  tx_hash: string | null;
  topics: unknown[]; // decode + JSON-safe
  value: unknown;
}

const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id       TEXT PRIMARY KEY,
    contract TEXT NOT NULL,
    kind     TEXT NOT NULL,
    ledger   INTEGER NOT NULL,
    ts       TEXT NOT NULL,
    tx_hash  TEXT,
    topics   TEXT NOT NULL,
    value    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);
  CREATE INDEX IF NOT EXISTS idx_events_ledger ON events(ledger);
  CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract);
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`);

const _insert = db.prepare(`
  INSERT OR IGNORE INTO events (id, contract, kind, ledger, ts, tx_hash, topics, value)
  VALUES (@id, @contract, @kind, @ledger, @ts, @tx_hash, @topics, @value)
`);

/** Batch insert (transaction). Returns: number of newly inserted rows. */
export const insertBatch = db.transaction(
  (
    rows: {
      id: string;
      contract: string;
      kind: string;
      ledger: number;
      ts: string;
      tx_hash: string | null;
      topics: unknown[];
      value: unknown;
    }[]
  ): number => {
    let added = 0;
    for (const r of rows) {
      const res = _insert.run({
        id: r.id,
        contract: r.contract,
        kind: r.kind,
        ledger: r.ledger,
        ts: r.ts,
        tx_hash: r.tx_hash,
        topics: JSON.stringify(r.topics),
        value: JSON.stringify(r.value),
      });
      added += res.changes;
    }
    return added;
  }
);

export function getCursor(): string | null {
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'cursor'`).get() as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setCursor(cursor: string): void {
  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('cursor', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(cursor);
}

function rowToEvent(r: Record<string, unknown>): StoredEvent {
  return {
    id: r.id as string,
    contract: r.contract as string,
    kind: r.kind as string,
    ledger: r.ledger as number,
    ts: r.ts as string,
    tx_hash: (r.tx_hash as string) ?? null,
    topics: JSON.parse(r.topics as string),
    value: JSON.parse(r.value as string),
  };
}

export interface EventQuery {
  contract?: string;
  kind?: string;
  address?: string; // address appearing in topics/value
  limit?: number;
}

export function queryEvents(q: EventQuery): StoredEvent[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.contract) {
    where.push("contract = ?");
    params.push(q.contract);
  }
  if (q.kind) {
    where.push("kind = ?");
    params.push(q.kind);
  }
  if (q.address) {
    where.push("(topics LIKE ? OR value LIKE ?)");
    params.push(`%${q.address}%`, `%${q.address}%`);
  }
  const limit = Math.min(Math.max(q.limit ?? 100, 1), 1000);
  const sql = `SELECT * FROM events ${
    where.length ? "WHERE " + where.join(" AND ") : ""
  } ORDER BY ledger DESC, id DESC LIMIT ?`;
  const rows = db.prepare(sql).all(...params, limit) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function allEvents(): StoredEvent[] {
  const rows = db
    .prepare(`SELECT * FROM events ORDER BY ledger ASC, id ASC`)
    .all() as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function stats(): { count: number; maxLedger: number } {
  const row = db
    .prepare(`SELECT COUNT(*) AS count, COALESCE(MAX(ledger),0) AS maxLedger FROM events`)
    .get() as { count: number; maxLedger: number };
  return row;
}
