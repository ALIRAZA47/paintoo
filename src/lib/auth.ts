import { createHmac, timingSafeEqual } from "node:crypto";

export { COOKIE_NAME } from "./auth-edge";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 8) {
    throw new Error("AUTH_SECRET env var must be set (>=8 chars).");
  }
  return s;
}

export function getCreds(): { username: string; password: string } {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) {
    throw new Error("AUTH_USERNAME and AUTH_PASSWORD env vars must be set.");
  }
  return { username, password };
}

export function checkCreds(username: string, password: string): boolean {
  const c = getCreds();
  const a = Buffer.from(username);
  const b = Buffer.from(c.username);
  const p = Buffer.from(password);
  const q = Buffer.from(c.password);
  if (a.length !== b.length || p.length !== q.length) return false;
  return timingSafeEqual(a, b) && timingSafeEqual(p, q);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueToken(username: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${encodeURIComponent(username)}.${exp}`;
  const sig = sign(payload, getSecret());
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [user, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const payload = `${user}.${expStr}`;
  const expected = sign(payload, getSecret());
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
