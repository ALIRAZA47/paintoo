import { createClient, type Client, type InValue } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

/**
 * Connection URL.
 *   - production / shared dev: a Turso DB → `libsql://<db>-<org>.turso.io`
 *     plus `TURSO_AUTH_TOKEN`
 *   - local-only dev with no Turso account: defaults to a local file under
 *     ./data/paintoo.db (libsql falls back to its native SQLite for file: URLs)
 */
const TURSO_URL = process.env.TURSO_DATABASE_URL || "";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";
// Vercel sets VERCEL=1 in every runtime; same for Netlify/Cloudflare via their
// own flags. We refuse to fall back to a file URL on serverless because the
// filesystem is read-only and crashes will look like opaque "function did not
// return" errors in the platform's log.
const ON_SERVERLESS =
  !!process.env.VERCEL ||
  !!process.env.NETLIFY ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const DB_URL =
  TURSO_URL ||
  (ON_SERVERLESS
    ? ""
    : `file:${path.resolve(process.cwd(), "data", "paintoo.db")}`);

declare global {
  // eslint-disable-next-line no-var
  var __paintooDb: Client | undefined;
  // eslint-disable-next-line no-var
  var __paintooSchema: Promise<void> | undefined;
}

function ensureLocalDir(url: string) {
  // Only relevant for file: URLs.
  if (!url.startsWith("file:")) return;
  const filePath = url.slice("file:".length);
  const dir = path.dirname(filePath);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(
      `Could not create local SQLite directory ${dir}: ${(err as Error).message}. ` +
        `If you're running on a read-only host (Vercel, Lambda, etc.), set ` +
        `TURSO_DATABASE_URL + TURSO_AUTH_TOKEN instead of falling back to a file.`,
    );
  }
}

function open(): Client {
  if (!global.__paintooDb) {
    if (!DB_URL) {
      throw new Error(
        "Database is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN " +
          "(see .env.example).",
      );
    }
    ensureLocalDir(DB_URL);
    global.__paintooDb = createClient({
      url: DB_URL,
      ...(TURSO_TOKEN ? { authToken: TURSO_TOKEN } : {}),
    });
  }
  return global.__paintooDb;
}

async function ensureSchema(client: Client) {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS designs (
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
       )`,
      `CREATE INDEX IF NOT EXISTS idx_designs_updated_at ON designs (updated_at DESC)`,
    ],
    "write",
  );
}

async function getClient(): Promise<Client> {
  const c = open();
  if (!global.__paintooSchema) global.__paintooSchema = ensureSchema(c);
  await global.__paintooSchema;
  return c;
}

/* ────────────────────────────────────────── types ─── */

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

// libsql returns columns as bigints for INTEGER. We coerce to number where the
// value fits, since IDs and timestamps are well within Number.MAX_SAFE_INTEGER.
function toNum(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return Number(v as number);
}
function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}
function toNullStr(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}

function toSummary(r: Record<string, unknown>): DesignSummary {
  return {
    id: toNum(r.id),
    name: toStr(r.name),
    width: toNum(r.width),
    height: toNum(r.height),
    thumbnail: toNullStr(r.thumbnail),
    created_at: toNum(r.created_at),
    updated_at: toNum(r.updated_at),
  };
}
function toRow(r: Record<string, unknown>): DesignRow {
  return {
    id: toNum(r.id),
    name: toStr(r.name),
    width: toNum(r.width),
    height: toNum(r.height),
    bg: toStr(r.bg),
    thumbnail: toNullStr(r.thumbnail),
    layers: toStr(r.layers ?? "[]"),
    palette: toNullStr(r.palette),
    created_at: toNum(r.created_at),
    updated_at: toNum(r.updated_at),
  };
}

/* ────────────────────────────────────────── CRUD ─── */

export async function listDesigns(): Promise<DesignSummary[]> {
  const c = await getClient();
  const result = await c.execute(
    `SELECT id, name, width, height, thumbnail, created_at, updated_at
       FROM designs ORDER BY updated_at DESC`,
  );
  return result.rows.map((r) => toSummary(r as unknown as Record<string, unknown>));
}

export async function getDesign(id: number): Promise<DesignRow | undefined> {
  const c = await getClient();
  const result = await c.execute({
    sql: `SELECT * FROM designs WHERE id = ?`,
    args: [id as InValue],
  });
  const row = result.rows[0];
  return row ? toRow(row as unknown as Record<string, unknown>) : undefined;
}

export async function createDesign(input: {
  name: string;
  width: number;
  height: number;
  bg: string;
  layers: string;
  thumbnail?: string | null;
  palette?: string | null;
}): Promise<DesignRow> {
  const c = await getClient();
  const now = Date.now();
  const result = await c.execute({
    sql: `INSERT INTO designs (name, width, height, bg, thumbnail, layers, palette, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.name,
      input.width,
      input.height,
      input.bg,
      input.thumbnail ?? null,
      input.layers,
      input.palette ?? null,
      now,
      now,
    ] as InValue[],
  });
  const id = Number(result.lastInsertRowid ?? 0);
  return (await getDesign(id))!;
}

export async function updateDesign(
  id: number,
  patch: Partial<{
    name: string;
    thumbnail: string | null;
    layers: string;
    palette: string | null;
  }>,
): Promise<DesignRow | undefined> {
  const c = await getClient();
  const existing = await getDesign(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch, updated_at: Date.now() };
  await c.execute({
    sql: `UPDATE designs SET name=?, thumbnail=?, layers=?, palette=?, updated_at=? WHERE id=?`,
    args: [
      merged.name,
      merged.thumbnail,
      merged.layers,
      merged.palette,
      merged.updated_at,
      id,
    ] as InValue[],
  });
  return getDesign(id);
}

export async function deleteDesign(id: number): Promise<boolean> {
  const c = await getClient();
  const result = await c.execute({
    sql: `DELETE FROM designs WHERE id = ?`,
    args: [id as InValue],
  });
  return result.rowsAffected > 0;
}
