import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  db,
  entitlementStateTable,
  externalIdentitiesTable,
  identityHandoffsTable,
  integrationEventsTable,
  sessionFamiliesTable,
  revocationStateTable,
  usersTable,
} from "@workspace/db";
import { AssertionError, verifyIdentityAssertion } from "../lib/assertions";
import { securityAudit } from "../lib/audit";
import { createLocalSession } from "../lib/auth";
import { integrationSecurity } from "../middlewares/integrationSecurity";
import {
  adapterEnabled, eventClaimsMatch, validateDestinationRegistry,
  identityTransactionCookie, readIdentityTransactionCookie,
} from "../lib/identityCore";
import { authenticateService } from "../lib/servicePrincipal";
import { issueCsrfCookie } from "../lib/csrf";

const router: IRouter = Router();
const startSchema = z.object({
  destination: z.string().min(1).max(128),
});
const completeSchema = z.object({
  transaction: z.string().min(32).max(512),
  assertion: z.string().min(32).max(32_000),
});
const finishSchema = z.object({
}).strict();
const eventSchema = z.object({
  assertion: z.string().min(32).max(32_000),
  nonce: z.string().min(16).max(256),
  event: z.object({
    id: z.string().min(1).max(512),
    subject: z.string().min(1).max(512),
    sequence: z.number().int().nonnegative(),
    correlation_id: z.string().max(256).optional(),
    occurred_at: z.string().datetime(),
    data: z.record(z.string(), z.unknown()),
  }),
});

const requestId = (res: Response) => String(res.getHeader("x-request-id"));
const secretHash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const transactionCookie = "next_identity_tx";
const IDENTITY_AUDIENCE = "avatar-crafter";
type Destination = { returnTo: string; authorizeUrl?: string };
function destinations(): Record<string, Destination> {
  try {
    const value = JSON.parse(process.env.NEXT_IDENTITY_DESTINATIONS ?? '{"avatar":{"returnTo":"/"}}') as Record<string, Destination>;
    return validateDestinationRegistry(value);
  } catch { return {}; }
}

function unavailable(res: Response) {
  res.status(404).json({ error: { code: "not_found", requestId: requestId(res) } });
}

function failure(req: Request, res: Response, error: unknown) {
  const code = error instanceof AssertionError ? "invalid_assertion" : "invalid_request";
  void securityAudit({
    requestId: requestId(res), event: "integration.decision", outcome: "rejected",
    correlationId: req.header("x-correlation-id") ?? undefined,
  });
  res.status(error instanceof AssertionError ? 401 : 400)
    .json({ error: { code, requestId: requestId(res) } });
}

router.use("/next", integrationSecurity);

router.get("/next/csrf/v1", (req, res) => {
  const sid = req.cookies?.sid;
  if (!sid || !req.isAuthenticated()) {
    res.status(401).json({
      error: { code: "authentication_required", requestId: requestId(res) },
    });
    return;
  }
  try {
    issueCsrfCookie(res, sid);
    res.sendStatus(204);
  } catch {
    res.status(503).json({
      error: { code: "csrf_unavailable", requestId: requestId(res) },
    });
  }
});

router.post("/next/identity/v1/start", async (req, res) => {
  if (!adapterEnabled("identity")) return unavailable(res);
  try {
    const body = startSchema.parse(req.body);
    const target = destinations()[body.destination];
    if (!target) throw new AssertionError("invalid_destination");
    const transaction = crypto.randomBytes(32).toString("base64url");
    const nonce = crypto.randomBytes(24).toString("base64url");
    const state = crypto.randomBytes(24).toString("base64url");
    await db.insert(identityHandoffsTable).values({
      secretHash: secretHash(transaction),
      issuer: "pending",
      subject: "pending",
      destination: body.destination,
      nonceHash: secretHash(nonce),
      stateHash: secretHash(state),
      claims: {},
      returnToKey: body.destination,
      expiresAt: new Date(Date.now() + 120_000),
    });
    res.cookie(transactionCookie, identityTransactionCookie(transaction, state), {
      httpOnly: true, secure: true, sameSite: "lax", path: "/api/next/identity/v1", maxAge: 120_000,
    });
    await securityAudit({ requestId: requestId(res), event: "identity.start", outcome: "accepted", detail: { destination: body.destination } });
    if (!target.authorizeUrl) throw new AssertionError("missing_authorize_url");
    const url = new URL(target.authorizeUrl, "https://relative.invalid");
    url.searchParams.set("transaction", transaction);
    url.searchParams.set("nonce", nonce);
    // The browser receives only the registered source URL and non-identity
    // correlation material; state remains HttpOnly and never enters JS.
    res.status(201).json({
      authorize_url: target.authorizeUrl.startsWith("/")
        ? `${url.pathname}${url.search}${url.hash}`
        : url.href,
      request_id: requestId(res),
    });
  } catch (error) {
    failure(req, res, error);
  }
});

