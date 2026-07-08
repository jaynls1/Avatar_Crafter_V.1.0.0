import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";
import { useStore } from "../store/useStore";
import { useRoomEvents } from "../hooks/useRoomEvents";
import type { CameraView } from "../hooks/useRoomEvents";
import Room, { ROOM_DIMS } from "../components/Room";
import Furniture from "../components/Furniture";
import PhotoAgent from "../components/PhotoAgent";
import WallPoster from "../components/WallPoster";

const { w, h, d } = ROOM_DIMS;

function buildAtlasPosters(tools: ReturnType<typeof useStore>["tools"]) {
  const posters: { tool: typeof tools[0]; position: [number, number, number]; rotation: [number, number, number] }[] = [];
  const backWall = tools.slice(0, 5);
  const spacing = (w - 2) / (backWall.length + 1);
  backWall.forEach((tool, i) => {
    posters.push({
      tool,
      position: [-(w / 2 - spacing * (i + 1) - 0.5), h / 2, -(d / 2) + 0.12],
      rotation: [0, 0, 0],
    });
  });
  return posters;
}

interface CamState {
  position: [number, number, number];
  target: [number, number, number];
}

const CAM_VIEWS: Record<CameraView, CamState> = {
  auto:     { position: [0, 2.8, 7.5],    target: [0, 1.5, -1] },
  desk:     { position: [0, 2.2, -1.5],   target: [0, 1.2, -3.5] },
  agent:    { position: [3, 2.5, 1],      target: [2.5, 1.5, -1] },
  wall:     { position: [0, 2.5, 2],      target: [0, 1.5, -6] },
  overhead: { position: [0, 9, 0],        target: [0, 0, 0] },
  wide:     { position: [0, 4, 11],       target: [0, 1.5, 0] },
};

function CamRig({ view }: { view: CameraView }) {
  const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);

  useFrame(({ camera }) => {
    cameraRef.current = camera;
    const target = CAM_VIEWS[view];

    camera.position.lerp(new THREE.Vector3(...target.position), 0.04);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(new THREE.Vector3(...target.target), 0.04);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef as React.Ref<typeof OrbitControls>}
      target={CAM_VIEWS[view].target}
      minDistance={2}
      maxDistance={12}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.05}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

function HallwayBackDoor({ to, label }: { to: string; label: string }) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);

  return (
    <group position={[w / 2 - 0.12, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh
        position={[0, 1.3, 0.01]}
        onClick={() => navigate(to)}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[1.6, 2.6]} />
        <meshStandardMaterial color={hovered ? "#1a2e1a" : "#111820"} roughness={0.9} />
      </mesh>
      <Text position={[0, 3.1, 0.05]} fontSize={0.14} color="#c8a050" anchorX="center" anchorY="middle" outlineWidth={0.007} outlineColor="#000000">
        {label}
      </Text>
      <Text position={[0, 2.9, 0.05]} fontSize={0.09} color={hovered ? "#aaffaa" : "#555"} anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#000000">
        {hovered ? "← Back" : "Main Office"}
      </Text>
    </group>
  );
}

export default function AtlasOfficePage() {
  const [, navigate] = useLocation();
  const { tools, loadRoomFromApi, roomSlug } = useStore();
  const [camView, setCamView] = useState<CameraView>("auto");

  useRoomEvents(roomSlug, (view) => setCamView(view));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("room") ?? "atlas";
    loadRoomFromApi(slug);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const posters = buildAtlasPosters(tools);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0f18" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 7.5], fov: 58, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <Room />
          <Furniture />
          {posters.map(({ tool, position, rotation }) => (
            <WallPoster key={tool.id} tool={tool} position={position} rotation={rotation} />
          ))}
          <PhotoAgent position={[2.5, 0, -1]} />
          <HallwayBackDoor to="/" label="Main Office" />
          <CamRig view={camView} />
        </Suspense>
      </Canvas>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, pointerEvents: "none", zIndex: 20 }}>
        <div className="atlas-top-bar" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px", pointerEvents: "auto",
          background: "rgba(10,15,24,0.8)", backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(200,160,80,0.15)",
        }}>
          <div className="atlas-brand" style={{ fontSize: 12, letterSpacing: "2px", color: "#c8a050", fontWeight: 600 }}>
            ATLAS'S OFFICE
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(["auto", "desk", "agent", "wall", "overhead", "wide"] as CameraView[]).map(v => (
              <button key={v} className={`btn ${camView === v ? "active" : ""}`}
                onClick={() => setCamView(v)}
                style={{ fontSize: 11, padding: "4px 10px" }}>
                {v}
              </button>
            ))}
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
            <button
              className="atlas-back-btn btn"
              onClick={() => navigate("/")}
            >
              ← Main Office
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
