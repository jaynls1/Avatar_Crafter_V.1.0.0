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

export async function saveConversationToNotion(opts: {
  agentId: string;
  title: string;
  messages: Array<{ role: string; content: string; createdAt?: Date }>;
  conversationId: number;
  source?: string;
}): Promise<{ agentPageId?: string; teamPageId?: string }> {
  const { agentId, title, messages, conversationId, source = "NEXT HQ" } = opts;

  const summaryBlock = textBlock(
    `Agent: ${agentId} | Conversation #${conversationId} | Messages: ${messages.length} | Source: ${source}`
  );

  const messageBlocks: NotionBlock[] = messages.flatMap((m) => {
    const header = textBlock(`[${m.role.toUpperCase()}]${m.createdAt ? ` — ${new Date(m.createdAt).toLocaleString()}` : ""}`);
    const bodyChunks = chunkText(m.content).map(textBlock);
    return [header, ...bodyChunks];
  });

  const allBlocks = [summaryBlock, ...messageBlocks].slice(0, 100);

  const result: { agentPageId?: string; teamPageId?: string } = {};

  const agentDbId = getAgentDbId(agentId);
  if (agentDbId) {
    const page = await notionRequest<{ id: string }>("/v1/pages", {
      method: "POST",
      body: {
        parent: { database_id: agentDbId },
        properties: {
          Name: { title: [{ text: { content: title.slice(0, 200) } }] },
        },
        children: allBlocks,
      },
    });
    result.agentPageId = page.id;
  }

  const teamDbId = process.env.NOTION_TEAM_DB_ID;
  if (teamDbId) {
    const page = await notionRequest<{ id: string }>("/v1/pages", {
      method: "POST",
      body: {
        parent: { database_id: teamDbId },
        properties: {
          Name: { title: [{ text: { content: `[${agentId}] ${title}`.slice(0, 200) } }] },
        },
        children: allBlocks,
      },
    });
    result.teamPageId = page.id;
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

export async function countNotionEntries(dbId: string): Promise<number> {
  try {
    const res = await notionRequest<{ results: unknown[] }>(`/v1/databases/${dbId}/query`, {
      method: "POST",
      body: { page_size: 1 },
    });
    return (res as any).next_cursor ? 100 : (res.results?.length ?? 0);
  } catch {
    return 0;
  }
}
