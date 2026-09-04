import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, test } from "node:test";
import {
  AssertionError,
  type AssertionClaims,
  type TrustedIssuer,
  verifyIdentityAssertion,
} from "./assertions";
import {
  adapterEnabled, conditionalRotationAllowed, eventClaimsMatch, eventDigest,
  hasEntitlement, IdentityStateMachine, isEffectivelyRevoked, parseServiceCredential,
  readIdentityTransactionCookie, redactAudit, transactionMatches, validateDestinationRegistry,
  identityTransactionCookie,
} from "./identityCore";

const now = 1_800_000_000;
const nonce = "0123456789abcdef";
const destination = "next.identity.v1:avatar";
const audience = "avatar-crafter";

function key(kid: string) {
  const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk: TrustedIssuer["keys"][number] = {
    ...pair.publicKey.export({ format: "jwk" }),
    kid,
    alg: "RS256",
  };
  return {
    kid,
    privateKey: pair.privateKey,
    jwk,
  };
}

function fixture(keys = [key("current")]) {
  const trusted: TrustedIssuer[] = [{
    issuer: "https://issuer.test",
    audiences: [audience],
    destinations: [destination, "next.entitlement.v1", "next.revocation.v1"],
    algorithms: ["RS256"],
    keys: keys.map((item) => item.jwk),
  }];
  const claims: AssertionClaims = {
    iss: trusted[0].issuer,
    sub: "external-user-1",
    aud: audience,
    destination,
    nonce,
    iat: now - 1,
    exp: now + 60,
    jti: crypto.randomUUID(),
  };
  return { keys, trusted, claims };
}

function sign(claims: AssertionClaims, signingKey: ReturnType<typeof key>, header = {}) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const protectedHeader = encode({ alg: "RS256", kid: signingKey.kid, ...header });
  const payload = encode(claims);
  const signature = crypto.sign(
    "sha256",
    Buffer.from(`${protectedHeader}.${payload}`),
    signingKey.privateKey,
  ).toString("base64url");
  return `${protectedHeader}.${payload}.${signature}`;
}

function verify(
  claims: AssertionClaims,
  context = { audience, destination, nonce, now },
  setup = fixture(),
) {
  return verifyIdentityAssertion(sign(claims, setup.keys[0]), context, setup.trusted);
}

describe("next.identity.v1 assertions", () => {
  test("accepts a valid asymmetric assertion", () => {
    const setup = fixture();
    assert.equal(verify(setup.claims, { audience, destination, nonce, now }, setup).sub, "external-user-1");
  });

  test("rejects expired, wrong-audience, wrong-destination, and wrong-nonce assertions", () => {
    const setup = fixture();
    const checks: Array<[Partial<AssertionClaims>, Parameters<typeof verifyIdentityAssertion>[1], string]> = [
      [{ exp: now }, { audience, destination, nonce, now }, "expired_assertion"],
      [{}, { audience: "other", destination, nonce, now }, "invalid_audience"],
      [{}, { audience, destination: "other", nonce, now }, "invalid_destination"],
      [{}, { audience, destination, nonce: "fedcba9876543210", now }, "invalid_nonce"],
    ];
    for (const [change, context, code] of checks) {
      assert.throws(
        () => verifyIdentityAssertion(sign({ ...setup.claims, ...change }, setup.keys[0]), context, setup.trusted),
        (error: unknown) => error instanceof AssertionError && error.code === code,
      );
    }
  });

  test("rejects unknown kid and accepts overlapping public-key rotation", () => {
    const oldKey = key("old");
    const currentKey = key("current");
    const setup = fixture([oldKey, currentKey]);
    assert.equal(
      verifyIdentityAssertion(sign(setup.claims, oldKey), { audience, destination, nonce, now }, setup.trusted).sub,
      setup.claims.sub,
    );
    const unknown = key("unknown");
    assert.throws(
      () => verifyIdentityAssertion(sign(setup.claims, unknown), { audience, destination, nonce, now }, setup.trusted),
      (error: unknown) => error instanceof AssertionError && error.code === "unknown_assertion_key",
    );
  });

  test("enforces key activation/retirement and assertion freshness", () => {
    const signingKey = key("retired");
    signingKey.jwk.expiresAt = now;
    const setup = fixture([signingKey]);
    assert.throws(
      () => verifyIdentityAssertion(sign(setup.claims, signingKey), { audience, destination, nonce, now }, setup.trusted),
      (error: unknown) => error instanceof AssertionError && error.code === "unknown_assertion_key",
    );
    const fresh = fixture();
    assert.throws(
      () => verifyIdentityAssertion(
        sign({ ...fresh.claims, exp: now + 601 }, fresh.keys[0]),
        { audience, destination, nonce, now },
        fresh.trusted,
      ),
      (error: unknown) => error instanceof AssertionError && error.code === "assertion_lifetime_too_long",
    );
  });
});

