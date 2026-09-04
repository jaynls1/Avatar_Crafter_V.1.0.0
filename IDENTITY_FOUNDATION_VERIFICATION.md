# NEXT Identity Foundation — Offline Verification Report

## Review status

- **Status:** Ready for offline Rook review
- **Branch:** `identity-foundation-next-v1`
- **Implementation commit:** `4007f9babacb86916d2f8185f41f6b612c17a935`
- **Original verification commit:** `2dd021140eb6742a48ca6bafa388cd06ffce256a`
- **Hardening/CI remediation commit:** `beb6f0cbbf36d63906e46ed997c22a26f59dd57a`
- **Contract:** `next.identity.v1`
- **Required audience:** `avatar-crafter`
- **Production/member activation:** **Not authorized and not performed**

The final architecture review found no remaining blocker or high-severity issue
within the authorized offline scope.

## Authorization boundary

This package is destination-side foundation code only. It does not connect to
WordPress, Secure Shark, Memory Blueprint, FluentCart, or FluentCommunity.

The following adapters remain disabled unless their corresponding environment
value is set to the exact lowercase string `true`:

- `NEXT_IDENTITY_V1_ENABLED`
- `NEXT_ENTITLEMENT_V1_ENABLED`
- `NEXT_REVOCATION_V1_ENABLED`

No activation values, provider credentials, trust keys, destination URLs,
service-principal secrets, memberships, or entitlements were added.

Additional compatibility paths are also disabled by default:

- Legacy office shared key: `ENABLE_LEGACY_OFFICE_ADMIN_KEY`
- Legacy serialized sessions: `REPLIT_LEGACY_SESSION_COMPAT`

## Implemented foundation

### Identity handoff

- Avatar Crafter creates a short-lived destination transaction.
- Destination selection uses an exact registered key and a safe stored return
  mapping; callers cannot submit return URLs.
- Transaction and state are kept in a `Secure`, `HttpOnly`, `SameSite=Lax`
  cookie and stored only as hashes.
- The browser receives only a registered authorization URL and request ID.
- The registered URL receives short-lived transaction and nonce correlation
  values, not identity, email, entitlement, cookie, app session, or provider
  credentials.
- Completion requires an active named service principal with the server-stored
  `identity.complete` capability.
- `next.identity.v1` assertions are asymmetrically verified for algorithm,
  key ID, rotating-key validity, issuer, `avatar-crafter` audience,
  destination, transaction nonce, issued/not-before/expiry bounds, lifetime,
  and assertion-ID replay.
- Finish atomically consumes the completed transaction once, sets a fresh
  opaque local session cookie and signed CSRF cookie, and redirects only to the
  stored safe path.

### Identity and sessions

- External identity is mapped by `(issuer, stable subject)` to a minimal local
  user with no assertion PII persisted.
- External assertions cannot grant administrator status, roles, capabilities,
  or client-supplied entitlements.
- Replit OIDC remains a separate authorization-code/PKCE provider and now
  records its issuer-qualified mapping without granting membership or
  entitlement.
- Local session secrets are high-entropy and stored only as hashes.
- Provider access and refresh tokens are stored separately from local session
  identity.
- External users do not require Replit provider tokens.
- Session families, versions, atomic compare-and-set rotation, logout-all,
  provider connection state, and back-channel revocation primitives exist.
- Session families are bound to the exact issuer and subject that established
  them. Linked identities cannot borrow one another's membership, entitlement,
  or revocation state.
- Legacy serialized sessions are rejected unless explicitly enabled for a
  controlled migration window.

### Entitlement and revocation consumers

- Disabled offline consumers exist for `next.entitlement.v1` and
  `next.revocation.v1`.
- Signed event claims are bound to the canonical event body digest, issuer,
  subject, event ID, sequence, timestamp, nonce, destination, audience, and
  correlation ID.
- Idempotency and ordering are issuer-qualified.
- Subscription filtering is fail-closed.
- Persisted entitlement state is normalized to
  `(issuer, subject, entitlement code, active, sequence/version, timestamps)`.
- Raw provider payloads and customer memory are not stored.
- Revocation and membership removal can deny a protected capability while the
  browser session itself still exists.

### Authorization and office controls

- Public policy surfaces: entrance, About, biographies, agent roster, and
  explicitly limited demos.
- Protected policy surfaces: conversations, private memory, projects when a
  project route is added, operational agent tools, purchased-office entry, and
  administrative operations.
