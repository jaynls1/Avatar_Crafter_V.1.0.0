import crypto, { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { authenticateService } from "../lib/servicePrincipal";
import {
  canUseAdminPrivilege,
  CAPABILITIES,
  isNamedServicePrincipal,
} from "./routeAuthorization";
import { resolveClerkIdentity } from "./clerkAuth";

const requestId = (res: Response) => {
  const existing = res.getHeader("x-request-id");
  if (existing) return String(existing);
  const created = crypto.randomUUID();
  res.setHeader("x-request-id", created);
  return created;
};

function legacyKeyMatches(req: Request): boolean {
  if (process.env.ENABLE_LEGACY_OFFICE_ADMIN_KEY !== "true") return false;
  const expected = process.env.AVATAR_CRAFTER_ADMIN_KEY;
  if (!expected) return false;
  const provided = req.header("x-admin-key") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** DB-authenticated admins or named, active, server-authorized machine clients. */
export async function requireOfficeManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const identity = await resolveClerkIdentity(req);
  if (identity && canUseAdminPrivilege(req.dbUser ?? null)) {
    next();
    return;
  }

  const service = await authenticateService(req, CAPABILITIES.OFFICES_MANAGE);
  if (isNamedServicePrincipal(service) || legacyKeyMatches(req)) {
    next();
    return;
  }

  res.status(403).json({
    error: { code: "access_denied", requestId: requestId(res) },
  });
}
