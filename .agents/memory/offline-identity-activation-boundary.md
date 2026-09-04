---
name: Offline identity activation boundary
description: Authorization boundary for the NEXT shared identity foundation after offline review work.
---

The NEXT shared identity foundation may be developed and reviewed offline, but
production credentials, database migration, external-provider connection,
member activation, publication, and deployment require separate explicit
authorization.

**Why:** The Boardroom-authorized scope explicitly approved building the
destination foundation while stating that production/member activation was not
authorized.

**How to apply:** Keep all identity, entitlement, and revocation adapters
disabled; do not provision trust keys, service principals, memberships, or
entitlements; and do not apply the migration or start a production handoff
until a later instruction explicitly authorizes that step.