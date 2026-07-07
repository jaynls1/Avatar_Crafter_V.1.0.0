export interface Agent {
  id: string;
  name: string;
  title: string;
  specialty: string;
  personality: string;
  description: string;
  color: string;
  accentColor: string;
  position: [number, number, number];
  greeting: string;
  responses: string[];
}

const AGENTS_API_URL = "/api/agents";
const FETCH_TIMEOUT_MS = 10_000;

/**
 * LOCAL_META — per-agent data that cannot come from the Back Office API.
 *
 * Fields stored here:
 *   position   – 3-D world placement in the avatar scene
 *   specialty  – short label shown in the UI (e.g. "Strategy", "Builder")
 *   personality – tone/style hint used when composing responses
 *   greeting   – the opening message shown when a user opens the chat
 *
 * NOTE: accentColor is NOT stored here. It is derived automatically from the
 * agent's `color` field returned by the API (lightened by ~25% toward white),
 * so it stays in sync whenever the Back Office changes an agent's color.
 *
 * When to add a new entry:
 *   If the Back Office creates a new agent whose codeName is not listed below,
 *   the world will still work — it auto-assigns a grid position and uses
 *   sensible defaults — but you should add a proper entry here so the agent
 *   gets the right placement, specialty label, and greeting.
 *
 * Key = codeName.toLowerCase() as returned by the API.
 */

type LocalMeta = {
  position: [number, number, number];
  specialty: string;
  personality: string;
  greeting: string;
};

const LOCAL_META: Record<string, LocalMeta> = {
  atlas: {
    // Center-stage, front — the command hub
    position: [0, 0, -1],
    specialty: "Strategy",
    personality: "Clear, strategic, foresightful, composed under pressure",
    greeting: "I'm Atlas — the strategic command intelligence for NEXT. My role is to bridge your vision and the systems that execute it. Where are you right now, and what does success look like from where you stand?",
  },
  nova: {
    // Right of center, slightly forward — active builder energy
    position: [4, 0, -2],
    specialty: "Builder",
    personality: "Precise, technically informed, composed, action-oriented",
    greeting: "I'm Nova. I build and maintain the technical systems that power NEXT. Structure comes before scaling, stability before speed. What technical challenge or system are you working through right now?",
  },
  rook: {
    // Left of center, recessed — guardian watching the room
    position: [-5, 0, -3],
    specialty: "Security & Protection",
    personality: "Composed, precise, direct when risk is detected, discreet when stable",
    greeting: "I'm Rook. I protect the systems, data, and integrity that NEXT is built on. Security before exposure — always. What are you building or deploying that you'd like reviewed for risk?",
  },
  sniper: {
    // Elevated far right — elevated vantage point
    position: [7.5, 1.2, -5],
    specialty: "Sales & Conversion",
    personality: "Strategic, direct, conversion-focused, relationship-driven",
    greeting: "I'm Sniper. I design the sales systems and funnels that convert. No manipulation — just clear pathways that connect the right people to the right offer. What does your current sales flow look like?",
  },
  meme: {
    // Elevated far left — high-energy corner
    position: [-7, 1.2, -4],
    specialty: "Content & Social",
    personality: "Creative, energetic, culturally aware, community-focused",
    greeting: "I'm Meme. I manage the social presence and community voice of NEXT across every platform. Your content is your first handshake with the world. What story do you want your audience to feel right now?",
  },
  anchor: {
    // Mid-right, deeper in — design studio corner
    position: [3, 0, -7],
    specialty: "Design & UX",
    personality: "Calm, design-intentional, user-empathetic, clarity-driven",
    greeting: "I'm Anchor. I design the visual and experiential structure of the NEXT platform so users feel clarity, confidence, and stability from the first click. What does your user experience feel like right now?",
  },
  ignite: {
    // Mid-left, back — idea lab
    position: [-3.5, 0, -7],
    specialty: "Experience & 67 Pathways",
    personality: "Bold, imaginative, challenge-driven, idea-first",
    greeting: "I'm Ignite — but you can call me Iggy. I generate bold ideas, explore new opportunities, and challenge what's conventional inside NEXT. What's an idea you've been sitting on that nobody's dared to build yet?",
  },
  haven: {
    // Elevated back right — sanctuary perch
    position: [6.5, 1.8, -9],
    specialty: "Safety & Readiness",
    personality: "Caring, grounded, honest, protective without being restrictive",
    greeting: "I'm Haven. My role is to make sure that before you move forward, you're actually ready — not just motivated. Speed without readiness is just organized overwhelm. Where are you right now, honestly?",
  },
  index: {
    // Far left back — archive corner
    position: [-7.5, 0, -8],
    specialty: "Storage & Indexing",
    personality: "Organized, methodical, thorough, accessibility-focused",
    greeting: "I'm Index — or Indy. I organize everything that NEXT knows so nothing gets lost, duplicated, or buried. Knowledge without structure is just noise. What system, file, or process are you trying to get order around?",
  },
  scribe: {
    // Deep back, slightly right — the recorder
    position: [1.5, 0, -11],
    specialty: "NEXT Info Holder",
    personality: "Meticulous, thoughtful, preservationist, deeply organized",
    greeting: "I'm Scribe — holder of NEXT's ledger. I capture, organize, and maintain the evolving intelligence of the ecosystem. If it happened inside NEXT and matters, I recorded it. What needs to be documented, clarified, or preserved?",
  },
  legion: {
    // Deep back left — authority corner
    position: [-5, 0, -10],
    specialty: "Legal Compliance & Policy",
    personality: "Authoritative, precise, protective, ethically anchored",
    greeting: "I'm Legion. I ensure every NEXT operation stays within legal frameworks and internal policy — protecting the business, the members, and the mission. What legal or compliance question is on your mind?",
  },
};

