import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, officesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  AUTHORIZATION_ORGANIZATION,
  officeEntitlementCode,
} from "../middlewares/routeAuthorization";
import { requireEntitlement } from "../middlewares/entitlementGuard";
import { requireOfficeManager } from "../middlewares/officeManager";

const router: IRouter = Router();

// Static seed — canonical office definitions (wing + accent bundled here so
// the DB is fully authoritative after first run)
// ---------------------------------------------------------------------------
const SEED_OFFICES = [
  { slug: "atlas",     name: "Atlas",      description: "Chief AI Officer — C-Suite corner office",  url: "/office-3d/atlas",                               wing: "A", accentColor: "#c8a050" },
  { slug: "nova",      name: "Nova",       description: "Workshop — Build & Tech Architect",          url: "/office-3d/office/nova",                         wing: "A", accentColor: "#4a9eff" },
  { slug: "sniper",    name: "Sniper",     description: "Consulting Office — Sales & Partnerships",   url: "/office-3d/office/sniper",                       wing: "A", accentColor: "#f87171" },
  { slug: "meme",      name: "Meme",       description: "Creative Studio — Content & Brand",          url: "/office-3d/office/meme",                         wing: "A", accentColor: "#e879f9" },
  { slug: "scribe",    name: "Scribe",     description: "The Great Library — Knowledge & Docs",       url: "/office-3d/office/scribe",                       wing: "A", accentColor: "#fbbf24" },
  { slug: "indy",      name: "Indy",       description: "Creative Studio — Systems & Data",           url: "/office-3d/office/indy",                         wing: "A", accentColor: "#86efac" },
  { slug: "rook",      name: "Rook",       description: "Security Command — Legal & Compliance",      url: "/office-3d/office/rook",                         wing: "B", accentColor: "#22d3ee" },
  { slug: "iggy",      name: "Iggy",       description: "Innovation Garage — R&D",                   url: "/office-3d/office/iggy",                         wing: "B", accentColor: "#fb923c" },
  { slug: "anchor",    name: "Anchor",     description: "Mission Control — Operations",               url: "/office-3d/office/anchor",                       wing: "B", accentColor: "#818cf8" },
  { slug: "haven",     name: "Haven",      description: "Sanctuary — Member Success",                 url: "/office-3d/office/haven",                        wing: "B", accentColor: "#f9a8d4" },
  { slug: "breakroom", name: "Breakroom",  description: "Take a breather — social lounge",           url: "https://the-break-room-project.vercel.app/",     wing: "B", accentColor: "#4ade80" },
];

const CANONICAL_OFFICES = new Map(
  SEED_OFFICES.map((office) => [office.slug, office] as const),
);

// ---------------------------------------------------------------------------
// Bootstrap: create the offices table and seed it if empty.
// Runs once at startup; subsequent calls are no-ops.
// ---------------------------------------------------------------------------
let bootstrapped = false;

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  // Create the table if it doesn't already exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS offices (
      id          SERIAL PRIMARY KEY,
      slug        TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      url         TEXT NOT NULL,
      wing        TEXT NOT NULL DEFAULT 'A',
      accent_color TEXT NOT NULL DEFAULT '#4a9eff',
      is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Seed static offices only if the table is completely empty
  const existing = await db
    .select({ id: officesTable.id })
    .from(officesTable)
    .limit(1);

  if (existing.length === 0) {
    await db.insert(officesTable).values(SEED_OFFICES);
  }
}