- Protected requests re-resolve issuer-qualified provider connection,
  membership, normalized entitlement, session version, and effective
  revocation state from the server.
- Conversation ownership remains member-specific; Member A cannot read or
  write Member B's conversation.
- Purchased office entry requires `office:<slug>`.
- Office mutation requires either a database-authenticated administrator or an
  active named service principal with `offices:manage`.
- The former shared admin-key path remains source-compatible but disabled.
- Rook remains publicly visible as a biography/trust guide. Public visibility
  grants no Rook security-administration capability.

### Defensive controls

- Generic identity-integration error envelopes include request IDs.
- Security audit details are allowlisted and sensitive values are redacted.
- Handoff, event, and access decisions carry request/correlation identifiers.
- Credentialed CORS and integration-origin checks use exact configured origins;
  route-local wildcard overrides were removed.
- Cookie-authenticated integration requests use a server-issued, SID-bound,
  signed double-submit CSRF token with constant-time verification.
- The optional rate limiter uses one atomic PostgreSQL fixed-window bucket
  across instances and stores only keyed hashes of client keys.
- Rate limiting has no process-local fallback. It stays disabled without exact
  opt-in and fails closed when explicitly enabled with invalid configuration.
- Integration routes retain replay defenses and strict input limits.

## Verification results

### Automated tests

Command:

```text
pnpm --filter @workspace/api-server run test:identity
```

Result:

```text
tests 40
suites 7
pass 40
fail 0
cancelled 0
skipped 0
todo 0
```

All cryptographic identities and keys used by tests are generated fake data.
The suite covers:

- Replit OIDC PKCE/state/nonce invocation boundaries with mocks
- Valid, expired, wrong-audience, wrong-destination, and wrong-nonce assertions
- Unsupported/unknown keys and overlapping public-key rotation
- Key activation/retirement and assertion freshness
- Exact destination registry and safe return mapping
- HttpOnly transaction/state correlation and single use
- Assertion replay rejection
- Session rotation races and logout-all
- Membership removal while a browser session remains
- Provider-disconnected enforcement
- Entitlement grant/removal and effective revocation
- Signed-event body tampering
- Issuer isolation and same event IDs from different issuers
- Adapter default-off behavior
- Route policy classification and administrator-input rejection
- Purchased-office entitlement scoping
- Named service identity requirements
- Member A versus Member B conversation isolation
- Audit redaction
- Legacy session default-off behavior
- Durable limiter opt-in, invalid-configuration, and key-privacy behavior
- Exact credentialed CORS origin parsing

### Disposable PostgreSQL and HTTP tests

Command:

```text
TEST_DATABASE_URL=<disposable-local-url> \
  pnpm --filter @workspace/api-server run test:identity:postgres
```

Result:

```text
tests 6
suites 1
pass 6
fail 0
cancelled 0
skipped 0
todo 0
```

The test database was a PostgreSQL 16 cluster created under `/tmp`, bound to a
dedicated local port, used only through `TEST_DATABASE_URL`, and destroyed after
the run. The configured Replit database was not accessed.

The suite applies both forward migrations twice and covers:

- Migration idempotency
- Concurrent identity completion and finish with exactly one winner
- Real opaque session and cookie boundaries over Express HTTP
- Membership removal and entitlement denial on an existing session
- Protected-office entry
- Member A/Member B conversation isolation
- One local user linked to multiple issuers without authorization crossover
- Issuer-scoped revocation that invalidates issuer A while issuer B remains
  active and authorized
- Signed entitlement and revocation events, replay state, and audit redaction
- Atomic rate limiting shared by two repository instances
- Origin rejection, server-issued CSRF success, forged CSRF rejection,
  malformed-body handling, request IDs, `Retry-After`, and fail-closed limiter
- Approved and rejected credentialed CORS preflight behavior

### Builds

All builds were run offline without starting a workflow:

- `@workspace/api-server` — **PASS**
- `@workspace/office-3d` — **PASS**
- `@workspace/avatar-world` — **PASS**
- `@workspace/portal` — **PASS**
- `@workspace/mockup-sandbox` — **PASS**

The Vite builds initially rejected the shell environment because their configs
require workflow-provided `PORT`. They then passed with temporary build-only
`PORT` and artifact `BASE_PATH` values. No server was started.

Office 3D and Avatar World emitted existing large-chunk warnings.

### Typechecks and clean dependency resolution

