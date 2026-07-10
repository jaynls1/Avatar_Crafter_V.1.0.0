# Core Four: Agent Function Calling Spec

## Overview

Four agents get upgraded from text-only to operational agents with tool use (OpenAI function calling). They bootstrap the entire system. Everyone else follows their output.

| Agent | Role | Verb |
|-------|------|------|
| Atlas | Architect | Thinks, sequences, assigns |
| Nova | Builder | Codes, ships, deploys |
| Scribe | Documenter | Records, explains, maintains truth |
| Rook | Security | Validates, protects, enforces |

---

## 1. Atlas (Strategic Command)

### Tools Atlas Needs:
```typescript
const atlasTools = [
  {
    name: "read_clickup_task",
    description: "Read a ClickUp task by ID or URL for context",
    parameters: { task_id: string }
  },
  {
    name: "create_clickup_task",
    description: "Create a new task in ClickUp with full spec",
    parameters: { title: string, description: string, list_id: string, assignee_agent?: string, priority?: string }
  },
  {
    name: "update_clickup_task",
    description: "Update status, assignee, or description of an existing task",
    parameters: { task_id: string, status?: string, description?: string, assignee?: string }
  },
  {
    name: "read_notion_page",
    description: "Read a Notion page for strategic context",
    parameters: { page_id: string }
  },
  {
    name: "assign_to_agent",
    description: "Route a task or instruction to another agent",
    parameters: { agent_id: string, instruction: string, context_url?: string }
  },
  {
    name: "search_memory",
    description: "Search shared Notion memory for relevant context",
    parameters: { query: string }
  }
]
```

### Behavior:
- Reads incoming tasks/requests
- Breaks them into sequenced subtasks
- Assigns to Nova (build), Scribe (document), or Rook (validate)
- Never builds directly; only architects and delegates
- Checks Notion for prior decisions before creating new ones
- Enforces: "Think systemically. Health of the whole > individual task speed."

---

## 2. Nova (Builder)

### Tools Nova Needs:
```typescript
const novaTools = [
  {
    name: "read_clickup_task",
    description: "Read assigned task for requirements",
    parameters: { task_id: string }
  },
  {
    name: "read_github_file",
    description: "Read a file from the repo for context",
    parameters: { repo: string, path: string }
  },
  {
    name: "push_github_file",
    description: "Create or update a file in the repo",
    parameters: { repo: string, path: string, content: string, message: string }
  },
  {
    name: "update_clickup_task",
    description: "Update task status after completion",
    parameters: { task_id: string, status: string, comment?: string }
  },
  {
    name: "run_audit",
    description: "Run logic auditor on code before committing",
    parameters: { code: string, goal: string }
  },
  {
    name: "notify_agent",
    description: "Notify another agent that work is ready for review",
    parameters: { agent_id: string, message: string }
  }
]
```

### Behavior:
- Only builds what Atlas assigned (Execution Loop enforced)
- Reads the spec from ClickUp task description
- Writes code, runs the auditor, pushes to GitHub
- Updates task to "done" and notifies Scribe to document
- Notifies Rook for security review on sensitive changes
- Follows builder-guardrails.md at all times
- Flags drift if requirements are unclear rather than guessing

---

## 3. Scribe (Documenter)

### Tools Scribe Needs:
```typescript
const scribeTools = [
  {
    name: "read_clickup_task",
    description: "Read completed tasks to understand what was built",
    parameters: { task_id: string }
  },
  {
    name: "read_github_file",
    description: "Read code to understand implementation",
    parameters: { repo: string, path: string }
  },
  {
    name: "write_notion_page",
    description: "Create or update documentation in Notion",
    parameters: { database_id: string, title: string, content: string }
  },
  {
    name: "search_memory",
    description: "Check if documentation already exists before duplicating",
    parameters: { query: string }
  },
  {
    name: "update_clickup_task",
    description: "Mark documentation task as complete",
    parameters: { task_id: string, status: string }
  }
]
```

