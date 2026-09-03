import { Router, type IRouter } from "express";
import { z } from "zod";

const router: IRouter = Router();
const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const safeUrl = z.string().url().refine((value) => {
  const parsed = new URL(value);
  return parsed.protocol === "https:" && !parsed.username && !parsed.password;
});
const payloadSchema = z.object({
  contractVersion: z.literal(1),
  officeSlug: slugSchema,
  presentation: z.literal("framed-wall-art"),
  framedWallArt: z.array(z.object({
    id: z.string().uuid(),
    type: z.literal("framed-product-art"),
    mediaUrl: safeUrl,
    accessibleName: z.string().min(1).max(120),
    shortDescription: z.string().max(4000),
    destinationUrl: safeUrl,
    launchBehavior: z.enum(["same-tab", "new-tab", "embedded"]),
    accessLevel: z.enum(["public", "member", "premium", "enterprise"]),
    placement: z.object({
      surface: z.enum(["north-wall", "east-wall", "south-wall", "west-wall", "desk-surface"]),
      position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      scale: z.number().positive().max(5),
      orientation: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      displayOrder: z.number().int().min(0),
    }),
    frame: z.object({ style: z.literal("cinematic-next"), interaction: z.literal("focus-or-activate") }),
    mobileFallback: z.object({ style: z.literal("framed-wall-art"), preciseSelectionRequired: z.literal(false) }),
  })),
});

router.get("/office-products/:officeSlug", async (req, res) => {
  const slug = slugSchema.safeParse(req.params.officeSlug);
  if (!slug.success) return res.status(400).json({ error: "Invalid office slug" });
  const key = process.env.OFFICE_PRODUCTS_READ_KEY;
  if (!key) return res.status(503).json({ error: "Office artwork is not configured" });
  let base: URL;
  try {
    base = new URL(process.env.BACK_OFFICE_URL ?? "https://secure-share-linkzip.replit.app");
    if (base.protocol !== "https:" || base.username || base.password) throw new Error();
  } catch {
    return res.status(503).json({ error: "Office artwork is not configured" });
  }
  try {
    const upstream = await fetch(new URL("/api/v1/office-products/" + encodeURIComponent(slug.data), base), {
      headers: { Accept: "application/json", "x-next-office-service-key": key },
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return res.status(upstream.status === 404 ? 404 : 502).json({ error: "Office artwork is unavailable" });
    const payload = payloadSchema.safeParse(await upstream.json());
    if (!payload.success || payload.data.officeSlug !== slug.data) return res.status(502).json({ error: "Office artwork response was invalid" });
    res.setHeader("Cache-Control", "private, max-age=30");
    return res.json(payload.data);
  } catch {
    return res.status(502).json({ error: "Office artwork is unavailable" });
  }
});

export default router;
