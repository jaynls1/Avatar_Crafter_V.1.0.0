export type LaunchBehavior = "same-tab" | "new-tab" | "embedded";
export interface FramedWallArt {
  id: string; mediaUrl: string; accessibleName: string; shortDescription: string;
  destinationUrl: string; launchBehavior: LaunchBehavior;
  placement: {
    surface: string; position: { x: number; y: number; z: number }; scale: number;
    orientation: { x: number; y: number; z: number }; displayOrder: number;
  };
}
export function safeHttpsUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed : null;
  } catch { return null; }
}
const vector = (value: any) => value && ["x", "y", "z"].every((key) => typeof value[key] === "number" && Number.isFinite(value[key]));
const valid = (item: any): item is FramedWallArt =>
  item && typeof item.id === "string" && typeof item.accessibleName === "string" && item.accessibleName.length > 0 &&
  typeof item.shortDescription === "string" && safeHttpsUrl(item.mediaUrl) !== null && safeHttpsUrl(item.destinationUrl) !== null &&
  ["same-tab", "new-tab", "embedded"].includes(item.launchBehavior) && vector(item.placement?.position) &&
  vector(item.placement?.orientation) && item.placement.scale > 0 && item.placement.scale <= 5;
export async function fetchOfficeWallArt(slug: string, signal: AbortSignal): Promise<FramedWallArt[]> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return [];
  const response = await fetch("/api/office-products/" + encodeURIComponent(slug), { credentials: "same-origin", signal });
  if (!response.ok) throw new Error("Office artwork request failed: " + response.status);
  const payload = await response.json();
  if (payload.contractVersion !== 1 || payload.officeSlug !== slug || payload.presentation !== "framed-wall-art" || !Array.isArray(payload.framedWallArt)) throw new Error("Invalid office artwork response");
  return payload.framedWallArt.filter(valid).sort((a: FramedWallArt, b: FramedWallArt) => a.placement.displayOrder - b.placement.displayOrder);
}
