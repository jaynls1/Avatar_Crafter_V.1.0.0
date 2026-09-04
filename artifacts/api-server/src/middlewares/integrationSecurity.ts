import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import {
  integrationRateLimitRepository,
  loadRateLimitConfiguration,
  rateLimitKeyHash,
  type RateLimitRepository,
} from "../lib/integrationRateLimit";
import { allowedCorsOrigins } from "../lib/corsPolicy";
import { verifyCsrfToken } from "../lib/csrf";

type IntegrationSecurityDependencies = {
  repository: RateLimitRepository;
  configuration: () => ReturnType<typeof loadRateLimitConfiguration>;
  now: () => number;
};

function reject(
  res: Response,
  status: number,
  code: string,
  requestId: string,
) {
  res.status(status).json({ error: { code, requestId } });
}

export function createIntegrationSecurity(
  dependencies: IntegrationSecurityDependencies = {
    repository: integrationRateLimitRepository,
    configuration: () => loadRateLimitConfiguration(),
    now: Date.now,
  },
) {
  return async function integrationSecurity(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
  const requestId = req.header("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  res.setHeader("x-request-id", requestId);

  const origin = req.header("origin");
  if (origin && !allowedCorsOrigins().has(origin)) {
      reject(res, 403, "origin_rejected", requestId);
      return;
  }
  const sidCookie = req.cookies?.sid;
  const csrfHeader = req.header("x-csrf-token");
  const csrfCookie = req.cookies?.next_csrf;
  const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (
    unsafeMethod &&
    sidCookie &&
    (!csrfHeader ||
      !csrfCookie ||
      csrfHeader !== csrfCookie ||
      !verifyCsrfToken(sidCookie, csrfHeader))
  ) {
    reject(res, 403, "csrf_rejected", requestId);
    return;
  }

    const configuration = dependencies.configuration();
    if (configuration.state === "disabled") {
      next();
      return;
    }
    if (configuration.state === "invalid") {
      reject(res, 503, "rate_limiter_unavailable", requestId);
      return;
    }

    try {
      const clientAddress = req.socket.remoteAddress ?? "unknown";
      const scope = req.path.slice(0, 128);
      const keyHash = rateLimitKeyHash(
        configuration.hashKey,
        `${clientAddress}\n${scope}`,
      );
      const decision = await dependencies.repository.consume({
        scope,
        keyHash,
        limit: configuration.limit,
        windowSeconds: configuration.windowSeconds,
      });
      if (!decision.allowed) {
        const retryAfter = Math.max(
          1,
          Math.ceil((decision.resetAt.getTime() - dependencies.now()) / 1000),
        );
        res.setHeader("retry-after", String(retryAfter));
        reject(res, 429, "rate_limited", requestId);
        return;
      }
      next();
    } catch {
      reject(res, 503, "rate_limiter_unavailable", requestId);
    }
  };
}

export const integrationSecurity = createIntegrationSecurity();
