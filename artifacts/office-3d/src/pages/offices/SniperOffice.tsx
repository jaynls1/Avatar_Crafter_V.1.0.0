import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 13; const H = 4.2; const D = 13;

const METRICS = [
  { label: "Calls Today", base: 47 },
  { label: "Conversions", base: 12 },
  { label: "Pipeline $", base: 184000 },
  { label: "Close Rate", base: 68 },
  { label: "Avg Deal", base: 14200 },
  { label: "NPS Score", base: 92 },
];

function SniperRoom() {
  return (
    <group>
      {/* Premium hardwood floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#2a1a08" roughness={0.7} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => i - 3).map(n => (
        <mesh key={n} rotation={[-Math.PI / 2, 0, 0]} position={[n * 1.9, 0.001, 0]}>
          <planeGeometry args={[0.03, D]} />
          <meshStandardMaterial color="#1a0e04" roughness={0.9} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#1a1208" roughness={0.9} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#1e1610" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#1e1610" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#1e1610" roughness={0.85} />
      </mesh>
    </group>
  );
}

function CRMDashboard({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const textRefs = useRef<(THREE.Mesh | null)[]>([]);
  const valuesRef = useRef<number[]>(METRICS.map(m => m.base));
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 0.6;
    METRICS.forEach((m, i) => {
      valuesRef.current[i] = m.base + Math.round(Math.sin(t.current * 0.4 + i * 0.7) * m.base * 0.08);
    });
    textRefs.current.forEach((mesh, i) => {
      if (mesh) {
        // Imperatively update color to pulse
        const mat = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) mat.emissiveIntensity = 0.5 + Math.sin(t.current * 1.5 + i * 0.4) * 0.2;
      }
    });
  });

  const barWidths = useMemo(() => METRICS.map(() => 0.3 + Math.random() * 0.7), []);
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    barRefs.current.forEach((bar, i) => {
      if (bar) {
        const target = (METRICS[i].base + Math.sin(performance.now() / 1000 * 0.4 + i * 0.7) * METRICS[i].base * 0.08) / (METRICS[i].base * 1.2);
        bar.scale.x = THREE.MathUtils.lerp(bar.scale.x, Math.max(0.05, Math.min(1, target)), delta * 0.8);
        bar.position.x = -0.8 + bar.scale.x * 0.8;
      }
    });
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Panel */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[3.2, 2.8]} />
        <meshStandardMaterial color="#0e0a06" transparent opacity={0.95} />
      </mesh>
      <Text position={[0, 1.22, 0.01]} fontSize={0.15} color="#f87171" anchorX="center" letterSpacing={0.1}>CRM PERFORMANCE</Text>
      <mesh position={[0, 1.07, 0.008]}>
        <planeGeometry args={[3.0, 0.014]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.9} />
      </mesh>
      {METRICS.map((m, i) => (
        <group key={i} position={[0, 0.7 - i * 0.36, 0.01]}>
          <Text position={[-1.4, 0.1, 0]} fontSize={0.1} color="#ddd" anchorX="left">{m.label}</Text>
          {/* Track */}
          <mesh position={[0, -0.08, 0]}>
            <planeGeometry args={[1.6, 0.08]} />
            <meshStandardMaterial color="#1a1208" />
          </mesh>
          {/* Fill bar */}
          <mesh ref={el => { barRefs.current[i] = el; }} position={[-0.8, -0.08, 0.005]}>
            <planeGeometry args={[1.6, 0.075]} />
            <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CoachingTable() {
  return (
    <group position={[0, 0, 0.5]}>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.07, 1.4]} />
        <meshStandardMaterial color="#4a2e10" roughness={0.55} metalness={0.05} />
      </mesh>
      {[[-1.4, -0.6], [-1.4, 0.6], [1.4, -0.6], [1.4, 0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z]}>
          <boxGeometry args={[0.07, 0.76, 0.07]} />
          <meshStandardMaterial color="#3a2008" roughness={0.7} />
        </mesh>
      ))}
      {/* Chairs around table */}
      {[[-0.9, 0.95], [0.9, 0.95]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.44, 0]}>
            <boxGeometry args={[0.7, 0.07, 0.65]} />
            <meshStandardMaterial color="#2a1a08" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.82, -0.3]}>
            <boxGeometry args={[0.7, 0.75, 0.07]} />
            <meshStandardMaterial color="#2a1a08" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RecordingBooth() {
  const micLightRef = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (micLightRef.current) micLightRef.current.intensity = 2 + Math.sin(t.current * 3) * 0.8;
  });
  return (
    <group position={[4.5, 0, -4]}>
      {/* Booth frame */}
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[2.4, H, 0.08]} />
        <meshStandardMaterial color="#2a1a08" roughness={0.7} />
      </mesh>
      {/* Mic stand */}
      <mesh position={[0, 0.9, 0.5]}>
        <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
        <meshStandardMaterial color="#8b7050" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.8, 0.5]}>
        <sphereGeometry args={[0.1, 14, 14]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* On Air indicator */}
      <mesh position={[0, H - 0.4, 0.06]}>
        <planeGeometry args={[0.8, 0.22]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={1.2} />
      </mesh>
      <pointLight ref={micLightRef} position={[0, 1.8, 0.8]} intensity={2} distance={3} color="#ff4444" />
      <Text position={[0, H - 0.4, 0.1]} fontSize={0.11} color="#ffffff" anchorX="center">ON AIR</Text>
    </group>
  );
}

export default function SniperOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0e0a06" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 6], fov: 60, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} color="#ffcc88" />
          <pointLight position={[0, H - 0.5, 0]} intensity={15} distance={14} color="#fff5e0" castShadow />
          <pointLight position={[-4, 2, -2]} intensity={8} distance={8} color="#f87171" />
          <SniperRoom />
          <CRMDashboard position={[0, 2.2, -D / 2 + 0.1]} rotation={[0, 0, 0]} />
          <CRMDashboard position={[-W / 2 + 0.1, 2.2, -1]} rotation={[0, Math.PI / 2, 0]} />
          <CoachingTable />
          <RecordingBooth />
          <Text position={[0, H - 0.3, -D / 2 + 0.08]} fontSize={0.3} color="#f87171" anchorX="center" letterSpacing={0.2}>SNIPER</Text>
          <Text position={[0, H - 0.68, -D / 2 + 0.08]} fontSize={0.12} color="#8a3a3a" anchorX="center">Consulting · People leave believing in themselves.</Text>
          <OrbitControls target={[0, 1.8, -0.5]} minDistance={2} maxDistance={10} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/left")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.1)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing A</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#f87171", fontSize: 12, letterSpacing: "2px" }}>SNIPER · Consulting</div>
      </div>
    </div>
  );
}
