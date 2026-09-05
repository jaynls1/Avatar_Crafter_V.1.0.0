---
name: Disposable PostgreSQL sockets
description: Environment-specific startup requirement for isolated local PostgreSQL test clusters.
---

Temporary PostgreSQL clusters started directly from the Nix PostgreSQL binaries must set their Unix socket directory to a writable location under `/tmp`.

**Why:** This environment does not provide `/run/postgresql`, so an otherwise healthy temporary server fails while creating its socket lock file there.

**How to apply:** Start the isolated server with a dedicated temporary socket directory (for example, the temporary data directory itself), and always stop and remove the cluster after the test.