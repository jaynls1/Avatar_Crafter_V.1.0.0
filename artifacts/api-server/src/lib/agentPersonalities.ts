import { eq, and } from "drizzle-orm";
import { db, promptVersions } from "@workspace/db";

const BACK_OFFICE_URL = 'https://secure-share-linkzip.replit.app';
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

export async function buildSystemPrompt(agentId: string): Promise<string> {
  const [activePrompt] = await db
    .select()
    .from(promptVersions)
    .where(and(eq(promptVersions.agentId, agentId), eq(promptVersions.active, true)))
    .limit(1);

  if (activePrompt) {
    promptCacheInvalidations.delete(agentId);
    return activePrompt.content;
  }

  const personalities = await getAgentPersonalities();
  const systemPrompt = personalities[agentId];
  if (!systemPrompt) {
    return "You are a helpful AI business coach for NEXT Level Solutions. Be supportive, insightful, and aligned with the NEXT mission: Where heart meets automation.";
  }
  return systemPrompt;
}
