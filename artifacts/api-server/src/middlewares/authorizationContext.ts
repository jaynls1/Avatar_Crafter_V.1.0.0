import type { NextFunction, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import {
  db, entitlementStateTable, externalIdentitiesTable, membershipsTable,
  revocationStateTable,
} from "@workspace/db";
import { getSession, getSessionId } from "../lib/localSession";
import { securityAudit } from "../lib/audit";
import { isEffectivelyRevoked } from "../lib/identityCore";
import { resolveClerkIdentity } from "./clerkAuth";

export type AuthorizationContext = {
  userId: string;
  issuer: string;
  subject: string;
  qualifiedSubject: string;
  providerConnected: boolean;
  providerVersion: number;
  membershipVersion: number;
  entitlementVersion: number;
  allowed: boolean;
  reason?: "provider_disconnected" | "membership_inactive" | "not_entitled" | "revoked";
};

declare global {
  namespace Express {
    interface Request { authorizationContext?: AuthorizationContext }
  }
}

/** Resolves server state on every protected request; request input never grants access. */
export async function resolveAuthorizationContext(
  req: Request,
  organization: string,
  entitlementCode: string,
  correlationId?: string,
): Promise<AuthorizationContext | null> {
  const localSession = await getSession(getSessionId(req) ?? "");
  const sessionIdentity = (
    localSession?.identity_issuer && localSession.identity_subject
      ? {
          userId: localSession.user.id,
          issuer: localSession.identity_issuer,
          subject: localSession.identity_subject,
          issuedAt: localSession.created_at ?? 0,
          sessionVersion: localSession.session_version ?? 0,
        }
      : null
  ) ?? await resolveClerkIdentity(req);
  if (!sessionIdentity) return null;
  const [identity] = await db.select().from(externalIdentitiesTable)
    .where(and(
      eq(externalIdentitiesTable.issuer, sessionIdentity.issuer),
      eq(externalIdentitiesTable.subject, sessionIdentity.subject),
      eq(externalIdentitiesTable.userId, sessionIdentity.userId),
    ));
  if (!identity) return null;
  const qualifiedSubject = `${identity.issuer}|${identity.subject}`;
  const [[membership], [entitlement], [revocation]] = await Promise.all([
    db.select().from(membershipsTable).where(and(
      eq(membershipsTable.issuer, identity.issuer), eq(membershipsTable.subject, identity.subject),
      eq(membershipsTable.organization, organization),
    )),
    db.select().from(entitlementStateTable).where(and(
      eq(entitlementStateTable.issuer, identity.issuer),
      eq(entitlementStateTable.subject, identity.subject),
      eq(entitlementStateTable.code, entitlementCode),
    )),
    db.select().from(revocationStateTable).where(eq(revocationStateTable.subject, qualifiedSubject)),
  ]);
  const revoked = isEffectivelyRevoked(
    {
      createdAt: sessionIdentity.issuedAt,
      version: sessionIdentity.sessionVersion,
    },
    revocation ? {
      revokedBefore: revocation.revokedBefore ? Math.floor(revocation.revokedBefore.getTime() / 1000) : null,
      sessionVersion: revocation.sessionVersion,
    } : undefined,
  );
  const reason = !identity.providerConnected ? "provider_disconnected"
    : !membership?.active ? "membership_inactive"
    : !entitlement?.active ? "not_entitled"
    : revoked ? "revoked" : undefined;
  const context: AuthorizationContext = {
    userId: sessionIdentity.userId, issuer: identity.issuer, subject: identity.subject, qualifiedSubject,
    providerConnected: identity.providerConnected, providerVersion: identity.providerVersion,
    membershipVersion: membership?.version ?? 0, entitlementVersion: entitlement?.sequence ?? 0,
    allowed: !reason, reason,
  };
  void securityAudit({
    requestId: String(req.res?.getHeader("x-request-id") ?? "unknown"),
    event: "authorization.context", outcome: context.allowed ? "accepted" : "rejected",
    actor: qualifiedSubject, correlationId, detail: { issuer: identity.issuer, reason },
  });
  return context;
}

export function requireAuthorizationContext(organization: string, entitlementCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = await resolveAuthorizationContext(req, organization, entitlementCode, req.header("x-correlation-id") ?? undefined);
    if (!context?.allowed) {
      res.status(403).json({ error: { code: "access_denied", requestId: res.getHeader("x-request-id") } });
      return;
    }
    req.authorizationContext = context;
    next();
  };
}