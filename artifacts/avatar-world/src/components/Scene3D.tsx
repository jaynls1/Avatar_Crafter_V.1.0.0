import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { Agent } from "../agents";
import { AvatarAgent } from "./AvatarAgent";
import { FloatingProps } from "./FloatingProps";
import { Environment3D } from "./Environment";

// Default camera position and look-at for easy reset
const DEFAULT_POSITION = new THREE.Vector3(0, 2, 8);
const DEFAULT_TARGET   = new THREE.Vector3(0, 0, -2);

interface Scene3DProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  speakingAgentId: string | null;
  pagedAgentId: string | null;
  specialtyFilter: string | null;
  onSelectAgent: (agent: Agent) => void;
}

interface CameraRigProps {
  pagedAgent: Agent | null;
  controlsRef: React.MutableRefObject<any>;
}

function CameraRig({ pagedAgent, controlsRef }: CameraRigProps) {
  // Save the default state once on mount so reset() snaps back to it
  useEffect(() => {
    const id = setTimeout(() => {
      if (controlsRef.current) controlsRef.current.saveState();
    }, 100);
    return () => clearTimeout(id);
  }, []);

  useFrame(() => {
    if (!controlsRef.current) return;
    // When an agent is paged/speaking, slide the look-target toward the stage
    const target = pagedAgent
      ? new THREE.Vector3(0, 1, 1.5)
      : DEFAULT_TARGET.clone();
    controlsRef.current.target.lerp(target, 0.04);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.08}        // smooth deceleration — feels less twitchy
      rotateSpeed={0.55}          // slower than default (1.0) — harder to overshoot
      zoomSpeed={0.75}
      panSpeed={0.6}
      minDistance={3}
      maxDistance={28}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 1.75}
      target={[0, 0, -2]}
      // autoRotate intentionally OFF — it was causing the "world moving by itself"
    />
  );
}

function SceneContent({
  agents, selectedAgent, speakingAgentId, pagedAgentId, specialtyFilter, onSelectAgent,
}: Scene3DProps) {
  return (
    <>
      <Environment3D />
      <FloatingProps />
      {agents.map((agent) => (
        <AvatarAgent
          key={agent.id}
          agent={agent}
          isSelected={selectedAgent?.id === agent.id}
          isSpeaking={speakingAgentId === agent.id}
          isPaged={pagedAgentId === agent.id}
          isSpecialtyHighlighted={specialtyFilter !== null && agent.specialty === specialtyFilter}
          isSpecialtyDimmed={specialtyFilter !== null && agent.specialty !== specialtyFilter}
          onSelect={onSelectAgent}
        />
      ))}
    </>
  );
}

export function Scene3D({
  agents, selectedAgent, speakingAgentId, pagedAgentId, specialtyFilter, onSelectAgent,
}: Scene3DProps) {
  const pagedAgent = agents.find((a) => a.id === pagedAgentId) ?? null;
  const controlsRef = useRef<any>(null);

  const handleReset = useCallback(() => {
    if (!controlsRef.current) return;
    // Snap controls back to saved default state
    controlsRef.current.reset();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        shadows
        style={{ background: "#060c14", width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: false, toneMappingExposure: 1.8 }}
      >
        <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={65} />
        <CameraRig pagedAgent={pagedAgent} controlsRef={controlsRef} />
        <Suspense fallback={null}>
          <SceneContent
            agents={agents}
            selectedAgent={selectedAgent}
            speakingAgentId={speakingAgentId}
            pagedAgentId={pagedAgentId}
            specialtyFilter={specialtyFilter}
            onSelectAgent={onSelectAgent}
          />
        </Suspense>
      </Canvas>

      {/* ── Reset / Center button ── */}
      <button
        onClick={handleReset}
        title="Reset view to center"
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
        {/* Simple "home" icon built from CSS-chars — no dep needed */}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 7L8 1l7 6" />
          <path d="M3 5.5V14h4v-4h2v4h4V5.5" />
        </svg>
        Center
      </button>
    </div>
  );
}
