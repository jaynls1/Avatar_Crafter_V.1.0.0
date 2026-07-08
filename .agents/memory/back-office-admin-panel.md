---
name: Back Office Admin Panel
description: Architecture, DB schema, and patterns for the admin mission control built into the portal + api-server.
---

# Back Office Admin Panel

## What was built
Step 1 (Admin Chat) + Step 2 (Prompt Hot-Swap) + Step 4 (Status cards) from the spec.

## DB additions (applied via direct SQL, not drizzle-kit push — interactive prompt blocks CI)
- `users.is_admin` (boolean, default false)
- `conversations.is_admin` (boolean, default false)
- `conversations.user_id` (text, nullable)
- `prompt_versions` table (id, agent_id, content, active, created_at)

**Why:** drizzle-kit push is interactive when it detects ambiguous table renames. Use `executeSql` directly for migrations in this project.

## API routes (api-server, all under /api/admin/*)
All protected by `adminMiddleware` (checks req.user.isAdmin).
- GET /admin/agents — status cards for all 10 agents
- GET /admin/conversations/:agentId — get or create admin conversation
- POST /admin/conversations/:agentId/messages — SSE stream with elevated system prompt
- POST /admin/broadcast — sends instruction to all agents simultaneously
- GET/POST /admin/prompts/:agentId — list versions, create new version
- PUT /admin/prompts/:agentId/activate/:versionId — hot-swap prompt (instant, no cache)
- DELETE /admin/prompts/:agentId/:versionId — delete version
- POST /admin/users/:userId/grant-admin — grant admin to a user

## Prompt hot-swap
`agentPersonalities.ts` now checks `prompt_versions` DB (active=true) BEFORE fetching from BACK_OFFICE_URL. `invalidatePromptCache(agentId)` exported to bypass the 1hr remote cache.

## Portal UI
`artifacts/portal/src/pages/BackOffice.tsx` — three tabs: Admin Chat, Prompts, Status.
Access: lobby → "⬡ HQ" button (bottom-right, barely visible, orange on hover).
Renders "Access Denied" if user.isAdmin is false.

## Making yourself admin
POST /api/admin/users/:yourUserId/grant-admin — but this is a chicken-and-egg: needs admin to call it.
**Workaround:** run SQL directly: `UPDATE users SET is_admin = true WHERE email = 'your@email.com'`

## AuthUser type
`lib/api-zod/src/generated/types/authUser.ts` is generated but was manually patched to add `isAdmin: boolean`. If codegen is re-run it will be overwritten — re-add isAdmin after.
