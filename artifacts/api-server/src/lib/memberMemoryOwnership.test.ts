import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("ordinary conversation access requires persisted owner, without admin override", () => {
  const code = source("../routes/openai/index.ts");
  assert.match(code, /conversation\.userId === String\(req\.user\?\.id\)/);
  assert.doesNotMatch(code, /req\.user\?\.isAdmin\s*\|\|/);
  assert.match(code, /buildSystemPrompt\(conversation\.agentId, conversation\.userId, content\)/);
  assert.match(code, /scheduleNotionSync\(id, conversation\.agentId, conversation\.title, conversation\.userId\)/);
});

test("admin chat checks persisted owner before message write and memory access", () => {
  const code = source("../routes/admin.ts");
  const check = code.indexOf("if (!conv.userId || conv.userId !== userId)");
  const write = code.indexOf('await db.insert(messages).values({', code.indexOf('adminRouter.post("/admin/conversations/:agentId/messages"'));
  assert.ok(check > 0 && check < write);
  assert.match(code, /buildSystemPrompt\(agentId, conv\.userId, content\)/);
  assert.match(code, /scheduleNotionSync\(conv\.id, agentId, conv\.title, conv\.userId\)/);
});

test("manual sync selects only current owner's conversations and rejects ownerless", () => {
  const code = source("../routes/memory.ts");
  const sync = code.slice(code.indexOf('memoryRouter.post("/admin/memory/sync/:agentId"'), code.indexOf('memoryRouter.post("/admin/memory/import"'));
  assert.match(sync, /eq\(conversations\.userId, req\.user!\.id\)/);
  assert.match(sync, /if \(!lastConv\.userId \|\| lastConv\.userId !== req\.user!\.id\)/);
  assert.doesNotMatch(sync, /admin:\$\{/);
  assert.match(sync, /memberId: lastConv\.userId/);
});

test("Notion canonical external identity is deterministic and includes member ID", () => {
  const code = source("./notion-memory.ts");
  assert.match(code, /member:\$\{opts\.memberId\}:conversation:\$\{opts\.conversationId \|\| opts\.title\}/);
  assert.match(code, /member:\$\{memberId\}:conversation:\$\{conversationId \|\| title\}/);
  assert.match(code, /"Member ID": \{ rich_text: \[\{ text: \{ content: opts\.memberId/);
});
