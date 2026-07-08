import { Router, type Response, type IRouter } from "express";
import { db, roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// In-memory SSE client registry: slug → set of response objects
const sseClients = new Map<string, Set<Response>>();

function broadcast(slug: string, data: unknown) {
  const clients = sseClients.get(slug);
  if (!clients?.size) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

const DEFAULT_AGENT = {
  id: "alex",
  name: "Alex",
  skinColor: "#f5cba7",
  shirtColor: "#2980b9",
  hairColor: "#4a3000",
  greeting: "Hi! I'm Alex. Click any poster to visit that tool!",
};

const DEFAULT_FURNITURE = {
  id: "executive",
  label: "Executive",
  deskColor: "#3d2b1f",
  chairColor: "#1a1a1a",
  accentColor: "#8b6914",
};

const DEFAULT_TOOLS = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chat.openai.com", category: "AI", color: "#10a37f", description: "OpenAI's AI assistant" },
  { id: "claude", name: "Claude", url: "https://claude.ai", category: "AI", color: "#c07a4f", description: "Anthropic's AI assistant" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com", category: "AI", color: "#4285f4", description: "Google's AI assistant" },
  { id: "notion", name: "Notion", url: "https://notion.so", category: "Productivity", color: "#000000", description: "All-in-one workspace" },
  { id: "slack", name: "Slack", url: "https://slack.com", category: "Communication", color: "#4a154b", description: "Team messaging" },
  { id: "figma", name: "Figma", url: "https://figma.com", category: "Design", color: "#f24e1e", description: "Collaborative design" },
  { id: "github", name: "GitHub", url: "https://github.com", category: "Development", color: "#24292e", description: "Code hosting" },
  { id: "jira", name: "Jira", url: "https://atlassian.com/jira", category: "Project", color: "#0052cc", description: "Issue tracking" },
  { id: "zapier", name: "Zapier", url: "https://zapier.com", category: "Automation", color: "#ff4a00", description: "App automation" },
  { id: "airtable", name: "Airtable", url: "https://airtable.com", category: "Database", color: "#18bfff", description: "Flexible database" },
  { id: "make", name: "Make", url: "https://make.com", category: "Automation", color: "#6d00cc", description: "Visual automation" },
  { id: "hubspot", name: "HubSpot", url: "https://hubspot.com", category: "CRM", color: "#ff7a59", description: "CRM platform" },
];

// GET /api/rooms — list all rooms
router.get("/rooms", async (_req, res) => {
  try {
    const rooms = await db.select().from(roomsTable).orderBy(roomsTable.createdAt);
    res.json({ rooms });
  } catch (err) {
    console.error("Failed to list rooms", err);
    res.status(500).json({ error: "Failed to list rooms" });
  }
});

// POST /api/rooms — create a room
router.post("/rooms", async (req, res) => {
  try {
    const body = z.object({
      slug: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      agentConfig: z.record(z.unknown()).optional(),
      furnitureConfig: z.record(z.unknown()).optional(),
      tools: z.array(z.record(z.unknown())).optional(),
    }).parse(req.body);

    const [room] = await db.insert(roomsTable).values({
      slug: body.slug,
      name: body.name,
      agentConfig: body.agentConfig ?? DEFAULT_AGENT,
      furnitureConfig: body.furnitureConfig ?? DEFAULT_FURNITURE,
      tools: body.tools ?? DEFAULT_TOOLS,
    }).returning();

    res.status(201).json({ room });
  } catch (err) {
    console.error("Failed to create room", err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
    } else {
      res.status(500).json({ error: "Failed to create room" });
    }
  }
});

// GET /api/rooms/:slug/events — SSE stream for live room updates
router.get("/rooms/:slug/events", (req, res) => {
  const { slug } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Register this client
  if (!sseClients.has(slug)) sseClients.set(slug, new Set());
  sseClients.get(slug)!.add(res);

  // Send a connected ping
  res.write(`data: ${JSON.stringify({ type: "connected", slug })}\n\n`);

  // Heartbeat every 25s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.get(slug)?.delete(res);
  });
});

// GET /api/rooms/:slug — get a single room (auto-creates "default")
router.get("/rooms/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const rooms = await db.select().from(roomsTable).where(eq(roomsTable.slug, slug));
    if (!rooms.length) {
      if (slug === "default") {
        const [room] = await db.insert(roomsTable).values({
          slug: "default",
          name: "Main Office",
          agentConfig: DEFAULT_AGENT,
          furnitureConfig: DEFAULT_FURNITURE,
          tools: DEFAULT_TOOLS,
        }).returning();
        return res.json({ room });
      }
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({ room: rooms[0] });
  } catch (err) {
    console.error("Failed to get room", err);
    res.status(500).json({ error: "Failed to get room" });
  }
});

// PUT /api/rooms/:slug — update room and push live update via SSE
router.put("/rooms/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const body = z.object({
      name: z.string().min(1).max(200).optional(),
      agentConfig: z.record(z.unknown()).optional(),
      furnitureConfig: z.record(z.unknown()).optional(),
      tools: z.array(z.record(z.unknown())).optional(),
    }).parse(req.body);

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.agentConfig !== undefined) updateData.agentConfig = body.agentConfig;
    if (body.furnitureConfig !== undefined) updateData.furnitureConfig = body.furnitureConfig;
    if (body.tools !== undefined) updateData.tools = body.tools;

    const rooms = await db
      .update(roomsTable)
      .set(updateData)
      .where(eq(roomsTable.slug, slug))
      .returning();

    if (!rooms.length) return res.status(404).json({ error: "Room not found" });

    // Push live update to all connected SSE clients for this room
    broadcast(slug, { type: "update", room: rooms[0] });

    res.json({ room: rooms[0] });
  } catch (err) {
    console.error("Failed to update room", err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
    } else {
      res.status(500).json({ error: "Failed to update room" });
    }
  }
});

// POST /api/rooms/:slug/camera — broadcast a named camera view to all connected clients
const VALID_VIEWS = ["auto", "desk", "agent", "wall", "overhead", "wide"] as const;
type CameraView = typeof VALID_VIEWS[number];

router.post("/rooms/:slug/camera", (req, res) => {
  const { slug } = req.params;
  const { view } = req.body as { view?: string };

  if (!view || !(VALID_VIEWS as readonly string[]).includes(view)) {
    return res.status(400).json({
      error: `Invalid view. Must be one of: ${VALID_VIEWS.join(", ")}`,
    });
  }

  broadcast(slug, { type: "camera", view: view as CameraView });
  res.json({ ok: true, slug, view });
});

// DELETE /api/rooms/:slug
router.delete("/rooms/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const rooms = await db.delete(roomsTable).where(eq(roomsTable.slug, slug)).returning();
    if (!rooms.length) return res.status(404).json({ error: "Room not found" });
    // Notify any connected clients the room was deleted
    broadcast(slug, { type: "deleted", slug });
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete room", err);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

export default router;
