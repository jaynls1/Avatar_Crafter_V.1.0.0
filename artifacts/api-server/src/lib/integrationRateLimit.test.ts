import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  loadRateLimitConfiguration,
  rateLimitKeyHash,
} from "./integrationRateLimit";
import { allowedCorsOrigins, credentialedCorsOptions } from "./corsPolicy";

describe("durable integration rate-limit configuration", () => {
  test("is disabled until explicitly approved", () => {
    assert.deepEqual(loadRateLimitConfiguration({}), { state: "disabled" });
    assert.deepEqual(
      loadRateLimitConfiguration({
        NEXT_DURABLE_RATE_LIMIT_ENABLED: "TRUE",
        NEXT_DURABLE_RATE_LIMIT_MAX_REQUESTS: "10",
        NEXT_DURABLE_RATE_LIMIT_WINDOW_SECONDS: "60",
        NEXT_DURABLE_RATE_LIMIT_HASH_KEY: "x".repeat(32),
      }),
      { state: "disabled" },
    );
  });

  test("fails closed when explicitly enabled with incomplete configuration", () => {
    assert.deepEqual(
      loadRateLimitConfiguration({
        NEXT_DURABLE_RATE_LIMIT_ENABLED: "true",
        NEXT_DURABLE_RATE_LIMIT_MAX_REQUESTS: "0",
        NEXT_DURABLE_RATE_LIMIT_WINDOW_SECONDS: "60",
        NEXT_DURABLE_RATE_LIMIT_HASH_KEY: "short",
      }),
      { state: "invalid" },
    );
  });

  test("accepts bounded configuration and hashes client keys", () => {
    const hashKey = "test-only-hmac-key-material-32-bytes";
    assert.deepEqual(
      loadRateLimitConfiguration({
        NEXT_DURABLE_RATE_LIMIT_ENABLED: "true",
        NEXT_DURABLE_RATE_LIMIT_MAX_REQUESTS: "30",
        NEXT_DURABLE_RATE_LIMIT_WINDOW_SECONDS: "60",
        NEXT_DURABLE_RATE_LIMIT_HASH_KEY: hashKey,
      }),
      { state: "enabled", limit: 30, windowSeconds: 60, hashKey },
    );
    const digest = rateLimitKeyHash(hashKey, "127.0.0.1\n/identity/start");
    assert.match(digest, /^[a-f0-9]{64}$/);
    assert.equal(digest.includes("127.0.0.1"), false);
  });

  test("allows only configured exact HTTP origins", () => {
    const origins = allowedCorsOrigins({
      APP_ALLOWED_ORIGINS: "https://portal.example.test,invalid",
      NEXT_ALLOWED_ORIGINS: "http://localhost:5173,https://bad.test/path",
    });
    assert.deepEqual(
      [...origins],
      ["https://portal.example.test", "http://localhost:5173"],
    );
    const options = credentialedCorsOptions({
      APP_CANONICAL_ORIGIN: "https://app.example.test",
    });
    assert.equal(options.credentials, true);
  });
});