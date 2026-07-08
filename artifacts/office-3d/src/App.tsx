import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";
import WebGLErrorBoundary from "./components/WebGLErrorBoundary";

const W = 26;
const H = 9;
const D = 22;

function MarbleFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#c0b8ae" roughness={0.25} metalness={0.06} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => i - 7).map(n => (
        <mesh key={`gx${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[n * 2, 0.001, 0]}>
          <planeGeometry args={[0.03, D]} />
          <meshStandardMaterial color="#9a9088" roughness={0.4} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => i - 6).map(n => (
        <mesh key={`gz${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, n * 2]}>
          <planeGeometry args={[W, 0.03]} />
          <meshStandardMaterial color="#9a9088" roughness={0.4} />
        </mesh>
      ))}
      {/* Floor emblem */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 3]}>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#c8a050" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 3]}>
        <circleGeometry args={[3.0, 64]} />
        <meshStandardMaterial color="#1a1420" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 3]}>
        <ringGeometry args={[2.4, 2.6, 64]} />
        <meshStandardMaterial color="#c8a050" roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
}

function DarkCeiling() {
  const pendantPositions: [number, number, number][] = [
    [-8, 0, -6], [8, 0, -6],
    [-8, 0, 2],  [8, 0, 2],
    [0, 0, -6],
  ];
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#080810" roughness={0.95} />
      </mesh>
      {pendantPositions.map(([x, , z], i) => (
        <group key={i} position={[x, H, z]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 1.2, 8]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshStandardMaterial color="#ffe8cc" emissive="#ffe8cc" emissiveIntensity={2.5} />
          </mesh>
          <pointLight position={[0, -0.7, 0]} intensity={20} distance={12} color="#fff5e0" />
        </group>
      ))}
    </group>
  );
}

function LobbyWalls() {
  const archW = 5.5;
  const archH = 3.8;

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      {/* Left wall — split around arch opening */}
      {/* top section */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H - (H - archH) / 2, 0]}>
        <planeGeometry args={[D, H - archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      {/* front section */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, archH / 2, D / 2 - (D / 2 - archW / 2) / 2]}>
        <planeGeometry args={[D / 2 - archW / 2, archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      {/* back section */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, archH / 2, -(D / 2 - (D / 2 - archW / 2) / 2)]}>
        <planeGeometry args={[D / 2 - archW / 2, archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      {/* Right wall — mirror */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H - (H - archH) / 2, 0]}>
        <planeGeometry args={[D, H - archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, archH / 2, D / 2 - (D / 2 - archW / 2) / 2]}>
        <planeGeometry args={[D / 2 - archW / 2, archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, archH / 2, -(D / 2 - (D / 2 - archW / 2) / 2)]}>
        <planeGeometry args={[D / 2 - archW / 2, archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
    </group>
  );
}

function MagicScreen({ onClick }: { onClick: () => void }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 0.045;
    if (matRef.current) {
      matRef.current.color.setHSL(t.current % 1, 0.65, 0.1);
      matRef.current.emissive.setHSL(t.current % 1, 0.75, hovered ? 0.28 : 0.17);
    }
    if (lightRef.current) {
      lightRef.current.color.setHSL(t.current % 1, 0.9, 0.55);
      lightRef.current.intensity = 10 + Math.sin(t.current * 28) * 4;
    }
  });

  return (
    <group position={[0, 4.2, -D / 2 + 0.25]}>
      {/* Gold border frame */}
      <mesh position={[0, 0, -0.07]}>
        <boxGeometry args={[15.4, 6.4, 0.12]} />
        <meshStandardMaterial color="#c8a050" emissive="#c8a050" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Inner dark bezel */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[15, 6, 0.1]} />
        <meshStandardMaterial color="#05040c" roughness={0.9} />
      </mesh>
      {/* Screen surface */}
      <mesh
        onClick={onClick}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[14.2, 5.3]} />
        <meshStandardMaterial ref={matRef} roughness={0.05} metalness={0} />
      </mesh>
      <Text position={[0, 0.7, 0.02]} fontSize={0.72} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.3} outlineWidth={0.025} outlineColor="#000">
        NEXT LEVEL
      </Text>
      <Text position={[0, -0.25, 0.02]} fontSize={0.26} color="#c8a050" anchorX="center" anchorY="middle" letterSpacing={0.18}>
        HEADQUARTERS
      </Text>
      {hovered && (
        <Text position={[0, -1.1, 0.02]} fontSize={0.18} color="#ffffff" anchorX="center" anchorY="middle">
          ▶ Enter Theatre
        </Text>
      )}
      <pointLight ref={lightRef} position={[0, 0, 5]} intensity={10} distance={22} />
    </group>
  );
}

