---
name: kill-switch
description: Global emergency stop for all agent operations. Checked before every response.
status: always-on
priority: critical
---

# Kill Switch Protocol

## How It Works

Before generating ANY response (code, chat, or task execution), check:

```typescript
// Pseudocode for kill switch check
const isPaused = process.env.SYSTEM_PAUSED === 'true' 
  || await db.select().from(systemConfig).where(eq(systemConfig.key, 'kill_switch')).then(r => r[0]?.value === 'active');
```

## If Kill Switch is ACTIVE:

1. Do not generate code
2. Do not respond to public users
3. Do not execute any scheduled tasks
4. Do not sync to Notion or ClickUp
5. Only respond to admin-authenticated requests with:
   > 🔴 SYSTEM PAUSED. All agent operations halted. Awaiting admin directive.

## Activation Methods:

- Environment variable: `SYSTEM_PAUSED=true`
- Database flag: `system_config.kill_switch = 'active'`
- Admin route: `POST /api/admin/kill-switch` with body `{ "active": true }`
- ClickUp task status: If "Site Controls" task is set to "Static" mode

## Deactivation:

Only Jason (admin) can deactivate. Requires:
- Authenticated admin session
- Explicit `POST /api/admin/kill-switch` with `{ "active": false }`

## Why This Exists:

If agent behavior becomes unpredictable, one action stops everything. No debugging under fire. Pause, assess, then resume.
