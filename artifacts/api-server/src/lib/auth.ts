import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";
import {
  db,
  localSessionsTable,
  providerTokensTable,
  sessionFamiliesTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";
import { legacySessionCompatibility } from "./oidcBoundary";

export const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  /** Internal authorization metadata; never serialized in browser responses. */
  created_at?: number;
  session_version?: number;
}

let oidcConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID!,
    );
  }
  return oidcConfig;
}

export async function createSession(data: SessionData): Promise<string> {
  return createLocalSession(data.user, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined,
    provider: "replit",
  });
}

const hashSecret = (secret: string) =>
  crypto.createHash("sha256").update(secret).digest("hex");

function parseLocalToken(token: string) {
  const separator = token.indexOf(".");
  if (separator < 1) return null;
  return { id: token.slice(0, separator), secret: token.slice(separator + 1) };
}

export async function createLocalSession(
  user: AuthUser,
  provider?: {
    provider: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  },
  familyId?: string,
): Promise<string> {
  const secret = crypto.randomBytes(32).toString("base64url");
  return db.transaction(async (tx) => {
    let family: { id: string; version: number };
    if (familyId) {
      const [existing] = await tx.select().from(sessionFamiliesTable).where(
        and(eq(sessionFamiliesTable.id, familyId), isNull(sessionFamiliesTable.revokedAt)),
      );
      if (!existing) throw new Error("Session family is revoked");
      family = existing;
    } else {
      [family] = await tx.insert(sessionFamiliesTable).values({ userId: user.id }).returning();
    }
    const [session] = await tx.insert(localSessionsTable).values({
      secretHash: hashSecret(secret),
      familyId: family.id,
      familyVersion: family.version,
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL),
    }).returning();
    if (provider && (provider.accessToken || provider.refreshToken)) {
      await tx.insert(providerTokensTable).values({
        sessionId: session.id,
        provider: provider.provider,
        accessToken: provider.accessToken,
        refreshToken: provider.refreshToken,
        expiresAt: provider.expiresAt,
      });
    }
    return `${session.id}.${secret}`;
  });
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const local = parseLocalToken(sid);
  if (local) {
    const [row] = await db
      .select({ session: localSessionsTable, family: sessionFamiliesTable, user: usersTable })
      .from(localSessionsTable)
      .innerJoin(sessionFamiliesTable, eq(localSessionsTable.familyId, sessionFamiliesTable.id))
      .innerJoin(usersTable, eq(localSessionsTable.userId, usersTable.id))
      .where(and(
        eq(localSessionsTable.id, local.id),
        eq(localSessionsTable.secretHash, hashSecret(local.secret)),
      ));
    if (
      !row ||
      row.session.expiresAt < new Date() ||
      row.session.revokedAt ||
      row.family.revokedAt ||
      row.session.familyVersion !== row.family.version
    ) return null;
    const [tokens] = await db.select().from(providerTokensTable)
      .where(eq(providerTokensTable.sessionId, row.session.id));
    return {
      user: {
        id: row.user.id,
        email: row.user.email,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        profileImageUrl: row.user.profileImageUrl,
        isAdmin: row.user.isAdmin,
      },
      access_token: tokens?.accessToken ?? undefined,
      refresh_token: tokens?.refreshToken ?? undefined,
      expires_at: tokens?.expiresAt
        ? Math.floor(tokens.expiresAt.getTime() / 1000)
        : undefined,
      created_at: Math.floor(row.session.createdAt.getTime() / 1000),
      session_version: row.session.version,
    };
  }
  // Compatibility path for sessions issued before local-session migration.
  if (!legacySessionCompatibility()) {
    return null;
  }
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  const local = parseLocalToken(sid);
  if (local) {
    const [session] = await db.select().from(localSessionsTable).where(and(
      eq(localSessionsTable.id, local.id),
      eq(localSessionsTable.secretHash, hashSecret(local.secret)),
    ));
    if (!session) return;
    await db.update(providerTokensTable).set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : null,
      updatedAt: new Date(),
    }).where(eq(providerTokensTable.sessionId, session.id));
    return;
  }
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
  const local = parseLocalToken(sid);
  if (local) {
    await db.update(localSessionsTable).set({ revokedAt: new Date() }).where(and(
      eq(localSessionsTable.id, local.id),
      eq(localSessionsTable.secretHash, hashSecret(local.secret)),
    ));
    return;
  }
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function rotateSession(sid: string): Promise<string | null> {
  const local = parseLocalToken(sid);
  if (!local) return null;
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ session: localSessionsTable, family: sessionFamiliesTable })
      .from(localSessionsTable)
      .innerJoin(sessionFamiliesTable, eq(localSessionsTable.familyId, sessionFamiliesTable.id))
      .where(and(eq(localSessionsTable.id, local.id), eq(localSessionsTable.secretHash, hashSecret(local.secret))));
    if (!row || row.family.revokedAt || row.session.familyVersion !== row.family.version) return null;
    // The conditional write is the compare-and-set: exactly one concurrent
    // rotation can receive a row, and its successor is created in this txn.
    const [rotated] = await tx.update(localSessionsTable)
      .set({ rotatedAt: new Date(), revokedAt: new Date() })
      .where(and(eq(localSessionsTable.id, row.session.id), isNull(localSessionsTable.revokedAt)))
      .returning();
    if (!rotated) return null;
    const nextSecret = crypto.randomBytes(32).toString("base64url");
    const [next] = await tx.insert(localSessionsTable).values({
      secretHash: hashSecret(nextSecret), familyId: row.session.familyId,
      familyVersion: row.session.familyVersion, userId: row.session.userId,
      expiresAt: new Date(Date.now() + SESSION_TTL),
    }).returning();
    const [provider] = await tx.select().from(providerTokensTable)
      .where(eq(providerTokensTable.sessionId, row.session.id));
    if (provider) await tx.insert(providerTokensTable).values({
      sessionId: next.id, provider: provider.provider, accessToken: provider.accessToken,
      refreshToken: provider.refreshToken, expiresAt: provider.expiresAt,
    });
    return `${next.id}.${nextSecret}`;
  });
}

export async function revokeAllSessions(userId: string, reason = "logout_all"): Promise<void> {
  await db.update(sessionFamiliesTable).set({
    revokedAt: new Date(),
    revokeReason: reason.slice(0, 128),
    version: sql`${sessionFamiliesTable.version} + 1`,
    updatedAt: new Date(),
  }).where(eq(sessionFamiliesTable.userId, userId));
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}