function HallwayArch({ side, label, subLabel, onClick }: {
  side: "left" | "right";
  label: string;
  subLabel: string;
  onClick: () => void;
}) {
  const x = side === "left" ? -W / 2 + 0.1 : W / 2 - 0.1;
  const rotY = side === "left" ? -Math.PI / 2 : Math.PI / 2;
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = (hovered ? 0.65 : 0.22) + Math.sin(t.current * 1.8) * 0.1;
    }
  });

  const archW = 5.5;
  const archH = 3.8;

  return (
    <group position={[x, 0, 0]} rotation={[0, rotY, 0]}>
      {/* Top beam */}
      <mesh position={[0, archH + 0.12, 0]}>
        <boxGeometry args={[archW + 0.5, 0.24, 0.18]} />
        <meshStandardMaterial ref={glowRef} color="#c8a050" emissive="#c8a050" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Left post */}
      <mesh position={[-(archW / 2 + 0.12), archH / 2, 0]}>
        <boxGeometry args={[0.24, archH + 0.24, 0.18]} />
        <meshStandardMaterial color="#c8a050" emissive="#c8a050" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Right post */}
      <mesh position={[(archW / 2 + 0.12), archH / 2, 0]}>
        <boxGeometry args={[0.24, archH + 0.24, 0.18]} />
        <meshStandardMaterial color="#c8a050" emissive="#c8a050" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Portal void */}
      <mesh
        position={[0, archH / 2, -0.6]}
        onClick={onClick}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[archW, archH]} />
        <meshStandardMaterial color={hovered ? "#0d1a0d" : "#060408"} roughness={1} />
      </mesh>
      {/* Label */}
      <Text position={[0, archH + 0.6, 0]} fontSize={0.28} color="#c8a050" anchorX="center" anchorY="middle" letterSpacing={0.15} outlineWidth={0.01} outlineColor="#000">
        {label}
      </Text>
      <Text position={[0, archH + 0.22, 0]} fontSize={0.15} color={hovered ? "#aaffaa" : "#666"} anchorX="center" anchorY="middle">
        {hovered ? "Enter →" : subLabel}
      </Text>
      {/* Floor guide */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -3]}>
        <planeGeometry args={[archW, 6]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function LobbyColumns() {
  const cols: [number, number, number][] = [
    [-9, 0, -7], [9, 0, -7],
    [-9, 0, 1],  [9, 0, 1],
  ];
  return (
    <>
      {cols.map(([x, , z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, H / 2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.26, H, 20]} />
            <meshStandardMaterial color="#1e1830" roughness={0.7} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.36, 20]} />
            <meshStandardMaterial color="#14102a" roughness={0.8} />
          </mesh>
          <mesh position={[0, H - 0.18, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.36, 20]} />
            <meshStandardMaterial color="#14102a" roughness={0.8} />
          </mesh>
          <pointLight position={[0, 0.5, 0]} intensity={2} distance={3} color="#c8a050" />
        </group>
      ))}
    </>
  );
}

export default function App() {
  const [, navigate] = useLocation();

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#08060f" }}>
      <WebGLErrorBoundary>
        <Canvas
          shadows
          camera={{ position: [0, 5, 10], fov: 60, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.35} color="#ffe8cc" />
            <directionalLight position={[0, 12, 4]} intensity={0.5} color="#fff5e0" castShadow />
            <MarbleFloor />
            <DarkCeiling />
            <LobbyWalls />
            <LobbyColumns />
            <MagicScreen onClick={() => navigate("/theatre")} />
            <HallwayArch side="left" label="WING A" subLabel="6 Offices" onClick={() => navigate("/hallway/left")} />
            <HallwayArch side="right" label="WING B" subLabel="5 Offices" onClick={() => navigate("/hallway/right")} />
            <OrbitControls
              target={[0, 2.5, -2]}
              minDistance={4}
              maxDistance={18}
              minPolarAngle={0.1}
              maxPolarAngle={Math.PI / 2.08}
              enablePan={false}
              enableDamping
              dampingFactor={0.07}
            />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20, pointerEvents: "none" }}>
        <div style={{ padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
            <button onClick={() => navigate("/hallway/left")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.1)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Wing A</button>
            <button onClick={() => navigate("/hallway/right")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.1)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Wing B</button>
          </div>
          <div style={{ color: "#c8a050", fontSize: 13, letterSpacing: "2px", fontWeight: 600 }}>NEXT LEVEL HQ</div>
          <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
            <button onClick={() => navigate("/theatre")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#e8e4d8", cursor: "pointer", fontSize: 12 }}>🎭 Theatre</button>
            <a href={`${import.meta.env.BASE_URL}admin`} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#e8e4d8", fontSize: 12, textDecoration: "none" }}>⚙ Admin</a>
          </div>
        </div>
      </div>
    </div>
  );
}
