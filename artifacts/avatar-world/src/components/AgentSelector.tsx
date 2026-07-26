import { useState, useMemo } from "react";
import { Agent } from "../agents";

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  lobbyAgentIds: Set<string>;
  activeSpecialtyFilter: string | null;
  onSelect: (agent: Agent) => void;
  onSpecialtyFilter: (specialty: string | null) => void;
}

export function AgentSelector({
  agents,
  selectedAgent,
  lobbyAgentIds,
  activeSpecialtyFilter,
  onSelect,
  onSpecialtyFilter,
}: AgentSelectorProps) {
  const [searchText, setSearchText] = useState("");

  const specialties = useMemo(() => {
    const seen = new Set<string>();
    agents.forEach((a) => { if (a.specialty) seen.add(a.specialty); });
    return Array.from(seen).sort();
  }, [agents]);

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchesSpecialty = !activeSpecialtyFilter || a.specialty === activeSpecialtyFilter;
      const matchesSearch =
        !searchText.trim() ||
        a.name.toLowerCase().includes(searchText.toLowerCase()) ||
        a.specialty.toLowerCase().includes(searchText.toLowerCase()) ||
        a.title.toLowerCase().includes(searchText.toLowerCase());
      return matchesSpecialty && matchesSearch;
    });
  }, [agents, activeSpecialtyFilter, searchText]);

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: "210px",
        background: "rgba(4, 4, 18, 0.92)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(108,99,255,0.2)",
        overflowY: "auto",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(108,99,255,0.06)",
          flexShrink: 0,
        }}
      >
        <div style={{ color: "#A78BFA", fontSize: 10, fontWeight: 700, letterSpacing: 2.5, marginBottom: 2 }}>
          ◈ NEXT AGENTS
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
          Click any agent to chat
        </div>
      </div>

      {/* Filter / Search */}
      <div
        style={{
          padding: "10px 10px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {/* Text search */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <span
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.25)",
              fontSize: 11,
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            className="agent-selector-search"
            placeholder="Search agents…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "5px 8px 5px 26px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "rgba(255,255,255,0.8)",
              fontSize: 11,
              outline: "none",
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                fontSize: 12,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Specialty pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <button
            onClick={() => onSpecialtyFilter(null)}
            style={{
              padding: "2px 8px",
              borderRadius: 10,
              border: `1px solid ${!activeSpecialtyFilter ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.12)"}`,
              background: !activeSpecialtyFilter ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
              color: !activeSpecialtyFilter ? "#A78BFA" : "rgba(255,255,255,0.35)",
              fontSize: 9,
              fontWeight: !activeSpecialtyFilter ? 700 : 500,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.18s",
            }}
          >
            All
          </button>
          {specialties.map((s) => (
            <button
              key={s}
              onClick={() => onSpecialtyFilter(activeSpecialtyFilter === s ? null : s)}
              style={{
                padding: "2px 8px",
                borderRadius: 10,
                border: `1px solid ${activeSpecialtyFilter === s ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.12)"}`,
                background: activeSpecialtyFilter === s ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                color: activeSpecialtyFilter === s ? "#A78BFA" : "rgba(255,255,255,0.35)",
                fontSize: 9,
                fontWeight: activeSpecialtyFilter === s ? 700 : 500,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.18s",
                whiteSpace: "nowrap",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Match count */}
        {(activeSpecialtyFilter || searchText.trim()) && (
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, marginTop: 6 }}>
            {filteredAgents.length} of {agents.length} agents
          </div>
        )}
      </div>

      {/* Agent list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {filteredAgents.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
            No agents match
          </div>
        ) : (
          filteredAgents.map((agent) => {
            const isSelected = selectedAgent?.id === agent.id;
            const inLobby    = lobbyAgentIds.has(agent.id);

            return (
              <div
                key={agent.id}
                style={{
                  padding: "8px 12px",
                  borderLeft: isSelected
                    ? `3px solid ${agent.color}80`
                    : "3px solid transparent",
                  background: isSelected ? `${agent.color}0d` : "transparent",
                  transition: "all 0.25s",
                  cursor: "pointer",
                }}
                onClick={() => onSelect(agent)}
              >
                {/* Agent name row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {/* Avatar orb */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${agent.color}, ${agent.accentColor})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        color: "white",
                        fontWeight: 700,
                        boxShadow: isSelected ? `0 0 10px ${agent.color}80` : "none",
                        transition: "box-shadow 0.3s",
                      }}
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    {/* Lobby presence dot */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: inLobby ? "#10B981" : "rgba(255,255,255,0.15)",
                        border: "1.5px solid rgba(4,4,18,0.92)",
                        boxShadow: inLobby ? "0 0 6px #10B981" : "none",
                        transition: "all 0.4s",
                      }}
                      title={inLobby ? "In lobby now" : "In their office"}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)",
                        fontSize: 12,
                        fontWeight: isSelected ? 600 : 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {agent.name}
                    </div>
                    <div
                      style={{
                        color: inLobby ? "#10B98170" : "rgba(255,255,255,0.25)",
                        fontSize: 9,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {inLobby ? "● In lobby" : agent.specialty}
                    </div>
                  </div>
                </div>

                {/* Chat button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(agent); }}
                  style={{
                    width: "100%",
                    padding: "4px 0",
                    borderRadius: 6,
                    border: `1px solid ${isSelected ? agent.color + "60" : "rgba(255,255,255,0.1)"}`,
                    background: isSelected ? `${agent.color}20` : "rgba(255,255,255,0.04)",
                    color: isSelected ? agent.accentColor : "rgba(255,255,255,0.45)",
                    fontSize: 10,
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 0.2s",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  💬 Chat
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.25)",
          fontSize: 10,
          lineHeight: 1.6,
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#10B98170" }}>●</span> In lobby now<br />
        <span style={{ color: "rgba(255,255,255,0.15)" }}>●</span> In their office<br />
        🖱️ Drag to explore
      </div>

      <style>{`
        .agent-selector-search::placeholder { color: rgba(255,255,255,0.25); }
        .agent-selector-search:focus {
          border-color: rgba(167,139,250,0.4) !important;
          background: rgba(167,139,250,0.06) !important;
        }
      `}</style>
    </div>
  );
}
