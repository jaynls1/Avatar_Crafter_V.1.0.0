import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { SessionData } from "./auth";
import {
  browserAuthorizationParameters,
  callbackCredentials,
  logoutBoundary,
  legacySessionCompatibility,
  mobileGrantChecks,
  safeReturnTo,
  shouldRefreshProvider,
} from "./oidcBoundary";

describe("Replit OIDC invocation boundary", () => {
  test("browser authorization uses PKCE S256, state, nonce, and offline access", () => {
    const parameters = browserAuthorizationParameters({
      callbackUrl: "https://app.test/api/callback",
      state: "fake-state",
      nonce: "fake-nonce",
      codeChallenge: "fake-challenge",
    });
    assert.equal(parameters.code_challenge_method, "S256");
    assert.equal(parameters.code_challenge, "fake-challenge");
    assert.equal(parameters.state, "fake-state");
    assert.equal(parameters.nonce, "fake-nonce");
    assert.match(parameters.scope, /(?:^| )offline_access(?: |$)/);
  });

  test("callback refuses a missing verifier or state", () => {
    assert.equal(callbackCredentials({ expectedState: "state" }), null);
    assert.equal(callbackCredentials({ codeVerifier: "verifier" }), null);
  });

  test("callback grant receives exact verifier, state, nonce and ID-token requirement", () => {
    assert.deepEqual(callbackCredentials({
      codeVerifier: "fake-verifier", expectedState: "fake-state", nonce: "fake-nonce",
    }), {
      pkceCodeVerifier: "fake-verifier",
      expectedNonce: "fake-nonce",
      expectedState: "fake-state",
      idTokenExpected: true,
    });
  });

  test("mobile grant retains the same validation boundary", () => {
    assert.deepEqual(mobileGrantChecks({
      codeVerifier: "mobile-verifier", state: "mobile-state", nonce: "mobile-nonce",
    }), {
      pkceCodeVerifier: "mobile-verifier",
      expectedNonce: "mobile-nonce",
      expectedState: "mobile-state",
      idTokenExpected: true,
    });
  });

  test("unsafe return URLs are rejected", () => {
    assert.equal(safeReturnTo("https://evil.test"), "/");
    assert.equal(safeReturnTo("//evil.test/path"), "/");
    assert.equal(safeReturnTo("/portal"), "/portal");
  });

  test("tokenless external local sessions never invoke provider refresh", () => {
    const tokenless = {
      user: { id: "fake-local-user" },
      expires_at: 1,
    } as SessionData;
    assert.equal(shouldRefreshProvider(tokenless, 2), false);
    assert.equal(shouldRefreshProvider({ ...tokenless, refresh_token: "fake-refresh" }, 2), true);
  });

  test("local logout stays separate from browser provider logout", () => {
    assert.deepEqual(logoutBoundary("browser-oidc"), { clearLocal: true, endProviderSession: true });
    assert.deepEqual(logoutBoundary("mobile-local"), { clearLocal: true, endProviderSession: false });
    assert.deepEqual(logoutBoundary("external-local"), { clearLocal: true, endProviderSession: false });
  });

  test("legacy serialized sessions are opt-in only", () => {
    assert.equal(legacySessionCompatibility({}), false);
    assert.equal(legacySessionCompatibility({ REPLIT_LEGACY_SESSION_COMPAT: "false" }), false);
    assert.equal(legacySessionCompatibility({ REPLIT_LEGACY_SESSION_COMPAT: "true" }), true);
  });
});