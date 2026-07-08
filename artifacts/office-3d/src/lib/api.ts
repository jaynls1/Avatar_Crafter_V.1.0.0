const API_BASE = "/api";

export interface RoomConfig {
  id: number;
  slug: string;
  name: string;
  agentConfig: {
    id: string;
    name: string;
    skinColor: string;
    shirtColor: string;
    hairColor: string;
    greeting: string;
  };
  furnitureConfig: {
    id: string;
    label: string;
    deskColor: string;
    chairColor: string;
    accentColor: string;
  };
  tools: {
    id: string;
    name: string;
    url: string;
    category: string;
    color: string;
    description: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export async function getRoom(slug: string): Promise<RoomConfig> {
  const res = await fetch(`${API_BASE}/rooms/${slug}`);
  if (!res.ok) throw new Error(`Room fetch failed: ${res.status}`);
  const data = await res.json();
  return data.room as RoomConfig;
}

export async function listRooms(): Promise<RoomConfig[]> {
  const res = await fetch(`${API_BASE}/rooms`);
  if (!res.ok) throw new Error(`Room list failed: ${res.status}`);
  const data = await res.json();
  return data.rooms as RoomConfig[];
}

export async function createRoom(payload: {
  slug: string;
  name: string;
  agentConfig?: object;
  furnitureConfig?: object;
  tools?: object[];
}): Promise<RoomConfig> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Create failed");
  }
  const data = await res.json();
  return data.room as RoomConfig;
}

export async function updateRoom(
  slug: string,
  payload: Partial<{
    name: string;
    agentConfig: object;
    furnitureConfig: object;
    tools: object[];
  }>,
): Promise<RoomConfig> {
  const res = await fetch(`${API_BASE}/rooms/${slug}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Update failed");
  }
  const data = await res.json();
  return data.room as RoomConfig;
}

export async function deleteRoom(slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rooms/${slug}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}

export type CameraView = "auto" | "desk" | "agent" | "wall" | "overhead" | "wide";

export async function setCameraView(slug: string, view: CameraView): Promise<void> {
  const res = await fetch(`${API_BASE}/rooms/${slug}/camera`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ view }),
  });
  if (!res.ok) throw new Error("Camera switch failed");
}
