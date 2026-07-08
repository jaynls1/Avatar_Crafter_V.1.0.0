import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import WebGLErrorBoundary from "./components/WebGLErrorBoundary";
import Room, { ROOM_DIMS } from "./components/Room";
import WallPoster from "./components/WallPoster";
import PhotoAgent from "./components/PhotoAgent";
import Furniture from "./components/Furniture";
import HallwayDoor from "./components/HallwayDoor";
import HUD from "./components/HUD";
import SettingsPanel from "./components/SettingsPanel";
import { useStore } from "./store/useStore";
import { useRoomEvents } from "./hooks/useRoomEvents";

const { w, h, d } = ROOM_DIMS;

function buildPosterLayout(tools: { id: string; name: string; url: string; category: string; color: string; description: string }[]) {
  const backWall = tools.slice(0, 5);
  const leftWall = tools.slice(5, 9);
  const rightWall = tools.slice(9, 11);

  const posters: {
    tool: typeof tools[0];
    position: [number, number, number];
    rotation: [number, number, number];
  }[] = [];

  const backSpacing = (w - 2) / (backWall.length + 1);
  backWall.forEach((tool, i) => {
    posters.push({
      tool,
      position: [-(w / 2 - backSpacing * (i + 1) - 0.5), h / 2, -(d / 2) + 0.12],
      rotation: [0, 0, 0],
    });
  });

  const leftSpacing = (d - 2) / (leftWall.length + 1);
  leftWall.forEach((tool, i) => {
    posters.push({
      tool,
      position: [-(w / 2) + 0.12, h / 2, -(d / 2 - leftSpacing * (i + 1) - 0.5)],
      rotation: [0, Math.PI / 2, 0],
    });
  });

  const rightPositions: [number, number, number][] = [
    [(w / 2) - 0.12, h / 2, -(d / 2) + 2.5],
    [(w / 2) - 0.12, h / 2, d / 2 - 2.5],
  ];
  rightWall.forEach((tool, i) => {
    posters.push({
      tool,
      position: rightPositions[i],
      rotation: [0, -Math.PI / 2, 0],
    });
  });

  return posters;
}

function Scene() {
  const { tools } = useStore();
  const posterLayout = buildPosterLayout(tools);

  return (
    <>
      <Room />
      <Furniture />
      {posterLayout.map(({ tool, position, rotation }) => (
        <WallPoster key={tool.id} tool={tool} position={position} rotation={rotation} />
      ))}
      <PhotoAgent position={[2.5, 0, -1]} />
      <HallwayDoor
        position={[w / 2 - 0.12, 0, 0]}
        rotationY={-Math.PI / 2}
        to="/atlas"
        label="Atlas's Office"
        accentColor="#c8a050"
      />
    </>
  );
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function App() {
  const { showSettings, speak, agentConfig, loadRoomFromApi, roomSlug } = useStore();

  useRoomEvents(roomSlug);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("room") ?? "default";
    loadRoomFromApi(slug).then(() => {
      setTimeout(() => speak(agentConfig.greeting), 1500);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isWebGLAvailable()) {
    return (
      <div style={{
        width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: "#0d1117",
        color: "#e8e4d8", fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#c8a050", marginBottom: 8 }}>3D Office Room</h1>
        <p style={{ color: "#888", marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>
          Your browser needs WebGL support to render the 3D office.<br />
          Please open this in a modern browser with hardware acceleration enabled.
        </p>
        <p style={{ fontSize: 12, color: "#555", background: "#1a1a2e", padding: "8px 14px", borderRadius: 6 }}>
          WebGL context could not be created
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0d1117" }}>
      <WebGLErrorBoundary>
        <Canvas
          shadows
          camera={{ position: [0, 2.8, 7.5], fov: 58, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: false }}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <Scene />
            <OrbitControls
              target={[0, 1.5, -1]}
              minDistance={2.5}
              maxDistance={11}
              minPolarAngle={0.2}
              maxPolarAngle={Math.PI / 2.05}
              enablePan={false}
              dampingFactor={0.08}
              enableDamping
            />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>
      <HUD />
      {showSettings && <SettingsPanel />}
    </div>
  );
}
