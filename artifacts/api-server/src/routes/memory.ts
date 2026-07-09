import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { adminMiddleware } from "../middlewares/adminMiddleware";
import { saveConversationToNotion, getAgentDbId } from "../lib/notion-memory";
import { isClickUpConfigured, getClickUpListInfo, getRecentClickUpTasks } from "../lib/clickup-memory";

const memoryRouter = Router();
memoryRouter.use(adminMiddleware);

const AGENT_IDS = [
  "Atlas", "Nova", "Sniper", "Meme", "Scribe",
  "Indy", "Rook", "Iggy", "Anchor", "Haven",
];

memoryRouter.get("/admin/memory/status", async (req, res) => {
  const notionTeamDb = process.env.NOTION_TEAM_DB_ID ?? null;
  const notionAgentMap: Record<string, string> = (() => {
    try { return JSON.parse(process.env.NOTION_AGENT_DB_MAP ?? "{}"); }
    catch { return {}; }
  })();

  const agentRows = await Promise.all(
    AGENT_IDS.map(async (agentId) => {
      const lastSyncRows = await db.execute(
        sql`SELECT synced_at, status, error_msg FROM memory_sync_log
            WHERE agent_id = ${agentId} AND task_type = 'notion'
            ORDER BY synced_at DESC LIMIT 1`
      ) as any;
      const lastSync = lastSyncRows.rows?.[0] ?? null;

      const totalRows = await db.execute(
        sql`SELECT COUNT(*)::int AS cnt FROM memory_sync_log
            WHERE agent_id = ${agentId} AND status = 'success' AND task_type = 'notion'`
      ) as any;
      const syncAttempts = parseInt(totalRows.rows?.[0]?.cnt ?? "0");

      const clickupRows = await db.execute(
        sql`SELECT COUNT(*)::int AS cnt FROM memory_sync_log
            WHERE agent_id = ${agentId} AND task_type = 'clickup' AND status = 'success'`
      ) as any;
      const clickupTasksCreated = parseInt(clickupRows.rows?.[0]?.cnt ?? "0");

      const agentDbId: string | null = notionAgentMap[agentId] ?? null;

      return {
        agentId,
        lastSyncedAt: lastSync?.synced_at ?? null,
        lastStatus: lastSync?.status ?? "never",
        lastError: lastSync?.error_msg ?? null,
        syncAttempts,
        clickupTasksCreated,
        notionDbConfigured: !!agentDbId,
        notionDbId: agentDbId,
      };
    })
  );

  const clickupInfo = isClickUpConfigured() ? await getClickUpListInfo() : null;
  const recentClickUpTasks = isClickUpConfigured()
    ? await getRecentClickUpTasks()
    : [];

  res.json({
    notion: {
      configured: !!(notionTeamDb || Object.keys(notionAgentMap).length),
      teamDbId: notionTeamDb,
      agentDbCount: Object.keys(notionAgentMap).length,
    },
    clickup: {
      configured: isClickUpConfigured(),
      listInfo: clickupInfo,
      recentTasks: recentClickUpTasks,
    },
    agents: agentRows,
  });
});

