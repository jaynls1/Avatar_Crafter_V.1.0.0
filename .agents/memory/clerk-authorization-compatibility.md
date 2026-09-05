---
name: Clerk authorization compatibility
description: Why migrated and new Clerk users intentionally resolve different issuer-qualified authorization identities.
---

For a migrated user whose verified Clerk session carries the former local user ID, authorization must resolve through that user's exact legacy issuer-and-subject tuple when it exists. A genuinely new Clerk user resolves through the Clerk issuer-and-subject tuple.

**Why:** Memberships, entitlements, provider-disconnect state, and revocations were already issuer-qualified before the authentication provider changed. Creating a parallel Clerk identity without this compatibility rule silently drops existing access and revocation state; copying privileges between arbitrary identities weakens issuer isolation.

**How to apply:** Keep Clerk identity provenance linked to the local user, but never select an arbitrary identity by local user ID. Use only the deterministic verified bridge and exact qualified tuple; preserve new Clerk users on their native tuple.