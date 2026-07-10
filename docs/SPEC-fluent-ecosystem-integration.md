# Fluent Ecosystem Integration: Agents as Community Members

## Overview

The NEXT agent team doesn't just live in the 3D world. They have profiles in FluentCommunity, manage campaigns in FluentCRM, post content via Ninja Social, handle support tickets in FluentSupport, and process sales through Cart + FluentAffiliate. Each agent interacts with the Fluent stack according to their role.

This is NOT agents pretending to be human. This is agents operating as visible, named team members that community members recognize and interact with across platforms.

---

## 1. Agent-to-Fluent Platform Map

| Agent | Fluent Access | What They Do |
|-------|--------------|-------------|
| Atlas | FluentCommunity | Posts strategic updates, weekly direction posts, pins important threads |
| Nova | FluentCommunity | Posts build updates, changelogs, "what's new" announcements |
| Sniper | FluentCRM, FluentAffiliate, Cart | Manages email campaigns, sequences, affiliate payouts, sales funnels |
| Meme | Ninja Social, FluentCommunity | Schedules/posts social content for NEXT and members, engages in community |
| Anchor | FluentCommunity | Posts design showcases, template drops, UI/UX tips |
| Ignite | FluentCommunity | Posts learning pathways, course announcements, member progress highlights |
| Haven | FluentSupport | Monitors support tickets, responds to safety/readiness questions |
| Indy | FluentCommunity | Posts resource roundups, knowledge base updates, file organization tips |
| Scribe | FluentCommunity | Posts documentation updates, how-to guides, system explainers |
| Legion | FluentCommunity | Posts policy updates, compliance reminders, legal FAQs |
| Rook | FluentSupport, FluentCommunity | Monitors for security issues in support, posts security advisories |

---

## 2. FluentCommunity (Agents as Members)

### Each Agent Gets:
- A profile with their name, avatar (matching 3D world sprite), role description
- Ability to create posts in relevant Spaces
- Ability to reply to member posts
- Ability to react/like member content

### WordPress REST API Endpoints:
```
POST /wp-json/fluent-community/v2/posts          - Create a post
POST /wp-json/fluent-community/v2/posts/:id/reply - Reply to a post
GET  /wp-json/fluent-community/v2/spaces          - List spaces
GET  /wp-json/fluent-community/v2/posts           - Read posts
```

### Agent Behavior in Community:
- Atlas posts weekly "State of NEXT" updates
- Meme engages with member posts (reactions, encouragement, content tips)
- Nova posts when new tools/features ship
- Scribe posts how-to threads when documentation updates
- Agents respond to @mentions naturally
- Never spam. Quality over quantity. 1-3 posts per agent per day max.

---

## 3. FluentCRM (Sniper's Domain)

### Sniper's CRM Tools:
```typescript
const sniperCrmTools = [
  {
    name: "create_email_campaign",
    description: "Create and schedule an email campaign",
    parameters: { subject: string, body_html: string, list_ids: number[], scheduled_at?: string }
  },
  {
    name: "add_contact_to_sequence",
    description: "Add a contact to an automation sequence",
    parameters: { contact_id: number, sequence_id: number }
  },
  {
    name: "tag_contact",
    description: "Add or remove tags from a contact",
    parameters: { contact_id: number, add_tags?: string[], remove_tags?: string[] }
  },
  {
    name: "get_campaign_stats",
    description: "Get open rates, clicks, and conversions for a campaign",
    parameters: { campaign_id: number }
  },
  {
    name: "search_contacts",
    description: "Search contacts by tag, status, or custom field",
    parameters: { query: string, tag?: string, status?: string }
  },
  {
    name: "create_automation_funnel",
    description: "Create a new automation funnel/sequence",
    parameters: { title: string, trigger: string, steps: Array<{action: string, delay?: string, content?: string}> }
  }
]
```

### WordPress REST API:
```
GET/POST /wp-json/fluent-crm/v2/contacts
GET/POST /wp-json/fluent-crm/v2/campaigns
GET/POST /wp-json/fluent-crm/v2/sequences
POST     /wp-json/fluent-crm/v2/contacts/:id/tags
GET      /wp-json/fluent-crm/v2/reports/campaigns/:id
```

---

## 4. Ninja Social (Meme's Domain)

### Meme's Social Tools:
```typescript
const memeSocialTools = [
  {
    name: "schedule_social_post",
    description: "Schedule a post to social media platforms",
    parameters: { content: string, platforms: string[], scheduled_at: string, media_url?: string }
  },
  {
    name: "get_social_analytics",
    description: "Get engagement metrics for recent posts",
    parameters: { platform?: string, date_range?: string }
  },
  {
    name: "create_content_calendar",
    description: "Generate a content calendar for the week/month",
    parameters: { topic_pillars: string[], frequency: string, start_date: string }
  },
  {
    name: "post_for_member",
    description: "Create a social post on behalf of a member (with their approval)",
    parameters: { member_id: string, content: string, platforms: string[], requires_approval: boolean }
  }
]
```

### WordPress REST API:
```
POST /wp-json/suspended-starter/v1/posts/schedule
GET  /wp-json/suspended-starter/v1/analytics
GET  /wp-json/suspended-starter/v1/calendar
```

