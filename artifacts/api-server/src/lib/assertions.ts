import crypto from "node:crypto";

type PublicJwk = Record<string, unknown> & {
  kid: string;
  alg?: string;
  notBefore?: number;
  expiresAt?: number;
};

export type AssertionClaims = {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  nonce: string;
  destination: string;
  [key: string]: unknown;
};

export type TrustedIssuer = {
  issuer: string;
  audiences: string[];
  destinations: string[];
  algorithms: string[];
  keys: PublicJwk[];
};

export class AssertionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

const allowedAlgorithms = new Set(["RS256", "PS256", "ES256", "EdDSA"]);

function decodePart(value: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new AssertionError("malformed_assertion");
  }
}

export function loadTrustedIssuers(raw = process.env.NEXT_IDENTITY_TRUST_CONFIG): TrustedIssuer[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("NEXT_IDENTITY_TRUST_CONFIG must be valid JSON");
  }
  if (!Array.isArray(value)) throw new Error("NEXT_IDENTITY_TRUST_CONFIG must be an array");
  return value as TrustedIssuer[];
}

export function verifyIdentityAssertion(
  compact: string,
  expected: { audience: string; destination: string; nonce?: string; now?: number },
  issuers = loadTrustedIssuers(),
): AssertionClaims {
  const parts = compact.split(".");
  if (parts.length !== 3) throw new AssertionError("malformed_assertion");
  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]) as AssertionClaims;
  const alg = typeof header.alg === "string" ? header.alg : "";
  const kid = typeof header.kid === "string" ? header.kid : "";
  if (!allowedAlgorithms.has(alg) || !kid) throw new AssertionError("unsupported_assertion_key");
  if (typeof claims.iss !== "string" || typeof claims.sub !== "string") {
    throw new AssertionError("invalid_assertion_claims");
  }
  const issuer = issuers.find((item) => item.issuer === claims.iss);
  if (!issuer || !issuer.algorithms.includes(alg)) throw new AssertionError("untrusted_issuer");
  if (!issuer.audiences.includes(expected.audience)) throw new AssertionError("invalid_audience");
  if (!issuer.destinations.includes(expected.destination)) throw new AssertionError("invalid_destination");
  const key = issuer.keys.find((item) => item.kid === kid && (!item.alg || item.alg === alg));
  const now = expected.now ?? Math.floor(Date.now() / 1000);
  if (!key || (key.notBefore != null && now < key.notBefore) || (key.expiresAt != null && now >= key.expiresAt)) {
    throw new AssertionError("unknown_assertion_key");
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(expected.audience)) throw new AssertionError("invalid_audience");
  if (claims.destination !== expected.destination) throw new AssertionError("invalid_destination");
  if (typeof claims.nonce !== "string" || (expected.nonce !== undefined && claims.nonce !== expected.nonce)) {
    throw new AssertionError("invalid_nonce");
  }
  if (!Number.isSafeInteger(claims.exp) || claims.exp <= now) throw new AssertionError("expired_assertion");
  if (claims.nbf != null && (!Number.isSafeInteger(claims.nbf) || claims.nbf > now + 30)) {
    throw new AssertionError("assertion_not_active");
  }
  if (claims.iat != null && (!Number.isSafeInteger(claims.iat) || claims.iat > now + 30)) {
    throw new AssertionError("invalid_assertion_time");
  }
  if (claims.exp > now + 600) throw new AssertionError("assertion_lifetime_too_long");

  let publicKey: crypto.KeyObject;
  try {
    if (key.kty === "oct" || (key as Record<string, unknown>).d) throw new Error("not public");
    publicKey = crypto.createPublicKey({ key, format: "jwk" } as never);
  } catch {
    throw new AssertionError("invalid_assertion_key");
  }
  const options: crypto.VerifyKeyObjectInput = { key: publicKey };
  if (alg === "ES256") options.dsaEncoding = "ieee-p1363";
  if (alg === "PS256") {
    options.padding = crypto.constants.RSA_PKCS1_PSS_PADDING;
    options.saltLength = 32;
  }
  const digest = alg === "EdDSA" ? null : "sha256";
  const valid = crypto.verify(
    digest,
    Buffer.from(`${parts[0]}.${parts[1]}`),
    options,
    Buffer.from(parts[2], "base64url"),
  );
  if (!valid) throw new AssertionError("invalid_assertion_signature");
  return claims;
}
