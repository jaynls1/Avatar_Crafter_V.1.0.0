import { useStore } from "../store/useStore";

export default function HUD() {
  const { agentConfig, isSpeaking, showSettings, setShowSettings, speak } = useStore();

  return (
    <div className="ui-overlay">
      <div className="hud-top-bar" style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div className="glass" style={{ padding: "8px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 20 }}>🏢</div>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />
          <div className="hud-brand-text" style={{ fontSize: 13, color: "#c8a050", fontWeight: 600 }}>
            AI Tool Office
          </div>
          <div className="hud-hint-text" style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />
          <div className="hud-hint-text" style={{ fontSize: 11, color: "#888" }}>Click any poster to open a tool</div>
        </div>
      </div>

      <div className="hud-bottom-left" style={{ position: "absolute", bottom: 20, left: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <div className="glass" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: isSpeaking ? "#4ade80" : "#555",
            boxShadow: isSpeaking ? "0 0 8px #4ade80" : "none",
            transition: "all 0.3s",
          }} />
          <span style={{ fontSize: 12, color: isSpeaking ? "#4ade80" : "#888" }}>
            {isSpeaking ? `${agentConfig.name} is speaking...` : `${agentConfig.name} · Ready`}
          </span>
        </div>
      </div>

      <div className="hud-bottom-right" style={{ position: "absolute", bottom: 20, right: 20, display: "flex", gap: 8 }}>
        <button
          className="btn"
          onClick={() => speak(agentConfig.greeting)}
          title="Agent speaks greeting"
        >
          🔊 Greet
        </button>
        <button
          className="btn"
          onClick={() => speak("You can click any poster on the walls to open that software tool. Each frame links directly to the tool.")}
          title="Help"
        >
          ❓ Help
        </button>
        <button
          className={`btn ${showSettings ? "active" : ""}`}
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          ⚙️ Customize
        </button>
      </div>

      <div className="hud-controls-hint" style={{ position: "absolute", top: 16, right: 20 }}>
        <div className="glass" style={{ padding: "8px 14px" }}>
          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.8 }}>
            <div>🖱 Drag to orbit</div>
            <div>🔍 Scroll to zoom</div>
            <div>👆 Click poster to open</div>
          </div>
        </div>
      </div>
    </div>
  );
}
