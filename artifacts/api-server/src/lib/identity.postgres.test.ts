import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import type { AssertionClaims, TrustedIssuer } from "./assertions";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl ? test : test.skip;

type DbModule = typeof import("@workspace/db");
type AuthModule = typeof import("./auth");
type RateLimitModule = typeof import("./integrationRateLimit");

let database: DbModule;
let auth: AuthModule;
let rateLimit: RateLimitModule;
let app: Express;
let server: Server;
let baseUrl: string;

const issuer = "https://issuer.test";
const organization = "next-level";
const serviceId = "identity-source";
const serviceSecret = "fake-service-secret-for-disposable-ci";
const signingPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const signingKid = "ci-current";

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signAssertion(claims: AssertionClaims): string {
  const header = encode({ alg: "RS256", kid: signingKid });
  const payload = encode(claims);
  const signature = crypto.sign(
    "sha256",
    Buffer.from(`${header}.${payload}`),
    signingPair.privateKey,
  ).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

function trustedIssuer(): TrustedIssuer {
  return {
    issuer,
    audiences: ["avatar-crafter"],
    destinations: [
      "next.identity.v1:avatar",
      "next.entitlement.v1",
      "next.revocation.v1",
    ],
    algorithms: ["RS256"],
    keys: [{
      ...signingPair.publicKey.export({ format: "jwk" }),
      kid: signingKid,
      alg: "RS256",
    }],
  };
}

async function applyDisposableMigrations() {
  await database.pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar UNIQUE,
      first_name varchar,
      last_name varchar,
      profile_image_url varchar,
      is_admin boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id serial PRIMARY KEY,
      title text NOT NULL,
      agent_id text NOT NULL,
      user_id text,
      is_admin boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id serial PRIMARY KEY,
      conversation_id integer NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS offices (
      id serial PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      description text NOT NULL DEFAULT '',
      url text NOT NULL,
      wing text NOT NULL DEFAULT 'A',
      accent_color text NOT NULL DEFAULT '#4a9eff',
      is_deleted boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  for (const migration of [
    "lib/db/drizzle/0000_offline_identity_foundation.sql",
    "lib/db/drizzle/0001_durable_integration_rate_limits.sql",
  ]) {
    const sql = await readFile(
      new URL(`../../../../${migration}`, import.meta.url),
      "utf8",
    );
    await database.pool.query(sql);
    await database.pool.query(sql);
  }
}

async function resetDatabase() {
  await database.pool.query(`
    TRUNCATE TABLE
      security_audit,
      integration_rate_limit_buckets,
      messages,
      conversations,
      provider_tokens,
      local_sessions,
      session_families,
      entitlement_state,
      revocation_state,
      integration_events,
      identity_handoffs,
      external_identities,
      identity_memberships,
      service_principals,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function request(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    redirect?: "error" | "follow" | "manual";
  } = {},
) {
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: options.redirect,
  });
}

async function createMember(
  subject: string,
  entitlements: string[],
): Promise<{ userId: string; sid: string }> {
  const userId = crypto.randomUUID();
  await database.db.insert(database.usersTable).values({ id: userId });
  await database.db.insert(database.externalIdentitiesTable).values({
    issuer,
    subject,
    userId,
  });
  await database.db.insert(database.membershipsTable).values({
    issuer,
    subject,
    organization,
    active: true,
  });
  if (entitlements.length) {
    await database.db.insert(database.entitlementStateTable).values(
      entitlements.map((code, index) => ({
        issuer,
        subject,
        code,
        active: true,
        sequence: index + 1,
        sourceUpdatedAt: new Date(),
      })),
    );
  }
  const sid = await auth.createLocalSession(
    {
      id: userId,
      email: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      isAdmin: false,
    },
    undefined,
    undefined,
    { issuer, subject },
  );
  return { userId, sid };
}

before(async () => {
  if (!databaseUrl) return;
  process.env.DATABASE_URL = databaseUrl;
  process.env.NEXT_IDENTITY_V1_ENABLED = "true";
  process.env.NEXT_ENTITLEMENT_V1_ENABLED = "true";
  process.env.NEXT_REVOCATION_V1_ENABLED = "true";
  process.env.NEXT_IDENTITY_AUDIENCE = "wrong-environment-override";
  process.env.NEXT_EVENTS_AUDIENCE = "wrong-environment-override";
  process.env.SESSION_SECRET = "disposable-ci-session-secret-material";
  process.env.APP_ALLOWED_ORIGINS = "https://approved.example.test";
  process.env.NEXT_IDENTITY_DESTINATIONS = JSON.stringify({
    avatar: { returnTo: "/done", authorizeUrl: "/source/authorize" },
  });
  process.env.NEXT_IDENTITY_TRUST_CONFIG = JSON.stringify([trustedIssuer()]);
  process.env.NEXT_EVENT_SUBSCRIPTIONS = `${issuer}|member-a`;
  delete process.env.NEXT_DURABLE_RATE_LIMIT_ENABLED;

  database = await import("@workspace/db");
  await applyDisposableMigrations();
  auth = await import("./auth");
  rateLimit = await import("./integrationRateLimit");

  const express = (await import("express")).default;
  const cors = (await import("cors")).default;
  const cookieParser = (await import("cookie-parser")).default;
  const { credentialedCorsOptions } = await import("./corsPolicy");
  const { authMiddleware } = await import("../middlewares/authMiddleware");
  const integrationRouter = (await import("../routes/integrations")).default;
  const officeRouter = (await import("../routes/offices")).default;
  const openaiRouter = (await import("../routes/openai/index")).default;

  app = express();
  app.use(cors(credentialedCorsOptions()));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(authMiddleware);
  app.use("/api", integrationRouter);
  app.use("/api", officeRouter);
  app.use("/api", openaiRouter);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(async () => {
  if (!databaseUrl) return;
  await resetDatabase();
  await database.db.insert(database.servicePrincipalsTable).values({
    id: serviceId,
    secretHash: crypto.createHash("sha256").update(serviceSecret).digest("hex"),
    capabilities: ["identity.complete"],
  });
  await database.db.insert(database.officesTable).values({
    slug: "atlas",
    name: "Atlas",
    description: "Disposable CI office",
    url: "/office-3d/atlas",
    wing: "A",
    accentColor: "#c8a050",
  }).onConflictDoNothing({ target: database.officesTable.slug });
});

after(async () => {
  if (!databaseUrl) return;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );
  await database.pool.end();
});

describe("disposable PostgreSQL identity security", () => {
  integrationTest("applies both migrations idempotently", async () => {
    const result = await database.pool.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('identity_handoffs', 'integration_rate_limit_buckets')
      ORDER BY table_name
    `);
    assert.deepEqual(
      result.rows.map((row) => row.table_name),
      ["identity_handoffs", "integration_rate_limit_buckets"],
    );
  });

  integrationTest("allows exactly one concurrent handoff completion and finish", async () => {
    const start = await request("/api/next/identity/v1/start", {
      method: "POST",
      body: { destination: "avatar" },
    });
    assert.equal(start.status, 201);
    const cookie = start.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie?.startsWith("next_identity_tx="));
    if (!cookie) throw new Error("missing transaction cookie");
    const startBody = await start.json() as { authorize_url: string };
    const authorizeUrl = new URL(startBody.authorize_url, baseUrl);
    const transaction = authorizeUrl.searchParams.get("transaction");
    const nonce = authorizeUrl.searchParams.get("nonce");
    assert.ok(transaction);
    assert.ok(nonce);

    const now = Math.floor(Date.now() / 1000);
    const assertion = signAssertion({
      iss: issuer,
      sub: "handoff-member",
      aud: "avatar-crafter",
      destination: "next.identity.v1:avatar",
      nonce,
      iat: now,
      exp: now + 120,
      jti: crypto.randomUUID(),
    });
    const completion = {
      method: "POST",
      headers: {
        authorization: `Service ${serviceId}.${serviceSecret}`,
      },
      body: { transaction, assertion },
    };
    const completionResponses = await Promise.all([
      request("/api/next/identity/v1/complete", completion),
      request("/api/next/identity/v1/complete", completion),
    ]);
    assert.deepEqual(
      completionResponses.map((response) => response.status).sort(),
      [202, 401],
    );

    const finishes = await Promise.all([
      request("/api/next/identity/v1/finish", {
        method: "POST",
        headers: { cookie },
        body: {},
        redirect: "manual",
      }),
      request("/api/next/identity/v1/finish", {
        method: "POST",
        headers: { cookie },
        body: {},
        redirect: "manual",
      }),
    ]);
    assert.deepEqual(
      finishes.map((response) => response.status).sort(),
      [302, 401],
    );
    const finishWinner = finishes.find((response) => response.status === 302);
    assert.ok(finishWinner?.headers.get("set-cookie")?.includes("next_csrf="));
    const sessions = await database.pool.query<{ count: string }>(
      "SELECT count(*) FROM local_sessions",
    );
    assert.equal(Number(sessions.rows[0]?.count), 1);
  });

  integrationTest("enforces membership, entitlement, tenant, revocation, and office boundaries", async () => {
    const memberA = await createMember("member-a", [
      "conversations:use",
      "office:atlas",
    ]);
    const memberB = await createMember("member-b", ["conversations:use"]);
    const [conversation] = await database.db.insert(database.conversations).values({
      title: "Member A private",
      agentId: "rook",
      userId: memberA.userId,
    }).returning();

    const memberAResponse = await request(
      `/api/openai/conversations/${conversation.id}`,
      { headers: { authorization: `Bearer ${memberA.sid}` } },
    );
    assert.equal(memberAResponse.status, 200);
    const memberBResponse = await request(
      `/api/openai/conversations/${conversation.id}`,
      { headers: { authorization: `Bearer ${memberB.sid}` } },
    );
    assert.equal(memberBResponse.status, 404);

    const office = await request("/api/offices/atlas/entry", {
      headers: { authorization: `Bearer ${memberA.sid}` },
    });
    assert.equal(office.status, 200);

    const otherIssuer = "https://other-issuer.test";
    await database.db.insert(database.externalIdentitiesTable).values({
      issuer: otherIssuer,
      subject: "member-a-other",
      userId: memberA.userId,
    });
    await database.db.insert(database.membershipsTable).values({
      issuer: otherIssuer,
      subject: "member-a-other",
      organization,
      active: true,
    });
    await database.db.insert(database.entitlementStateTable).values({
      issuer: otherIssuer,
      subject: "member-a-other",
      code: "conversations:use",
      active: true,
      sequence: 1,
      sourceUpdatedAt: new Date(),
    });
    await database.db.update(database.membershipsTable).set({ active: false })
      .where(and(
        eq(database.membershipsTable.issuer, issuer),
        eq(database.membershipsTable.subject, "member-a"),
      ));
    const removed = await request(`/api/openai/conversations/${conversation.id}`, {
      headers: { authorization: `Bearer ${memberA.sid}` },
    });
    assert.equal(removed.status, 403);
    assert.ok(await auth.getSession(memberA.sid));

    await database.db.update(database.membershipsTable).set({ active: true })
      .where(eq(database.membershipsTable.subject, "member-a"));
    await database.db.update(database.entitlementStateTable).set({ active: false })
      .where(and(
        eq(database.entitlementStateTable.subject, "member-a"),
        eq(database.entitlementStateTable.code, "conversations:use"),
      ));
    const unentitled = await request(`/api/openai/conversations/${conversation.id}`, {
      headers: { authorization: `Bearer ${memberA.sid}` },
    });
    assert.equal(unentitled.status, 403);

    await database.db.update(database.entitlementStateTable).set({ active: true })
      .where(eq(database.entitlementStateTable.subject, "member-a"));
    await database.db.insert(database.revocationStateTable).values({
      subject: `${issuer}|member-a`,
      sessionVersion: 1,
      sequence: 1,
      sourceUpdatedAt: new Date(),
    });
    const revoked = await request(`/api/openai/conversations/${conversation.id}`, {
      headers: { authorization: `Bearer ${memberA.sid}` },
    });
    assert.equal(revoked.status, 403);
  });

  integrationTest("consumes signed entitlement and revocation events over HTTP", async () => {
    const memberA = await createMember("member-a", ["conversations:use"]);
    const issuerB = "https://issuer-b.test";
    await database.db.insert(database.externalIdentitiesTable).values({
      issuer: issuerB,
      subject: "member-b-linked",
      userId: memberA.userId,
    });
    await database.db.insert(database.membershipsTable).values({
      issuer: issuerB,
      subject: "member-b-linked",
      organization,
      active: true,
    });
    await database.db.insert(database.entitlementStateTable).values({
      issuer: issuerB,
      subject: "member-b-linked",
      code: "conversations:use",
      active: true,
      sequence: 1,
      sourceUpdatedAt: new Date(),
    });
    const issuerBSid = await auth.createLocalSession(
      {
        id: memberA.userId,
        email: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        isAdmin: false,
      },
      undefined,
      undefined,
      { issuer: issuerB, subject: "member-b-linked" },
    );
    const [conversation] = await database.db.insert(database.conversations).values({
      title: "Revocable",
      agentId: "rook",
      userId: memberA.userId,
    }).returning();
    const { eventDigest } = await import("./identityCore");

    const sendEvent = async (
      adapter: "entitlement" | "revocation",
      sequence: number,
      data: Record<string, unknown>,
    ) => {
      const nonce = crypto.randomBytes(16).toString("hex");
      const occurredAt = new Date().toISOString();
      const event = {
        id: crypto.randomUUID(),
        subject: "member-a",
        sequence,
        correlation_id: crypto.randomUUID(),
        occurred_at: occurredAt,
        data,
      };
      const now = Math.floor(Date.now() / 1000);
      const assertion = signAssertion({
        iss: issuer,
        sub: "member-a",
        aud: "avatar-crafter",
        destination: `next.${adapter}.v1`,
        nonce,
        iat: now,
        exp: now + 120,
        jti: crypto.randomUUID(),
        event_id: event.id,
        event_subject: `${issuer}|member-a`,
        event_sequence: event.sequence,
        correlation_id: event.correlation_id,
        occurred_at: event.occurred_at,
        body_sha256: eventDigest(event),
      });
      return request(`/api/next/${adapter}/v1/events`, {
        method: "POST",
        body: { assertion, nonce, event },
      });
    };

    const entitlement = await sendEvent("entitlement", 2, {
      code: "conversations:use",
      active: false,
    });
    assert.equal(entitlement.status, 202);
    const denied = await request(`/api/openai/conversations/${conversation.id}`, {
      headers: { authorization: `Bearer ${memberA.sid}` },
    });
    assert.equal(denied.status, 403);

    await database.db.update(database.entitlementStateTable).set({ active: true })
      .where(eq(database.entitlementStateTable.subject, "member-a"));
    const revocation = await sendEvent("revocation", 1, {
      session_version: 1,
      reason: "ci-test",
    });
    assert.equal(revocation.status, 202);
    assert.equal(await auth.getSession(memberA.sid), null);
    assert.ok(await auth.getSession(issuerBSid));
    const issuerBStillAuthorized = await request(
      `/api/openai/conversations/${conversation.id}`,
      { headers: { authorization: `Bearer ${issuerBSid}` } },
    );
    assert.equal(issuerBStillAuthorized.status, 200);
    const audits = await database.pool.query<{ detail: unknown; actor_hash: string | null }>(
      "SELECT detail, actor_hash FROM security_audit ORDER BY created_at",
    );
    assert.ok(audits.rows.length >= 2);
    const serialized = JSON.stringify(audits.rows);
    assert.equal(serialized.includes(memberA.sid), false);
    assert.equal(serialized.includes(serviceSecret), false);
    assert.equal(serialized.includes("assertion"), false);
  });

  integrationTest("shares one durable rate-limit bucket across repository instances", async () => {
    const first = new rateLimit.PostgresRateLimitRepository(database.pool);
    const second = new rateLimit.PostgresRateLimitRepository(database.pool);
    const attempts = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        (index % 2 ? first : second).consume({
          scope: "identity.complete",
          keyHash: "a".repeat(64),
          limit: 5,
          windowSeconds: 60,
        }),
      ),
    );
    assert.equal(attempts.filter((decision) => decision.allowed).length, 5);
    const row = await database.pool.query<{ count: number }>(
      "SELECT count FROM integration_rate_limit_buckets WHERE scope = $1",
      ["identity.complete"],
    );
    assert.equal(Number(row.rows[0]?.count), 20);
  });

  integrationTest("enforces HTTP origin, CSRF, body, request-ID, and limiter failures", async () => {
    const rejectedOrigin = await request("/api/next/identity/v1/start", {
      method: "POST",
      headers: {
        origin: "https://unapproved.example.test",
        "x-request-id": "origin-test",
      },
      body: { destination: "avatar" },
    });
    assert.equal(rejectedOrigin.status, 403);
    assert.equal(rejectedOrigin.headers.get("x-request-id"), "origin-test");

    const csrfMember = await createMember("csrf-member", []);
    const csrfResponse = await request("/api/next/csrf/v1", {
      headers: { cookie: `sid=${csrfMember.sid}` },
    });
    assert.equal(csrfResponse.status, 204);
    const csrfSetCookie = csrfResponse.headers.get("set-cookie") ?? "";
    const csrfToken = /next_csrf=([^;,\s]+)/.exec(csrfSetCookie)?.[1];
    assert.ok(csrfToken);

    const acceptedCsrf = await request("/api/next/identity/v1/start", {
      method: "POST",
      headers: {
        cookie: `sid=${csrfMember.sid}; next_csrf=${csrfToken}`,
        "x-csrf-token": csrfToken,
      },
      body: { destination: "avatar" },
    });
    assert.equal(acceptedCsrf.status, 201);

    const rejectedCsrf = await request("/api/next/identity/v1/start", {
      method: "POST",
      headers: {
        cookie: `sid=${csrfMember.sid}; next_csrf=${csrfToken}`,
        "x-csrf-token": "wrong",
      },
      body: { destination: "avatar" },
    });
    assert.equal(rejectedCsrf.status, 403);

    const preflight = await request("/api/offices", {
      method: "OPTIONS",
      headers: {
        origin: "https://approved.example.test",
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get("access-control-allow-origin"),
      "https://approved.example.test",
    );
    assert.equal(
      preflight.headers.get("access-control-allow-credentials"),
      "true",
    );
    const rejectedPreflight = await request("/api/offices", {
      method: "OPTIONS",
      headers: {
        origin: "https://unapproved.example.test",
        "access-control-request-method": "GET",
      },
    });
    assert.equal(
      rejectedPreflight.headers.get("access-control-allow-origin"),
      null,
    );

    const malformed = await request("/api/next/identity/v1/start", {
      method: "POST",
      body: { destination: "" },
    });
    assert.equal(malformed.status, 400);
    assert.match(
      String((await malformed.json() as { error?: { requestId?: string } }).error?.requestId),
      /^[0-9a-f-]{36}$/i,
    );

    const express = (await import("express")).default;
    const { createIntegrationSecurity } = await import(
      "../middlewares/integrationSecurity"
    );
    const limitedApp = express();
    limitedApp.use(createIntegrationSecurity({
      repository: new rateLimit.PostgresRateLimitRepository(database.pool),
      configuration: () => ({
        state: "enabled",
        limit: 2,
        windowSeconds: 60,
        hashKey: "disposable-test-hmac-key-material-32",
      }),
      now: Date.now,
    }));
    limitedApp.post("/limited", (_req, res) => res.sendStatus(204));
    limitedApp.post(
      "/invalid",
      createIntegrationSecurity({
        repository: new rateLimit.PostgresRateLimitRepository(database.pool),
        configuration: () => ({ state: "invalid" }),
        now: Date.now,
      }),
      (_req, res) => res.sendStatus(204),
    );
    const limitedServer = limitedApp.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) =>
      limitedServer.once("listening", resolve),
    );
    const limitedBase = `http://127.0.0.1:${
      (limitedServer.address() as AddressInfo).port
    }`;
    try {
      const attempts = await Promise.all(
        Array.from({ length: 10 }, () =>
          fetch(`${limitedBase}/limited`, { method: "POST" }),
        ),
      );
      assert.equal(
        attempts.filter((response) => response.status === 204).length,
        2,
      );
      assert.equal(
        attempts.filter((response) => response.status === 429).length,
        8,
      );
      assert.ok(
        attempts
          .filter((response) => response.status === 429)
          .every((response) => Number(response.headers.get("retry-after")) >= 1),
      );
      const invalid = await fetch(`${limitedBase}/invalid`, { method: "POST" });
      assert.equal(invalid.status, 503);
    } finally {
      await new Promise<void>((resolve, reject) =>
        limitedServer.close((error) => error ? reject(error) : resolve()),
      );
    }
  });
});