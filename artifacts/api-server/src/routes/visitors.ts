import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, visitorsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function cors(res: any) { Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v)); }

const VALID_GOALS = [
  "Build a Business",
  "Grow a Community",
  "Explore AI Tools",
  "Just looking",
];

// Bootstrap: create visitors table
let ready = false;
async function bootstrap() {
  if (ready) return;
  ready = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS visitors (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      goal       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error("[visitors] bootstrap failed:", e));

// OPTIONS preflight
router.options("/visitors", (_req, res) => { cors(res); res.sendStatus(204); });

// GET /api/visitors → last 10 visitors
router.get("/visitors", async (_req, res) => {
  cors(res);
  try {
    await bootstrap();
    const rows = await db
      .select()
      .from(visitorsTable)
      .orderBy(desc(visitorsTable.createdAt))
      .limit(10);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/visitors failed", err);
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
});

// POST /api/visitors → log a new visit
router.post("/visitors", async (req, res) => {
  cors(res);
  try {
    await bootstrap();
    const { name, goal } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (!goal || !VALID_GOALS.includes(goal)) {
      res.status(400).json({ error: `goal must be one of: ${VALID_GOALS.join(", ")}` });
      return;
    }

    const [created] = await db
      .insert(visitorsTable)
      .values({ name: name.trim(), goal })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/visitors failed", err);
    res.status(500).json({ error: "Failed to log visitor" });
  }
});

export default router;
