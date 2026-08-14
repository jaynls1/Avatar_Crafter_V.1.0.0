import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function cors(res: any) { Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v)); }

// Bootstrap: create hq_settings table with a single seed row
let ready = false;
async function bootstrap() {
  if (ready) return;
  ready = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hq_settings (
      id         SERIAL PRIMARY KEY,
      screen_url TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Ensure at least one row exists
  await db.execute(sql`
    INSERT INTO hq_settings (id, screen_url)
    VALUES (1, NULL)
    ON CONFLICT (id) DO NOTHING
  `);
}
bootstrap().catch(e => console.error("[hq-screen] bootstrap failed:", e));

// OPTIONS preflight
router.options("/hq-screen", (_req, res) => { cors(res); res.sendStatus(204); });

// GET /api/hq-screen → { screenUrl: string | null }
router.get("/hq-screen", async (_req, res) => {
  cors(res);
  try {
    await bootstrap();
    const rows = await db.execute(sql`SELECT screen_url FROM hq_settings WHERE id = 1`);
    const row = (rows as any).rows?.[0] ?? rows?.[0];
    res.json({ screenUrl: row?.screen_url ?? null });
  } catch (err) {
    console.error("GET /api/hq-screen failed", err);
    res.status(500).json({ error: "Failed to fetch HQ screen config" });
  }
});

// PATCH /api/hq-screen → update screenUrl
router.patch("/hq-screen", async (req, res) => {
  cors(res);
  try {
    await bootstrap();
    const { screenUrl } = req.body ?? {};
    if (screenUrl !== undefined && screenUrl !== null && typeof screenUrl !== "string") {
      res.status(400).json({ error: "screenUrl must be a string or null" });
      return;
    }
    await db.execute(
      sql`UPDATE hq_settings SET screen_url = ${screenUrl ?? null}, updated_at = NOW() WHERE id = 1`
    );
    res.json({ screenUrl: screenUrl ?? null });
  } catch (err) {
    console.error("PATCH /api/hq-screen failed", err);
    res.status(500).json({ error: "Failed to update HQ screen config" });
  }
});

export default router;
