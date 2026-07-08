import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 13; const H = 4.2; const D = 13;

const CONTENT_LABELS = [
  "🔥 Trending", "💡 Idea", "🎵 Vibe", "📈 Going Viral",
  "☕ Coffee Break", "🚀 Launch", "✨ Magic", "🎭 Drama",
  "📸 Snap", "🌟 Star", "💬 Chat", "🎨 Art Drop",
];

function MemeRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#f0e8f8" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#e8f0f8" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#f8f0e8" roughness={0.85} />
      </mesh>
    </group>
  );
}

function ContentCard({ initX, initY, initZ, wallSide, color, label, speed, phase }: {
  initX: number; initY: number; initZ: number;
  wallSide: "back" | "left" | "right";
  color: string; label: string; speed: number; phase: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(phase);

  useFrame((_, delta) => {
    t.current += delta * speed;
    if (!groupRef.current) return;

    if (wallSide === "back") {
      const x = ((initX + t.current * 1.5 + W / 2) % W) - W / 2;
      groupRef.current.position.set(x, initY, initZ);
    } else if (wallSide === "left") {
      const z = ((initZ + t.current * 1.2 + D / 2) % D) - D / 2;
      groupRef.current.position.set(initX, initY, z);
    } else {
      const z = ((initZ - t.current * 1.0 + D / 2) % D) - D / 2;
      groupRef.current.position.set(initX, initY, z);
    }
  });

  const rotation: [number, number, number] =
    wallSide === "left" ? [0, Math.PI / 2, 0] :
    wallSide === "right" ? [0, -Math.PI / 2, 0] : [0, 0, 0];

  return (
    <group ref={groupRef} position={[initX, initY, initZ]} rotation={rotation}>
      {/* Card bg */}
      <mesh>
        <planeGeometry args={[1.4, 0.75]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Card border */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[1.42, 0.77]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Text position={[0, 0.04, 0.01]} fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={1.2} outlineWidth={0.005} outlineColor={color}>
        {label}
      </Text>
      {/* Like count bar */}
      <mesh position={[0, -0.26, 0.01]}>
        <planeGeometry args={[0.9 * (0.3 + Math.random() * 0.7), 0.06]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function ContentWalls() {
  const cards = useMemo(() => {
    const out = [];
    const backColors = ["#e879f9", "#4a9eff", "#f87171", "#fbbf24", "#4ade80", "#fb923c"];
    const leftColors = ["#c084fc", "#34d399", "#f97316", "#60a5fa"];
    const rightColors = ["#a78bfa", "#fb7185", "#facc15", "#86efac"];

    for (let i = 0; i < 8; i++) {
      out.push({ initX: -W / 2 + Math.random() * W, initY: 0.8 + Math.random() * (H - 1.4), initZ: -D / 2 + 0.05, wallSide: "back" as const, color: backColors[i % backColors.length], label: CONTENT_LABELS[i % CONTENT_LABELS.length], speed: 0.25 + Math.random() * 0.3, phase: Math.random() * 20 });
    }
    for (let i = 0; i < 5; i++) {
      out.push({ initX: -W / 2 + 0.05, initY: 0.8 + Math.random() * (H - 1.4), initZ: -D / 2 + Math.random() * D, wallSide: "left" as const, color: leftColors[i % leftColors.length], label: CONTENT_LABELS[(i + 4) % CONTENT_LABELS.length], speed: 0.2 + Math.random() * 0.2, phase: Math.random() * 20 });
    }
    for (let i = 0; i < 5; i++) {
      out.push({ initX: W / 2 - 0.05, initY: 0.8 + Math.random() * (H - 1.4), initZ: -D / 2 + Math.random() * D, wallSide: "right" as const, color: rightColors[i % rightColors.length], label: CONTENT_LABELS[(i + 8) % CONTENT_LABELS.length], speed: 0.18 + Math.random() * 0.22, phase: Math.random() * 20 });
    }
    return out;
  }, []);

  return <>{cards.map((c, i) => <ContentCard key={i} {...c} />)}</>;
}

function MemeDesk() {
  return (
    <group position={[-2, 0, -2]}>
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[2.2, 0.07, 1.1]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.5} metalness={0.1} />
      </mesh>
      {[[-0.95, -0.45], [-0.95, 0.45], [0.95, -0.45], [0.95, 0.45]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.76, 8]} />
          <meshStandardMaterial color="#e879f9" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Laptop */}
      <mesh position={[0, 0.8, -0.2]} castShadow>
        <boxGeometry args={[0.8, 0.03, 0.55]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.04, -0.45]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.04, -0.43]} rotation={[-0.5, 0, 0]}>
        <planeGeometry args={[0.73, 0.45]} />
        <meshStandardMaterial color="#0a0a14" emissive="#e879f9" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function MimePlant({ position }: { position: [number, number, number] }) {
  const colors = ["#e879f9", "#4ade80", "#fbbf24", "#4a9eff"];
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.55, 12]} />
        <meshStandardMaterial color={colors[Math.floor(Math.random() * colors.length)]} roughness={0.7} />
      </mesh>
      {[0, 0.08, -0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.85 + i * 0.12, 0]} rotation={[0, i * 0.6, i * 0.2 - 0.1]}>
          <cylinderGeometry args={[0.013, 0.018, 0.65, 6]} />
          <meshStandardMaterial color="#2d5a1b" roughness={0.9} />
        </mesh>
      ))}
      {[[0, 1.2, 0], [0.2, 1.05, 0], [-0.18, 1.1, 0], [0.1, 1.32, 0]].map(([x, y, z], i) => (
        <mesh key={`l${i}`} position={[x, y, z]} rotation={[-0.3, i * 0.8, 0]}>
          <planeGeometry args={[0.38, 0.14]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#2d7a1e" : "#3d9c2a"} roughness={0.85} side={2} />
        </mesh>
      ))}
    </group>
  );
}

export default function MemeOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#f8f0fc" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 6], fov: 62, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.9} color="#ffffff" />
          <directionalLight position={[3, 6, 3]} intensity={0.6} color="#fff8ff" castShadow />
          <MemeRoom />
          <ContentWalls />
          <MemeDesk />
          <MimePlant position={[-5.5, 0, -4.5]} />
          <MimePlant position={[5.5, 0, -4.5]} />
          <MimePlant position={[5.5, 0, 4.5]} />
          <Text position={[0, H - 0.35, -D / 2 + 0.1]} fontSize={0.32} color="#e879f9" anchorX="center" letterSpacing={0.2}>MEME</Text>
          <Text position={[0, H - 0.75, -D / 2 + 0.1]} fontSize={0.13} color="#c060cc" anchorX="center">Creative Studio · Content is always flowing</Text>
          <OrbitControls target={[0, 1.5, -1]} minDistance={2} maxDistance={10} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/left")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(232,121,249,0.4)", background: "rgba(232,121,249,0.1)", color: "#e879f9", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing A</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#e879f9", fontSize: 12, letterSpacing: "2px" }}>MEME · Creative Studio</div>
      </div>
    </div>
  );
}
