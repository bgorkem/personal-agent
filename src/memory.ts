import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.AGENT_DB_PATH ?? "data/agent.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

/**
 * Schema:
 *   memories       — the actual rows: text + tags (JSON array as string) + created_at
 *   memories_fts   — FTS5 virtual table mirroring `text` and `tags` for keyword search
 *   triggers       — keep FTS in sync with the base table automatically
 *
 * Why FTS5 and not LIKE? Because LIKE '%coffee%' can't tell us that "espresso"
 * and "coffee" are related, can't rank by relevance, and scans the whole table.
 * FTS5 tokenises, stems (a bit), and ranks via BM25 for free.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    text        TEXT NOT NULL,
    tags        TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    text, tags,
    content='memories',
    content_rowid='id',
    tokenize='porter unicode61'
  );

  CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, text, tags) VALUES (new.id, new.text, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, text, tags) VALUES('delete', old.id, old.text, old.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, text, tags) VALUES('delete', old.id, old.text, old.tags);
    INSERT INTO memories_fts(rowid, text, tags) VALUES (new.id, new.text, new.tags);
  END;
`);

export type Memory = {
  id: number;
  text: string;
  tags: string[];
  created_at: string;
};

type Row = { id: number; text: string; tags: string; created_at: string };

const rowToMemory = (r: Row): Memory => ({
  id: r.id,
  text: r.text,
  tags: JSON.parse(r.tags),
  created_at: r.created_at,
});

export function saveMemory(text: string, tags: string[] = []): Memory {
  // Normalise tags: lowercase, trim, dedupe. Small thing, prevents the agent
  // from accidentally creating both "Work" and "work" as different categories.
  const normalised = [...new Set(tags.map((t) => t.toLowerCase().trim()).filter(Boolean))];

  const stmt = db.prepare(
    "INSERT INTO memories (text, tags) VALUES (?, ?) RETURNING *",
  );
  const row = stmt.get(text, JSON.stringify(normalised)) as Row;
  return rowToMemory(row);
}

export function searchMemories(query: string, limit = 5): Memory[] {
  // Tokenise the user/agent query into individual terms and OR them together.
  // Why not phrase-match the whole query? Because the agent often searches
  // things like "sports team" against a memory like "User is a Galatasaray
  // football fan" — no phrase match, but every term is searchable. We want
  // FTS5 to score by relevance, not require contiguous phrase matches.
  //
  // Strip FTS5 syntax characters defensively, then quote each term so any
  // remaining special chars are treated as literals.
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2) // drop 1-letter noise like "i", "a"
    .map((t) => `"${t}"`);

  if (terms.length === 0) return [];

  const ftsQuery = terms.join(" OR ");

  const stmt = db.prepare(`
    SELECT m.id, m.text, m.tags, m.created_at
    FROM memories_fts f
    JOIN memories m ON m.id = f.rowid
    WHERE memories_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `);

  try {
    const rows = stmt.all(ftsQuery, limit) as Row[];
    return rows.map(rowToMemory);
  } catch {
    return [];
  }
}

export function listRecentMemories(limit = 10): Memory[] {
  const stmt = db.prepare(
    "SELECT id, text, tags, created_at FROM memories ORDER BY created_at DESC LIMIT ?",
  );
  const rows = stmt.all(limit) as Row[];
  return rows.map(rowToMemory);
}

// Useful for debugging/development. Not exposed as a tool.
export function countMemories(): number {
  const row = db.prepare("SELECT COUNT(*) as n FROM memories").get() as { n: number };
  return row.n;
}