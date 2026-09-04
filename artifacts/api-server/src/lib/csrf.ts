import crypto from "node:crypto";
import type { Response } from "express";

export const CSRF_COOKIE = "next_csrf";
const CSRF_TTL = 7 * 24 * 60 * 60 * 1000;

function csrfSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function signature(sid: string, nonce: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${sid.length}:${sid}:${nonce}`)
    .digest("base64url");
}

export function createCsrfToken(sid: string): string {
  const secret = csrfSecret();
  if (!secret) throw new Error("csrf_configuration_unavailable");
  const nonce = crypto.randomBytes(32).toString("base64url");
  return `${nonce}.${signature(sid, nonce, secret)}`;
}

export function verifyCsrfToken(sid: string, token: string): boolean {
  const secret = csrfSecret();
  if (!secret) return false;
  const separator = token.indexOf(".");
  if (separator < 1 || separator === token.length - 1) return false;
  const nonce = token.slice(0, separator);
  const received = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(signature(sid, nonce, secret));
  return received.length === expected.length &&
    crypto.timingSafeEqual(received, expected);
}

export function issueCsrfCookie(res: Response, sid: string): string {
  const token = createCsrfToken(sid);
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/api/next",
    maxAge: CSRF_TTL,
  });
  return token;
}

export function clearCsrfCookie(res: Response) {
  res.clearCookie(CSRF_COOKIE, { path: "/api/next" });
}