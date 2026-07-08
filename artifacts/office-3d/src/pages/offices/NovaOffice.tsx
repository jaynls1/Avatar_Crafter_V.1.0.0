import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 14; const H = 4.5; const D = 14;

function NovaRoom() {
  return (
    <group>
      {/* Metal grating floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0e1418" roughness={0.5} metalness={0.6} />
      </mesh>
      {Array.from({ length: 15 }, (_, i) => i - 7).map(n => (
        <mesh key={`fg${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[n * 1, 0.001, 0]}>
          <planeGeometry args={[0.025, D]} />
          <meshStandardMaterial color="#1a2030" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      {Array.from({ length: 15 }, (_, i) => i - 7).map(n => (
        <mesh key={`fgz${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, n * 1]}>
          <planeGeometry args={[W, 0.025]} />
          <meshStandardMaterial color="#1a2030" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0a0e14" roughness={0.9} />
      </mesh>
      {/* Walls */}
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#0c1020" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#0c1020" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#0c1020" roughness={0.85} />
      </mesh>
      {/* Blue neon floor strips */}
      {[-W / 2 + 0.02, W / 2 - 0.02].map((x, i) => (
        <mesh key={`ns${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.003, 0]}>
          <planeGeometry args={[0.04, D]} />
          <meshStandardMaterial color="#4a9eff" emissive="#4a9eff" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

function HologramPanel({ position, rotation, delay }: { position: [number, number, number]; rotation: [number, number, number]; delay: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(delay);

  const bars = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    w: 0.3 + Math.random() * 1.1,
    color: ["#4a9eff", "#00ccff", "#88ddff", "#2266cc"][i % 4],
  })), []);

  useFrame((_, delta) => {
    t.current += delta * 0.9;
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t.current * 0.6) * 0.05;
    }
    barRefs.current.forEach((bar, i) => {
      if (bar) bar.scale.x = 0.4 + (0.6 + Math.sin(t.current * 1.4 + i * 0.45) * 0.6);
    });
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Panel bg */}
      <mesh>
        <planeGeometry args={[1.85, 2.5]} />
        <meshStandardMaterial color="#050e1a" transparent opacity={0.8} side={2} />
      </mesh>
      {/* Header bar */}
      <mesh position={[0, 1.05, 0.01]}>
        <planeGeometry args={[1.6, 0.1]} />
        <meshStandardMaterial color="#4a9eff" emissive="#4a9eff" emissiveIntensity={1.4} />
      </mesh>
      {bars.map((bar, i) => (
        <mesh key={i} ref={el => { barRefs.current[i] = el; }} position={[-0.6 + bar.w / 2 + 0.04, -1.0 + i * 0.165, 0.01]}>
          <planeGeometry args={[bar.w, 0.08]} />
          <meshStandardMaterial color={bar.color} emissive={bar.color} emissiveIntensity={0.9} transparent opacity={0.95} />
        </mesh>
      ))}
      {/* Frame */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.9, 2.55, 0.04]} />
        <meshStandardMaterial color="#1a3060" emissive="#1a3060" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function BuildTable({ position }: { position: [number, number, number] }) {
  const screenRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * 10);
  useFrame((_, delta) => {
    t.current += delta;
    if (screenRef.current) {
      screenRef.current.emissiveIntensity = 0.6 + Math.sin(t.current * 3) * 0.2;
    }
  });
  return (
    <group position={position}>
      {/* Table */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[2.5, 0.07, 1.2]} />
        <meshStandardMaterial color="#1a2a3a" roughness={0.4} metalness={0.7} />
      </mesh>
      {[[-1.1, -0.5], [-1.1, 0.5], [1.1, -0.5], [1.1, 0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.42, z]}>
          <boxGeometry args={[0.06, 0.85, 0.06]} />
          <meshStandardMaterial color="#0a1018" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}
      {/* Screen on table */}
      <mesh position={[0, 0.97, -0.4]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[1.4, 0.8, 0.04]} />
        <meshStandardMaterial color="#0a0e14" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.97, -0.38]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[1.28, 0.72]} />
        <meshStandardMaterial ref={screenRef} color="#0a1a2a" emissive="#4a9eff" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function BuildProgress() {
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);
  const bars = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    label: ["Frontend", "Backend", "API", "Tests", "Deploy", "Docs", "QA", "Release"][i],
    baseProgress: 0.4 + i * 0.07,
  })), []);

  useFrame((_, delta) => {
    t.current += delta * 0.15;
    barRefs.current.forEach((bar, i) => {
      if (bar) {
        const progress = (bars[i].baseProgress + Math.sin(t.current + i * 0.8) * 0.15) % 1;
        bar.scale.x = Math.max(0.05, Math.min(1, progress));
        bar.position.x = -0.72 + bar.scale.x * 0.72;
      }
    });
  });

  return (
    <group position={[W / 2 - 0.15, 2.2, -3]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Dashboard panel */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[1.8, 2.2]} />
        <meshStandardMaterial color="#040810" transparent opacity={0.9} />
      </mesh>
      <Text position={[0, 0.9, 0.01]} fontSize={0.14} color="#4a9eff" anchorX="center">BUILD DASHBOARD</Text>
      {bars.map((bar, i) => (
        <group key={i} position={[0, 0.6 - i * 0.23, 0.01]}>
          <Text position={[-0.8, 0, 0.01]} fontSize={0.085} color="#88aacc" anchorX="left">{bar.label}</Text>
          {/* Track */}
          <mesh position={[0, -0.1, 0]}>
            <planeGeometry args={[1.44, 0.07]} />
            <meshStandardMaterial color="#0a1828" />
          </mesh>
          {/* Fill */}
          <mesh ref={el => { barRefs.current[i] = el; }} position={[-0.72, -0.1, 0.005]}>
            <planeGeometry args={[1.44, 0.065]} />
            <meshStandardMaterial color="#4a9eff" emissive="#4a9eff" emissiveIntensity={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FloatingParticles() {
  const count = 120;
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const initPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * W;
      p[i * 3 + 1] = Math.random() * H;
      p[i * 3 + 2] = (Math.random() - 0.5) * D;
    }
    return p;
  }, []);

  useFrame((_, delta) => {
    if (!geoRef.current) return;
    const attr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.22;
      if (arr[i * 3 + 1] > H) arr[i * 3 + 1] = 0;
    }
    attr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[initPos, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#4a9eff" size={0.03} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export default function NovaOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#04080e" }}>
      <Canvas shadows camera={{ position: [0, 3, 6.5], fov: 62, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} color="#1040a0" />
          <NovaRoom />
          <HologramPanel position={[-2.5, 2.0, -D / 2 + 0.25]} rotation={[0, 0, 0]} delay={0} />
          <HologramPanel position={[0, 2.0, -D / 2 + 0.25]} rotation={[0, 0, 0]} delay={1.2} />
          <HologramPanel position={[2.5, 2.0, -D / 2 + 0.25]} rotation={[0, 0, 0]} delay={2.4} />
          <HologramPanel position={[-W / 2 + 0.25, 2.2, -2]} rotation={[0, Math.PI / 2, 0]} delay={0.6} />
          <HologramPanel position={[-W / 2 + 0.25, 2.2, 1.5]} rotation={[0, Math.PI / 2, 0]} delay={1.8} />
          <BuildTable position={[2, 0, 0]} />
          <BuildTable position={[-2.5, 0, 2]} />
          <BuildProgress />
          <FloatingParticles />
          <pointLight position={[0, 3.5, 0]} intensity={10} distance={14} color="#4a9eff" />
          <pointLight position={[0, 0.5, -4]} intensity={6} distance={8} color="#00ccff" />
          <Text position={[0, H - 0.3, -D / 2 + 0.1]} fontSize={0.32} color="#4a9eff" anchorX="center" letterSpacing={0.2}>NOVA</Text>
          <Text position={[0, H - 0.7, -D / 2 + 0.1]} fontSize={0.13} color="#4a6a88" anchorX="center">Workshop · Things are being built</Text>
          <OrbitControls target={[0, 2, -1]} minDistance={2} maxDistance={12} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/left")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(74,158,255,0.4)", background: "rgba(74,158,255,0.1)", color: "#4a9eff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing A</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#4a9eff", fontSize: 12, letterSpacing: "2px" }}>NOVA · Workshop</div>
      </div>
    </div>
  );
}