- `pnpm install --offline --frozen-lockfile` — **PASS**
- `pnpm run typecheck` — **PASS**
- `@workspace/api-server` — **PASS**
- `@workspace/office-3d` — **PASS**
- `@workspace/avatar-world` — **PASS**
- `@workspace/portal` — **PASS**
- `@workspace/mockup-sandbox` — **PASS**
- `pnpm exec tsc -b Avatar-Crafter-1/tsconfig.json --pretty false --force` —
  **PASS**

Composite libraries are force-built before artifact typechecks so a clean
checkout cannot reuse stale generated declarations.

### Security scans

- Dependency audit: 22 critical, 49 high, 26 moderate, 8 low advisories. This
  pre-existing dependency/tooling backlog remains assigned to task #82 and was
  not duplicated in this remediation.
- Static analysis: 5 medium, 0 high, 0 critical findings. The reviewed medium
  findings are conservative redirect/session-cookie detections around validated
  paths and server-generated opaque values.
- Privacy/dataflow scan: 0 findings.
- Independent final architecture/security review: **PASS**, no release blocker
  within the offline Identity Foundation scope.

### Hosted CI

`.github/workflows/ci.yml` now defines:

- Frozen clean install
- Forced shared declaration build and complete workspace typecheck
- Unit, route-matrix, and legacy project-reference checks
- All artifact builds with explicit non-production adapter settings
- PostgreSQL 16 service tests using fake CI-only credentials
- Redacted committed-secret scanning

Hosted results are recorded after the authorized branch push.

## Offline and data-safety confirmation

- No workflow was started or restarted.
- No application public URL was called.
- No live service was contacted.
- No external identity, payment, membership, or entitlement integration was
  connected.
- No production credential or secret was added or read.
- No migration was executed against a configured database.
- Both migrations were executed only against the destroyed disposable
  PostgreSQL cluster described above.
- No live record was created, changed, or deleted.
- No member access was activated.
- No deployment or publication occurred.

The migrations at `lib/db/drizzle/0000_offline_identity_foundation.sql` and
`lib/db/drizzle/0001_durable_integration_rate_limits.sql` remain unapplied to
configured development and production databases.

## Compatibility notes

- Existing Replit OIDC login/callback/mobile/logout behavior remains available.
- Newly issued Replit sessions use the local session model and separately
  stored provider credentials.
- Replit identity mapping alone does not grant protected access; a trusted
  membership and matching server-side entitlement are still required.
- Existing legacy serialized sessions will not be accepted by default after
  this source is activated. A temporary explicit compatibility flag exists,
  but activation was not authorized.
- Existing office reads remain public directory data, while entry URLs move
  behind normalized office entitlements.
- Legacy office shared-key mutation is retained only for disabled compatibility
  testing.
- No projects API currently exists; the authorization matrix reserves its
  protected policy for a future route.

## Limitations before any activation

- No real issuer keys, destination registrations, service principals,
  subscriptions, memberships, or entitlements exist.
- The durable limiter remains disabled until approved configuration is supplied.
- No cross-system logout or revocation delivery has been connected.
- Existing dependency advisories remain tracked separately in task #82.
- OIDC callback-origin construction still depends on Replit proxy headers;
  constrain it to an explicit canonical origin before activation.
- Route-owned startup DDL remains a separate migration-hardening follow-up
  (task #99).
- Runtime preview was intentionally not started.

## Rollback instructions

### Before merge or activation

Switch away from or delete the feature branch. The preserved implementation and
hardening commits are:

```text
4007f9babacb86916d2f8185f41f6b612c17a935
beb6f0cbbf36d63906e46ed997c22a26f59dd57a
```

### If the source commit is merged

Create normal revert commits in reverse order for the verification/remediation
and implementation commits. Do not rewrite shared history.

### Database

No configured-database rollback is currently required because neither migration
was run outside the destroyed disposable cluster.

If a future authorized disposable-environment review applies the migration,
take a backup before rollback and remove only the new identity-foundation
tables in reverse dependency order:

1. `integration_rate_limit_buckets`
2. Remove only the identity-binding columns added to `session_families`
3. `security_audit`
4. `revocation_state`
5. `entitlement_state`
6. `integration_events`
7. `identity_memberships`
8. `service_principals`
9. `identity_handoffs`
10. `external_identities`
11. `provider_tokens`
12. `local_sessions`
13. `session_families`

Do not drop `users` or the existing legacy `sessions` table.

## Rook review gate

Rook review may evaluate this branch and commit offline. Production credentials,
database migration, provider connection, member activation, publication, and
deployment each require a separate explicit authorization.