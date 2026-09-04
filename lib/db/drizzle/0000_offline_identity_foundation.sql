CREATE TABLE IF NOT EXISTS "session_families" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "version" integer NOT NULL DEFAULT 1,
  "revoked_at" timestamptz,
  "revoke_reason" varchar(128),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "local_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "secret_hash" varchar(64) NOT NULL,
  "family_id" varchar NOT NULL REFERENCES "session_families"("id") ON DELETE CASCADE,
  "family_version" integer NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "version" integer NOT NULL DEFAULT 1,
  "expires_at" timestamptz NOT NULL,
  "rotated_at" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_seen_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "local_sessions_secret_hash_idx" ON "local_sessions" ("secret_hash");
CREATE INDEX IF NOT EXISTS "local_sessions_user_idx" ON "local_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "local_sessions_family_idx" ON "local_sessions" ("family_id");
CREATE TABLE IF NOT EXISTS "provider_tokens" (
  "session_id" varchar PRIMARY KEY REFERENCES "local_sessions"("id") ON DELETE CASCADE,
  "provider" varchar(64) NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "expires_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "external_identities" (
  "issuer" varchar(512) NOT NULL,
  "subject" varchar(512) NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider_connected" boolean NOT NULL DEFAULT true,
  "provider_version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_seen_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("issuer", "subject")
);
CREATE INDEX IF NOT EXISTS "external_identities_user_idx" ON "external_identities" ("user_id");
CREATE TABLE IF NOT EXISTS "identity_handoffs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "secret_hash" varchar(64) NOT NULL,
  "issuer" varchar(512) NOT NULL,
  "subject" varchar(512) NOT NULL,
  "destination" varchar(256) NOT NULL,
  "nonce_hash" varchar(64) NOT NULL,
  "state_hash" varchar(64) NOT NULL,
  "return_to_key" varchar(128) NOT NULL DEFAULT 'default',
  "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "assertion_id" varchar(512),
  "claims" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "service_principals" (
  "id" varchar(128) PRIMARY KEY,
  "secret_hash" varchar(64) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "rotated_at" timestamptz
);
CREATE TABLE IF NOT EXISTS "identity_memberships" (
  "issuer" varchar(512) NOT NULL,
  "subject" varchar(512) NOT NULL,
  "organization" varchar(256) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "version" integer NOT NULL DEFAULT 1,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("issuer", "subject", "organization")
);
CREATE UNIQUE INDEX IF NOT EXISTS "identity_handoffs_secret_hash_idx" ON "identity_handoffs" ("secret_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "identity_handoffs_assertion_id_idx" ON "identity_handoffs" ("issuer", "assertion_id");
CREATE INDEX IF NOT EXISTS "identity_handoffs_expire_idx" ON "identity_handoffs" ("expires_at");
CREATE TABLE IF NOT EXISTS "integration_events" (
  "adapter" varchar(64) NOT NULL,
  "issuer" varchar(512) NOT NULL,
  "event_id" varchar(512) NOT NULL,
  "subject" varchar(512) NOT NULL,
  "sequence" bigint NOT NULL,
  "correlation_id" varchar(256),
  "received_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("adapter", "issuer", "event_id")
);
CREATE INDEX IF NOT EXISTS "integration_events_order_idx" ON "integration_events" ("adapter", "issuer", "subject", "sequence");
CREATE TABLE IF NOT EXISTS "entitlement_state" (
  "issuer" varchar(512) NOT NULL,
  "subject" varchar(512) NOT NULL,
  "code" varchar(256) NOT NULL,
  "active" boolean NOT NULL DEFAULT false,
  "sequence" bigint NOT NULL,
  "source_updated_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("issuer", "subject", "code")
);
CREATE TABLE IF NOT EXISTS "revocation_state" (
  "subject" varchar(512) PRIMARY KEY,
  "revoked_before" timestamptz,
  "session_version" integer,
  "sequence" bigint NOT NULL,
  "source_updated_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "security_audit" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" varchar(128) NOT NULL,
  "event" varchar(128) NOT NULL,
  "actor_hash" varchar(64),
  "correlation_id" varchar(256),
  "outcome" varchar(32) NOT NULL,
  "detail" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);