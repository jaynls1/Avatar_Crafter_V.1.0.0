import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";
import { useStore } from "../store/useStore";
import { useRoomEvents } from "../hooks/useRoomEvents";
import type { CameraView } from "../hooks/useRoomEvents";
import Room from "../components/Room";
import Furniture from "../components/Furniture";
import PhotoAgent from "../components/PhotoAgent";

const CAM_PRESETS: Record<CameraView, { position: [number, number, number]; target: [number, number, number] }> = {
  auto:     { position: [0, 2.8, 7.5],    target: [0, 1.5, -1] },
  desk:     { position: [0, 2.2, -1.5],   target: [0, 1.2, -3.5] },
  agent:    { position: [3, 2.5, 1],      target: [2.5, 1.5, -1] },
  wall:     { position: [0, 2.5, 2],      target: [0, 1.5, -6] },
  overhead: { position: [0, 9, 0],        target: [0, 0, 0] },
  wide:     { position: [0, 4, 11],       target: [0, 1.5, 0] },
};

interface CamRigProps {
  view: CameraView;
  onReached: () => void;
}

function CamRig({ view, onReached }: CamRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null);
  const reached = useRef(false);

  useEffect(() => {
    reached.current = false;
  }, [view]);

  useFrame(() => {
    const preset = CAM_PRESETS[view];
    const targetPos = new THREE.Vector3(...preset.position);
    const targetLook = new THREE.Vector3(...preset.target);

    camera.position.lerp(targetPos, 0.06);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook, 0.06);
    }

    if (!reached.current && camera.position.distanceTo(targetPos) < 0.15) {
      reached.current = true;
      onReached();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef as React.Ref<typeof OrbitControls>}
      target={CAM_PRESETS[view].target}
      minDistance={1.5}
      maxDistance={14}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 1.9}
      enablePan={false}
      enableDamping
      dampingFactor={0.1}
    />
  );
}

function Scene({ view, onReached }: CamRigProps) {
  return (
    <>
      <Room />
      <Furniture />
      <PhotoAgent position={[2.5, 0, -1]} />
      <CamRig view={view} onReached={onReached} />
    </>
  );
}

const VIEW_LABELS: Record<CameraView, string> = {
  auto: "Auto",
  desk: "Desk",
  agent: "Agent",
  wall: "Wall",
  overhead: "Overhead",
  wide: "Wide",
};

export default function CameraPage() {
  const [, navigate] = useLocation();
  const { agentConfig, roomSlug } = useStore();
  const [view, setView] = useState<CameraView>("auto");
  const [transitioning, setTransitioning] = useState(false);
  const [timestamp, setTimestamp] = useState("");

  useRoomEvents(roomSlug, useCallback((v: CameraView) => {
    setView(v);
    setTransitioning(true);
  }, []));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("room");
    if (slug) {
      const { loadRoomFromApi } = useStore.getState();
      loadRoomFromApi(slug);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const update = () => {
      setTimestamp(new Date().toLocaleTimeString());
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handleViewChange = (v: CameraView) => {
    setView(v);
    setTransitioning(true);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050810", position: "relative" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 7.5], fov: 58, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <Scene view={view} onReached={() => setTransitioning(false)} />
        </Suspense>
      </Canvas>

      <div className="camera-badge" style={{
        position: "fixed", top: 14, left: 14, padding: "4px 10px",
        background: "rgba(200,30,30,0.85)", borderRadius: 4,
        color: "white", fontSize: 11, fontWeight: 700, letterSpacing: 1,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff4444",
          boxShadow: "0 0 6px #ff4444", animation: "pulse 1.2s infinite" }} />
        LIVE
      </div>

      <div className="camera-agent-name" style={{
        position: "fixed", bottom: 14, left: 14, padding: "4px 10px",
        background: "rgba(0,0,0,0.7)", borderRadius: 4, color: "#c8a050", fontSize: 12,
      }}>
        {agentConfig.name}
      </div>

      <div className="camera-timestamp" style={{
        position: "fixed", bottom: 14, right: 14, padding: "4px 10px",
        background: "rgba(0,0,0,0.7)", borderRadius: 4, color: "#888", fontSize: 11,
        fontFamily: "monospace",
      }}>
        {timestamp}
      </div>

      <div className="camera-view-label" style={{
        position: "fixed", top: 14, right: 14, padding: "4px 10px",
        background: "rgba(0,0,0,0.7)", borderRadius: 4, color: "#888", fontSize: 11,
        opacity: transitioning ? 0 : 1, transition: "opacity 0.5s",
      }}>
        VIEW: {VIEW_LABELS[view].toUpperCase()}
      </div>

      <div className="camera-controls" style={{
        position: "fixed", bottom: 14, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 6, padding: "5px 10px",
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
        borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {(Object.keys(CAM_PRESETS) as CameraView[]).map(v => (
          <button
            key={v}
            onClick={() => handleViewChange(v)}
            style={{
              padding: "4px 10px", fontSize: 11, borderRadius: 5, cursor: "pointer",
              border: `1px solid ${view === v ? "rgba(200,160,80,0.6)" : "rgba(255,255,255,0.1)"}`,
              background: view === v ? "rgba(200,160,80,0.2)" : "transparent",
              color: view === v ? "#c8a050" : "#888", transition: "all 0.15s",
            }}
          >
            <span className="camera-label">{VIEW_LABELS[v]}</span>
          </button>
        ))}
        <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "4px 10px", fontSize: 11, borderRadius: 5, cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
            color: "#888",
          }}
        >
          ← Exit
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
