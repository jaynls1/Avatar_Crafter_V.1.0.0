import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { listRooms, createRoom, updateRoom, deleteRoom, type RoomConfig } from "../lib/api";
import { SOFTWARE_TOOLS, AGENT_PRESETS, FURNITURE_PRESETS } from "../data/tools";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminPage() {
  const [, navigate] = useLocation();
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"rooms" | "tools">("rooms");
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await listRooms();
      setRooms(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!newSlug.match(/^[a-z0-9-]+$/)) {
      setCreateError("Slug must be lowercase letters, numbers, and hyphens only.");
      return;
    }
    try {
      setCreating(true);
      await createRoom({
        slug: newSlug.trim(),
        name: newName.trim() || newSlug,
        agentConfig: AGENT_PRESETS[0],
        furnitureConfig: FURNITURE_PRESETS[0],
        tools: SOFTWARE_TOOLS.slice(0, 12),
      });
      setNewSlug("");
      setNewName("");
      await load();
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`Delete room "${slug}"? This cannot be undone.`)) return;
    try {
      await deleteRoom(slug);
      await load();
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleToggleTool(room: RoomConfig, toolId: string) {
    const has = room.tools.find(t => t.id === toolId);
    const newTools = has
      ? room.tools.filter(t => t.id !== toolId)
      : [...room.tools, SOFTWARE_TOOLS.find(t => t.id === toolId)!];
    try {
      await updateRoom(room.slug, { tools: newTools });
      await load();
    } catch (e) {
      alert(String(e));
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0d1117", color: "#e8e4d8",
      fontFamily: "system-ui, sans-serif", padding: "32px 24px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="admin-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#c8a050", marginBottom: 4 }}>🏢 Office Admin</h1>
            <p style={{ fontSize: 13, color: "#888" }}>Manage rooms, tools, and agent configurations.</p>
          </div>
          <div className="admin-header-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => navigate("/")} style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)", color: "#e8e4d8", cursor: "pointer", fontSize: 13,
            }}>
              ← Back to Office
            </button>
            <button onClick={load} style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)",
              background: "rgba(200,160,80,0.1)", color: "#c8a050", cursor: "pointer", fontSize: 13,
            }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="admin-tabs" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["rooms", "tools"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
              border: `1px solid ${tab === t ? "rgba(200,160,80,0.5)" : "rgba(255,255,255,0.1)"}`,
              background: tab === t ? "rgba(200,160,80,0.15)" : "transparent",
              color: tab === t ? "#c8a050" : "#888",
            }}>
              {t === "rooms" ? "🏠 Rooms" : "🔧 Tools"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#2d0a0a", border: "1px solid #7a2020", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#ff8080", fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {tab === "rooms" && (
          <>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#c8a050" }}>Create New Room</h2>
              <form onSubmit={handleCreate}>
                <div className="admin-input-row" style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: createError ? 8 : 0 }}>
                  <label style={{ flex: 1, fontSize: 12, color: "#aaa" }}>
                    Slug (URL key)
                    <input
                      value={newSlug}
                      onChange={e => setNewSlug(e.target.value.toLowerCase())}
                      placeholder="my-room"
                      required
                      style={{ display: "block", width: "100%", marginTop: 4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "8px 10px", color: "#e8e4d8", fontSize: 13 }}
                    />
                  </label>
                  <label style={{ flex: 1, fontSize: 12, color: "#aaa" }}>
                    Display Name
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="My Room"
                      style={{ display: "block", width: "100%", marginTop: 4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "8px 10px", color: "#e8e4d8", fontSize: 13 }}
                    />
                  </label>
                  <button type="submit" disabled={creating} style={{
                    padding: "8px 20px", height: 38, borderRadius: 8,
                    border: "1px solid rgba(200,160,80,0.4)", background: "rgba(200,160,80,0.15)",
                    color: "#c8a050", cursor: creating ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
                    opacity: creating ? 0.6 : 1, whiteSpace: "nowrap",
                  }}>
                    {creating ? "Creating..." : "+ Create"}
                  </button>
                </div>
                {createError && <p style={{ fontSize: 12, color: "#ff8080", marginTop: 6 }}>{createError}</p>}
              </form>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", color: "#555", padding: "48px 0", fontSize: 14 }}>Loading rooms…</div>
            ) : rooms.length === 0 ? (
              <div style={{ textAlign: "center", color: "#555", padding: "48px 0", fontSize: 14 }}>No rooms yet. Create one above.</div>
            ) : (
              <div className="admin-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {rooms.map(room => (
                  <div key={room.slug} className="admin-card" style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{room.name}</div>
                        <div style={{ fontSize: 12, color: "#888", fontFamily: "monospace", marginTop: 2 }}>/{room.slug}</div>
                      </div>
                      <button onClick={() => handleDelete(room.slug)} style={{
                        padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(200,80,80,0.3)",
                        background: "rgba(200,80,80,0.1)", color: "#ff8080", cursor: "pointer", fontSize: 12,
                      }}>
                        Delete
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.2)", color: "#c8a050" }}>
                        🤖 {room.agentConfig.name}
                      </span>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(100,150,200,0.1)", border: "1px solid rgba(100,150,200,0.2)", color: "#88aacc" }}>
                        🪑 {room.furnitureConfig.label}
                      </span>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(100,200,100,0.1)", border: "1px solid rgba(100,200,100,0.2)", color: "#88cc88" }}>
                        🔧 {room.tools.length} tools
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={`${base}/?room=${room.slug}`} style={{
                        flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 7,
                        border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.1)",
                        color: "#c8a050", textDecoration: "none", fontSize: 12, fontWeight: 500,
                      }}>
                        🏢 Open Room
                      </a>
                      <a href={`${base}/camera?room=${room.slug}`} style={{
                        flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 7,
                        border: "1px solid rgba(100,150,200,0.3)", background: "rgba(100,150,200,0.1)",
                        color: "#88aacc", textDecoration: "none", fontSize: 12, fontWeight: 500,
                      }}>
                        📷 Camera View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "tools" && (
          <>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              Toggle which tools appear in each room. Rooms load tools from the API.
            </p>
            {loading ? (
              <div style={{ textAlign: "center", color: "#555", padding: "48px 0" }}>Loading…</div>
            ) : rooms.length === 0 ? (
              <div style={{ textAlign: "center", color: "#555", padding: "48px 0" }}>Create a room first.</div>
            ) : rooms.map(room => (
              <div key={room.slug} style={{ ...cardStyle, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#c8a050", marginBottom: 14 }}>
                  {room.name} <span style={{ fontSize: 12, color: "#666", fontWeight: 400 }}>/{room.slug}</span>
                </h3>
                <div className="admin-tool-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {SOFTWARE_TOOLS.map(tool => {
                    const enabled = !!room.tools.find(t => t.id === tool.id);
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleToggleTool(room, tool.id)}
                        style={{
                          padding: "8px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                          border: `1px solid ${enabled ? "rgba(200,160,80,0.4)" : "rgba(255,255,255,0.08)"}`,
                          background: enabled ? "rgba(200,160,80,0.12)" : "rgba(255,255,255,0.03)",
                          color: enabled ? "#e8e4d8" : "#666", transition: "all 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: tool.color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{tool.name}</div>
                            <div style={{ fontSize: 10, color: "#666" }}>{tool.category}</div>
                          </div>
                          <div style={{ marginLeft: "auto", fontSize: 10, color: enabled ? "#4ade80" : "#555" }}>
                            {enabled ? "✓" : "○"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
