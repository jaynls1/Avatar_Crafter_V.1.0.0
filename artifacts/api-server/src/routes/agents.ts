import { Router, type IRouter } from "express";

const router: IRouter = Router();
const BACK_OFFICE_URL = process.env.BACK_OFFICE_URL;

router.get("/agents", async (_req, res) => {
  if (!BACK_OFFICE_URL) {
    res.status(503).json({ error: "BACK_OFFICE_URL is not configured" });
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
