import { Router, type IRouter } from "express";
import { db, roomsTable } from "@workspace/db";

const router: IRouter = Router();

// Static office definitions — mirrors office-3d/src/data/offices.ts
const STATIC_OFFICES = [
  { slug: "atlas",    name: "Atlas",     description: "Chief AI Officer — C-Suite corner office",  wing: "A", accentColor: "#c8a050", url: "/office-3d/atlas"        },
  { slug: "nova",     name: "Nova",      description: "Workshop — Build & Tech Architect",          wing: "A", accentColor: "#4a9eff", url: "/office-3d/office/nova"  },
  { slug: "sniper",   name: "Sniper",    description: "Consulting Office — Sales & Partnerships",   wing: "A", accentColor: "#f87171", url: "/office-3d/office/sniper" },
  { slug: "meme",     name: "Meme",      description: "Creative Studio — Content & Brand",          wing: "A", accentColor: "#e879f9", url: "/office-3d/office/meme"  },
  { slug: "scribe",   name: "Scribe",    description: "The Great Library — Knowledge & Docs",       wing: "A", accentColor: "#fbbf24", url: "/office-3d/office/scribe" },
  { slug: "indy",     name: "Indy",      description: "Creative Studio — Systems & Data",           wing: "A", accentColor: "#86efac", url: "/office-3d/office/indy"  },
  { slug: "rook",     name: "Rook",      description: "Security Command — Legal & Compliance",      wing: "B", accentColor: "#22d3ee", url: "/office-3d/office/rook"  },
  { slug: "iggy",     name: "Iggy",      description: "Innovation Garage — R&D",                   wing: "B", accentColor: "#fb923c", url: "/office-3d/office/iggy"  },
  { slug: "anchor",   name: "Anchor",    description: "Mission Control — Operations",               wing: "B", accentColor: "#818cf8", url: "/office-3d/office/anchor" },
  { slug: "haven",    name: "Haven",     description: "Sanctuary — Member Success",                 wing: "B", accentColor: "#f9a8d4", url: "/office-3d/office/haven" },
  { slug: "breakroom",name: "Breakroom", description: "Take a breather — social lounge",           wing: "B", accentColor: "#4ade80", url: "https://the-break-room-project.vercel.app/" },
];

/**
 * GET /api/offices
 *
 * Public, unauthenticated endpoint for external back-office room discovery.
 * Returns every defined room/office in this project — static agent offices
 * plus any custom DB-backed rooms — in a normalised shape.
 *
 * CORS: Access-Control-Allow-Origin: * (read-only metadata, no secrets)
 */
router.get("/offices", async (_req, res) => {
  // Explicit wildcard CORS so the external back office can reach this endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    // Fetch any custom DB rooms and map them to the same shape
    let dbRooms: { slug: string; name: string; description: string; url: string }[] = [];
    try {
      const rows = await db.select().from(roomsTable);
      dbRooms = rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        description: "Custom room",
        url: `/avatar-world/room/${r.slug}`,
      }));
    } catch {
      // DB unavailable — still return static list
    }

    // Merge: static offices first, then any DB rooms not already covered
    const staticSlugs = new Set(STATIC_OFFICES.map((o) => o.slug));
    const merged = [
      ...STATIC_OFFICES,
      ...dbRooms.filter((r) => !staticSlugs.has(r.slug)),
    ];

    res.json(merged);
  } catch (err) {
    console.error("GET /api/offices failed", err);
    res.status(500).json({ error: "Failed to list offices" });
  }
});

// Handle preflight
router.options("/offices", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

export default router;
