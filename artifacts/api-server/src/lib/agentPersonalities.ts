const BACK_OFFICE_URL = 'https://secure-share-linkzip.replit.app';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cachedPersonalities: Record<string, string> | null = null;
let cacheTimestamp: number = 0;

export async function getAgentPersonalities(): Promise<Record<string, string>> {
  if (cachedPersonalities && Date.now() - cacheTimestamp < CACHE_TTL_MS) return cachedPersonalities;
  const res = await fetch(`${BACK_OFFICE_URL}/api/agents`);
  const agents = await res.json();
  cachedPersonalities = {};
  cacheTimestamp = Date.now();
  for (const agent of agents) {
    cachedPersonalities[agent.codeName] = agent.systemPrompt;
  }
  return cachedPersonalities;
}

export async function buildSystemPrompt(agentId: string): Promise<string> {
  const personalities = await getAgentPersonalities();
  const systemPrompt = personalities[agentId];
  if (!systemPrompt) {
    return "You are a helpful AI business coach for NEXT Level Solutions. Be supportive, insightful, and aligned with the NEXT mission: Where heart meets automation.";
  }
  return systemPrompt;
}