// Kick off immediately so the table is ready before the first request
bootstrap().catch((err) => console.error("[offices] bootstrap failed:", err));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toPublic(row: typeof officesTable.$inferSelect) {
  return {
    slug:        row.slug,
    name:        row.name,
    description: row.description,
    wing:        row.wing,
    accentColor: row.accentColor,
    requiresEntitlement: true,
    createdAt:   row.createdAt,
    updatedAt:   row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// GET /api/offices — list all non-deleted offices
// ---------------------------------------------------------------------------
router.get("/offices", async (_req, res) => {
  try {
    await bootstrap();
    const rows = await db
      .select()
      .from(officesTable)
      .where(eq(officesTable.isDeleted, false))
      .orderBy(officesTable.id);
    res.json(rows.map(toPublic));
  } catch (err) {
    console.error("GET /api/offices failed", err);
    res.status(500).json({ error: "Failed to list offices" });
  }
});

// Resolve an office URL only after an explicit purchased-office entitlement
// check. Public directory responses intentionally do not expose entry URLs.
router.get(
  "/offices/:slug/entry",
  (req, res, next) => requireEntitlement(
    AUTHORIZATION_ORGANIZATION,
    officeEntitlementCode(String(req.params.slug)),
  )(req, res, next),
  async (req, res) => {
    try {
      await bootstrap();
      const slug = String(req.params.slug).toLowerCase();
      const [office] = await db
        .select()
        .from(officesTable)
        .where(and(eq(officesTable.slug, slug), eq(officesTable.isDeleted, false)))
        .limit(1);
      if (!office) {
        res.status(404).json({ error: "Office not found" });
        return;
      }
      res.json({ ...toPublic(office), url: office.url });
    } catch (err) {
      console.error("GET /api/offices/:slug/entry failed", err);
      res.status(500).json({ error: "Failed to resolve office entry" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/offices — create a new office
// ---------------------------------------------------------------------------
router.post("/offices", requireOfficeManager, async (req, res) => {
  try {
    const { slug, name, description = "", url, wing = "A", accentColor = "#4a9eff" } = req.body ?? {};

    if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug.trim())) {
      res.status(400).json({ error: "slug must contain only lowercase letters, numbers, and hyphens" });
      return;
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (!url || typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    await bootstrap();

    // Check for slug collision (including soft-deleted rows)
    const collision = await db
      .select({ id: officesTable.id })
      .from(officesTable)
      .where(eq(officesTable.slug, slug.trim()))
      .limit(1);

    if (collision.length > 0) {
      res.status(400).json({ error: `An office with slug "${slug}" already exists` });
      return;
    }

    const [created] = await db
      .insert(officesTable)
      .values({
        slug: slug.trim(),
        name: name.trim(),
        description: typeof description === "string" ? description.trim() : "",
        url: url.trim(),
        wing: typeof wing === "string" ? wing.trim() : "A",
        accentColor: typeof accentColor === "string" ? accentColor.trim() : "#4a9eff",
      })
      .returning();

    res.status(201).json(toPublic(created));
  } catch (err) {
    console.error("POST /api/offices failed", err);
    res.status(500).json({ error: "Failed to create office" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/offices/:slug — partial update
// ---------------------------------------------------------------------------
router.patch("/offices/:slug", requireOfficeManager, async (req, res) => {
  try {
    await bootstrap();
    const slug = String(req.params.slug);

    const [existing] = await db
      .select()
      .from(officesTable)
      .where(and(eq(officesTable.slug, slug), eq(officesTable.isDeleted, false)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: `No office with slug "${slug}" found` });
      return;
    }

    const allowed = CANONICAL_OFFICES.has(slug)
      ? ["description", "accentColor"] as const
      : ["name", "description", "url", "wing", "accentColor"] as const;
    type AllowedKey = typeof allowed[number];

    // Map camelCase body keys to what the DB column is named via the ORM
    const colMap: Record<AllowedKey, string> = {
      name:        "name",
      description: "description",
      url:         "url",
      wing:        "wing",
      accentColor: "accentColor",
    };

    const updates: Partial<typeof officesTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    for (const key of allowed) {
      const val = (req.body ?? {})[key];
      if (val !== undefined && typeof val === "string") {
        (updates as Record<string, string>)[colMap[key]] = val.trim();
      }
    }

    const [updated] = await db
      .update(officesTable)
      .set(updates)
      .where(eq(officesTable.slug, slug))
      .returning();

    res.json(toPublic(updated));
  } catch (err) {
    console.error("PATCH /api/offices/:slug failed", err);
    res.status(500).json({ error: "Failed to update office" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/offices/:slug — soft-delete
// ---------------------------------------------------------------------------
router.delete("/offices/:slug", requireOfficeManager, async (req, res) => {
  try {
    await bootstrap();
    const slug = String(req.params.slug);

    if (CANONICAL_OFFICES.has(slug)) {
      res.status(409).json({ error: "Canonical offices cannot be deleted" });
      return;
    }

    const [existing] = await db
      .select({ id: officesTable.id })
      .from(officesTable)
      .where(and(eq(officesTable.slug, slug), eq(officesTable.isDeleted, false)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: `No office with slug "${slug}" found` });
      return;
    }

    await db
      .update(officesTable)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(officesTable.slug, slug));

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/offices/:slug failed", err);
    res.status(500).json({ error: "Failed to delete office" });
  }
});

export default router;
