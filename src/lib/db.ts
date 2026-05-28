import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "paintoo.db");

declare global {
  // eslint-disable-next-line no-var
  var __paintooDb: Database.Database | undefined;
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function open(): Database.Database {
  ensureDir(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      bg TEXT NOT NULL DEFAULT 'transparent',
      thumbnail TEXT,
      layers TEXT NOT NULL DEFAULT '[]',
      palette TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_designs_updated_at ON designs (updated_at DESC);
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__paintooDb) {
    global.__paintooDb = open();
  }
  return global.__paintooDb;
}

export type DesignRow = {
  id: number;
  name: string;
  width: number;
  height: number;
  bg: string;
  thumbnail: string | null;
  layers: string;
  palette: string | null;
  created_at: number;
  updated_at: number;
};

export type DesignSummary = {
  id: number;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  created_at: number;
  updated_at: number;
};

export function listDesigns(): DesignSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, width, height, thumbnail, created_at, updated_at
       FROM designs ORDER BY updated_at DESC`,
    )
    .all() as DesignSummary[];
  return rows;
}

export function getDesign(id: number): DesignRow | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM designs WHERE id = ?`).get(id) as DesignRow | undefined;
}

export function createDesign(input: {
  name: string;
  width: number;
  height: number;
  bg: string;
  layers: string;
  thumbnail?: string | null;
  palette?: string | null;
}): DesignRow {
  const db = getDb();
  const now = Date.now();
  const info = db
    .prepare(
      `INSERT INTO designs (name, width, height, bg, thumbnail, layers, palette, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.width,
      input.height,
      input.bg,
      input.thumbnail ?? null,
      input.layers,
      input.palette ?? null,
      now,
      now,
    );
  return getDesign(Number(info.lastInsertRowid))!;
}

export function updateDesign(
  id: number,
  patch: Partial<{
    name: string;
    thumbnail: string | null;
    layers: string;
    palette: string | null;
  }>,
): DesignRow | undefined {
  const db = getDb();
  const existing = getDesign(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch, updated_at: Date.now() };
  db.prepare(
    `UPDATE designs SET name=?, thumbnail=?, layers=?, palette=?, updated_at=? WHERE id=?`,
  ).run(merged.name, merged.thumbnail, merged.layers, merged.palette, merged.updated_at, id);
  return getDesign(id);
}

export function deleteDesign(id: number): boolean {
  const db = getDb();
  const info = db.prepare(`DELETE FROM designs WHERE id = ?`).run(id);
  return info.changes > 0;
}
