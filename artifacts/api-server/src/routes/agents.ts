import { Router, type IRouter } from "express";

const router: IRouter = Router();
const BACK_OFFICE_URL = process.env.BACK_OFFICE_URL;

// Fallback agent roster used when BACK_OFFICE_URL is not configured.
// Colors and roles match the NEXT brand system.
const FALLBACK_AGENTS = [
  { codeName: "Atlas",  fullName: "Atlas",  role: "Strategic Command",       description: "Bridges vision and execution across the NEXT ecosystem.", color: "#F59E0B", provider: "openai" },
  { codeName: "Nova",   fullName: "Nova",   role: "Technical Builder",       description: "Builds and maintains the technical systems powering NEXT.", color: "#3B82F6", provider: "openai" },
  { codeName: "Sniper", fullName: "Sniper", role: "Sales & Conversion",      description: "Designs sales systems and funnels that convert with clarity.", color: "#F97316", provider: "openai" },
  { codeName: "Meme",   fullName: "Meme",   role: "Content & Social",        description: "Manages NEXT's social presence and community voice.", color: "#EC4899", provider: "openai" },
  { codeName: "Anchor", fullName: "Anchor", role: "Design & UX",             description: "Designs the visual and experiential structure of NEXT.", color: "#14B8A6", provider: "openai" },
  { codeName: "Ignite", fullName: "Ignite", role: "Experience & Pathways",   description: "Generates bold ideas and challenges what's conventional.", color: "#EF4444", provider: "openai" },
  { codeName: "Haven",  fullName: "Haven",  role: "Safety & Readiness",      description: "Ensures readiness before every forward move.", color: "#10B981", provider: "openai" },
  { codeName: "Index",  fullName: "Index",  role: "Storage & Indexing",      description: "Organizes everything NEXT knows so nothing gets lost.", color: "#8B5CF6", provider: "openai" },
  { codeName: "Scribe", fullName: "Scribe", role: "NEXT Info Holder",        description: "Captures and maintains the evolving intelligence of the ecosystem.", color: "#FBBF24", provider: "openai" },
  { codeName: "Legion", fullName: "Legion", role: "Legal Compliance & Policy", description: "Ensures every NEXT operation stays within legal frameworks.", color: "#6366F1", provider: "openai" },
  { codeName: "Rook",   fullName: "Rook",   role: "Security & Protection",   description: "Protects the systems, data, and integrity NEXT is built on.", color: "#4B5563", provider: "openai" },
];

router.get("/agents", async (_req, res) => {
  if (!BACK_OFFICE_URL) {
    // No Back Office configured — return the built-in fallback roster
    res.json(FALLBACK_AGENTS);
    return;
  }
  try {
    const upstream = await fetch(`${BACK_OFFICE_URL}/api/agents`);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "Failed to fetch agents from Back Office" });
      return;
    }
    const agents = await upstream.json();
    res.json(agents);
  } catch (err) {
    res.status(502).json({ error: "Could not reach Back Office API" });
  }
});

export default router;
