import { useState } from "react";
import { useStore } from "../store/useStore";
import { AGENT_PRESETS, FURNITURE_PRESETS } from "../data/tools";

export default function SettingsPanel() {
  const { agentConfig, furnitureConfig, setAgent, setFurniture, setShowSettings, speak } = useStore();
  const [tab, setTab] = useState<"agent" | "furniture">("agent");
  const [customName, setCustomName] = useState(agentConfig.name);
  const [customGreeting, setCustomGreeting] = useState(agentConfig.greeting);
  const [customSkin, setCustomSkin] = useState(agentConfig.skinColor);
  const [customShirt, setCustomShirt] = useState(agentConfig.shirtColor);
  const [customHair, setCustomHair] = useState(agentConfig.hairColor);

  const handleAgentSelect = (preset: typeof AGENT_PRESETS[0]) => {
    setAgent(preset);
    setCustomName(preset.name);
    setCustomGreeting(preset.greeting);
    setCustomSkin(preset.skinColor);
    setCustomShirt(preset.shirtColor);
    setCustomHair(preset.hairColor);
  };

  const applyCustomAgent = () => {
    const custom = AGENT_PRESETS.find(p => p.id === "custom")!;
    setAgent({
      ...custom,
      name: customName,
      greeting: customGreeting,
      skinColor: customSkin,
      shirtColor: customShirt,
      hairColor: customHair,
    });
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div className="glass settings-panel" style={{
        width: 480, maxHeight: "85vh", overflowY: "auto",
        padding: "24px", color: "#e8e4d8",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#c8a050" }}>⚙️ Office Settings</h2>
          <button className="btn" onClick={() => setShowSettings(false)}>✕ Close</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["agent", "furniture"] as const).map(t => (
            <button key={t} className={`btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}
              style={{ textTransform: "capitalize" }}>
              {t === "agent" ? "🤖 Agent" : "🪑 Furniture"}
            </button>
          ))}
        </div>

        {tab === "agent" && (
          <div>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
              Choose a preset or build a custom agent. Changes apply instantly.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {AGENT_PRESETS.filter(p => p.id !== "custom").map(preset => (
                <div key={preset.id}
                  onClick={() => handleAgentSelect(preset)}
                  style={{
                    padding: "12px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${agentConfig.id === preset.id ? "#c8a050" : "rgba(255,255,255,0.1)"}`,
                    background: agentConfig.id === preset.id ? "rgba(200,160,80,0.12)" : "rgba(255,255,255,0.03)",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: preset.skinColor,
                      border: `3px solid ${preset.shirtColor}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16,
                    }}>
                      🧑
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{preset.name}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{preset.greeting.slice(0, 38)}...</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#c8a050" }}>
                🎨 Build Custom Agent
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 12, color: "#aaa" }}>
                  Agent Name
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    style={{
                      display: "block", width: "100%", marginTop: 4,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6, padding: "6px 10px", color: "#e8e4d8", fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#aaa" }}>
                  Greeting Message
                  <textarea
                    value={customGreeting}
                    onChange={e => setCustomGreeting(e.target.value)}
                    rows={2}
                    style={{
                      display: "block", width: "100%", marginTop: 4,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6, padding: "6px 10px", color: "#e8e4d8", fontSize: 13,
                      resize: "vertical",
                    }}
                  />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {([
                    { label: "Skin", value: customSkin, set: setCustomSkin },
                    { label: "Shirt", value: customShirt, set: setCustomShirt },
                    { label: "Hair", value: customHair, set: setCustomHair },
                  ] as const).map(({ label, value, set }) => (
                    <label key={label} style={{ fontSize: 12, color: "#aaa" }}>
                      {label}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <input type="color" value={value} onChange={e => set(e.target.value)}
                          style={{ width: 32, height: 26, borderRadius: 4, border: "none", cursor: "pointer" }} />
                        <span style={{ fontSize: 10, color: "#666" }}>{value}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="btn active" onClick={applyCustomAgent} style={{ flex: 1 }}>
                    ✓ Apply Custom Agent
                  </button>
                  <button className="btn" onClick={() => speak(customGreeting)} style={{ flex: 1 }}>
                    🔊 Preview Voice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "furniture" && (
          <div>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
              Choose a furniture style. Changes the desk, chair, and accent colors.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {FURNITURE_PRESETS.map(preset => (
                <div key={preset.id}
                  onClick={() => setFurniture(preset)}
                  style={{
                    padding: "14px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${furnitureConfig.id === preset.id ? "#c8a050" : "rgba(255,255,255,0.1)"}`,
                    background: furnitureConfig.id === preset.id ? "rgba(200,160,80,0.12)" : "rgba(255,255,255,0.03)",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {[preset.deskColor, preset.chairColor, preset.accentColor].map((c, i) => (
                      <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: "1px solid rgba(255,255,255,0.15)" }} />
                    ))}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{preset.label}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    Desk · Chair · Accent
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
