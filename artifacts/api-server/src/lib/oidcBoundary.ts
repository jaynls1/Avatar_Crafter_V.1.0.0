import type { SessionData } from "./auth";

export function safeReturnTo(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export function browserAuthorizationParameters(input: {
  callbackUrl: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  return {
    redirect_uri: input.callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256" as const,
    prompt: "login consent",
    state: input.state,
    nonce: input.nonce,
  };
}

export function callbackCredentials(input: {
  codeVerifier?: string;
  expectedState?: string;
  nonce?: string;
}) {
  if (!input.codeVerifier || !input.expectedState) return null;
  return {
    pkceCodeVerifier: input.codeVerifier,
    expectedNonce: input.nonce,
    expectedState: input.expectedState,
    idTokenExpected: true as const,
  };
}

export function mobileGrantChecks(input: {
  codeVerifier: string;
  state: string;
  nonce?: string | null;
}) {
  return {
    pkceCodeVerifier: input.codeVerifier,
    expectedNonce: input.nonce ?? undefined,
    expectedState: input.state,
    idTokenExpected: true as const,
  };
}

/** Tokenless/external local sessions never cross the provider refresh boundary. */
export function shouldRefreshProvider(session: SessionData, nowSeconds: number) {
  return Boolean(
    session.expires_at && nowSeconds > session.expires_at && session.refresh_token,
  );
}

export function logoutBoundary(kind: "browser-oidc" | "mobile-local" | "external-local") {
  return { clearLocal: true, endProviderSession: kind === "browser-oidc" };
}

export function legacySessionCompatibility(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.REPLIT_LEGACY_SESSION_COMPAT === "true";
}