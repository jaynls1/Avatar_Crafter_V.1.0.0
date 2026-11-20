import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { ReplitConnectors } from "@replit/connectors-sdk";

test("member ownership and manual memory sync with PostgreSQL", async (t) => {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(databaseUrl.hostname));
  assert.equal(databaseUrl.pathname, "/hq_security");
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = "http://127.0.0.1:1";
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "unused-test-key";
  process.env.NOTION_TEAM_DB_ID = "fixture-notion-db";
  const origin = "http://localhost:8080";
  process.env.APP_CANONICAL_ORIGIN = origin;
  delete process.env.NOTION_AGENT_DB_MAP;

  const connectorCalls: Array<{ path: string; body: any }> = [];
  let externalId: string | undefined;
  t.mock.method(ReplitConnectors.prototype, "proxy", async (...[service, path, options]: Parameters<ReplitConnectors["proxy"]>) => {
    assert.equal(service, "notion");
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    connectorCalls.push({ path, body });
    if (path === "/v1/databases/fixture-notion-db/query") {
      return Response.json({
        results: externalId === body.filter.rich_text.equals ? [{ id: "fixture-page" }] : [],
      });
    }
    if (path === "/v1/pages") {
      externalId = body.properties["External ID"].rich_text[0].text.content;
      return Response.json({ id: "fixture-page" });
    }
    return Response.json({ results: [] });
  });

  const { db, pool, conversations, messages } = await import("@workspace/db");
  t.after(() => pool.end());
  const { createSession } = await import("./auth");
  const { default: app } = await import("../app");

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
    server.closeAllConnections();
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const endpoint = `http://127.0.0.1:${address.port}`;

  const agentId = "pilot-fixture-" + crypto.randomUUID();
  const separateAgentId = agentId + "-ownerless";
  const memberId = "pilot-member-" + crypto.randomUUID();
  const adminId = "pilot-admin-" + crypto.randomUUID();

  async function session(id: string, isAdmin: boolean) {
    const sid = await createSession({
      user: { id, isAdmin, email: null, firstName: null, lastName: null, profileImageUrl: null },
      access_token: "unused",
    });
    return sid;
  }

  async function request(path: string, sid?: string, body?: object) {
    return fetch(endpoint + "/api" + path, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(sid ? { Cookie: `sid=${sid}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  const member = await session(memberId, false);
  const admin = await session(adminId, true);
  const otherMember = await session("pilot-other-" + crypto.randomUUID(), false);
  const createBody = { agentId, title: "Synthetic conversation", userId: adminId, memberId: adminId, isAdmin: true };
  const path = "/openai/conversations";

  assert.equal((await request(path, undefined, createBody)).status, 401);
  const created = await request(path, member, createBody);
  assert.equal(created.status, 201);
  const owned = await created.json() as { id: number };
  const [stored] = await db.select().from(conversations).where(eq(conversations.id, owned.id));
  assert.equal(stored.userId, memberId);
  assert.equal(stored.isAdmin, false);
  assert.equal((await request(`${path}/${owned.id}`, member)).status, 200);
  assert.equal((await request(`${path}/${owned.id}`, otherMember)).status, 404);
  assert.equal((await request(`${path}/${owned.id}`, admin)).status, 404);
  assert.equal((await request(`${path}/${owned.id}/messages`, otherMember, { content: "fixture" })).status, 404);
  assert.equal((await request(`${path}/${owned.id}/messages`, admin, { content: "fixture" })).status, 404);
  assert.deepEqual(await db.select().from(messages).where(eq(messages.conversationId, owned.id)), []);

  const [ownerless] = await db.insert(conversations).values({
    agentId: separateAgentId, title: "Legacy ownerless fixture", userId: null,
  }).returning();
  assert.equal((await request(`${path}/${ownerless.id}`, member)).status, 404);
  assert.equal((await request(`${path}/${ownerless.id}/messages`, member, { content: "fixture" })).status, 404);
  assert.deepEqual(await db.select().from(messages).where(eq(messages.conversationId, ownerless.id)), []);

  const sync = "/admin/memory/sync";
  assert.equal((await request(`${sync}/${agentId}`, member, {})).status, 403);
  for (const target of [agentId, separateAgentId]) {
    const response = await request(`${sync}/${target}`, admin, { memberId, userId: memberId });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { synced: boolean }).synced, false);
  }
  assert.equal(connectorCalls.length, 0);

  const adminConversation = await request(`/admin/conversations/${agentId}`, admin);
  assert.equal(adminConversation.status, 200);
  const [adminOwned] = await db.select().from(conversations).where(eq(conversations.userId, adminId));
  assert.equal(adminOwned.agentId, agentId);
  assert.notEqual(adminOwned.id, owned.id);

  await db.insert(messages).values({
    conversationId: adminOwned.id, role: "user", content: "Synthetic admin message",
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request(`${sync}/${agentId}`, admin, { memberId });
    assert.equal(response.status, 200);
    const synced = await response.json() as { synced: boolean; conversationId: number };
    assert.equal(synced.synced, true);
    assert.equal(synced.conversationId, adminOwned.id);
  }
  assert.equal(externalId, `NEXT:member:${adminId}:conversation:${adminOwned.id}`);
  const creates = connectorCalls.filter(({ path }) => path === "/v1/pages");
  assert.equal(creates.length, 1);
  assert.equal(creates[0].body.properties["Member ID"].rich_text[0].text.content, adminId);
  assert.ok(creates[0].body.children.some((block: { paragraph: { rich_text: Array<{ text: { content: string } }> } }) =>
    block.paragraph.rich_text[0].text.content === "Synthetic admin message"
  ));
  assert.equal(connectorCalls.filter(({ path }) => path === "/v1/pages/fixture-page").length, 1);
});
