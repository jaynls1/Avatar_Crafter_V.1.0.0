import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const windows = new Map<string, { count: number; reset: number }>();

export function integrationSecurity(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const current = windows.get(key);
  const bucket = !current || current.reset <= now ? { count: 1, reset: now + 60_000 } : current;
  if (current && current.reset > now) bucket.count++;
  windows.set(key, bucket);
  if (bucket.count > 30) {
    res.status(429).json({ error: { code: "rate_limited", requestId } });
    return;
  }
  const origin = req.header("origin");
  if (origin) {
    const configured = (process.env.NEXT_ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);
    const forwarded = req.header("x-forwarded-host") ?? req.header("host");
    const ownOrigin = forwarded ? `${req.header("x-forwarded-proto") ?? "https"}://${forwarded}` : "";
    if (origin !== ownOrigin && !configured.includes(origin)) {
      res.status(403).json({ error: { code: "origin_rejected", requestId } });
      return;
    }
  }
  const sidCookie = req.cookies?.sid;
  const csrfHeader = req.header("x-csrf-token");
  const csrfCookie = req.cookies?.next_csrf;
  if (sidCookie && (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie)) {
    res.status(403).json({ error: { code: "csrf_rejected", requestId } });
    return;
  }
  next();
}
