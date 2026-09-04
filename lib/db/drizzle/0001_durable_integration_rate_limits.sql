ALTER TABLE "session_families"
  ADD COLUMN IF NOT EXISTS "identity_issuer" varchar(512);

ALTER TABLE "session_families"
  ADD COLUMN IF NOT EXISTS "identity_subject" varchar(512);

CREATE TABLE IF NOT EXISTS "integration_rate_limit_buckets" (
  "scope" varchar(128) NOT NULL,
  "key_hash" varchar(64) NOT NULL,
  "window_start" timestamptz NOT NULL,
  "count" integer NOT NULL DEFAULT 1,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("scope", "key_hash", "window_start"),
  CONSTRAINT "integration_rate_limit_buckets_count_positive" CHECK ("count" > 0)
);

CREATE INDEX IF NOT EXISTS "integration_rate_limit_buckets_updated_idx"
  ON "integration_rate_limit_buckets" ("updated_at");