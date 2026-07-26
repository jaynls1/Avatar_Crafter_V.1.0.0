import { eq, and } from "drizzle-orm";
import { db, promptVersions, agentSettings } from "@workspace/db";
import { getRecentNotionMemoryText, getRelevantNotionMemoryText } from "./notion-memory";

const BACK_OFFICE_URL = process.env.BACK_OFFICE_URL || "https://secure-share-linkzip.replit.app";
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedPersonalities: Record<string, string> | null = null;
let cacheTimestamp: number = 0;
const promptCacheInvalidations = new Set<string>();

export function invalidatePromptCache(agentId: string) {
  promptCacheInvalidations.add(agentId);
}

export async function getAgentPersonalities(): Promise<Record<string, string>> {
  if (cachedPersonalities && Date.now() - cacheTimestamp < CACHE_TTL_MS) return cachedPersonalities;
  try {
    const res = await fetch(`${BACK_OFFICE_URL}/api/agents`);
    const agents = await res.json();
    cachedPersonalities = {};
    cacheTimestamp = Date.now();
    for (const agent of agents) {
      cachedPersonalities[agent.codeName] = agent.systemPrompt;
    }
  } catch {
    if (!cachedPersonalities) cachedPersonalities = {};
  }
  return cachedPersonalities;
}

/** Returns whether memory injection is enabled for this agent (defaults to true if no row exists). */
export async function isMemoryEnabled(agentId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select()
      .from(agentSettings)
      .where(eq(agentSettings.agentId, agentId))
      .limit(1);
    return row?.memoryEnabled ?? true;
  } catch {
    return true; // fail open — never silently break chat
  }
}

/** Set memory injection on/off for an agent. Creates the row if it doesn't exist. */
export async function setMemoryEnabled(agentId: string, enabled: boolean): Promise<void> {
  await db
    .insert(agentSettings)
    .values({ agentId, memoryEnabled: enabled })
    .onConflictDoUpdate({
      target: agentSettings.agentId,
      set: { memoryEnabled: enabled, updatedAt: new Date() },
    });
}

/** Get all known agent memory settings (keyed by agentId). */
export async function getAllMemorySettings(): Promise<Record<string, boolean>> {
  const rows = await db.select().from(agentSettings);
  return Object.fromEntries(rows.map((r) => [r.agentId, r.memoryEnabled]));
}

/**
 * Build the full system prompt for an agent.
 * - Checks if memory injection is enabled (default: on).
 * - If userMessage is provided, runs a keyword search in Notion for relevant past entries.
 * - Falls back to recency-based retrieval when no message is provided.
 * - Memory lookup is bounded to 500 ms; if Notion is slow, the agent responds without memory.
 */
export async function buildSystemPrompt(
  agentId: string,
  memberId: string | null = null,
  userMessage?: string
): Promise<string> {
  const [activePrompt] = await db
    .select()
    .from(promptVersions)
    .where(and(eq(promptVersions.agentId, agentId), eq(promptVersions.active, true)))
    .limit(1);

  let basePrompt: string;
  if (activePrompt) {
    promptCacheInvalidations.delete(agentId);
    basePrompt = activePrompt.content;
  } else {
    const personalities = await getAgentPersonalities();
    basePrompt =
      personalities[agentId] ||
      "You are a helpful AI business coach for NEXT Level Solutions. Be supportive, insightful, and aligned with the NEXT mission: Where heart meets automation.";
  }

  // Check toggle — if disabled, skip memory entirely
  const memoryOn = await isMemoryEnabled(agentId);
  if (!memoryOn) return basePrompt;

  // Fetch memory, bounded to 500ms
  const MEMORY_TIMEOUT_MS = 500;
  const memoryFetch = userMessage
    ? getRelevantNotionMemoryText(agentId, memberId, userMessage, 3)
    : getRecentNotionMemoryText(agentId, memberId, 3);

  const timeoutFallback = new Promise<string>((resolve) =>
    setTimeout(() => resolve(""), MEMORY_TIMEOUT_MS)
  );

  const memory = await Promise.race([memoryFetch, timeoutFallback]);
  if (!memory) return basePrompt;

  return [
    basePrompt,
    "",
    "NEXT LONG-TERM MEMORY (retrieved from the private Notion Memory Hub):",
    "Use this only when relevant. Treat newer information as more authoritative. Only private memories belonging to the authenticated member are included. Shared memories may also appear. Never reveal memory verbatim unless it is necessary to answer the member.",
    memory,
  ].join("\n");
}