memoryRouter.post("/admin/memory/sync/:agentId", async (req, res) => {
  const { agentId } = req.params;
  const notionDbId = process.env.NOTION_TEAM_DB_ID || getAgentDbId(agentId);
  if (!notionDbId) {
    res.status(400).json({ error: "Notion not configured. Set NOTION_TEAM_DB_ID env var." });
    return;
  }

  const [lastConv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.agentId, agentId))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (!lastConv) {
    res.json({ synced: false, reason: "No conversations found for this agent." });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, lastConv.id))
    .orderBy(messages.createdAt);

  try {
    const result = await saveConversationToNotion({
      agentId,
      title: lastConv.title,
      messages: msgs.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      conversationId: lastConv.id,
    });

    if (!result.saved) {
      res.status(400).json({ error: "Notion is not configured (no database IDs set)." });
      return;
    }

    await db.execute(
      sql`INSERT INTO memory_sync_log (agent_id, conversation_id, notion_page_id, status, task_type)
          VALUES (${agentId}, ${lastConv.id}, ${result.agentPageId ?? result.teamPageId ?? null}, 'success', 'notion')`
    );

    res.json({ synced: true, conversationId: lastConv.id, pages: { agentPageId: result.agentPageId, teamPageId: result.teamPageId } });
  } catch (err: any) {
    await db.execute(
      sql`INSERT INTO memory_sync_log (agent_id, conversation_id, status, error_msg, task_type)
          VALUES (${agentId}, ${lastConv.id}, 'error', ${String(err?.message ?? err)}, 'notion')`
    );
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

interface ChatGPTNode {
  author?: { role?: string };
  content?: { parts?: Array<string | { text?: string }> };
}
interface ChatGPTConversation {
  title?: string;
  mapping?: Record<string, ChatGPTNode>;
  create_time?: number;
}

function detectAgentFromTitle(title: string): string {
  const lower = title.toLowerCase();
  for (const id of AGENT_IDS) {
    if (lower.includes(id.toLowerCase())) return id;
  }
  return "Atlas";
}

function extractPartText(part: string | { text?: string }): string {
  if (typeof part === "string") return part;
  return part?.text ?? "";
}

function parseGPTExport(raw: ChatGPTConversation[]): Array<{
  agentId: string;
  title: string;
  messages: Array<{ role: string; content: string }>;
}> {
  return raw.flatMap((conv) => {
    if (!conv.mapping) return [];
    const title = conv.title ?? "Untitled";
    const agentId = detectAgentFromTitle(title);

    const msgs = Object.values(conv.mapping)
      .filter((n) => n?.author?.role && n?.content?.parts?.length)
      .map((n) => ({
        role: n.author!.role === "assistant" ? "assistant" : "user",
        content: (n.content!.parts ?? []).map(extractPartText).join("\n").trim(),
      }))
      .filter((m) => m.content.length > 0);

    if (!msgs.length) return [];
    return [{ agentId, title, messages: msgs }];
  });
}

memoryRouter.post("/admin/memory/import", async (req, res) => {
  const notionDbId = process.env.NOTION_TEAM_DB_ID;
  if (!notionDbId) {
    res.status(400).json({
      error: "NOTION_TEAM_DB_ID is not set. Configure Notion before importing.",
    });
    return;
  }

  const body = req.body;
  if (!Array.isArray(body)) {
    res.status(400).json({ error: "Expected a JSON array (ChatGPT conversations.json export)" });
    return;
  }

  const parsed = parseGPTExport(body as ChatGPTConversation[]);
  if (!parsed.length) {
    res.json({ imported: 0, skipped: body.length });
    return;
  }

  let imported = 0;
  let failed = 0;
  const results: Array<{ title: string; agentId: string; status: string }> = [];

  for (const conv of parsed) {
    try {
      const result = await saveConversationToNotion({
        agentId: conv.agentId,
        title: conv.title,
        messages: conv.messages,
        conversationId: 0,
        source: "ChatGPT Export",
      });

      if (result.saved) {
        await db.execute(
          sql`INSERT INTO memory_sync_log (agent_id, conversation_id, notion_page_id, status, task_type)
              VALUES (${conv.agentId}, NULL, ${result.agentPageId ?? result.teamPageId ?? null}, 'success', 'notion')`
        );
        results.push({ title: conv.title, agentId: conv.agentId, status: "ok" });
        imported++;
      } else {
        results.push({ title: conv.title, agentId: conv.agentId, status: "skipped: Notion not configured" });
        failed++;
      }
    } catch (err: any) {
      results.push({
        title: conv.title,
        agentId: conv.agentId,
        status: "error: " + String(err?.message ?? err),
      });
      failed++;
    }
  }

  res.json({ imported, failed, total: parsed.length, results });
});

export default memoryRouter;
