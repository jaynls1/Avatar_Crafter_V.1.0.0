import { useEffect, useState } from "react";
import { Agent } from "../agents";

interface AgentIntroCardProps {
  agent: Agent | null;
  onChat: (agent: Agent) => void;
  onStandDown: () => void;
}

export function AgentIntroCard({ agent, onChat, onStandDown }: AgentIntroCardProps) {
  const [visible, setVisible] = useState(false);
  const [displayed, setDisplayed] = useState<Agent | null>(null);

  useEffect(() => {
    if (agent) {
      setDisplayed(agent);
      const t = setTimeout(() => setVisible(true), 80);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      const t = setTimeout(() => setDisplayed(null), 400);
      return () => clearTimeout(t);
    }
  }, [agent]);

  if (!displayed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0px" : "32px"})`,
        opacity: visible ? 1 : 0,
        transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease",
        zIndex: 150,
        fontFamily: "'Inter', sans-serif",
        width: "min(560px, calc(100vw - 240px))",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          background: "rgba(4, 4, 18, 0.92)",
          backdropFilter: "blur(24px)",
          border: `1px solid ${displayed.color}50`,
          borderRadius: 20,
          padding: "20px 24px",
          boxShadow: `0 0 40px ${displayed.color}25, 0 20px 60px rgba(0,0,0,0.6)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle color wash */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${displayed.color}12 0%, transparent 60%)`,
            pointerEvents: "none",
            borderRadius: 20,
          }}
        />

        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: `linear-gradient(to bottom, ${displayed.color}, ${displayed.accentColor})`,
            borderRadius: "20px 0 0 20px",
          }}
        />

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}>
          {/* Avatar circle */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${displayed.color}, ${displayed.accentColor})`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: "white",
              boxShadow: `0 0 20px ${displayed.color}60`,
              letterSpacing: -0.5,
            }}
          >
            {displayed.name.slice(0, 2).toUpperCase()}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + specialty */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ color: "white", fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
                {displayed.name}
              </span>
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: 20,
                  background: `${displayed.color}25`,
                  border: `1px solid ${displayed.color}50`,
                  color: displayed.accentColor,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                {displayed.specialty}
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                ◉ ON STAGE
              </span>
            </div>

            {/* Title */}
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 10, letterSpacing: 0.3 }}>
              {displayed.title}
            </div>

            {/* Description */}
            <p
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: 13,
                lineHeight: 1.65,
                margin: 0,
                marginBottom: 16,
              }}
            >
              {displayed.description}
            </p>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => onChat(displayed)}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${displayed.color}, ${displayed.accentColor})`,
                  border: "none",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: `0 4px 16px ${displayed.color}40`,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                💬 Chat with {displayed.name}
              </button>
              <button
                onClick={onStandDown}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                }}
              >
                Stand Down
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