router.post("/next/identity/v1/complete", async (req, res) => {
  if (!adapterEnabled("identity")) return unavailable(res);
  try {
    if (!await authenticateService(req, "identity.complete")) throw new AssertionError("unauthenticated_service");
    const body = completeSchema.parse(req.body);
    const [handoff] = await db.select().from(identityHandoffsTable)
      .where(and(eq(identityHandoffsTable.secretHash, secretHash(body.transaction)), isNull(identityHandoffsTable.completedAt), gt(identityHandoffsTable.expiresAt, new Date())));
    if (!handoff) throw new AssertionError("invalid_handoff");
    const claims = verifyIdentityAssertion(body.assertion, {
      audience: IDENTITY_AUDIENCE,
      destination: `next.identity.v1:${handoff.destination}`,
      // The browser nonce is stored only as a hash; its hash is compared below.
    });
    if (secretHash(claims.nonce) !== handoff.nonceHash || !claims.jti) throw new AssertionError("invalid_nonce");
    await db.transaction(async (tx) => {
      const [claimed] = await tx.update(identityHandoffsTable).set({
        issuer: claims.iss,
        subject: claims.sub,
        assertionId: claims.jti,
        completedAt: new Date(),
      }).where(and(
        eq(identityHandoffsTable.id, handoff.id),
        isNull(identityHandoffsTable.completedAt),
        gt(identityHandoffsTable.expiresAt, new Date()),
      )).returning();
      if (!claimed) throw new AssertionError("invalid_handoff");

      await tx.execute(sql`SELECT pg_advisory_xact_lock(
        hashtext(${claims.iss}),
        hashtext(${claims.sub})
      )`);
      let [identity] = await tx.select().from(externalIdentitiesTable).where(and(
        eq(externalIdentitiesTable.issuer, claims.iss), eq(externalIdentitiesTable.subject, claims.sub),
      ));
      if (!identity) {
        const userId = crypto.randomUUID();
        await tx.insert(usersTable).values({ id: userId });
        [identity] = await tx.insert(externalIdentitiesTable).values({
          issuer: claims.iss, subject: claims.sub, userId,
        }).returning();
      }
      await tx.update(identityHandoffsTable)
        .set({ userId: identity.userId })
        .where(eq(identityHandoffsTable.id, claimed.id));
    });
    await securityAudit({ requestId: requestId(res), event: "identity.complete", outcome: "accepted", actor: `${claims.iss}:${claims.sub}`, detail: { issuer: claims.iss } });
    res.status(202).json({ accepted: true, request_id: requestId(res) });
  } catch (error) {
    failure(req, res, error);
  }
});

router.post("/next/identity/v1/finish", async (req, res) => {
  if (!adapterEnabled("identity")) return unavailable(res);
  try {
    finishSchema.parse(req.body);
    const cookie = readIdentityTransactionCookie(req.cookies?.[transactionCookie]);
    if (!cookie) throw new AssertionError("missing_transaction_cookie");
    const [handoff] = await db.update(identityHandoffsTable).set({ consumedAt: new Date() }).where(and(
      eq(identityHandoffsTable.secretHash, secretHash(cookie.transaction)), eq(identityHandoffsTable.stateHash, secretHash(cookie.state)),
      isNull(identityHandoffsTable.consumedAt), sql`${identityHandoffsTable.completedAt} IS NOT NULL`, gt(identityHandoffsTable.expiresAt, new Date()),
    )).returning();
    if (!handoff?.userId || !destinations()[handoff.returnToKey]) throw new AssertionError("invalid_handoff");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, handoff.userId));
    if (!user) throw new AssertionError("invalid_handoff");
    const sid = await createLocalSession(
      {
        id: user.id,
        email: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        isAdmin: false,
      },
      undefined,
      undefined,
      { issuer: handoff.issuer, subject: handoff.subject },
    );
    res.cookie("sid", sid, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 604800000 });
    issueCsrfCookie(res, sid);
    res.clearCookie(transactionCookie, { path: "/api/next/identity/v1" });
    await securityAudit({ requestId: requestId(res), event: "identity.finish", outcome: "accepted", detail: { destination: handoff.destination } });
    res.redirect(destinations()[handoff.returnToKey].returnTo);
  } catch (error) { failure(req, res, error); }
});

