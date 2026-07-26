import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useRef, useCallback } from "react";
import { Agent } from "../agents";
import { AvatarAgent } from "./AvatarAgent";
import { FloatingProps } from "./FloatingProps";
import { Environment3D } from "./Environment";

interface Scene3DProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  speakingAgentId: string | null;
  specialtyFilter: string | null;
  onSelectAgent: (agent: Agent) => void;
}

function makeDoorClickHandler(agents: Agent[], onSelectAgent: (a: Agent) => void) {
  return (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) onSelectAgent(agent);
  };
}

function SceneContent({ agents, selectedAgent, speakingAgentId, specialtyFilter, onSelectAgent }: Scene3DProps) {
  const onDoorClick = makeDoorClickHandler(agents, onSelectAgent);
  return (
    <>
      <Environment3D onDoorClick={onDoorClick} />
      <FloatingProps />
      {agents.map((agent) => (
        <AvatarAgent
          key={agent.id}
          agent={agent}
          isSelected={selectedAgent?.id === agent.id}
          isSpeaking={speakingAgentId === agent.id}
          isSpecialtyHighlighted={specialtyFilter !== null && agent.specialty === specialtyFilter}
          isSpecialtyDimmed={specialtyFilter !== null && agent.specialty !== specialtyFilter}
          onSelect={onSelectAgent}
        />
      ))}
    </>
  );
}

export function Scene3D({ agents, selectedAgent, speakingAgentId, specialtyFilter, onSelectAgent }: Scene3DProps) {
  const controlsRef = useRef<any>(null);

  const handleReset = useCallback(() => {
    controlsRef.current?.reset();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        shadows
        style={{ background: "#060c14", width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: false, toneMappingExposure: 1.8 }}
      >
        {/* Lobby view — slightly elevated, looking into the open floor */}
        <PerspectiveCamera makeDefault position={[0, 2.5, 9]} fov={62} />
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.55}
          zoomSpeed={0.75}
          panSpeed={0.6}
          minDistance={3}
          maxDistance={30}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 1.75}
          target={[0, 0, 0]}
        />
        <Suspense fallback={null}>
          <SceneContent
            agents={agents}
            selectedAgent={selectedAgent}
            speakingAgentId={speakingAgentId}
            specialtyFilter={specialtyFilter}
            onSelectAgent={onSelectAgent}
          />
        </Suspense>
      </Canvas>

      {/* Reset / Center button */}
      <button
        onClick={handleReset}
        title="Reset view"
        style={{
          position: "absolute",
          bottom: 18,
          right: 18,
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 14px",
          background: "rgba(10,8,6,0.78)",
          border: "1px solid rgba(249,115,22,0.45)",
          borderRadius: 8,
          color: "#fff",
          fontSize: 13,
          fontFamily: "inherit",
          fontWeight: 500,
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          transition: "border-color 0.15s, background 0.15s",
          zIndex: 10,
          letterSpacing: "0.02em",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(249,115,22,0.9)";
          (e.currentTarget as HTMLButtonElement).style.background  = "rgba(20,14,8,0.92)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(249,115,22,0.45)";
          (e.currentTarget as HTMLButtonElement).style.background  = "rgba(10,8,6,0.78)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 7L8 1l7 6" />
          <path d="M3 5.5V14h4v-4h2v4h4V5.5" />
        </svg>
        Center
      </button>
    </div>
  );
}
