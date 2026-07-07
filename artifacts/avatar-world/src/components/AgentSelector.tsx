import { useState, useMemo } from "react";
import { Agent } from "../agents";

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  pagedAgentId: string | null;
  activeSpecialtyFilter: string | null;
  onSelect: (agent: Agent) => void;
  onPage: (agentId: string | null) => void;
  onSpecialtyFilter: (specialty: string | null) => void;
}

export function AgentSelector({
  agents,
  selectedAgent,
  pagedAgentId,
  activeSpecialtyFilter,
  onSelect,
  onPage,
  onSpecialtyFilter,
}: AgentSelectorProps) {
  const [paging, setPaging] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const handlePage = (agent: Agent) => {
    if (pagedAgentId === agent.id) {
      onPage(null);
      return;
    }
    setPaging(agent.id);
    setTimeout(() => {
      setPaging(null);
      onPage(agent.id);
    }, 1200);
  };

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
          ◈ NEXT DISPATCH
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
          Page an agent to center stage
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
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
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
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "rgba(255,255,255,0.25)",
              fontSize: 11,
            }}
          >
            No agents match
          </div>
        ) : (
          filteredAgents.map((agent) => {
            const isSelected = selectedAgent?.id === agent.id;
            const isPaged = pagedAgentId === agent.id;
            const isPaging = paging === agent.id;

            return (
              <div
                key={agent.id}
                style={{
                  padding: "8px 12px",
                  borderLeft: isPaged
                    ? `3px solid ${agent.color}`
                    : isSelected
                    ? `3px solid ${agent.color}80`
                    : "3px solid transparent",
                  background: isPaged
                    ? `${agent.color}18`
                    : isSelected
                    ? `${agent.color}0d`
                    : "transparent",
                  transition: "all 0.25s",
                }}
              >
                {/* Agent name row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                    cursor: "pointer",
                  }}
                  onClick={() => onSelect(agent)}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${agent.color}, ${agent.accentColor})`,
                      flexShrink: 0,
                      boxShadow: isPaged ? `0 0 10px ${agent.color}80` : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      color: "white",
                      fontWeight: 700,
                      transition: "box-shadow 0.3s",
                    }}
                  >
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: isPaged ? "white" : isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)",
                        fontSize: 12,
                        fontWeight: isPaged ? 700 : 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {agent.name}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: 9,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {agent.specialty}
                    </div>
                  </div>
                </div>

                {/* Action buttons row */}
                <div style={{ display: "flex", gap: 5 }}>
                  {/* Chat button */}
                  <button
                    onClick={() => onSelect(agent)}
                    style={{
                      flex: 1,
                      padding: "4px 0",
                      borderRadius: 6,
                      border: `1px solid ${isSelected ? agent.color + "60" : "rgba(255,255,255,0.1)"}`,
                      background: isSelected ? `${agent.color}20` : "rgba(255,255,255,0.04)",
                      color: isSelected ? agent.accentColor : "rgba(255,255,255,0.45)",
                      fontSize: 10,
                      cursor: "pointer",
                      fontWeight: 500,
                      transition: "all 0.2s",
                    }}
                  >
                    💬 Chat
                  </button>

                  {/* Dispatch/Page button */}
                  <button
                    onClick={() => handlePage(agent)}
                    disabled={isPaging}
                    style={{
                      flex: 1,
                      padding: "4px 0",
                      borderRadius: 6,
                      border: `1px solid ${
                        isPaged
                          ? agent.color
                          : isPaging
                          ? agent.color + "80"
                          : "rgba(255,255,255,0.1)"
                      }`,
                      background: isPaged
                        ? `${agent.color}30`
                        : isPaging
                        ? `${agent.color}15`
                        : "rgba(255,255,255,0.04)",
                      color: isPaged
                        ? agent.accentColor
                        : isPaging
                        ? agent.color
                        : "rgba(255,255,255,0.45)",
                      fontSize: 10,
                      cursor: isPaging ? "default" : "pointer",
                      fontWeight: isPaged ? 700 : 500,
                      transition: "all 0.2s",
                      animation: isPaging ? "pagePulse 0.6s ease-in-out infinite" : "none",
                    }}
                  >
                    {isPaged ? "✓ Stage" : isPaging ? "📡 Paging" : "📡 Page"}
                  </button>
                </div>
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
        📡 Page → center stage<br />
        💬 Chat → open panel<br />
        🖱️ Drag to explore
      </div>

      <style>{`
        @keyframes pagePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .agent-selector-search::placeholder { color: rgba(255,255,255,0.25); }
        .agent-selector-search:focus {
          border-color: rgba(167,139,250,0.4) !important;
          background: rgba(167,139,250,0.06) !important;
        }
      `}</style>
    </div>
  );
}
