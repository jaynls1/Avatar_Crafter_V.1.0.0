const CLICKUP_API = "https://api.clickup.com/api/v2";
const DEFAULT_CLICKUP_LIST_ID = "901418228409";

const AGENT_PATTERNS = [
  /\bTask\s+for\s+([A-Z][a-z]+)\s*:/gi,
  /\bACTION\s*:\s*@?([A-Z][a-z]+)/gi,
  /\bAssigning\s+(?:to\s+)?@?([A-Z][a-z]+)/gi,
  /\bTASK\s*→\s*([A-Z][a-z]+)/gi,
  /\bDelegate\s+(?:to\s+)?@?([A-Z][a-z]+)/gi,
  /\b@([A-Z][a-z]+)\s+please/gi,
];

const KNOWN_AGENTS = new Set([
  "Atlas", "Nova", "Sniper", "Meme", "Scribe",
  "Indy", "Rook", "Iggy", "Anchor", "Haven",
]);

const DONE_STATUSES = new Set(["complete", "closed", "done", "resolved", "cancelled"]);

export function extractTaskDirectives(
  text: string,
  fromAgent: string
): Array<{ toAgent: string; excerpt: string }> {
  const found: Array<{ toAgent: string; excerpt: string }> = [];
  for (const pattern of AGENT_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      if (KNOWN_AGENTS.has(name) && name !== fromAgent) {
        const start = Math.max(0, match.index - 20);
        const end = Math.min(text.length, match.index + 200);
        found.push({ toAgent: name, excerpt: text.slice(start, end).trim() });
      }
    }
  }
  return found;
}

function buildConversationUrl(conversationId: number): string {
  const domain =
    process.env.REPLIT_DEV_DOMAIN ??
    process.env.REPLIT_DOMAINS?.split(",")[0] ??
    "localhost";
  return `https://${domain}/portal?convId=${conversationId}`;
}

function getAgentAssigneeId(agentId: string): number | null {
  const mapStr = process.env.CLICKUP_AGENT_ASSIGNEES;
  if (!mapStr) return null;
  try {
    const map = JSON.parse(mapStr) as Record<string, number | string>;
    const val = map[agentId];
    return val != null ? Number(val) : null;
  } catch {
    return null;
  }
}

export async function createClickUpTask(opts: {
  name: string;
  description: string;
  fromAgent: string;
  toAgent: string;
  conversationId: number;
}): Promise<string | null> {
  const token = process.env.CLICKUP_API_TOKEN;
  const listId = process.env.CLICKUP_LIST_ID || DEFAULT_CLICKUP_LIST_ID;
  if (!token || !listId) return null;

  const convUrl = buildConversationUrl(opts.conversationId);
  const fullDescription = [
    `Assigned by: ${opts.fromAgent}`,
    `Assigned to: ${opts.toAgent}`,
    `Conversation: ${convUrl}`,
    ``,
    opts.description,
  ]
    .join("\n")
    .slice(0, 8000);

  const assigneeId = getAgentAssigneeId(opts.toAgent);
  const payload: Record<string, unknown> = {
    name: opts.name.slice(0, 200),
    description: fullDescription,
    markdown_description: [
      `**Assigned by:** ${opts.fromAgent}`,
      `**Assigned to:** ${opts.toAgent}`,
      `**Conversation:** [View #${opts.conversationId}](${convUrl})`,
      ``,
      `---`,
      opts.description,
    ]
      .join("\n")
      .slice(0, 8000),
    tags: [
      opts.fromAgent.toLowerCase(),
      opts.toAgent.toLowerCase(),
      "agent-task",
      "next-hq",
    ],
    notify_all: false,
  };

  if (assigneeId != null) {
    payload.assignees = [assigneeId];
  }

  try {
    const res = await fetch(`${CLICKUP_API}/list/${listId}/task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id: string };
    return data.id ?? null;
  } catch {
    return null;
  }
}

export async function processAgentResponseForTasks(opts: {
  agentId: string;
  responseText: string;
  conversationId: number;
}): Promise<Array<{ toAgent: string; clickupTaskId: string | null }>> {
  const directives = extractTaskDirectives(opts.responseText, opts.agentId);
  if (!directives.length) return [];

  const results: Array<{ toAgent: string; clickupTaskId: string | null }> = [];
  for (const d of directives) {
    const id = await createClickUpTask({
      name: `[${opts.agentId} → ${d.toAgent}] Task`,
      description: d.excerpt,
      fromAgent: opts.agentId,
      toAgent: d.toAgent,
      conversationId: opts.conversationId,
    });
    results.push({ toAgent: d.toAgent, clickupTaskId: id });
  }
  return results;
}

export function isClickUpConfigured(): boolean {
  return !!process.env.CLICKUP_API_TOKEN;
}

export async function getClickUpListInfo(): Promise<{ name: string; taskCount: number } | null> {
  const token = process.env.CLICKUP_API_TOKEN;
  const listId = process.env.CLICKUP_LIST_ID || DEFAULT_CLICKUP_LIST_ID;
  if (!token) return null;
  try {
    const res = await fetch(`${CLICKUP_API}/list/${listId}`, {
      headers: { Authorization: token },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name: string; task_count: number };
    return { name: data.name, taskCount: data.task_count ?? 0 };
  } catch {
    return null;
  }
}

type ClickUpRawTask = {
  id: string;
  name: string;
  url: string;
  status?: { status?: string };
  tags?: Array<{ name: string }>;
};

async function fetchTasksByTag(tag: string): Promise<ClickUpRawTask[]> {
  const token = process.env.CLICKUP_API_TOKEN!;
  const listId = process.env.CLICKUP_LIST_ID || DEFAULT_CLICKUP_LIST_ID;
  try {
    const res = await fetch(
      `${CLICKUP_API}/list/${listId}/task?tags[]=${encodeURIComponent(tag)}&order_by=date_created&reverse=true&page=0&limit=20&include_closed=true`,
      { headers: { Authorization: token } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { tasks?: ClickUpRawTask[] };
    return data.tasks ?? [];
  } catch {
    return [];
  }
}

export async function getRecentClickUpTasks(agentId?: string): Promise<
  Array<{ id: string; name: string; url: string; fromAgent: string; toAgent: string; status: string }>
> {
  if (!isClickUpConfigured()) return [];
  const tag = agentId ? agentId.toLowerCase() : "agent-task";
  const rawTasks = await fetchTasksByTag(tag);
  return rawTasks.slice(0, 10).map((t) => {
    const tagNames = (t.tags ?? []).map((tg) => tg.name);
    const agents = tagNames.filter((n) => n !== "agent-task" && n !== "next-hq");
    return {
      id: t.id,
      name: t.name,
      url: t.url ?? `https://app.clickup.com/t/${t.id}`,
      fromAgent: agents[0] ?? "unknown",
      toAgent: agents[1] ?? "unknown",
      status: t.status?.status ?? "open",
    };
  });
}

export async function getPendingClickUpTaskCount(agentId: string): Promise<number> {
  if (!isClickUpConfigured()) return 0;
  const rawTasks = await fetchTasksByTag(agentId.toLowerCase());
  return rawTasks.filter((t) => !DONE_STATUSES.has((t.status?.status ?? "").toLowerCase())).length;
}
