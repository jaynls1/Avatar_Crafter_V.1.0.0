import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { messages } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { saveConversationToNotion } from "./notion-memory";
import { processAgentResponseForTasks } from "./clickup-memory";

export function scheduleNotionSync(
  conversationId: number,
  agentId: string,
  conversationTitle: string
): void {
  const notionConfigured =
    process.env.NOTION_TEAM_DB_ID || process.env.NOTION_AGENT_DB_MAP;
  if (!notionConfigured) return;

  setImmediate(async () => {
    try {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      if (!msgs.length) return;

      const pages = await saveConversationToNotion({
        agentId,
        title: conversationTitle,
        messages: msgs.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
        conversationId,
      });

      await db.execute(
        sql`INSERT INTO memory_sync_log (agent_id, conversation_id, notion_page_id, status)
            VALUES (${agentId}, ${conversationId}, ${pages.agentPageId ?? pages.teamPageId ?? null}, 'success')`
      );
    } catch (err: any) {
      try {
        await db.execute(
          sql`INSERT INTO memory_sync_log (agent_id, conversation_id, status, error_msg)
              VALUES (${agentId}, ${conversationId}, 'error', ${String(err?.message ?? err)})`
        );
      } catch {}
    }
  });
}

export function scheduleClickUpScan(
  agentId: string,
  responseText: string,
  conversationId: number
): void {
  const clickupToken = process.env.CLICKUP_API_TOKEN;
  const clickupList = process.env.CLICKUP_LIST_ID;
  if (!clickupToken || !clickupList) return;

  setImmediate(async () => {
    try {
      await processAgentResponseForTasks({ agentId, responseText, conversationId });
    } catch {}
  });
}
