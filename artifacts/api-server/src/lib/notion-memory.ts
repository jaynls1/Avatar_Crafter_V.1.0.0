import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();
const DEFAULT_NOTION_TEAM_DB_ID = "034c16ef898b474caffe10a80632e99a";

export type NotionBlock = {
  object: "block";
  type: "paragraph";
  paragraph: { rich_text: Array<{ type: "text"; text: { content: string } }> };
};

type NotionApiBlock = {
  id: string;
  type: string;
  paragraph?: { rich_text?: Array<{ plain_text?: string }> };
};

function textBlock(content: string): NotionBlock {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: content.slice(0, 2000) } }],
    },
  };
}

function chunkText(text: string, size = 1900): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks.length ? chunks : [""];
}

function getTeamDbId(): string {
  return process.env.NOTION_TEAM_DB_ID || DEFAULT_NOTION_TEAM_DB_ID;
}

export async function notionRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await connectors.proxy("notion", path, {
    method: options.method ?? "GET",
    ...(options.body
      ? { body: JSON.stringify(options.body), headers: { "Content-Type": "application/json" } }
      : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function isNotionConfigured(): Promise<boolean> {
  const dbId = getTeamDbId();
  try {
    await notionRequest(`/v1/databases/${dbId}`);
    return true;
  } catch {
    return false;
  }
}

export function getAgentDbId(agentId: string): string | null {
  const mapStr = process.env.NOTION_AGENT_DB_MAP;
  if (!mapStr) return null;
  try {
    const map = JSON.parse(mapStr) as Record<string, string>;
    return map[agentId] ?? null;
  } catch {
    return null;
  }
}

async function appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void> {
  const BATCH = 100;
  for (let i = 0; i < blocks.length; i += BATCH) {
    await notionRequest(`/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      body: { children: blocks.slice(i, i + BATCH) },
    });
  }
}

async function replaceBlocks(pageId: string, blocks: NotionBlock[]): Promise<void> {
  let cursor: string | undefined;
  do {
    const query = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : "?page_size=100";
    const data = await notionRequest<{ results?: NotionApiBlock[]; has_more?: boolean; next_cursor?: string }>(
      `/v1/blocks/${pageId}/children${query}`
    );
    for (const block of data.results ?? []) {
      await notionRequest(`/v1/blocks/${block.id}`, { method: "DELETE" });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  await appendBlocks(pageId, blocks);
}

function sourceOption(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized.includes("chatgpt")) return "ChatGPT";
  if (normalized.includes("wordpress")) return "WordPress";
  if (normalized.includes("clickup")) return "ClickUp";
  if (normalized.includes("notion")) return "Notion";
  return "NEXT";
}

function canonicalProperties(opts: {
  title: string;
  agentId: string;
  conversationId: number;
  source: string;
}) {
  const now = new Date().toISOString();
  const externalId = `${sourceOption(opts.source)}:conversation:${opts.conversationId || opts.title}`;
  return {
    Title: { title: [{ text: { content: opts.title.slice(0, 200) } }] },
    Source: { select: { name: sourceOption(opts.source) } },
    Agent: { select: { name: opts.agentId } },
    "Record Type": { select: { name: "Conversation" } },
    "External ID": { rich_text: [{ text: { content: externalId.slice(0, 2000) } }] },
    "Conversation ID": { rich_text: [{ text: { content: String(opts.conversationId) } }] },
    "Captured At": { date: { start: now } },
    "Last Synced": { date: { start: now } },
    Private: { checkbox: true },
  };
}

async function findCanonicalPage(
  dbId: string,
  conversationId: number,
  title: string,
  source: string
): Promise<string | null> {
  const externalId = `${sourceOption(source)}:conversation:${conversationId || title}`;
  const data = await notionRequest<{ results?: Array<{ id: string }> }>(`/v1/databases/${dbId}/query`, {
    method: "POST",
    body: {
      filter: {
        property: "External ID",
        rich_text: { equals: externalId.slice(0, 2000) },
      },
      page_size: 1,
    },
  });
  return data.results?.[0]?.id ?? null;
}

async function upsertCanonicalPage(opts: {
  dbId: string;
  agentId: string;
  title: string;
  messages: Array<{ role: string; content: string; createdAt?: Date }>;
  conversationId: number;
  source: string;
  blocks: NotionBlock[];
}): Promise<string> {
  const properties = canonicalProperties(opts);
  const existingId = await findCanonicalPage(opts.dbId, opts.conversationId, opts.title, opts.source);
  if (existingId) {
    await notionRequest(`/v1/pages/${existingId}`, { method: "PATCH", body: { properties } });
    await replaceBlocks(existingId, opts.blocks);
    return existingId;
  }

  const page = await notionRequest<{ id: string }>("/v1/pages", {
    method: "POST",
    body: {
      parent: { database_id: opts.dbId },
      properties,
      children: opts.blocks.slice(0, 100),
    },
  });
  if (opts.blocks.length > 100) await appendBlocks(page.id, opts.blocks.slice(100));
  return page.id;
}

async function createLegacyAgentPage(
  databaseId: string,
  titleText: string,
  blocks: NotionBlock[]
): Promise<string> {
  const page = await notionRequest<{ id: string }>("/v1/pages", {
    method: "POST",
    body: {
      parent: { database_id: databaseId },
      properties: { Name: { title: [{ text: { content: titleText.slice(0, 200) } }] } },
      children: blocks.slice(0, 100),
    },
  });
  if (blocks.length > 100) await appendBlocks(page.id, blocks.slice(100));
  return page.id;
}

export async function saveConversationToNotion(opts: {
  agentId: string;
  title: string;
  messages: Array<{ role: string; content: string; createdAt?: Date }>;
  conversationId: number;
  source?: string;
}): Promise<{ agentPageId?: string; teamPageId?: string; saved: boolean }> {
  const { agentId, title, messages, conversationId, source = "NEXT" } = opts;
  const teamDbId = getTeamDbId();
  const agentDbId = getAgentDbId(agentId);

  const summaryBlock = textBlock(
    `Agent: ${agentId} | Conversation #${conversationId} | Messages: ${messages.length} | Source: ${source}`
  );
  const messageBlocks: NotionBlock[] = messages.flatMap((m) => [
    textBlock(`[${m.role.toUpperCase()}]${m.createdAt ? ` — ${new Date(m.createdAt).toLocaleString()}` : ""}`),
    ...chunkText(m.content).map(textBlock),
  ]);
  const allBlocks = [summaryBlock, ...messageBlocks];

  try {
    const teamPageId = await upsertCanonicalPage({
      dbId: teamDbId,
      agentId,
      title,
      messages,
      conversationId,
      source,
      blocks: allBlocks,
    });
    return { teamPageId, saved: true };
  } catch (canonicalError) {
    if (!agentDbId) throw canonicalError;
    const agentPageId = await createLegacyAgentPage(agentDbId, title, allBlocks);
    return { agentPageId, saved: true };
  }
}

async function readPageText(pageId: string): Promise<string> {
  const data = await notionRequest<{ results?: NotionApiBlock[] }>(
    `/v1/blocks/${pageId}/children?page_size=100`
  );
  return (data.results ?? [])
    .flatMap((block) => block.paragraph?.rich_text ?? [])
    .map((text) => text.plain_text ?? "")
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000);
}

export async function getRecentNotionMemoryText(agentId: string, limit = 3): Promise<string> {
  try {
    const dbId = getTeamDbId();
    const data = await notionRequest<{ results?: Array<{ id: string }> }>(`/v1/databases/${dbId}/query`, {
      method: "POST",
      body: {
        filter: { property: "Agent", select: { equals: agentId } },
        sorts: [{ property: "Last Synced", direction: "descending" }],
        page_size: Math.max(1, Math.min(limit, 5)),
      },
    });
    const memories = await Promise.all((data.results ?? []).map((page) => readPageText(page.id)));
    return memories.filter(Boolean).join("\n\n---\n\n").slice(0, 24000);
  } catch {
    return "";
  }
}

export async function searchNotionMemory(agentId: string, query: string): Promise<unknown[]> {
  const dbId = getTeamDbId();
  try {
    const res = await notionRequest<{ results: unknown[] }>(`/v1/databases/${dbId}/query`, {
      method: "POST",
      body: {
        and: [
          { property: "Agent", select: { equals: agentId } },
          { property: "Title", title: { contains: query.slice(0, 100) } },
        ],
        page_size: 10,
      },
    });
    return res.results ?? [];
  } catch {
    return [];
  }
}