*Note: Ninja Social's exact REST endpoints may vary. Check plugin documentation for current API structure.*

---

## 5. FluentSupport (Haven & Rook)

### Support Tools:
```typescript
const supportTools = [
  {
    name: "read_support_tickets",
    description: "Get open support tickets, optionally filtered by category",
    parameters: { status?: string, category?: string, limit?: number }
  },
  {
    name: "reply_to_ticket",
    description: "Post a reply to a support ticket",
    parameters: { ticket_id: number, reply: string, close_ticket?: boolean }
  },
  {
    name: "create_ticket",
    description: "Create a new internal support ticket (for flagging issues)",
    parameters: { title: string, description: string, priority: string, category: string }
  },
  {
    name: "assign_ticket",
    description: "Assign a ticket to a specific agent or escalate",
    parameters: { ticket_id: number, assign_to: string }
  }
]
```

### WordPress REST API:
```
GET  /wp-json/fluent-support/v2/tickets
POST /wp-json/fluent-support/v2/tickets/:id/responses
POST /wp-json/fluent-support/v2/tickets
```

---

## 6. FluentAffiliate + Cart (Sniper)

### Sales Tools:
```typescript
const salesTools = [
  {
    name: "get_affiliate_stats",
    description: "Get affiliate performance data",
    parameters: { affiliate_id?: number, date_range?: string }
  },
  {
    name: "create_coupon",
    description: "Generate a discount coupon for a campaign",
    parameters: { code: string, discount_type: string, amount: number, expires_at?: string }
  },
  {
    name: "get_sales_report",
    description: "Get revenue and conversion data",
    parameters: { date_range: string, product_id?: number }
  }
]
```

---

## 7. Ninja Tables (Data Display)

Used by any agent that needs to present structured data to members:
```typescript
const tableTools = [
  {
    name: "create_data_table",
    description: "Create a dynamic table for displaying member data, comparisons, or reports",
    parameters: { title: string, columns: string[], rows: Array<Record<string, string>>, embed_location?: string }
  },
  {
    name: "update_table_data",
    description: "Update rows in an existing Ninja Table",
    parameters: { table_id: number, rows: Array<Record<string, string>> }
  }
]
```

---

## 8. Architecture: How It Connects

```
                    ┌─────────────────┐
                    │  WordPress       │
                    │  (Nexcess)       │
                    │                  │
                    │  FluentCRM       │
                    │  FluentCommunity │
                    │  FluentSupport   │
                    │  FluentAffiliate │
                    │  Ninja Social    │
                    │  Ninja Tables    │
                    │  Cart            │
                    └────────┬────────┘
                             │
                    WP REST API (authenticated)
                             │
                    ┌────────┴────────┐
                    │  Railway API     │
                    │  (api-server)    │
                    │                  │
                    │  wp-client.ts    │ ← New: WordPress API wrapper
                    │  tool-executor   │
                    │  agent-tools     │
                    └────────┬────────┘
                             │
              ┌─────────────┼─────────────┐
              │              │              │
     ┌───────┴───┐  ┌────┴─────┐  ┌───┴───────┐
     │ 3D World    │  │ Notion    │  │ ClickUp     │
     │ (Members)   │  │ (Memory)  │  │ (Tasks)     │
     └────────────┘  └──────────┘  └───────────┘
```

### New File Needed:
`artifacts/api-server/src/lib/wp-client.ts`

```typescript
// WordPress REST API client
// Authenticated via Application Password or JWT
const WP_BASE_URL = process.env.WP_BASE_URL; // https://joinnextlevelhq.com/wp-json
const WP_AUTH_TOKEN = process.env.WP_AUTH_TOKEN; // Base64(username:app_password)

async function wpRequest(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${WP_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${WP_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`WP ${endpoint}: ${res.status}`);
  return res.json();
}
```

---

## 9. Environment Variables Needed

```
WP_BASE_URL=https://joinnextlevelhq.com/wp-json
WP_AUTH_TOKEN=base64(username:application_password)
```

Generate WordPress Application Password:
WP Admin → Users → Your Profile → Application Passwords → Create one for "NEXT Agent System"

---

## 10. Security Guardrails for Fluent Access

- **Rate limiting:** Max 10 API calls per agent per minute to WordPress
- **No mass emails without admin approval:** Sniper can draft campaigns but requires Jason's go-ahead before sending to full lists
- **No member data exposure:** Agents never share one member's data with another member
- **Audit trail:** Every WP API call logged to `memory_sync_log` with agent_id and action
- **Community posts require tone check:** Agent responses in FluentCommunity pass through Rook's tone filter before posting
- **Support tickets:** Haven and Rook can respond but cannot close tickets without member confirmation

---

## 11. Build Order

1. `wp-client.ts` (the WordPress API wrapper)
2. FluentCommunity integration (agents get profiles, can post)
3. FluentCRM tools for Sniper (campaigns, sequences, tagging)
4. Ninja Social for Meme (scheduling, analytics)
5. FluentSupport for Haven/Rook (ticket monitoring)
6. FluentAffiliate + Cart for Sniper (sales/affiliate data)
7. Ninja Tables for structured data display

---

*Spec authored by ClickUp Brain. The agents don't just live in the 3D world. They operate across the entire NEXT platform.*
