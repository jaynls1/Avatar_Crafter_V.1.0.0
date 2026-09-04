import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { requireAuthorizationContext } from "./authorizationContext";

/** Ensures protected-route failures and their audit events share a request ID. */
export function requireEntitlement(organization: string, entitlementCode: string) {
  const authorize = requireAuthorizationContext(organization, entitlementCode);
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!res.getHeader("x-request-id")) {
      res.setHeader("x-request-id", crypto.randomUUID());
    }
    await authorize(req, res, next);
  };
}
