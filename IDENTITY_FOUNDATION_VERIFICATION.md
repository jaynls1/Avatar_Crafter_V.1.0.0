# NEXT Identity Foundation — Offline Verification Report

## Review status

- **Status:** Ready for offline Rook review
- **Branch:** `identity-foundation-next-v1`
- **Implementation commit:** `4007f9babacb86916d2f8185f41f6b612c17a935`
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
  opaque local session cookie, and redirects only to the stored safe path.

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
- New integration routes have origin checks, cookie-aware CSRF checks,
  short-window rate limiting, replay defenses, and strict input limits.

## Verification results

### Automated tests

Command:

```text
pnpm --filter @workspace/api-server run test:identity
```

Result:

```text
tests 36
suites 6
pass 36
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

### Builds

All builds were run offline without starting a workflow:

- `@workspace/api-server` — **PASS**
- `@workspace/office-3d` — **PASS**
- `@workspace/avatar-world` — **PASS**
- `@workspace/portal` — **PASS**

The Vite builds initially rejected the shell environment because their configs
require workflow-provided `PORT`. They then passed with temporary build-only
`PORT` and artifact `BASE_PATH` values. No server was started.

Office 3D and Avatar World emitted existing large-chunk warnings.

### Typechecks

- `pnpm exec tsc -b lib/db lib/api-zod` — **PASS**
- API identity/auth/session/authorization changed files — no reported local
  type errors
- `@workspace/api-server` full typecheck — **BLOCKED** by two existing
  `TS6305` errors for the unbuilt
  `@workspace/integrations-openai-ai-server` declaration
- Workspace root typecheck — **BLOCKED** by ten existing shared-library errors
  involving Vite `ImportMeta`, Node typings, `p-retry`, nullable image data,
  and React typings
- Office 3D typecheck — **BLOCKED** by 119 existing UI dependency/type errors
- Avatar World typecheck — **BLOCKED** by one existing non-composite project
  reference
- Portal typecheck — **BLOCKED** by three existing speech-recognition/Rook
  image symbol errors

The affected applications nevertheless completed their production builds.
These baseline typecheck failures were not changed because they are outside the
authorized identity scope.

## Offline and data-safety confirmation

- No workflow was started or restarted.
- No public URL was called.
- No live service was contacted.
- No external integration was connected.
- No production credential or secret was added or read.
- No database migration was executed.
- No live record was created, changed, or deleted.
- No member access was activated.
- No deployment or publication occurred.

The SQL migration at
`lib/db/drizzle/0000_offline_identity_foundation.sql` is an unapplied review
artifact only.

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

- No migration has been exercised against a disposable PostgreSQL database.
- Tests are isolated mocked/pure boundary tests; they do not call Express over
  HTTP or run concurrent transactions against PostgreSQL.
- No real issuer keys, destination registrations, service principals,
  subscriptions, memberships, or entitlements exist.
- The in-process rate limiter is suitable for offline review, not a
  multi-instance production deployment.
- No cross-system logout or revocation delivery has been connected.
- Workspace-wide typecheck debt remains as listed above.
- Runtime preview was intentionally not started.

## Rollback instructions

### Before merge or activation

Switch away from or delete the feature branch. The main implementation commit
is:

```text
4007f9babacb86916d2f8185f41f6b612c17a935
```

### If the source commit is merged

Create a normal revert commit for the implementation commit. Do not rewrite
shared history.

### Database

No database rollback is currently required because the migration was not run.

If a future authorized disposable-environment review applies the migration,
take a backup before rollback and remove only the new identity-foundation
tables in reverse dependency order:

1. `security_audit`
2. `revocation_state`
3. `entitlement_state`
4. `integration_events`
5. `identity_memberships`
6. `service_principals`
7. `identity_handoffs`
8. `external_identities`
9. `provider_tokens`
10. `local_sessions`
11. `session_families`

Do not drop `users` or the existing legacy `sessions` table.

## Rook review gate

Rook review may evaluate this branch and commit offline. Production credentials,
database migration, provider connection, member activation, publication, and
deployment each require a separate explicit authorization.