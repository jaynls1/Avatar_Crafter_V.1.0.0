import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const sessionFamiliesTable = pgTable("session_families", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokeReason: varchar("revoke_reason", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const localSessionsTable = pgTable(
  "local_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    secretHash: varchar("secret_hash", { length: 64 }).notNull(),
    familyId: varchar("family_id").notNull().references(() => sessionFamiliesTable.id, { onDelete: "cascade" }),
    familyVersion: integer("family_version").notNull(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("local_sessions_secret_hash_idx").on(table.secretHash),
    index("local_sessions_user_idx").on(table.userId),
    index("local_sessions_family_idx").on(table.familyId),
  ],
);

/** Provider credentials are deliberately outside local session payloads. */
export const providerTokensTable = pgTable("provider_tokens", {
  sessionId: varchar("session_id").primaryKey().references(() => localSessionsTable.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 64 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const externalIdentitiesTable = pgTable(
  "external_identities",
  {
    issuer: varchar("issuer", { length: 512 }).notNull(),
    subject: varchar("subject", { length: 512 }).notNull(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    providerConnected: boolean("provider_connected").notNull().default(true),
    providerVersion: integer("provider_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.issuer, table.subject] }),
    index("external_identities_user_idx").on(table.userId),
  ],
);

export const identityHandoffsTable = pgTable(
  "identity_handoffs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    secretHash: varchar("secret_hash", { length: 64 }).notNull(),
    issuer: varchar("issuer", { length: 512 }).notNull(),
    subject: varchar("subject", { length: 512 }).notNull(),
    destination: varchar("destination", { length: 256 }).notNull(),
    nonceHash: varchar("nonce_hash", { length: 64 }).notNull(),
    stateHash: varchar("state_hash", { length: 64 }).notNull(),
    returnToKey: varchar("return_to_key", { length: 128 }).notNull().default("default"),
    userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    assertionId: varchar("assertion_id", { length: 512 }),
    claims: jsonb("claims").notNull().default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("identity_handoffs_secret_hash_idx").on(table.secretHash),
    uniqueIndex("identity_handoffs_assertion_id_idx").on(table.issuer, table.assertionId),
    index("identity_handoffs_expire_idx").on(table.expiresAt),
  ],
);

export const servicePrincipalsTable = pgTable("service_principals", {
  id: varchar("id", { length: 128 }).primaryKey(),
  secretHash: varchar("secret_hash", { length: 64 }).notNull(),
  active: boolean("active").notNull().default(true),
  capabilities: jsonb("capabilities").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
});

export const membershipsTable = pgTable(
  "identity_memberships",
  {
    issuer: varchar("issuer", { length: 512 }).notNull(),
    subject: varchar("subject", { length: 512 }).notNull(),
    organization: varchar("organization", { length: 256 }).notNull(),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.issuer, table.subject, table.organization] })],
);

export const integrationEventsTable = pgTable(
  "integration_events",
  {
    adapter: varchar("adapter", { length: 64 }).notNull(),
    issuer: varchar("issuer", { length: 512 }).notNull(),
    eventId: varchar("event_id", { length: 512 }).notNull(),
    subject: varchar("subject", { length: 512 }).notNull(),
    sequence: bigint("sequence", { mode: "number" }).notNull(),
    correlationId: varchar("correlation_id", { length: 256 }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.adapter, table.issuer, table.eventId] }),
    index("integration_events_order_idx").on(table.adapter, table.issuer, table.subject, table.sequence),
  ],
);

export const entitlementStateTable = pgTable("entitlement_state", {
  issuer: varchar("issuer", { length: 512 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  code: varchar("code", { length: 256 }).notNull(),
  active: boolean("active").notNull().default(false),
  sequence: bigint("sequence", { mode: "number" }).notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.issuer, table.subject, table.code] })]);

export const revocationStateTable = pgTable("revocation_state", {
  subject: varchar("subject", { length: 512 }).primaryKey(),
  revokedBefore: timestamp("revoked_before", { withTimezone: true }),
  sessionVersion: integer("session_version"),
  sequence: bigint("sequence", { mode: "number" }).notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const securityAuditTable = pgTable("security_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id", { length: 128 }).notNull(),
  event: varchar("event", { length: 128 }).notNull(),
  actorHash: varchar("actor_hash", { length: 64 }),
  correlationId: varchar("correlation_id", { length: 256 }),
  outcome: varchar("outcome", { length: 32 }).notNull(),
  detail: jsonb("detail").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