async function consumeEvent(
  adapter: "entitlement" | "revocation",
  adapterName: "entitlement" | "revocation",
  req: Request,
  res: Response,
) {
  if (!adapterEnabled(adapterName)) return unavailable(res);
  try {
    const body = eventSchema.parse(req.body);
    const destination = `next.${adapter}.v1`;
    const claims = verifyIdentityAssertion(body.assertion, {
      audience: IDENTITY_AUDIENCE,
      destination,
      nonce: body.nonce,
    });
    const qualifiedSubject = `${claims.iss}|${claims.sub}`;
    if (!eventClaimsMatch(claims, body.event)) throw new AssertionError("event_body_mismatch");
    const subscriptions = (process.env.NEXT_EVENT_SUBSCRIPTIONS ?? "").split(",").filter(Boolean);
    if (!subscriptions.includes(qualifiedSubject)) {
      res.status(202).json({ accepted: false, reason: "not_subscribed", request_id: requestId(res) });
      return;
    }
    const occurredAt = new Date(body.event.occurred_at);
    const accepted = await db.transaction(async (tx) => {
      const inserted = await tx.insert(integrationEventsTable).values({
        adapter, issuer: claims.iss, eventId: body.event.id, subject: qualifiedSubject,
        sequence: body.event.sequence, correlationId: body.event.correlation_id,
      }).onConflictDoNothing().returning();
      if (!inserted.length) return false;
      if (adapter === "entitlement") {
        const data = z.object({
          active: z.boolean(),
          code: z.string().regex(/^[a-z0-9][a-z0-9:_-]{0,255}$/i),
        })
          .parse(body.event.data);
        await tx.insert(entitlementStateTable).values({
          issuer: claims.iss, subject: claims.sub, code: data.code, active: data.active,
          sequence: body.event.sequence, sourceUpdatedAt: occurredAt,
        }).onConflictDoUpdate({
          target: [entitlementStateTable.issuer, entitlementStateTable.subject, entitlementStateTable.code],
          set: {
            active: data.active, sequence: body.event.sequence,
            sourceUpdatedAt: occurredAt, updatedAt: new Date(),
          },
          setWhere: sql`${entitlementStateTable.sequence} < ${body.event.sequence}`,
        });
      } else {
        const data = z.object({
          revoked_before: z.string().datetime().nullable().optional(),
          session_version: z.number().int().nonnegative().nullable().optional(),
          reason: z.string().max(128).optional(),
        }).parse(body.event.data);
        await tx.insert(revocationStateTable).values({
          subject: qualifiedSubject,
          revokedBefore: data.revoked_before ? new Date(data.revoked_before) : null,
          sessionVersion: data.session_version,
          sequence: body.event.sequence, sourceUpdatedAt: occurredAt,
        }).onConflictDoUpdate({
          target: revocationStateTable.subject,
          set: {
            revokedBefore: data.revoked_before ? new Date(data.revoked_before) : null,
            sessionVersion: data.session_version, sequence: body.event.sequence,
            sourceUpdatedAt: occurredAt, updatedAt: new Date(),
          },
          setWhere: sql`${revocationStateTable.sequence} < ${body.event.sequence}`,
        });
        const [mapping] = await tx.select().from(externalIdentitiesTable)
          .where(and(eq(externalIdentitiesTable.issuer, claims.iss), eq(externalIdentitiesTable.subject, claims.sub)));
        if (mapping) {
          await tx.update(sessionFamiliesTable).set({
            revokedAt: new Date(),
            revokeReason: (data.reason ?? "external_revocation").slice(0, 128),
            version: sql`${sessionFamiliesTable.version} + 1`,
            updatedAt: new Date(),
          }).where(and(
            eq(sessionFamiliesTable.userId, mapping.userId),
            eq(sessionFamiliesTable.identityIssuer, claims.iss),
            eq(sessionFamiliesTable.identitySubject, claims.sub),
          ));
        }
      }
      return true;
    });
    await securityAudit({
      requestId: requestId(res), event: `${adapter}.event`, outcome: accepted ? "accepted" : "ignored",
      correlationId: body.event.correlation_id, actor: qualifiedSubject,
      detail: { issuer: claims.iss, sequence: body.event.sequence },
    });
    res.status(202).json({ accepted, request_id: requestId(res) });
  } catch (error) {
    failure(req, res, error);
  }
}

router.post("/next/entitlement/v1/events", (req, res) =>
  consumeEvent("entitlement", "entitlement", req, res));
router.post("/next/revocation/v1/events", (req, res) =>
  consumeEvent("revocation", "revocation", req, res));

export default router;