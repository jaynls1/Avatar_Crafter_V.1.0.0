import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedCorsOrigins, credentialedCorsOptions } from "./corsPolicy";

test("explicit origins only; invalid and unconfigured values fail closed", () => {
  const origins = allowedCorsOrigins({ APP_ALLOWED_ORIGINS: "https://hq.example, https://welcome.example,*,https://hq.example/path,http://bad.example/" } as NodeJS.ProcessEnv);
  assert.deepEqual([...origins].sort(), ["https://hq.example", "https://welcome.example"]);
  assert.equal(allowedCorsOrigins({} as NodeJS.ProcessEnv).size, 0);
});

test("credentialed CORS rejects unknown and null browser origins", async () => {
  const policy = credentialedCorsOptions({ APP_ALLOWED_ORIGINS: "https://hq.example" } as NodeJS.ProcessEnv);
  assert.equal(policy.credentials, true);
  assert.equal(typeof policy.origin, "function");
  const check = (origin: string | undefined) => new Promise<boolean>((resolve, reject) => {
    (policy.origin as Function)(origin, (err: Error | null, allowed: boolean) => err ? reject(err) : resolve(allowed));
  });
  assert.equal(await check("https://hq.example"), true);
  assert.equal(await check("https://evil.example"), false);
  assert.equal(await check(undefined), false);
});
