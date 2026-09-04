import crypto from "node:crypto";
import type { AssertionClaims } from "./assertions";

export type DestinationTarget = { returnTo: string; authorizeUrl?: string };
export function validateDestinationRegistry(value: unknown): Record<string, DestinationTarget> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, target]) => {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(key) || !target || typeof target !== "object") return false;
    const item = target as Record<string, unknown>;
    return typeof item.returnTo === "string" && item.returnTo.startsWith("/") && !item.returnTo.startsWith("//") &&
      (item.authorizeUrl === undefined ||
       (typeof item.authorizeUrl === "string" &&
        ((item.authorizeUrl.startsWith("/") && !item.authorizeUrl.startsWith("//")) ||
          (() => { try { return new URL(item.authorizeUrl).protocol === "https:"; } catch { return false; } })())));
  })) as Record<string, DestinationTarget>;
}

export function identityTransactionCookie(transaction: string, state: string) {
  return Buffer.from(JSON.stringify({ transaction, state })).toString("base64url");
}
export function readIdentityTransactionCookie(value?: string): { transaction: string; state: string } | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value ?? "", "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const item = parsed as Record<string, unknown>;
    return typeof item.transaction === "string" && typeof item.state === "string"
      ? { transaction: item.transaction, state: item.state } : null;
  } catch { return null; }
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as object).sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function eventDigest(value: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function eventClaimsMatch(
  claims: AssertionClaims,
  event: { id: string; subject: string; sequence: number; correlation_id?: string; occurred_at: string } & Record<string, unknown>,
) {
  return claims.event_id === event.id &&
    claims.event_subject === `${claims.iss}|${claims.sub}` &&
    claims.event_sequence === event.sequence &&
    claims.correlation_id === (event.correlation_id ?? null) &&
    claims.occurred_at === event.occurred_at &&
    claims.body_sha256 === eventDigest(event);
}

export function transactionMatches(
  stored: { secretHash: string; stateHash: string; destination: string },
  input: { cookie?: string; state: string; destination: string },
) {
  const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
  return Boolean(input.cookie) && stored.secretHash === hash(input.cookie!) &&
    stored.stateHash === hash(input.state) && stored.destination === input.destination;
}

export function parseServiceCredential(value?: string) {
  if (!value?.startsWith("Service ")) return null;
  const token = value.slice(8);
  const dot = token.indexOf(".");
  if (dot < 1 || dot === token.length - 1) return null;
  return { id: token.slice(0, dot), secret: token.slice(dot + 1) };
}

export function isEffectivelyRevoked(
  session: { createdAt: number; version: number },
  revocation?: { revokedBefore?: number | null; sessionVersion?: number | null },
) {
  if (!revocation) return false;
  return (revocation.revokedBefore != null && session.createdAt <= revocation.revokedBefore) ||
    (revocation.sessionVersion != null && session.version <= revocation.sessionVersion);
}

export function conditionalRotationAllowed(input: { revoked: boolean; familyVersion: number; currentFamilyVersion: number }) {
  return !input.revoked && input.familyVersion === input.currentFamilyVersion;
}

export function hasEntitlement(
  rows: Array<{ issuer: string; subject: string; code: string; active: boolean }>,
  expected: { issuer: string; subject: string; code: string },
) {
  return rows.some((row) => row.issuer === expected.issuer && row.subject === expected.subject &&
    row.code === expected.code && row.active);
}

export const adapterEnabled = (
  name: "identity" | "entitlement" | "revocation",
  env: Readonly<Record<string, string | undefined>> = process.env,
) => env[`NEXT_${name.toUpperCase()}_V1_ENABLED`] === "true";

export function redactAudit(detail: Record<string, unknown>) {
  const allowed = new Set(["destination", "issuer", "sequence", "reason"]);
  return Object.fromEntries(Object.entries(detail).filter(([key]) => allowed.has(key)));
}

type Handoff = {
  codeHash: string;
  nonceHash: string;
  destination: string;
  state: string;
  subject: string;
  jti: string;
  expiresAt: number;
  consumed: boolean;
};

type Family = { version: number; revoked: boolean };
type Session = {
  familyId: string;
  familyVersion: number;
  subject: string;
  revoked: boolean;
  browser: boolean;
  external: boolean;
  providerConnected: boolean;
};

export type IntegrationEvent = {
  id: string;
  subject: string;
  sequence: number;
  correlationId?: string;
  data: Record<string, unknown>;
};

/**
 * Deterministic state machine shared by adapters and isolated tests. Production
 * persistence applies the same transitions transactionally in integrations.ts.
 */
export class IdentityStateMachine {
  private handoffs = new Map<string, Handoff>();
  private assertionIds = new Set<string>();
  private families = new Map<string, Family>();
  private sessions = new Map<string, Session>();
  private memberships = new Map<string, Set<string>>();
  private events = new Set<string>();
  private sequence = new Map<string, number>();
  private subscriptions = new Set<string>();
  readonly correlations = new Map<string, string | undefined>();
  readonly entitlement = new Map<string, { active: boolean; plan?: string; sequence: number }>();
  readonly revocation = new Map<string, { revokedBefore?: string; sequence: number; correlationId?: string }>();

  constructor(private readonly now: () => number = Date.now) {}

  subscribe(subject: string) {
    this.subscriptions.add(subject);
  }

  createHandoff(
    claims: AssertionClaims,
    input: { nonce: string; destination: string; state: string },
  ) {
    if (!claims.jti || this.assertionIds.has(claims.jti)) throw new Error("replayed_assertion");
    if (claims.destination !== input.destination) throw new Error("wrong_destination");
    if (claims.nonce !== input.nonce) throw new Error("wrong_nonce");
    this.assertionIds.add(claims.jti);
    const code = crypto.randomBytes(32).toString("base64url");
    this.handoffs.set(this.hash(code), {
      codeHash: this.hash(code),
      nonceHash: this.hash(input.nonce),
      destination: input.destination,
      state: input.state,
      subject: claims.sub,
      jti: claims.jti,
      expiresAt: Math.min(claims.exp * 1000, this.now() + 120_000),
      consumed: false,
    });
    return code;
  }

  exchangeHandoff(input: { code: string; nonce: string; destination: string; state: string }) {
    const row = this.handoffs.get(this.hash(input.code));
    if (
      !row || row.consumed || row.expiresAt <= this.now() ||
      row.nonceHash !== this.hash(input.nonce) ||
      row.destination !== input.destination || row.state !== input.state
    ) return null;
    row.consumed = true;
    return row.subject;
  }

  issueSession(subject: string, options: Partial<Pick<Session, "browser" | "external" | "providerConnected">> = {}) {
    const familyId = crypto.randomUUID();
    const token = crypto.randomUUID();
    this.families.set(familyId, { version: 1, revoked: false });
    this.sessions.set(token, {
      familyId, familyVersion: 1, subject, revoked: false,
      browser: options.browser ?? false,
      external: options.external ?? false,
      providerConnected: options.providerConnected ?? true,
    });
    return token;
  }

  rotate(token: string) {
    const old = this.sessions.get(token);
    const family = old && this.families.get(old.familyId);
    if (!old || old.revoked || !family || family.revoked || old.familyVersion !== family.version) return null;
    old.revoked = true; // compare-and-set boundary: only one competing caller wins
    const next = crypto.randomUUID();
    this.sessions.set(next, { ...old, revoked: false });
    return next;
  }

  logoutAll(subject: string) {
    for (const session of this.sessions.values()) {
      if (session.subject === subject) this.families.get(session.familyId)!.revoked = true;
    }
  }

  sessionActive(token: string) {
    const session = this.sessions.get(token);
    const family = session && this.families.get(session.familyId);
    return Boolean(session && family && !session.revoked && !family.revoked && session.familyVersion === family.version);
  }

  setMembership(subject: string, organization: string, present: boolean) {
    const memberships = this.memberships.get(subject) ?? new Set<string>();
    if (present) memberships.add(organization); else memberships.delete(organization);
    this.memberships.set(subject, memberships);
  }

  authorize(token: string, input: {
    organization: string;
    admin?: boolean;
    roleAllowed?: boolean;
    clientEntitled?: boolean;
    requireExternalProvider?: boolean;
  }) {
    const session = this.sessions.get(token);
    if (!session || !this.sessionActive(token)) return false;
    if (!this.memberships.get(session.subject)?.has(input.organization)) return false;
    if (input.admin === false || input.roleAllowed === false || input.clientEntitled === false) return false;
    if (input.requireExternalProvider && (!session.external || !session.providerConnected)) return false;
    return true;
  }

  consume(adapter: "entitlement" | "revocation", event: IntegrationEvent) {
    if (!this.subscriptions.has(event.subject)) return "not_subscribed" as const;
    const eventKey = `${adapter}:${event.id}`;
    if (this.events.has(eventKey)) return "duplicate" as const;
    this.events.add(eventKey);
    this.correlations.set(eventKey, event.correlationId);
    const orderKey = `${adapter}:${event.subject}`;
    if (event.sequence <= (this.sequence.get(orderKey) ?? -1)) return "out_of_order" as const;
    this.sequence.set(orderKey, event.sequence);
    if (adapter === "entitlement") {
      if (typeof event.data.active !== "boolean") throw new Error("invalid_entitlement");
      this.entitlement.set(event.subject, {
        active: event.data.active,
        plan: typeof event.data.plan === "string" ? event.data.plan : undefined,
        sequence: event.sequence,
      });
    } else {
      this.revocation.set(event.subject, {
        revokedBefore: typeof event.data.revoked_before === "string" ? event.data.revoked_before : undefined,
        sequence: event.sequence,
        correlationId: event.correlationId,
      });
      this.logoutAll(event.subject);
    }
    return "accepted" as const;
  }

  private hash(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}