### Behavior:
- Watches for completed tasks (triggered by Nova or Atlas)
- Reads what was built (code + task description)
- Writes clear documentation to Notion: what it does, how it works, where it lives
- Maintains the system-of-record so every other agent can read and follow
- Never invents; only documents what actually exists
- Updates architecture docs when structure changes
- The rest of the team reads Scribe's output to understand the system

---

## 4. Rook (Security Guardian)

### Tools Rook Needs:
```typescript
const rookTools = [
  {
    name: "read_github_file",
    description: "Read code to audit for security issues",
    parameters: { repo: string, path: string }
  },
  {
    name: "scan_for_secrets",
    description: "Scan a file or diff for exposed credentials, keys, or sensitive data",
    parameters: { content: string }
  },
  {
    name: "check_permissions",
    description: "Validate that a route or endpoint has proper auth guards",
    parameters: { route_path: string, expected_auth: string }
  },
  {
    name: "flag_vulnerability",
    description: "Create a security alert task in ClickUp",
    parameters: { title: string, severity: string, description: string, file_path?: string }
  },
  {
    name: "approve_deployment",
    description: "Sign off on a build as security-cleared",
    parameters: { repo: string, commit_sha: string, notes: string }
  },
  {
    name: "activate_kill_switch",
    description: "Emergency halt all agent operations",
    parameters: { reason: string }
  }
]
```

### Behavior:
- Reviews all code Nova pushes before it goes live
- Scans for: exposed secrets, missing auth, SQL injection, XSS, open CORS
- Validates the guardrails are being followed
- Can activate the kill switch if something dangerous is detected
- Silent by default; only speaks when there's a real issue
- Operates on the principle: "Protection is silent. It does not observe emotion or interact socially."
- Never blocks progress without a specific, named vulnerability

---

## 5. Implementation Architecture

### OpenAI Function Calling Integration:
```typescript
// In routes/openai/index.ts, modify the chat completion call:
const completion = await openai.chat.completions.create({
  model: "gpt-5.2",
  messages: chatMessages,
  tools: getToolsForAgent(agentId), // Returns agent-specific tool definitions
  tool_choice: "auto",
  stream: true,
  max_completion_tokens: 8192,
});
```

### Tool Execution Loop:
```typescript
// When the model returns a tool_call:
// 1. Parse the function name + arguments
// 2. Execute the corresponding action (ClickUp API, GitHub API, Notion API)
// 3. Return the result to the model
// 4. Model generates final response incorporating tool results
// 5. Repeat if model calls another tool
```

### Required Environment Variables:
```
CLICKUP_API_TOKEN=xxx
CLICKUP_LIST_ID=xxx
NOTION_TEAM_DB_ID=xxx
NOTION_AGENT_DB_MAP={"Atlas":"...","Nova":"...","Scribe":"...","Rook":"...",...}
GITHUB_TOKEN=xxx
GITHUB_OWNER=jaynls1
GITHUB_REPO=Avatar_Crafter_V.1.0.0
```

### New Files Needed:
- `artifacts/api-server/src/lib/agent-tools.ts` - Tool definitions per agent
- `artifacts/api-server/src/lib/tool-executor.ts` - Executes tool calls
- `artifacts/api-server/src/lib/clickup-client.ts` - ClickUp API v2 wrapper
- `artifacts/api-server/src/lib/github-client.ts` - GitHub API wrapper
- Update `artifacts/api-server/src/routes/openai/index.ts` - Add tool loop

---

## 6. Operational Flow

```
Jason gives directive (via admin chat or ClickUp task)
  → Atlas reads it, breaks into subtasks, assigns
    → Nova picks up build task, codes, audits, pushes
      → Rook reviews for security, approves or flags
        → Scribe documents what was built in Notion
          → Rest of team reads Scribe's docs to stay aligned
```

---

## 7. Build Order

1. `agent-tools.ts` + `tool-executor.ts` (the function calling infrastructure)
2. Atlas tools first (he orchestrates everything else)
3. Nova tools (she needs to build the rest)
4. Rook tools (security review before anything goes live)
5. Scribe tools (documentation follows completion)

---

*Spec authored by ClickUp Brain. This is the upgrade from chatbots to operators.*
