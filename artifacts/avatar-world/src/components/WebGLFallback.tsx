import { Agent } from "../agents";

interface WebGLFallbackProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelect: (agent: Agent) => void;
}

export function WebGLFallback({ agents, selectedAgent, onSelect }: WebGLFallbackProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at center, #0d0d2e 0%, #010108 100%)",
        fontFamily: "'Inter', sans-serif",
        color: "white",
        gap: 24,
        padding: 40,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌐</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#A78BFA", marginBottom: 8 }}>
          3D Agent World
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>
          This experience requires WebGL. Open it in <strong style={{ color: "white" }}>Chrome or Firefox</strong> on your device for the full immersive 3D experience with voice, motion, and live agents.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 12,
          width: "100%",
          maxWidth: 700,
        }}
      >
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onSelect(agent)}
            style={{
              background: `linear-gradient(135deg, ${agent.color}20, rgba(255,255,255,0.03))`,
              border: `1px solid ${agent.color}40`,
              borderRadius: 12,
              padding: "14px 12px",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${agent.color}, ${agent.accentColor})`,
                margin: "0 auto 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              🤖
            </div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "white" }}>{agent.name}</div>
            <div style={{ fontSize: 10, color: agent.accentColor, marginTop: 2 }}>{agent.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
