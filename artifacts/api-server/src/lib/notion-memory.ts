import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

export type NotionBlock = {
  object: "block";
  type: "paragraph";
  paragraph: { rich_text: Array<{ type: "text"; text: { content: string } }> };
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
  const dbId = process.env.NOTION_TEAM_DB_ID;
  if (!dbId) return false;
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

async function createPageWithBlocks(
  parent: { database_id: string },
  titleText: string,
  blocks: NotionBlock[]
): Promise<{ id: string }> {
  const firstBatch = blocks.slice(0, 100);
  const rest = blocks.slice(100);

  const page = await notionRequest<{ id: string }>("/v1/pages", {
    method: "POST",
    body: {
      parent,
      properties: {
        Name: { title: [{ text: { content: titleText.slice(0, 200) } }] },
      },
      children: firstBatch,
    },
  });

  if (rest.length > 0) {
    await appendBlocks(page.id, rest);
  }

  return page;
}

export async function saveConversationToNotion(opts: {
  agentId: string;
  title: string;
  messages: Array<{ role: string; content: string; createdAt?: Date }>;
  conversationId: number;
  source?: string;
}): Promise<{ agentPageId?: string; teamPageId?: string; saved: boolean }> {
  const { agentId, title, messages, conversationId, source = "NEXT HQ" } = opts;

  const agentDbId = getAgentDbId(agentId);
  const teamDbId = process.env.NOTION_TEAM_DB_ID ?? null;

  if (!agentDbId && !teamDbId) {
    return { saved: false };
  }

  const summaryBlock = textBlock(
    `Agent: ${agentId} | Conversation #${conversationId} | Messages: ${messages.length} | Source: ${source}`
  );

  const messageBlocks: NotionBlock[] = messages.flatMap((m) => {
    const header = textBlock(
      `[${m.role.toUpperCase()}]${m.createdAt ? ` — ${new Date(m.createdAt).toLocaleString()}` : ""}`
    );
    const bodyChunks = chunkText(m.content).map(textBlock);
    return [header, ...bodyChunks];
  });

  const allBlocks = [summaryBlock, ...messageBlocks];

  const result: { agentPageId?: string; teamPageId?: string; saved: boolean } = { saved: false };

  if (agentDbId) {
    const page = await createPageWithBlocks(
      { database_id: agentDbId },
      title,
      allBlocks
    );
    result.agentPageId = page.id;
    result.saved = true;
  }

  if (teamDbId) {
    const page = await createPageWithBlocks(
      { database_id: teamDbId },
      `[${agentId}] ${title}`,
      allBlocks
    );
    result.teamPageId = page.id;
    result.saved = true;
  }

  return result;
}

export async function searchNotionMemory(agentId: string, query: string): Promise<unknown[]> {
  const dbId = getAgentDbId(agentId) ?? process.env.NOTION_TEAM_DB_ID;
  if (!dbId) return [];
  try {
    const res = await notionRequest<{ results: unknown[] }>(`/v1/databases/${dbId}/query`, {
      method: "POST",
      body: {
        filter: {
          property: "Name",
          rich_text: { contains: query.slice(0, 100) },
        },
        page_size: 10,
      },
    });
    return res.results ?? [];
  } catch {
    return [];
  }
}
