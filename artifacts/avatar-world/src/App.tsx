import { useState, useCallback, useEffect } from "react";
import { Agent, fetchAgents } from "./agents";
import { Scene3D } from "./components/Scene3D";
import { InteractionPanel } from "./components/InteractionPanel";
import { AgentSelector } from "./components/AgentSelector";
import { AgentIntroCard } from "./components/AgentIntroCard";
import { WebGLFallback } from "./components/WebGLFallback";
import { Walkthrough } from "./components/Walkthrough";
import { useAuth } from "@workspace/replit-auth-web";

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

function SpecialtyFilterBanner({
  specialty,
  onClear,
}: {
  specialty: string;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(5,5,20,0.82)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(167,139,250,0.45)",
        borderRadius: 40,
        padding: "8px 18px 8px 16px",
        color: "white",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 10,
        zIndex: 300,
        boxShadow: "0 4px 24px rgba(108,99,255,0.25)",
        animation: "filterBannerIn 0.25s ease",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>
        Filtering by:
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#A78BFA",
          letterSpacing: 0.3,
        }}
      >
        {specialty}
      </span>
      <button
        onClick={onClear}
        title="Clear filter"
        aria-label="Clear specialty filter"
        style={{
          background: "rgba(167,139,250,0.18)",
          border: "1px solid rgba(167,139,250,0.35)",
          borderRadius: "50%",
          color: "#A78BFA",
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes filterBannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function HUD({ agentCount, pagedAgentName }: { agentCount: number; pagedAgentName: string | null }) {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(5,5,20,0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(108,99,255,0.3)",
        borderRadius: 16,
        padding: "10px 24px",
        color: "white",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 16,
        zIndex: 200,
      }}
    >
      <div style={{ color: "#A78BFA", fontWeight: 700, fontSize: 15, letterSpacing: 1, pointerEvents: "none" }}>
        ◈ AGENT WORLD
      </div>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
      {pagedAgentName ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#10B981",
              boxShadow: "0 0 8px #10B981",
              animation: "hudPulse 1s ease-in-out infinite",
            }}
          />
          <span style={{ color: "#10B981", fontSize: 12, fontWeight: 600 }}>
            {pagedAgentName} on stage
          </span>
        </div>
      ) : (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, pointerEvents: "none" }}>
          {agentCount} Agents Active
        </div>
      )}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, pointerEvents: "none" }}>
        {pagedAgentName ? "Click agent to chat" : "📡 Page · 💬 Chat · 🖱️ Explore"}
      </div>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
      {!isLoading && (
        isAuthenticated ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user?.profileImageUrl && (
              <img
                src={user.profileImageUrl}
                alt="profile"
                style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              {user?.firstName ?? user?.email ?? "User"}
            </span>
            <button
              onClick={logout}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                padding: "3px 10px",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            style={{
              background: "rgba(167,139,250,0.15)",
              border: "1px solid rgba(167,139,250,0.4)",
              borderRadius: 8,
              color: "#A78BFA",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 14px",
              cursor: "pointer",
            }}
          >
            Log in
          </button>
        )
      )}
      <style>{`
        @keyframes hudPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

const urlParams = new URLSearchParams(window.location.search);
const EMBED_MODE = urlParams.get("mode") === "embed";
const EMBED_AGENT_ID = urlParams.get("agent") ?? null;

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [pagedAgentId, setPagedAgentId] = useState<string | null>(
    EMBED_MODE && EMBED_AGENT_ID ? EMBED_AGENT_ID : null
  );
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);
  const [highlightedSpecialty, setHighlightedSpecialty] = useState<string | null>(null);
  const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(!EMBED_MODE);

  useEffect(() => {
    setWebGLAvailable(detectWebGL());
    if (!EMBED_MODE) {
      const seen = localStorage.getItem("agentworld-tour-done");
      if (seen) setShowWalkthrough(false);
    }
    fetchAgents()
      .then((data) => {
        setAgents(data);
        setAgentsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load agents:", err);
        setAgentsError("Could not load agents. Please refresh.");
        setAgentsLoading(false);
      });
  }, []);

  const handleWalkthroughComplete = useCallback(() => {
    setShowWalkthrough(false);
    localStorage.setItem("agentworld-tour-done", "1");
  }, []);

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);

  const handlePageAgent = useCallback((agentId: string | null) => {
    setPagedAgentId(agentId);
  }, []);

  const handleStartSpeaking = useCallback(() => {
    if (selectedAgent) setSpeakingAgentId(selectedAgent.id);
  }, [selectedAgent]);

  const handleStopSpeaking = useCallback(() => {
    setSpeakingAgentId(null);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedAgent(null);
    setSpeakingAgentId(null);
  }, []);

  const handleIntroChat = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);

  const handleIntroStandDown = useCallback(() => {
    setPagedAgentId(null);
  }, []);

  if (webGLAvailable === null || agentsLoading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#060c14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid rgba(249,115,22,0.2)",
              borderTop: "3px solid #F97316",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading agents…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (agentsError) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#060c14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 16 }}>{agentsError}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.4)",
              borderRadius: 8,
              color: "#F97316",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 20px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pagedAgent = pagedAgentId
    ? agents.find((a) => a.id === pagedAgentId) ?? null
    : null;

  if (!webGLAvailable) {
    return (
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#010108", position: "relative" }}>
        {showWalkthrough && <Walkthrough onComplete={handleWalkthroughComplete} />}
        <HUD agentCount={agents.length} pagedAgentName={null} />
        <div style={{ paddingTop: 70, height: "100%" }}>
          <WebGLFallback agents={agents} selectedAgent={selectedAgent} onSelect={handleSelectAgent} />
        </div>
        {highlightedSpecialty && (
          <SpecialtyFilterBanner
            specialty={highlightedSpecialty}
            onClear={() => setHighlightedSpecialty(null)}
          />
        )}
        <InteractionPanel
          agent={selectedAgent}
          isSpeaking={speakingAgentId !== null}
          onStartSpeaking={handleStartSpeaking}
          onStopSpeaking={handleStopSpeaking}
          onClose={handleClose}
          activeSpecialtyFilter={highlightedSpecialty}
          onSpecialtyFilter={setHighlightedSpecialty}
        />
      </div>
    );
  }

  if (EMBED_MODE) {
    return (
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "transparent", position: "relative" }}>
        <Scene3D
          agents={agents}
          selectedAgent={selectedAgent}
          speakingAgentId={speakingAgentId}
          pagedAgentId={pagedAgentId}
          specialtyFilter={highlightedSpecialty}
          onSelectAgent={handleSelectAgent}
        />
        {highlightedSpecialty && (
          <SpecialtyFilterBanner
            specialty={highlightedSpecialty}
            onClear={() => setHighlightedSpecialty(null)}
          />
        )}
        <AgentIntroCard
          agent={selectedAgent ? null : pagedAgent}
          onChat={handleIntroChat}
          onStandDown={() => {}}
        />
        <InteractionPanel
          agent={selectedAgent}
          isSpeaking={speakingAgentId !== null}
          onStartSpeaking={handleStartSpeaking}
          onStopSpeaking={handleStopSpeaking}
          onClose={handleClose}
          activeSpecialtyFilter={highlightedSpecialty}
          onSpecialtyFilter={setHighlightedSpecialty}
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#010108" }}>
      {showWalkthrough && <Walkthrough onComplete={handleWalkthroughComplete} />}

      <HUD
        agentCount={agents.length}
        pagedAgentName={pagedAgent?.name ?? null}
      />

      <AgentSelector
        agents={agents}
        selectedAgent={selectedAgent}
        pagedAgentId={pagedAgentId}
        activeSpecialtyFilter={highlightedSpecialty}
        onSelect={handleSelectAgent}
        onPage={handlePageAgent}
        onSpecialtyFilter={setHighlightedSpecialty}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          marginLeft: "210px",
          marginRight: selectedAgent ? "380px" : "0px",
          transition: "margin-right 0.3s ease",
        }}
      >
        <Scene3D
          agents={agents}
          selectedAgent={selectedAgent}
          speakingAgentId={speakingAgentId}
          pagedAgentId={pagedAgentId}
          specialtyFilter={highlightedSpecialty}
          onSelectAgent={handleSelectAgent}
        />
        {highlightedSpecialty && (
          <SpecialtyFilterBanner
            specialty={highlightedSpecialty}
            onClear={() => setHighlightedSpecialty(null)}
          />
        )}
      </div>

      <AgentIntroCard
        agent={selectedAgent ? null : pagedAgent}
        onChat={handleIntroChat}
        onStandDown={handleIntroStandDown}
      />

      <InteractionPanel
        agent={selectedAgent}
        isSpeaking={speakingAgentId !== null}
        onStartSpeaking={handleStartSpeaking}
        onStopSpeaking={handleStopSpeaking}
        onClose={handleClose}
        activeSpecialtyFilter={highlightedSpecialty}
        onSpecialtyFilter={setHighlightedSpecialty}
      />
    </div>
  );
}