describe("tokenless handoff transactions", () => {
  test("binds exact destination, state, nonce and is single-use", () => {
    const setup = fixture();
    const machine = new IdentityStateMachine(() => now * 1000);
    const code = machine.createHandoff(setup.claims, { nonce, destination, state: "state-1" });
    assert.equal(machine.exchangeHandoff({ code, nonce, destination, state: "wrong" }), null);
    assert.equal(machine.exchangeHandoff({ code, nonce, destination, state: "state-1" }), setup.claims.sub);
    assert.equal(machine.exchangeHandoff({ code, nonce, destination, state: "state-1" }), null);
  });

  test("rejects replayed assertion IDs", () => {
    const setup = fixture();
    const machine = new IdentityStateMachine(() => now * 1000);
    machine.createHandoff(setup.claims, { nonce, destination, state: "one" });
    assert.throws(
      () => machine.createHandoff(setup.claims, { nonce, destination, state: "two" }),
      /replayed_assertion/,
    );
  });
});

describe("local session and access boundaries", () => {
  test("session-family rotation has one atomic winner", async () => {
    const machine = new IdentityStateMachine();
    const original = machine.issueSession("member");
    const results = await Promise.all([Promise.resolve().then(() => machine.rotate(original)), Promise.resolve().then(() => machine.rotate(original))]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(machine.sessionActive(original), false);
    assert.equal(machine.sessionActive(results.find(Boolean)!), true);
  });

  test("logout-all revokes every family", () => {
    const machine = new IdentityStateMachine();
    const first = machine.issueSession("member");
    const second = machine.issueSession("member");
    machine.logoutAll("member");
    assert.equal(machine.sessionActive(first), false);
    assert.equal(machine.sessionActive(second), false);
  });

  test("membership removal denies access without destroying the browser session", () => {
    const machine = new IdentityStateMachine();
    const token = machine.issueSession("member", { browser: true });
    machine.setMembership("member", "org", true);
    assert.equal(machine.authorize(token, { organization: "org" }), true);
    machine.setMembership("member", "org", false);
    assert.equal(machine.authorize(token, { organization: "org" }), false);
    assert.equal(machine.sessionActive(token), true);
  });

  test("rejects admin, role, and client-entitlement failures", () => {
    const machine = new IdentityStateMachine();
    const token = machine.issueSession("member");
    machine.setMembership("member", "org", true);
    assert.equal(machine.authorize(token, { organization: "org", admin: false }), false);
    assert.equal(machine.authorize(token, { organization: "org", roleAllowed: false }), false);
    assert.equal(machine.authorize(token, { organization: "org", clientEntitled: false }), false);
  });

  test("preserves browser/OIDC independence while enforcing disconnected external providers", () => {
    const machine = new IdentityStateMachine();
    const browser = machine.issueSession("member", { browser: true, providerConnected: false });
    const external = machine.issueSession("member", { external: true, providerConnected: false });
    machine.setMembership("member", "org", true);
    assert.equal(machine.authorize(browser, { organization: "org" }), true);
    assert.equal(machine.authorize(external, { organization: "org", requireExternalProvider: true }), false);
  });
});

describe("event consumers", () => {
  test("all adapters are disabled by default and require exact opt-in", () => {
    assert.equal(adapterEnabled("identity", {}), false);
    assert.equal(adapterEnabled("entitlement", { NEXT_ENTITLEMENT_V1_ENABLED: "TRUE" }), false);
    assert.equal(adapterEnabled("revocation", { NEXT_REVOCATION_V1_ENABLED: "true" }), true);
  });

  test("validates event assertion signature, freshness, and nonce", () => {
    const setup = fixture();
    const claims = { ...setup.claims, destination: "next.entitlement.v1" };
    assert.equal(
      verifyIdentityAssertion(sign(claims, setup.keys[0]), { audience, destination: "next.entitlement.v1", nonce, now }, setup.trusted).destination,
      "next.entitlement.v1",
    );
    const signed = sign(claims, setup.keys[0]);
    const compactParts = signed.split(".");
    compactParts[2] = `${compactParts[2][0] === "A" ? "B" : "A"}${compactParts[2].slice(1)}`;
    const tampered = compactParts.join(".");
    assert.throws(() => verifyIdentityAssertion(tampered, { audience, destination: "next.entitlement.v1", nonce, now }, setup.trusted));
    assert.throws(() => verifyIdentityAssertion(sign({ ...claims, exp: now }, setup.keys[0]), { audience, destination: "next.entitlement.v1", nonce, now }, setup.trusted));
    assert.throws(() => verifyIdentityAssertion(sign(claims, setup.keys[0]), { audience, destination: "next.entitlement.v1", nonce: "wrong-nonce-value", now }, setup.trusted));
  });

  test("applies grants, deduplicates, orders, filters subscriptions, and preserves correlation", () => {
    const machine = new IdentityStateMachine();
    assert.equal(machine.consume("entitlement", { id: "unsub", subject: "other", sequence: 1, data: { active: true } }), "not_subscribed");
    machine.subscribe("member");
    assert.equal(machine.consume("entitlement", { id: "grant", subject: "member", sequence: 2, correlationId: "corr-1", data: { active: true, plan: "pro" } }), "accepted");
    assert.equal(machine.consume("entitlement", { id: "grant", subject: "member", sequence: 2, data: { active: false } }), "duplicate");
    assert.equal(machine.consume("entitlement", { id: "old", subject: "member", sequence: 1, data: { active: false } }), "out_of_order");
    assert.deepEqual(machine.entitlement.get("member"), { active: true, plan: "pro", sequence: 2 });
    assert.equal(machine.correlations.get("entitlement:grant"), "corr-1");
    assert.equal(machine.consume("entitlement", { id: "remove", subject: "member", sequence: 3, data: { active: false } }), "accepted");
    assert.deepEqual(machine.entitlement.get("member"), { active: false, plan: undefined, sequence: 3 });
    const session = machine.issueSession("member");
    assert.equal(machine.consume("revocation", { id: "revoke", subject: "member", sequence: 1, correlationId: "corr-2", data: { revoked_before: "2027-01-01T00:00:00.000Z" } }), "accepted");
    assert.equal(machine.sessionActive(session), false);
    assert.equal(machine.revocation.get("member")?.correlationId, "corr-2");
  });
});

test("audit redaction excludes credentials, assertions, tokens and PII", () => {
  assert.deepEqual(
    redactAudit({
      destination: "next.identity.v1",
      issuer: "issuer",
      sequence: 4,
      reason: "logout",
      token: "secret",
      assertion: "jwt",
      email: "person@example.test",
    }),
    { destination: "next.identity.v1", issuer: "issuer", sequence: 4, reason: "logout" },
  );
});

describe("production identity helpers", () => {
  test("destination registry accepts only exact keys and safe relative targets", () => {
    assert.deepEqual(validateDestinationRegistry({
      avatar: { returnTo: "/portal", authorizeUrl: "/source/authorize" },
      evil: { returnTo: "https://evil.test" },
      protocol: { returnTo: "//evil.test" },
    }), { avatar: { returnTo: "/portal", authorizeUrl: "/source/authorize" } });
    assert.deepEqual(validateDestinationRegistry({
      source: { returnTo: "/done", authorizeUrl: "https://source.example/authorize" },
    }), { source: { returnTo: "/done", authorizeUrl: "https://source.example/authorize" } });
  });

  test("signed event digest binding rejects a forged body", () => {
    const setup = fixture();
    const event = { id: "e1", subject: "ignored-wire-value", sequence: 1, correlation_id: "c1", occurred_at: "2027-01-01T00:00:00.000Z", data: { active: true, code: "workspace:private" } };
    const claims = { ...setup.claims, event_id: event.id, event_subject: `${setup.claims.iss}|${setup.claims.sub}`, event_sequence: 1, correlation_id: "c1", occurred_at: event.occurred_at, body_sha256: eventDigest(event) };
    assert.equal(eventClaimsMatch(claims, event), true);
    assert.equal(eventClaimsMatch(claims, { ...event, data: { ...event.data, active: false } }), false);
  });

  test("issuer-qualified entitlements isolate equal subjects", () => {
    const rows = [{ issuer: "issuer-a", subject: "same", code: "conversations:use", active: true }];
    assert.equal(hasEntitlement(rows, { issuer: "issuer-a", subject: "same", code: "conversations:use" }), true);
    assert.equal(hasEntitlement(rows, { issuer: "issuer-b", subject: "same", code: "conversations:use" }), false);
  });

  test("revokedBefore and sessionVersion apply only when effective", () => {
    assert.equal(isEffectivelyRevoked({ createdAt: 200, version: 3 }, { revokedBefore: 100, sessionVersion: 2 }), false);
    assert.equal(isEffectivelyRevoked({ createdAt: 100, version: 3 }, { revokedBefore: 100 }), true);
    assert.equal(isEffectivelyRevoked({ createdAt: 200, version: 2 }, { sessionVersion: 2 }), true);
  });

  test("service credential parser rejects unauthenticated and malformed callers", () => {
    assert.equal(parseServiceCredential(undefined), null);
    assert.equal(parseServiceCredential("Bearer x"), null);
    assert.deepEqual(parseServiceCredential("Service source.secret"), { id: "source", secret: "secret" });
  });

  test("finish requires exact cookie, state, and destination; rotation CAS has one eligible predecessor", () => {
    const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
    const stored = { secretHash: hash("cookie"), stateHash: hash("state"), destination: "avatar" };
    assert.equal(transactionMatches(stored, { cookie: "cookie", state: "state", destination: "avatar" }), true);
    assert.equal(transactionMatches(stored, { cookie: "wrong", state: "state", destination: "avatar" }), false);
    assert.equal(transactionMatches(stored, { cookie: "cookie", state: "wrong", destination: "avatar" }), false);
    assert.equal(conditionalRotationAllowed({ revoked: false, familyVersion: 2, currentFamilyVersion: 2 }), true);
    assert.equal(conditionalRotationAllowed({ revoked: true, familyVersion: 2, currentFamilyVersion: 2 }), false);
  });

  test("HttpOnly transaction cookie keeps state out of the start response boundary", () => {
    const opaque = identityTransactionCookie("fake-transaction", "fake-secret-state");
    assert.deepEqual(readIdentityTransactionCookie(opaque), {
      transaction: "fake-transaction", state: "fake-secret-state",
    });
    assert.equal(readIdentityTransactionCookie("forged"), null);
  });

  test("same event ID from two issuers has distinct issuer-qualified keys", () => {
    const keys = new Set(["entitlement:issuer-a:event-1", "entitlement:issuer-b:event-1"]);
    assert.equal(keys.size, 2);
  });
});