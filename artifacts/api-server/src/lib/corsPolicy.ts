import type { CorsOptions } from "cors";

export function allowedCorsOrigins(
  env: NodeJS.ProcessEnv = process.env,
): ReadonlySet<string> {
  return new Set(
    [
      env.APP_CANONICAL_ORIGIN,
      env.APP_ALLOWED_ORIGINS,
      env.NEXT_ALLOWED_ORIGINS,
    ]
      .flatMap((value) => value?.split(",") ?? [])
      .map((value) => value.trim())
      .filter((value) => {
        try {
          const url = new URL(value);
          return (url.protocol === "https:" || url.protocol === "http:") &&
            url.origin === value;
        } catch {
          return false;
        }
      }),
  );
}

export function credentialedCorsOptions(
  env: NodeJS.ProcessEnv = process.env,
): CorsOptions {
  const origins = allowedCorsOrigins(env);
  return {
    credentials: true,
    origin(origin, callback) {
      callback(null, origin ? origins.has(origin) : false);
    },
  };
}