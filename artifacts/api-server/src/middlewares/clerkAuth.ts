import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db, externalIdentitiesTable, usersTable, type User } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

type ClerkClaims = {
  userId?: string;
  iss?: string;
  sub?: string;
  sessionVersion?: number;
};

export type ClerkIdentity = {
  userId: string;
  issuer: string;
  subject: string;
  issuedAt: number;
  sessionVersion: number;
};

export const DEFAULT_LEGACY_OIDC_ISSUER = "https://replit.com/oidc";

/**
 * This is intentionally independent from Clerk's `iss`: migrated
 * authorization state was keyed by the former OIDC issuer.
 */
export function legacyOidcIssuer(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  return env.REPLIT_LEGACY_ISSUER_URL
    || env.ISSUER_URL
    || DEFAULT_LEGACY_OIDC_ISSUER;
}

export async function resolveClerkAuthorizationTuple(
  userId: string,
  clerkIssuer: string,
  clerkSubject: string,
): Promise<{ issuer: string; subject: string }> {
  const legacyIssuer = legacyOidcIssuer();
  const [legacyIdentity] = await db
    .select({
      issuer: externalIdentitiesTable.issuer,
      subject: externalIdentitiesTable.subject,
    })
    .from(externalIdentitiesTable)
    .where(and(
      eq(externalIdentitiesTable.issuer, legacyIssuer),
      eq(externalIdentitiesTable.subject, userId),
      eq(externalIdentitiesTable.userId, userId),
    ))
    .limit(1);
  return legacyIdentity ?? { issuer: clerkIssuer, subject: clerkSubject };
}

export async function resolveClerkIdentity(
  req: Request,
): Promise<ClerkIdentity | null> {
  if (typeof (req as Request & { auth?: unknown }).auth !== "function") {
    return null;
  }
  const auth = getAuth(req);
  const claims = auth.sessionClaims as (ClerkClaims & { iat?: number }) | null;
  const userId = claims?.userId || auth.userId;
  if (!auth.userId || !userId || !claims?.iss) return null;

  let [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!dbUser) {
    const [inserted] = await db
      .insert(usersTable)
      .values({ id: userId })
      .onConflictDoNothing()
      .returning();
    dbUser = inserted;
    if (!dbUser) {
      [dbUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
    }
  }
  if (!dbUser) throw new Error("Unable to provision local user");

  const subject = claims.sub || auth.userId;
  await db
    .insert(externalIdentitiesTable)
    .values({
      issuer: claims.iss,
      subject,
      userId: dbUser.id,
      providerConnected: true,
      providerVersion: 1,
      lastSeenAt: new Date(),
    })
    .onConflictDoNothing();

  const [identity] = await db
    .select()
    .from(externalIdentitiesTable)
    .where(and(
      eq(externalIdentitiesTable.issuer, claims.iss),
      eq(externalIdentitiesTable.subject, subject),
      eq(externalIdentitiesTable.userId, dbUser.id),
    ))
    .limit(1);
  if (!identity) throw new Error("Clerk identity is linked to another local user");

  const authorizationIdentity = await resolveClerkAuthorizationTuple(
    dbUser.id,
    claims.iss,
    subject,
  );
  req.dbUser = dbUser;
  return {
    userId: dbUser.id,
    issuer: authorizationIdentity.issuer,
    subject: authorizationIdentity.subject,
    issuedAt: claims.iat ?? 0,
    sessionVersion: claims.sessionVersion ?? 1,
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let identity: ClerkIdentity | null;
  try {
    identity = await resolveClerkIdentity(req);
  } catch {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (!identity) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}