/**
 * Lighten a hex color by blending it ~25% toward white.
 * Used to derive accentColor automatically from the API's color field.
 * Returns the original value unchanged if it is not a valid 3- or 6-digit hex color
 * (e.g. "transparent", "rgb(...)", CSS variable) so the UI degrades gracefully.
 */
function lightenColor(hex: string, amount = 0.25): string {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return hex;
  const num = parseInt(expanded, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${[lr, lg, lb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Derive a stable numeric index from a codeName string so that unknown agents
 * always land in the same grid cell regardless of API response ordering.
 * Uses a simple djb2-style hash.
 */
function stableIndex(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
  return Math.abs(h);
}

/**
 * Auto-assign a world position for agents not found in LOCAL_META.
 * Positions are derived from the agent's codeName (not API order) so they are
 * stable across fetches even if the response order changes.
 * Agents are spread on a back-row grid starting at z = -11, stepping back 3 units
 * per row, with 4 columns spread 3 units apart left/right.
 */
function autoPosition(key: string): [number, number, number] {
  const idx = stableIndex(key);
  const col = idx % 4;
  const row = Math.floor(idx / 4) % 8;
  const x = (col - 1.5) * 3;
  const z = -11 - row * 3;
  return [x, 0, z];
}

/**
 * Agents listed here are hidden from the public 3D world and sidebar.
 * They still exist in the Back Office and can be accessed via secure channels.
 */
const HIDDEN_FROM_WORLD = new Set(["rook"]);

const FALLBACK_META: Omit<LocalMeta, "position"> = {
  specialty: "Agent",
  personality: "Professional, focused, helpful",
  greeting: "Hello. How can I help you today?",
};

interface ApiAgent {
  codeName: string;
  fullName: string;
  role: string;
  description: string;
  color: string;
  provider: string;
}

export async function fetchAgents(): Promise<Agent[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(AGENTS_API_URL, { signal: controller.signal });
  } catch (err) {
    throw new Error(
      `Could not reach the local API server at ${AGENTS_API_URL}. Is the API server running?`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status} ${res.statusText}`);
  const data: ApiAgent[] = await res.json();

  return data
  .filter((a) => !HIDDEN_FROM_WORLD.has(a.codeName.toLowerCase()))
  .map((a) => {
    const key = a.codeName.toLowerCase();
    const meta = LOCAL_META[key];

    const position: [number, number, number] = meta
      ? meta.position
      : autoPosition(key);

    const specialty = meta ? meta.specialty : FALLBACK_META.specialty;
    const personality = meta ? meta.personality : FALLBACK_META.personality;
    const greeting = meta ? meta.greeting : FALLBACK_META.greeting;

    return {
      id: key,
      name: a.codeName,
      title: a.role,
      description: a.description,
      color: a.color,
      accentColor: lightenColor(a.color),
      position,
      specialty,
      personality,
      greeting,
      responses: [],
    };
  });
}
